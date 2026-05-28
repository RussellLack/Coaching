import type {
  Assessment,
  Answers,
  BaseScoringResult,
  ScoringContext,
  Slider010Question,
  SliderAnswer,
} from '@/types/assessment'

/**
 * Dimensional Slider scoring (Assessment 2: Resilience Wheel).
 *
 * Differences from dimensional-likert:
 *   - Inputs are 0–10 sliders, not 1–5 Likert.
 *   - No reverse scoring concept (sliders are explicitly anchored).
 *   - Overall is expressed as a percentage of max-possible (n × 10),
 *     not as a 1–5 mean. So condition expressions look like
 *     `overall >= 75` rather than `overall >= 4.2`.
 *   - Emits TWO gap interpretation keys (the two lowest dimensions),
 *     not one. The Resilience Wheel result surfaces two weakest domains.
 *
 * Algorithm:
 *   1. Group sliders by dimensionId.
 *   2. For each dimension, average the 0–10 slider values.
 *   3. Overall = (sum of dimension averages) / (number of dimensions × 10) × 100.
 *      i.e. percentage of theoretical max.
 *   4. Identify the two lowest and two highest dimensions.
 *
 * Edge cases:
 *   - Missing answer: contributes nothing; dimension averages over what's there.
 *   - Dimension with zero answered questions: scored as 0 but excluded
 *     from lowest/highest selection (matches dimensional-likert behaviour).
 *   - Question references unknown dimensionId: thrown as an authoring error.
 */

export interface DimensionalSliderResult extends BaseScoringResult {
  variables: {
    overall: number // 0–100 (percentage)
    [dimensionId: string]: number | string
  }
  raw: {
    dimensions: Record<string, number> // 0–10 per dimension
    overall: number // 0–100
    lowestDimensions: string[] // two lowest, lowest first
    highestDimensions: string[] // two highest, highest first
  }
}

export function scoreDimensionalSlider(
  ctx: ScoringContext
): DimensionalSliderResult {
  const { assessment, answers } = ctx

  validateAssessment(assessment)

  const declaredDimensionIds = new Set(
    (assessment.dimensions ?? []).map((d) => d.id)
  )

  const byDimension: Record<string, number[]> = {}
  for (const id of declaredDimensionIds) {
    byDimension[id] = []
  }

  const sliderQuestions = assessment.questions.filter(
    (q): q is Slider010Question => q._type === 'questionSlider010'
  )

  for (const q of sliderQuestions) {
    if (!declaredDimensionIds.has(q.dimensionId)) {
      throw new ScoringError(
        `Question references unknown dimensionId "${q.dimensionId}". ` +
          `Declared dimensions: ${[...declaredDimensionIds].join(', ') || '(none)'}.`
      )
    }
    const raw = answers[q._key] as SliderAnswer | undefined
    if (raw === undefined || raw === null) continue
    if (typeof raw !== 'number' || raw < 0 || raw > 10) {
      throw new ScoringError(
        `Slider010 answer for question "${q._key}" must be 0–10, got ${raw}`
      )
    }
    byDimension[q.dimensionId].push(raw)
  }

  // Per-dimension averages (0–10)
  const dimensionScores: Record<string, number> = {}
  for (const id of declaredDimensionIds) {
    const scores = byDimension[id]
    dimensionScores[id] = scores.length > 0 ? mean(scores) : 0
  }

  // Overall as percentage of max
  const scoredDimensions = [...declaredDimensionIds].filter(
    (id) => byDimension[id].length > 0
  )
  const overall =
    scoredDimensions.length > 0
      ? roundTo2(
          (scoredDimensions.reduce((s, id) => s + dimensionScores[id], 0) /
            (scoredDimensions.length * 10)) *
            100
        )
      : 0

  // Lowest / highest — top 2 each, only among scored dimensions
  const sortedAsc = [...scoredDimensions].sort(
    (a, b) => dimensionScores[a] - dimensionScores[b]
  )
  const lowestDimensions = sortedAsc.slice(0, 2)
  const highestDimensions = [...sortedAsc].reverse().slice(0, 2)

  // Variables for the condition evaluator
  const variables: DimensionalSliderResult['variables'] = {
    overall,
    lowest: lowestDimensions[0] ?? '',
    second_lowest: lowestDimensions[1] ?? '',
    highest: highestDimensions[0] ?? '',
    second_highest: highestDimensions[1] ?? '',
  }
  for (const id of declaredDimensionIds) {
    variables[id] = dimensionScores[id]
  }

  // Interpretation keys — one per dimension in the bottom two
  const interpretationKeys = lowestDimensions
    .filter((id) => id !== '')
    .map((id) => `gap.${id}`)

  return {
    variables,
    interpretationKeys,
    raw: {
      dimensions: dimensionScores,
      overall,
      lowestDimensions,
      highestDimensions,
    },
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return roundTo2(sum / values.length)
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100
}

function validateAssessment(assessment: Assessment): void {
  if (assessment.scoringStrategy !== 'dimensional-slider') {
    throw new ScoringError(
      `Wrong strategy: expected "dimensional-slider", got "${assessment.scoringStrategy}"`
    )
  }
  if (!assessment.dimensions || assessment.dimensions.length === 0) {
    throw new ScoringError(
      'Dimensional Slider scoring requires at least one declared dimension.'
    )
  }
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoringError'
  }
}
