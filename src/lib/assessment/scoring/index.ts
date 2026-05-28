import type { ScoringContext, BaseScoringResult, ScoringStrategy } from '@/types/assessment'
import { scoreDimensionalLikert } from './dimensional-likert'
import { scoreDimensionalSlider } from './dimensional-slider'
import { scoreSupportMatrix } from './support-matrix'
import { scoreTallyByTag } from './tally-by-tag'
import { scoreTimeShiftPoints } from './time-shift-points'

/**
 * Dispatch table mapping strategy name → scoring function.
 *
 * All five strategies are now implemented. Adding a sixth strategy
 * requires a new file in this directory + registration here.
 */
const strategies: Record<
  ScoringStrategy,
  (ctx: ScoringContext) => BaseScoringResult
> = {
  'dimensional-likert': scoreDimensionalLikert,
  'dimensional-slider': scoreDimensionalSlider,
  'support-matrix': scoreSupportMatrix,
  'tally-by-tag': scoreTallyByTag,
  'time-shift-points': scoreTimeShiftPoints,
}

export function score(ctx: ScoringContext): BaseScoringResult {
  const strategyName = ctx.assessment.scoringStrategy
  const strategy = strategies[strategyName]
  if (!strategy) {
    throw new Error(
      `Scoring strategy "${strategyName}" is not implemented. ` +
        `Implemented: ${Object.keys(strategies).join(', ')}`
    )
  }
  return strategy(ctx)
}

export {
  scoreDimensionalLikert,
  scoreDimensionalSlider,
  scoreSupportMatrix,
  scoreTallyByTag,
  scoreTimeShiftPoints,
}
