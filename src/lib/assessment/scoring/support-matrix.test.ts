/**
 * Tests for the support-matrix scoring strategy.
 *
 * The hard part of this strategy isn't math; it's the boolean rules.
 * Each rule gets its own scenario, then we test combinations and edge cases.
 */

import { describe, it, expect } from 'vitest'
import { scoreSupportMatrix, ScoringError } from './support-matrix'
import type {
  Assessment,
  Answers,
  PersonRow,
  PersonRowEntryAnswer,
} from '@/types/assessment'

// ── FIXTURE ─────────────────────────────────────────────────────────────

function makeAssessment(): Assessment {
  return {
    _id: 'test-support-matrix',
    slug: 'test-support-matrix',
    displayTitle: 'Test Support Matrix',
    estimatedMinutes: 4,
    scoringStrategy: 'support-matrix',
    questions: [
      {
        _key: 'q-rows',
        _type: 'questionPersonRowEntry',
        changePromptLabel: 'Name the change',
        minRows: 6,
        maxRows: 10,
        influenceAnchorLow: 'No influence',
        influenceAnchorHigh: 'High influence',
        supportAnchorLow: 'Opposes',
        supportAnchorHigh: 'Strongly supports',
        stanceOptions: [
          { _key: 's1', id: 'engaged', label: 'Engaged' },
          { _key: 's2', id: 'cautious', label: 'Cautious' },
          { _key: 's3', id: 'sceptical', label: 'Sceptical' },
          { _key: 's4', id: 'unknown', label: 'Unknown' },
        ],
      },
    ],
    resultTiers: [],
    visualisation: 'stakeholderMatrix',
  }
}

function row(
  initials: string,
  influence: number,
  support: number,
  stanceId: string = 'engaged'
): PersonRow {
  return { _key: `r-${initials}`, initials, influence, support, stanceId }
}

function withRows(rows: PersonRow[], change = 'Test change'): Answers {
  const answer: PersonRowEntryAnswer = { changeDescription: change, rows }
  return { 'q-rows': answer }
}

// ── BASIC SHAPE ─────────────────────────────────────────────────────────

describe('scoreSupportMatrix — basic shape', () => {
  it('partitions rows into quadrants correctly', () => {
    const assessment = makeAssessment()
    const rows = [
      row('CH', 9, 9), // champion
      row('AL', 3, 8), // ally
      row('RE', 8, 2), // resistance
      row('BG', 2, 3), // background
      row('CH2', 7, 7), // champion (boundary)
      row('BG2', 5, 5), // background (just below threshold for both)
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.counts.champions).toBe(2)
    expect(result.raw.counts.allies).toBe(1)
    expect(result.raw.counts.resistance).toBe(1)
    expect(result.raw.counts.background).toBe(2)
  })

  it('computes correct averages', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 8, 6),
      row('B', 4, 4),
      row('C', 6, 8),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.averages.influence).toBe(6)
    expect(result.raw.averages.support).toBe(6)
  })

  it('captures the change description', () => {
    const assessment = makeAssessment()
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows([row('A', 8, 8)], 'Restructure customer ops by Q3'),
    })
    expect(result.raw.changeDescription).toBe('Restructure customer ops by Q3')
  })
})

// ── DIAGNOSTIC RULES — ONE AT A TIME ────────────────────────────────────

