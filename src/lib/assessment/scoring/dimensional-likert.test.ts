/**
 * Tests for the dimensional-likert scoring strategy.
 *
 * Built around the actual Assessment 1 (Coaching Readiness) structure
 * so any change to the spec gets caught here.
 */

import { describe, it, expect } from 'vitest'
import { scoreDimensionalLikert, ScoringError } from './dimensional-likert'
import type { Assessment, Answers } from '@/types/assessment'

// ── FIXTURE ─────────────────────────────────────────────────────────────
// A minimal Assessment 1 — three dimensions, three questions per dimension.

function makeAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    _id: 'test-assessment',
    slug: 'test',
    displayTitle: 'Test',
    estimatedMinutes: 4,
    scoringStrategy: 'dimensional-likert',
    dimensions: [
      { _key: 'd1', id: 'clarity', label: 'Clarity' },
      { _key: 'd2', id: 'reflection', label: 'Reflection' },
      { _key: 'd3', id: 'currency', label: 'Currency' },
    ],
    questions: [
      { _key: 'q1', _type: 'questionAgreement5', prompt: 'Q1', dimensionId: 'clarity' },
      { _key: 'q2', _type: 'questionAgreement5', prompt: 'Q2', dimensionId: 'clarity' },
      { _key: 'q3', _type: 'questionAgreement5', prompt: 'Q3', dimensionId: 'clarity' },
      { _key: 'q4', _type: 'questionAgreement5', prompt: 'Q4', dimensionId: 'reflection' },
      { _key: 'q5', _type: 'questionAgreement5', prompt: 'Q5', dimensionId: 'reflection' },
      { _key: 'q6', _type: 'questionAgreement5', prompt: 'Q6', dimensionId: 'reflection' },
      { _key: 'q7', _type: 'questionAgreement5', prompt: 'Q7', dimensionId: 'currency' },
      { _key: 'q8', _type: 'questionAgreement5', prompt: 'Q8', dimensionId: 'currency' },
      { _key: 'q9', _type: 'questionAgreement5', prompt: 'Q9', dimensionId: 'currency' },
    ],
    resultTiers: [],
    visualisation: 'dimensionBars',
    ...overrides,
  }
}

// ── TESTS ───────────────────────────────────────────────────────────────

describe('scoreDimensionalLikert — happy path', () => {
  it('computes dimension averages and overall correctly', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5, q3: 5,    // clarity → 5.0
      q4: 3, q5: 3, q6: 3,    // reflection → 3.0
      q7: 4, q8: 4, q9: 4,    // currency → 4.0
    }
    const result = scoreDimensionalLikert({ assessment, answers })

    expect(result.raw.dimensions.clarity).toBe(5)
    expect(result.raw.dimensions.reflection).toBe(3)
    expect(result.raw.dimensions.currency).toBe(4)
    expect(result.raw.overall).toBe(4)
    expect(result.raw.lowestDimension).toBe('reflection')
    expect(result.raw.highestDimension).toBe('clarity')
  })

  it('rounds to 2 decimal places (no floating point noise)', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 4, q2: 4, q3: 3,    // clarity = 11/3 = 3.666...
      q4: 3, q5: 3, q6: 3,
      q7: 4, q8: 4, q9: 4,
    }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.dimensions.clarity).toBe(3.67)
  })

  it('makes dimension values available to the condition evaluator', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5, q3: 5,
      q4: 3, q5: 3, q6: 3,
      q7: 4, q8: 4, q9: 4,
    }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.variables.overall).toBe(4)
    expect(result.variables.clarity).toBe(5)
    expect(result.variables.reflection).toBe(3)
    expect(result.variables.currency).toBe(4)
    expect(result.variables.lowest).toBe('reflection')
  })

  it('produces gap.{lowest} interpretation key', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5, q3: 5,
      q4: 3, q5: 3, q6: 3,
      q7: 4, q8: 4, q9: 4,
    }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.interpretationKeys).toEqual(['gap.reflection'])
  })
})

