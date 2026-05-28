'use client'

import type { Agreement5Question } from '@/types/assessment'

/**
 * Agreement5QuestionRenderer — 1–5 Likert scale.
 *
 * Styling: cards sit on the page's dark-teal background. Unselected
 * cards have a subtle teal-mid surface; selected gets a coral accent
 * border and a slightly lifted background. Cream text throughout.
 */

export interface Agreement5QuestionProps {
  question: Agreement5Question
  questionNumber: number
  value: number | undefined
  onChange: (value: number) => void
}

const LABELS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
] as const

export function Agreement5QuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
}: Agreement5QuestionProps) {
  const groupName = `q-${question._key}`

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg leading-snug text-cream font-serif">
        <span className="mr-2 text-cream-dim">{questionNumber}.</span>
        {question.prompt}
      </legend>

      <div
        role="radiogroup"
        aria-required="true"
        className="grid grid-cols-1 gap-2 sm:grid-cols-5"
      >
        {LABELS.map((opt) => {
          const isSelected = value === opt.value
          return (
            <label
              key={opt.value}
              className={[
                'cursor-pointer rounded-sm border px-3 py-3 text-sm leading-tight transition',
                'flex items-center justify-center text-center sans',
                'sm:flex-col sm:gap-1.5 sm:py-4',
                isSelected
                  ? 'border-coral bg-teal-mid text-cream font-medium'
                  : 'border-teal-mid bg-transparent text-cream-muted hover:border-teal-light hover:text-cream',
              ].join(' ')}
            >
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span className="hidden text-xs text-cream-dim sm:block">
                {opt.value}
              </span>
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
