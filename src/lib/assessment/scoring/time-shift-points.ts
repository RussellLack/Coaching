import type {
  Answers,
  Assessment,
  BaseScoringResult,
  PointAllocationAnswer,
  PointAllocationFactor,
  PointAllocationQuestion,
  ScoringContext,
} from '@/types/assessment'

/**
 * Time-shift-points scoring (Assessment 6).
 *
 * Reads three PointAllocation answers — one per time-point — and computes
 * the drift of each factor's weight across past / present / future. Used
 * to identify which factor is rising fastest, which is falling fastest,
 * which (if any) is an anchor (stable across all three rounds), and
 * whether the overall drift pattern is unusually small.
 *
 * Assumptions:
 *   - Exactly three PointAllocation questions, with roundIds "past",
 *     "present", and "future". The order on the page (and therefore
 *     in `assessment.questions`) doesn't matter — we look up by roundId.
 *   - All three rounds share the same set of factors, declared at the
 *     assessment level in `pointAllocationFactors`.
 *   - The answer is a `Record<factorId, number>`. Missing keys are
 *     treated as 0 (defensive — the renderer should always emit all
 *     keys, but the scoring strategy doesn't trust that).
 *
 * Algorithm:
 *   1. Validate: three rounds present, factors declared, sums valid.
 *   2. For each factor: capture past_score, present_score, future_score,
 *      and compute total_drift = future - past.
 *   3. Identify rising (max positive total_drift), falling (max negative
 *      total_drift), and anchor (a factor whose score is identical
 *      across all three rounds — null if none).
 *   4. Compute total_drift_magnitude = sum of |total_drift| across all
 *      factors.  Used to detect "stable shape" results.
 *
 * Variables exposed for tier conditions:
 *   - total_drift_magnitude         (number)
 *   - has_anchor                    (0 or 1)
 *   - rising_drift, falling_drift   (numbers; signed)
 *   - drift_{factorId} for each declared factor
 *
 * Note: `rising_factor` and `falling_factor` are string identifiers, not
 * numeric, so they DON'T go in the `variables` map (the condition
 * evaluator's comparison operators are numeric). They live on the `raw`
 * result instead, and tier copy / interpretation lookup uses them.
 *
 * Interpretation keys emitted:
 *   - `factor.rising.{rising_factor}` — always
 *   - `factor.falling.{falling_factor}` — always
 *   - `anchor.{anchor_factor}` — only when an anchor exists
 *   - `pattern.stable_shape` — only when total_drift_magnitude is low
 *
 * The stable_shape threshold (default: < 6) is a code constant. Like the
 * tally-by-tag praise threshold, it could move to per-assessment config
 * but for now lives here for simplicity. Documented in CHANGES.md.
 */

const STABLE_SHAPE_THRESHOLD = 6

export interface FactorScores {
  id: string
  label: string
  past: number
  present: number
  future: number
  drift: number // future - past
}

export interface TimeShiftPointsResult extends BaseScoringResult {
  variables: {
    total_drift_magnitude: number
    has_anchor: number
    rising_drift: number
    falling_drift: number
    [k: string]: number
  }
  raw: {
    factors: FactorScores[]
    rounds: {
      past: Record<string, number>
      present: Record<string, number>
      future: Record<string, number>
    }
    rising_factor: string // e.g. "craft"
    falling_factor: string // e.g. "money"
    anchor_factor: string | null
    total_drift_magnitude: number
    is_stable_shape: boolean
  }
}

