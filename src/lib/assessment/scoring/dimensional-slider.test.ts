/**
 * Tests for the dimensional-slider scoring strategy.
 *
 * Built around the actual Assessment 2 (Resilience Wheel) structure
 * so changes to the spec get caught here.
 */

import { describe, it, expect } from 'vitest'
import { scoreDimensionalSlider, ScoringError } from './dimensional-slider'
import type { Assessment, Answers } from '@/types/assessment'

// ── FIXTURE ─────────────────────────────────────────────────────────────

function makeAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    _id: 'test-resilience',
    slug: 'test-resilience',
    displayTitle: 'Test Resilience',
    estimatedMinutes: 2,
    scoringStrategy: 'dimensional-slider',
    dimensions: [
      { _key: 'd1', id: 'perseverance', label: 'Perseverance' },
      { _key: 'd2', id: 'adaptive_capacity', label: 'Adaptive Capacity' },
      { _key: 'd3', id: 'confidence', label: 'Confidence' },
      { _key: 'd4', id: 'compassion', label: 'Compassion' },
      { _key: 'd5', id: 'humour', label: 'Humour' },
      { _key: 'd6', id: 'clear_eyed', label: 'Clear-Eyed' },
      { _key: 'd7', id: 'balance', label: 'Balance' },
      { _key: 'd8', id: 'connection', label: 'Connection' },
    ],
    questions: [
      { _key: 'q1', _type: 'questionSlider010', prompt: '', dimensionId: 'perseverance', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q2', _type: 'questionSlider010', prompt: '', dimensionId: 'adaptive_capacity', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q3', _type: 'questionSlider010', prompt: '', dimensionId: 'confidence', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q4', _type: 'questionSlider010', prompt: '', dimensionId: 'compassion', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q5', _type: 'questionSlider010', prompt: '', dimensionId: 'humour', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q6', _type: 'questionSlider010', prompt: '', dimensionId: 'clear_eyed', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q7', _type: 'questionSlider010', prompt: '', dimensionId: 'balance', anchorLow: 'low', anchorHigh: 'high' },
      { _key: 'q8', _type: 'questionSlider010', prompt: '', dimensionId: 'connection', anchorLow: 'low', anchorHigh: 'high' },
    ],
    resultTiers: [],
    visualisation: 'radarWheel',
    ...overrides,
  }
}

// ── TESTS ───────────────────────────────────────────────────────────────

describe('scoreDimensionalSlider — happy path', () => {
  it('computes percentage overall correctly when all sliders are mid-range', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5, q7: 5, q8: 5,
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    // 8 dimensions all at 5 → overall = 50%
    expect(result.raw.overall).toBe(50)
    expect(result.variables.overall).toBe(50)
  })

  it('returns 100% when all sliders are maxed', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 10])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(100)
  })

  it('returns 0% when all sliders are at zero', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 0])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(0)
  })

  it('identifies the two lowest dimensions in order', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 8, q2: 2,  // adaptive_capacity = 2 (lowest)
      q3: 9, q4: 7,
      q5: 8, q6: 4,  // clear_eyed = 4 (second-lowest)
      q7: 8, q8: 7,
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.lowestDimensions[0]).toBe('adaptive_capacity')
    expect(result.raw.lowestDimensions[1]).toBe('clear_eyed')
  })

  it('identifies the two highest dimensions in order', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 8, q2: 5, q3: 10, q4: 7,  // confidence = 10 (highest)
      q5: 8, q6: 4, q7: 9, q8: 7,    // balance = 9 (second-highest)
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.highestDimensions[0]).toBe('confidence')
    expect(result.raw.highestDimensions[1]).toBe('balance')
  })

  it('emits two gap interpretation keys (not one)', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 8, q2: 2, q3: 9, q4: 7,
      q5: 8, q6: 4, q7: 8, q8: 7,
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.interpretationKeys).toEqual(['gap.adaptive_capacity', 'gap.clear_eyed'])
  })

  it('makes every dimension available as a variable', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 8, q2: 2, q3: 9, q4: 7,
      q5: 8, q6: 4, q7: 8, q8: 7,
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.variables.perseverance).toBe(8)
    expect(result.variables.adaptive_capacity).toBe(2)
    expect(result.variables.clear_eyed).toBe(4)
    expect(result.variables.lowest).toBe('adaptive_capacity')
    expect(result.variables.second_lowest).toBe('clear_eyed')
  })
})

