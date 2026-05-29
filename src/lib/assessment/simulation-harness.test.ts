/**
 * End-to-end simulation harness for the assessment pipeline.
 *
 * NOT a substitute for snapshot completeness review — that needs real
 * users. What this IS:
 *
 *   1. Tier-coverage check. For each of the six assessments, walk
 *      representative answer patterns through the scoring engine and
 *      tier matcher. Record which declared tier ids are actually
 *      reachable from realistic inputs. Any unreachable tier flags
 *      a misconfigured condition (likely shadowed by an earlier-evaluated
 *      tier's condition).
 *
 *   2. Interpretation-key emission check. For each tier reached, record
 *      what interpretation keys came out. Cross-combinations reference
 *      keys by exact string; this confirms the keys actually exist.
 *
 *   3. Cross-combination firing check. For the two seeded combinations,
 *      assemble paired submission records that should match the
 *      requirements, run the matcher, and confirm the combination fires.
 *      This is the most useful check — it's how we catch broken tier id
 *      references between the combinations seed and the assessment seeds
 *      (which we already caught one of: champion_ai_misalignment was a
 *      typo for champion_ai_misalign).
 *
 * Output is a console report at the end. Tests pass or fail on whether
 * the pipeline completes for every input, and on whether the seeded
 * combinations actually fire. They do NOT pass/fail on whether the tier
 * distribution looks pretty — distribution is a real-user concern.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'
import { matchCombination } from './cross-combination'
import type {
  Answers,
  Assessment,
  CrossCombination,
  SubmissionRecord,
} from '@/types/assessment'

// ── LOAD ALL SIX ASSESSMENTS + COMBINATIONS ─────────────────────────────

const SEED_DIR = join(__dirname, '../../../seed')

function loadAssessment(filename: string): Assessment {
  const path = join(SEED_DIR, filename)
  const lines = readFileSync(path, 'utf-8').trim().split('\n')
  const doc = lines
    .map((l) => JSON.parse(l))
    .find((d) => d._type === 'assessment') as Record<string, unknown>
  return {
    _id: doc._id as string,
    slug: (doc.slug as { current: string }).current,
    displayTitle: doc.displayTitle as string,
    tagline: doc.tagline as string | undefined,
    estimatedMinutes: doc.estimatedMinutes as number,
    introCopy: doc.introCopy as Assessment['introCopy'],
    questions: doc.questions as Assessment['questions'],
    calibrationQuestions:
      doc.calibrationQuestions as Assessment['calibrationQuestions'],
    scoringStrategy: doc.scoringStrategy as Assessment['scoringStrategy'],
    tagCategories: doc.tagCategories as Assessment['tagCategories'],
    dimensions: doc.dimensions as Assessment['dimensions'],
    pointAllocationFactors:
      doc.pointAllocationFactors as Assessment['pointAllocationFactors'],
    resultTiers: doc.resultTiers as Assessment['resultTiers'],
    interpretations: doc.interpretations as Assessment['interpretations'],
    visualisation: doc.visualisation as Assessment['visualisation'],
    emailCaptureCopy: doc.emailCaptureCopy as Assessment['emailCaptureCopy'],
    ctaButtonLabel: doc.ctaButtonLabel as string | undefined,
    postCaptureCtaCopy:
      doc.postCaptureCtaCopy as Assessment['postCaptureCtaCopy'],
    crmTags: doc.crmTags as string[] | undefined,
    seoTitle: doc.seoTitle as string | undefined,
    seoDescription: doc.seoDescription as string | undefined,
  }
}

function loadCombinations(): CrossCombination[] {
  const content = readFileSync(
    join(SEED_DIR, 'cross-combinations.ndjson'),
    'utf-8'
  )
  return content
    .trim()
    .split('\n')
    .map((line) => {
      const doc = JSON.parse(line)
      return {
        _id: doc._id,
        title: doc.title,
        slug: doc.slug.current,
        rationale: doc.rationale,
        requirements: doc.requirements,
        emailSubject: doc.emailSubject,
        emailBody: doc.emailBody,
        ctaLabel: doc.ctaLabel,
        ctaHref: doc.ctaHref,
        isActive: doc.isActive,
        orderInList: doc.orderInList,
      } as CrossCombination
    })
}

// ── ANSWER PATTERN BUILDERS ─────────────────────────────────────────────

/**
 * Answer-pattern strategies, one per assessment scoring strategy. Each
 * builder returns a list of named answer patterns ({label, answers}) that
 * exercise the tier surface of the assessment.
 *
 * The patterns aren't exhaustive — they're representative. The goal is
 * tier-coverage, not enumerating every possible answer combination.
 */

