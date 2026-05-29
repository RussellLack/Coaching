/**
 * PDF DimensionBars — port of the web horizontal-bars visualisation
 * for Assessment 1 (Coaching Readiness).
 *
 * Layout (per row):
 *   [ dimension label ] [ track + filled bar ] [ score value ]
 *      ~120pt wide        flex-grow              ~32pt right-aligned
 *
 * This was previously rendered with @react-pdf/renderer's View/Text
 * flexbox primitives directly in render-assessment-pdf.tsx. Porting to
 * SVG brings dimension bars into line with the other five PDF
 * visualisations — radar wheel, stakeholder matrix, distortion heatmap,
 * time-shift lines, 2×2 quadrant — which all live under
 * pdf/visualisations/ and route through the dispatcher.
 *
 * Visual parity with the View-based version: bar height 6, label colour
 * matches the muted/accent split, fill colour matches highlighted/normal,
 * track is the border-tone, score value is ink-coloured and right-aligned.
 * The "highlighted" dimension is whichever dimension has the lowest
 * score (the one the user is told to focus on); that's surfaced by the
 * scoring strategy as `raw.lowestDimension`.
 *
 * SVG sizing:
 *   - Width fixed at 480 (typical PDF content width with the page margins)
 *   - Height computed from the number of rows × ROW_HEIGHT
 *   - viewBox matches the dimensions so the SVG fills its container
 *
 * Defensive: returns null when no dimensions are supplied, matching the
 * convention of the other visualisations.
 */

import { Svg, Rect, G, Text as SvgText } from '@react-pdf/renderer'
import type { Dimension } from '@/types/assessment'
import { PDF_COLOURS } from '../colours'

export interface PdfDimensionBarsProps {
  dimensions: Dimension[]
  scores: Record<string, number>
  maxValue: number
  highlightedDimensionId?: string
  width?: number
}

// Layout constants. Kept as named values so visual parity with the
// original View-based bars is easy to inspect.
const ROW_HEIGHT = 22 // total vertical space per row
const BAR_HEIGHT = 6 // matches scoreBarTrack.height in the main renderer
const LABEL_WIDTH = 120 // matches scoreLabel.width
const SCORE_WIDTH = 36 // matches scoreValue.width (+ a few px for safety)
const TRACK_PADDING_X = 12 // matches scoreBarTrack.marginHorizontal
const TRACK_RADIUS = 3 // matches scoreBarTrack.borderRadius

export function PdfDimensionBars({
  dimensions,
  scores,
  maxValue,
  highlightedDimensionId,
  width = 480,
}: PdfDimensionBarsProps): React.ReactElement | null {
  if (dimensions.length === 0) return null

  const height = dimensions.length * ROW_HEIGHT
  const trackLeft = LABEL_WIDTH + TRACK_PADDING_X
  const trackRight = width - SCORE_WIDTH - TRACK_PADDING_X
  const trackWidth = trackRight - trackLeft

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {dimensions.map((dim, i) => {
        const score = scores[dim.id] ?? 0
        const clampedFraction =
          maxValue > 0 ? Math.max(0, Math.min(1, score / maxValue)) : 0
        const fillWidth = trackWidth * clampedFraction
        const isHighlighted = dim.id === highlightedDimensionId

        // Vertical centring: anchor the bar at the row midline, then place
        // the label and score on the same midline. The text baseline trick
        // (adding ~3-4 to y) accounts for SVG text being rendered above
        // its baseline by default.
        const rowMid = i * ROW_HEIGHT + ROW_HEIGHT / 2
        const barY = rowMid - BAR_HEIGHT / 2
        const textY = rowMid + 3.5

        const labelColour = isHighlighted
          ? PDF_COLOURS.accent
          : PDF_COLOURS.bodyText
        const labelWeight = isHighlighted ? 600 : 400
        const fillColour = isHighlighted
          ? PDF_COLOURS.accent
          : PDF_COLOURS.muted

        return (
          <G key={dim._key}>
            {/* Label — left aligned within its column */}
            <SvgText x={0} y={textY} textAnchor="start" style={{ fontSize: 10, fontFamily: "Inter", fontWeight: labelWeight, fill: labelColour }}>
              {dim.label}
            </SvgText>

            {/* Track background — rounded rectangle */}
            <Rect
              x={trackLeft}
              y={barY}
              width={trackWidth}
              height={BAR_HEIGHT}
              rx={TRACK_RADIUS}
              ry={TRACK_RADIUS}
              fill={PDF_COLOURS.border}
            />

            {/* Fill — only if score > 0; rounded only if it extends far enough */}
            {fillWidth > 0 && (
              <Rect
                x={trackLeft}
                y={barY}
                width={fillWidth}
                height={BAR_HEIGHT}
                rx={TRACK_RADIUS}
                ry={TRACK_RADIUS}
                fill={fillColour}
              />
            )}

            {/* Score value — right aligned */}
            <SvgText x={width} y={textY} textAnchor="end" style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 400, fill: PDF_COLOURS.ink }}>
              {score.toFixed(1)}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}
