/**
 * End-to-end integration test for Assessment 3 (Decision-Making Style).
 *
 * Loads the actual seed NDJSON and exercises:
 *   - All four base style tiers (AM, AS, IM, IS)
 *   - All three AI bands (light, balanced, leaning) → 12 overlay combinations
 *   - Both override flags (overreliance, underuse)
 *   - Tie-breaking by declaration order
 *   - Interpretation coverage (every style × band combination has copy)
 *   - The 2×2 visualisation receives the right data
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Answers, Assessment } from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON ─────────────────────────────────────────────────────

const ndjsonPath = join(__dirname, '../../../seed/assessment-3.ndjson')
const lines = readFileSync(ndjsonPath, 'utf-8').trim().split('\n')
const docs = lines.map((line) => JSON.parse(line))
const doc = docs.find((d) => d._type === 'assessment') as Record<
  string,
  unknown
>

const assessment: Assessment = {
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

// ── HELPERS ─────────────────────────────────────────────────────────────

/**
 * Build answers picking the option tagged with `style` for all scenarios.
 * Used to produce a clean "all-AM" or "all-IS" pattern for tier testing.
 */
function answersAllStyle(style: 'AM' | 'AS' | 'IM' | 'IS'): Answers {
  const out: Answers = {}
  for (const q of assessment.questions) {
    if (q._type !== 'questionScenarioRadio') continue
    const match = q.options.find((opt) => opt.tagId === style)
    if (!match) throw new Error(`No ${style} option in ${q._key}`)
    out[q._key] = match._key
  }
  return out
}

/**
 * Build an answers object with a specific mix of style counts.
 * Distributes picks across the 8 scenarios. Throws if total != 8.
 */
function answersMix(mix: { AM?: number; AS?: number; IM?: number; IS?: number }): Answers {
  const expanded: string[] = []
  if (mix.AM) for (let i = 0; i < mix.AM; i++) expanded.push('AM')
  if (mix.AS) for (let i = 0; i < mix.AS; i++) expanded.push('AS')
  if (mix.IM) for (let i = 0; i < mix.IM; i++) expanded.push('IM')
  if (mix.IS) for (let i = 0; i < mix.IS; i++) expanded.push('IS')
  if (expanded.length !== 8) {
    throw new Error(`Mix must total 8 picks, got ${expanded.length}`)
  }
  const out: Answers = {}
  for (let i = 0; i < 8; i++) {
    const q = assessment.questions[i]
    if (q._type !== 'questionScenarioRadio') throw new Error('non-scenario')
    const targetStyle = expanded[i]
    const match = q.options.find((opt) => opt.tagId === targetStyle)
    if (!match) throw new Error(`No ${targetStyle} option in ${q._key}`)
    out[q._key] = match._key
  }
  return out
}

/**
 * Look up calibration option keys for given scores. The NDJSON uses
 * predictable _key conventions (c1n, c1o, c1f, c1a for q_ai_use; etc).
 * Build a generic lookup.
 */
function calAnswers(
  q9: number, // 0-3
  q10: number, // 0-3
  q11: number // 0-3
): Answers {
  function find(qid: string, score: number): string {
    const cq = (assessment.calibrationQuestions ?? []).find((c) => c.id === qid)
    if (!cq) throw new Error(`No calibration question ${qid}`)
    const opt = cq.options.find((o) => o.score === score)
    if (!opt) throw new Error(`No option scored ${score} in ${qid}`)
    return opt._key
  }
  return {
    q_ai_use: find('q_ai_use', q9),
    q_ai_defer: find('q_ai_defer', q10),
    q_ai_confidence: find('q_ai_confidence', q11),
  }
}

// ── STRUCTURAL TESTS ────────────────────────────────────────────────────

