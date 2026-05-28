/**
 * PDF visualisation dispatcher — mirrors the web visualisation dispatcher.
 *
 * Switches on `assessment.visualisation` and renders the matching PDF
 * component, reading data from the scoring result's `raw` field. The
 * shape of `raw` depends on the scoring strategy; each case casts to
 * the strategy-specific shape it expects.
 *
 * All six visualisations now go through this dispatcher — dimension
 * bars (Assessment 1) used to be hand-laid in render-assessment-pdf.tsx
 * with View/Text flexbox primitives, but were ported to SVG and routed
 * here for architectural consistency. Now the dispatcher is the single
 * source of truth for "which visualisation does this assessment use?"
 */

import { View } from '@react-pdf/renderer'
import type { Assessment, Dimension } from '@/types/assessment'
import type { FactorScores } from '@/lib/assessment/scoring/time-shift-points'
import type { PersonRow } from '@/types/assessment'

import { PdfRadarWheel } from './RadarWheel'
import { PdfStakeholderMatrix } from './StakeholderMatrix'
import { PdfDistortionHeatmap } from './DistortionHeatmap'
import { PdfTimeShiftLines } from './TimeShiftLines'
import { PdfQuadrant2x2 } from './Quadrant2x2'
import { PdfDimensionBars } from './DimensionBars'

export interface PdfVisualisationProps {
  assessment: Assessment
  rawResult: Record<string, unknown>
}

export function PdfVisualisation({
  assessment,
  rawResult,
}: PdfVisualisationProps) {
  switch (assessment.visualisation) {
    case 'radarWheel': {
      const dimensions = assessment.dimensions ?? []
      const raw = rawResult as {
        dimensions?: Record<string, number>
        lowestDimensions?: string[]
      }
      // Wrap in a centring View. react-pdf SVGs render at their declared
      // viewBox size and don't auto-centre in their parent.
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfRadarWheel
            dimensions={dimensions}
            scores={raw.dimensions ?? {}}
            highlightedDimensionIds={raw.lowestDimensions ?? []}
          />
        </View>
      )
    }

    case 'stakeholderMatrix': {
      const raw = rawResult as { rows?: PersonRow[] }
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfStakeholderMatrix rows={raw.rows ?? []} />
        </View>
      )
    }

    case 'distortionHeatmap': {
      const raw = rawResult as {
        rankedTags?: { id: string; label: string; count: number }[]
        topTags?: string[]
      }
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfDistortionHeatmap
            rankedTags={raw.rankedTags ?? []}
            topTagIds={raw.topTags ?? []}
          />
        </View>
      )
    }

    case 'timeShiftLines': {
      const raw = rawResult as {
        factors?: FactorScores[]
        rising_factor?: string
        falling_factor?: string
      }
      // Find the totalPoints from the first point allocation question
      const pq = assessment.questions.find(
        (q) => q._type === 'questionPointAllocation'
      )
      const totalPoints =
        pq?._type === 'questionPointAllocation' ? pq.totalPoints : 11
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfTimeShiftLines
            factors={raw.factors ?? []}
            risingFactorId={raw.rising_factor ?? ''}
            fallingFactorId={raw.falling_factor ?? ''}
            totalPoints={totalPoints}
          />
        </View>
      )
    }

    case 'quadrant2x2': {
      const raw = rawResult as {
        counts?: Record<string, number>
        topTags?: string[]
      }
      const dominantStyle = raw.topTags?.[0] ?? ''
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfQuadrant2x2
            counts={raw.counts ?? {}}
            dominantStyle={dominantStyle}
          />
        </View>
      )
    }

    case 'dimensionBars': {
      const dimensions = (assessment.dimensions ?? []) as Dimension[]
      const raw = rawResult as {
        dimensions?: Record<string, number>
        lowestDimension?: string
      }
      // Match the main renderer's maxValue logic: sliders use 0-10,
      // Likert uses 0-5 (the strategy normalises to a 0-5 range).
      const maxValue =
        assessment.scoringStrategy === 'dimensional-slider' ? 10 : 5
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <PdfDimensionBars
            dimensions={dimensions}
            scores={raw.dimensions ?? {}}
            maxValue={maxValue}
            highlightedDimensionId={raw.lowestDimension}
          />
        </View>
      )
    }

    default: {
      // Exhaustiveness check — if a new visualisation is added to the
      // schema but not implemented here, TypeScript will catch it.
      const _exhaustive: never = assessment.visualisation
      return null
    }
  }
}
