'use client'

import type { CalibrationQuestion } from '@/types/assessment'

/**
 * CalibrationQuestionRenderer — single-select with config-driven options.
 *
 * Used for Assessment 3's three AI-use questions (Part Two). Each
 * calibration question has 2-4 options, each with a numeric score that
 * the scoring strategy reads to build the AI band.
 *
 * Structurally similar to ScenarioRadio but:
 *   - No scenario title (the calibration questions don't have one)
 *   - Shows the score on the option label is OFF — scores stay hidden
 *     to avoid users gaming the assessment
 *   - Simpler layout — these questions are short and the answers are
 *     short. No need for the multi-line monologue treatment.
 */

export interface CalibrationQuestionProps {
  question: CalibrationQuestion
  questionNumber: number
  value: string | undefined // _key of the picked option
  onChange: (value: string) => void
}

export function CalibrationQuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
}: CalibrationQuestionProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="space-y-2">
        <span className="block text-xs uppercase tracking-[0.12em] text-cream-dim sans">
          <span className="mr-2">{questionNumber}.</span>
          Calibration
        </span>
        <span className="block text-base leading-snug text-cream font-serif">
          {question.prompt}
        </span>
      </legend>

      <div className="space-y-2" role="radiogroup">
        {question.options.map((opt) => {
          const isSelected = value === opt._key
          return (
            <button
              key={opt._key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt._key)}
              className={[
                'sans block w-full rounded-sm border px-4 py-2.5 text-left text-sm transition',
                isSelected
                  ? 'border-coral bg-teal-mid text-cream'
                  : 'border-teal-mid bg-transparent text-cream-muted hover:border-teal-light hover:text-cream',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