interface AnswerPattern {
  label: string
  answers: Answers
}

function patternsForDimensionalLikert(a: Assessment): AnswerPattern[] {
  // 5-point Likert. Three patterns: all 1s (strongly disagree), all 3s
  // (middle), all 5s (strongly agree). Tier surface is determined by
  // dimensional averages, so uniform answers walk through the tier
  // range cleanly.
  const allValue = (v: number): Answers => {
    const out: Answers = {}
    for (const q of a.questions) {
      if (q._type === 'questionAgreement5') out[q._key] = v
    }
    return out
  }
  return [
    { label: 'all-low (1)', answers: allValue(1) },
    { label: 'all-mid (3)', answers: allValue(3) },
    { label: 'all-high (5)', answers: allValue(5) },
  ]
}

function patternsForDimensionalSlider(a: Assessment): AnswerPattern[] {
  // 0-10 sliders. Same shape — three uniform patterns.
  const allValue = (v: number): Answers => {
    const out: Answers = {}
    for (const q of a.questions) {
      if (q._type === 'questionSlider010') out[q._key] = v
    }
    return out
  }
  return [
    { label: 'all-low (2)', answers: allValue(2) },
    { label: 'all-mid (5)', answers: allValue(5) },
    { label: 'all-high (8)', answers: allValue(8) },
  ]
}

function patternsForTallyByTag(a: Assessment): AnswerPattern[] {
  // Pick all answers for a given tag id. Generate one pattern per tag
  // category. Plus a "balanced" pattern that distributes across tags.
  const patterns: AnswerPattern[] = []

  // Collect all tags that show up in any question's options.
  const allTags = new Set<string>()
  for (const q of a.questions) {
    if (q._type !== 'questionScenarioRadio') continue
    for (const opt of q.options) {
      if (opt.tagId) allTags.add(opt.tagId)
    }
  }

  // For each tag, build a pattern that picks that tag wherever possible.
  for (const tag of Array.from(allTags).sort()) {
    const answers: Answers = {}
    for (const q of a.questions) {
      if (q._type !== 'questionScenarioRadio') continue
      const match = q.options.find((o) => o.tagId === tag)
      // Fall back to the first option if this tag doesn't appear in
      // this question — produces a "tag-biased but possible" pattern.
      const chosen = match ?? q.options[0]
      answers[q._key] = chosen._key
    }
    // For tally-by-tag with calibration (Assessment 3), set calibration
    // answers. We try a few calibration-band patterns later for the
    // overlay variants. Here pick the middle (balanced).
    for (const cq of a.calibrationQuestions ?? []) {
      const balanced = cq.options.find((o) => o.score === 1)
      if (balanced) answers[cq.id] = balanced._key
    }
    patterns.push({ label: `tag-skewed:${tag}`, answers })
  }

  // Plus calibration variants for Assessment 3 — three patterns at low,
  // mid, high AI-use bands, with a tag distribution biased toward IS.
  const isQuestions = a.questions.filter(
    (q) => q._type === 'questionScenarioRadio'
  )
  const calibrationVariants = ['low', 'mid', 'high'] as const
  for (const band of calibrationVariants) {
    if (!a.calibrationQuestions || a.calibrationQuestions.length === 0) {
      break
    }
    const answers: Answers = {}
    for (const q of isQuestions) {
      if (q._type !== 'questionScenarioRadio') continue
      const is = q.options.find((o) => o.tagId === 'IS') ?? q.options[0]
      answers[q._key] = is._key
    }
    for (const cq of a.calibrationQuestions) {
      const sorted = [...cq.options].sort((x, y) => x.score - y.score)
      const target =
        band === 'low'
          ? sorted[0]
          : band === 'high'
            ? sorted[sorted.length - 1]
            : sorted[Math.floor(sorted.length / 2)]
      answers[cq.id] = target._key
    }
    patterns.push({
      label: `IS-leaning,ai-${band}`,
      answers,
    })
  }

  // Plus a targeted pattern that should trigger override.ai_overreliance:
  // high AI use scores (q_ai_use, q_ai_defer) AND low AI confidence
  // (q_ai_confidence). This is the actual condition the strategy checks —
  // "uses AI a lot but doesn't trust it" — not just "high band overall".
  if (a.calibrationQuestions && a.calibrationQuestions.length > 0) {
    const answers: Answers = {}
    for (const q of isQuestions) {
      if (q._type !== 'questionScenarioRadio') continue
      const is = q.options.find((o) => o.tagId === 'IS') ?? q.options[0]
      answers[q._key] = is._key
    }
    for (const cq of a.calibrationQuestions) {
      const sorted = [...cq.options].sort((x, y) => x.score - y.score)
      // For q_ai_confidence, pick the LOW end (low confidence in AI).
      // For everything else, pick the HIGH end (lots of use, lots of defer).
      const target =
        cq.id === 'q_ai_confidence'
          ? sorted[0]
          : sorted[sorted.length - 1]
      answers[cq.id] = target._key
    }
    patterns.push({
      label: 'IS-leaning,ai-overreliance (high-use,low-confidence)',
      answers,
    })
  }

  return patterns
}

