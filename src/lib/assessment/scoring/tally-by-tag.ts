import type {
  Answers,
  Assessment,
  BaseScoringResult,
  CalibrationQuestion,
  RadioAnswer,
  ScenarioRadioQuestion,
  ScoringContext,
  TagCategory,
} from '@/types/assessment'

/**
 * Calibration questions are answered by storing the picked option's _key
 * under a namespaced key in the `answers` object. We use `cal:{id}` so the
 * key can't collide with any scenario _key. This is a convention enforced
 * by the orchestrator and the calibration renderer.
 */
export const CALIBRATION_ANSWER_PREFIX = 'cal:'

/**
 * Tally-by-tag scoring (Assessments 3 and 4).
 *
 * Each scenario question has 4 options; each option is tagged with a
 * `tagId` referring to a TagCategory declared on the assessment. The
 * user's pick contributes one tally to that tag.
 *
 * The "healthy" tag is conventional: an option tagged `healthy` is a
 * non-distortion response. It's counted (as `healthy_count`) but
 * excluded from "top distortion" selection.
 *
 * For Assessment 4 (Cognitive Distortions) the strategy additionally
 * tracks `ai_magnification` and `ai_minimisation` as separate variables
 * since they're sub-categories of the AI-relative family that matter
 * individually for the result copy.
 *
 * Algorithm:
 *   1. Build a tag-id index from `tagCategories`. Validate every option
 *      references a known tag.
 *   2. Walk each scenario, dereference the picked option's `_key` to its
 *      `tagId`, and increment that tag's count.
 *   3. Compute `healthy_count` = count of picks where tag == "healthy".
 *   4. Of non-healthy tags, pick top 2 by count. Ties broken by
 *      tagCategories declaration order (stable).
 *   5. Surface tier variables and interpretation keys.
 *
 * Interpretation key emission depends on healthy_count:
 *   - If healthy_count is high enough that the user is in the "clear
 *     thinking" band, emit a single `praise.clear_thinking` key.
 *   - Otherwise emit `distortion.{top_1}` and (when top_2 exists)
 *     `distortion.{top_2}`.
 *   - The threshold for "clear thinking" is determined by the tier
 *     condition author, not hard-coded here. We emit BOTH key sets and
 *     let the tier conditions + matched interpretations work it out.
 *     ... actually no, that produces both sets of copy on the same page.
 *     We need to commit. See the threshold logic below.
 *
 * Threshold for emitting praise vs distortion keys:
 *   `praiseThresholdRatio` defaulting to 0.75 — if >=75% of answered
 *   scenarios are healthy, emit praise; otherwise emit distortion keys.
 *   This is a code-level constant rather than a per-assessment config
 *   to keep the schema lean. If we ever need to vary, it can move to
 *   the assessment doc.
 */

const PRAISE_THRESHOLD_RATIO = 0.75

// AI-band thresholds (Assessment 3 specific, but lives in the strategy
// because the strategy is shared between Assessments 3 and 4).
// `ai_use_score = q9_score + q10_score` (range 0-6 with two 0-3 questions)
const AI_BAND_LIGHT_MAX = 1 // ai_use_score <= 1 → "light"
const AI_BAND_LEANING_MIN = 4 // ai_use_score >= 4 → "leaning"
// Anything between (2-3) is "balanced"
const AI_OVERRELIANCE_USE_MIN = 4 // (q9+q10) >= 4 AND
const AI_OVERRELIANCE_CONFIDENCE_MAX = 1 //   q11 <= 1
const AI_UNDERUSE_Q9_VALUE = 0 // q9 == 0 → never consults

export type AiBand = 'light' | 'balanced' | 'leaning' | 'unknown'

export interface CalibrationResult {
  scoresByQuestionId: Record<string, number>
  aiUseScore: number
  aiBand: AiBand
  aiOverrelianceFlag: boolean
  aiUnderuseFlag: boolean
}

export interface TallyByTagResult extends BaseScoringResult {
  variables: {
    healthy_count: number
    answered_count: number
    top_1: string
    top_2: string
    top_1_count: number
    top_2_count: number
    // Calibration variables — present only when calibrationQuestions
    // are declared. Always emitted as numbers so tier conditions can
    // reference them safely; if no calibration is declared, these are 0.
    ai_use_score: number
    ai_overreliance: number // 0 or 1
    ai_underuse: number // 0 or 1
    [k: string]: number | string
  }
  raw: {
    counts: Record<string, number> // tagId → count
    healthy_count: number
    answered_count: number
    rankedTags: { id: string; label: string; count: number }[] // non-healthy, descending
    topTags: string[] // ids of top 2 non-healthy tags
    calibration: CalibrationResult | null
  }
}