describe('scoreDimensionalLikert — reverse scoring', () => {
  it('reverses 5 → 1 when reverseScored is true', () => {
    const assessment = makeAssessment({
      questions: [
        {
          _key: 'q1',
          _type: 'questionAgreement5',
          prompt: 'Reversed',
          dimensionId: 'clarity',
          reverseScored: true,
        },
      ],
      dimensions: [{ _key: 'd1', id: 'clarity', label: 'Clarity' }],
    })
    const result = scoreDimensionalLikert({ assessment, answers: { q1: 5 } })
    expect(result.raw.dimensions.clarity).toBe(1)
  })

  it('reverses 1 → 5 when reverseScored is true', () => {
    const assessment = makeAssessment({
      questions: [
        {
          _key: 'q1',
          _type: 'questionAgreement5',
          prompt: 'Reversed',
          dimensionId: 'clarity',
          reverseScored: true,
        },
      ],
      dimensions: [{ _key: 'd1', id: 'clarity', label: 'Clarity' }],
    })
    const result = scoreDimensionalLikert({ assessment, answers: { q1: 1 } })
    expect(result.raw.dimensions.clarity).toBe(5)
  })

  it('does not reverse when flag is absent or false', () => {
    const assessment = makeAssessment({
      questions: [
        {
          _key: 'q1',
          _type: 'questionAgreement5',
          prompt: 'Normal',
          dimensionId: 'clarity',
        },
      ],
      dimensions: [{ _key: 'd1', id: 'clarity', label: 'Clarity' }],
    })
    const result = scoreDimensionalLikert({ assessment, answers: { q1: 5 } })
    expect(result.raw.dimensions.clarity).toBe(5)
  })
})

describe('scoreDimensionalLikert — missing answers', () => {
  it('treats missing answers as not contributing', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: 5, q2: 5,           // q3 missing — clarity avg of (5,5) = 5
      q4: 3, q5: 3, q6: 3,
      q7: 4, q8: 4, q9: 4,
    }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.dimensions.clarity).toBe(5)
  })

  it('treats a dimension with zero answers as 0 but excludes from overall', () => {
    const assessment = makeAssessment()
    // Only answer clarity questions
    const answers: Answers = { q1: 5, q2: 5, q3: 5 }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.dimensions.clarity).toBe(5)
    expect(result.raw.dimensions.reflection).toBe(0)
    expect(result.raw.dimensions.currency).toBe(0)
    // Overall = mean of dimensions that received answers = 5
    expect(result.raw.overall).toBe(5)
    expect(result.raw.lowestDimension).toBe('clarity')
  })
})

describe('scoreDimensionalLikert — validation errors', () => {
  it('throws on wrong strategy', () => {
    const assessment = makeAssessment({ scoringStrategy: 'tally-by-tag' })
    expect(() =>
      scoreDimensionalLikert({ assessment, answers: {} })
    ).toThrow(/Wrong strategy/)
  })

  it('throws when no dimensions declared', () => {
    const assessment = makeAssessment({ dimensions: [] })
    expect(() =>
      scoreDimensionalLikert({ assessment, answers: {} })
    ).toThrow(/at least one declared dimension/)
  })

  it('throws on unknown dimensionId on a question (authoring bug)', () => {
    const assessment = makeAssessment({
      questions: [
        {
          _key: 'q1',
          _type: 'questionAgreement5',
          prompt: 'Bad',
          dimensionId: 'nonexistent',
        },
      ],
      dimensions: [{ _key: 'd1', id: 'clarity', label: 'Clarity' }],
    })
    expect(() =>
      scoreDimensionalLikert({ assessment, answers: { q1: 5 } })
    ).toThrow(/unknown dimensionId "nonexistent"/)
  })

  it('throws on out-of-range answer', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreDimensionalLikert({
        assessment,
        answers: { q1: 6 },
      })
    ).toThrow(/must be 1–5/)
    expect(() =>
      scoreDimensionalLikert({
        assessment,
        answers: { q1: 0 },
      })
    ).toThrow(/must be 1–5/)
  })
})

