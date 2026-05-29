/**
 * End-to-end integration test for Assessment 4 (Cognitive Distortion Spotter).
 *
 * Loads the actual seed NDJSON and exercises all three tiers:
 *   - clear_thinking (healthy_count >= 9 → praise.clear_thinking key)
 *   - two_patterns   (5-8 healthy → top 2 distortion keys)
 *   - significant_pattern (<= 4 healthy → top 2 distortion keys)
 *
 * Plus structural checks: every fired distortion key has a matching
 * interpretation, every option references a declared tagCategory,
 * and the praise key emits at the right threshold.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Answers,
  Assessment,
  ScenarioRadioQuestion,
} from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON ─────────────────────────────────────────────────────

const ndjsonPath = join(__dirname, '../../../seed/assessment-4.ndjson')
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

const scenarios = assessment.questions.filter(
  (q): q is ScenarioRadioQuestion => q._type === 'questionScenarioRadio'
)

/**
 * Build an answers object by picking the option whose tag matches the
 * preference list, in priority order. For each scenario, walks the
 * preference list and picks the first option whose tagId appears in it.
 * Falls back to picking option 0 if no preference matches.
 */
function answersByPreference(preferredTags: string[]): Answers {
  const answers: Answers = {}
  for (const q of scenarios) {
    let pickedKey: string | undefined
    for (const pref of preferredTags) {
      const match = q.options.find((opt) => opt.tagId === pref)
      if (match) {
        pickedKey = match._key
        break
      }
    }
    if (!pickedKey) pickedKey = q.options[0]._key
    answers[q._key] = pickedKey
  }
  return answers
}

/**
 * Pick `n` healthy + fill the rest with the preferred distortion(s).
 */
function answersWithHealthyCount(
  healthyCount: number,
  fallbackTags: string[]
): Answers {
  const answers: Answers = {}
  for (let i = 0; i < scenarios.length; i++) {
    const q = scenarios[i]
    const wantHealthy = i < healthyCount
    let picked: string | undefined
    if (wantHealthy) {
      const healthyOpt = q.options.find((opt) => opt.tagId === 'healthy')
      if (healthyOpt) picked = healthyOpt._key
    }
    if (!picked) {
      for (const tag of fallbackTags) {
        const match = q.options.find((opt) => opt.tagId === tag)
        if (match) {
          picked = match._key
          break
        }
      }
    }
    if (!picked) {
      // Pick first non-healthy option
      const nonHealthy = q.options.find((opt) => opt.tagId !== 'healthy')
      picked = nonHealthy?._key ?? q.options[0]._key
    }
    answers[q._key] = picked
  }
  return answers
}

// ── STRUCTURAL TESTS ────────────────────────────────────────────────────

describe('Assessment 4 (end-to-end) — structure', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toContain('Eleven Thinking Traps')
    expect(assessment.scoringStrategy).toBe('tally-by-tag')
    expect(assessment.visualisation).toBe('distortionHeatmap')
    expect(scenarios).toHaveLength(12)
    expect(assessment.resultTiers).toHaveLength(3)
  })

  it('has exactly 13 tagCategories (10 classic + 2 AI + healthy)', () => {
    expect(assessment.tagCategories).toHaveLength(13)
    const ids = new Set(assessment.tagCategories!.map((t) => t.id))
    expect(ids.has('healthy')).toBe(true)
    expect(ids.has('ai_magnification')).toBe(true)
    expect(ids.has('ai_minimisation')).toBe(true)
    expect(ids.has('catastrophising')).toBe(true)
  })

  it('every scenario has exactly 4 options', () => {
    for (const q of scenarios) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('every scenario has at least one healthy option', () => {
    for (const q of scenarios) {
      const healthyOpts = q.options.filter((opt) => opt.tagId === 'healthy')
      expect(healthyOpts.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every option references a declared tagCategory', () => {
    const declaredTagIds = new Set(
      assessment.tagCategories!.map((t) => t.id)
    )
    for (const q of scenarios) {
      for (const opt of q.options) {
        expect(declaredTagIds.has(opt.tagId)).toBe(true)
      }
    }
  })

  it('every distortion tag has a matching distortion.* interpretation', () => {
    const nonHealthyTags = assessment.tagCategories!
      .filter((t) => t.id !== 'healthy')
      .map((t) => t.id)
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    for (const tagId of nonHealthyTags) {
      expect(interpKeys.has(`distortion.${tagId}`)).toBe(true)
    }
  })

  it('praise.clear_thinking interpretation exists', () => {
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    expect(interpKeys.has('praise.clear_thinking')).toBe(true)
  })
})

// ── TIER 1: CLEAR THINKING ──────────────────────────────────────────────

describe('Assessment 4 — Clear Thinking tier (healthy >= 9)', () => {
  const answers = answersWithHealthyCount(10, ['catastrophising'])
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)

  it('matches the clear_thinking tier', () => {
    expect(matched!.tier.id).toBe('clear_thinking')
  })

  it('emits only the praise.clear_thinking interpretation', () => {
    expect(result.interpretationKeys).toEqual(['praise.clear_thinking'])
  })

  it('surfaces the praise interpretation in matched.interpretations', () => {
    expect(matched!.interpretations).toHaveLength(1)
    expect(matched!.interpretations[0].key).toBe('praise.clear_thinking')
  })

  it('healthy_count matches what we asked for', () => {
    expect(result.raw.healthy_count).toBe(10)
  })
})

// ── TIER 2: TWO PATTERNS TO KNOW ────────────────────────────────────────

describe('Assessment 4 — Two Patterns tier (5 <= healthy <= 8)', () => {
  // 6 healthy + 6 distortion picks. Drive catastrophising as top.
  const answers = answersWithHealthyCount(6, [
    'catastrophising',
    'labelling',
  ])
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)

  it('matches the two_patterns tier', () => {
    expect(matched!.tier.id).toBe('two_patterns')
  })

  it('emits two distortion interpretation keys', () => {
    expect(result.interpretationKeys).toHaveLength(2)
    expect(
      result.interpretationKeys.every((k) => k.startsWith('distortion.'))
    ).toBe(true)
  })

  it('does NOT emit praise.clear_thinking', () => {
    expect(result.interpretationKeys).not.toContain('praise.clear_thinking')
  })

  it('healthy_count is in the 5-8 band', () => {
    expect(result.raw.healthy_count).toBeGreaterThanOrEqual(5)
    expect(result.raw.healthy_count).toBeLessThanOrEqual(8)
  })
})

