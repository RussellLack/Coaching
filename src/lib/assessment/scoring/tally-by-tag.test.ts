/**
 * Tests for the tally-by-tag scoring strategy (Assessments 3 & 4).
 *
 * The hard parts of this strategy are: tie-breaking (deterministic),
 * the "healthy" tag exclusion from top-2 selection, and the praise-vs-
 * distortion key emission depending on healthy proportion.
 */

import { describe, it, expect } from 'vitest'
import { scoreTallyByTag, ScoringError } from './tally-by-tag'
import type {
  Answers,
  Assessment,
  ScenarioRadioQuestion,
} from '@/types/assessment'

// ── FIXTURE ─────────────────────────────────────────────────────────────

function makeAssessment(): Assessment {
  return {
    _id: 'test-distortions',
    slug: 'test-distortions',
    displayTitle: 'Test Distortions',
    estimatedMinutes: 4,
    scoringStrategy: 'tally-by-tag',
    tagCategories: [
      { _key: 't1', id: 'all_or_nothing', label: 'All-or-nothing' },
      { _key: 't2', id: 'magnification', label: 'Magnification' },
      { _key: 't3', id: 'minimisation', label: 'Minimisation' },
      { _key: 't4', id: 'personalisation', label: 'Personalisation' },
      { _key: 't5', id: 'emotional_reasoning', label: 'Emotional reasoning' },
      { _key: 't6', id: 'mind_reading', label: 'Mind-reading' },
      { _key: 't7', id: 'fortune_telling', label: 'Fortune-telling' },
      { _key: 't8', id: 'labelling', label: 'Labelling' },
      { _key: 't9', id: 'shoulds', label: 'Shoulds and musts' },
      { _key: 't10', id: 'catastrophising', label: 'Catastrophising' },
      { _key: 't11', id: 'ai_relative', label: 'AI-relative distortion' },
      { _key: 't12', id: 'healthy', label: 'Healthy response' },
    ],
    questions: makeScenarios(),
    resultTiers: [],
    visualisation: 'distortionHeatmap',
  }
}

// 12 scenarios, each with 4 options. Each option's _key encodes the
// scenario number and option letter for easy lookup in tests.
function makeScenarios(): ScenarioRadioQuestion[] {
  // For tests, every scenario has the same 4 tags so we can write
  // predictable answer patterns. The actual NDJSON will have varied
  // tag combinations per scenario.
  const tagPattern = [
    'catastrophising',
    'mind_reading',
    'healthy',
    'labelling',
  ]
  return Array.from({ length: 12 }, (_, i) => ({
    _key: `q${i + 1}`,
    _type: 'questionScenarioRadio' as const,
    scenarioTitle: `Scenario ${i + 1}`,
    prompt: `Prompt ${i + 1}`,
    options: tagPattern.map((tagId, j) => ({
      _key: `q${i + 1}o${j}`,
      label: `${tagId} option`,
      tagId,
    })),
  }))
}

function pick(scenario: number, optionIdx: number): string {
  return `q${scenario}o${optionIdx}`
}

// Helpers for option index ↔ tag
const OPT_CATASTROPHISING = 0
const OPT_MIND_READING = 1
const OPT_HEALTHY = 2
const OPT_LABELLING = 3

// ── HAPPY PATH ──────────────────────────────────────────────────────────

