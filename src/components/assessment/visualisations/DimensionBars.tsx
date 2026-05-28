import type { Dimension } from '@/types/assessment'

export interface DimensionBarsProps {
  dimensions: Dimension[]
  scores: Record<string, number>
  maxValue: number
  highlightedDimensionId?: string
}

export function DimensionBars({
  dimensions,
  scores,
  maxValue,
  highlightedDimensionId,
}: DimensionBarsProps) {
  return (
    <div className="space-y-3">
      {dimensions.map((dim) => {
        const score = scores[dim.id] ?? 0
        const pct = Math.max(0, Math.min(100, (score / maxValue) * 100))
        const isHighlighted = dim.id === highlightedDimensionId
        return (
          <div
            key={dim._key}
            className="grid grid-cols-[minmax(8rem,1fr)_3fr_auto] items-center gap-3"
          >
            <div
              className={[
                'text-sm leading-tight sans',
                isHighlighted ? 'text-coral font-medium' : 'text-cream-muted',
              ].join(' ')}
            >
              {dim.label}
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-teal/60"
              aria-hidden="true"
            >
              <div
                className={[
                  'h-full transition-all',
                  isHighlighted ? 'bg-coral' : 'bg-cream-muted',
                ].join(' ')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className="font-mono text-sm tabular-nums text-cream"
              aria-label={`${dim.label}: ${score} out of ${maxValue}`}
            >
              {score.toFixed(1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
