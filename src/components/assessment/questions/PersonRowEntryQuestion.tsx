'use client'

import { useState } from 'react'
import type {
  PersonRow,
  PersonRowEntryAnswer,
  PersonRowEntryQuestion,
} from '@/types/assessment'

/**
 * PersonRowEntryQuestionRenderer — the Support Matrix dynamic form.
 *
 * Renders:
 *   1. A "name the change" free-text field at the top
 *   2. A privacy note
 *   3. A list of person rows, each with: initials, influence slider,
 *      support slider, stance picker. Plus a remove button.
 *   4. An "Add row" button (until maxRows is reached)
 *
 * State is maintained internally and surfaced upward via onChange whenever
 * the user types or moves a slider, so the orchestrator's completion logic
 * (require minRows filled) stays in sync.
 *
 * Privacy: full names entered here stay client-side until submission. The
 * server-side payload builder truncates to initials before forwarding to
 * the CRM/email layer.
 */

export interface PersonRowEntryQuestionProps {
  question: PersonRowEntryQuestion
  questionNumber: number
  value: PersonRowEntryAnswer | undefined
  onChange: (value: PersonRowEntryAnswer) => void
}

function emptyRow(): PersonRow {
  return {
    _key: `r-${Math.random().toString(36).slice(2, 10)}`,
    initials: '',
    influence: 5,
    support: 5,
    stanceId: undefined,
  }
}

function initialAnswer(minRows: number): PersonRowEntryAnswer {
  return {
    changeDescription: '',
    rows: Array.from({ length: minRows }, () => emptyRow()),
  }
}

