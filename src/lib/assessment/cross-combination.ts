/**
 * Cross-assessment combination matcher.
 *
 * Pure function that takes a user's submission history and a list of
 * active combinations, evaluates each combination's requirements against
 * the history, and returns the first-matched combination (if any).
 *
 * Match semantics:
 *   - A requirement is satisfied when the user has at least one
 *     submission of the named assessment whose tier id appears in
 *     `anyOfTiers` OR whose interpretation keys overlap with
 *     `anyOfInterpretationKeys`.
 *   - A combination matches when EVERY requirement is satisfied by at
 *     least one submission (different requirements can be satisfied by
 *     different submissions — e.g. requirement A by the user's
 *     Assessment 3 submission, requirement B by their Assessment 4
 *     submission).
 *   - Combinations are evaluated in `orderInList` order. The first
 *     match wins; subsequent matches are ignored for this trigger.
 *
 * Why first-match-wins: at most one nudge email per submission. If two
 * combinations match the same user's history, the higher-priority
 * (lower orderInList) one is the one that actually surfaces. This keeps
 * the email volume low and makes priorities explicit to Russell.
 *
 * Dedup against past nudges: the matcher accepts a set of already-fired
 * combination slugs (read from previous submissions' `combinationMatched`
 * field) and skips them. Means a combination fires at most once per user.
 */

import type {
  CrossCombination,
  CrossCombinationRequirement,
  SubmissionRecord,
} from '@/types/assessment'

export interface MatchInput {
  history: SubmissionRecord[]
  combinations: CrossCombination[]
  // Combination slugs that have already fired for this user in a past
  // submission. The matcher skips these so each combination fires at
  // most once per user.
  alreadyFired: Set<string>
}

export interface MatchResult {
  combination: CrossCombination
  // Which submission satisfied each requirement (useful for debugging
  // and for surfacing the matched evidence in Studio).
  evidence: Array<{
    requirement: CrossCombinationRequirement
    matchedSubmissionId?: string
  }>
}

/**
 * Find the first combination (by orderInList ascending) whose
 * requirements are all satisfied by the user's submission history.
 * Returns null if no combination matches.
 */
export function matchCombination(input: MatchInput): MatchResult | null {
  const { history, combinations, alreadyFired } = input

  for (const combination of combinations) {
    if (alreadyFired.has(combination.slug)) continue

    const evidence: MatchResult['evidence'] = []
    let allRequirementsMet = true

    for (const requirement of combination.requirements) {
      const matched = findSatisfyingSubmission(history, requirement)
      if (!matched) {
        allRequirementsMet = false
        break
      }
      evidence.push({
        requirement,
        matchedSubmissionId: matched._id,
      })
    }

    if (allRequirementsMet) {
      return { combination, evidence }
    }
  }
  return null
}

/**
 * Returns the first submission in the history that satisfies the given
 * requirement, or undefined if none does.
 *
 * Match logic:
 *   - The submission's assessmentSlug must equal the requirement's
 *     assessmentSlug.
 *   - At least one of:
 *       - anyOfTiers is non-empty AND submission.tierId is in it; OR
 *       - anyOfInterpretationKeys is non-empty AND there's overlap
 *         between submission.interpretationKeys and the list.
 *   - If both anyOfTiers and anyOfInterpretationKeys are empty/missing,
 *     ANY submission of the matching assessment satisfies the
 *     requirement. (Useful for combinations of the form "user has taken
 *     X AND Y" with no tier-specific constraints.)
 */
function findSatisfyingSubmission(
  history: SubmissionRecord[],
  requirement: CrossCombinationRequirement
): SubmissionRecord | undefined {
  for (const sub of history) {
    if (sub.assessmentSlug !== requirement.assessmentSlug) continue
    if (submissionSatisfiesRequirement(sub, requirement)) return sub
  }
  return undefined
}

export function submissionSatisfiesRequirement(
  sub: SubmissionRecord,
  requirement: CrossCombinationRequirement
): boolean {
  const tiers = requirement.anyOfTiers ?? []
  const keys = requirement.anyOfInterpretationKeys ?? []

  // If both lists are empty, any submission of this assessment matches.
  if (tiers.length === 0 && keys.length === 0) return true

  // Otherwise: tier OR key match is enough.
  if (tiers.length > 0 && tiers.includes(sub.tierId)) return true
  if (keys.length > 0) {
    for (const subKey of sub.interpretationKeys ?? []) {
      if (keys.includes(subKey)) return true
    }
  }
  return false
}

// ── EMAIL HASH ──────────────────────────────────────────────────────────

/**
 * Compute a privacy-preserving lookup key for an email address.
 *
 * SHA-256 of the lowercased, trimmed email. Same email always produces
 * the same hash; the hash is one-way (you can't recover the email from
 * it). Stored in submission records so the API route can look up a
 * user's history without leaking the full email into the query path.
 *
 * Uses the Node.js / Web Crypto API. The function is async because
 * the Web Crypto API is async-only — and the route handler runs in a
 * context where we can use either Node's `crypto` or `crypto.subtle`.
 */
export async function hashEmail(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalised)

  // Prefer Web Crypto when available (Edge runtime, modern Node).
  if (
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.subtle.digest === 'function'
  ) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return bufferToHex(hashBuffer)
  }

  // Fallback: Node's `crypto` module. Loaded dynamically so this file
  // remains importable in a browser context where node:crypto doesn't
  // exist (the test suite imports this from places where it might).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = await import('node:crypto')
  return nodeCrypto.createHash('sha256').update(normalised).digest('hex')
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}
