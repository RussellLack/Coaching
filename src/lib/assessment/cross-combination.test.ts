/**
 * Tests for the cross-combination matcher.
 *
 * The matcher is pure — same inputs, same output, no IO. These tests
 * cover the truth table of requirement satisfaction (tier match, key
 * match, both, neither, OR semantics within a requirement, AND
 * semantics across requirements), the priority ordering (lower
 * orderInList wins), the dedup (alreadyFired skipping), and the
 * edge cases (empty history, empty combinations, all requirements
 * unsatisfied).
 *
 * Also tests the hashEmail helper for determinism, normalisation,
 * and length.
 */

import { describe, it, expect } from 'vitest'
import {
  matchCombination,
  submissionSatisfiesRequirement,
  hashEmail,
} from './cross-combination'
import type {
  CrossCombination,
  CrossCombinationRequirement,
  SubmissionRecord,
} from '@/types/assessment'

// ── FIXTURES ─────────────────────────────────────────────────────────────

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

function combo(
  slug: string,
  requirements: CrossCombinationRequirement[],
  overrides: Partial<CrossCombination> = {}
): CrossCombination {
  return {
    _id: `combo-${slug}`,
    title: slug,
    slug,
    rationale: 'test combination',
    requirements,
    emailSubject: 'subject',
    emailBody: [],
    isActive: true,
    orderInList: 100,
    ...overrides,
  }
}

function req(
  slug: string,
  opts: { tiers?: string[]; keys?: string[] } = {}
): CrossCombinationRequirement {
  return {
    _key: `req-${slug}`,
    assessmentSlug: slug,
    anyOfTiers: opts.tiers,
    anyOfInterpretationKeys: opts.keys,
  }
}

// ── submissionSatisfiesRequirement ──────────────────────────────────────

describe('submissionSatisfiesRequirement', () => {
  it('matches when tier is in anyOfTiers', () => {
    const s = sub('decision-making-style', 'intuitive_satisficer')
    const r = req('decision-making-style', { tiers: ['intuitive_satisficer'] })
    expect(submissionSatisfiesRequirement(s, r)).toBe(true)
  })

  it('matches when any interpretation key is in anyOfInterpretationKeys', () => {
    const s = sub('cognitive-distortion-spotter', 'lower_moderate', [
      'distortion.catastrophising',
      'distortion.ai_magnification',
    ])
    const r = req('cognitive-distortion-spotter', {
      keys: ['distortion.ai_magnification'],
    })
    expect(submissionSatisfiesRequirement(s, r)).toBe(true)
  })

  it('does not match when tier is not in anyOfTiers and no key list', () => {
    const s = sub('decision-making-style', 'analytical_maximiser')
    const r = req('decision-making-style', { tiers: ['intuitive_satisficer'] })
    expect(submissionSatisfiesRequirement(s, r)).toBe(false)
  })

  it('does not match when no interpretation keys overlap', () => {
    const s = sub('cognitive-distortion-spotter', 'lower_moderate', [
      'distortion.catastrophising',
    ])
    const r = req('cognitive-distortion-spotter', {
      keys: ['distortion.ai_magnification'],
    })
    expect(submissionSatisfiesRequirement(s, r)).toBe(false)
  })

  it('OR semantics: matches when EITHER tier OR key matches', () => {
    const s = sub('x', 'tier1', ['k2'])
    const r = req('x', { tiers: ['tier1'], keys: ['k99'] })
    expect(submissionSatisfiesRequirement(s, r)).toBe(true)

    const s2 = sub('x', 'tier99', ['k2'])
    const r2 = req('x', { tiers: ['tier1'], keys: ['k2'] })
    expect(submissionSatisfiesRequirement(s2, r2)).toBe(true)
  })

  it('matches any submission when both constraints are empty', () => {
    const s = sub('x', 'any-tier', ['any-key'])
    const r = req('x')
    expect(submissionSatisfiesRequirement(s, r)).toBe(true)
  })

  it('handles missing interpretationKeys array defensively', () => {
    const s = {
      ...sub('x', 't1'),
      interpretationKeys: undefined as unknown as string[],
    }
    const r = req('x', { keys: ['k1'] })
    expect(submissionSatisfiesRequirement(s, r)).toBe(false)
  })
})

// ── matchCombination ────────────────────────────────────────────────────

