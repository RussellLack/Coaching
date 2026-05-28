import type {
  Assessment,
  BaseScoringResult,
  Interpretation,
  ResultTier,
} from '@/types/assessment'
import { evaluateCondition, ConditionError } from '@/lib/assessment/condition/evaluator'

/**
 * Match a scoring result to a result tier and the interpretations to display.
 *
 * Tiers are evaluated in document order. First match wins. If no tier
 * matches, returns null (the renderer should handle this by showing a
 * generic fallback).
 *
 * Interpretation keys produced by the scoring strategy are looked up in
 * `assessment.interpretations`. Missing keys are silently skipped — this
 * is deliberate, so adding a new interpretation key in the scoring code
 * before authoring the copy in Sanity doesn't crash the page.
 */

export interface MatchedResult {
  tier: ResultTier
  interpretations: Interpretation[]
  scoring: BaseScoringResult
}

export function matchTier(
  assessment: Assessment,
  scoring: BaseScoringResult
): MatchedResult | null {
  const tier = findMatchingTier(assessment.resultTiers, scoring.variables)
  if (!tier) return null

  const interpretations = lookupInterpretations(
    assessment.interpretations ?? [],
    scoring.interpretationKeys
  )

  return { tier, interpretations, scoring }
}

function findMatchingTier(
  tiers: ResultTier[],
  variables: Record<string, number | string>
): ResultTier | null {
  for (const tier of tiers) {
    try {
      if (evaluateCondition(tier.condition, variables)) {
        return tier
      }
    } catch (e) {
      // Authoring bug — log but keep checking subsequent tiers so a
      // malformed condition doesn't break the whole result page.
      if (e instanceof ConditionError) {
        // eslint-disable-next-line no-console
        console.error(
          `[fab.partners] Malformed condition on tier "${tier.id}": ${e.message}`
        )
        continue
      }
      throw e
    }
  }
  return null
}

function lookupInterpretations(
  all: Interpretation[],
  keys: string[]
): Interpretation[] {
  const byKey = new Map<string, Interpretation>()
  for (const i of all) byKey.set(i.key, i)
  const result: Interpretation[] = []
  for (const k of keys) {
    const found = byKey.get(k)
    if (found) result.push(found)
  }
  return result
}
