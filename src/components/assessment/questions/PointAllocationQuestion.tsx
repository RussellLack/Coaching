'use client'

import { useMemo } from 'react'
import type {
  PointAllocationAnswer,
  PointAllocationFactor,
  PointAllocationQuestion,
} from '@/types/assessment'

/**
 * PointAllocationQuestionRenderer — N points across M factors.
 *
 * Used for Assessment 6's three rounds (past / present / future) where
 * the user distributes 11 points across five success factors.
 *
 * UX model: steppers (+/− buttons) per factor, plus a "points remaining"
 * indicator. Mobile-friendly (no precision touch needed); immediate
 * feedback (the counter updates as the user clicks); mechanically
 * enforces the sum constraint (can't click + when remaining == 0).
 *
 * The factors are declared at the assessment level — not per question —
 * because all three rounds use the same set. The renderer receives them
 * via props from the question dispatcher.
 *
 * Initialisation: all factors start at 0 in the value object. The user
 * has to spend all 11 points before the orchestrator counts this question
 * as answered.
 */

export interface PointAllocationQuestionProps {
  question: PointAllocationQuestion
  questionNumber: number
  value: PointAllocationAnswer | undefined
  onChange: (value: PointAllocationAnswer) => void
  factors: PointAllocationFactor[]
}

export function PointAllocationQuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
  factors,
}: PointAllocationQuestionProps) {
  const allocation = useMemo<PointAllocationAnswer>(() => {
    if (value) return value
    // Initialise every factor at 0 so the answer object always has all keys.
    const init: PointAllocationAnswer = {}
    for (const f of factors) init[f.id] = 0
    return init
  }, [value, factors])

  const totalSpent = Object.values(allocation).reduce(
    (s, n) => s + (typeof n === 'number' ? n : 0),
    0
  )
  const remaining = question.totalPoints - totalSpent

  function setFactor(factorId: string, next: number) {
    if (next < 0) return
    if (next > question.totalPoints) return
    const newAllocation: PointAllocationAnswer = {
      ...allocation,
      [factorId]: next,
    }
    const newTotal = Object.values(newAllocation).reduce(
      (s, n) => s + (typeof n === 'number' ? n : 0),
      0
    )
    if (newTotal > question.totalPoints) return // can't overspend
    onChange(newAllocation)
  }

  return (
    <fieldset className="space-y-5">
      <legend className="space-y-2">
        <span className="block text-xs uppercase tracking-[0.12em] text-cream-dim sans">
          <span className="mr-2">{questionNumber}.</span>
          Round: {question.roundLabel}
        </span>
        {question.prompt && question.prompt.length > 0 && (
          <PromptCopy blocks={question.prompt} />
        )}
        <span className="block text-sm text-cream-muted sans">
          Distribute {question.totalPoints} points across the factors below
          based on what success means to you in this round. Whole numbers
          only. The total must add up to exactly {question.totalPoints} —
          which means the weights have to be uneven.
        </span>
      </legend>

      {/* Points remaining indicator */}
      <div
        className={[
          'flex items-baseline justify-between rounded-sm border px-4 py-3 sans',
          remaining === 0
            ? 'border-coral/40 bg-coral/10'
            : 'border-teal-mid bg-teal-mid/30',
        ].join(' ')}
        aria-live="polite"
      >
        <span className="text-sm text-cream-muted">Points remaining</span>
        <span
          className={[
            'font-mono text-lg tabular-nums',
            remaining === 0 ? 'text-coral font-medium' : 'text-cream',
          ].join(' ')}
        >
          {remaining}
        </span>
      </div>

      {/* Factor rows */}
      <div className="space-y-2.5">
        {factors.map((factor) => {
          const current = allocation[factor.id] ?? 0
          const canIncrement = remaining > 0
          const canDecrement = current > 0
          return (
            <div
              key={factor._key}
              className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-sm border border-teal-mid bg-teal-mid/20 px-4 py-3"
            >
              <div>
                <span className="block text-base text-cream font-serif">
                  {factor.label}
                </span>
                {factor.description && (
                  <span className="mt-0.5 block text-xs text-cream-dim sans">
                    {factor.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFactor(factor.id, current - 1)}
                  disabled={!canDecrement}
                  aria-label={`Decrease ${factor.label}`}
                  className="sans flex h-9 w-9 items-center justify-center rounded-sm border border-teal-mid text-cream transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-teal-mid disabled:hover:text-cream"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <span
                  className="w-8 text-center font-mono text-base text-cream tabular-nums"
                  aria-label={`${factor.label}: ${current} points`}
                >
                  {current}
                </span>
                <button
                  type="button"
                  onClick={() => setFactor(factor.id, current + 1)}
                  disabled={!canIncrement}
                  aria-label={`Increase ${factor.label}`}
                  className="sans flex h-9 w-9 items-center justify-center rounded-sm border border-teal-mid text-cream transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-teal-mid disabled:hover:text-cream"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

// ── Sub-component: render Portable Text prompt ─────────────────────────

interface PromptBlock {
  _type: 'block'
  _key?: string
  children?: { _type: 'span'; text: string }[]
}

function PromptCopy({ blocks }: { blocks: unknown[] }) {
  const text = blocks
    .filter((b): b is PromptBlock => {
      return (
        typeof b === 'object' &&
        b !== null &&
        (b as PromptBlock)._type === 'block'
      )
    })
    .map((b) =>
      (b.children ?? [])
        .map((c) => c.text)
        .join('')
        .trim()
    )
    .filter(Boolean)
  if (text.length === 0) return null
  return (
    <span className="block space-y-2">
      {text.map((para, i) => (
        <span
          key={i}
          className="block text-base leading-relaxed text-cream font-serif"
        >
          {para}
        </span>
      ))}
    </span>
  )
}