function patternsForSupportMatrix(a: Assessment): AnswerPattern[] {
  // The support-matrix scoring strategy reads a rows array containing
  // people with influence, support, and stanceId. Build patterns that
  // hit specific tier conditions:
  //   - champion_ai_misalign: at least one high-inf, high-sup, sceptical
  //   - champion_gap: zero champions
  //   - outweighed: more resistance than champions
  //   - healthy_map: balanced, no gaps
  //   - stance_visibility: 3+ unknowns

  const personRowQ = a.questions.find(
    (q) => q._type === 'questionPersonRowEntry'
  )
  if (!personRowQ) return []

  function withRows(label: string, rows: Record<string, unknown>[]): AnswerPattern {
    return {
      label,
      answers: {
        [personRowQ!._key]: {
          change: 'Test change',
          rows: rows.map((r, i) => ({ _key: `r${i}`, initials: 'X.X.', ...r })),
        } as unknown as Answers[string],
      },
    }
  }

  return [
    withRows('champion-ai-misalign (champion is sceptical)', [
      { influence: 9, support: 9, stanceId: 'sceptical' },
      { influence: 6, support: 7, stanceId: 'engaged' },
      { influence: 5, support: 6, stanceId: 'engaged' },
      { influence: 4, support: 5, stanceId: 'cautious' },
      { influence: 7, support: 4, stanceId: 'cautious' },
      { influence: 3, support: 3, stanceId: 'unknown' },
    ]),
    withRows('champion-gap (no high-inf high-sup)', [
      { influence: 5, support: 9, stanceId: 'engaged' },
      { influence: 4, support: 8, stanceId: 'engaged' },
      { influence: 3, support: 7, stanceId: 'cautious' },
      { influence: 5, support: 6, stanceId: 'engaged' },
      { influence: 4, support: 5, stanceId: 'cautious' },
      { influence: 2, support: 3, stanceId: 'unknown' },
    ]),
    withRows('outweighed (more resistance than champions)', [
      { influence: 8, support: 2, stanceId: 'sceptical' },
      { influence: 9, support: 3, stanceId: 'sceptical' },
      { influence: 7, support: 8, stanceId: 'engaged' },
      { influence: 4, support: 5, stanceId: 'cautious' },
      { influence: 3, support: 3, stanceId: 'sceptical' },
      { influence: 5, support: 4, stanceId: 'cautious' },
    ]),
    withRows('stance-visibility (3+ unknowns)', [
      { influence: 7, support: 8, stanceId: 'engaged' },
      { influence: 6, support: 6, stanceId: 'unknown' },
      { influence: 5, support: 5, stanceId: 'unknown' },
      { influence: 4, support: 5, stanceId: 'unknown' },
      { influence: 8, support: 7, stanceId: 'cautious' },
      { influence: 3, support: 4, stanceId: 'cautious' },
    ]),
    withRows('healthy-map (balanced)', [
      { influence: 9, support: 9, stanceId: 'engaged' },
      { influence: 8, support: 8, stanceId: 'engaged' },
      { influence: 7, support: 7, stanceId: 'engaged' },
      { influence: 6, support: 8, stanceId: 'cautious' },
      { influence: 7, support: 6, stanceId: 'cautious' },
      { influence: 5, support: 7, stanceId: 'engaged' },
    ]),
    // ai-alignment-gap: low AI engagement among high-influence stakeholders,
    // BUT no sceptical-champion (so champion_ai_misalign doesn't shadow this).
    // Composition trick: at least 2 champions (so allies >= 3 with single
    // champion doesn't fire), no sceptical anyone, and most high-influence
    // people are "unknown" on AI (not engaged, not cautious — so they don't
    // count as aligned). ai_alignment_score = engaged_or_cautious /
    // high_influence_total. With 2 engaged out of 6 high-influence = 33%.
    withRows('ai-alignment-gap (clean — no sceptical champion)', [
      { influence: 9, support: 8, stanceId: 'engaged' }, // champion
      { influence: 8, support: 7, stanceId: 'engaged' }, // champion
      { influence: 7, support: 7, stanceId: 'unknown' }, // high-inf, not aligned
      { influence: 7, support: 6, stanceId: 'unknown' }, // high-inf, not aligned
      { influence: 6, support: 6, stanceId: 'unknown' }, // high-inf, not aligned
      { influence: 6, support: 6, stanceId: 'unknown' }, // high-inf, not aligned
    ]),
    // stuck-at-glass: 3+ allies (high support, low influence) and ≤1 real
    // champion. Should reach stuck_at_glass now that it sits before
    // outweighed/ai_alignment in the tier order.
    withRows('stuck-at-glass (allies, no champion to clear the road)', [
      { influence: 7, support: 9, stanceId: 'engaged' }, // 1 champion
      { influence: 4, support: 9, stanceId: 'engaged' }, // ally
      { influence: 4, support: 8, stanceId: 'engaged' }, // ally
      { influence: 5, support: 8, stanceId: 'cautious' }, // ally
      { influence: 5, support: 7, stanceId: 'engaged' }, // ally
      { influence: 3, support: 5, stanceId: 'unknown' },
    ]),
    // visibility-gap: avg_influence < 5. Must avoid champion_gap (need ≥1
    // champion → ≥1 row with inf ≥6 AND sup ≥6), avoid champion_ai_misalign
    // (no sceptical champion), avoid stuck_at_glass (need allies < 3 OR
    // champions ≥ 2), avoid outweighed (resistance ≤ champions), and avoid
    // ai_alignment (>= 50% of high-inf are engaged/cautious).
    //
    // The trick: ONE champion (inf 6, sup 6, engaged), no other high-influence
    // rows at all (no resistance), and many low-influence rows that aren't
    // allies (sup < 6). avg_influence drops below 5.
    withRows('visibility-gap (one champion, otherwise sub-decision)', [
      { influence: 6, support: 6, stanceId: 'engaged' }, // 1 champion
      { influence: 3, support: 5, stanceId: 'engaged' }, // background (sup<6)
      { influence: 4, support: 4, stanceId: 'cautious' }, // background
      { influence: 3, support: 4, stanceId: 'engaged' }, // background
      { influence: 4, support: 3, stanceId: 'cautious' }, // background
      { influence: 3, support: 3, stanceId: 'unknown' }, // background
    ]),
    // cold-room: avg_support < 5. Same structural problem as visibility-gap
    // — anyone with low support and high influence becomes resistance, so
    // we need resistance ≤ champions. Solution: 2 champions to balance some
    // resistance + low-support background rows.
    //
    // Also need avg_influence ≥ 5 (so visibility_gap doesn't fire), and
    // ai_alignment_score ≥ 50 (so ai_alignment doesn't fire).
    withRows('cold-room (two champions, mostly low support overall)', [
      { influence: 8, support: 7, stanceId: 'engaged' }, // champion
      { influence: 7, support: 6, stanceId: 'engaged' }, // champion
      { influence: 6, support: 3, stanceId: 'cautious' }, // resistance (still aligned on AI)
      { influence: 6, support: 3, stanceId: 'engaged' }, // resistance (aligned on AI)
      { influence: 5, support: 2, stanceId: 'cautious' }, // background, low-sup
      { influence: 5, support: 2, stanceId: 'engaged' }, // background, low-sup
    ]),
  ]
}

