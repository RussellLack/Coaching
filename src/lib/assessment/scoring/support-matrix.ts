import type {
  Assessment,
  BaseScoringResult,
  PersonRow,
  PersonRowEntryAnswer,
  PersonRowEntryQuestion,
  ScoringContext,
} from '@/types/assessment'

/**
 * Support Matrix scoring (Assessment 5).
 *
 * Unlike the dimensional strategies, this doesn't produce a single numeric
 * score. It walks structural rules over the entered rows and emits a set
 * of diagnostic *flags*. The tier system picks the highest-priority flag
 * as the headline; the result renderer surfaces all applicable flags as
 * gap interpretations.
 *
 * Quadrants (with influence/support both 0–10):
 *   - champions   : influence >= 6 AND support >= 6   (top-right)
 *   - allies      : influence <  6 AND support >= 6   (top-left)
 *   - background  : influence <  6 AND support <  6   (bottom-left)
 *   - resistance  : influence >= 6 AND support <  6   (bottom-right; False Friends hide here)
 *
 * Diagnostic rules (evaluated in declaration order; all that fire are
 * surfaced as interpretations):
 *
 *   1. champion_gap            : champions == 0
 *   2. outweighed              : resistance > champions
 *   3. stuck_at_glass          : allies >= 3 AND champions <= 1
 *   4. visibility_gap          : avg_influence < 5
 *   5. cold_room               : avg_support < 5
 *   6. stance_visibility       : unknown_count >= 3
 *   7. ai_alignment            : ai_alignment_score < 50
 *   8. champion_ai_misalign    : any champion has stance == "sceptical"
 *   9. healthy_map             : none of the above
 *
 * Variables exposed for condition expressions (so result tiers can be
 * authored declaratively in Sanity):
 *
 *   total                      : number of rows
 *   champions, allies, resistance, background : quadrant counts
 *   avg_influence, avg_support : averages across all rows
 *   unknown_count              : rows with stance == "unknown" or no stance
 *   ai_alignment_score         : 0–100, % of high-influence rows whose
 *                                stance is "engaged" or "cautious"
 *   has_sceptical_champion     : 1 if any champion has sceptical stance, 0 otherwise
 *   gap_count                  : total flags fired (excluding healthy_map)
 */

export interface SupportMatrixResult extends BaseScoringResult {
  variables: {
    total: number
    champions: number
    allies: number
    resistance: number
    background: number
    avg_influence: number
    avg_support: number
    unknown_count: number
    ai_alignment_score: number
    has_sceptical_champion: number
    gap_count: number
    [k: string]: number
  }
  raw: {
    rows: PersonRow[]
    changeDescription: string
    quadrants: {
      champions: PersonRow[]
      allies: PersonRow[]
      resistance: PersonRow[]
      background: PersonRow[]
    }
    counts: {
      total: number
      champions: number
      allies: number
      resistance: number
      background: number
      unknown_count: number
    }
    averages: {
      influence: number
      support: number
    }
    aiAlignmentScore: number
    flagsFired: string[] // ordered by declaration
  }
}

// Threshold for "high influence" — both for quadrant assignment and for
// the AI alignment computation. Kept symmetric for clarity.
const HIGH_INFLUENCE = 6
const HIGH_SUPPORT = 6

