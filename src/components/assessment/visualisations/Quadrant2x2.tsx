import type { TallyByTagResult } from '@/lib/assessment/scoring/tally-by-tag'

/**
 * Quadrant2x2 — SVG 2×2 grid for Assessment 3 (Decision-Making Style).
 *
 * Plots the user as a star on a continuous 2D plane:
 *   - X axis: Analytical (left) ↔ Intuitive (right)
 *     position = (count_IM + count_IS) / total_picks
 *   - Y axis: Maximiser (top) ↔ Satisficer (bottom)
 *     position = (count_AM + count_IM) / total_picks
 *
 * The four quadrants are labelled with the style names (AM/AS/IM/IS).
 * The dominant quadrant — the one the user falls into — gets the coral
 * fill treatment to reinforce the result. The other three are cream-dim.
 *
 * Design intent: the continuous position matters as much as the quadrant.
 * A user who answered 5 AM and 3 IM is in the AM quadrant but plotted
 * close to the IM border — visually communicating that their style isn't
 * pure. Plain quadrant placement would lose that nuance.
 *
 * Tie cases: when two styles tie for primary, we plot at the boundary
 * between their quadrants. The strategy's tie-break (declaration order)
 * decides which quadrant gets the coral treatment, but the dot's position
 * accurately reflects the underlying answer mix.
 */

export interface Quadrant2x2Props {
  /**
   * Tag counts keyed by style ID. Expects keys "AM", "AS", "IM", "IS".
   * Missing keys are treated as 0.
   */
  counts: Record<string, number>
  /**
   * The dominant style ID, returned by the scoring strategy. Used to
   * highlight the winning quadrant. Always one of "AM", "AS", "IM", "IS"
   * (or an empty string when no picks have been made — defensive only).
   */
  dominantStyle: string
}

// Layout constants — chosen to fit the typical fab.partners content column
const WIDTH = 480
const HEIGHT = 480
const PADDING = { top: 56, right: 32, bottom: 56, left: 56 }

const STYLE_LABELS: Record<string, string> = {
  AM: 'Analytical\nMaximiser',
  AS: 'Analytical\nSatisficer',
  IM: 'Intuitive\nMaximiser',
  IS: 'Intuitive\nSatisficer',
}

