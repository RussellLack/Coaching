/**
 * Unit tests for PDF visualisation components.
 *
 * These tests confirm that each component:
 *   1. Renders without throwing for representative input
 *   2. Renders without throwing for edge cases (empty data, missing fields)
 *   3. Returns null when there's no data to plot (so the PDF doesn't show
 *      an empty SVG slot)
 *
 * They do NOT test PDF output — `@react-pdf/renderer.renderToBuffer` is
 * stubbed in this environment. What we're testing is that the component
 * functions don't blow up on the input shapes the scoring strategies
 * actually produce. The geometry maths is too direct to merit testing
 * (every output is a deterministic function of the inputs).
 */

import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { PdfRadarWheel } from './visualisations/RadarWheel'
import { PdfStakeholderMatrix } from './visualisations/StakeholderMatrix'
import { PdfDistortionHeatmap } from './visualisations/DistortionHeatmap'
import { PdfTimeShiftLines } from './visualisations/TimeShiftLines'
import { PdfQuadrant2x2 } from './visualisations/Quadrant2x2'
import { PdfDimensionBars } from './visualisations/DimensionBars'
import type { Dimension, PersonRow } from '@/types/assessment'
import type { FactorScores } from '@/lib/assessment/scoring/time-shift-points'

function isReactElement(v: unknown): v is ReactElement {
  return (
    v !== null &&
    typeof v === 'object' &&
    'type' in (v as object) &&
    'props' in (v as object)
  )
}

// ── PdfRadarWheel ────────────────────────────────────────────────────────