describe('scoreSupportMatrix — diagnostic rules', () => {
  it('fires champion_gap when no champions exist', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 8), row('B', 4, 7), row('C', 5, 9),
      row('D', 2, 8), row('E', 3, 6), row('F', 4, 7),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('champion_gap')
  })

  it('fires outweighed when resistance > champions', () => {
    const assessment = makeAssessment()
    const rows = [
      row('CH', 9, 9),
      row('R1', 8, 2), row('R2', 7, 3), row('R3', 9, 1),
      // Add some background so we don't trigger other flags
      row('BG1', 4, 4), row('BG2', 5, 5),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('outweighed')
  })

  it('fires stuck_at_glass when 3+ allies but ≤1 champion', () => {
    const assessment = makeAssessment()
    const rows = [
      row('AL1', 3, 9), row('AL2', 4, 8), row('AL3', 2, 9), row('AL4', 4, 7),
      row('CH', 8, 8), // exactly 1 champion
      row('BG', 5, 5),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('stuck_at_glass')
  })

  it('does NOT fire stuck_at_glass when champions >= 2', () => {
    const assessment = makeAssessment()
    const rows = [
      row('AL1', 3, 9), row('AL2', 4, 8), row('AL3', 2, 9),
      row('CH1', 8, 8), row('CH2', 9, 7), // two champions
      row('BG', 5, 5),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).not.toContain('stuck_at_glass')
  })

  it('fires visibility_gap when avg_influence < 5', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 8), row('B', 2, 7), row('C', 4, 9),
      row('D', 1, 8), row('E', 3, 7), row('F', 2, 6),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('visibility_gap')
    expect(result.raw.averages.influence).toBeLessThan(5)
  })

  it('fires cold_room when avg_support < 5', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 8, 3), row('B', 7, 2), row('C', 9, 4),
      row('D', 8, 1), row('E', 7, 3), row('F', 9, 2),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('cold_room')
    expect(result.raw.averages.support).toBeLessThan(5)
  })

  it('fires stance_visibility when 3+ rows are unknown stance', () => {
    const assessment = makeAssessment()
    const rows = [
      row('CH', 9, 9, 'engaged'),
      row('A', 8, 8, 'unknown'),
      row('B', 7, 7, 'unknown'),
      row('C', 6, 8, 'unknown'),
      row('D', 5, 6, 'cautious'),
      row('E', 4, 7, 'engaged'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('stance_visibility')
  })

  it('counts rows with missing stanceId as unknown', () => {
    const assessment = makeAssessment()
    const rows: PersonRow[] = [
      { _key: 'r1', initials: 'A', influence: 9, support: 9 }, // no stanceId
      { _key: 'r2', initials: 'B', influence: 8, support: 8 }, // no stanceId
      { _key: 'r3', initials: 'C', influence: 7, support: 8 }, // no stanceId
      row('D', 6, 8, 'engaged'),
      row('E', 5, 7, 'engaged'),
      row('F', 4, 6, 'engaged'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.counts.unknown_count).toBe(3)
    expect(result.raw.flagsFired).toContain('stance_visibility')
  })

  it('fires ai_alignment when <50% of high-influence rows are engaged or cautious', () => {
    const assessment = makeAssessment()
    // 4 high-influence rows; only 1 is engaged/cautious → 25%
    const rows = [
      row('H1', 8, 7, 'sceptical'),
      row('H2', 9, 6, 'sceptical'),
      row('H3', 7, 8, 'unknown'),
      row('H4', 8, 7, 'engaged'),
      row('L1', 3, 8, 'engaged'), // low influence, doesn't count
      row('L2', 4, 7, 'engaged'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.aiAlignmentScore).toBe(25)
    expect(result.raw.flagsFired).toContain('ai_alignment')
  })

  it('does NOT fire ai_alignment when there are no high-influence rows', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 8, 'sceptical'),
      row('B', 4, 7, 'sceptical'),
      row('C', 2, 8, 'unknown'),
      row('D', 5, 6, 'unknown'),
      row('E', 4, 7, 'unknown'),
      row('F', 3, 6, 'sceptical'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    // No high-influence rows → ai_alignment_score = 0 but flag shouldn't fire
    expect(result.raw.aiAlignmentScore).toBe(0)
    expect(result.raw.flagsFired).not.toContain('ai_alignment')
  })

  it('fires champion_ai_misalign when any champion is sceptical', () => {
    const assessment = makeAssessment()
    const rows = [
      row('CH1', 9, 9, 'engaged'),
      row('CH2', 8, 8, 'sceptical'), // sceptical champion
      row('AL', 3, 8, 'engaged'),
      row('BG', 4, 5, 'engaged'),
      row('R', 7, 4, 'engaged'),
      row('B2', 5, 5, 'cautious'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toContain('champion_ai_misalign')
    expect(result.variables.has_sceptical_champion).toBe(1)
  })
})

// ── HEALTHY MAP ─────────────────────────────────────────────────────────

describe('scoreSupportMatrix — healthy map', () => {
  it('fires healthy_map when no other flags fire', () => {
    const assessment = makeAssessment()
    // Two champions (both engaged), two allies, two background.
    // Avg influence ~6, avg support ~6.5. No unknowns. All AI-aligned.
    const rows = [
      row('CH1', 9, 9, 'engaged'),
      row('CH2', 8, 8, 'engaged'),
      row('AL1', 4, 8, 'engaged'),
      row('AL2', 3, 7, 'cautious'),
      row('BG1', 4, 4, 'engaged'),
      row('BG2', 5, 4, 'engaged'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).toEqual(['healthy_map'])
    expect(result.interpretationKeys).toEqual(['gap.healthy_map'])
  })

  it('healthy_map does NOT fire if any other flag fires', () => {
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 8), row('B', 4, 7), row('C', 5, 9),
      row('D', 2, 8), row('E', 3, 6), row('F', 4, 7),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired).not.toContain('healthy_map')
  })
})

// ── COMBINATIONS ────────────────────────────────────────────────────────

describe('scoreSupportMatrix — flag combinations', () => {
  it('can surface multiple flags simultaneously', () => {
    // Champion gap + outweighed + visibility gap all at once
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 7), row('B', 4, 6), row('C', 2, 8),
      row('D', 6, 3), row('E', 7, 4), row('F', 8, 2),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.flagsFired.length).toBeGreaterThan(1)
    expect(result.raw.flagsFired).toContain('champion_gap')
    expect(result.raw.flagsFired).toContain('outweighed')
  })

  it('flags fire in declaration order', () => {
    // Trigger champion_gap, outweighed, visibility_gap
    const assessment = makeAssessment()
    const rows = [
      row('A', 3, 7), row('B', 4, 6), row('C', 2, 8),
      row('D', 8, 3), row('E', 7, 4), row('F', 9, 2),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    const firedSet = new Set(result.raw.flagsFired)
    // Confirm we got champion_gap and outweighed (the order in flagsFired is
    // determined by the order rules are evaluated)
    const expectedOrder = [
      'champion_gap',
      'outweighed',
      'stuck_at_glass',
      'visibility_gap',
      'cold_room',
      'stance_visibility',
      'ai_alignment',
      'champion_ai_misalign',
    ]
    const actualOrder = result.raw.flagsFired.filter((f) =>
      expectedOrder.includes(f)
    )
    const expectedFiltered = expectedOrder.filter((f) => firedSet.has(f))
    expect(actualOrder).toEqual(expectedFiltered)
  })
})

// ── VARIABLES EXPOSED ──────────────────────────────────────────────────

describe('scoreSupportMatrix — variables for condition evaluator', () => {
  it('exposes all expected variables', () => {
    const assessment = makeAssessment()
    const rows = [
      row('CH', 9, 9, 'engaged'),
      row('AL', 3, 8, 'cautious'),
      row('RE', 8, 2, 'sceptical'),
      row('BG', 4, 4, 'unknown'),
      row('CH2', 7, 7, 'engaged'),
      row('A2', 5, 6, 'engaged'),
    ]
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.variables.total).toBe(6)
    expect(result.variables.champions).toBe(2)
    expect(result.variables.allies).toBe(2)
    expect(result.variables.resistance).toBe(1)
    expect(result.variables.background).toBe(1)
    expect(typeof result.variables.avg_influence).toBe('number')
    expect(typeof result.variables.avg_support).toBe('number')
    expect(result.variables.unknown_count).toBe(1)
    expect(typeof result.variables.ai_alignment_score).toBe('number')
    expect(typeof result.variables.has_sceptical_champion).toBe('number')
  })
})

