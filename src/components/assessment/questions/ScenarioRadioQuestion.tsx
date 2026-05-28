'use client'

import type { ScenarioRadioQuestion } from '@/types/assessment'

/**
 * ScenarioRadioQuestionRenderer — scenario + 4 monologue options.
 *
 * The scenario is the contextual frame; the prompt is the situation
 * description; the four options are the user's possible internal
 * monologues. The user picks the one closest to what their head
 * actually does.
 *
 * UX notes:
 *   - The four options are full-width tappable buttons rather than
 *     traditional radio inputs. Touch-friendly, easier to scan.
 *   - The selected option gets the coral accent treatment, matching
 *     the design language already in use elsewhere.
 *   - The tag this option counts toward is INTENTIONALLY HIDDEN from
 *     the user. Seeing "[Catastrophising]" next to each option would
 *     turn this from a diagnostic into a self-test, and that breaks
 *     the assessment. The tag is only metadata for the scoring engine.
 *   - Option order is preserved as authored. We don't shuffle — the
 *     pattern (a/b/c/d → distortion/distortion/healthy/distortion or
 *     similar) is consistent across scenarios by design, and shuffling
 *     would make response times noisier without meaningfully reducing
 *     bias (the user can't see the tags anyway).
 */

export interface ScenarioRadioQuestionProps {
  question: ScenarioRadioQuestion
  questionNumber: number
  value: string | undefined // _key of the selected option
  onChange: (value: string) => void
}

export function ScenarioRadioQuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
}: ScenarioRadioQuestionProps) {
  return (
    <fieldset className="space-y-5">
      <legend className="space-y-2">
        {question.scenarioTitle && (
          <span className="block text-xs uppercase tracking-[0.12em] text-cream-dim sans">
            <span className="mr-2">{questionNumber}.</span>
            {question.scenarioTitle}
          </span>
        )}
        <span className="block text-lg leading-snug text-cream font-serif">
          {question.prompt}
        </span>
        <span className="block text-xs italic text-cream-muted sans">
          What does your head do?
        </span>
      </legend>

      <div className="space-y-2.5" role="radiogroup">
        {question.options.map((opt, idx) => {
          const isSelected = value === opt._key
          // Letter prefix (a, b, c, d) — purely cosmetic
          const letter = String.fromCharCode(97 + idx)
          return (
            <button
              key={opt._key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt._key)}
              className={[
                'sans block w-full rounded-sm border px-4 py-3 text-left text-base leading-snug transition',
                isSelected
                  ? 'border-coral bg-teal-mid text-cream'
                  : 'border-teal-mid bg-transparent text-cream-muted hover:border-teal-light hover:text-cream',
              ].join(' ')}
            >
              <span
                className={[
                  'mr-3 inline-block font-mono text-xs',
                  isSelected ? 'text-coral' : 'text-cream-dim',
                ].join(' ')}
                aria-hidden="true"
              >
                {letter}
              </span>
              <span className="italic">&ldquo;{opt.label}&rdquo;</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
