import type {
  Agreement5Question,
  AgreementAnswer,
  Assessment,
  Answers,
  DimensionalLikertResult,
  ScoringContext,
} from '@/types/assessment'

/**
 * Dimensional Likert scoring (Assessment 1: Coaching Readiness).
 *
 * Algorithm:
 *   1. Group questions by their dimensionId.
 *   2. For each question, normalise the 1–5 answer (reverse if flagged).
 *   3. Average the answers within each dimension.
 *   4. Overall = average of dimension scores (equal weighting).
 *   5. Identify lowest and highest dimensions.
 *
 * Edge cases handled:
 *   - Missing answer for a question: contributes nothing; dimension average
 *     uses only questions that were answered. If a dimension has zero
 *     answered questions, its score is null (treated as 0 for overall;
 *     omitted from lowest/highest selection).
 *   - Unknown dimensionId on a question (not declared in assessment.dimensions):
 *     thrown as an error — this is an authoring bug, not a runtime condition.
 *   - reverseScored: a "Strongly agree" (5) becomes 1; 4 becomes 2; etc.
 *
 * Returns a result whose `variables` are: overall, plus one variable per
 * dimension (using the dimension.id as the key). These feed the condition
 * evaluator for result tier matching.
 */
export function scoreDimensionalLikert(ctx: ScoringContext): DimensionalLikertResult {
  const { assessment, answers } = ctx

  validateAssessment(assessment)

  // Group answers by dimension
  const byDimension: Record<string, number[]> = {}
  const declaredDimensionIds = new Set(
    (assessment.dimensions ?? []).map((d) => d.id)
  )

  // Initialise every declared dimension to an empty array so they all appear
  // in the output even if no questions reference them.
  for (const id of declaredDimensionIds) {
    byDimension[id] = []
  }

  const agreementQuestions = assessment.questions.filter(
    (q): q is Agreement5Question => q._type === 'questionAgreement5'
  )

  for (const q of agreementQuestions) {
    if (!declaredDimensionIds.has(q.dimensionId)) {
      throw new ScoringError(
        `Question references unknown dimensionId "${q.dimensionId}". ` +
          `Declared dimensions: ${[...declaredDimensionIds].join(', ') || '(none)'}.`
      )
    }
    const raw = answers[q._key] as AgreementAnswer | undefined
    if (raw === undefined || raw === null) continue
    if (typeof raw !== 'number' || raw < 1 || raw > 5) {
      throw new ScoringError(
        `Agreement5 answer for question "${q._key}" must be 1–5, got ${raw}`
      )
    }
    const normalised = q.reverseScored ? 6 - raw : raw
    byDimension[q.dimensionId].push(normalised)
  }

  // Compute averages
  const dimensionScores: Record<string, number> = {}
  for (const id of declaredDimensionIds) {
    const scores = byDimension[id]
    dimensionScores[id] = scores.length > 0 ? mean(scores) : 0
  }

  // Overall = mean of dimension scores, excluding dimensions with no data
  const scoredDimensions = [...declaredDimensionIds].filter(
    (id) => byDimension[id].length > 0
  )
  const overall =
    scoredDimensions.length > 0
      ? mean(scoredDimensions.map((id) => dimensionScores[id]))
      : 0

  // Lowest / highest (only among scored dimensions)
  let lowestDimension = ''
  let highestDimension = ''
  if (scoredDimensions.length > 0) {
    const sorted = [...scoredDimensions].sort(
      (a, b) => dimensionScores[a] - dimensionScores[b]
    )
    lowestDimension = sorted[0]
    highestDimension = sorted[sorted.length - 1]
  }

  // Build the variables map for condition evaluation
  const variables: Record<string, number | string> = {
    overall,
    lowest: lowestDimension,
    highest: highestDimension,
  }
  for (const id of declaredDimensionIds) {
    variables[id] = dimensionScores[id]
  }

  // Interpretation keys — for Assessment 1, the "gap" read is keyed by lowest dimension
  const interpretationKeys: string[] = []
  if (lowestDimension) {
    interpretationKeys.push(`gap.${lowestDimension}`)
  }

  return {
    variables: variables as DimensionalLikertResult['variables'],
    interpretationKeys,
    raw: {
      dimensions: dimensionScores,
      overall,
      lowestDimension,
      highestDimension,
    },
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  // Round to 2dp to avoid floating-point noise in conditions and display
  return Math.round((sum / values.length) * 100) / 100
}

function validateAssessment(assessment: Assessment): void {
  if (assessment.scoringStrategy !== 'dimensional-likert') {
    throw new ScoringError(
      `Wrong strategy: expected "dimensional-likert", got "${assessment.scoringStrategy}"`
    )
  }
  if (!assessment.dimensions || assessment.dimensions.length === 0) {
    throw new ScoringError(
      'Dimensional Likert scoring requires at least one declared dimension.'
    )
  }
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoringError'
  }
}
