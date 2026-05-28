/**
 * Submission recording + cross-combination dispatch.
 *
 * Two responsibilities, split out from the API route to keep the route
 * readable and to make this logic unit-testable:
 *
 *   1. recordSubmission() — writes a `submission` document to Sanity
 *      capturing email (hashed for lookup, full for the email send),
 *      assessment slug, tier, interpretation keys, CRM tags, and
 *      timestamp. Best-effort: failure logs but doesn't throw.
 *
 *   2. dispatchCombinationNudge() — given the just-written submission's
 *      email hash, fetches the user's full history + the active
 *      combinations, runs the matcher, and if a combination matches,
 *      sends the nudge email via Resend and updates the submission
 *      record with the matched combination slug. Best-effort: failure
 *      logs but doesn't throw.
 *
 * Both functions accept a `client` argument so the route can pass a
 * write-enabled Sanity client (production needs a token) without this
 * module knowing how to construct one.
 */

import type {
  Assessment,
  CrossCombination,
  SubmissionRecord,
  WebformPayload,
} from '@/types/assessment'
import {
  ACTIVE_COMBINATIONS_QUERY,
  SUBMISSIONS_BY_EMAIL_HASH_QUERY,
} from '@/sanity/lib/queries'
import { hashEmail, matchCombination } from './cross-combination'

// ── INTERFACES ──────────────────────────────────────────────────────────

/**
 * A minimal client interface that this module needs. Extracted as an
 * interface (rather than depending on the concrete Sanity client) so
 * tests can pass a mock easily.
 *
 * The real Sanity client's methods are generic; here we narrow them to
 * `unknown` returns and let callers cast at the use site. Generic
 * signatures on interface methods are clumsy to mock in TypeScript
 * because the generic parameter has to be threaded through, and the
 * mocks would have to satisfy a constraint they don't actually care
 * about. Concrete return types are simpler.
 */
export interface SubmissionWriteClient {
  fetch(
    query: string,
    params?: Record<string, unknown>
  ): Promise<unknown>
  create(doc: Record<string, unknown>): Promise<{ _id: string }>
  patch(documentId: string): {
    set(fields: Record<string, unknown>): {
      commit(): Promise<unknown>
    }
  }
}

/**
 * A minimal Resend-like client that this module needs to send emails.
 * Extracted as an interface for testability. Production passes a real
 * Resend instance; tests pass a mock.
 */
export interface EmailSendClient {
  emails: {
    send(args: {
      from: string
      to: string
      subject: string
      html: string
      text: string
    }): Promise<unknown>
  }
}

// ── recordSubmission ────────────────────────────────────────────────────

export interface RecordSubmissionInput {
  client: SubmissionWriteClient
  payload: WebformPayload
}

/**
 * Write a submission document to Sanity. Returns the created submission
 * record (including its _id), or null if the write failed.
 *
 * Best-effort: if Sanity is unavailable the function logs and returns
 * null. The caller treats that as "no submission recorded, no
 * cross-combination matching this turn" — the user still gets their
 * primary PDF and the rest of the route succeeds.
 */
export async function recordSubmission(
  input: RecordSubmissionInput
): Promise<SubmissionRecord | null> {
  const { client, payload } = input
  try {
    const emailHash = await hashEmail(payload.email)
    const submittedAt = payload.meta?.submittedAt ?? new Date().toISOString()

    const doc = {
      _type: 'submission',
      email: payload.email.trim().toLowerCase(),
      emailHash,
      assessmentSlug: payload.assessment.slug,
      tierId: payload.result.tier,
      interpretationKeys: payload.result.interpretationKeys ?? [],
      crmTags: payload.crmTags ?? [],
      submittedAt,
    }
    const created = (await client.create(doc)) as { _id: string }
    return {
      _id: created._id,
      ...doc,
    }
  } catch (err) {
    console.error('[recordSubmission] write failed:', err)
    return null
  }
}

// ── dispatchCombinationNudge ────────────────────────────────────────────

export interface DispatchCombinationNudgeInput {
  client: SubmissionWriteClient
  resend: EmailSendClient | null
  resendFrom: string
  currentSubmission: SubmissionRecord
}

/**
 * Evaluate cross-combinations against the user's submission history and,
 * if one matches, send the nudge email.
 *
 * Returns the matched combination's slug (for logging / the route to
 * include in its response), or null if nothing matched.
 *
 * Best-effort on every failure mode:
 *   - Sanity fetch failure → log + return null.
 *   - No combinations match → return null.
 *   - Resend not configured (null client) → log + return the matched
 *     slug anyway, so the submission is still marked as matched in
 *     Sanity (helpful in dev to confirm matching logic).
 *   - Resend send failure → log + still update the submission record
 *     so we don't retry next time.
 *   - Sanity patch failure (updating combinationMatched) → log but
 *     don't unwind. The email has already gone out.
 */