function patternsForTimeShiftPoints(a: Assessment): AnswerPattern[] {
  // Three rounds of point allocation (11 points across 5 factors).
  // Patterns: factor X rising, factor Y rising, stable shape.
  return [
    {
      label: 'craft-rising',
      answers: {
        'q-past': {
          money: 5,
          recognition: 3,
          craft: 1,
          connection: 1,
          contribution: 1,
        },
        'q-present': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-future': {
          money: 2,
          recognition: 1,
          craft: 5,
          connection: 2,
          contribution: 1,
        },
      } as unknown as Answers,
    },
    {
      label: 'money-rising',
      answers: {
        'q-past': {
          money: 1,
          recognition: 2,
          craft: 3,
          connection: 3,
          contribution: 2,
        },
        'q-present': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-future': {
          money: 5,
          recognition: 1,
          craft: 2,
          connection: 2,
          contribution: 1,
        },
      } as unknown as Answers,
    },
    {
      label: 'connection-rising',
      answers: {
        'q-past': {
          money: 3,
          recognition: 3,
          craft: 3,
          connection: 1,
          contribution: 1,
        },
        'q-present': {
          money: 2,
          recognition: 2,
          craft: 3,
          connection: 3,
          contribution: 1,
        },
        'q-future': {
          money: 1,
          recognition: 1,
          craft: 3,
          connection: 5,
          contribution: 1,
        },
      } as unknown as Answers,
    },
    {
      label: 'contribution-rising',
      answers: {
        'q-past': {
          money: 4,
          recognition: 4,
          craft: 1,
          connection: 1,
          contribution: 1,
        },
        'q-present': {
          money: 3,
          recognition: 3,
          craft: 2,
          connection: 1,
          contribution: 2,
        },
        'q-future': {
          money: 2,
          recognition: 1,
          craft: 1,
          connection: 1,
          contribution: 6,
        },
      } as unknown as Answers,
    },
    {
      label: 'recognition-rising',
      answers: {
        'q-past': {
          money: 4,
          recognition: 1,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-present': {
          money: 3,
          recognition: 3,
          craft: 2,
          connection: 2,
          contribution: 1,
        },
        'q-future': {
          money: 2,
          recognition: 5,
          craft: 2,
          connection: 1,
          contribution: 1,
        },
      } as unknown as Answers,
    },
    {
      label: 'stable-shape',
      answers: {
        'q-past': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-present': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-future': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
      } as unknown as Answers,
    },
    {
      label: 'default-drift (small mixed changes)',
      answers: {
        'q-past': {
          money: 2,
          recognition: 3,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-present': {
          money: 3,
          recognition: 2,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
        'q-future': {
          money: 4,
          recognition: 1,
          craft: 3,
          connection: 2,
          contribution: 1,
        },
      } as unknown as Answers,
    },
  ]
}