// ── TIER 3: SIGNIFICANT PATTERN ─────────────────────────────────────────

describe('Assessment 4 — Significant Pattern tier (healthy <= 4)', () => {
  const answers = answersWithHealthyCount(2, [
    'catastrophising',
    'mind_reading',
    'labelling',
  ])
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)

  it('matches the significant_pattern tier', () => {
    expect(matched!.tier.id).toBe('significant_pattern')
  })

  it('emits two distortion interpretation keys', () => {
    expect(result.interpretationKeys).toHaveLength(2)
    expect(
      result.interpretationKeys.every((k) => k.startsWith('distortion.'))
    ).toBe(true)
  })

  it('healthy_count is 4 or fewer', () => {
    expect(result.raw.healthy_count).toBeLessThanOrEqual(4)
  })
})

// ── BOUNDARY: PRAISE THRESHOLD ──────────────────────────────────────────

describe('Assessment 4 — praise threshold boundary', () => {
  it('9 healthy out of 12 (75%) triggers praise', () => {
    const answers = answersWithHealthyCount(9, ['catastrophising'])
    const result = score({ assessment, answers })
    expect(result.interpretationKeys).toEqual(['praise.clear_thinking'])
  })

  it('8 healthy out of 12 (66%) does NOT trigger praise', () => {
    const answers = answersWithHealthyCount(8, ['catastrophising'])
    const result = score({ assessment, answers })
    expect(result.interpretationKeys).not.toContain('praise.clear_thinking')
    expect(result.interpretationKeys[0]).toMatch(/^distortion\./)
  })
})

// ── AI-RELATIVE DISTORTIONS ────────────────────────────────────────────

describe('Assessment 4 — AI-relative distortions', () => {
  it('ai_magnification surfaces as top when picked heavily', () => {
    // Pick AI-magnification wherever available; otherwise catastrophising
    const answers = answersByPreference(['ai_magnification', 'catastrophising'])
    const result = score({ assessment, answers })
    // ai_magnification appears 5 times across the NDJSON — should dominate
    const topTags = result.raw.topTags as string[]
    expect(topTags[0]).toBe('ai_magnification')
  })

  it('ai_minimisation and ai_magnification track separately', () => {
    const answers = answersByPreference(['ai_minimisation', 'ai_magnification'])
    const result = score({ assessment, answers })
    expect(result.variables.count_ai_minimisation).toBeGreaterThan(0)
    expect(result.variables.count_ai_magnification).toBeGreaterThanOrEqual(0)
  })
})

// ── CONTENT QUALITY ─────────────────────────────────────────────────────

describe('Assessment 4 — content quality', () => {
  it('every interpretation has substantial body copy', () => {
    for (const interp of assessment.interpretations ?? []) {
      expect(interp.body.length).toBeGreaterThan(0)
      const firstBlock = interp.body[0] as { children?: { text: string }[] }
      const firstText = firstBlock.children?.[0]?.text ?? ''
      expect(firstText.length).toBeGreaterThan(100)
    }
  })

  it('every tier has a headline', () => {
    for (const tier of assessment.resultTiers) {
      expect(tier.headline.length).toBeGreaterThan(0)
    }
  })

  it('every scenario has a title and prompt', () => {
    for (const q of scenarios) {
      expect(q.scenarioTitle).toBeTruthy()
      expect(q.prompt.length).toBeGreaterThan(30)
    }
  })
})

// ── TAG DECLARATION ORDER (tie-breaking) ───────────────────────────────

describe('Assessment 4 — tie-breaking is deterministic', () => {
  it('tagCategories declaration order is stable', () => {
    // The first non-healthy tag in the array is the tie-breaker winner
    // when all distortion counts are equal. Document the current order
    // so changing it triggers a test failure.
    const ids = assessment.tagCategories!.map((t) => t.id)
    expect(ids[0]).toBe('catastrophising')
    expect(ids[ids.length - 1]).toBe('healthy')
  })
})
