import type { Dimension } from '@/types/assessment'

/**
 * RadarWheel — polar visualisation for Assessment 2 (Resilience Wheel).
 *
 * Renders an SVG radar/polar chart with N spokes (one per dimension),
 * concentric grid rings at 2/4/6/8/10, and a filled polygon showing
 * the user's scores. Designed to be the result-screen centrepiece,
 * shareable, and reusable inside the PDF.
 *
 * Mathematical layout:
 *   - Origin at centre (cx, cy).
 *   - Spokes evenly spaced around 360°, starting at 12 o'clock.
 *   - Radius for a score s (0–10) = (s/10) * outerRadius.
 *   - Label positions sit slightly beyond each spoke's outer point.
 *
 * Visual emphasis: the two highlighted dimensions (typically the
 * weakest) get coral spoke + label colouring; everything else stays
 * cream/teal-mid. This mirrors how the on-screen result narratively
 * focuses on the two weakest domains.
 */

export interface RadarWheelProps {
  dimensions: Dimension[]
  scores: Record<string, number> // 0–10 per dimension
  highlightedDimensionIds?: string[] // typically the two weakest
  size?: number // SVG viewBox size; defaults to 320
}

export function RadarWheel({
  dimensions,
  scores,
  highlightedDimensionIds = [],
  size = 320,
}: RadarWheelProps) {
  const n = dimensions.length
  if (n === 0) return null

  const cx = size / 2
  const cy = size / 2
  // Leave room around the perimeter for labels.
  const outerRadius = size * 0.34
  const labelRadius = outerRadius + size * 0.11
  const maxValue = 10

  // Pre-compute spoke endpoints and label positions
  const spokes = dimensions.map((dim, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    const score = scores[dim.id] ?? 0
    const scoreRadius = (score / maxValue) * outerRadius
    const isHighlighted = highlightedDimensionIds.includes(dim.id)
    return {
      dim,
      angle,
      score,
      // Tip of the spoke
      tipX: cx + outerRadius * Math.cos(angle),
      tipY: cy + outerRadius * Math.sin(angle),
      // Where the score polygon vertex sits
      scoreX: cx + scoreRadius * Math.cos(angle),
      scoreY: cy + scoreRadius * Math.sin(angle),
      // Label position
      labelX: cx + labelRadius * Math.cos(angle),
      labelY: cy + labelRadius * Math.sin(angle),
      isHighlighted,
    }
  })

  // Polygon path for the score shape
  const polygonPoints = spokes
    .map((s) => `${s.scoreX.toFixed(2)},${s.scoreY.toFixed(2)}`)
    .join(' ')

  // Concentric grid rings (at scores 2, 4, 6, 8, 10)
  const ringValues = [2, 4, 6, 8, 10]

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block w-full max-w-[420px]"
      overflow="visible"        // ← add this line
      role="img"
      aria-label="Resilience wheel — your scores across eight domains"
    >
      {/* Grid: concentric rings */}
      {ringValues.map((v) => {
        const r = (v / maxValue) * outerRadius
        return (
          <circle
            key={`ring-${v}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--color-teal-mid)"
            strokeWidth={v === 10 ? 1 : 0.5}
            opacity={v === 10 ? 0.7 : 0.4}
          />
        )
      })}

      {/* Grid: spoke lines */}
      {spokes.map((s, i) => (
        <line
          key={`spoke-${i}`}
          x1={cx}
          y1={cy}
          x2={s.tipX}
          y2={s.tipY}
          stroke={s.isHighlighted ? 'var(--color-coral)' : 'var(--color-teal-mid)'}
          strokeWidth={s.isHighlighted ? 1 : 0.5}
          opacity={s.isHighlighted ? 0.6 : 0.4}
        />
      ))}

      {/* The score polygon */}
      <polygon
        points={polygonPoints}
        fill="var(--color-coral)"
        fillOpacity={0.15}
        stroke="var(--color-coral)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Score-point dots at each vertex */}
      {spokes.map((s, i) => (
        <circle
          key={`vertex-${i}`}
          cx={s.scoreX}
          cy={s.scoreY}
          r={s.isHighlighted ? 3.5 : 2.5}
          fill={s.isHighlighted ? 'var(--color-coral)' : 'var(--color-cream)'}
          stroke="var(--color-coral)"
          strokeWidth={s.isHighlighted ? 0 : 1}
        />
      ))}

      {/* Labels around the perimeter */}
      {spokes.map((s, i) => {
        // Anchor based on horizontal position
        const cos = Math.cos(s.angle)
        let textAnchor: 'start' | 'middle' | 'end' = 'middle'
        if (cos > 0.3) textAnchor = 'start'
        else if (cos < -0.3) textAnchor = 'end'

        // Slight vertical adjustment for top/bottom positions
        const sin = Math.sin(s.angle)
        const dy = sin < -0.7 ? -2 : sin > 0.7 ? 10 : 4

        return (
          <text
            key={`label-${i}`}
            x={s.labelX}
            y={s.labelY + dy}
            textAnchor={textAnchor}
            fontSize="11"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fill={
              s.isHighlighted ? 'var(--color-coral)' : 'var(--color-cream)'
            }
            fontWeight={s.isHighlighted ? 600 : 400}
          >
            {s.dim.label}
            <tspan
              x={s.labelX}
              dy="13"
              fontSize="10"
              fill="var(--color-cream-dim)"
              fontWeight={400}
            >
              {s.score.toFixed(0)}/{maxValue}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