function patternsFor(a: Assessment): AnswerPattern[] {
  switch (a.scoringStrategy) {
    case 'dimensional-likert':
      return patternsForDimensionalLikert(a)
    case 'dimensional-slider':
      return patternsForDimensionalSlider(a)
    case 'tally-by-tag':
      return patternsForTallyByTag(a)
    case 'support-matrix':
      return patternsForSupportMatrix(a)
    case 'time-shift-points':
      return patternsForTimeShiftPoints(a)
  }
}

// ── RESULT TYPES ────────────────────────────────────────────────────────

interface PatternRun {
  patternLabel: string
  matchedTier: string | null
  interpretationKeys: string[]
}

interface AssessmentCoverage {
  slug: string
  title: string
  declaredTiers: string[]
  patternRuns: PatternRun[]
  reachableTiers: Set<string>
  unreachableTiers: string[]
  emittedKeys: Set<string>
}

function buildCoverage(a: Assessment): AssessmentCoverage {
  const declaredTiers = (a.resultTiers ?? []).map((t) => t.id)
  const patterns = patternsFor(a)
  const patternRuns: PatternRun[] = []
  const reachableTiers = new Set<string>()
  const emittedKeys = new Set<string>()

  for (const p of patterns) {
    const result = score({ assessment: a, answers: p.answers })
    const matched = matchTier(a, result)
    const tier = matched?.tier.id ?? null
    if (tier) reachableTiers.add(tier)
    for (const k of result.interpretationKeys) emittedKeys.add(k)
    patternRuns.push({
      patternLabel: p.label,
      matchedTier: tier,
      interpretationKeys: result.interpretationKeys,
    })
  }

  const unreachableTiers = declaredTiers.filter((t) => !reachableTiers.has(t))

  return {
    slug: a.slug,
    title: a.displayTitle,
    declaredTiers,
    patternRuns,
    reachableTiers,
    unreachableTiers,
    emittedKeys,
  }
}

