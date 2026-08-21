export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/contact
 *
 * Strategy session enquiries from the homepage form. Emails the enquiry
 * to CONTACT_EMAIL via Postmark with Reply-To set to the enquirer, then
 * sends the enquirer a confirmation.
 *
 * Required env vars:
 *   CONTACT_EMAIL          — where enquiries land
 *   POSTMARK_FROM          — verified Postmark sender signature
 *   POSTMARK_SERVER_TOKEN  — Postmark server token
 *
 * Data protection: the enquiry itself is processed under GDPR Art
 * 6(1)(b) and needs no consent. The optional marketing opt-in does need
 * consent, so the exact wording the enquirer agreed to is recorded in
 * the notification email alongside the timestamp — the evidence Art
 * 7(1) asks for. Nothing is stored in a database; the mailbox is the
 * record.
 */

const TO = process.env.CONTACT_EMAIL ?? ''
const FROM = process.env.POSTMARK_FROM ?? ''
const TOKEN = process.env.POSTMARK_SERVER_TOKEN ?? ''

const MAX_MESSAGE = 4000
const MAX_NAME = 120
const MAX_EMAIL = 254

// Crude per-instance throttle. Serverless means each instance keeps its
// own map, so this is a speed bump against naive floods rather than a
// real rate limiter — the honeypot does the heavier lifting.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const recentByIp = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (recentByIp.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  )
  hits.push(now)
  recentByIp.set(ip, hits)
  if (recentByIp.size > 500) {
    for (const [key, times] of recentByIp) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        recentByIp.delete(key)
      }
    }
  }
  return hits.length > RATE_LIMIT_MAX
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Strip CR/LF so user input can never inject extra email headers. */
function singleLine(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim()
}

type ContactPayload = {
  name?: unknown
  email?: unknown
  message?: unknown
  context?: unknown
  marketingConsent?: unknown
  marketingConsentText?: unknown
  company?: unknown
}

export async function POST(req: NextRequest) {
  if (!TO || !FROM || !TOKEN) {
    console.error('contact route: Postmark env vars missing')
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
  }

  let body: ContactPayload
  try {
    body = (await req.json()) as ContactPayload
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot: a bot filled the hidden field. Look like a success so it
  // has nothing to learn, and send nothing.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const ip =
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    )
  }

  const name = typeof body.name === 'string' ? singleLine(body.name) : ''
  const email = typeof body.email === 'string' ? singleLine(body.email) : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const context = typeof body.context === 'string' ? singleLine(body.context) : ''
  const marketingConsent = body.marketingConsent === true
  const marketingConsentText =
    typeof body.marketingConsentText === 'string'
      ? singleLine(body.marketingConsentText)
      : ''

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Name and email are required.' },
      { status: 400 }
    )
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'That email address is not valid.' },
      { status: 400 }
    )
  }
  if (
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    message.length > MAX_MESSAGE
  ) {
    return NextResponse.json({ error: 'That is too long.' }, { status: 400 })
  }

  const receivedAt = new Date().toISOString()

  const lines = [
    context ? `Context: ${context}` : '',
    `Received: ${receivedAt}`,
    '',
    `Name:  ${name}`,
    `Email: ${email}`,
    '',
    message || '(no message given)',
    '',
    '—',
    marketingConsent
      ? `Marketing opt-in: YES at ${receivedAt}\nWording agreed to: "${marketingConsentText}"`
      : 'Marketing opt-in: no (enquiry only — do not add to any list)',
    '',
    'Sent via the strategy session form on fab.partners',
  ].filter(Boolean)

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': TOKEN,
      },
      body: JSON.stringify({
        From: FROM,
        To: TO,
        ReplyTo: `${name} <${email}>`,
        Subject: `Strategy session enquiry — ${name}`,
        TextBody: lines.join('\n'),
      }),
    })

    if (!res.ok) {
      console.error('Postmark error:', await res.text())
      return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
    }
  } catch (err) {
    console.error('contact route error', err)
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
  }

  // Confirmation to the enquirer. Best-effort: the enquiry is already
  // safely delivered, so a failure here must not fail the request.
  try {
    await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': TOKEN,
      },
      body: JSON.stringify({
        From: FROM,
        To: `${name} <${email}>`,
        ReplyTo: TO,
        Subject: 'Your strategy session request — Fab Partners',
        TextBody: buildConfirmationText(name, message),
        HtmlBody: buildConfirmationHtml(name, message),
      }),
    })
  } catch (err) {
    console.error('contact route: confirmation email failed', err)
  }

  return NextResponse.json({ ok: true })
}

function buildConfirmationText(name: string, message: string): string {
  return [
    `Hello ${name},`,
    '',
    'Thank you for requesting a strategy session. This is just to confirm',
    'it reached us — you will hear back within one business day to arrange',
    'a time. Forty-five minutes, confidential, no obligation.',
    '',
    message ? `What you sent us:\n\n${message}\n` : '',
    'If you would like this request and your details deleted, reply to this',
    'email and say so, and we will remove them.',
    '',
    '— Fab Partners',
    'fab.partners',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

function buildConfirmationHtml(name: string, message: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #f5f0eb; max-width: 560px; margin: 24px auto; padding: 24px 16px; line-height: 1.65;">
    <h2 style="font-family: Georgia, serif; color: #0d2b2e; margin-bottom: 8px;">Your strategy session request</h2>
    <p>Hello ${escapeHtml(name)},</p>
    <p>Thank you for requesting a strategy session. This is just to confirm it reached us — you will hear back within one business day to arrange a time. Forty-five minutes, confidential, no obligation.</p>
    ${
      message
        ? `<p style="color: #5a5a5a;">What you sent us:</p>
    <blockquote style="margin: 0 0 16px; padding-left: 16px; border-left: 2px solid #E34234; color: #5a5a5a; white-space: pre-wrap;">${escapeHtml(message)}</blockquote>`
        : ''
    }
    <p style="color: #5a5a5a; font-size: 14px;">If you would like this request and your details deleted, reply to this email and say so, and we will remove them.</p>
    <p style="margin-top: 32px; color: #5a5a5a; font-size: 14px;">— Fab Partners<br /><a href="https://fab.partners" style="color: #0d2b2e;">fab.partners</a></p>
  </body>
</html>`
}