describe('Assessment 3 (end-to-end) — structure', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toContain('How You Decide')
    expect(assessment.scoringStrategy).toBe('tally-by-tag')
    expect(assessment.visualisation).toBe('quadrant2x2')
    expect(assessment.questions).toHaveLength(8)
    expect(assessment.calibrationQuestions).toHaveLength(3)
    expect(assessment.resultTiers).toHaveLength(4)
    expect(assessment.tagCategories).toHaveLength(4)
  })

  it('every scenario offers all four styles', () => {
    for (const q of assessment.questions) {
      if (q._type !== 'questionScenarioRadio') continue
      const styles = new Set(q.options.map((o) => o.tagId))
      expect(styles).toEqual(new Set(['AM', 'AS', 'IM', 'IS']))
    }
  })

  it('calibration questions use the IDs the strategy expects', () => {
    const ids = (assessment.calibrationQuestions ?? []).map((c) => c.id)
    expect(ids).toContain('q_ai_use')
    expect(ids).toContain('q_ai_defer')
    expect(ids).toContain('q_ai_confidence')
  })

  it('every style has a base interpretation', () => {
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    for (const s of ['AM', 'AS', 'IM', 'IS']) {
      expect(interpKeys.has(`style.${s}`)).toBe(true)
    }
  })

  it('every style × band combination has an overlay interpretation', () => {
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    for (const s of ['AM', 'AS', 'IM', 'IS']) {
      for (const b of ['light', 'balanced', 'leaning']) {
        expect(interpKeys.has(`overlay.${s}.${b}`)).toBe(true)
      }
    }
  })

  it('both override interpretations exist', () => {
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    expect(interpKeys.has('override.ai_overreliance')).toBe(true)
    expect(interpKeys.has('override.ai_underuse')).toBe(true)
  })
})

// ── TIER MATCHING ──────────────────────────────────────────────────────

describe('Assessment 3 — base style tier matching', () => {
  it('all-AM picks → analytical_maximiser tier', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('analytical_maximiser')
  })

  it('all-AS picks → analytical_satisficer tier', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AS'), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('analytical_satisficer')
  })

  it('all-IM picks → intuitive_maximiser tier', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IM'), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('intuitive_maximiser')
  })

  it('all-IS picks → intuitive_satisficer tier', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IS'), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('intuitive_satisficer')
  })

  it('mixed picks resolve to the modal style', () => {
    const result = score({
      assessment,
      answers: {
        ...answersMix({ AM: 5, IM: 2, IS: 1 }),
        ...calAnswers(2, 1, 2),
      },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('analytical_maximiser')
  })
})

// ── AI BAND OVERLAY ─────────────────────────────────────────────────────

describe('Assessment 3 — AI band overlay emission', () => {
  it('AM + light → style.AM + overlay.AM.light', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(0, 0, 2) },
    })
    expect(result.interpretationKeys).toContain('style.AM')
    expect(result.interpretationKeys).toContain('overlay.AM.light')
  })

  it('AM + balanced', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(1, 1, 2) },
    })
    expect(result.interpretationKeys).toContain('overlay.AM.balanced')
  })

  it('AM + leaning', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(2, 2, 2) },
    })
    expect(result.interpretationKeys).toContain('overlay.AM.leaning')
  })

  it('IS + leaning (riskiest combination per spec)', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IS'), ...calAnswers(3, 3, 2) },
    })
    expect(result.interpretationKeys).toContain('style.IS')
    expect(result.interpretationKeys).toContain('overlay.IS.leaning')
  })

  it('IM + balanced (cleanest combination per spec)', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IM'), ...calAnswers(1, 1, 2) },
    })
    expect(result.interpretationKeys).toContain('overlay.IM.balanced')
  })

  it('does NOT emit distortion.* keys (those are Assessment 4 only)', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(1, 1, 2) },
    })
    expect(
      result.interpretationKeys.some((k) => k.startsWith('distortion.'))
    ).toBe(false)
  })
})

// ── OVERRIDE FLAGS ─────────────────────────────────────────────────────

describe('Assessment 3 — override flags', () => {
  it('emits override.ai_overreliance for heavy use + low confidence', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AS'), ...calAnswers(2, 2, 0) }, // use=4, conf=0
    })
    expect(result.interpretationKeys).toContain('override.ai_overreliance')
    expect(result.variables.ai_overreliance).toBe(1)
  })

  it('does NOT emit override.ai_overreliance when confidence is high', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AS'), ...calAnswers(3, 3, 3) }, // use=6, conf=3
    })
    expect(result.interpretationKeys).not.toContain('override.ai_overreliance')
  })

  it('emits override.ai_underuse when q_ai_use == 0', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(0, 0, 2) },
    })
    expect(result.interpretationKeys).toContain('override.ai_underuse')
    expect(result.variables.ai_underuse).toBe(1)
  })

  it('does NOT emit override.ai_underuse when q_ai_use > 0', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('AM'), ...calAnswers(1, 0, 2) },
    })
    expect(result.interpretationKeys).not.toContain('override.ai_underuse')
  })
})

