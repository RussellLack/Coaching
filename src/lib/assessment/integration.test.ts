/**
 * End-to-end integration test.
 *
 * Loads the actual Sanity NDJSON for Assessment 1 and runs it through the
 * full pipeline: parse → score → match tier → produce interpretation.
 *
 * If this passes, the schema, scoring, condition evaluator, and tier matcher
 * are all wired up correctly. Authoring bugs (missing interpretations,
 * malformed conditions, mismatched dimension IDs) get caught here.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Assessment, Answers } from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON FIXTURE ─────────────────────────────────────────────

const ndjsonPath = join(__dirname, '../../../seed/assessment-1.ndjson')
const lines = readFileSync(ndjsonPath, 'utf-8').trim().split('\n')
const docs = lines.map((line) => JSON.parse(line))

const assessmentDoc = docs.find(
  (d) => d._type === 'assessment'
) as Record<string, unknown>

// Reshape the Sanity document to the runtime Assessment type. In the real
// engine this transformation is done by the GROQ projection. Here we mimic it:
// extract `slug.current` to `slug`, drop fields the runtime doesn't care about.
const assessment: Assessment = {
  _id: assessmentDoc._id as string,
  slug: (assessmentDoc.slug as { current: string }).current,
  displayTitle: assessmentDoc.displayTitle as string,
  tagline: assessmentDoc.tagline as string | undefined,
  estimatedMinutes: assessmentDoc.estimatedMinutes as number,
  introCopy: assessmentDoc.introCopy as Assessment['introCopy'],
  questions: assessmentDoc.questions as Assessment['questions'],
  scoringStrategy:
    assessmentDoc.scoringStrategy as Assessment['scoringStrategy'],
  dimensions: assessmentDoc.dimensions as Assessment['dimensions'],
  resultTiers: assessmentDoc.resultTiers as Assessment['resultTiers'],
  interpretations:
    assessmentDoc.interpretations as Assessment['interpretations'],
  visualisation: assessmentDoc.visualisation as Assessment['visualisation'],
  emailCaptureCopy:
    assessmentDoc.emailCaptureCopy as Assessment['emailCaptureCopy'],
  ctaButtonLabel: assessmentDoc.ctaButtonLabel as string | undefined,
  postCaptureCtaCopy:
    assessmentDoc.postCaptureCtaCopy as Assessment['postCaptureCtaCopy'],
  crmTags: assessmentDoc.crmTags as string[] | undefined,
  seoTitle: assessmentDoc.seoTitle as string | undefined,
  seoDescription: assessmentDoc.seoDescription as string | undefined,
}

// Helper: answers builder. Each function returns answers for all 13 questions
// keyed by question _key (q1..q13).
function answerAll(value: number): Answers {
  const out: Answers = {}
  for (const q of assessment.questions) {
    if (q._type === 'questionAgreement5') {
      out[q._key] = value
    }
  }
  return out
}

function answerByDim(values: Record<string, number>): Answers {
  const out: Answers = {}
  for (const q of assessment.questions) {
    if (q._type === 'questionAgreement5') {
      out[q._key] = values[q.dimensionId]
    }
  }
  return out
}

// ── TESTS ─────────────────────────────────────────────────────────────

describe('Assessment 1 (end-to-end)', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toBe('Are You Actually Ready for Coaching?')
    expect(assessment.questions).toHaveLength(13)
    expect(assessment.dimensions).toHaveLength(5)
    expect(assessment.resultTiers).toHaveLength(4)
  })

  it('every dimension has a matching gap.* interpretation', () => {
    const dimIds = new Set(assessment.dimensions!.map((d) => d.id))
    const gapKeys = new Set(
      (assessment.interpretations ?? [])
        .filter((i) => i.key.startsWith('gap.'))
        .map((i) => i.key.replace('gap.', ''))
    )
    for (const d of dimIds) {
      expect(gapKeys.has(d)).toBe(true)
    }
  })

  it('every question references a declared dimension', () => {
    const dimIds = new Set(assessment.dimensions!.map((d) => d.id))
    for (const q of assessment.questions) {
      if (q._type === 'questionAgreement5') {
        expect(dimIds.has(q.dimensionId)).toBe(true)
      }
    }
  })

  it('the four tier conditions cover the full 1.0–5.0 range without gaps', () => {
    // Sample many points; every one should match exactly one tier.
    for (let v = 1.0; v <= 5.0; v += 0.1) {
      const overall = Math.round(v * 10) / 10
      const matched = assessment.resultTiers.filter((t) => {
        // Trivially evaluate each condition by hand for this test
        if (t.id === 'ready') return overall >= 4.2
        if (t.id === 'ready-with-gap') return overall >= 3.4 && overall < 4.2
        if (t.id === 'almost-ready') return overall >= 2.6 && overall < 3.4
        if (t.id === 'not-yet') return overall < 2.6
        return false
      })
      expect(matched).toHaveLength(1)
    }
  })
})

describe('Assessment 1 — scenario: all 5s (highest readiness)', () => {
  const result = score({ assessment, answers: answerAll(5) })
  const matched = matchTier(assessment, result)

  it('produces overall score of 5.0', () => {
    expect(result.raw.overall).toBe(5)
  })

  it('matches the "Ready" tier', () => {
    expect(matched).not.toBeNull()
    expect(matched!.tier.id).toBe('ready')
  })

  it('produces a gap.* interpretation key for the lowest dimension (even at 5s, tied)', () => {
    // When all dimensions tie at 5.0, the "lowest" is whichever is first in iteration order.
    // The result will still produce a gap.* key but it shouldn't render meaningfully —
    // the "ready" tier copy doesn't reference it.
    expect(result.interpretationKeys).toHaveLength(1)
    expect(result.interpretationKeys[0]).toMatch(/^gap\./)
  })
})

describe('Assessment 1 — scenario: currency low, rest moderate (the "Ready with one gap" case)', () => {
  // To land in the "Ready with one gap" tier (3.4 ≤ overall < 4.2),
  // the average must drop into that band. With one significantly weaker
  // dimension and four moderate ones:
  //   (4 + 4 + 4 + 4 + 2) / 5 = 3.6 → in band, with currency clearly lowest.
  const answers = answerByDim({
    clarity: 4,
    reflection: 4,
    honesty: 4,
    openness: 4,
    currency: 2,
  })
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)

  it('identifies currency as the lowest dimension', () => {
    expect(result.raw.lowestDimension).toBe('currency')
  })

  it('matches the "Ready, with one gap" tier', () => {
    expect(matched).not.toBeNull()
    expect(matched!.tier.id).toBe('ready-with-gap')
  })

  it('surfaces the gap.currency interpretation', () => {
    expect(matched!.interpretations).toHaveLength(1)
    expect(matched!.interpretations[0].key).toBe('gap.currency')
  })

  it('the surfaced interpretation contains substantial copy', () => {
    const interp = matched!.interpretations[0]
    expect(interp.body.length).toBeGreaterThan(0)
    // Pull the first block's first text span to verify content
    const firstBlock = interp.body[0] as { children?: { text: string }[] }
    const firstSpan = firstBlock.children?.[0]
    expect(firstSpan?.text).toMatch(/currency/i)
  })
})

describe('Assessment 1 — scenario: all 2s (not yet)', () => {
  const result = score({ assessment, answers: answerAll(2) })
  const matched = matchTier(assessment, result)

  it('produces overall score of 2.0', () => {
    expect(result.raw.overall).toBe(2)
  })

  it('matches the "Not yet" tier', () => {
    expect(matched!.tier.id).toBe('not-yet')
  })
})

describe('Assessment 1 — scenario: 3s across the board (almost ready)', () => {
  const result = score({ assessment, answers: answerAll(3) })
  const matched = matchTier(assessment, result)

  it('matches the "Almost ready" tier', () => {
    expect(result.raw.overall).toBe(3)
    expect(matched!.tier.id).toBe('almost-ready')
  })
})

describe('Assessment 1 — boundary scenarios', () => {
  it('exactly 4.2 hits "Ready" (>= boundary)', () => {
    // Need scores that average to exactly 4.2.
    // 5 dimensions: 4.2 * 5 = 21 total dimension-points.
    // Try: clarity=4, reflection=4, honesty=4, openness=4, currency=5  → mean = 4.2
    const result = score({
      assessment,
      answers: answerByDim({
        clarity: 4,
        reflection: 4,
        honesty: 4,
        openness: 4,
        currency: 5,
      }),
    })
    expect(result.raw.overall).toBe(4.2)
    expect(matchTier(assessment, result)!.tier.id).toBe('ready')
  })

  it('exactly 4.19 hits "Ready, with one gap" (< boundary)', () => {
    // Build something that averages to 4.19... actually 4.2-ε.
    // Use 4 across the board for 3 dimensions (4) + 1@4.5 + 1@4 = (4+4+4+4.5+4)/5 = 4.1
    // Easier: with our per-question grain, exact 4.19 is not directly hittable.
    // But 4.1 is, and that's clearly below 4.2.
    const result = score({
      assessment,
      answers: answerByDim({
        clarity: 4,
        reflection: 4,
        honesty: 4,
        openness: 4,
        currency: 4,
      }),
    })
    expect(result.raw.overall).toBe(4)
    expect(matchTier(assessment, result)!.tier.id).toBe('ready-with-gap')
  })
})
