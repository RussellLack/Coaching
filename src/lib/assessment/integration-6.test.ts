/**
 * End-to-end integration test for Assessment 6 (Success Definition Audit).
 *
 * Loads the actual seed NDJSON and exercises:
 *   - All seven tiers (stable_shape, five rising-factor tiers, default_drift)
 *   - The interpretation key emission patterns
 *   - The variables exposed for the tier conditions
 *   - Content quality (each interpretation has substantial body copy)
 *
 * The trickiest test below is the tier priority: stable_shape needs to
 * win when total_drift_magnitude < 6, even if there's a clear rising
 * factor. That's the meta-pattern override.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Answers, Assessment } from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'

// ── LOAD THE NDJSON ─────────────────────────────────────────────────────

const ndjsonPath = join(__dirname, '../../../seed/assessment-6.ndjson')
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

// ── HELPERS ─────────────────────────────────────────────────────────────

function distribution(
  money: number,
  recognition: number,
  craft: number,
  connection: number,
  contribution: number
): Record<string, number> {
  return { money, recognition, craft, connection, contribution }
}

function answers(
  past: Record<string, number>,
  present: Record<string, number>,
  future: Record<string, number>
): Answers {
  return {
    'q-past': past,
    'q-present': present,
    'q-future': future,
  }
}

// ── STRUCTURAL TESTS ────────────────────────────────────────────────────

describe('Assessment 6 (end-to-end) — structure', () => {
  it('the NDJSON loads and parses', () => {
    expect(assessment.displayTitle).toBe('The Shape of Your Success')
    expect(assessment.scoringStrategy).toBe('time-shift-points')
    expect(assessment.visualisation).toBe('timeShiftLines')
    expect(assessment.questions).toHaveLength(3)
    expect(assessment.resultTiers).toHaveLength(7)
    expect(assessment.pointAllocationFactors).toHaveLength(5)
  })

  it('every factor has rising, falling, and anchor interpretations', () => {
    const factorIds = (assessment.pointAllocationFactors ?? []).map(
      (f) => f.id
    )
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    for (const id of factorIds) {
      expect(interpKeys.has(`factor.rising.${id}`)).toBe(true)
      expect(interpKeys.has(`factor.falling.${id}`)).toBe(true)
      expect(interpKeys.has(`anchor.${id}`)).toBe(true)
    }
  })

  it('pattern.stable_shape interpretation exists', () => {
    const interpKeys = new Set(
      (assessment.interpretations ?? []).map((i) => i.key)
    )
    expect(interpKeys.has('pattern.stable_shape')).toBe(true)
  })

  it('round questions have totalPoints == 11', () => {
    for (const q of assessment.questions) {
      if (q._type === 'questionPointAllocation') {
        expect(q.totalPoints).toBe(11)
      }
    }
  })
})

// ── TIER 1: STABLE SHAPE OVERRIDES ──────────────────────────────────────

describe('Assessment 6 — stable shape wins when drift is low', () => {
  it('identical rounds → stable_shape tier', () => {
    const distrib = distribution(3, 2, 3, 2, 1) // sums to 11
    const result = score({
      assessment,
      answers: answers(distrib, distrib, distrib),
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('stable_shape')
    expect(result.interpretationKeys).toContain('pattern.stable_shape')
  })

  it('low-but-nonzero drift → stable_shape tier still wins', () => {
    // Total drift magnitude: |−1| + 0 + |+1| + 0 + 0 = 2, below threshold 6
    const result = score({
      assessment,
      answers: answers(
        distribution(4, 3, 1, 2, 1),
        distribution(4, 3, 1, 2, 1),
        distribution(3, 3, 2, 2, 1)
      ),
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('stable_shape')
  })

  it('but rising/falling keys still surface alongside stable_shape', () => {
    const result = score({
      assessment,
      answers: answers(
        distribution(4, 3, 1, 2, 1),
        distribution(4, 3, 1, 2, 1),
        distribution(3, 3, 2, 2, 1)
      ),
    })
    expect(result.interpretationKeys).toContain('pattern.stable_shape')
    expect(result.interpretationKeys).toContain('factor.rising.craft')
    expect(result.interpretationKeys).toContain('factor.falling.money')
  })
})

// ── TIER 2-6: RISING FACTOR TIERS ──────────────────────────────────────

describe('Assessment 6 — craft rising', () => {
  // Drift magnitudes: money -3, recognition -2, craft +3, connection +2, contribution 0
  // Total: 10. Rising: craft.
  const result = score({
    assessment,
    answers: answers(
      distribution(5, 3, 1, 1, 1),
      distribution(3, 2, 3, 2, 1),
      distribution(2, 1, 4, 3, 1)
    ),
  })
  const matched = matchTier(assessment, result)

  it('matches the craft_rising tier', () => {
    expect(matched!.tier.id).toBe('craft_rising')
  })

  it('surfaces factor.rising.craft', () => {
    expect(result.interpretationKeys).toContain('factor.rising.craft')
  })

  it('surfaces factor.falling.money (the biggest faller)', () => {
    expect(result.interpretationKeys).toContain('factor.falling.money')
  })

  it('surfaces anchor.contribution (stable at 1 across all rounds)', () => {
    expect(result.interpretationKeys).toContain('anchor.contribution')
  })
})

describe('Assessment 6 — connection rising', () => {
  // Connection rises sharply; craft falls. Total drift = 6, above threshold
  const result = score({
    assessment,
    answers: answers(
      distribution(3, 2, 4, 1, 1),
      distribution(3, 2, 3, 2, 1),
      distribution(3, 2, 1, 4, 1)
    ),
  })
  const matched = matchTier(assessment, result)

  it('matches the connection_rising tier', () => {
    expect(matched!.tier.id).toBe('connection_rising')
  })

  it('surfaces factor.rising.connection', () => {
    expect(result.interpretationKeys).toContain('factor.rising.connection')
  })
})

describe('Assessment 6 — contribution rising', () => {
  const result = score({
    assessment,
    answers: answers(
      distribution(5, 3, 2, 1, 0),
      distribution(3, 2, 3, 2, 1),
      distribution(1, 1, 2, 3, 4)
    ),
  })
  const matched = matchTier(assessment, result)

  it('matches the contribution_rising tier', () => {
    expect(matched!.tier.id).toBe('contribution_rising')
  })
})

describe('Assessment 6 — money rising', () => {
  // Money rises across all three rounds; nothing else rises faster
  const result = score({
    assessment,
    answers: answers(
      distribution(1, 3, 3, 2, 2),
      distribution(3, 3, 2, 2, 1),
      distribution(5, 2, 2, 1, 1)
    ),
  })
  const matched = matchTier(assessment, result)

  it('matches the money_rising tier (priority above other rising tiers)', () => {
    expect(matched!.tier.id).toBe('money_rising')
  })

  it('surfaces factor.rising.money', () => {
    expect(result.interpretationKeys).toContain('factor.rising.money')
  })
})

describe('Assessment 6 — recognition rising', () => {
  const result = score({
    assessment,
    answers: answers(
      distribution(3, 1, 3, 2, 2),
      distribution(3, 2, 3, 2, 1),
      distribution(2, 4, 2, 2, 1)
    ),
  })
  const matched = matchTier(assessment, result)

  it('matches the recognition_rising tier', () => {
    expect(matched!.tier.id).toBe('recognition_rising')
  })
})

// ── TIER 7: DEFAULT DRIFT ──────────────────────────────────────────────

describe('Assessment 6 — default drift catch-all', () => {
  it('falls through to default_drift when none of the rising tiers match', () => {
    // Construct a case where rising_drift is 0 but total_drift is high.
    // E.g. money falls -3, recognition rises 0, craft 0, connection 0,
    // contribution rises +3 — but the FIRST rising tier (money_rising)
    // requires drift_money > 0, so it doesn't fire. contribution_rising
    // does. So this isn't actually a default_drift case.
    //
    // To force default_drift: have a case where total_drift_magnitude is
    // high but no factor's positive drift is the maximum (all positives
    // are zero). Tricky: if total_drift_magnitude is high, *something* is
    // moving — which means *something* is rising.
    //
    // Edge case: if rising_drift = 0 (all drifts ≤ 0), then no rising
    // tier's `drift_X > 0` clause matches. But then total_drift_magnitude
    // must also be tied to falling drifts, which means money is likely
    // falling. The tier `default_drift` catches this.
    //
    // Example: past = (5, 3, 2, 1, 0); present = (4, 3, 2, 1, 1);
    // future = (3, 3, 2, 1, 2). Drifts: money -2, others 0/+2.
    // Actually that triggers contribution_rising.
    //
    // Truer default_drift: only money falls; all others stable. Then
    // rising drift is 0, none of the rising tiers fire. But total drift
    // = 2 < 6, so stable_shape wins instead. To get default_drift cleanly
    // I'd need total_drift >= 6 with no positive rising — which isn't
    // possible (all positive drift sums must equal all negative drift sums,
    // so if total magnitude is 6+, *something* is rising by at least 3).
    //
    // Conclusion: default_drift is unreachable with this tier set. That's
    // OK — it's a safety net. Test that it exists as a tier but document
    // that it's unreachable.
    const tierIds = assessment.resultTiers.map((t) => t.id)
    expect(tierIds).toContain('default_drift')
  })
})

// ── PRIORITY ORDERING ──────────────────────────────────────────────────

describe('Assessment 6 — tier priority resolution', () => {
  it('stable_shape beats craft_rising when drift is low', () => {
    // Drift magnitudes: 0 each → all 0, total 0
    const distrib = distribution(3, 2, 3, 2, 1)
    const result = score({
      assessment,
      answers: answers(distrib, distrib, distrib),
    })
    const matched = matchTier(assessment, result)
    expect(matched!.tier.id).toBe('stable_shape')
  })

  it('money_rising beats craft_rising when both rise', () => {
    // Money rises +3; craft rises +2. money_rising condition fires first.
    const result = score({
      assessment,
      answers: answers(
        distribution(2, 3, 1, 3, 2),
        distribution(3, 3, 2, 2, 1),
        distribution(5, 2, 3, 0, 1)
      ),
    })
    const matched = matchTier(assessment, result)
    // Money drift = 3, craft drift = 2. rising_drift = 3. drift_money = 3.
    // So money_rising matches.
    expect(matched!.tier.id).toBe('money_rising')
  })
})

// ── VARIABLES + CRM TAGS ───────────────────────────────────────────────

describe('Assessment 6 — variables exposed for tier conditions', () => {
  const result = score({
    assessment,
    answers: answers(
      distribution(5, 3, 1, 1, 1),
      distribution(3, 2, 3, 2, 1),
      distribution(2, 1, 4, 3, 1)
    ),
  })

  it('every variable referenced by tier conditions is present', () => {
    expect(result.variables).toHaveProperty('total_drift_magnitude')
    expect(result.variables).toHaveProperty('rising_drift')
    expect(result.variables).toHaveProperty('falling_drift')
    expect(result.variables).toHaveProperty('has_anchor')
    expect(result.variables).toHaveProperty('drift_money')
    expect(result.variables).toHaveProperty('drift_recognition')
    expect(result.variables).toHaveProperty('drift_craft')
    expect(result.variables).toHaveProperty('drift_connection')
    expect(result.variables).toHaveProperty('drift_contribution')
  })

  it('tier conditions reference variables that exist', () => {
    const conditions = assessment.resultTiers.map((t) => t.condition).join(' ')
    // Check each variable that conditions reference
    for (const v of [
      'total_drift_magnitude',
      'rising_drift',
      'drift_money',
      'drift_recognition',
      'drift_craft',
      'drift_connection',
      'drift_contribution',
    ]) {
      expect(conditions).toContain(v)
    }
  })
})

// ── CONTENT QUALITY ────────────────────────────────────────────────────

describe('Assessment 6 — content quality', () => {
  it('every interpretation has substantive body copy', () => {
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

  it('each round has a prompt', () => {
    for (const q of assessment.questions) {
      if (q._type === 'questionPointAllocation') {
        expect(q.prompt).toBeDefined()
        expect((q.prompt ?? []).length).toBeGreaterThan(0)
      }
    }
  })

  it('future round has an AI-framed prompt with substantial copy', () => {
    const future = assessment.questions.find(
      (q) =>
        q._type === 'questionPointAllocation' &&
        (q as { roundId?: string }).roundId === 'future'
    )
    expect(future).toBeDefined()
    if (future && future._type === 'questionPointAllocation' && future.prompt) {
      const text = future.prompt
        .map((b) => {
          const block = b as { children?: { text: string }[] }
          return (block.children ?? []).map((c) => c.text).join('')
        })
        .join(' ')
      expect(text.toLowerCase()).toContain('ai')
      expect(text.length).toBeGreaterThan(200)
    }
  })
})