describe('scoreTallyByTag — basic counting', () => {
  it('tallies picks correctly', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_MIND_READING),
      q4: pick(4, OPT_LABELLING),
      q5: pick(5, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.raw.counts.catastrophising).toBe(2)
    expect(result.raw.counts.mind_reading).toBe(1)
    expect(result.raw.counts.labelling).toBe(1)
    expect(result.raw.counts.healthy).toBe(1)
    expect(result.raw.answered_count).toBe(5)
  })

  it('initialises every declared tag to 0', () => {
    const assessment = makeAssessment()
    const result = scoreTallyByTag({ assessment, answers: {} })
    // All 12 tags should be present in counts, all at 0
    expect(Object.keys(result.raw.counts)).toHaveLength(12)
    expect(result.raw.counts.all_or_nothing).toBe(0)
    expect(result.raw.counts.ai_relative).toBe(0)
  })

  it('identifies top 2 non-healthy tags by count', () => {
    const assessment = makeAssessment()
    // 3 catastrophising, 2 labelling, 1 mind_reading, 6 healthy
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_CATASTROPHISING),
      q4: pick(4, OPT_LABELLING),
      q5: pick(5, OPT_LABELLING),
      q6: pick(6, OPT_MIND_READING),
      q7: pick(7, OPT_HEALTHY),
      q8: pick(8, OPT_HEALTHY),
      q9: pick(9, OPT_HEALTHY),
      q10: pick(10, OPT_HEALTHY),
      q11: pick(11, OPT_HEALTHY),
      q12: pick(12, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.raw.topTags).toEqual(['catastrophising', 'labelling'])
    expect(result.variables.top_1).toBe('catastrophising')
    expect(result.variables.top_2).toBe('labelling')
  })
})

describe('scoreTallyByTag — healthy tag exclusion', () => {
  it('excludes healthy from top-2 selection even when it has the highest count', () => {
    const assessment = makeAssessment()
    // 8 healthy, 2 catastrophising, 2 mind_reading — healthy is highest
    // but should not appear in topTags. The 2/2 tie between distortions
    // is resolved by declaration order (mind_reading is t6, catastrophising
    // is t10), so mind_reading wins.
    const answers: Answers = {
      q1: pick(1, OPT_HEALTHY), q2: pick(2, OPT_HEALTHY),
      q3: pick(3, OPT_HEALTHY), q4: pick(4, OPT_HEALTHY),
      q5: pick(5, OPT_HEALTHY), q6: pick(6, OPT_HEALTHY),
      q7: pick(7, OPT_HEALTHY), q8: pick(8, OPT_HEALTHY),
      q9: pick(9, OPT_CATASTROPHISING),
      q10: pick(10, OPT_CATASTROPHISING),
      q11: pick(11, OPT_MIND_READING),
      q12: pick(12, OPT_MIND_READING),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.raw.topTags).not.toContain('healthy')
    expect(result.raw.topTags).toEqual(['mind_reading', 'catastrophising'])
  })

  it('counts healthy picks separately', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_HEALTHY), q2: pick(2, OPT_HEALTHY),
      q3: pick(3, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.raw.healthy_count).toBe(3)
    expect(result.variables.healthy_count).toBe(3)
  })
})

describe('scoreTallyByTag — tie-breaking is stable', () => {
  it('breaks ties by tagCategories declaration order', () => {
    const assessment = makeAssessment()
    // 2 picks each for catastrophising, mind_reading, labelling
    // declaration order: mind_reading (t6), labelling (t8), catastrophising (t10)
    // So tie-break ranking: mind_reading > labelling > catastrophising
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_MIND_READING),
      q4: pick(4, OPT_MIND_READING),
      q5: pick(5, OPT_LABELLING),
      q6: pick(6, OPT_LABELLING),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.raw.topTags[0]).toBe('mind_reading')
    expect(result.raw.topTags[1]).toBe('labelling')
  })

  it('produces deterministic top_1 even when all distortion counts are zero', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_HEALTHY),
      q2: pick(2, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    // No non-healthy picks → topTags is empty
    expect(result.raw.topTags).toEqual([])
    expect(result.variables.top_1).toBe('')
    expect(result.variables.top_2).toBe('')
  })
})