export function PersonRowEntryQuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
}: PersonRowEntryQuestionProps) {
  const [internal, setInternal] = useState<PersonRowEntryAnswer>(
    value ?? initialAnswer(question.minRows)
  )

  function update(next: PersonRowEntryAnswer) {
    setInternal(next)
    onChange(next)
  }

  function updateChange(text: string) {
    update({ ...internal, changeDescription: text })
  }

  function updateRow(idx: number, patch: Partial<PersonRow>) {
    const rows = internal.rows.map((r, i) =>
      i === idx ? { ...r, ...patch } : r
    )
    update({ ...internal, rows })
  }

  function addRow() {
    if (internal.rows.length >= question.maxRows) return
    update({ ...internal, rows: [...internal.rows, emptyRow()] })
  }

  function removeRow(idx: number) {
    if (internal.rows.length <= question.minRows) return
    update({
      ...internal,
      rows: internal.rows.filter((_, i) => i !== idx),
    })
  }

  const canAdd = internal.rows.length < question.maxRows
  const canRemove = internal.rows.length > question.minRows
  const filledCount = internal.rows.filter(
    (r) => r.initials.trim().length > 0
  ).length

  return (
    <fieldset className="space-y-8">
      <legend className="sr-only">
        Question {questionNumber}: stakeholder mapping
      </legend>

      {/* Change description */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-lg leading-snug text-cream font-serif">
            <span className="mr-2 text-cream-dim">{questionNumber}.</span>
            {question.changePromptLabel}
          </span>
          {question.changePromptHelp && (
            <span className="mt-2 block text-sm text-cream-muted sans">
              {question.changePromptHelp}
            </span>
          )}
        </label>
        <textarea
          value={internal.changeDescription}
          onChange={(e) => updateChange(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="One sentence..."
          className="sans w-full rounded-sm border border-teal-mid bg-transparent px-4 py-3 text-base text-cream placeholder:text-cream-dim focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
        {question.changePromptExamples &&
          question.changePromptExamples.length > 0 && (
            <p className="text-xs text-cream-dim sans">
              <span className="font-medium">Examples: </span>
              {question.changePromptExamples
                .map((ex) => `"${ex}"`)
                .join(' / ')}
            </p>
          )}
      </div>

      {/* Privacy note */}
      <div className="rounded-sm border-l-2 border-cream-dim bg-teal-mid/30 px-4 py-3 text-xs text-cream-muted sans">
        Privacy: names entered here stay in your browser. Only initials are
        sent to the server when you submit your email. You can use first names,
        last names, or initials — whatever is most useful for you to see on
        your map.
      </div>

      {/* The rows */}
      <div className="space-y-6">
        {internal.rows.map((r, i) => (
          <div
            key={r._key}
            className="space-y-4 rounded-sm border border-teal-mid bg-teal-mid/20 p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <label className="flex-1">
                <span className="block text-sm text-cream-muted sans">
                  Person {i + 1}
                </span>
                <input
                  type="text"
                  value={r.initials}
                  onChange={(e) =>
                    updateRow(i, { initials: e.target.value })
                  }
                  placeholder="Name or initials"
                  maxLength={40}
                  className="sans mt-1 w-full rounded-sm border border-teal-mid bg-transparent px-3 py-2 text-base text-cream placeholder:text-cream-dim focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                />
              </label>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="sans mt-6 shrink-0 text-xs text-cream-dim hover:text-coral"
                  aria-label={`Remove person ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Influence slider */}
            <SliderRow
              label="Influence"
              hint="how much they shape whether this happens"
              anchorLow={question.influenceAnchorLow}
              anchorHigh={question.influenceAnchorHigh}
              value={r.influence}
              onChange={(v) => updateRow(i, { influence: v })}
            />

            {/* Support slider */}
            <SliderRow
              label="Support"
              hint="how supportive — actually, behaviourally"
              anchorLow={question.supportAnchorLow}
              anchorHigh={question.supportAnchorHigh}
              value={r.support}
              onChange={(v) => updateRow(i, { support: v })}
            />

            {/* Stance picker */}
            {question.stanceOptions && question.stanceOptions.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-cream-muted sans">
                  Their stance
                </p>
                <div className="flex flex-wrap gap-2">
                  {question.stanceOptions.map((opt) => {
                    const isSelected = r.stanceId === opt.id
                    return (
                      <button
                        key={opt._key}
                        type="button"
                        onClick={() => updateRow(i, { stanceId: opt.id })}
                        className={[
                          'sans rounded-sm border px-3 py-1.5 text-xs transition',
                          isSelected
                            ? 'border-coral bg-teal-mid text-cream font-medium'
                            : 'border-teal-mid bg-transparent text-cream-muted hover:border-teal-light hover:text-cream',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canAdd ? (
          <button
            type="button"
            onClick={addRow}
            className="sans inline-flex items-center gap-2 text-sm text-cream hover:text-coral"
          >
            <span aria-hidden="true">＋</span> Add another person
          </button>
        ) : (
          <span className="text-xs text-cream-dim sans">
            Maximum {question.maxRows} people.
          </span>
        )}
        <span className="text-xs text-cream-dim sans" aria-live="polite">
          {filledCount} of {question.minRows} required filled
        </span>
      </div>
    </fieldset>
  )
}

// ── Sub-component: one labelled slider row ─────────────────────────────

interface SliderRowProps {
  label: string
  hint: string
  anchorLow: string
  anchorHigh: string
  value: number
  onChange: (v: number) => void
}

function SliderRow({
  label,
  hint,
  anchorLow,
  anchorHigh,
  value,
  onChange,
}: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs sans">
        <span className="text-cream-muted">
          <span className="font-medium text-cream">{label}</span>
          <span className="ml-2 text-cream-dim">— {hint}</span>
        </span>
        <span className="font-mono text-cream tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label}: ${value} out of 10`}
        className="fab-slider fab-slider--answered w-full"
      />
      <div className="flex items-start justify-between gap-4 text-[11px] text-cream-dim sans">
        <span className="max-w-[45%] text-left">{anchorLow}</span>
        <span className="max-w-[45%] text-right">{anchorHigh}</span>
      </div>
    </div>
  )
}
