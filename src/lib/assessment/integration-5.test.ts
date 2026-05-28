/**
 * End-to-end integration test for Assessment 5 (Support Matrix Audit).
 *
 * Loads the actual seed NDJSON and runs realistic answer scenarios through
 * the full pipeline. The Support Matrix has the most complex scoring logic
 * of any assessment so far — eight diagnostic rules that combine in
 * surprising ways — and the highest payoff from end-to-end coverage.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Answers,
  Assessment,
  PersonRow,
  PersonRowEntryAnswer,
} from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON ─────────────────────────────────────────────────────

const ndjsonPath = join(
  __dirname,
  '../../../seed/assessment-5.ndjson'
)
const lines = readFileSync(ndjsonPath, 'utf-8').trim().split('\n')
const docs = lines.map((line) => JSON.parse(line))
const doc = docs.find((d) => d._type === 'assessment') as Record<
  string,
  unknown
>

// Reshape into the runtime Assessment type
const assessment: Assessment = {
  _id: doc._id as string,
  slug: (doc.slug as { current: string }).current,
  displayTitle: doc.displayTitle as string,
  tagline: doc.tagline as string | undefined,
  estimatedMinutes: doc.estimatedMinutes as number,
  introCopy: doc.introCopy as Assessment['introCopy'],
  questions: doc.questions as Assessment['questions'],
  scoringStrategy: doc.scoringStrategy as Assessment['scoringStrategy'],
  dimensions: doc.dimensions as Assessment['dimensions'],
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

const PERSON_ROW_KEY = assessment.questions[0]._key

// ── HELPERS ─────────────────────────────────────────────────────────────

function row(
  initials: string,
  influence: number,
  support: number,
  stanceId: string = 'engaged'
): PersonRow {
  return { _key: `r-${initials}`, initials, influence, support, stanceId }
}

function answersFor(rows: PersonRow[], change = 'Test change'): Answers {
  const a: PersonRowEntryAnswer = { changeDescription: change, rows }
  return { [PERSON_ROW_KEY]: a }
}

// ── STRUCTURAL TESTS ────────────────────────────────────────────────────

describe('Assessment 5 (end-to-end) — structure', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toBe('Map Your Real Support Network')
    expect(assessment.scoringStrategy).toBe('support-matrix')
    expect(assessment.visualisation).toBe('stakeholderMatrix')
    expect(assessment.questions).toHaveLength(1)
    expect(assessment.questions[0]._type).toBe('questionPersonRowEntry')
    expect(assessment.resultTiers).toHaveLength(9)
  })

  it('every diagnostic flag has a matching gap.* interpretation', () => {
    const expectedFlags = [
      'champion_gap',
      'outweighed',
      'stuck_at_glass',
      'visibility_gap',
      'cold_room',
      'stance_visibility',
      'ai_alignment',
      'champion_ai_misalign',
      'healthy_map',
    ]
    const interpretationKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    for (const flag of expectedFlags) {
      expect(interpretationKeys.has(`gap.${flag}`)).toBe(true)
    }
  })

  it('tier priority order matches design intent', () => {
    const tierIds = assessment.resultTiers.map((t) => t.id)
    // Editorial intent for the tier ordering:
    //
    //   - champion_gap comes first: "no champion at all" is the most
    //     foundational gap and the most catastrophic finding. If true,
    //     it's the only thing that matters in the headline.
    //   - champion_ai_misalign comes second: when you DO have a champion
    //     but they're sceptical on AI, that's the most specific
    //     high-stakes read in the assessment.
    //   - stuck_at_glass comes third: the most actionable mid-state
    //     ("convert one ally upward"). Sits ahead of the broader
    //     structural finds (outweighed, ai_alignment) because the move
    //     it suggests is more concrete.
    //   - outweighed, ai_alignment then describe structural patterns.
    //   - stance_visibility, visibility_gap, cold_room come after
    //     because they're orthogonal structural finds — they fire only
    //     when none of the more important patterns is present.
    //   - healthy_map is the fallback.
    expect(tierIds.indexOf('champion_gap')).toBeLessThan(
      tierIds.indexOf('champion_ai_misalign')
    )
    expect(tierIds.indexOf('champion_ai_misalign')).toBeLessThan(
      tierIds.indexOf('stuck_at_glass')
    )
    expect(tierIds.indexOf('stuck_at_glass')).toBeLessThan(
      tierIds.indexOf('outweighed')
    )
    expect(tierIds.indexOf('outweighed')).toBeLessThan(
      tierIds.indexOf('ai_alignment')
    )
    expect(tierIds.indexOf('healthy_map')).toBe(tierIds.length - 1)
  })
})

// ── HEALTHY MAP SCENARIO ────────────────────────────────────────────────

describe('Assessment 5 — healthy map', () => {
  const rows: PersonRow[] = [
    row('Mike', 9, 9, 'engaged'),
    row('Anna', 8, 8, 'engaged'),
    row('Tom', 4, 8, 'engaged'),
    row('Liv', 3, 7, 'cautious'),
    row('Per', 4, 4, 'engaged'),
    row('Jens', 5, 4, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })
  const matched = matchTier(assessment, result)

  it('fires only the healthy_map flag', () => {
    expect(result.raw.flagsFired).toEqual(['healthy_map'])
  })

  it('matches the Healthy Map tier', () => {
    expect(matched!.tier.id).toBe('healthy_map')
  })

  it('surfaces a single, gentle interpretation', () => {
    expect(matched!.interpretations).toHaveLength(1)
    expect(matched!.interpretations[0].key).toBe('gap.healthy_map')
  })
})

// ── CHAMPION-AI MISALIGNMENT (highest priority) ─────────────────────────

describe('Assessment 5 — champion-AI misalignment', () => {
  // Two champions, one of whom is sceptical. Map otherwise healthy.
  const rows: PersonRow[] = [
    row('Engaged Champion', 9, 9, 'engaged'),
    row('Sceptical Champion', 8, 8, 'sceptical'), // the flag
    row('Ally One', 4, 8, 'engaged'),
    row('Ally Two', 3, 7, 'cautious'),
    row('Background A', 4, 5, 'engaged'),
    row('Background B', 5, 4, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })
  const matched = matchTier(assessment, result)

  it('fires the champion_ai_misalign flag', () => {
    expect(result.raw.flagsFired).toContain('champion_ai_misalign')
  })

  it('matches the champion_ai_misalign tier (highest priority)', () => {
    expect(matched!.tier.id).toBe('champion_ai_misalign')
  })

  it('surfaces the champion_ai_misalign interpretation', () => {
    const keys = matched!.interpretations.map((i) => i.key)
    expect(keys).toContain('gap.champion_ai_misalign')
  })
})

// ── CHAMPION GAP (no champion at all) ───────────────────────────────────

describe('Assessment 5 — champion gap', () => {
  const rows: PersonRow[] = [
    row('A', 3, 8, 'engaged'),
    row('B', 4, 7, 'engaged'),
    row('C', 2, 8, 'engaged'),
    row('D', 4, 6, 'cautious'),
    row('E', 3, 7, 'engaged'),
    row('F', 5, 6, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })
  const matched = matchTier(assessment, result)

  it('fires champion_gap', () => {
    expect(result.raw.flagsFired).toContain('champion_gap')
  })

  it('matches the champion_gap tier when no champion_ai_misalign present', () => {
    expect(matched!.tier.id).toBe('champion_gap')
  })
})

// ── OUTWEIGHED (resistance > champions) ─────────────────────────────────

describe('Assessment 5 — outweighed', () => {
  const rows: PersonRow[] = [
    row('CH', 9, 9, 'engaged'),
    row('R1', 8, 2, 'engaged'),
    row('R2', 7, 3, 'engaged'),
    row('R3', 9, 1, 'engaged'),
    row('BG', 4, 4, 'engaged'),
    row('BG2', 5, 5, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })
  const matched = matchTier(assessment, result)

  it('fires outweighed', () => {
    expect(result.raw.flagsFired).toContain('outweighed')
  })

  it('matches the outweighed tier', () => {
    expect(matched!.tier.id).toBe('outweighed')
  })
})

// ── AI ALIGNMENT GAP ────────────────────────────────────────────────────

describe('Assessment 5 — AI alignment gap', () => {
  // Champion is engaged (so champion_ai_misalign doesn't fire),
  // but most high-influence stakeholders are sceptical
  const rows: PersonRow[] = [
    row('CH', 9, 9, 'engaged'),
    row('H1', 8, 7, 'sceptical'), // also a champion (8/7), sceptical
    row('H2', 7, 4, 'sceptical'), // resistance, sceptical
    row('H3', 9, 3, 'sceptical'), // resistance, sceptical
    row('L1', 3, 8, 'engaged'),
    row('L2', 4, 7, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })

  it('flags both champion_ai_misalign AND ai_alignment', () => {
    // H1 is a sceptical champion (influence 8, support 7) → champion_ai_misalign
    // 4 high-influence rows; 1 engaged → 25% → ai_alignment
    expect(result.raw.flagsFired).toContain('champion_ai_misalign')
    expect(result.raw.flagsFired).toContain('ai_alignment')
  })

  it('champion_ai_misalign wins for tier (priority order)', () => {
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('champion_ai_misalign')
  })

  it('but ALL fired flags appear in interpretations', () => {
    const matched = matchTier(assessment, result)
    const keys = matched!.interpretations.map((i) => i.key)
    expect(keys).toContain('gap.champion_ai_misalign')
    expect(keys).toContain('gap.ai_alignment')
  })
})

describe('Assessment 5 — AI alignment without champion_ai_misalign', () => {
  // No sceptical champion, but high-influence stakeholders are mostly
  // unknown/sceptical at the resistance end (so they're not champions).
  const rows: PersonRow[] = [
    row('CH', 9, 9, 'engaged'),
    row('R1', 8, 3, 'sceptical'),
    row('R2', 9, 2, 'sceptical'),
    row('R3', 7, 4, 'sceptical'),
    row('L1', 3, 8, 'engaged'),
    row('L2', 4, 7, 'cautious'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })

  it('fires ai_alignment but not champion_ai_misalign', () => {
    expect(result.raw.flagsFired).toContain('ai_alignment')
    expect(result.raw.flagsFired).not.toContain('champion_ai_misalign')
  })

  it('also fires outweighed (4 resistance, 1 champion)', () => {
    expect(result.raw.flagsFired).toContain('outweighed')
  })

  it('outweighed wins for tier (higher priority than ai_alignment)', () => {
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('outweighed')
  })
})

// ── STANCE VISIBILITY GAP ───────────────────────────────────────────────

describe('Assessment 5 — stance visibility gap', () => {
  // To isolate stance_visibility we need 3+ unknowns BUT NOT trigger
  // ai_alignment. So the unknowns must be at low influence (don't count
  // in the alignment score), and the high-influence stakeholders must all
  // be engaged/cautious.
  const rows: PersonRow[] = [
    row('CH', 9, 9, 'engaged'),     // high-influence, engaged
    row('CH2', 7, 7, 'engaged'),    // high-influence, engaged
    row('A1', 3, 8, 'unknown'),     // low-influence unknown
    row('A2', 2, 7, 'unknown'),     // low-influence unknown
    row('A3', 4, 8, 'unknown'),     // low-influence unknown
    row('A4', 5, 6, 'engaged'),     // low-influence (just under threshold)
  ]
  const result = score({ assessment, answers: answersFor(rows) })

  it('fires stance_visibility', () => {
    expect(result.raw.flagsFired).toContain('stance_visibility')
  })

  it('does NOT fire ai_alignment (high-influence stakeholders are aligned)', () => {
    expect(result.raw.flagsFired).not.toContain('ai_alignment')
  })

  it('matches stance_visibility when nothing more severe fires', () => {
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('stance_visibility')
  })
})

// ── PRIORITY ORDERING ──────────────────────────────────────────────────

describe('Assessment 5 — tier priority resolution', () => {
  it('champion_ai_misalign beats all other flags', () => {
    const rows: PersonRow[] = [
      // Sceptical champion + champion_gap (no engaged champion)?
      // Need to be careful — if champions==0 then champion_ai_misalign
      // can't fire because there's no champion to be sceptical
      // So construct: one sceptical champion (count=1), no engaged ones.
      // champion_ai_misalign fires; champion_gap doesn't (champions==1).
      // Add some resistance to also trigger outweighed.
      row('Sceptical Champion', 9, 9, 'sceptical'),
      row('R1', 8, 2, 'engaged'),
      row('R2', 7, 3, 'engaged'),
      row('R3', 9, 1, 'engaged'),
      row('BG1', 4, 4, 'engaged'),
      row('BG2', 5, 5, 'engaged'),
    ]
    const result = score({ assessment, answers: answersFor(rows) })
    const matched = matchTier(assessment, result)
    expect(result.raw.flagsFired).toContain('champion_ai_misalign')
    expect(result.raw.flagsFired).toContain('outweighed')
    expect(matched!.tier.id).toBe('champion_ai_misalign')
  })

  it('healthy_map only resolves when literally nothing else fires', () => {
    const rows: PersonRow[] = [
      row('CH1', 9, 9, 'engaged'),
      row('CH2', 8, 8, 'engaged'),
      row('AL1', 4, 8, 'engaged'),
      row('AL2', 3, 7, 'cautious'),
      row('BG1', 4, 4, 'engaged'),
      row('BG2', 5, 4, 'engaged'),
    ]
    const result = score({ assessment, answers: answersFor(rows) })
    expect(result.raw.flagsFired).toEqual(['healthy_map'])
    expect(matchTier(assessment, result)!.tier.id).toBe('healthy_map')
  })
})

// ── VARIABLES + CRM TAGS ────────────────────────────────────────────────

describe('Assessment 5 — variables exposed for tier conditions', () => {
  const rows: PersonRow[] = [
    row('CH', 9, 9, 'engaged'),
    row('AL', 3, 8, 'cautious'),
    row('RE', 8, 2, 'sceptical'),
    row('BG', 4, 4, 'unknown'),
    row('CH2', 7, 7, 'engaged'),
    row('A2', 5, 6, 'engaged'),
  ]
  const result = score({ assessment, answers: answersFor(rows) })

  it('every variable referenced by tier conditions is present', () => {
    // Walk all tier conditions and check the variable names appear
    const conditions = assessment.resultTiers.map((t) => t.condition).join(' ')
    // Conditions reference: has_sceptical_champion, champions, resistance,
    // ai_alignment_score, allies, unknown_count, avg_influence, avg_support, gap_count
    expect(result.variables).toHaveProperty('has_sceptical_champion')
    expect(result.variables).toHaveProperty('champions')
    expect(result.variables).toHaveProperty('resistance')
    expect(result.variables).toHaveProperty('ai_alignment_score')
    expect(result.variables).toHaveProperty('allies')
    expect(result.variables).toHaveProperty('unknown_count')
    expect(result.variables).toHaveProperty('avg_influence')
    expect(result.variables).toHaveProperty('avg_support')
    expect(result.variables).toHaveProperty('gap_count')
    // Smoke-check: condition string mentions each of these
    for (const v of [
      'has_sceptical_champion',
      'champions',
      'resistance',
      'ai_alignment_score',
      'allies',
      'unknown_count',
      'avg_influence',
      'avg_support',
      'gap_count',
    ]) {
      expect(conditions).toContain(v)
    }
  })
})

// ── CONTENT SANITY ─────────────────────────────────────────────────────

describe('Assessment 5 — content quality', () => {
  it('every gap interpretation has substantive body copy', () => {
    for (const interp of assessment.interpretations ?? []) {
      expect(interp.body.length).toBeGreaterThan(0)
      const firstBlock = interp.body[0] as { children?: { text: string }[] }
      const firstText = firstBlock.children?.[0]?.text ?? ''
      expect(firstText.length).toBeGreaterThan(80)
    }
  })

  it('every tier has a headline', () => {
    for (const tier of assessment.resultTiers) {
      expect(tier.headline.length).toBeGreaterThan(0)
    }
  })
})
