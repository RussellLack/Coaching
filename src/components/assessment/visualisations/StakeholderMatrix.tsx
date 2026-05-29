import type { PersonRow, StanceOption } from '@/types/assessment'

/**
 * StakeholderMatrix — 2×2 scatter for Assessment 5.
 *
 * Plots each entered person at coordinates (influence, support), in a
 * Cartesian plane where (0,0) is bottom-left and (10,10) is top-right.
 * The quadrant boundaries are at influence=6 and support=6, matching the
 * scoring strategy's thresholds.
 *
 * Points are coloured by AI stance:
 *   - engaged   → green
 *   - cautious  → cream (neutral, "in motion")
 *   - sceptical → coral (the colour of friction in this design language)
 *   - unknown   → muted teal
 *
 * Labels for each point sit to the right of the dot when there's room,
 * otherwise above. Simple collision avoidance — not perfect but good
 * enough for 6–10 points.
 */

export interface StakeholderMatrixProps {
  rows: PersonRow[]
  stanceOptions?: StanceOption[]
  size?: number
}

const PADDING = 56 // room for axis labels + quadrant labels
const THRESHOLD = 6 // matches HIGH_INFLUENCE/HIGH_SUPPORT in the scorer

interface PlottedRow extends PersonRow {
  x: number
  y: number
  color: string
}

const STANCE_COLOURS: Record<string, string> = {
  engaged: '#5ba87d', // soft green
  cautious: 'var(--color-cream)',
  sceptical: 'var(--color-coral)',
  unknown: 'var(--color-cream-dim)',
}

export function StakeholderMatrix({
  rows,
  stanceOptions,
  size = 400,
}: StakeholderMatrixProps) {
  if (rows.length === 0) return null

  // Plot area is inset by PADDING on all sides.
  const plotMin = PADDING
  const plotMax = size - PADDING
  const plotSize = plotMax - plotMin

  function toX(influence: number): number {
    return plotMin + (influence / 10) * plotSize
  }
  function toY(support: number): number {
    // Y inverts (SVG Y grows downward)
    return plotMax - (support / 10) * plotSize
  }

  const plotted: PlottedRow[] = rows.map((r) => ({
    ...r,
    x: toX(r.influence),
    y: toY(r.support),
    color: r.stanceId
      ? STANCE_COLOURS[r.stanceId] ?? STANCE_COLOURS.unknown
      : STANCE_COLOURS.unknown,
  }))

  // Threshold lines
  const thresholdX = toX(THRESHOLD)
  const thresholdY = toY(THRESHOLD)

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto block w-full max-w-[480px]"
        role="img"
        aria-label="Stakeholder matrix — your people plotted by influence and support"
      >
        {/* Plot background */}
        <rect
          x={plotMin}
          y={plotMin}
          width={plotSize}
          height={plotSize}
          fill="var(--color-teal-mid)"
          fillOpacity={0.2}
          stroke="var(--color-teal-mid)"
          strokeWidth={1}
        />

        {/* Quadrant divider lines */}
        <line
          x1={thresholdX}
          y1={plotMin}
          x2={thresholdX}
          y2={plotMax}
          stroke="var(--color-teal-mid)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <line
          x1={plotMin}
          y1={thresholdY}
          x2={plotMax}
          y2={thresholdY}
          stroke="var(--color-teal-mid)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />

        {/* Quadrant labels (in the corners of each quadrant, faintly) */}
        <QuadrantLabel
          x={plotMin + 8}
          y={plotMin + 16}
          align="start"
          label="Allies"
        />
        <QuadrantLabel
          x={plotMax - 8}
          y={plotMin + 16}
          align="end"
          label="Champions"
        />
        <QuadrantLabel
          x={plotMin + 8}
          y={plotMax - 8}
          align="start"
          label="Background"
        />
        <QuadrantLabel
          x={plotMax - 8}
          y={plotMax - 8}
          align="end"
          label="Resistance"
        />

        {/* Axis labels */}
        <text
          x={size / 2}
          y={size - 14}
          textAnchor="middle"
          fontSize="11"
          fontFamily="'Helvetica Neue', Arial, sans-serif"
          fill="var(--color-cream-muted)"
        >
          Influence →
        </text>
        <text
          x={18}
          y={size / 2}
          textAnchor="middle"
          fontSize="11"
          fontFamily="'Helvetica Neue', Arial, sans-serif"
          fill="var(--color-cream-muted)"
          transform={`rotate(-90, 18, ${size / 2})`}
        >
          Support →
        </text>

        {/* Plotted points */}
        {plotted.map((p) => {
          const labelToRight = p.x < plotMax - 60
          const labelX = labelToRight ? p.x + 10 : p.x - 10
          const labelY = p.y + 4
          const labelAnchor: 'start' | 'end' = labelToRight ? 'start' : 'end'
          return (
            <g key={p._key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill={p.color}
                stroke="var(--color-teal)"
                strokeWidth={1.5}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelAnchor}
                fontSize="11"
                fontFamily="'Helvetica Neue', Arial, sans-serif"
                fill="var(--color-cream)"
                fontWeight={500}
              >
                {truncate(p.initials, 18)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Stance legend (only if stance options exist) */}
      {stanceOptions && stanceOptions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-cream-muted sans">
          {stanceOptions.map((opt) => {
            const colour =
              STANCE_COLOURS[opt.id] ?? STANCE_COLOURS.unknown
            return (
              <span
                key={opt._key}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colour }}
                  aria-hidden="true"
                />
                {opt.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────

function QuadrantLabel({
  x,
  y,
  align,
  label,
}: {
  x: number
  y: number
  align: 'start' | 'end'
  label: string
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={align}
      fontSize="10"
      fontFamily="'Helvetica Neue', Arial, sans-serif"
      fill="var(--color-cream-dim)"
      letterSpacing="0.1em"
      style={{ textTransform: 'uppercase' }}
    >
      {label}
    </text>
  )
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen - 1) + '…'
}