describe('PdfRadarWheel', () => {
  const dimensions: Dimension[] = [
    { _key: 'd1', id: 'physical', label: 'Physical', description: '' },
    { _key: 'd2', id: 'mental', label: 'Mental', description: '' },
    { _key: 'd3', id: 'social', label: 'Social', description: '' },
    { _key: 'd4', id: 'craft', label: 'Craft', description: '' },
  ]

  it('renders for a typical Assessment 2 result', () => {
    const result = PdfRadarWheel({
      dimensions,
      scores: { physical: 7, mental: 5, social: 8, craft: 4 },
      highlightedDimensionIds: ['craft', 'mental'],
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('returns null when no dimensions are supplied', () => {
    const result = PdfRadarWheel({
      dimensions: [],
      scores: {},
    })
    expect(result).toBe(null)
  })

  it('handles missing score keys by treating them as 0', () => {
    // The maths happily multiplies by 0 — just confirm no throw.
    const result = PdfRadarWheel({
      dimensions,
      scores: { physical: 7 }, // mental, social, craft all missing
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders with no highlighted dimensions', () => {
    const result = PdfRadarWheel({
      dimensions,
      scores: { physical: 5, mental: 5, social: 5, craft: 5 },
      highlightedDimensionIds: [],
    })
    expect(isReactElement(result)).toBe(true)
  })
})

// ── PdfStakeholderMatrix ─────────────────────────────────────────────────

describe('PdfStakeholderMatrix', () => {
  const rows: PersonRow[] = [
    {
      _key: 'r1',
      initials: 'AB',
      influence: 8,
      support: 7,
      stanceId: 'engaged',
    },
    {
      _key: 'r2',
      initials: 'CD',
      influence: 9,
      support: 3,
      stanceId: 'sceptical',
    },
    {
      _key: 'r3',
      initials: 'EF',
      influence: 4,
      support: 8,
      stanceId: 'cautious',
    },
  ]

  it('renders for a typical Assessment 5 result', () => {
    const result = PdfStakeholderMatrix({ rows })
    expect(isReactElement(result)).toBe(true)
  })

  it('returns null when no rows', () => {
    const result = PdfStakeholderMatrix({ rows: [] })
    expect(result).toBe(null)
  })

  it('handles rows with missing stance (defaults to unknown colour)', () => {
    const rowsNoStance: PersonRow[] = [
      { _key: 'r1', initials: 'XY', influence: 5, support: 5 },
    ]
    const result = PdfStakeholderMatrix({ rows: rowsNoStance })
    expect(isReactElement(result)).toBe(true)
  })

  it('handles long initials by truncating', () => {
    const longRow: PersonRow[] = [
      {
        _key: 'r1',
        initials: 'A.Very.Long.Initials.String',
        influence: 5,
        support: 5,
      },
    ]
    const result = PdfStakeholderMatrix({ rows: longRow })
    expect(isReactElement(result)).toBe(true)
  })

  it('handles boundary values (0 and 10)', () => {
    const boundary: PersonRow[] = [
      { _key: 'r1', initials: 'AA', influence: 0, support: 0 },
      { _key: 'r2', initials: 'BB', influence: 10, support: 10 },
    ]
    const result = PdfStakeholderMatrix({ rows: boundary })
    expect(isReactElement(result)).toBe(true)
  })
})

// ── PdfDistortionHeatmap ─────────────────────────────────────────────────

describe('PdfDistortionHeatmap', () => {
  it('renders for a typical Assessment 4 result', () => {
    const result = PdfDistortionHeatmap({
      rankedTags: [
        { id: 'catastrophising', label: 'Catastrophising', count: 5 },
        { id: 'labelling', label: 'Labelling', count: 4 },
        { id: 'shoulds', label: 'Shoulds and musts', count: 2 },
        { id: 'mind_reading', label: 'Mind-reading', count: 1 },
      ],
      topTagIds: ['catastrophising', 'labelling'],
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('returns null when no ranked tags', () => {
    const result = PdfDistortionHeatmap({
      rankedTags: [],
      topTagIds: [],
    })
    expect(result).toBe(null)
  })

  it('handles all-zero counts without dividing by zero', () => {
    const result = PdfDistortionHeatmap({
      rankedTags: [
        { id: 'a', label: 'A', count: 0 },
        { id: 'b', label: 'B', count: 0 },
      ],
      topTagIds: [],
    })
    expect(isReactElement(result)).toBe(true)
  })
})

// ── PdfTimeShiftLines ────────────────────────────────────────────────────

describe('PdfTimeShiftLines', () => {
  const factors: FactorScores[] = [
    { id: 'money', label: 'Money', past: 5, present: 3, future: 2, drift: -3 },
    {
      id: 'craft',
      label: 'Craft',
      past: 1,
      present: 3,
      future: 4,
      drift: 3,
    },
    {
      id: 'connection',
      label: 'Connection',
      past: 1,
      present: 2,
      future: 3,
      drift: 2,
    },
    {
      id: 'contribution',
      label: 'Contribution',
      past: 1,
      present: 1,
      future: 1,
      drift: 0,
    },
    {
      id: 'recognition',
      label: 'Recognition',
      past: 3,
      present: 2,
      future: 1,
      drift: -2,
    },
  ]

  it('renders for a typical Assessment 6 result', () => {
    const result = PdfTimeShiftLines({
      factors,
      risingFactorId: 'craft',
      fallingFactorId: 'money',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('returns null when no factors', () => {
    const result = PdfTimeShiftLines({
      factors: [],
      risingFactorId: '',
      fallingFactorId: '',
    })
    expect(result).toBe(null)
  })

  it('handles stable-shape case (all zeros for drift)', () => {
    const stable: FactorScores[] = factors.map((f) => ({
      ...f,
      past: 2,
      present: 2,
      future: 2,
      drift: 0,
    }))
    const result = PdfTimeShiftLines({
      factors: stable,
      risingFactorId: 'craft',
      fallingFactorId: 'money',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('respects a custom totalPoints', () => {
    const result = PdfTimeShiftLines({
      factors,
      risingFactorId: 'craft',
      fallingFactorId: 'money',
      totalPoints: 20,
    })
    expect(isReactElement(result)).toBe(true)
  })
})

// ── PdfQuadrant2x2 ───────────────────────────────────────────────────────

describe('PdfQuadrant2x2', () => {
  it('renders for a typical Assessment 3 result', () => {
    const result = PdfQuadrant2x2({
      counts: { AM: 5, AS: 1, IM: 2, IS: 0 },
      dominantStyle: 'AM',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders when total is zero (defensive — places dot at centre)', () => {
    const result = PdfQuadrant2x2({
      counts: { AM: 0, AS: 0, IM: 0, IS: 0 },
      dominantStyle: '',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('handles missing count keys', () => {
    const result = PdfQuadrant2x2({
      counts: { AM: 3 },
      dominantStyle: 'AM',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders when dominantStyle is not one of the four', () => {
    // Defensive: a bad dominantStyle shouldn't crash — it just means no
    // quadrant gets highlighted.
    const result = PdfQuadrant2x2({
      counts: { AM: 2, AS: 2, IM: 2, IS: 2 },
      dominantStyle: 'unknown',
    })
    expect(isReactElement(result)).toBe(true)
  })
})

// ── PdfDimensionBars ────────────────────────────────────────────────────

describe('PdfDimensionBars', () => {
  const dimensions: Dimension[] = [
    { _key: 'd1', id: 'readiness', label: 'Readiness', description: '' },
    { _key: 'd2', id: 'openness', label: 'Openness', description: '' },
    { _key: 'd3', id: 'capacity', label: 'Capacity', description: '' },
    { _key: 'd4', id: 'support', label: 'Support', description: '' },
  ]

  it('renders for a typical Assessment 1 result (Likert 0-5)', () => {
    const result = PdfDimensionBars({
      dimensions,
      scores: { readiness: 4.2, openness: 3.5, capacity: 2.8, support: 4.0 },
      maxValue: 5,
      highlightedDimensionId: 'capacity',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders without highlight when no dimension is flagged', () => {
    const result = PdfDimensionBars({
      dimensions,
      scores: { readiness: 3, openness: 3, capacity: 3, support: 3 },
      maxValue: 5,
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders for a Assessment 2 result (slider 0-10)', () => {
    // Confirms the maxValue param actually flexes — same component used
    // for both Likert (0-5) and slider (0-10) data.
    const result = PdfDimensionBars({
      dimensions,
      scores: { readiness: 8, openness: 6, capacity: 4, support: 9 },
      maxValue: 10,
      highlightedDimensionId: 'capacity',
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('clamps a score above maxValue to 100% width without throwing', () => {
    // Defensive: if scoring ever produces an out-of-range score, the
    // visualisation must still render — the clamp is in the component.
    const result = PdfDimensionBars({
      dimensions,
      scores: { readiness: 9, openness: 3, capacity: 3, support: 3 },
      maxValue: 5,
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('renders all dimensions even when some have no score (defaults to 0)', () => {
    const result = PdfDimensionBars({
      dimensions,
      scores: { readiness: 4 }, // only one score; the others should default to 0
      maxValue: 5,
    })
    expect(isReactElement(result)).toBe(true)
  })

  it('returns null when no dimensions are supplied', () => {
    const result = PdfDimensionBars({
      dimensions: [],
      scores: {},
      maxValue: 5,
    })
    expect(result).toBe(null)
  })

  it('handles maxValue of 0 gracefully (no divide-by-zero)', () => {
    // Defensive: a misconfigured assessment could in principle have
    // maxValue=0. The component should not divide by zero.
    expect(() =>
      PdfDimensionBars({
        dimensions,
        scores: { readiness: 0, openness: 0, capacity: 0, support: 0 },
        maxValue: 0,
      })
    ).not.toThrow()
  })
})

// ── Section title helper ─────────────────────────────────────────────────

// Imported via the exports the renderer module makes public. The helper
// itself isn't exported (it's a module-local function), but we test it
// indirectly through the visualisation cases that depend on a given
// visualisation enum value being valid. The exhaustiveness check in the
// helper means adding a new visualisation type will fail to typecheck
// until the helper is updated — that's the test, statically enforced.
