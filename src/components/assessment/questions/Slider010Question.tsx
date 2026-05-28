'use client'

import type { Slider010Question } from '@/types/assessment'

/**
 * Slider010QuestionRenderer — 0–10 slider with anchor labels.
 *
 * UX notes:
 *   - Uses native <input type="range">. Best touch behaviour, best a11y.
 *   - Defaults to 5 when unanswered. This means "no answer" can't be
 *     distinguished from a deliberate 5 — acceptable here because the
 *     spec says "rate yourself right now", a 5 is a real answer, and
 *     the completion check requires the user to touch the slider.
 *   - To distinguish, we track whether the slider has been *interacted with*
 *     via a separate state surfaced through the value prop. If undefined,
 *     show no thumb fill / muted styling; once changed, light up.
 *   - Anchors are explicit labels at each end. The midpoint isn't labelled —
 *     deliberate, because midpoints in 0–10 sliders are usually misread
 *     as "average" rather than "in the middle of the spectrum".
 */

export interface Slider010QuestionProps {
  question: Slider010Question
  questionNumber: number
  value: number | undefined
  onChange: (value: number) => void
}

export function Slider010QuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
}: Slider010QuestionProps) {
  // For the visual display, fall back to 5 (centred) but flag uninteracted.
  const displayValue = value ?? 5
  const hasAnswered = value !== undefined

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg leading-snug text-cream font-serif">
        <span className="mr-2 text-cream-dim">{questionNumber}.</span>
        {question.prompt}
      </legend>

      <div className="space-y-2">
        {/* The slider itself */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={displayValue}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={question.prompt}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={hasAnswered ? value : undefined}
            className={[
              'fab-slider w-full',
              hasAnswered ? 'fab-slider--answered' : 'fab-slider--unanswered',
            ].join(' ')}
          />

          {/* Tick marks underneath (purely decorative) */}
          <div
            className="mt-1 flex justify-between px-[2px] text-[10px] text-cream-dim sans"
            aria-hidden="true"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <span
                key={i}
                className={[
                  'tabular-nums transition',
                  hasAnswered && i === value ? 'text-coral font-medium' : '',
                ].join(' ')}
              >
                {i}
              </span>
            ))}
          </div>
        </div>

        {/* Anchor labels at each end */}
        <div className="flex items-start justify-between gap-4 text-xs text-cream-muted sans">
          <span className="max-w-[45%] text-left">
            <span className="font-mono text-cream-dim">0</span>{' '}
            {question.anchorLow}
          </span>
          <span className="max-w-[45%] text-right">
            {question.anchorHigh}{' '}
            <span className="font-mono text-cream-dim">10</span>
          </span>
        </div>
      </div>
    </fieldset>
  )
}
