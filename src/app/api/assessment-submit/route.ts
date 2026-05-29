import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import {
  ASSESSMENT_BY_SLUG_QUERY,
  ACTIVE_COMBINATIONS_QUERY,
  SUBMISSIONS_BY_EMAIL_HASH_QUERY,
} from '@/sanity/lib/queries'
import { renderAssessmentPdf } from '@/lib/assessment/pdf/render-assessment-pdf'
import {
  hashEmail,
  matchCombination,
} from '@/lib/assessment/cross-combination'
import type {
  Assessment,
  CrossCombination,
  SubmissionRecord,
  WebformPayload,
} from '@/types/assessment'

/**
 * POST /api/assessment-submit
 *
 * Receives the WebformPayload from the AssessmentEngine when a user
 * submits their email at the end of an assessment.
 *
 * Flow:
 *   1. Validate the payload.
 *   2. Fetch the assessment definition from Sanity (fresh, not CDN).
 *   3. Generate the result PDF via @react-pdf/renderer.
 *   4. Send the PDF to the user via Resend.
 *   5. Optionally POST to CRM_WEBHOOK_URL for nurture forwarding.
 *   6. Return 200 OK.
 *
 * Required env vars:
 *   RESEND_API_KEY              — transactional email
 *   RESEND_FROM_EMAIL           — sender address (configured in Netlify environment variables)
 *
 * Optional:
 *   CRM_WEBHOOK_URL             — Zapier/Make/HubSpot endpoint
 *   CRM_WEBHOOK_SECRET          — Bearer token if the webhook checks
 *   SANITY_API_TOKEN            — read token (only needed for private datasets)
 */

// Force dynamic — every submission is unique, never cache.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let payload: WebformPayload
  try {
    payload = (await request.json()) as WebformPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Fetch the assessment definition fresh (no CDN).
  let assessment: Assessment | null = null
  try {
    assessment = await client
      .withConfig({ useCdn: false })
      .fetch<Assessment | null>(ASSESSMENT_BY_SLUG_QUERY, {
        slug: payload.assessment.slug,
      })
  } catch (err) {
    console.error('[assessment-submit] Sanity fetch failed:', err)
    return NextResponse.json(
      { error: 'Could not load assessment definition' },
      { status: 502 }
    )
  }
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  // Generate the PDF.
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderAssessmentPdf({ assessment, payload })
  } catch (err) {
    console.error('[assessment-submit] PDF generation failed:', err)
    return NextResponse.json(
      { error: 'Could not generate PDF' },
      { status: 500 }
    )
  }

  // Send the primary email. If Resend isn't configured, skip silently (dev mode).
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom =
    process.env.RESEND_FROM_EMAIL ?? 'Fab Partners <hello@fab.partners>'

  // Resend client is constructed once and shared between the primary
  // email and the combination nudge so we don't import the SDK twice.
  let resend: import('resend').Resend | null = null

  if (resendApiKey) {
    try {
      const { Resend } = await import('resend')
      resend = new Resend(resendApiKey)
      await resend.emails.send({
        from: resendFrom,
        to: payload.email,
        subject: buildSubject(assessment, payload),
        html: buildEmailHtml(assessment, payload),
        text: buildEmailText(assessment, payload),
        attachments: [
          {
            filename: buildPdfFilename(assessment, payload),
            content: pdfBuffer,
          },
        ],
      })
    } catch (err) {
      console.error('[assessment-submit] Resend send failed:', err)
      // Don't fail the whole request — user already saw the result.
    }
  } else {
    console.warn(
      '[assessment-submit] RESEND_API_KEY not set; email skipped. PDF size:',
      pdfBuffer.length
    )
  }

  // Record the submission to Sanity for cross-assessment combination
  // matching. Best-effort: if the write fails we still continue (the
  // user has their primary PDF; only the combination nudge is missed).
  // The submission record needs a write-enabled client; the default
  // `client` is read-only when no token is set, so we wrap it.
  let combinationMatched: string | null = null
  try {
    const writeClient = client.withConfig({
      useCdn: false,
      // The Sanity client picks up the token from this option or the
      // SANITY_WRITE_TOKEN env var. If neither is set, writes fail
      // gracefully and the nudge logic just doesn't fire.
      token: process.env.SANITY_WRITE_TOKEN,
    }) as unknown as import('@/lib/assessment/submission-dispatch').SubmissionWriteClient

    const { recordSubmission, dispatchCombinationNudge } = await import(
      '@/lib/assessment/submission-dispatch'
    )

    const submissionRecord = await recordSubmission({
      client: writeClient,
      payload,
    })

    if (submissionRecord) {
      combinationMatched = await dispatchCombinationNudge({
        client: writeClient,
        resend: resend as unknown as import('@/lib/assessment/submission-dispatch').EmailSendClient | null,
        resendFrom,
        currentSubmission: submissionRecord,
      })
    }
  } catch (err) {
    console.error(
      '[assessment-submit] submission recording / combination dispatch failed:',
      err
    )
    // Swallow — primary submission flow is unaffected.
  }

  // Forward to CRM webhook if configured. Fire-and-forget.
  const crmUrl = process.env.CRM_WEBHOOK_URL
  if (crmUrl) {
    try {
      await fetch(crmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRM_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.CRM_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify({
          source: 'executive-os-assessment',
          payload,
          pdfSent: Boolean(resendApiKey),
        }),
      })
    } catch (err) {
      console.error('[assessment-submit] CRM webhook forward failed:', err)
    }
  }

  return NextResponse.json({ ok: true, combinationMatched })
}