describe('scoreDimensionalSlider — averaging within a dimension', () => {
  it('averages multiple sliders for the same dimension', () => {
    const assessment = makeAssessment({
      dimensions: [{ _key: 'd1', id: 'perseverance', label: 'Perseverance' }],
      questions: [
        { _key: 'q1', _type: 'questionSlider010', prompt: '', dimensionId: 'perseverance', anchorLow: 'l', anchorHigh: 'h' },
        { _key: 'q2', _type: 'questionSlider010', prompt: '', dimensionId: 'perseverance', anchorLow: 'l', anchorHigh: 'h' },
        { _key: 'q3', _type: 'questionSlider010', prompt: '', dimensionId: 'perseverance', anchorLow: 'l', anchorHigh: 'h' },
      ],
    })
    const result = scoreDimensionalSlider({
      assessment,
      answers: { q1: 6, q2: 8, q3: 4 },
    })
    expect(result.raw.dimensions.perseverance).toBe(6)
    expect(result.raw.overall).toBe(60)
  })
})

describe('scoreDimensionalSlider — missing answers', () => {
  it('treats missing answers as not contributing', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5, q3: 5, q4: 5,  // half answered
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    // Only 4 of 8 dimensions answered. Each at 5 → mean of those = 5.
    // overall = (5*4 / (4*10)) * 100 = 50%
    expect(result.raw.overall).toBe(50)
  })

  it('excludes unanswered dimensions from lowest selection', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 8, q2: 9,  // only two answered
    }
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.lowestDimensions).toHaveLength(2)
    // Both answered dimensions should appear, ordered by score
    expect(result.raw.lowestDimensions).toEqual(['perseverance', 'adaptive_capacity'])
  })
})

describe('scoreDimensionalSlider — validation errors', () => {
  it('throws on wrong strategy', () => {
    const assessment = makeAssessment({ scoringStrategy: 'tally-by-tag' })
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: {} })
    ).toThrow(/Wrong strategy/)
  })

  it('throws when no dimensions declared', () => {
    const assessment = makeAssessment({ dimensions: [] })
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: {} })
    ).toThrow(/at least one declared dimension/)
  })

  it('throws on unknown dimensionId on a question', () => {
    const assessment = makeAssessment({
      questions: [
        { _key: 'q1', _type: 'questionSlider010', prompt: 'Bad', dimensionId: 'nonexistent', anchorLow: 'l', anchorHigh: 'h' },
      ],
      dimensions: [{ _key: 'd1', id: 'perseverance', label: 'Perseverance' }],
    })
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: { q1: 5 } })
    ).toThrow(/unknown dimensionId "nonexistent"/)
  })

  it('throws on out-of-range slider value (too high)', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: { q1: 11 } })
    ).toThrow(/must be 0–10/)
  })

  it('throws on out-of-range slider value (negative)', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: { q1: -1 } })
    ).toThrow(/must be 0–10/)
  })

  it('accepts the boundary values 0 and 10', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: { q1: 0 } })
    ).not.toThrow()
    expect(() =>
      scoreDimensionalSlider({ assessment, answers: { q1: 10 } })
    ).not.toThrow()
  })
})

describe('scoreDimensionalSlider — Resilience Wheel tier scenarios', () => {
  // The spec maps overall % to four tiers:
  //   75%+ → Reserve
  //   55–74% → Steady
  //   35–54% → Strain
  //   <35% → Depleted

  it('"Reserve" scenario: all 8s → 80%', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 8])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(80)
    expect(result.raw.overall).toBeGreaterThanOrEqual(75)
  })

  it('"Steady" scenario: average 6 → 60%', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 6])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(60)
    expect(result.raw.overall).toBeGreaterThanOrEqual(55)
    expect(result.raw.overall).toBeLessThan(75)
  })

  it('"Strain" scenario: average 4.5 → 45%', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q, i) => [q._key, i % 2 === 0 ? 4 : 5])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(45)
    expect(result.raw.overall).toBeGreaterThanOrEqual(35)
    expect(result.raw.overall).toBeLessThan(55)
  })

  it('"Depleted" scenario: average 2 → 20%', () => {
    const assessment = makeAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 2])
    )
    const result = scoreDimensionalSlider({ assessment, answers })
    expect(result.raw.overall).toBe(20)
    expect(result.raw.overall).toBeLessThan(35)
  })
})