describe('scoreDimensionalLikert — Assessment 1 specific scenarios', () => {
  // These verify against the actual spec for Assessment 1: Coaching Readiness.
  // Five dimensions: A=clarity, B=reflection, C=honesty, D=openness, E=currency.

  function makeRealisticAssessment(): Assessment {
    return {
      _id: 'a',
      slug: 'coaching-readiness',
      displayTitle: 'Coaching Readiness',
      estimatedMinutes: 4,
      scoringStrategy: 'dimensional-likert',
      dimensions: [
        { _key: 'A', id: 'clarity', label: 'Clarity of Intent' },
        { _key: 'B', id: 'reflection', label: 'Capacity to Reflect' },
        { _key: 'C', id: 'honesty', label: 'Honesty with Self' },
        { _key: 'D', id: 'openness', label: 'Openness to Challenge' },
        { _key: 'E', id: 'currency', label: 'Currency' },
      ],
      questions: [
        // Clarity: 3 questions
        { _key: 'q1', _type: 'questionAgreement5', prompt: '', dimensionId: 'clarity' },
        { _key: 'q2', _type: 'questionAgreement5', prompt: '', dimensionId: 'clarity' },
        { _key: 'q3', _type: 'questionAgreement5', prompt: '', dimensionId: 'clarity' },
        // Reflection: 3 questions
        { _key: 'q4', _type: 'questionAgreement5', prompt: '', dimensionId: 'reflection' },
        { _key: 'q5', _type: 'questionAgreement5', prompt: '', dimensionId: 'reflection' },
        { _key: 'q6', _type: 'questionAgreement5', prompt: '', dimensionId: 'reflection' },
        // Honesty: 2 questions
        { _key: 'q7', _type: 'questionAgreement5', prompt: '', dimensionId: 'honesty' },
        { _key: 'q8', _type: 'questionAgreement5', prompt: '', dimensionId: 'honesty' },
        // Openness: 2 questions
        { _key: 'q9', _type: 'questionAgreement5', prompt: '', dimensionId: 'openness' },
        { _key: 'q10', _type: 'questionAgreement5', prompt: '', dimensionId: 'openness' },
        // Currency: 3 questions
        { _key: 'q11', _type: 'questionAgreement5', prompt: '', dimensionId: 'currency' },
        { _key: 'q12', _type: 'questionAgreement5', prompt: '', dimensionId: 'currency' },
        { _key: 'q13', _type: 'questionAgreement5', prompt: '', dimensionId: 'currency' },
      ],
      resultTiers: [],
      visualisation: 'dimensionBars',
    }
  }

  it('"Ready" tier scenario: all 5s → overall 5.0', () => {
    const assessment = makeRealisticAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 5])
    )
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.overall).toBe(5)
  })

  it('"Ready, with one gap" scenario: currency low → gap.currency surfaces', () => {
    const assessment = makeRealisticAssessment()
    const answers: Answers = {
      q1: 4, q2: 4, q3: 5,          // clarity ~4.33
      q4: 4, q5: 4, q6: 4,          // reflection 4.0
      q7: 5, q8: 4,                  // honesty 4.5
      q9: 4, q10: 4,                 // openness 4.0
      q11: 2, q12: 2, q13: 3,        // currency ~2.33  ← lowest
    }
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.lowestDimension).toBe('currency')
    expect(result.interpretationKeys).toContain('gap.currency')
    // Overall is between 3.4 and 4.2 → "Ready with one gap" tier
    expect(result.raw.overall).toBeGreaterThanOrEqual(3.4)
    expect(result.raw.overall).toBeLessThan(4.2)
  })

  it('"Not yet" scenario: low everywhere → overall under 2.6', () => {
    const assessment = makeRealisticAssessment()
    const answers: Answers = Object.fromEntries(
      assessment.questions.map((q) => [q._key, 2])
    )
    const result = scoreDimensionalLikert({ assessment, answers })
    expect(result.raw.overall).toBeLessThan(2.6)
  })
})