export function Quadrant2x2({ counts, dominantStyle }: Quadrant2x2Props) {
  const am = counts.AM ?? 0
  const as_ = counts.AS ?? 0
  const im = counts.IM ?? 0
  const is_ = counts.IS ?? 0
  const total = am + as_ + im + is_

  const gridLeft = PADDING.left
  const gridTop = PADDING.top
  const gridWidth = WIDTH - PADDING.left - PADDING.right
  const gridHeight = HEIGHT - PADDING.top - PADDING.bottom
  const midX = gridLeft + gridWidth / 2
  const midY = gridTop + gridHeight / 2

  // User position. When total == 0 (defensive — shouldn't happen with
  // valid input), place at the centre.
  let userX = midX
  let userY = midY
  if (total > 0) {
    const intuitiveFraction = (im + is_) / total // 0 = pure analytical, 1 = pure intuitive
    const maximiserFraction = (am + im) / total // 0 = pure satisficer, 1 = pure maximiser
    userX = gridLeft + intuitiveFraction * gridWidth
    userY = gridTop + (1 - maximiserFraction) * gridHeight // invert: maximiser is at top
  }

  // Quadrant rectangles, keyed by style id
  const quadrants: { id: string; x: number; y: number; w: number; h: number; cx: number; cy: number }[] = [
    {
      id: 'AM',
      x: gridLeft,
      y: gridTop,
      w: gridWidth / 2,
      h: gridHeight / 2,
      cx: gridLeft + gridWidth / 4,
      cy: gridTop + gridHeight / 4,
    },
    {
      id: 'IM',
      x: midX,
      y: gridTop,
      w: gridWidth / 2,
      h: gridHeight / 2,
      cx: midX + gridWidth / 4,
      cy: gridTop + gridHeight / 4,
    },
    {
      id: 'AS',
      x: gridLeft,
      y: midY,
      w: gridWidth / 2,
      h: gridHeight / 2,
      cx: gridLeft + gridWidth / 4,
      cy: midY + gridHeight / 4,
    },
    {
      id: 'IS',
      x: midX,
      y: midY,
      w: gridWidth / 2,
      h: gridHeight / 2,
      cx: midX + gridWidth / 4,
      cy: midY + gridHeight / 4,
    },
  ]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto block w-full max-w-[520px]"
      role="img"
      aria-label="Your decision-making style placed on a 2×2 of maximiser-satisficer by analytical-intuitive"
    >
      {/* Quadrant fills */}
      {quadrants.map((q) => {
        const isDominant = q.id === dominantStyle
        return (
          <rect
            key={q.id}
            x={q.x}
            y={q.y}
            width={q.w}
            height={q.h}
            fill={isDominant ? 'var(--color-coral)' : 'var(--color-teal-mid)'}
            opacity={isDominant ? 0.18 : 0.35}
            stroke="var(--color-teal-light)"
            strokeWidth={1}
          />
        )
      })}

      {/* Quadrant labels — multi-line text rendered as two tspans */}
      {quadrants.map((q) => {
        const label = STYLE_LABELS[q.id] ?? q.id
        const [line1, line2] = label.split('\n')
        const isDominant = q.id === dominantStyle
        const count = counts[q.id] ?? 0
        return (
          <g key={`label-${q.id}`}>
            <text
              x={q.cx}
              y={q.cy - 14}
              textAnchor="middle"
              fontSize="13"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill={isDominant ? 'var(--color-coral)' : 'var(--color-cream-muted)'}
              fontWeight={isDominant ? 500 : 400}
              letterSpacing="0.02em"
            >
              {line1}
            </text>
            <text
              x={q.cx}
              y={q.cy + 2}
              textAnchor="middle"
              fontSize="13"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill={isDominant ? 'var(--color-coral)' : 'var(--color-cream-muted)'}
              fontWeight={isDominant ? 500 : 400}
              letterSpacing="0.02em"
            >
              {line2}
            </text>
            <text
              x={q.cx}
              y={q.cy + 22}
              textAnchor="middle"
              fontSize="11"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill={isDominant ? 'var(--color-coral)' : 'var(--color-cream-dim)'}
              opacity={isDominant ? 1 : 0.7}
            >
              {count} {count === 1 ? 'pick' : 'picks'}
            </text>
          </g>
        )
      })}

      {/* Axis dividers — horizontal and vertical lines at the midpoint */}
      <line
        x1={midX}
        y1={gridTop}
        x2={midX}
        y2={gridTop + gridHeight}
        stroke="var(--color-teal-light)"
        strokeWidth={1.5}
      />
      <line
        x1={gridLeft}
        y1={midY}
        x2={gridLeft + gridWidth}
        y2={midY}
        stroke="var(--color-teal-light)"
        strokeWidth={1.5}
      />

      {/* Axis labels — outside the grid */}
      <text
        x={gridLeft + gridWidth / 4}
        y={gridTop + gridHeight + 28}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
        letterSpacing="0.12em"
        style={{ textTransform: 'uppercase' }}
      >
        Analytical
      </text>
      <text
        x={midX + gridWidth / 4}
        y={gridTop + gridHeight + 28}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
        letterSpacing="0.12em"
        style={{ textTransform: 'uppercase' }}
      >
        Intuitive
      </text>
      <text
        x={gridLeft - 12}
        y={gridTop + gridHeight / 4 + 4}
        textAnchor="end"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
        letterSpacing="0.12em"
        style={{ textTransform: 'uppercase' }}
      >
        Maximiser
      </text>
      <text
        x={gridLeft - 12}
        y={midY + gridHeight / 4 + 4}
        textAnchor="end"
        fontSize="11"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fill="var(--color-cream-dim)"
        letterSpacing="0.12em"
        style={{ textTransform: 'uppercase' }}
      >
        Satisficer
      </text>

      {/* User position — a star (filled circle with a halo) */}
      {total > 0 && (
        <g>
          <circle
            cx={userX}
            cy={userY}
            r={14}
            fill="var(--color-coral)"
            opacity={0.25}
          />
          <circle
            cx={userX}
            cy={userY}
            r={7}
            fill="var(--color-coral)"
            stroke="var(--color-cream)"
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  )
}