export function scoreTallyByTag(ctx: ScoringContext): TallyByTagResult {
  const { assessment, answers } = ctx
  validateAssessment(assessment)

  const tagCategories = assessment.tagCategories ?? []
  const tagOrder = tagCategories.map((t) => t.id)
  const tagLabels = new Map<string, string>(
    tagCategories.map((t) => [t.id, t.label])
  )
  const knownTags = new Set(tagOrder)

  // Initialise counts to 0 for every declared tag so the result shape
  // is predictable even when a tag wasn't picked once.
  const counts: Record<string, number> = {}
  for (const tagId of tagOrder) counts[tagId] = 0

  const scenarioQuestions = assessment.questions.filter(
    (q): q is ScenarioRadioQuestion => q._type === 'questionScenarioRadio'
  )

  let answeredCount = 0

  for (const q of scenarioQuestions) {
    const pickedKey = answers[q._key] as RadioAnswer | undefined
    if (pickedKey === undefined || pickedKey === null) continue

    // Find the picked option to learn its tagId.
    const picked = q.options.find((opt) => opt._key === pickedKey)
    if (!picked) {
      throw new ScoringError(
        `Scenario "${q._key}": picked option _key "${pickedKey}" not found in options.`
      )
    }
    if (!knownTags.has(picked.tagId)) {
      throw new ScoringError(
        `Scenario "${q._key}" option references unknown tagId "${picked.tagId}". ` +
          `Declared tags: ${tagOrder.join(', ') || '(none)'}.`
      )
    }
    counts[picked.tagId]++
    answeredCount++
  }

  const healthyCount = counts['healthy'] ?? 0

  // Rank non-healthy tags by count, tie-break by declaration order.
  const rankedTags = tagOrder
    .filter((id) => id !== 'healthy')
    .map((id, declarationIdx) => ({
      id,
      label: tagLabels.get(id) ?? id,
      count: counts[id] ?? 0,
      declarationIdx,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.declarationIdx - b.declarationIdx
    })
    .map(({ id, label, count }) => ({ id, label, count }))

  // Top 2 non-healthy tags. Only include if they were actually picked
  // (count > 0). Otherwise top_2 may be undefined.
  const topTags = rankedTags
    .filter((t) => t.count > 0)
    .slice(0, 2)
    .map((t) => t.id)

  const top1 = topTags[0] ?? ''
  const top2 = topTags[1] ?? ''
  const top1Count = top1 ? counts[top1] : 0
  const top2Count = top2 ? counts[top2] : 0

  // Decide which interpretation keys to emit.
  const inPraiseBand =
    answeredCount > 0 &&
    healthyCount / answeredCount >= PRAISE_THRESHOLD_RATIO

  let interpretationKeys = inPraiseBand
    ? ['praise.clear_thinking']
    : topTags.map((id) => `distortion.${id}`)

  // Calibration: read calibrationQuestions if declared. Emit AI overlay
  // and override keys when applicable. The conventions used here are
  // Assessment 3 specific but lean on the generic CalibrationQuestion
  // schema, so other assessments can reuse the mechanism with different
  // interpretation key prefixes if they want.
  //
  // Convention: question IDs `q_ai_use`, `q_ai_defer`, `q_ai_confidence`
  // (mapping to spec questions Q9, Q10, Q11). If those exact IDs aren't
  // present, we fall through gracefully — calibration is optional, and
  // the strategy must still work for Assessment 4.
  const calibration = readCalibration(assessment, answers)

  if (calibration) {
    // Replace the distortion-style keys with style-based ones when
    // calibration is in use. Convention: Assessment 3 uses `style.{tag}`
    // and `overlay.{tag}.{ai_band}` rather than `distortion.{tag}`.
    // We detect this by the presence of calibration data — Assessment 4
    // has no calibration data and keeps its `distortion.*` keys.
    if (!inPraiseBand) {
      interpretationKeys = []
      if (top1) {
        interpretationKeys.push(`style.${top1}`)
        if (calibration.aiBand !== 'unknown') {
          interpretationKeys.push(`overlay.${top1}.${calibration.aiBand}`)
        }
      }
    }
    if (calibration.aiOverrelianceFlag) {
      interpretationKeys.push('override.ai_overreliance')
    }
    if (calibration.aiUnderuseFlag) {
      interpretationKeys.push('override.ai_underuse')
    }
  }

  // Build variables. Expose per-tag counts as `count_*` so tier conditions
  // can reference them directly (e.g. `count_catastrophising >= 3`).
  const variables: TallyByTagResult['variables'] = {
    healthy_count: healthyCount,
    answered_count: answeredCount,
    top_1: top1,
    top_2: top2,
    top_1_count: top1Count,
    top_2_count: top2Count,
    ai_use_score: calibration?.aiUseScore ?? 0,
    ai_overreliance: calibration?.aiOverrelianceFlag ? 1 : 0,
    ai_underuse: calibration?.aiUnderuseFlag ? 1 : 0,
  }
  for (const tagId of tagOrder) {
    variables[`count_${tagId}`] = counts[tagId]
  }
  // Expose individual calibration question scores as `cal_{questionId}`
  // so per-question tier conditions are possible if needed.
  if (calibration) {
    for (const [qid, score] of Object.entries(calibration.scoresByQuestionId)) {
      variables[`cal_${qid}`] = score
    }
  }

  return {
    variables,
    interpretationKeys,
    raw: {
      counts,
      healthy_count: healthyCount,
      answered_count: answeredCount,
      rankedTags,
      topTags,
      calibration,
    },
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

/**
 * Read calibration question answers if calibrationQuestions are declared.
 *
 * Convention: the strategy expects three specific question IDs for AI
 * calibration (Assessment 3): "q_ai_use", "q_ai_defer", "q_ai_confidence".
 * If those aren't present, calibration is treated as absent — the strategy
 * still returns a useful result for assessments like #4 that don't use
 * calibration.
 *
 * Each answer is the `_key` of the picked CalibrationOption. The strategy
 * dereferences that key back to the option's numeric `score`.
 *
 * Returns null if no calibration questions are declared OR if any required
 * question is unanswered (so partial calibration produces null rather than
 * misleading numbers).
 */
function readCalibration(
  assessment: Assessment,
  answers: Answers
): CalibrationResult | null {
  const calibrationQuestions = assessment.calibrationQuestions ?? []
  if (calibrationQuestions.length === 0) return null

  const scoresByQuestionId: Record<string, number> = {}
  for (const cq of calibrationQuestions) {
    const pickedKey = answers[cq.id] as string | undefined
    if (typeof pickedKey !== 'string' || pickedKey.length === 0) {
      // Calibration started but not complete — treat as absent so we don't
      // emit misleading partial AI variables.
      return null
    }
    const picked = cq.options.find((opt) => opt._key === pickedKey)
    if (!picked) {
      throw new ScoringError(
        `Calibration question "${cq.id}": picked option _key "${pickedKey}" not found.`
      )
    }
    scoresByQuestionId[cq.id] = picked.score
  }

  // Compute AI-band metrics. The strategy uses convention-based IDs
  // (q_ai_use, q_ai_defer, q_ai_confidence) — if the assessment uses
  // different IDs, the metrics fall through as zeros (which is the right
  // default — no calibration signal = nothing to act on).
  const q9 = scoresByQuestionId['q_ai_use'] ?? 0
  const q10 = scoresByQuestionId['q_ai_defer'] ?? 0
  const q11 = scoresByQuestionId['q_ai_confidence'] ?? 0
  const aiUseScore = q9 + q10

  let aiBand: AiBand
  if (!('q_ai_use' in scoresByQuestionId)) {
    // No AI-use question at all → unknown
    aiBand = 'unknown'
  } else if (aiUseScore <= AI_BAND_LIGHT_MAX) {
    aiBand = 'light'
  } else if (aiUseScore >= AI_BAND_LEANING_MIN) {
    aiBand = 'leaning'
  } else {
    aiBand = 'balanced'
  }

  const aiOverrelianceFlag =
    aiUseScore >= AI_OVERRELIANCE_USE_MIN &&
    q11 <= AI_OVERRELIANCE_CONFIDENCE_MAX &&
    'q_ai_confidence' in scoresByQuestionId

  const aiUnderuseFlag =
    'q_ai_use' in scoresByQuestionId && q9 === AI_UNDERUSE_Q9_VALUE

  return {
    scoresByQuestionId,
    aiUseScore,
    aiBand,
    aiOverrelianceFlag,
    aiUnderuseFlag,
  }
}

function validateAssessment(assessment: Assessment): void {
  if (assessment.scoringStrategy !== 'tally-by-tag') {
    throw new ScoringError(
      `Wrong strategy: expected "tally-by-tag", got "${assessment.scoringStrategy}"`
    )
  }
  if (!assessment.tagCategories || assessment.tagCategories.length === 0) {
    throw new ScoringError(
      'Tally-by-tag scoring requires at least one declared tagCategory.'
    )
  }
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoringError'
  }
}