export function scoreTimeShiftPoints(
  ctx: ScoringContext
): TimeShiftPointsResult {
  const { assessment, answers } = ctx
  validateAssessment(assessment)

  const factors = assessment.pointAllocationFactors ?? []
  const factorIds = factors.map((f) => f.id)
  const labelById = new Map<string, string>(
    factors.map((f) => [f.id, f.label])
  )

  // Find the three rounds, indexed by roundId.
  const rounds = pickRounds(assessment, answers)

  // Build per-factor scores. Missing factor keys in an answer default to 0.
  const factorScores: FactorScores[] = factors.map((f) => {
    const past = numberAt(rounds.past, f.id)
    const present = numberAt(rounds.present, f.id)
    const future = numberAt(rounds.future, f.id)
    return {
      id: f.id,
      label: f.label,
      past,
      present,
      future,
      drift: future - past,
    }
  })

  // Identify rising, falling, anchor.
  // Tie-break: declaration order in `pointAllocationFactors`. Stable.
  let risingFactor = factorScores[0]
  let fallingFactor = factorScores[0]
  for (const f of factorScores) {
    if (f.drift > risingFactor.drift) risingFactor = f
    if (f.drift < fallingFactor.drift) fallingFactor = f
  }

  // Anchor: a factor whose past == present == future. If multiple exist,
  // pick by declaration order. If none, null.
  const anchorFactor =
    factorScores.find(
      (f) => f.past === f.present && f.present === f.future
    ) ?? null

  // Total drift magnitude: sum of |drift| across all factors. A measure
  // of how much the user's success definition has actually moved.
  const totalDriftMagnitude = factorScores.reduce(
    (sum, f) => sum + Math.abs(f.drift),
    0
  )

  const isStableShape = totalDriftMagnitude < STABLE_SHAPE_THRESHOLD

  // Build interpretation keys, in display priority order.
  const interpretationKeys: string[] = []
  if (isStableShape) {
    interpretationKeys.push('pattern.stable_shape')
  }
  interpretationKeys.push(`factor.rising.${risingFactor.id}`)
  interpretationKeys.push(`factor.falling.${fallingFactor.id}`)
  if (anchorFactor) {
    interpretationKeys.push(`anchor.${anchorFactor.id}`)
  }

  // Variables for tier conditions.
  const variables: TimeShiftPointsResult['variables'] = {
    total_drift_magnitude: totalDriftMagnitude,
    has_anchor: anchorFactor ? 1 : 0,
    rising_drift: risingFactor.drift,
    falling_drift: fallingFactor.drift,
  }
  for (const f of factorScores) {
    variables[`drift_${f.id}`] = f.drift
  }

  return {
    variables,
    interpretationKeys,
    raw: {
      factors: factorScores,
      rounds,
      rising_factor: risingFactor.id,
      falling_factor: fallingFactor.id,
      anchor_factor: anchorFactor?.id ?? null,
      total_drift_magnitude: totalDriftMagnitude,
      is_stable_shape: isStableShape,
    },
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function numberAt(obj: Record<string, number>, key: string): number {
  const v = obj[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function pickRounds(
  assessment: Assessment,
  answers: Answers
): {
  past: Record<string, number>
  present: Record<string, number>
  future: Record<string, number>
} {
  const pointQuestions = assessment.questions.filter(
    (q): q is PointAllocationQuestion =>
      q._type === 'questionPointAllocation'
  )

  const byRound = new Map<string, Record<string, number>>()
  for (const q of pointQuestions) {
    const a = answers[q._key] as PointAllocationAnswer | undefined
    if (!a || typeof a !== 'object' || Array.isArray(a)) {
      throw new ScoringError(
        `Missing or malformed point allocation answer for round "${q.roundId}".`
      )
    }
    // Validate the answer sums to the question's totalPoints.
    const sum = Object.values(a).reduce(
      (s, n) => s + (typeof n === 'number' ? n : 0),
      0
    )
    if (sum !== q.totalPoints) {
      throw new ScoringError(
        `Round "${q.roundId}" sum is ${sum}, expected ${q.totalPoints}.`
      )
    }
    byRound.set(q.roundId, a as Record<string, number>)
  }

  const past = byRound.get('past')
  const present = byRound.get('present')
  const future = byRound.get('future')
  if (!past || !present || !future) {
    const missing = ['past', 'present', 'future'].filter(
      (id) => !byRound.has(id)
    )
    throw new ScoringError(
      `Time-shift-points scoring requires three rounds with roundIds "past", ` +
        `"present", "future". Missing: ${missing.join(', ')}.`
    )
  }
  return { past, present, future }
}

function validateAssessment(assessment: Assessment): void {
  if (assessment.scoringStrategy !== 'time-shift-points') {
    throw new ScoringError(
      `Wrong strategy: expected "time-shift-points", got "${assessment.scoringStrategy}"`
    )
  }
  if (
    !assessment.pointAllocationFactors ||
    assessment.pointAllocationFactors.length === 0
  ) {
    throw new ScoringError(
      'Time-shift-points scoring requires at least one declared pointAllocationFactor.'
    )
  }
  const pointQuestions = assessment.questions.filter(
    (q) => q._type === 'questionPointAllocation'
  )
  if (pointQuestions.length !== 3) {
    throw new ScoringError(
      `Time-shift-points scoring requires exactly 3 questionPointAllocation questions, found ${pointQuestions.length}.`
    )
  }
  // Confirm the three rounds have distinct roundIds.
  const roundIds = new Set(
    (pointQuestions as PointAllocationQuestion[]).map((q) => q.roundId)
  )
  if (roundIds.size !== 3) {
    throw new ScoringError(
      `Time-shift-points scoring requires three distinct roundIds. Got: ${[...roundIds].join(', ')}.`
    )
  }
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoringError'
  }
}