// ── PER-ASSESSMENT TESTS ────────────────────────────────────────────────

describe('Simulation harness — Assessment 1 (Coaching Readiness)', () => {
  const a = loadAssessment('assessment-1.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier (no silent matcher failures)', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(
      failures,
      `Patterns with no tier match: ${failures.map((r) => r.patternLabel).join(', ')}`
    ).toEqual([])
  })

  it('at least 2 distinct tiers are reachable', () => {
    expect(cov.reachableTiers.size).toBeGreaterThanOrEqual(2)
  })
})

describe('Simulation harness — Assessment 2 (Resilience Wheel)', () => {
  const a = loadAssessment('assessment-2.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(failures).toEqual([])
  })

  it('at least 2 distinct tiers are reachable', () => {
    expect(cov.reachableTiers.size).toBeGreaterThanOrEqual(2)
  })
})

describe('Simulation harness — Assessment 3 (Decision-Making Style)', () => {
  const a = loadAssessment('assessment-3.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(failures).toEqual([])
  })

  it('emits at least one overlay key (the AI band overlays the style)', () => {
    const overlayKeys = Array.from(cov.emittedKeys).filter((k) =>
      k.startsWith('overlay.')
    )
    expect(overlayKeys.length).toBeGreaterThan(0)
  })

  it('emits override.ai_overreliance with high-AI-use + low-AI-confidence pattern', () => {
    // The override fires on the specific condition "uses AI a lot AND has
    // low confidence in its output" — not just "ai-high band overall".
    // The targeted pattern below sets q_ai_use + q_ai_defer to max and
    // q_ai_confidence to min, which is the actual condition the strategy
    // checks. Worth noting: this is a more nuanced flag than the simple
    // band logic above — it requires the calibration questions to express
    // a contradictory pattern ("I use a lot, but I don't trust the output").
    const overrelyPattern = cov.patternRuns.find(
      (r) => r.patternLabel === 'IS-leaning,ai-overreliance (high-use,low-confidence)'
    )
    expect(overrelyPattern).toBeDefined()
    expect(overrelyPattern!.interpretationKeys).toContain(
      'override.ai_overreliance'
    )
  })
})

describe('Simulation harness — Assessment 4 (Cognitive Distortion Spotter)', () => {
  const a = loadAssessment('assessment-4.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(failures).toEqual([])
  })

  it('emits distortion.ai_magnification when the ai_magnification tag is picked', () => {
    const aiMagPattern = cov.patternRuns.find(
      (r) => r.patternLabel === 'tag-skewed:ai_magnification'
    )
    expect(aiMagPattern).toBeDefined()
    expect(aiMagPattern!.interpretationKeys).toContain(
      'distortion.ai_magnification'
    )
  })
})

