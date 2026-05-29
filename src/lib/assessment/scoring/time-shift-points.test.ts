/**
 * Tests for the time-shift-points scoring strategy (Assessment 6).
 *
 * The hard parts of this strategy: the three-round lookup by roundId,
 * the rising/falling/anchor identification, the stable-shape detection,
 * and the sum validation per round.
 */

import { describe, it, expect } from 'vitest'
import { scoreTimeShiftPoints, ScoringError } from './time-shift-points'
import type {
  Answers,
  Assessment,
  PointAllocationAnswer,
} from '@/types/assessment'

// ── FIXTURE ─────────────────────────────────────────────────────────────

function makeAssessment(): Assessment {
  return {
    _id: 'test-success',
    slug: 'test-success',
    displayTitle: 'Test Success Definition',
    estimatedMinutes: 3,
    scoringStrategy: 'time-shift-points',
    pointAllocationFactors: [
      { _key: 'f1', id: 'money', label: 'Money' },
      { _key: 'f2', id: 'recognition', label: 'Recognition' },
      { _key: 'f3', id: 'craft', label: 'Craft' },
      { _key: 'f4', id: 'connection', label: 'Connection' },
      { _key: 'f5', id: 'contribution', label: 'Contribution' },
    ],
    questions: [
      {
        _key: 'q-past',
        _type: 'questionPointAllocation',
        roundLabel: 'You, 10 years ago',
        roundId: 'past',
        totalPoints: 11,
      },
      {
        _key: 'q-present',
        _type: 'questionPointAllocation',
        roundLabel: 'You, today',
        roundId: 'present',
        totalPoints: 11,
      },
      {
        _key: 'q-future',
        _type: 'questionPointAllocation',
        roundLabel: 'You, 10 years from now',
        roundId: 'future',
        totalPoints: 11,
      },
    ],
    resultTiers: [],
    visualisation: 'timeShiftLines',
  }
}

function answers(
  past: PointAllocationAnswer,
  present: PointAllocationAnswer,
  future: PointAllocationAnswer
): Answers {
  return {
    'q-past': past,
    'q-present': present,
    'q-future': future,
  }
}

// ── BASIC SCORING ──────────────────────────────────────────────────────

describe('scoreTimeShiftPoints — basic scoring', () => {
  it('reads past/present/future via roundId regardless of question order', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.rounds.past.money).toBe(5)
    expect(result.raw.rounds.present.money).toBe(3)
    expect(result.raw.rounds.future.money).toBe(2)
  })

  it('builds factor scores with correct drift', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    const craft = result.raw.factors.find((f) => f.id === 'craft')!
    expect(craft.past).toBe(1)
    expect(craft.present).toBe(3)
    expect(craft.future).toBe(4)
    expect(craft.drift).toBe(3) // 4 - 1
    const money = result.raw.factors.find((f) => f.id === 'money')!
    expect(money.drift).toBe(-3) // 2 - 5
  })

  it('treats missing factor keys as 0', () => {
    const assessment = makeAssessment()
    // Sum of present is 5+3+0+3+0 = 11 (omitting connection and contribution)
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 5, recognition: 3, craft: 3 } as PointAllocationAnswer,
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    const connection = result.raw.factors.find((f) => f.id === 'connection')!
    expect(connection.present).toBe(0)
  })
})

// ── RISING / FALLING / ANCHOR ───────────────────────────────────────────

