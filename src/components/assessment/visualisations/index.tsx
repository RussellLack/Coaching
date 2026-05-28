import type {
  Assessment,
  BaseScoringResult,
  PersonRow,
} from '@/types/assessment'
import { DimensionBars } from './DimensionBars'
import { RadarWheel } from './RadarWheel'
import { StakeholderMatrix } from './StakeholderMatrix'
import { DistortionHeatmap } from './DistortionHeatmap'
import { TimeShiftLines } from './TimeShiftLines'
import { Quadrant2x2 } from './Quadrant2x2'
import type { FactorScores } from '@/lib/assessment/scoring/time-shift-points'

export interface VisualisationProps {
  assessment: Assessment
  scoring: BaseScoringResult
}

export function AssessmentVisualisation({
  assessment,
  scoring,
}: VisualisationProps) {
  switch (assessment.visualisation) {
    case 'dimensionBars': {
      const dimensions = assessment.dimensions ?? []
      const raw = scoring.raw as {
        dimensions: Record<string, number>
        lowestDimension?: string
      }
      const maxValue =
        assessment.scoringStrategy === 'dimensional-slider' ? 10 : 5
      return (
        <DimensionBars
          dimensions={dimensions}
          scores={raw.dimensions}
          maxValue={maxValue}
          highlightedDimensionId={raw.lowestDimension}
        />
      )
    }

    case 'radarWheel': {
      const dimensions = assessment.dimensions ?? []
      const raw = scoring.raw as {
        dimensions: Record<string, number>
        lowestDimensions?: string[]
      }
      return (
        <RadarWheel
          dimensions={dimensions}
          scores={raw.dimensions}
          highlightedDimensionIds={raw.lowestDimensions ?? []}
        />
      )
    }

    case 'stakeholderMatrix': {
      const raw = scoring.raw as { rows: PersonRow[] }
      const personRowQuestion = assessment.questions.find(
        (q) => q._type === 'questionPersonRowEntry'
      )
      const stanceOptions =
        personRowQuestion?._type === 'questionPersonRowEntry'
          ? personRowQuestion.stanceOptions
          : undefined
      return (
        <StakeholderMatrix
          rows={raw.rows ?? []}
          stanceOptions={stanceOptions}
        />
      )
    }

    case 'distortionHeatmap': {
      const raw = scoring.raw as {
        rankedTags: { id: string; label: string; count: number }[]
        topTags: string[]
      }
      return (
        <DistortionHeatmap
          rankedTags={raw.rankedTags ?? []}
          topTagIds={raw.topTags ?? []}
        />
      )
    }

    case 'timeShiftLines': {
      const raw = scoring.raw as {
        factors: FactorScores[]
        rising_factor: string
        falling_factor: string
      }
      // Cap the y-axis at the first round's totalPoints (assume rounds match)
      const firstPointQuestion = assessment.questions.find(
        (q) => q._type === 'questionPointAllocation'
      )
      const totalPoints =
        firstPointQuestion?._type === 'questionPointAllocation'
          ? firstPointQuestion.totalPoints
          : 11
      return (
        <TimeShiftLines
          factors={raw.factors ?? []}
          risingFactorId={raw.rising_factor}
          fallingFactorId={raw.falling_factor}
          totalPoints={totalPoints}
        />
      )
    }

    case 'quadrant2x2': {
      const raw = scoring.raw as {
        counts: Record<string, number>
        topTags: string[]
      }
      const dominantStyle = raw.topTags?.[0] ?? ''
      return (
        <Quadrant2x2
          counts={raw.counts ?? {}}
          dominantStyle={dominantStyle}
        />
      )
    }

    default: {
      const _exhaustive: never = assessment.visualisation
      return null
    }
  }
}
