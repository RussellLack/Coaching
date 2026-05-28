/**
 * PDF TimeShiftLines — multi-line chart for Assessment 6.
 *
 * Renders one line per success factor across three time-points (past /
 * present / future). Rising factor: solid highlight stroke, slightly
 * thicker. Falling factor: dashed highlight stroke (so they're
 * distinguishable on the same chart). Other factors: dim, low-opacity.
 * Labels sit at the right edge in matching colour.
 *
 * Ported from the web TimeShiftLines component — same maths, adapted
 * to @react-pdf/renderer's SVG primitives.
 */

import { Svg, Polyline, Circle, Line, G, Text as SvgText } from '@react-pdf/renderer'
import type { FactorScores } from '@/lib/assessment/scoring/time-shift-points'
import { PDF_COLOURS } from '../colours'

export interface PdfTimeShiftLinesProps {
  factors: FactorScores[]
  risingFactorId: string
  fallingFactorId: string
  totalPoints?: number
  width?: number
  height?: number
}

// Layout constants — wider than the web version because PDF page width
// is typically more generous than the web content column.
const PADDING = { top: 18, right: 110, bottom: 36, left: 30 }

export function PdfTimeShiftLines({
  factors,
  risingFactorId,
  fallingFactorId,
  totalPoints = 11,
  width = 540,
  height = 320,
}: PdfTimeShiftLinesProps) {
  if (factors.length === 0) return null

  const plotWidth = width - PADDING.left - PADDING.right
  const plotHeight = height - PADDING.top - PADDING.bottom

  // X coordinates for past, present, future
  const xPast = PADDING.left
  const xPresent = PADDING.left + plotWidth / 2
  const xFuture = PADDING.left + plotWidth

  function toY(score: number): number {
    return PADDING.top + plotHeight - (score / totalPoints) * plotHeight
  }

  // Gridlines at every 2 points
  const gridlines: number[] = []
  for (let v = 0; v <= totalPoints; v += 2) gridlines.push(v)

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {/* Gridlines */}
      {gridlines.map((v) => (
        <Line
          key={`grid-${v}`}
          x1={PADDING.left}
          y1={toY(v)}
          x2={PADDING.left + plotWidth}
          y2={toY(v)}
          stroke={PDF_COLOURS.border}
          strokeWidth={0.5}
          opacity={0.7}
        />
      ))}

      {/* Y-axis tick labels at extremes */}
      <SvgText
        x={PADDING.left - 6}
        y={toY(0) + 3}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="end"
      >
        0
      </SvgText>
      <SvgText
        x={PADDING.left - 6}
        y={toY(totalPoints) + 3}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="end"
      >
        {totalPoints}
      </SvgText>

      {/* X-axis labels */}
      <SvgText
        x={xPast}
        y={height - 10}
        fontSize={9}
        fontFamily="Inter"
        fill={PDF_COLOURS.muted}
        textAnchor="middle"
      >
        THEN
      </SvgText>
      <SvgText
        x={xPresent}
        y={height - 10}
        fontSize={9}
        fontFamily="Inter"
        fill={PDF_COLOURS.muted}
        textAnchor="middle"
      >
        NOW
      </SvgText>
      <SvgText
        x={xFuture}
        y={height - 10}
        fontSize={9}
        fontFamily="Inter"
        fill={PDF_COLOURS.muted}
        textAnchor="middle"
      >
        THEN AGAIN
      </SvgText>

      {/* Lines + dots + right-edge labels for each factor */}
      {factors.map((f) => {
        const isRising = f.id === risingFactorId
        const isFalling = f.id === fallingFactorId
        const isHighlighted = isRising || isFalling

        const stroke = isHighlighted ? PDF_COLOURS.highlight : PDF_COLOURS.dim
        const strokeWidth = isHighlighted ? 2 : 1
        const opacity = isHighlighted ? 1 : 0.55
        // Dashed for falling so it's distinguishable from rising on the
        // same chart even when both are highlighted.
        const dasharray = isFalling ? '4 3' : undefined

        const yPast = toY(f.past)
        const yPresent = toY(f.present)
        const yFuture = toY(f.future)
        const points = `${xPast},${yPast.toFixed(2)} ${xPresent},${yPresent.toFixed(2)} ${xFuture},${yFuture.toFixed(2)}`

        return (
          <Polyline
            key={`line-${f.id}`}
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={dasharray}
          />
        )
      })}

      {/* Dots — render after lines so they sit on top */}
      {factors.map((f) => {
        const isHighlighted =
          f.id === risingFactorId || f.id === fallingFactorId
        const colour = isHighlighted ? PDF_COLOURS.highlight : PDF_COLOURS.dim
        const opacity = isHighlighted ? 1 : 0.55
        const r = isHighlighted ? 3 : 2.2

        return (
          <G key={`dots-${f.id}`}>
            <Circle cx={xPast} cy={toY(f.past)} r={r} fill={colour} opacity={opacity} />
            <Circle cx={xPresent} cy={toY(f.present)} r={r} fill={colour} opacity={opacity} />
            <Circle cx={xFuture} cy={toY(f.future)} r={r} fill={colour} opacity={opacity} />
          </G>
        )
      })}

      {/* Right-edge labels */}
      {factors.map((f) => {
        const isHighlighted =
          f.id === risingFactorId || f.id === fallingFactorId
        return (
          <SvgText
            key={`lbl-${f.id}`}
            x={xFuture + 8}
            y={toY(f.future) + 3}
            fontSize={9}
            fontFamily="Inter"
            fontWeight={isHighlighted ? 600 : 400}
            fill={isHighlighted ? PDF_COLOURS.highlight : PDF_COLOURS.muted}
            opacity={isHighlighted ? 1 : 0.75}
            textAnchor="start"
          >
            {f.label}
          </SvgText>
        )
      })}
    </Svg>
  )
}