describe('scoreTimeShiftPoints — rising/falling/anchor identification', () => {
  it('identifies the rising factor (largest positive drift)', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.rising_factor).toBe('craft')
  })

  it('identifies the falling factor (largest negative drift)', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.falling_factor).toBe('money')
  })

  it('identifies an anchor factor (same score across all three rounds)', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.anchor_factor).toBe('contribution')
  })

  it('returns null anchor when no factor is stable', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 4, recognition: 2, craft: 2, connection: 2, contribution: 1 }, // contribution still 1
      { money: 3, recognition: 1, craft: 3, connection: 2, contribution: 2 }  // contribution moves to 2
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.anchor_factor).toBe(null)
    expect(result.variables.has_anchor).toBe(0)
  })

  it('picks anchor by declaration order when multiple exist', () => {
    const assessment = makeAssessment()
    // Both connection and contribution are stable at 1. Declaration order:
    // money, recognition, craft, connection, contribution → connection wins.
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    // First stable factor in declaration order wins. Money is also stable
    // here — and money comes first in declaration order.
    expect(result.raw.anchor_factor).toBe('money')
  })
})

// ── STABLE SHAPE ───────────────────────────────────────────────────────

describe('scoreTimeShiftPoints — stable shape pattern', () => {
  it('detects stable shape when total drift magnitude is low', () => {
    const assessment = makeAssessment()
    // Each round is identical → all drifts are 0
    const distribution = {
      money: 3,
      recognition: 2,
      craft: 3,
      connection: 2,
      contribution: 1,
    }
    const a = answers(distribution, distribution, distribution)
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.is_stable_shape).toBe(true)
    expect(result.raw.total_drift_magnitude).toBe(0)
    expect(result.interpretationKeys).toContain('pattern.stable_shape')
  })

  it('does NOT flag stable shape when drift is significant', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.is_stable_shape).toBe(false)
    expect(result.interpretationKeys).not.toContain('pattern.stable_shape')
  })

  it('still emits rising/falling keys even when stable shape', () => {
    const assessment = makeAssessment()
    // Minimal drift but not zero
    const a = answers(
      { money: 4, recognition: 3, craft: 1, connection: 2, contribution: 1 },
      { money: 4, recognition: 3, craft: 1, connection: 2, contribution: 1 },
      { money: 3, recognition: 3, craft: 2, connection: 2, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    // Total drift magnitude: |−1| + 0 + |+1| + 0 + 0 = 2, below threshold 6
    expect(result.raw.is_stable_shape).toBe(true)
    // But rising and falling factor keys still surface
    expect(result.interpretationKeys).toContain('factor.rising.craft')
    expect(result.interpretationKeys).toContain('factor.falling.money')
  })
})

// ── INTERPRETATION KEYS ────────────────────────────────────────────────

describe('scoreTimeShiftPoints — interpretation key emission', () => {
  it('always emits rising and falling factor keys', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.interpretationKeys).toContain('factor.rising.craft')
    expect(result.interpretationKeys).toContain('factor.falling.money')
  })

  it('emits anchor key only when anchor exists', () => {
    const assessment = makeAssessment()
    const withAnchor = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: withAnchor })
    expect(result.interpretationKeys).toContain('anchor.contribution')
  })

  it('does not emit anchor key when no anchor exists', () => {
    const assessment = makeAssessment()
    const noAnchor = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 4, recognition: 2, craft: 2, connection: 2, contribution: 1 },
      { money: 3, recognition: 1, craft: 3, connection: 2, contribution: 2 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: noAnchor })
    expect(
      result.interpretationKeys.some((k) => k.startsWith('anchor.'))
    ).toBe(false)
  })
})

// ── VARIABLES ──────────────────────────────────────────────────────────

describe('scoreTimeShiftPoints — variables for tier conditions', () => {
  it('exposes per-factor drift variables', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.variables.drift_money).toBe(-3)
    expect(result.variables.drift_craft).toBe(3)
    expect(result.variables.drift_contribution).toBe(0)
  })

  it('exposes total_drift_magnitude as a number', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    // |−3| + |−2| + |+3| + |+2| + 0 = 10
    expect(result.variables.total_drift_magnitude).toBe(10)
  })

  it('exposes rising_drift and falling_drift', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.variables.rising_drift).toBe(3) // craft: 4 - 1
    expect(result.variables.falling_drift).toBe(-3) // money: 2 - 5
  })

  it('exposes has_anchor as 0 or 1', () => {
    const assessment = makeAssessment()
    const a = answers(
      { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
    )
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.variables.has_anchor).toBe(1)
  })
})