describe('Simulation harness — Assessment 5 (Support Matrix)', () => {
  const a = loadAssessment('assessment-5.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(failures).toEqual([])
  })

  it('the champion-AI-misalign pattern reaches that tier', () => {
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('champion-ai-misalign')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('champion_ai_misalign')
  })

  it('the champion-gap pattern reaches champion_gap (foundational gap)', () => {
    // Locks in the editorial intent that champion_gap is the most
    // important read when champions == 0, ahead of every more-specific
    // condition.
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('champion-gap')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('champion_gap')
  })

  it('the stuck-at-glass pattern reaches stuck_at_glass', () => {
    // Locks in the editorial decision to move stuck_at_glass ahead of
    // outweighed and ai_alignment. Without that re-order, the
    // outweighed condition (resistance > champions) catches some of the
    // same maps and shadows the more actionable stuck_at_glass read.
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('stuck-at-glass')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('stuck_at_glass')
  })

  it('the ai-alignment-gap pattern reaches ai_alignment when no sceptical champion is present', () => {
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('ai-alignment-gap')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('ai_alignment')
  })

  it('the visibility-gap pattern reaches visibility_gap', () => {
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('visibility-gap')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('visibility_gap')
  })

  it('the cold-room pattern reaches cold_room', () => {
    const pattern = cov.patternRuns.find((r) =>
      r.patternLabel.startsWith('cold-room')
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('cold_room')
  })

  it('all 9 declared tiers are reachable from realistic patterns', () => {
    // The re-order plus carefully constructed patterns prove that every
    // declared tier in Assessment 5 can be reached. If a future tier
    // re-order shadows one of them, this test catches it.
    expect(cov.reachableTiers.size).toBe(9)
    expect(cov.unreachableTiers).toEqual([])
  })
})