export function scoreSupportMatrix(ctx: ScoringContext): SupportMatrixResult {
  const { assessment, answers } = ctx
  validateAssessment(assessment)

  const personRowQuestion = assessment.questions.find(
    (q): q is PersonRowEntryQuestion => q._type === 'questionPersonRowEntry'
  )
  if (!personRowQuestion) {
    throw new ScoringError(
      'Support Matrix scoring requires exactly one questionPersonRowEntry; none found.'
    )
  }

  const raw = answers[personRowQuestion._key] as
    | PersonRowEntryAnswer
    | undefined
  if (!raw || !Array.isArray(raw.rows)) {
    throw new ScoringError(
      'Missing or malformed person-row answer for the Support Matrix.'
    )
  }
  const rows = raw.rows

  // Validate each row.
  for (const r of rows) {
    if (typeof r.influence !== 'number' || r.influence < 0 || r.influence > 10) {
      throw new ScoringError(
        `Row "${r.initials || r._key}" has invalid influence: ${r.influence}`
      )
    }
    if (typeof r.support !== 'number' || r.support < 0 || r.support > 10) {
      throw new ScoringError(
        `Row "${r.initials || r._key}" has invalid support: ${r.support}`
      )
    }
  }

  // Partition into quadrants.
  const quadrants = {
    champions: [] as PersonRow[],
    allies: [] as PersonRow[],
    resistance: [] as PersonRow[],
    background: [] as PersonRow[],
  }
  for (const r of rows) {
    const highInf = r.influence >= HIGH_INFLUENCE
    const highSup = r.support >= HIGH_SUPPORT
    if (highInf && highSup) quadrants.champions.push(r)
    else if (!highInf && highSup) quadrants.allies.push(r)
    else if (highInf && !highSup) quadrants.resistance.push(r)
    else quadrants.background.push(r)
  }

  // Counts and averages.
  const total = rows.length
  const counts = {
    total,
    champions: quadrants.champions.length,
    allies: quadrants.allies.length,
    resistance: quadrants.resistance.length,
    background: quadrants.background.length,
    unknown_count: rows.filter(
      (r) => !r.stanceId || r.stanceId === 'unknown'
    ).length,
  }

  const averages =
    total > 0
      ? {
          influence: roundTo2(
            rows.reduce((s, r) => s + r.influence, 0) / total
          ),
          support: roundTo2(rows.reduce((s, r) => s + r.support, 0) / total),
        }
      : { influence: 0, support: 0 }

  // AI alignment score: % of high-influence rows whose stance is engaged or cautious.
  const highInfluenceRows = rows.filter((r) => r.influence >= HIGH_INFLUENCE)
  const alignedHighInfluence = highInfluenceRows.filter(
    (r) => r.stanceId === 'engaged' || r.stanceId === 'cautious'
  )
  const aiAlignmentScore =
    highInfluenceRows.length > 0
      ? roundTo2((alignedHighInfluence.length / highInfluenceRows.length) * 100)
      : 0

  const hasScepticalChampion = quadrants.champions.some(
    (r) => r.stanceId === 'sceptical'
  )

  // Evaluate diagnostic rules in declaration order.
  const flagsFired: string[] = []
  if (counts.champions === 0) flagsFired.push('champion_gap')
  if (counts.resistance > counts.champions) flagsFired.push('outweighed')
  if (counts.allies >= 3 && counts.champions <= 1)
    flagsFired.push('stuck_at_glass')
  if (averages.influence < 5) flagsFired.push('visibility_gap')
  if (averages.support < 5) flagsFired.push('cold_room')
  if (counts.unknown_count >= 3) flagsFired.push('stance_visibility')
  if (highInfluenceRows.length > 0 && aiAlignmentScore < 50)
    flagsFired.push('ai_alignment')
  if (hasScepticalChampion) flagsFired.push('champion_ai_misalign')
  if (flagsFired.length === 0) flagsFired.push('healthy_map')

  // Interpretation keys map 1:1 to fired flags.
  const interpretationKeys = flagsFired.map((flag) => `gap.${flag}`)

  const variables: SupportMatrixResult['variables'] = {
    total,
    champions: counts.champions,
    allies: counts.allies,
    resistance: counts.resistance,
    background: counts.background,
    avg_influence: averages.influence,
    avg_support: averages.support,
    unknown_count: counts.unknown_count,
    ai_alignment_score: aiAlignmentScore,
    has_sceptical_champion: hasScepticalChampion ? 1 : 0,
    gap_count: flagsFired.filter((f) => f !== 'healthy_map').length,
  }

  return {
    variables,
    interpretationKeys,
    raw: {
      rows,
      changeDescription: raw.changeDescription ?? '',
      quadrants,
      counts,
      averages,
      aiAlignmentScore,
      flagsFired,
    },
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100
}

function validateAssessment(assessment: Assessment): void {
  if (assessment.scoringStrategy !== 'support-matrix') {
    throw new ScoringError(
      `Wrong strategy: expected "support-matrix", got "${assessment.scoringStrategy}"`
    )
  }
  const personRowQs = assessment.questions.filter(
    (q) => q._type === 'questionPersonRowEntry'
  )
  if (personRowQs.length !== 1) {
    throw new ScoringError(
      `Support Matrix scoring requires exactly one questionPersonRowEntry, found ${personRowQs.length}.`
    )
  }
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoringError'
  }
}