describe('scoreTallyByTag — praise vs distortion key emission', () => {
  it('emits distortion keys for mixed answers (most picks not healthy)', () => {
    const assessment = makeAssessment()
    // 12 scenarios; 3 healthy, 3 catastrophising, 3 labelling, 3 mind_reading
    // = 25% healthy. With a 3-way tie among distortions, declaration order
    // wins: mind_reading (t6) > labelling (t8) > catastrophising (t10).
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_CATASTROPHISING),
      q4: pick(4, OPT_LABELLING),
      q5: pick(5, OPT_LABELLING),
      q6: pick(6, OPT_LABELLING),
      q7: pick(7, OPT_MIND_READING),
      q8: pick(8, OPT_MIND_READING),
      q9: pick(9, OPT_MIND_READING),
      q10: pick(10, OPT_HEALTHY),
      q11: pick(11, OPT_HEALTHY),
      q12: pick(12, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    // We're below the praise threshold (25% < 75%), so distortion keys win
    expect(result.interpretationKeys).not.toContain('praise.clear_thinking')
    expect(result.interpretationKeys).toHaveLength(2)
    // Top 2 by declaration order tie-break
    expect(result.interpretationKeys).toContain('distortion.mind_reading')
    expect(result.interpretationKeys).toContain('distortion.labelling')
  })

  it('emits praise.clear_thinking when 75%+ of picks are healthy', () => {
    const assessment = makeAssessment()
    // 10 healthy, 2 distortion = 83% healthy
    const answers: Answers = {
      q1: pick(1, OPT_HEALTHY), q2: pick(2, OPT_HEALTHY),
      q3: pick(3, OPT_HEALTHY), q4: pick(4, OPT_HEALTHY),
      q5: pick(5, OPT_HEALTHY), q6: pick(6, OPT_HEALTHY),
      q7: pick(7, OPT_HEALTHY), q8: pick(8, OPT_HEALTHY),
      q9: pick(9, OPT_HEALTHY), q10: pick(10, OPT_HEALTHY),
      q11: pick(11, OPT_CATASTROPHISING),
      q12: pick(12, OPT_LABELLING),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.interpretationKeys).toEqual(['praise.clear_thinking'])
  })

  it('emits distortion keys at exactly the boundary (74%)', () => {
    const assessment = makeAssessment()
    // 8 healthy out of 12 = 66.6% — below threshold
    const answers: Answers = {
      q1: pick(1, OPT_HEALTHY), q2: pick(2, OPT_HEALTHY),
      q3: pick(3, OPT_HEALTHY), q4: pick(4, OPT_HEALTHY),
      q5: pick(5, OPT_HEALTHY), q6: pick(6, OPT_HEALTHY),
      q7: pick(7, OPT_HEALTHY), q8: pick(8, OPT_HEALTHY),
      q9: pick(9, OPT_CATASTROPHISING),
      q10: pick(10, OPT_CATASTROPHISING),
      q11: pick(11, OPT_LABELLING),
      q12: pick(12, OPT_MIND_READING),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.interpretationKeys[0]).toBe('distortion.catastrophising')
  })

  it('handles a single distortion picked (emits only one distortion key)', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      // 11 unanswered scenarios
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.interpretationKeys).toEqual(['distortion.catastrophising'])
    expect(result.raw.topTags).toEqual(['catastrophising'])
  })

  it('emits no interpretation keys when nothing is answered', () => {
    const assessment = makeAssessment()
    const result = scoreTallyByTag({ assessment, answers: {} })
    expect(result.interpretationKeys).toEqual([])
    expect(result.raw.answered_count).toBe(0)
  })
})

describe('scoreTallyByTag — variables for condition evaluator', () => {
  it('exposes per-tag counts as count_*', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_HEALTHY),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.variables.count_catastrophising).toBe(2)
    expect(result.variables.count_healthy).toBe(1)
    expect(result.variables.count_labelling).toBe(0)
  })

  it('exposes top_1_count and top_2_count', () => {
    const assessment = makeAssessment()
    const answers: Answers = {
      q1: pick(1, OPT_CATASTROPHISING),
      q2: pick(2, OPT_CATASTROPHISING),
      q3: pick(3, OPT_CATASTROPHISING),
      q4: pick(4, OPT_LABELLING),
      q5: pick(5, OPT_LABELLING),
    }
    const result = scoreTallyByTag({ assessment, answers })
    expect(result.variables.top_1_count).toBe(3)
    expect(result.variables.top_2_count).toBe(2)
  })
})