export async function dispatchCombinationNudge(
  input: DispatchCombinationNudgeInput
): Promise<string | null> {
  const { client, resend, resendFrom, currentSubmission } = input

  // Fetch the user's full history.
  let history: SubmissionRecord[]
  try {
    history = (await client.fetch(SUBMISSIONS_BY_EMAIL_HASH_QUERY, {
      emailHash: currentSubmission.emailHash,
    })) as SubmissionRecord[]
  } catch (err) {
    console.error('[dispatchCombinationNudge] history fetch failed:', err)
    return null
  }
  if (!history || history.length < 2) {
    // Need at least two submissions for a combination to fire.
    return null
  }

  // Fetch active combinations (ordered by priority via the GROQ query).
  let combinations: CrossCombination[]
  try {
    combinations = (await client.fetch(
      ACTIVE_COMBINATIONS_QUERY
    )) as CrossCombination[]
  } catch (err) {
    console.error(
      '[dispatchCombinationNudge] combinations fetch failed:',
      err
    )
    return null
  }
  if (!combinations || combinations.length === 0) return null

  // Build the set of already-fired combination slugs from past
  // submissions. Each combination fires at most once per user.
  const alreadyFired = new Set<string>()
  for (const sub of history) {
    if (sub.combinationMatched) alreadyFired.add(sub.combinationMatched)
  }

  // Run the matcher.
  const match = matchCombination({
    history,
    combinations,
    alreadyFired,
  })
  if (!match) return null

  // Send the email (if Resend is configured).
  if (resend) {
    try {
      await resend.emails.send({
        from: resendFrom,
        to: currentSubmission.email,
        subject: match.combination.emailSubject,
        html: buildCombinationEmailHtml(match.combination),
        text: buildCombinationEmailText(match.combination),
      })
    } catch (err) {
      console.error('[dispatchCombinationNudge] Resend send failed:', err)
      // Still continue and mark the submission as matched, so we don't
      // retry on the next inbound submission.
    }
  } else {
    console.warn(
      '[dispatchCombinationNudge] Resend not configured; combination matched but email skipped:',
      match.combination.slug
    )
  }

  // Update the current submission record with the matched combination
  // slug, so subsequent submissions know this user has already had
  // this combination fire.
  if (currentSubmission._id) {
    try {
      await client
        .patch(currentSubmission._id)
        .set({ combinationMatched: match.combination.slug })
        .commit()
    } catch (err) {
      console.error(
        '[dispatchCombinationNudge] patching submission failed:',
        err
      )
      // The email has already gone out (or been skipped); the dedup
      // tracking is the casualty. Worst case the user gets the same
      // combination email once more on their next submission.
    }
  }

  return match.combination.slug
}

// ── EMAIL BODY ──────────────────────────────────────────────────────────

/**
 * Render the combination's Portable Text body as plain HTML. Minimal
 * styling — the email is meant to look like a personal message, not a
 * marketing template.
 */
function buildCombinationEmailHtml(combo: CrossCombination): string {
  const paragraphs = portableTextToParagraphs(combo.emailBody)
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 14px 0;">${escapeHtml(p)}</p>`
    )
    .join('')

  const cta =
    combo.ctaLabel && combo.ctaHref
      ? `<p style="margin-top: 24px;"><a href="${escapeHtml(combo.ctaHref)}" style="color: #0d2b2e; text-decoration: underline;">${escapeHtml(combo.ctaLabel)}</a></p>`
      : ''

  return `<!doctype html>
<html>
  <body style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #f5f0eb; max-width: 560px; margin: 24px auto; padding: 24px 16px; line-height: 1.65;">
    ${body}
    ${cta}
    <p style="margin-top: 32px; color: #5a5a5a; font-size: 14px;">— Russell, fab.partners</p>
  </body>
</html>`
}

function buildCombinationEmailText(combo: CrossCombination): string {
  const paragraphs = portableTextToParagraphs(combo.emailBody)
  const cta =
    combo.ctaLabel && combo.ctaHref
      ? `\n\n${combo.ctaLabel}: ${combo.ctaHref}`
      : ''
  return paragraphs.join('\n\n') + cta + '\n\n— Russell, fab.partners'
}

interface PortableBlock {
  _type: string
  children?: { _type: string; text?: string }[]
}

export function portableTextToParagraphs(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return []
  const out: string[] = []
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    const block = b as PortableBlock
    if (block._type !== 'block') continue
    const text = (block.children ?? [])
      .filter((c) => c && c._type === 'span' && typeof c.text === 'string')
      .map((c) => c.text!)
      .join('')
      .trim()
    if (text.length > 0) out.push(text)
  }
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