describe('matchCombination — single combination', () => {
  it('matches when all requirements satisfied by different submissions', () => {
    const history = [
      sub('decision-making-style', 'intuitive_satisficer'),
      sub('cognitive-distortion-spotter', 'lower_moderate', [
        'distortion.ai_magnification',
      ]),
    ]
    const combinations = [
      combo('ai-overtrust', [
        req('decision-making-style', {
          tiers: ['intuitive_satisficer', 'analytical_maximiser'],
        }),
        req('cognitive-distortion-spotter', {
          keys: ['distortion.ai_magnification', 'distortion.ai_minimisation'],
        }),
      ]),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(result).not.toBe(null)
    expect(result!.combination.slug).toBe('ai-overtrust')
    expect(result!.evidence).toHaveLength(2)
  })

  it('returns null when not all requirements satisfied', () => {
    const history = [
      sub('decision-making-style', 'intuitive_satisficer'),
      // No Assessment 4 submission
    ]
    const combinations = [
      combo('ai-overtrust', [
        req('decision-making-style', { tiers: ['intuitive_satisficer'] }),
        req('cognitive-distortion-spotter', {
          keys: ['distortion.ai_magnification'],
        }),
      ]),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(result).toBe(null)
  })

  it('returns null when one requirement is satisfied but the other is not', () => {
    const history = [
      sub('decision-making-style', 'intuitive_satisficer'),
      // Has the right slug but wrong tier
      sub('cognitive-distortion-spotter', 'clear_thinking', [
        'praise.clear_thinking',
      ]),
    ]
    const combinations = [
      combo('ai-overtrust', [
        req('decision-making-style', { tiers: ['intuitive_satisficer'] }),
        req('cognitive-distortion-spotter', {
          keys: ['distortion.ai_magnification'],
        }),
      ]),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(result).toBe(null)
  })

  it('returns null when history is empty', () => {
    const combinations = [
      combo('test', [req('x', { tiers: ['t1'] })]),
    ]
    const result = matchCombination({
      history: [],
      combinations,
      alreadyFired: new Set(),
    })
    expect(result).toBe(null)
  })

  it('returns null when combinations is empty', () => {
    const history = [sub('x', 't1')]
    const result = matchCombination({
      history,
      combinations: [],
      alreadyFired: new Set(),
    })
    expect(result).toBe(null)
  })
})

describe('matchCombination — priority ordering', () => {
  it('returns the first-matched combination by orderInList', () => {
    const history = [
      sub('a', 't1', ['k1']),
      sub('b', 't2', ['k2']),
    ]
    const combinations = [
      combo(
        'second',
        [req('a', { tiers: ['t1'] }), req('b', { tiers: ['t2'] })],
        { orderInList: 200 }
      ),
      combo(
        'first',
        [req('a', { tiers: ['t1'] }), req('b', { tiers: ['t2'] })],
        { orderInList: 100 }
      ),
    ]
    // Order in the array reflects orderInList because the query sorts.
    // We pass them sorted to mirror the GROQ behaviour.
    const sortedCombinations = [...combinations].sort(
      (a, b) => a.orderInList - b.orderInList
    )
    const result = matchCombination({
      history,
      combinations: sortedCombinations,
      alreadyFired: new Set(),
    })
    expect(result!.combination.slug).toBe('first')
  })

  it('skips combinations in alreadyFired and returns the next match', () => {
    const history = [
      sub('a', 't1'),
      sub('b', 't2'),
    ]
    const combinations = [
      combo(
        'first',
        [req('a', { tiers: ['t1'] }), req('b', { tiers: ['t2'] })],
        { orderInList: 100 }
      ),
      combo(
        'second',
        [req('a', { tiers: ['t1'] }), req('b', { tiers: ['t2'] })],
        { orderInList: 200 }
      ),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(['first']),
    })
    expect(result!.combination.slug).toBe('second')
  })

  it('returns null when all matched combinations are in alreadyFired', () => {
    const history = [sub('a', 't1')]
    const combinations = [
      combo('first', [req('a', { tiers: ['t1'] })]),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(['first']),
    })
    expect(result).toBe(null)
  })
})

describe('matchCombination — evidence collection', () => {
  it('records which submission satisfied each requirement', () => {
    const sub1 = sub('a', 't1', [], { _id: 'submission-A' })
    const sub2 = sub('b', 't2', [], { _id: 'submission-B' })
    const history = [sub1, sub2]
    const combinations = [
      combo('test', [
        req('a', { tiers: ['t1'] }),
        req('b', { tiers: ['t2'] }),
      ]),
    ]
    const result = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(result!.evidence[0].matchedSubmissionId).toBe('submission-A')
    expect(result!.evidence[1].matchedSubmissionId).toBe('submission-B')
  })
})

// ── hashEmail ───────────────────────────────────────────────────────────

describe('hashEmail', () => {
  it('returns a deterministic 64-char hex string', async () => {
    const h = await hashEmail('test@example.com')
    expect(h).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(h)).toBe(true)
  })

  it('produces the same hash for the same email', async () => {
    const h1 = await hashEmail('user@example.com')
    const h2 = await hashEmail('user@example.com')
    expect(h1).toBe(h2)
  })

  it('normalises case before hashing', async () => {
    const lower = await hashEmail('user@example.com')
    const upper = await hashEmail('USER@EXAMPLE.COM')
    expect(lower).toBe(upper)
  })

  it('normalises surrounding whitespace before hashing', async () => {
    const clean = await hashEmail('user@example.com')
    const padded = await hashEmail('  user@example.com  ')
    expect(clean).toBe(padded)
  })

  it('produces different hashes for different emails', async () => {
    const h1 = await hashEmail('a@example.com')
    const h2 = await hashEmail('b@example.com')
    expect(h1).not.toBe(h2)
  })
})