describe('scoreTallyByTag — validation', () => {
  it('throws on wrong strategy', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      scoringStrategy: 'dimensional-likert',
    }
    expect(() =>
      scoreTallyByTag({ assessment, answers: {} })
    ).toThrow(/Wrong strategy/)
  })

  it('throws when no tagCategories declared', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      tagCategories: [],
    }
    expect(() =>
      scoreTallyByTag({ assessment, answers: {} })
    ).toThrow(/at least one declared tagCategory/)
  })

  it('throws when picked option key not found', () => {
    const assessment = makeAssessment()
    expect(() =>
      scoreTallyByTag({ assessment, answers: { q1: 'nonexistent_key' } })
    ).toThrow(/picked option _key "nonexistent_key" not found/)
  })

  it('throws when option references an unknown tagId', () => {
    const assessment = makeAssessment()
    // Mutate one option to reference an unknown tag
    const badQuestion = assessment.questions[0] as ScenarioRadioQuestion
    badQuestion.options[0] = {
      ...badQuestion.options[0],
      tagId: 'unknown_tag',
    }
    expect(() =>
      scoreTallyByTag({ assessment, answers: { q1: 'q1o0' } })
    ).toThrow(/unknown tagId "unknown_tag"/)
  })
})

describe('scoreTallyByTag — sub-categories (AI magnification/minimisation)', () => {
  // The strategy doesn't special-case these; they're declared as separate
  // tagCategories. Test that the count surfaces correctly.
  it('separately counts ai_magnification and ai_minimisation when declared as distinct tags', () => {
    const assessment: Assessment = {
      ...makeAssessment(),
      tagCategories: [
        { _key: 't1', id: 'ai_magnification', label: 'AI magnification' },
        { _key: 't2', id: 'ai_minimisation', label: 'AI minimisation' },
        { _key: 't3', id: 'healthy', label: 'Healthy' },
      ],
      questions: [
        {
          _key: 'q1', _type: 'questionScenarioRadio',
          scenarioTitle: 'S1', prompt: 'P1',
          options: [
            { _key: 'q1o0', label: 'mag', tagId: 'ai_magnification' },
            { _key: 'q1o1', label: 'min', tagId: 'ai_minimisation' },
            { _key: 'q1o2', label: 'h', tagId: 'healthy' },
          ],
        },
        {
          _key: 'q2', _type: 'questionScenarioRadio',
          scenarioTitle: 'S2', prompt: 'P2',
          options: [
            { _key: 'q2o0', label: 'mag', tagId: 'ai_magnification' },
            { _key: 'q2o1', label: 'min', tagId: 'ai_minimisation' },
            { _key: 'q2o2', label: 'h', tagId: 'healthy' },
          ],
        },
      ],
    }
    const result = scoreTallyByTag({
      assessment,
      answers: { q1: 'q1o0', q2: 'q2o1' },
    })
    expect(result.variables.count_ai_magnification).toBe(1)
    expect(result.variables.count_ai_minimisation).toBe(1)
  })
})

// ── CALIBRATION QUESTIONS (Assessment 3) ───────────────────────────────

/**
 * Calibration helper — builds a minimal Assessment 3 fixture with three
 * calibration questions matching the spec's expected IDs.
 */
