/**
 * PDF RadarWheel — port of the web visualisation for Assessment 2.
 *
 * Same mathematical layout as the web RadarWheel: N spokes around 360°,
 * concentric grid rings at 2/4/6/8/10, a filled polygon showing the user's
 * scores. Adapted to @react-pdf/renderer's SVG primitives, which mirror
 * web SVG closely enough that the geometry transfers directly.
 *
 * Key differences from the web component:
 *   - Colours come from the PDF palette (print-safe), not the dark web theme.
 *   - Label positioning is slightly more conservative because PDF text
 *     wrapping is less flexible than CSS — labels are kept short and
 *     positioned so they don't overlap the wheel even at 8 dimensions.
 *   - `fontFamily` is set explicitly because PDF text doesn't inherit
 *     fonts the way HTML does.
 */

import { Svg, Polygon, Polyline, Circle, Line, Text as SvgText } from '@react-pdf/renderer'
import type { Dimension } from '@/types/assessment'
import { PDF_COLOURS } from '../colours'

export interface PdfRadarWheelProps {
  dimensions: Dimension[]
  scores: Record<string, number> // 0–10 per dimension
  highlightedDimensionIds?: string[]
  size?: number
}

export function PdfRadarWheel({
  dimensions,
  scores,
  highlightedDimensionIds = [],
  size = 320,
}: PdfRadarWheelProps) {
  const n = dimensions.length
  if (n === 0) return null

  const cx = size / 2
  const cy = size / 2
  const outerRadius = size * 0.32
  const labelRadius = outerRadius + size * 0.13
  const maxValue = 10

  const spokes = dimensions.map((dim, i) => {
    // Start at 12 o'clock and walk clockwise
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    const score = scores[dim.id] ?? 0
    const scoreRadius = (score / maxValue) * outerRadius
    const isHighlighted = highlightedDimensionIds.includes(dim.id)
    return {
      dim,
      angle,
      score,
      isHighlighted,
      tipX: cx + outerRadius * Math.cos(angle),
      tipY: cy + outerRadius * Math.sin(angle),
      scoreX: cx + scoreRadius * Math.cos(angle),
      scoreY: cy + scoreRadius * Math.sin(angle),
      labelX: cx + labelRadius * Math.cos(angle),
      labelY: cy + labelRadius * Math.sin(angle),
    }
  })

  // Gridline rings at 2, 4, 6, 8 (skip 10 to avoid clashing with outer)
  const gridSteps = [2, 4, 6, 8]

  // Score polygon points string
  const scorePoints = spokes
    .map((s) => `${s.scoreX.toFixed(2)},${s.scoreY.toFixed(2)}`)
    .join(' ')

  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Background grid rings */}
      {gridSteps.map((step) => (
        <Circle
          key={`grid-${step}`}
          cx={cx}
          cy={cy}
          r={(step / maxValue) * outerRadius}
          fill="none"
          stroke={PDF_COLOURS.border}
          strokeWidth={0.5}
        />
      ))}

      {/* Outer ring (10 level) — solid */}
      <Circle
        cx={cx}
        cy={cy}
        r={outerRadius}
        fill="none"
        stroke={PDF_COLOURS.muted}
        strokeWidth={0.8}
      />

      {/* Spokes from centre to outer ring */}
      {spokes.map((s) => (
        <Line
          key={`spoke-${s.dim.id}`}
          x1={cx}
          y1={cy}
          x2={s.tipX}
          y2={s.tipY}
          stroke={PDF_COLOURS.border}
          strokeWidth={0.5}
        />
      ))}

      {/* User's score polygon */}
      <Polygon
        points={scorePoints}
        fill={PDF_COLOURS.accent}
        opacity={0.18}
        stroke={PDF_COLOURS.accent}
        strokeWidth={1.5}
      />

      {/* Dots at each score vertex, with highlight for weakest */}
      {spokes.map((s) => (
        <Circle
          key={`vertex-${s.dim.id}`}
          cx={s.scoreX}
          cy={s.scoreY}
          r={s.isHighlighted ? 4 : 2.5}
          fill={s.isHighlighted ? PDF_COLOURS.highlight : PDF_COLOURS.accent}
        />
      ))}

      {/* Dimension labels */}
      {spokes.map((s) => {
        // Pick text-anchor by horizontal position to prevent label
        // overlap with the wheel.
        const dx = s.labelX - cx
        const anchor = dx < -5 ? 'end' : dx > 5 ? 'start' : 'middle'
        return (
          <SvgText
            key={`label-${s.dim.id}`}
            x={s.labelX}
            y={s.labelY + 3}
            fontSize={9}
            fontFamily="Inter"
            fontWeight={s.isHighlighted ? 600 : 400}
            textAnchor={anchor}
            fill={
              s.isHighlighted ? PDF_COLOURS.highlight : PDF_COLOURS.bodyText
            }
          >
            {s.dim.label}
          </SvgText>
        )
      })}
    </Svg>
  )
}