describe('Simulation harness — Assessment 6 (Success Definition)', () => {
  const a = loadAssessment('assessment-6.ndjson')
  const cov = buildCoverage(a)

  it('all patterns produce a matched tier', () => {
    const failures = cov.patternRuns.filter((r) => r.matchedTier === null)
    expect(failures).toEqual([])
  })

  it('the craft-rising pattern reaches the craft_rising tier', () => {
    const pattern = cov.patternRuns.find(
      (r) => r.patternLabel === 'craft-rising'
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('craft_rising')
  })

  it('the stable-shape pattern reaches the stable_shape tier', () => {
    const pattern = cov.patternRuns.find(
      (r) => r.patternLabel === 'stable-shape'
    )
    expect(pattern).toBeDefined()
    expect(pattern!.matchedTier).toBe('stable_shape')
  })
})

// ── CROSS-COMBINATION FIRING ────────────────────────────────────────────

/**
 * Construct a SubmissionRecord from an assessment + an answer pattern.
 * Used to assemble simulated multi-assessment histories that should
 * trigger combinations.
 */
function simulateSubmission(
  a: Assessment,
  pattern: AnswerPattern,
  idSuffix: string
): SubmissionRecord {
  const result = score({ assessment: a, answers: pattern.answers })
  const matched = matchTier(a, result)
  if (!matched) {
    throw new Error(
      `Pattern "${pattern.label}" on ${a.slug} produced no tier match`
    )
  }
  return {
    _id: `sim-${a.slug}-${idSuffix}`,
    email: 'sim@example.com',
    emailHash: 'simhash',
    assessmentSlug: a.slug,
    tierId: matched.tier.id,
    interpretationKeys: result.interpretationKeys,
    crmTags: [],
    submittedAt: '2026-01-15T00:00:00Z',
  }
}

describe('Simulation harness — cross-combination firing', () => {
  const combinations = loadCombinations()

  it('loads both seeded combinations', () => {
    expect(combinations).toHaveLength(2)
    expect(combinations.map((c) => c.slug).sort()).toEqual(
      ['ai-overtrust', 'champion-craft-misalignment'].sort()
    )
  })

  it('ai-overtrust combination fires when A3 IS-leaning,ai-high + A4 ai_magnification', () => {
    const a3 = loadAssessment('assessment-3.ndjson')
    const a4 = loadAssessment('assessment-4.ndjson')

    const a3Patterns = patternsForTallyByTag(a3)
    const a4Patterns = patternsForTallyByTag(a4)

    const isHigh = a3Patterns.find((p) => p.label === 'IS-leaning,ai-high')!
    const aiMag = a4Patterns.find(
      (p) => p.label === 'tag-skewed:ai_magnification'
    )!

    const history: SubmissionRecord[] = [
      simulateSubmission(a3, isHigh, 'a3'),
      simulateSubmission(a4, aiMag, 'a4'),
    ]

    const match = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(match).not.toBe(null)
    expect(match!.combination.slug).toBe('ai-overtrust')
  })

  it('champion-craft-misalignment combination fires when A5 champion-ai-misalign + A6 craft-rising', () => {
    const a5 = loadAssessment('assessment-5.ndjson')
    const a6 = loadAssessment('assessment-6.ndjson')

    const a5Patterns = patternsForSupportMatrix(a5)
    const a6Patterns = patternsForTimeShiftPoints(a6)

    const champMisalign = a5Patterns.find((p) =>
      p.label.startsWith('champion-ai-misalign')
    )!
    const craftRising = a6Patterns.find((p) => p.label === 'craft-rising')!

    const history: SubmissionRecord[] = [
      simulateSubmission(a5, champMisalign, 'a5'),
      simulateSubmission(a6, craftRising, 'a6'),
    ]

    const match = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(match).not.toBe(null)
    expect(match!.combination.slug).toBe('champion-craft-misalignment')
  })

  it('does not fire ai-overtrust when only A3 is present', () => {
    const a3 = loadAssessment('assessment-3.ndjson')
    const a3Patterns = patternsForTallyByTag(a3)
    const isHigh = a3Patterns.find((p) => p.label === 'IS-leaning,ai-high')!
    const history = [simulateSubmission(a3, isHigh, 'a3')]
    const match = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(match).toBe(null)
  })

  it('does not fire ai-overtrust when A4 has no AI-relative distortion', () => {
    const a3 = loadAssessment('assessment-3.ndjson')
    const a4 = loadAssessment('assessment-4.ndjson')
    const a3Patterns = patternsForTallyByTag(a3)
    const a4Patterns = patternsForTallyByTag(a4)
    const isHigh = a3Patterns.find((p) => p.label === 'IS-leaning,ai-high')!
    // Pick a non-AI distortion
    const catastrophising = a4Patterns.find(
      (p) => p.label === 'tag-skewed:catastrophising'
    )!
    const history: SubmissionRecord[] = [
      simulateSubmission(a3, isHigh, 'a3'),
      simulateSubmission(a4, catastrophising, 'a4'),
    ]
    const match = matchCombination({
      history,
      combinations,
      alreadyFired: new Set(),
    })
    expect(match).toBe(null)
  })
})

// ── CONSOLE REPORT ──────────────────────────────────────────────────────

/**
 * Print a coverage report at the end of the test run. This test always
 * passes — it exists for the side effect of the console output. Run
 * with `npx vitest run` and read stdout.
 */
describe('Simulation harness — coverage report', () => {
  it('prints coverage to console', () => {
    const assessments = [
      'assessment-1.ndjson',
      'assessment-2.ndjson',
      'assessment-3.ndjson',
      'assessment-4.ndjson',
      'assessment-5.ndjson',
      'assessment-6.ndjson',
    ].map(loadAssessment)

    const lines: string[] = []
    lines.push('')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('  SIMULATION HARNESS — END-TO-END COVERAGE REPORT')
    lines.push('  (Not a substitute for snapshot completeness review —')
    lines.push('   that needs real user data.)')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')

    for (const a of assessments) {
      const cov = buildCoverage(a)
      lines.push(`▸ ${cov.title} (${cov.slug})`)
      lines.push(
        `   Tiers declared: ${cov.declaredTiers.length}    reachable: ${cov.reachableTiers.size}    unreachable: ${cov.unreachableTiers.length}`
      )
      if (cov.unreachableTiers.length > 0) {
        lines.push(
          `   ⚠ unreachable: ${cov.unreachableTiers.join(', ')}`
        )
      }
      lines.push(`   Patterns tested: ${cov.patternRuns.length}`)
      for (const r of cov.patternRuns) {
        const keys = r.interpretationKeys.length
          ? ` [+${r.interpretationKeys.length} keys]`
          : ''
        lines.push(
          `     · ${r.patternLabel.padEnd(40)} → ${r.matchedTier ?? '(no match)'}${keys}`
        )
      }
      lines.push('')
    }

    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('  CROSS-COMBINATION FIRING')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push('Two seeded combinations:')
    lines.push('  1. ai-overtrust              (A3 + A4)')
    lines.push('  2. champion-craft-misalignment (A5 + A6)')
    lines.push('')
    lines.push('Both verified firing in the tests above.')
    lines.push('')

    console.log(lines.join('\n'))
    expect(true).toBe(true)
  })
})