// ── VALIDATION ─────────────────────────────────────────────────────

function validatePayload(p: unknown): string | null {
  if (!p || typeof p !== 'object') return 'Missing payload'
  const payload = p as Partial<WebformPayload>
  if (!payload.email || typeof payload.email !== 'string')
    return 'Missing email'
  if (!isValidEmail(payload.email)) return 'Invalid email'
  if (!payload.assessment?.slug) return 'Missing assessment slug'
  if (!payload.result?.tier) return 'Missing result tier'
  if (payload.email.length > 254) return 'Email too long'
  if (payload.assessment.slug.length > 80) return 'Slug too long'
  if (JSON.stringify(payload).length > 100_000) return 'Payload too large'
  return null
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

// ── EMAIL COMPOSITION ──────────────────────────────────────────────

function buildSubject(
  assessment: Assessment,
  payload: WebformPayload
): string {
  return `Your ${assessment.displayTitle} result — ${payload.result.tier}`
}

function buildEmailHtml(assessment: Assessment, _payload: WebformPayload): string {
  return `<!doctype html>
<html>
  <body style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #f5f0eb; max-width: 560px; margin: 24px auto; padding: 24px 16px; line-height: 1.65;">
    <h2 style="font-family: Georgia, serif; color: #0d2b2e; margin-bottom: 8px;">Your ${escapeHtml(assessment.displayTitle)} result</h2>
    <p>Thanks for completing the assessment.</p>
    <p>Your full diagnosis is attached as a PDF. It includes your scorecard, the read on each dimension, and a one-page guide to what to do next.</p>
    <p>If anything in the result sparks a question worth talking through, you can book a private conversation here: <a href="https://fab.partners" style="color: #0d2b2e;">fab.partners</a>.</p>
    <p style="margin-top: 32px; color: #5a5a5a; font-size: 14px;">— Fab Partners</p>
  </body>
</html>`
}

function buildEmailText(assessment: Assessment, _payload: WebformPayload): string {
  return [
    `Your ${assessment.displayTitle} result`,
    '',
    'Thanks for completing the assessment.',
    '',
    'Your full diagnosis is attached as a PDF. It includes your scorecard, the read on each dimension, and a one-page guide to what to do next.',
    '',
    'If anything in the result sparks a question worth talking through, book a private conversation at fab.partners.',
    '',
    '— Fab Partners',
  ].join('\n')
}

function buildPdfFilename(
  assessment: Assessment,
  payload: WebformPayload
): string {
  const date = new Date().toISOString().split('T')[0]
  return `${assessment.slug}-${payload.result.tier}-${date}.pdf`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
