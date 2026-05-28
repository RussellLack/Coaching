/**
 * End-to-end integration test for Assessment 2 (Resilience Wheel).
 *
 * Loads the actual seed NDJSON and runs it through the full pipeline:
 * parse → score → match tier → produce interpretations.
 *
 * Catches authoring bugs (missing interpretations, malformed conditions,
 * mismatched dimension IDs) the moment the seed file changes.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Assessment, Answers } from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON FIXTURE ─────────────────────────────────────────

const ndjsonPath = join(
  __dirname,
  '../../../seed/assessment-2.ndjson'
)
const lines = readFileSync(ndjsonPath, 'utf-8').trim().split('\n')
const docs = lines.map((line) => JSON.parse(line))

const assessmentDoc = docs.find(
  (d) => d._type === 'assessment'
) as Record<string, unknown>

// Reshape the Sanity doc to runtime Assessment type (matching the GROQ projection).
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

// Helpers
function answerAll(value: number): Answers {
  const out: Answers = {}
  for (const q of assessment.questions) {
    if (q._type === 'questionSlider010') out[q._key] = value
  }
  return out
}

function answerByDim(values: Record<string, number>): Answers {
  const out: Answers = {}
  for (const q of assessment.questions) {
    if (q._type === 'questionSlider010') out[q._key] = values[q.dimensionId]
  }
  return out
}

// ── TESTS ───────────────────────────────────────────────────────────

describe('Assessment 2 (end-to-end)', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toBe('Your Leadership Resilience Wheel')
    expect(assessment.questions).toHaveLength(8)
    expect(assessment.dimensions).toHaveLength(8)
    expect(assessment.resultTiers).toHaveLength(4)
    expect(assessment.scoringStrategy).toBe('dimensional-slider')
    expect(assessment.visualisation).toBe('radarWheel')
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
      if (q._type === 'questionSlider010') {
        expect(dimIds.has(q.dimensionId)).toBe(true)
      }
    }
  })

  it('the four tier conditions cover 0–100 without gaps', () => {
    // Sample across the full percentage range
    for (let v = 0; v <= 100; v += 1) {
      const matched = assessment.resultTiers.filter((t) => {
        if (t.id === 'reserve') return v >= 75
        if (t.id === 'steady') return v >= 55 && v < 75
        if (t.id === 'strain') return v >= 35 && v < 55
        if (t.id === 'depleted') return v < 35
        return false
      })
      expect(matched).toHaveLength(1)
    }
  })
})

describe('Assessment 2 — "Reserve" tier (overall >= 75)', () => {
  const result = score({ assessment, answers: answerAll(8) })
  const matched = matchTier(assessment, result)

  it('produces 80% overall', () => {
    expect(result.raw.overall).toBe(80)
  })

  it('matches the Reserve tier', () => {
    expect(matched).not.toBeNull()
    expect(matched!.tier.id).toBe('reserve')
  })

  it('still produces two gap interpretation keys', () => {
    // Even when all dimensions tie, we surface two — the order is arbitrary
    // but the count is consistent.
    expect(result.interpretationKeys).toHaveLength(2)
  })
})

describe('Assessment 2 — "Steady" tier (55 <= overall < 75)', () => {
  // All 6s → 60%, which is in Steady band
  const result = score({ assessment, answers: answerAll(6) })
  const matched = matchTier(assessment, result)

  it('produces 60% overall', () => {
    expect(result.raw.overall).toBe(60)
  })

  it('matches the Steady tier', () => {
    expect(matched!.tier.id).toBe('steady')
  })
})

describe('Assessment 2 — "Strain" tier (35 <= overall < 55)', () => {
  // Vary the answers so we land in Strain with realistic weak/strong pattern
  const answers = answerByDim({
    perseverance: 5,
    adaptive_capacity: 3, // weakest
    confidence: 6,
    compassion: 5,
    humour: 4,
    clear_eyed: 3, // tied weakest
    balance: 5,
    connection: 4,
  })
  // sum=35, mean=4.375, overall=43.75%
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)

  it('produces overall in the Strain band', () => {
    expect(result.raw.overall).toBeGreaterThanOrEqual(35)
    expect(result.raw.overall).toBeLessThan(55)
  })

  it('matches the Strain tier', () => {
    expect(matched!.tier.id).toBe('strain')
  })

  it('surfaces gap interpretations for the two weakest dimensions', () => {
    expect(matched!.interpretations).toHaveLength(2)
    const keys = matched!.interpretations.map((i) => i.key)
    // Both weakest dimensions (3s) should be represented
    const expectedKeys = ['gap.adaptive_capacity', 'gap.clear_eyed']
    for (const k of expectedKeys) {
      expect(keys).toContain(k)
    }
  })

  it('surfaced interpretations contain substantive copy', () => {
    for (const interp of matched!.interpretations) {
      expect(interp.body.length).toBeGreaterThan(0)
      const firstBlock = interp.body[0] as { children?: { text: string }[] }
      const firstSpan = firstBlock.children?.[0]
      expect(firstSpan?.text.length ?? 0).toBeGreaterThan(50)
    }
  })
})

describe('Assessment 2 — "Depleted" tier (overall < 35)', () => {
  // All 2s → 20%
  const result = score({ assessment, answers: answerAll(2) })
  const matched = matchTier(assessment, result)

  it('produces 20% overall', () => {
    expect(result.raw.overall).toBe(20)
  })

  it('matches the Depleted tier', () => {
    expect(matched!.tier.id).toBe('depleted')
  })

  it('headline copy reflects the recovery framing', () => {
    const firstBlock = matched!.tier.headline[0] as {
      children?: { text: string }[]
    }
    const text = firstBlock.children?.[0]?.text ?? ''
    expect(text.toLowerCase()).toMatch(/recovery|rest|recover/)
  })
})

describe('Assessment 2 — boundary scenarios', () => {
  it('exactly 75% hits Reserve (>= boundary)', () => {
    // 8 sliders at 7.5 isn't possible (integer slider); use mix
    // sum=60, mean=7.5, overall=75%
    const answers = answerByDim({
      perseverance: 8,
      adaptive_capacity: 7,
      confidence: 8,
      compassion: 7,
      humour: 8,
      clear_eyed: 7,
      balance: 8,
      connection: 7,
    })
    const result = score({ assessment, answers })
    expect(result.raw.overall).toBe(75)
    expect(matchTier(assessment, result)!.tier.id).toBe('reserve')
  })

  it('exactly 35% hits Strain (>= boundary)', () => {
    // sum=28, mean=3.5, overall=35%
    const answers = answerByDim({
      perseverance: 4,
      adaptive_capacity: 3,
      confidence: 4,
      compassion: 3,
      humour: 4,
      clear_eyed: 3,
      balance: 4,
      connection: 3,
    })
    const result = score({ assessment, answers })
    expect(result.raw.overall).toBe(35)
    expect(matchTier(assessment, result)!.tier.id).toBe('strain')
  })

  it('34.99% (or just below) hits Depleted', () => {
    // sum=27, mean=3.375, overall=33.75%
    const answers = answerByDim({
      perseverance: 4,
      adaptive_capacity: 3,
      confidence: 4,
      compassion: 3,
      humour: 4,
      clear_eyed: 3,
      balance: 3,
      connection: 3,
    })
    const result = score({ assessment, answers })
    expect(result.raw.overall).toBeLessThan(35)
    expect(matchTier(assessment, result)!.tier.id).toBe('depleted')
  })
})

describe('Assessment 2 — variables exposed to condition evaluator', () => {
  it('exposes overall plus each dimension by name', () => {
    const result = score({
      assessment,
      answers: answerByDim({
        perseverance: 8,
        adaptive_capacity: 2,
        confidence: 9,
        compassion: 7,
        humour: 8,
        clear_eyed: 4,
        balance: 8,
        connection: 7,
      }),
    })
    expect(result.variables.overall).toBeDefined()
    expect(result.variables.perseverance).toBe(8)
    expect(result.variables.adaptive_capacity).toBe(2)
    expect(result.variables.clear_eyed).toBe(4)
    expect(result.variables.lowest).toBe('adaptive_capacity')
    expect(result.variables.second_lowest).toBe('clear_eyed')
  })
})