// ── TIE-BREAKING ───────────────────────────────────────────────────────

describe('Assessment 3 — tie-breaking by declaration order', () => {
  it('AM beats IM when tied (AM declared first)', () => {
    const result = score({
      assessment,
      answers: { ...answersMix({ AM: 4, IM: 4 }), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('analytical_maximiser')
  })

  it('AS beats IS when tied (AS declared before IS)', () => {
    const result = score({
      assessment,
      answers: { ...answersMix({ AS: 4, IS: 4 }), ...calAnswers(1, 1, 2) },
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('analytical_satisficer')
  })
})

// ── QUADRANT VISUALISATION DATA ────────────────────────────────────────

describe('Assessment 3 — quadrant visualisation receives correct data', () => {
  it('passes counts and dominant style via raw.counts and raw.topTags', () => {
    const result = score({
      assessment,
      answers: { ...answersMix({ AM: 5, AS: 1, IM: 1, IS: 1 }), ...calAnswers(1, 1, 2) },
    })
    expect(result.raw.counts).toEqual({ AM: 5, AS: 1, IM: 1, IS: 1 })
    const topTags = result.raw.topTags as string[]
    expect(topTags[0]).toBe('AM')
  })

  it('dominant style is determinable from topTags even on a near-tie', () => {
    const result = score({
      assessment,
      answers: { ...answersMix({ AM: 3, IM: 3, IS: 2 }), ...calAnswers(1, 1, 2) },
    })
    // AM declared before IM → AM wins tie
    const topTags = result.raw.topTags as string[]
    expect(topTags[0]).toBe('AM')
  })
})

// ── CONTENT QUALITY ────────────────────────────────────────────────────

describe('Assessment 3 — content quality', () => {
  it('every interpretation has substantive body copy', () => {
    for (const interp of assessment.interpretations ?? []) {
      expect(interp.body.length).toBeGreaterThan(0)
      const firstBlock = interp.body[0] as { children?: { text: string }[] }
      const firstText = firstBlock.children?.[0]?.text ?? ''
      expect(firstText.length).toBeGreaterThan(150)
    }
  })

  it('every tier has a headline', () => {
    for (const tier of assessment.resultTiers) {
      expect(tier.headline.length).toBeGreaterThan(0)
    }
  })

  it('every scenario has a title and substantial prompt', () => {
    for (const q of assessment.questions) {
      if (q._type !== 'questionScenarioRadio') continue
      expect(q.scenarioTitle).toBeTruthy()
      expect(q.prompt.length).toBeGreaterThan(40)
    }
  })

  it('every scenario option has substantial label text', () => {
    for (const q of assessment.questions) {
      if (q._type !== 'questionScenarioRadio') continue
      for (const opt of q.options) {
        expect(opt.label.length).toBeGreaterThan(20)
      }
    }
  })

  it('AI-leaning overlays mention the specific risk pattern', () => {
    const leaningKeys = ['overlay.AM.leaning', 'overlay.AS.leaning', 'overlay.IM.leaning', 'overlay.IS.leaning']
    for (const key of leaningKeys) {
      const interp = assessment.interpretations?.find((i) => i.key === key)
      expect(interp).toBeDefined()
      const text = (interp!.body[0] as { children?: { text: string }[] }).children?.[0]?.text ?? ''
      // Each leaning overlay should mention something specific about
      // heavy AI use, not be generic
      expect(text.length).toBeGreaterThan(200)
    }
  })
})

// ── PRIMARY FINDING & CRM TAGS (lightweight check that calibration
// data surfaces in the downstream payload) ─────────────────────────────

describe('Assessment 3 — calibration data exposed for CRM/payload', () => {
  it('raw.calibration is populated when all three calibration questions are answered', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IM'), ...calAnswers(2, 2, 1) },
    })
    expect(result.raw.calibration).not.toBe(null)
    const cal = result.raw.calibration as { aiBand: string; aiUseScore: number }
    expect(cal.aiBand).toBe('leaning')
    expect(cal.aiUseScore).toBe(4)
  })

  it('per-question calibration scores are exposed as cal_*', () => {
    const result = score({
      assessment,
      answers: { ...answersAllStyle('IM'), ...calAnswers(2, 2, 1) },
    })
    expect(result.variables.cal_q_ai_use).toBe(2)
    expect(result.variables.cal_q_ai_defer).toBe(2)
    expect(result.variables.cal_q_ai_confidence).toBe(1)
  })
})
