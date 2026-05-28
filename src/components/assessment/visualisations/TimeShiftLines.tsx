import type { FactorScores } from '@/lib/assessment/scoring/time-shift-points'

/**
 * TimeShiftLines — multi-line chart for Assessment 6.
 *
 * Renders one line per success factor across three time-points
 * (past / present / future), with rising and falling factors highlighted
 * in coral, others in cream-dim. Factor labels sit at the right edge of
 * each line.
 *
 * Layout intent:
 *   - X axis: three discrete points (past, present, future)
 *   - Y axis: 0 to totalPoints (default 11), with light gridlines at
 *     intervals so the user can read the values
 *   - Rising factor: coral, full opacity, slightly thicker stroke
 *   - Falling factor: coral, full opacity, dashed (so they're visually
 *     distinguishable from each other on the same chart)
 *   - Other factors: cream-dim at 50% opacity
 *
 * The chart is the result — make it prominent. Labels and counts are
 * read off the lines themselves.
 */

export interface TimeShiftLinesProps {
  factors: FactorScores[]
  risingFactorId: string
  fallingFactorId: string
  totalPoints?: number // default 11
}

// Layout constants — chosen to fit the typical fab.partners content column
const WIDTH = 600
const HEIGHT = 360
const PADDING = { top: 20, right: 110, bottom: 40, left: 36 }

export function TimeShiftLines({
  factors,
  risingFactorId,
  fallingFactorId,
  totalPoints = 11,
}: TimeShiftLinesProps) {
  if (factors.length === 0) return null

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  // X coordinates for past, present, future
  const xPast = PADDING.left
  const xPresent = PADDING.left + plotWidth / 2
  const xFuture = PADDING.left + plotWidth
  const xPoints = [xPast, xPresent, xFuture]

  function toY(score: number): number {
    return (
      PADDING.top + plotHeight - (score / totalPoints) * plotHeight
    )
  }

  // Gridlines at every 2 points (0, 2, 4, ..., 10) — enough to read, not so
  // many that the chart gets noisy
  const gridlines: number[] = []
  for (let v = 0; v <= totalPoints; v += 2) gridlines.push(v)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto block w-full max-w-[640px]"
      role="img"
      aria-label="The shape of your success — factor weights across past, present, and future"
    >
      {/* Gridlines */}
      {gridlines.map((v) => (
        <line
          key={`grid-${v}`}
          x1={PADDING.left}
          y1={toY(v)}
          x2={PADDING.left + plotWidth}
          y2={toY(v)}
          stroke="var(--color-teal-mid)"
          strokeWidth={1}
          opacity={0.4}
        />
      ))}

      {/* Y-axis tick labels (only at the extremes — keeps the chart calm) */}
      <text
        x={PADDING.left - 8}
        y={toY(0) + 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
      >
        0
      </text>
      <text
        x={PADDING.left - 8}
        y={toY(totalPoints) + 4}
        textAnchor="end"
        fontSize="10"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
      >
        {totalPoints}
      </text>

      {/* X-axis labels */}
      <text
        x={xPast}
        y={HEIGHT - 12}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-muted)"
        letterSpacing="0.08em"
        style={{ textTransform: 'uppercase' }}
      >
        Then
      </text>
      <text
        x={xPresent}
        y={HEIGHT - 12}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-muted)"
        letterSpacing="0.08em"
        style={{ textTransform: 'uppercase' }}
      >
        Now
      </text>
      <text
        x={xFuture}
        y={HEIGHT - 12}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-muted)"
        letterSpacing="0.08em"
        style={{ textTransform: 'uppercase' }}
      >
        Then again
      </text>

      {/* Lines for each factor */}
      {factors.map((f) => {
        const isRising = f.id === risingFactorId
        const isFalling = f.id === fallingFactorId
        const isHighlighted = isRising || isFalling
        const stroke = isHighlighted
          ? 'var(--color-coral)'
          : 'var(--color-cream-dim)'
        const strokeWidth = isHighlighted ? 2.5 : 1.5
        const opacity = isHighlighted ? 1 : 0.5
        const dasharray = isFalling ? '5 4' : undefined

        // Build the polyline points
        const yPast = toY(f.past)
        const yPresent = toY(f.present)
        const yFuture = toY(f.future)
        const points = `${xPast},${yPast} ${xPresent},${yPresent} ${xFuture},${yFuture}`

        // Dot at each time-point for tactile feedback
        return (
          <g key={f.id}>
            <polyline
              points={points}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              strokeDasharray={dasharray}
            />
            {[
              { x: xPast, y: yPast },
              { x: xPresent, y: yPresent },
              { x: xFuture, y: yFuture },
            ].map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isHighlighted ? 4 : 3}
                fill={stroke}
                opacity={opacity}
              />
            ))}
            {/* Label at the right edge */}
            <text
              x={xFuture + 10}
              y={yFuture + 4}
              fontSize="11"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill={isHighlighted ? 'var(--color-coral)' : 'var(--color-cream-muted)'}
              opacity={isHighlighted ? 1 : 0.7}
              fontWeight={isHighlighted ? 500 : 400}
            >
              {f.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
