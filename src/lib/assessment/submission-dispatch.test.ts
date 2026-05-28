/**
 * Tests for the submission recording + combination dispatch helpers.
 *
 * The two helpers are best-effort by design — every failure mode logs
 * but doesn't throw. These tests cover:
 *
 *   recordSubmission():
 *     - Writes the right shape to Sanity.
 *     - Hashes the email correctly.
 *     - Lowercases + trims the email.
 *     - Returns null when the write fails.
 *     - Defends against missing optional fields on the payload.
 *
 *   dispatchCombinationNudge():
 *     - Returns null when history is too short.
 *     - Returns null when no combinations match.
 *     - Sends the email when a combination matches.
 *     - Skips Resend send when resend client is null.
 *     - Marks the submission with combinationMatched.
 *     - Skips combinations already in the user's history.
 *
 *   portableTextToParagraphs():
 *     - Extracts paragraphs from PortableText blocks.
 *     - Handles malformed input defensively.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordSubmission,
  dispatchCombinationNudge,
  portableTextToParagraphs,
  type SubmissionWriteClient,
  type EmailSendClient,
} from './submission-dispatch'
import { hashEmail } from './cross-combination'
import type {
  CrossCombination,
  SubmissionRecord,
  WebformPayload,
} from '@/types/assessment'

// ── HELPERS ─────────────────────────────────────────────────────────────

function makePayload(
  overrides: Partial<WebformPayload> = {}
): WebformPayload {
  return {
    assessment: {
      slug: 'decision-making-style',
      displayTitle: 'How You Decide',
    },
    email: 'Test@Example.com',
    result: {
      tier: 'intuitive_satisficer',
      primaryFinding: 'The Intuitive Satisficer',
      interpretationKeys: ['style.IS', 'overlay.IS.leaning'],
      raw: { counts: { IS: 6, IM: 1, AS: 0, AM: 1 } },
    },
    crmTags: ['style:IS', 'ai_band:leaning'],
    meta: {
      submittedAt: '2026-01-15T10:00:00Z',
      durationSeconds: 240,
      userAgent: 'test',
    },
    ...overrides,
  }
}

function makeClient(opts: {
  create?: (doc: Record<string, unknown>) => Promise<{ _id: string }>
  fetch?: (q: string, params?: Record<string, unknown>) => Promise<unknown>
  patch?: SubmissionWriteClient['patch']
}): SubmissionWriteClient {
  return {
    create: opts.create ?? (async (doc) => ({ _id: `id-${Math.random()}` })),
    fetch: opts.fetch ?? (async () => null),
    patch:
      opts.patch ??
      ((id: string) => ({
        set: () => ({ commit: async () => ({ _id: id }) }),
      })),
  }
}

function makeResend(): EmailSendClient & { sent: unknown[] } {
  const sent: unknown[] = []
  return {
    sent,
    emails: {
      send: async (args) => {
        sent.push(args)
        return { id: 'msg-1' }
      },
    },
  }
}

function makeCombo(
  slug: string,
  overrides: Partial<CrossCombination> = {}
): CrossCombination {
  return {
    _id: `combo-${slug}`,
    title: slug,
    slug,
    rationale: 'test',
    requirements: [],
    emailSubject: 'Subject',
    emailBody: [
      {
        _type: 'block',
        _key: 'b1',
        children: [
          { _type: 'span', _key: 'b1s', text: 'Body paragraph.' },
        ],
      } as unknown as CrossCombination['emailBody'][number],
    ],
    isActive: true,
    orderInList: 100,
    ...overrides,
  }
}

function sub(
  slug: string,
  tierId: string,
  keys: string[] = [],
  overrides: Partial<SubmissionRecord> = {}
): SubmissionRecord {
  return {
    _id: `sub-${slug}-${tierId}`,
    email: 'test@example.com',
    emailHash: 'h',
    assessmentSlug: slug,
    tierId,
    interpretationKeys: keys,
    crmTags: [],
    submittedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── recordSubmission ────────────────────────────────────────────────────

describe('recordSubmission', () => {
  it('writes a submission document with the right shape', async () => {
    let written: Record<string, unknown> | null = null
    const client = makeClient({
      create: async (doc) => {
        written = doc
        return { _id: 'sub-new' }
      },
    })
    const result = await recordSubmission({
      client,
      payload: makePayload(),
    })
    expect(result).not.toBe(null)
    expect(result?._id).toBe('sub-new')
    expect(written).not.toBe(null)
    expect(written!._type).toBe('submission')
    expect(written!.assessmentSlug).toBe('decision-making-style')
    expect(written!.tierId).toBe('intuitive_satisficer')
    expect(written!.interpretationKeys).toEqual([
      'style.IS',
      'overlay.IS.leaning',
    ])
    expect(written!.crmTags).toEqual(['style:IS', 'ai_band:leaning'])
  })

  it('lowercases and trims the email before writing', async () => {
    let written: Record<string, unknown> | null = null
    const client = makeClient({
      create: async (doc) => {
        written = doc
        return { _id: 'sub-new' }
      },
    })
    await recordSubmission({
      client,
      payload: makePayload({ email: '  USER@Example.COM  ' }),
    })
    expect(written!.email).toBe('user@example.com')
  })

  it('produces the same hash as hashEmail() directly', async () => {
    let written: Record<string, unknown> | null = null
    const client = makeClient({
      create: async (doc) => {
        written = doc
        return { _id: 'sub-new' }
      },
    })
    await recordSubmission({
      client,
      payload: makePayload({ email: 'a@example.com' }),
    })
    const directHash = await hashEmail('a@example.com')
    expect(written!.emailHash).toBe(directHash)
  })

  it('returns null when the Sanity write throws', async () => {
    const client = makeClient({
      create: async () => {
        throw new Error('Sanity is down')
      },
    })
    const result = await recordSubmission({
      client,
      payload: makePayload(),
    })
    expect(result).toBe(null)
  })

  it('handles missing optional fields defensively', async () => {
    let written: Record<string, unknown> | null = null
    const client = makeClient({
      create: async (doc) => {
        written = doc
        return { _id: 'sub-new' }
      },
    })
    const payload = makePayload()
    payload.result.interpretationKeys = [] as string[]
    payload.crmTags = [] as string[]
    await recordSubmission({ client, payload })
    expect(written!.interpretationKeys).toEqual([])
    expect(written!.crmTags).toEqual([])
  })
})

// ── dispatchCombinationNudge ────────────────────────────────────────────

describe('dispatchCombinationNudge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when history has fewer than 2 submissions', async () => {
    const currentSubmission = sub('a', 't1')
    const client = makeClient({
      fetch: async () => [currentSubmission],
    })
    const resend = makeResend()
    const result = await dispatchCombinationNudge({
      client,
      resend,
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    expect(result).toBe(null)
    expect(resend.sent).toHaveLength(0)
  })

  it('returns null when no combinations match', async () => {
    const history = [
      sub('a', 't1'),
      sub('b', 't2'),
    ]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('test', {
        requirements: [
          {
            _key: 'r1',
            assessmentSlug: 'c',
            anyOfTiers: ['t99'],
          },
        ],
      }),
    ]
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
    })
    const resend = makeResend()
    const result = await dispatchCombinationNudge({
      client,
      resend,
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    expect(result).toBe(null)
    expect(resend.sent).toHaveLength(0)
  })

  it('sends the email when a combination matches', async () => {
    const history = [
      sub('a', 't1'),
      sub('b', 't2'),
    ]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('match', {
        emailSubject: 'A noticed combination',
        requirements: [
          {
            _key: 'r1',
            assessmentSlug: 'a',
            anyOfTiers: ['t1'],
          },
          {
            _key: 'r2',
            assessmentSlug: 'b',
            anyOfTiers: ['t2'],
          },
        ],
      }),
    ]
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
    })
    const resend = makeResend()
    const result = await dispatchCombinationNudge({
      client,
      resend,
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    expect(result).toBe('match')
    expect(resend.sent).toHaveLength(1)
    const sentEmail = resend.sent[0] as { subject: string; to: string }
    expect(sentEmail.subject).toBe('A noticed combination')
    expect(sentEmail.to).toBe(currentSubmission.email)
  })

  it('skips combinations already in the alreadyFired set', async () => {
    const history = [
      sub('a', 't1', [], { combinationMatched: 'high-priority' }),
      sub('b', 't2'),
    ]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('high-priority', {
        orderInList: 100,
        requirements: [
          { _key: 'r1', assessmentSlug: 'a', anyOfTiers: ['t1'] },
          { _key: 'r2', assessmentSlug: 'b', anyOfTiers: ['t2'] },
        ],
      }),
      makeCombo('lower-priority', {
        orderInList: 200,
        requirements: [
          { _key: 'r1', assessmentSlug: 'a', anyOfTiers: ['t1'] },
          { _key: 'r2', assessmentSlug: 'b', anyOfTiers: ['t2'] },
        ],
      }),
    ]
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
    })
    const resend = makeResend()
    const result = await dispatchCombinationNudge({
      client,
      resend,
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    // high-priority was already fired; lower-priority should be picked
    expect(result).toBe('lower-priority')
  })

  it('still returns matched slug and marks submission when Resend is null', async () => {
    const history = [sub('a', 't1'), sub('b', 't2')]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('match', {
        requirements: [
          { _key: 'r1', assessmentSlug: 'a', anyOfTiers: ['t1'] },
          { _key: 'r2', assessmentSlug: 'b', anyOfTiers: ['t2'] },
        ],
      }),
    ]
    let patched: { id: string; fields: Record<string, unknown> } | null = null
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
      patch: (id) => ({
        set: (fields) => ({
          commit: async () => {
            patched = { id, fields }
            return { _id: id }
          },
        }),
      }),
    })
    const result = await dispatchCombinationNudge({
      client,
      resend: null,
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    expect(result).toBe('match')
    expect(patched).not.toBe(null)
    expect(patched!.fields.combinationMatched).toBe('match')
  })

  it('patches the current submission with combinationMatched', async () => {
    const history = [sub('a', 't1'), sub('b', 't2')]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('the-match', {
        requirements: [
          { _key: 'r1', assessmentSlug: 'a', anyOfTiers: ['t1'] },
          { _key: 'r2', assessmentSlug: 'b', anyOfTiers: ['t2'] },
        ],
      }),
    ]
    let patched: { id: string; fields: Record<string, unknown> } | null = null
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
      patch: (id) => ({
        set: (fields) => ({
          commit: async () => {
            patched = { id, fields }
            return { _id: id }
          },
        }),
      }),
    })
    await dispatchCombinationNudge({
      client,
      resend: makeResend(),
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    expect(patched!.id).toBe(currentSubmission._id)
    expect(patched!.fields.combinationMatched).toBe('the-match')
  })

  it('continues even when patch fails', async () => {
    const history = [sub('a', 't1'), sub('b', 't2')]
    const currentSubmission = history[1]
    const combos: CrossCombination[] = [
      makeCombo('match', {
        requirements: [
          { _key: 'r1', assessmentSlug: 'a', anyOfTiers: ['t1'] },
          { _key: 'r2', assessmentSlug: 'b', anyOfTiers: ['t2'] },
        ],
      }),
    ]
    const client = makeClient({
      fetch: async (q) => {
        if (q.includes('submission')) return history
        if (q.includes('crossCombination')) return combos
        return null
      },
      patch: () => ({
        set: () => ({
          commit: async () => {
            throw new Error('patch failed')
          },
        }),
      }),
    })
    const result = await dispatchCombinationNudge({
      client,
      resend: makeResend(),
      resendFrom: 'test@fab.partners',
      currentSubmission,
    })
    // Should not throw; should still return the matched slug
    expect(result).toBe('match')
  })

  it('returns null when history fetch fails', async () => {
    const client = makeClient({
      fetch: async () => {
        throw new Error('Sanity down')
      },
    })
    const result = await dispatchCombinationNudge({
      client,
      resend: makeResend(),
      resendFrom: 'test@fab.partners',
      currentSubmission: sub('a', 't1'),
    })
    expect(result).toBe(null)
  })

  it('returns null when combinations fetch fails', async () => {
    const history = [sub('a', 't1'), sub('b', 't2')]
    let firstCall = true
    const client = makeClient({
      fetch: async (q) => {
        if (firstCall) {
          firstCall = false
          return history
        }
        throw new Error('Combinations fetch failed')
      },
    })
    const result = await dispatchCombinationNudge({
      client,
      resend: makeResend(),
      resendFrom: 'test@fab.partners',
      currentSubmission: history[1],
    })
    expect(result).toBe(null)
  })
})

// ── portableTextToParagraphs ────────────────────────────────────────────

describe('portableTextToParagraphs', () => {
  it('extracts paragraph text from valid blocks', () => {
    const blocks = [
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'First paragraph.' }],
      },
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'Second paragraph.' }],
      },
    ]
    expect(portableTextToParagraphs(blocks)).toEqual([
      'First paragraph.',
      'Second paragraph.',
    ])
  })

  it('concatenates spans within a block', () => {
    const blocks = [
      {
        _type: 'block',
        children: [
          { _type: 'span', text: 'Hello ' },
          { _type: 'span', text: 'world.' },
        ],
      },
    ]
    expect(portableTextToParagraphs(blocks)).toEqual(['Hello world.'])
  })

  it('skips non-block items', () => {
    const blocks = [
      { _type: 'block', children: [{ _type: 'span', text: 'kept' }] },
      { _type: 'image', children: [{ _type: 'span', text: 'skipped' }] },
    ]
    expect(portableTextToParagraphs(blocks)).toEqual(['kept'])
  })

  it('skips empty paragraphs', () => {
    const blocks = [
      { _type: 'block', children: [{ _type: 'span', text: '' }] },
      { _type: 'block', children: [{ _type: 'span', text: '   ' }] },
      { _type: 'block', children: [{ _type: 'span', text: 'real' }] },
    ]
    expect(portableTextToParagraphs(blocks)).toEqual(['real'])
  })

  it('returns empty array for non-array input', () => {
    expect(portableTextToParagraphs(null)).toEqual([])
    expect(portableTextToParagraphs('string')).toEqual([])
    expect(portableTextToParagraphs({})).toEqual([])
  })

  it('handles missing children defensively', () => {
    expect(
      portableTextToParagraphs([{ _type: 'block' }])
    ).toEqual([])
  })
})