// ── VALIDATION ──────────────────────────────────────────────────────────

describe('scoreSupportMatrix — validation errors', () => {
  it('throws on wrong strategy', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      scoringStrategy: 'dimensional-likert',
    }
    expect(() =>
      scoreSupportMatrix({ assessment, answers: withRows([row('A', 5, 5)]) })
    ).toThrow(/Wrong strategy/)
  })

  it('throws when no person-row question is declared', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      questions: [],
    }
    expect(() =>
      scoreSupportMatrix({ assessment, answers: withRows([row('A', 5, 5)]) })
    ).toThrow(/exactly one questionPersonRowEntry, found 0/)
  })

  it('throws when no answer is provided', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreSupportMatrix({ assessment, answers: {} })
    ).toThrow(/Missing or malformed/)
  })

  it('throws on out-of-range influence', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreSupportMatrix({
        assessment,
        answers: withRows([row('A', 11, 5)]),
      })
    ).toThrow(/invalid influence/)
  })

  it('throws on out-of-range support', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreSupportMatrix({
        assessment,
        answers: withRows([row('A', 5, -1)]),
      })
    ).toThrow(/invalid support/)
  })
})

// ── EDGE CASES ──────────────────────────────────────────────────────────

describe('scoreSupportMatrix — edge cases', () => {
  it('handles boundary values at 6 correctly (counted as high)', () => {
    const assessment = makeAssessment()
    // influence=6 and support=6 should land in champions
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows([row('A', 6, 6, 'engaged')]),
    })
    expect(result.raw.quadrants.champions).toHaveLength(1)
    expect(result.raw.quadrants.allies).toHaveLength(0)
  })

  it('handles 5/5 as background (just below threshold)', () => {
    const assessment = makeAssessment()
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows([row('A', 5, 5, 'engaged')]),
    })
    expect(result.raw.quadrants.background).toHaveLength(1)
    expect(result.raw.quadrants.champions).toHaveLength(0)
  })

  it('handles the minimum 6 rows', () => {
    const assessment = makeAssessment()
    const rows = Array.from({ length: 6 }, (_, i) =>
      row(`P${i}`, 7, 7, 'engaged')
    )
    const result = scoreSupportMatrix({
      assessment,
      answers: withRows(rows),
    })
    expect(result.raw.counts.total).toBe(6)
  })
})