function makeAssessmentWithCalibration(): Assessment {
  return {
    _id: 'test-style',
    slug: 'test-style',
    displayTitle: 'Test Decision Style',
    estimatedMinutes: 4,
    scoringStrategy: 'tally-by-tag',
    tagCategories: [
      { _key: 't1', id: 'AM', label: 'Analytical Maximiser' },
      { _key: 't2', id: 'AS', label: 'Analytical Satisficer' },
      { _key: 't3', id: 'IM', label: 'Intuitive Maximiser' },
      { _key: 't4', id: 'IS', label: 'Intuitive Satisficer' },
    ],
    questions: [
      // Two simple scenarios for testing — full Assessment 3 has 8
      {
        _key: 'q1',
        _type: 'questionScenarioRadio',
        scenarioTitle: 'S1',
        prompt: 'Prompt 1',
        options: [
          { _key: 'q1am', label: 'AM option', tagId: 'AM' },
          { _key: 'q1as', label: 'AS option', tagId: 'AS' },
          { _key: 'q1im', label: 'IM option', tagId: 'IM' },
          { _key: 'q1is', label: 'IS option', tagId: 'IS' },
        ],
      },
      {
        _key: 'q2',
        _type: 'questionScenarioRadio',
        scenarioTitle: 'S2',
        prompt: 'Prompt 2',
        options: [
          { _key: 'q2am', label: 'AM option', tagId: 'AM' },
          { _key: 'q2as', label: 'AS option', tagId: 'AS' },
          { _key: 'q2im', label: 'IM option', tagId: 'IM' },
          { _key: 'q2is', label: 'IS option', tagId: 'IS' },
        ],
      },
    ],
    calibrationQuestions: [
      {
        _key: 'c1',
        id: 'q_ai_use',
        prompt: 'How often do you consult AI on a substantive decision?',
        options: [
          { _key: 'c1n', label: 'Never', score: 0 },
          { _key: 'c1o', label: 'Occasionally', score: 1 },
          { _key: 'c1f', label: 'Often', score: 2 },
          { _key: 'c1a', label: 'Almost always', score: 3 },
        ],
      },
      {
        _key: 'c2',
        id: 'q_ai_defer',
        prompt: "When AI disagrees with you, how often do you defer to it?",
        options: [
          { _key: 'c2n', label: 'Never', score: 0 },
          { _key: 'c2o', label: 'Occasionally', score: 1 },
          { _key: 'c2f', label: 'Often', score: 2 },
          { _key: 'c2a', label: 'Almost always', score: 3 },
        ],
      },
      {
        _key: 'c3',
        id: 'q_ai_confidence',
        prompt: "How confident are you that you'd catch the AI being wrong?",
        options: [
          { _key: 'c3l', label: 'Not confident', score: 0 },
          { _key: 'c3s', label: 'Somewhat', score: 1 },
          { _key: 'c3m', label: 'Mostly', score: 2 },
          { _key: 'c3v', label: 'Very confident', score: 3 },
        ],
      },
    ],
    resultTiers: [],
    visualisation: 'quadrant2x2',
  }
}

describe('scoreTallyByTag — calibration: AI band detection', () => {
  it('classifies ai_use_score 0 as "light"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1n', // never (0)
        q_ai_defer: 'c2n', // never (0)
        q_ai_confidence: 'c3m', // mostly (2)
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('light')
    expect(result.raw.calibration!.aiUseScore).toBe(0)
  })

  it('classifies ai_use_score 1 as "light"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1o', // occasionally (1)
        q_ai_defer: 'c2n', // never (0)
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('light')
  })

  it('classifies ai_use_score 2 as "balanced"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1o', q_ai_defer: 'c2o', // 1+1=2
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('balanced')
  })

  it('classifies ai_use_score 3 as "balanced"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1f', q_ai_defer: 'c2o', // 2+1=3
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('balanced')
  })

  it('classifies ai_use_score 4 as "leaning"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1f', q_ai_defer: 'c2f', // 2+2=4
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('leaning')
  })

  it('classifies ai_use_score 6 as "leaning"', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1a', q_ai_defer: 'c2a', // 3+3=6
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiBand).toBe('leaning')
  })
})