// ── VALIDATION ─────────────────────────────────────────────────────────

describe('scoreTimeShiftPoints — validation errors', () => {
  it('throws on wrong strategy', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      scoringStrategy: 'dimensional-likert',
    }
    expect(() =>
      scoreTimeShiftPoints({ assessment, answers: {} })
    ).toThrow(/Wrong strategy/)
  })

  it('throws when no factors are declared', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      pointAllocationFactors: [],
    }
    expect(() =>
      scoreTimeShiftPoints({ assessment, answers: {} })
    ).toThrow(/at least one declared pointAllocationFactor/)
  })

  it('throws when fewer than 3 point allocation questions', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      questions: [makeAssessment().questions[0]],
    }
    expect(() =>
      scoreTimeShiftPoints({ assessment, answers: {} })
    ).toThrow(/exactly 3 questionPointAllocation questions, found 1/)
  })

  it('throws when round answer is missing', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreTimeShiftPoints({
        assessment,
        answers: {
          'q-past': {
            money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1,
          },
          'q-present': {
            money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1,
          },
          // q-future missing
        },
      })
    ).toThrow(/Missing or malformed/)
  })

  it('throws when a round sum does not match totalPoints', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreTimeShiftPoints({
        assessment,
        answers: answers(
          { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
          { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 0 }, // sum = 10, not 11
          { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 }
        ),
      })
    ).toThrow(/sum is 10, expected 11/)
  })

  it('throws when round IDs collide', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      questions: [
        {
          _key: 'q1', _type: 'questionPointAllocation',
          roundLabel: 'Past', roundId: 'past', totalPoints: 11,
        },
        {
          _key: 'q2', _type: 'questionPointAllocation',
          roundLabel: 'Past again', roundId: 'past', totalPoints: 11,
        },
        {
          _key: 'q3', _type: 'questionPointAllocation',
          roundLabel: 'Future', roundId: 'future', totalPoints: 11,
        },
      ],
    }
    expect(() =>
      scoreTimeShiftPoints({ assessment, answers: {} })
    ).toThrow(/three distinct roundIds/)
  })
})

// ── EDGE CASES ─────────────────────────────────────────────────────────

describe('scoreTimeShiftPoints — edge cases', () => {
  it('handles a tie between two rising candidates by declaration order', () => {
    const assessment = makeAssessment()
    // money declared first, recognition second. If both have same drift,
    // money wins.
    const a = answers(
      { money: 1, recognition: 1, craft: 5, connection: 3, contribution: 1 },
      { money: 2, recognition: 2, craft: 4, connection: 2, contribution: 1 },
      { money: 4, recognition: 4, craft: 2, connection: 0, contribution: 1 }
    )
    // money: 4 − 1 = 3; recognition: 4 − 1 = 3 → tie
    // craft: 2 − 5 = -3 → fastest falling
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    expect(result.raw.rising_factor).toBe('money')
    expect(result.raw.falling_factor).toBe('craft')
  })

  it('handles all-zero drift (perfectly stable) without crashing', () => {
    const assessment = makeAssessment()
    const distribution = {
      money: 3,
      recognition: 2,
      craft: 3,
      connection: 2,
      contribution: 1,
    }
    const a = answers(distribution, distribution, distribution)
    const result = scoreTimeShiftPoints({ assessment, answers: a })
    // No factor has positive or negative drift → rising and falling both
    // point at the first factor in declaration order (money)
    expect(result.raw.rising_factor).toBe('money')
    expect(result.raw.falling_factor).toBe('money')
    expect(result.raw.total_drift_magnitude).toBe(0)
    expect(result.raw.is_stable_shape).toBe(true)
  })
})
