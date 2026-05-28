/**
 * PDF DistortionHeatmap — horizontal bar chart for Assessment 4.
 *
 * Renders one row per non-healthy tag, sorted by count descending. The
 * top 2 distortions (which match the surfaced interpretations) get the
 * highlight colour; the rest are muted. The healthy tag is excluded from
 * the heatmap entirely — its count is communicated separately in the
 * tier headline.
 *
 * The layout is hand-laid SVG rather than React-PDF's flexbox because
 * we want consistent bar alignment regardless of label length. Each row
 * is a fixed-height band with three columns: label (left), bar (centre),
 * count (right).
 */

import { Svg, Rect, Text as SvgText } from '@react-pdf/renderer'
import { PDF_COLOURS } from '../colours'

export interface PdfDistortionHeatmapProps {
  rankedTags: { id: string; label: string; count: number }[] // already sorted desc, non-healthy
  topTagIds: string[] // the top 2 — get the highlight treatment
  width?: number
}

// Layout constants — tuned for an A4 page width minus the document padding
const LABEL_COL_WIDTH = 110
const COUNT_COL_WIDTH = 30
const BAR_GAP = 12
const ROW_HEIGHT = 22
const BAR_HEIGHT = 14
const TOP_PADDING = 4

export function PdfDistortionHeatmap({
  rankedTags,
  topTagIds,
  width = 480,
}: PdfDistortionHeatmapProps) {
  if (rankedTags.length === 0) return null

  const maxCount = Math.max(1, ...rankedTags.map((t) => t.count))
  const topSet = new Set(topTagIds)

  const totalHeight = TOP_PADDING + rankedTags.length * ROW_HEIGHT
  const barTrackX = LABEL_COL_WIDTH + BAR_GAP
  const barTrackWidth = width - LABEL_COL_WIDTH - COUNT_COL_WIDTH - 2 * BAR_GAP

  return (
    <Svg
      viewBox={`0 0 ${width} ${totalHeight}`}
      width={width}
      height={totalHeight}
    >
      {rankedTags.map((tag, i) => {
        const isTop = topSet.has(tag.id)
        const rowY = TOP_PADDING + i * ROW_HEIGHT
        const barY = rowY + (ROW_HEIGHT - BAR_HEIGHT) / 2
        const barWidth = (tag.count / maxCount) * barTrackWidth

        // Bar fill colour: highlight for top 2, dim for the rest.
        const fillColour = isTop ? PDF_COLOURS.highlight : PDF_COLOURS.dim
        const fillOpacity = isTop ? 0.85 : 0.45

        return (
          <Rect
            key={`bg-${tag.id}`}
            x={barTrackX}
            y={barY}
            width={barTrackWidth}
            height={BAR_HEIGHT}
            fill={PDF_COLOURS.surface}
            stroke={PDF_COLOURS.border}
            strokeWidth={0.5}
          />
        )
      })}
      {rankedTags.map((tag, i) => {
        const isTop = topSet.has(tag.id)
        const rowY = TOP_PADDING + i * ROW_HEIGHT
        const barY = rowY + (ROW_HEIGHT - BAR_HEIGHT) / 2
        const barWidth = (tag.count / maxCount) * barTrackWidth
        // Bar fill colour: highlight for top 2, dim for the rest.
        const fillColour = isTop ? PDF_COLOURS.highlight : PDF_COLOURS.dim
        const fillOpacity = isTop ? 0.85 : 0.45

        return (
          <Rect
            key={`fill-${tag.id}`}
            x={barTrackX}
            y={barY}
            width={tag.count === 0 ? 0 : Math.max(1, barWidth)}
            height={BAR_HEIGHT}
            fill={fillColour}
            opacity={fillOpacity}
          />
        )
      })}

      {/* Labels (left) and counts (right) — rendered last so they layer
          on top of bars in case of overlap. */}
      {rankedTags.map((tag, i) => {
        const isTop = topSet.has(tag.id)
        const rowY = TOP_PADDING + i * ROW_HEIGHT
        const textY = rowY + ROW_HEIGHT / 2 + 3 // baseline-adjust

        return (
          <SvgText
            key={`lbl-${tag.id}`}
            x={LABEL_COL_WIDTH - 4}
            y={textY}
            fontSize={9}
            fontFamily="Inter"
            fontWeight={isTop ? 600 : 400}
            fill={isTop ? PDF_COLOURS.highlight : PDF_COLOURS.bodyText}
            textAnchor="end"
          >
            {tag.label}
          </SvgText>
        )
      })}
      {rankedTags.map((tag, i) => {
        const isTop = topSet.has(tag.id)
        const rowY = TOP_PADDING + i * ROW_HEIGHT
        const textY = rowY + ROW_HEIGHT / 2 + 3

        return (
          <SvgText
            key={`cnt-${tag.id}`}
            x={width - COUNT_COL_WIDTH + 6}
            y={textY}
            fontSize={9}
            fontFamily="Inter"
            fontWeight={isTop ? 600 : 400}
            fill={isTop ? PDF_COLOURS.highlight : PDF_COLOURS.muted}
            textAnchor="start"
          >
            {tag.count}
          </SvgText>
        )
      })}
    </Svg>
  )
}
