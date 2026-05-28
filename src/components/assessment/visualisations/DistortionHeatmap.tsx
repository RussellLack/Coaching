import type { TagCategory } from '@/types/assessment'

/**
 * DistortionHeatmap — horizontal bar chart for Assessment 4.
 *
 * Renders one row per non-healthy tag, sorted by count descending.
 * The top 2 distortions (which match the surfaced interpretations)
 * get the coral fill treatment; the rest are cream-muted.
 *
 * Layout intent:
 *   - Bar width = count / max_count_in_set
 *   - Labels live to the left of the bar; counts to the right
 *   - The healthy tag is intentionally excluded — this chart is about
 *     which distortions the user reaches for, not their balance.
 *     Healthy count is communicated separately in the tier headline.
 *
 * This is a flat HTML/CSS chart rather than SVG. Easier to make
 * responsive and accessible; and the chart's job here is comparison
 * not high-fidelity data viz, so HTML bars are the right tool.
 */

export interface DistortionHeatmapProps {
  rankedTags: { id: string; label: string; count: number }[] // already sorted desc
  topTagIds: string[] // the top 2 — get the coral treatment
}

export function DistortionHeatmap({
  rankedTags,
  topTagIds,
}: DistortionHeatmapProps) {
  if (rankedTags.length === 0) return null
  const maxCount = Math.max(1, ...rankedTags.map((t) => t.count))
  const topSet = new Set(topTagIds)

  return (
    <div className="space-y-1.5" role="img" aria-label="Heatmap of cognitive distortions by frequency">
      {rankedTags.map((tag) => {
        const isTop = topSet.has(tag.id)
        const widthPct = (tag.count / maxCount) * 100
        return (
          <div
            key={tag.id}
            className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm"
          >
            <span
              className={[
                'truncate sans',
                isTop ? 'text-coral font-medium' : 'text-cream-muted',
              ].join(' ')}
              title={tag.label}
            >
              {tag.label}
            </span>
            <div
              className="relative h-6 overflow-hidden rounded-sm bg-teal-mid/40"
              aria-hidden="true"
            >
              <div
                className={[
                  'absolute inset-y-0 left-0 transition-all',
                  isTop ? 'bg-coral' : 'bg-cream-dim',
                  isTop ? 'opacity-80' : 'opacity-40',
                ].join(' ')}
                style={{ width: tag.count === 0 ? '0%' : `${widthPct}%` }}
              />
            </div>
            <span
              className={[
                'sans font-mono tabular-nums text-xs',
                isTop ? 'text-coral' : 'text-cream-dim',
              ].join(' ')}
            >
              {tag.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
