/**
 * PDF Quadrant2x2 — port of the web 2×2 grid for Assessment 3.
 *
 * Plots the user as a point on a continuous 2D plane:
 *   - X axis: Analytical (left) ↔ Intuitive (right)
 *   - Y axis: Maximiser (top) ↔ Satisficer (bottom)
 *
 * The four quadrants are labelled with the style names; the dominant
 * quadrant gets the highlight tint; the user dot is a haloed disc at
 * the continuous position computed from the AM/AS/IM/IS counts.
 *
 * Multi-line quadrant labels are rendered as two stacked Text elements
 * since react-pdf's SVG Text doesn't natively wrap.
 */

import { Svg, Rect, Line, Circle, G, Text as SvgText } from '@react-pdf/renderer'
import { PDF_COLOURS } from '../colours'

export interface PdfQuadrant2x2Props {
  counts: Record<string, number>
  dominantStyle: string
  size?: number
}

const STYLE_LABELS: Record<string, { line1: string; line2: string }> = {
  AM: { line1: 'Analytical', line2: 'Maximiser' },
  AS: { line1: 'Analytical', line2: 'Satisficer' },
  IM: { line1: 'Intuitive', line2: 'Maximiser' },
  IS: { line1: 'Intuitive', line2: 'Satisficer' },
}

export function PdfQuadrant2x2({
  counts,
  dominantStyle,
  size = 360,
}: PdfQuadrant2x2Props) {
  const am = counts.AM ?? 0
  const as_ = counts.AS ?? 0
  const im = counts.IM ?? 0
  const is_ = counts.IS ?? 0
  const total = am + as_ + im + is_

  const PADDING = { top: 40, right: 24, bottom: 40, left: 44 }
  const gridLeft = PADDING.left
  const gridTop = PADDING.top
  const gridWidth = size - PADDING.left - PADDING.right
  const gridHeight = size - PADDING.top - PADDING.bottom
  const midX = gridLeft + gridWidth / 2
  const midY = gridTop + gridHeight / 2

  // User dot position. When total == 0, place at the centre (defensive).
  let userX = midX
  let userY = midY
  if (total > 0) {
    const intuitiveFrac = (im + is_) / total
    const maximiserFrac = (am + im) / total
    userX = gridLeft + intuitiveFrac * gridWidth
    userY = gridTop + (1 - maximiserFrac) * gridHeight // invert: maximiser at top
  }

  // Quadrant rectangles
  const quadrants = [
    { id: 'AM', x: gridLeft, y: gridTop, w: gridWidth / 2, h: gridHeight / 2 },
    { id: 'IM', x: midX, y: gridTop, w: gridWidth / 2, h: gridHeight / 2 },
    { id: 'AS', x: gridLeft, y: midY, w: gridWidth / 2, h: gridHeight / 2 },
    { id: 'IS', x: midX, y: midY, w: gridWidth / 2, h: gridHeight / 2 },
  ]

  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Quadrant fills */}
      {quadrants.map((q) => {
        const isDominant = q.id === dominantStyle
        return (
          <Rect
            key={`q-${q.id}`}
            x={q.x}
            y={q.y}
            width={q.w}
            height={q.h}
            fill={isDominant ? PDF_COLOURS.highlight : PDF_COLOURS.surface}
            opacity={isDominant ? 0.14 : 0.5}
            stroke={PDF_COLOURS.border}
            strokeWidth={0.7}
          />
        )
      })}

      {/* Quadrant labels — two lines stacked + count below */}
      {quadrants.map((q) => {
        const isDominant = q.id === dominantStyle
        const labels = STYLE_LABELS[q.id]
        const count = counts[q.id] ?? 0
        const cx = q.x + q.w / 2
        const cy = q.y + q.h / 2
        const colour = isDominant ? PDF_COLOURS.highlight : PDF_COLOURS.muted
        const weight = isDominant ? 600 : 400
        return (
          <G key={`lbl-${q.id}`}>
            <SvgText x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 10, fontFamily: "Inter", fontWeight: weight, fill: colour }}>
              {labels?.line1 ?? q.id}
            </SvgText>
            <SvgText x={cx} y={cy + 3} textAnchor="middle" style={{ fontSize: 10, fontFamily: "Inter", fontWeight: weight, fill: colour }}>
              {labels?.line2 ?? ''}
            </SvgText>
            <SvgText x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: 8, fontFamily: "Inter", fill: isDominant ? PDF_COLOURS.highlight : PDF_COLOURS.faint }}>
              {count} {count === 1 ? 'pick' : 'picks'}
            </SvgText>
          </G>
        )
      })}

      {/* Axis divider lines through the middle */}
      <Line
        x1={midX}
        y1={gridTop}
        x2={midX}
        y2={gridTop + gridHeight}
        stroke={PDF_COLOURS.muted}
        strokeWidth={1}
      />
      <Line
        x1={gridLeft}
        y1={midY}
        x2={gridLeft + gridWidth}
        y2={midY}
        stroke={PDF_COLOURS.muted}
        strokeWidth={1}
      />

      {/* Outer axis labels */}
      <SvgText x={gridLeft + gridWidth / 4} y={gridTop + gridHeight + 22} textAnchor="middle" style={{ fontSize: 9, fontFamily: "Inter", fill: PDF_COLOURS.faint }}>
        ANALYTICAL
      </SvgText>
      <SvgText x={midX + gridWidth / 4} y={gridTop + gridHeight + 22} textAnchor="middle" style={{ fontSize: 9, fontFamily: "Inter", fill: PDF_COLOURS.faint }}>
        INTUITIVE
      </SvgText>
      <SvgText x={gridLeft - 8} y={gridTop + gridHeight / 4 + 3} textAnchor="end" style={{ fontSize: 9, fontFamily: "Inter", fill: PDF_COLOURS.faint }}>
        MAXIMISER
      </SvgText>
      <SvgText x={gridLeft - 8} y={midY + gridHeight / 4 + 3} textAnchor="end" style={{ fontSize: 9, fontFamily: "Inter", fill: PDF_COLOURS.faint }}>
        SATISFICER
      </SvgText>

      {/* User position — halo + dot */}
      {total > 0 && (
        <G>
          <Circle
            cx={userX}
            cy={userY}
            r={12}
            fill={PDF_COLOURS.highlight}
            opacity={0.2}
          />
          <Circle
            cx={userX}
            cy={userY}
            r={5}
            fill={PDF_COLOURS.highlight}
            stroke={PDF_COLOURS.background}
            strokeWidth={1.5}
          />
        </G>
      )}
    </Svg>
  )
}
