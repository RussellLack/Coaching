/**
 * PDF StakeholderMatrix — port of the web 2×2 scatter for Assessment 5.
 *
 * Plots each entered person at (influence, support) coordinates, with
 * dashed quadrant divider lines at the 6/6 threshold that matches the
 * scoring strategy. Points are coloured by AI stance; non-overlapping
 * label placement uses the same horizontal-then-anchor heuristic as the
 * web component.
 *
 * Privacy note: by the time this renderer runs, the payload has already
 * been sanitised — full names have been truncated to initials. This
 * component just plots whatever string is in `row.initials`.
 */

import { Svg, Rect, Line, Circle, Text as SvgText } from '@react-pdf/renderer'
import type { PersonRow, StanceOption } from '@/types/assessment'
import { PDF_COLOURS } from '../colours'

export interface PdfStakeholderMatrixProps {
  rows: PersonRow[]
  stanceOptions?: StanceOption[]
  size?: number
}

const PADDING = 56
const THRESHOLD = 6 // matches HIGH_INFLUENCE/HIGH_SUPPORT in the scorer

// Print-safe stance colours. Engaged is the deep teal accent; cautious is
// neutral cream-tone; sceptical is the brick-red highlight; unknown is
// the desaturated dim grey.
const STANCE_COLOURS: Record<string, string> = {
  engaged: PDF_COLOURS.accent,
  cautious: PDF_COLOURS.faint,
  sceptical: PDF_COLOURS.highlight,
  unknown: PDF_COLOURS.dim,
}

interface Plotted {
  row: PersonRow
  x: number
  y: number
  colour: string
}

export function PdfStakeholderMatrix({
  rows,
  size = 360,
}: PdfStakeholderMatrixProps) {
  if (rows.length === 0) return null

  const plotMin = PADDING
  const plotMax = size - PADDING
  const plotSize = plotMax - plotMin

  const toX = (influence: number) => plotMin + (influence / 10) * plotSize
  const toY = (support: number) => plotMax - (support / 10) * plotSize

  const plotted: Plotted[] = rows.map((r) => ({
    row: r,
    x: toX(r.influence),
    y: toY(r.support),
    colour: r.stanceId
      ? STANCE_COLOURS[r.stanceId] ?? STANCE_COLOURS.unknown
      : STANCE_COLOURS.unknown,
  }))

  const thresholdX = toX(THRESHOLD)
  const thresholdY = toY(THRESHOLD)

  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Plot background */}
      <Rect
        x={plotMin}
        y={plotMin}
        width={plotSize}
        height={plotSize}
        fill={PDF_COLOURS.surface}
        stroke={PDF_COLOURS.border}
        strokeWidth={1}
      />

      {/* Quadrant divider lines — dashed */}
      <Line
        x1={thresholdX}
        y1={plotMin}
        x2={thresholdX}
        y2={plotMax}
        stroke={PDF_COLOURS.border}
        strokeWidth={0.7}
        strokeDasharray="3 3"
      />
      <Line
        x1={plotMin}
        y1={thresholdY}
        x2={plotMax}
        y2={thresholdY}
        stroke={PDF_COLOURS.border}
        strokeWidth={0.7}
        strokeDasharray="3 3"
      />

      {/* Quadrant labels — faint, uppercase, in the corners */}
      <SvgText
        x={plotMin + 6}
        y={plotMin + 14}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="start"
      >
        ALLIES
      </SvgText>
      <SvgText
        x={plotMax - 6}
        y={plotMin + 14}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="end"
      >
        CHAMPIONS
      </SvgText>
      <SvgText
        x={plotMin + 6}
        y={plotMax - 6}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="start"
      >
        BACKGROUND
      </SvgText>
      <SvgText
        x={plotMax - 6}
        y={plotMax - 6}
        fontSize={8}
        fontFamily="Inter"
        fill={PDF_COLOURS.faint}
        textAnchor="end"
      >
        RESISTANCE
      </SvgText>

      {/* Axis labels — note: PDF SVG doesn't support transform=rotate the
          same way as web SVG, so the Y-axis label is omitted from this
          version. The X-axis label (Influence) is enough for readability;
          the quadrant labels carry the bulk of the meaning.

          (Worth flagging in CHANGES.md: web has both axis labels; PDF
          drops the Y-axis label because react-pdf's transform support is
          limited. If we ever need the rotated label, it can be done by
          placing each character in its own <Text> with manual y-offsets.) */}
      <SvgText
        x={size / 2}
        y={size - 14}
        fontSize={9}
        fontFamily="Inter"
        fill={PDF_COLOURS.muted}
        textAnchor="middle"
      >
        Influence →
      </SvgText>

      {/* Plotted points */}
      {plotted.map((p) => {
        const labelToRight = p.x < plotMax - 60
        const labelX = labelToRight ? p.x + 10 : p.x - 10
        const labelY = p.y + 3
        const anchor = labelToRight ? 'start' : 'end'
        return (
          <Circle
            key={`pt-${p.row._key}`}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={p.colour}
            stroke={PDF_COLOURS.accent}
            strokeWidth={1}
          />
        )
      })}
      {/* Labels rendered in a second pass so they layer on top of dots */}
      {plotted.map((p) => {
        const labelToRight = p.x < plotMax - 60
        const labelX = labelToRight ? p.x + 10 : p.x - 10
        const labelY = p.y + 3
        const anchor = labelToRight ? 'start' : 'end'
        return (
          <SvgText
            key={`lbl-${p.row._key}`}
            x={labelX}
            y={labelY}
            fontSize={9}
            fontFamily="Inter"
            fontWeight={500}
            fill={PDF_COLOURS.ink}
            textAnchor={anchor}
          >
            {truncate(p.row.initials ?? '', 14)}
          </SvgText>
        )
      })}
    </Svg>
  )
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen - 1) + '…'
}
