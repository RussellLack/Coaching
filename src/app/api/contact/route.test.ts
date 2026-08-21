/**
 * Tests for the strategy session enquiry route (`/api/contact`).
 *
 * What we care about:
 *   - A valid enquiry emails Russell AND confirms to the enquirer, with
 *     Reply-To pointing at the enquirer so a reply just works.
 *   - The marketing opt-in is recorded verbatim with a timestamp when
 *     given, and explicitly marked as absent when not — that record is
 *     the Art 7(1) evidence, so it must never be ambiguous.
 *   - Bad input is rejected before any mail is sent, and CR/LF in user
 *     input can't inject extra email headers.
 *   - The honeypot fails silently: a bot gets a 200 and learns nothing.
 *   - A failed confirmation email doesn't fail the request — the enquiry
 *     is already delivered by then.
 *
 * The route reads its env vars at module scope, so every test stubs the
 * env and re-imports the module. That also resets the per-instance rate
 * limiter between tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

type PostmarkCall = {
  From: string
  To: string
  ReplyTo?: string
  Subject: string
  TextBody: string
  HtmlBody?: string
}

function postmarkCalls(fetchMock: ReturnType<typeof vi.fn>): PostmarkCall[] {
  return fetchMock.mock.calls.map(
    (call) => JSON.parse((call[1] as RequestInit).body as string) as PostmarkCall
  )
}

async function loadRoute() {
  vi.resetModules()
  return import('./route')
}

function makeRequest(body: unknown, ip = '203.0.113.9'): NextRequest {
  return new Request('https://fab.partners/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nf-client-connection-ip': ip,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I would like to talk about a career decision.',
  context: 'Strategy session — homepage form',
  marketingConsent: false,
  marketingConsentText: 'You may email me occasionally.',
  company: '',
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubEnv('CONTACT_EMAIL', 'hello@fab.partners')
  vi.stubEnv('POSTMARK_FROM', 'Fab Partners <no-reply@fab.partners>')
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'test-token')
  fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/contact', () => {
  it('emails the enquiry and confirms to the enquirer', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest(VALID))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const calls = postmarkCalls(fetchMock)
    expect(calls).toHaveLength(2)

    const [notification, confirmation] = calls
    expect(notification.To).toBe('hello@fab.partners')
    expect(notification.ReplyTo).toBe('Ada Lovelace <ada@example.com>')
    expect(notification.Subject).toBe('Strategy session enquiry — Ada Lovelace')
    expect(notification.TextBody).toContain('ada@example.com')
    expect(notification.TextBody).toContain(
      'I would like to talk about a career decision.'
    )

    expect(confirmation.To).toBe('Ada Lovelace <ada@example.com>')
    expect(confirmation.ReplyTo).toBe('hello@fab.partners')
    expect(confirmation.HtmlBody).toContain('Ada Lovelace')
  })

  it('records the marketing opt-in wording and time when consent is given', async () => {
    const { POST } = await loadRoute()
    await POST(
      makeRequest({
        ...VALID,
        marketingConsent: true,
        marketingConsentText: 'You may email me occasionally about Fab Partners writing.',
      })
    )

    const [notification] = postmarkCalls(fetchMock)
    expect(notification.TextBody).toContain('Marketing opt-in: YES')
    expect(notification.TextBody).toContain(
      'You may email me occasionally about Fab Partners writing.'
    )
    // The timestamp must be there to be usable as evidence.
    expect(notification.TextBody).toMatch(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/)
  })

  it('marks the absence of consent unambiguously', async () => {
    const { POST } = await loadRoute()
    await POST(makeRequest({ ...VALID, marketingConsent: false }))

    const [notification] = postmarkCalls(fetchMock)
    expect(notification.TextBody).toContain('Marketing opt-in: no')
    expect(notification.TextBody).not.toContain('YES')
  })

  it('rejects a missing email before sending anything', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ ...VALID, email: '' }))

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ ...VALID, email: 'not-an-email' }))

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an over-long message', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ ...VALID, message: 'x'.repeat(4001) }))

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('strips CR/LF so user input cannot inject email headers', async () => {
    const { POST } = await loadRoute()
    await POST(
      makeRequest({
        ...VALID,
        name: 'Ada\r\nBcc: victim@example.com',
      })
    )

    const [notification] = postmarkCalls(fetchMock)
    expect(notification.ReplyTo).not.toMatch(/[\r\n]/)
    expect(notification.Subject).not.toMatch(/[\r\n]/)
    expect(notification.ReplyTo).toBe(
      'Ada Bcc: victim@example.com <ada@example.com>'
    )
  })

  it('silently swallows a honeypot hit', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ ...VALID, company: 'Acme Corp' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still succeeds when the confirmation email fails', async () => {
    let call = 0
    fetchMock = vi.fn(async () => {
      call += 1
      if (call === 1) return new Response('{}', { status: 200 })
      throw new Error('postmark down')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(makeRequest(VALID))

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails the request when the enquiry itself cannot be sent', async () => {
    fetchMock = vi.fn(async () => new Response('nope', { status: 422 }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(makeRequest(VALID))

    expect(res.status).toBe(500)
  })

  it('rate-limits a flood from one address', async () => {
    const { POST } = await loadRoute()
    const results: number[] = []
    for (let i = 0; i < 7; i += 1) {
      const res = await POST(makeRequest(VALID, '198.51.100.4'))
      results.push(res.status)
    }

    expect(results.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(results.slice(5)).toEqual([429, 429])
  })

  it('refuses to run without Postmark configured', async () => {
    vi.stubEnv('POSTMARK_SERVER_TOKEN', '')
    const { POST } = await loadRoute()
    const res = await POST(makeRequest(VALID))

    expect(res.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