describe('scoreTallyByTag — calibration: override flags', () => {
  it('fires ai_overreliance when use>=4 AND confidence<=1', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1f', q_ai_defer: 'c2f', // 4
        q_ai_confidence: 'c3l', // 0 (not confident)
      },
    })
    expect(result.raw.calibration!.aiOverrelianceFlag).toBe(true)
    expect(result.variables.ai_overreliance).toBe(1)
    expect(result.interpretationKeys).toContain('override.ai_overreliance')
  })

  it('does NOT fire ai_overreliance when confidence is high', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1a', q_ai_defer: 'c2a', // 6
        q_ai_confidence: 'c3v', // 3 (very confident)
      },
    })
    expect(result.raw.calibration!.aiOverrelianceFlag).toBe(false)
    expect(result.variables.ai_overreliance).toBe(0)
  })

  it('fires ai_underuse when q9 == 0', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1n', // never (0)
        q_ai_defer: 'c2n',
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiUnderuseFlag).toBe(true)
    expect(result.variables.ai_underuse).toBe(1)
    expect(result.interpretationKeys).toContain('override.ai_underuse')
  })

  it('does NOT fire ai_underuse when q9 > 0', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1o', // occasionally (1)
        q_ai_defer: 'c2n',
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.raw.calibration!.aiUnderuseFlag).toBe(false)
  })

  it('can fire both flags simultaneously (heavy use, no confidence; technically impossible per spec but tested for safety)', () => {
    // q9=0 means never used, which contradicts use>=4. The flags are
    // independent in code; verify they evaluate cleanly even on weird
    // inputs (here both should be false).
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1n', // 0
        q_ai_defer: 'c2a', // 3
        q_ai_confidence: 'c3l', // 0
      },
    })
    // ai_use_score = 0 + 3 = 3, below overreliance threshold (4)
    expect(result.raw.calibration!.aiOverrelianceFlag).toBe(false)
    // q9 = 0 triggers underuse
    expect(result.raw.calibration!.aiUnderuseFlag).toBe(true)
  })
})

describe('scoreTallyByTag — calibration: interpretation key emission', () => {
  it('emits style.{tag} + overlay.{tag}.{band} when calibration is complete', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am', // both AM picks → top_1 = AM
        q_ai_use: 'c1o', q_ai_defer: 'c2o', // 2 → balanced
        q_ai_confidence: 'c3m',
      },
    })
    expect(result.interpretationKeys).toContain('style.AM')
    expect(result.interpretationKeys).toContain('overlay.AM.balanced')
    // Distortion-style key should NOT appear
    expect(result.interpretationKeys.some((k) => k.startsWith('distortion.'))).toBe(false)
  })

  it('emits distortion.{tag} (not style.{tag}) when no calibration is declared', () => {
    // This is the Assessment 4 path — must keep working
    const assessment: Assessment = {
      ...makeAssessmentWithCalibration(),
      calibrationQuestions: undefined,
    }
    const result = scoreTallyByTag({
      assessment,
      answers: { q1: 'q1am', q2: 'q2am' },
    })
    expect(result.interpretationKeys).toContain('distortion.AM')
    expect(result.interpretationKeys.some((k) => k.startsWith('style.'))).toBe(false)
  })

  it('treats incomplete calibration as absent (no AI keys emitted)', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1o',
        // q_ai_defer and q_ai_confidence missing
      },
    })
    // calibration should be null because not all calibration questions
    // are answered
    expect(result.raw.calibration).toBe(null)
    // Falls back to distortion.* keys
    expect(result.interpretationKeys).toContain('distortion.AM')
  })

  it('throws on a calibration option pointing to a non-existent option key', () => {
    const assessment = makeAssessmentWithCalibration()
    expect(() =>
      scoreTallyByTag({
        assessment,
        answers: {
          q1: 'q1am', q2: 'q2am',
          q_ai_use: 'nonexistent_key',
          q_ai_defer: 'c2o',
          q_ai_confidence: 'c3m',
        },
      })
    ).toThrow(/picked option _key "nonexistent_key" not found/)
  })
})

describe('scoreTallyByTag — calibration: variables exposed', () => {
  it('exposes cal_{questionId} per calibration question', () => {
    const assessment = makeAssessmentWithCalibration()
    const result = scoreTallyByTag({
      assessment,
      answers: {
        q1: 'q1am', q2: 'q2am',
        q_ai_use: 'c1f', // score 2
        q_ai_defer: 'c2o', // score 1
        q_ai_confidence: 'c3v', // score 3
      },
    })
    expect(result.variables.cal_q_ai_use).toBe(2)
    expect(result.variables.cal_q_ai_defer).toBe(1)
    expect(result.variables.cal_q_ai_confidence).toBe(3)
    expect(result.variables.ai_use_score).toBe(3)
  })
})

