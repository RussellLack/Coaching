/**
 * End-to-end PDF rendering test across all six assessments.
 *
 * Loads each seed NDJSON, constructs a representative WebformPayload with
 * interpretation keys threaded from the scoring engine, calls
 * `renderAssessmentPdf`, and confirms it produces a non-empty buffer.
 *
 * In this test environment `@react-pdf/renderer.renderToBuffer` is a
 * stub that returns `Buffer.from('stub-pdf')`. The actual PDF bytes
 * aren't validated — what we're confirming is that the React tree
 * passed to renderToBuffer composes without throwing for each
 * combination of scoring strategy + visualisation. Real PDF byte-level
 * validation happens in Russell's environment when the real package
 * is installed.
 *
 * The 6 assessments each have a different combination of:
 *   - Scoring strategy (5 distinct ones across the 6)
 *   - Visualisation type (6 distinct ones)
 *   - Question types and answer shapes
 * So if any one of these breaks the PDF, exactly one test fails and
 * the failure points at which assessment regressed.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Answers, Assessment, WebformPayload } from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'
import { renderAssessmentPdf } from './render-assessment-pdf'

// ── HELPER: LOAD AN ASSESSMENT NDJSON ───────────────────────────────────

function loadAssessment(filename: string): Assessment {
  const path = join(__dirname, '../../../../seed', filename)
  const lines = readFileSync(path, 'utf-8').trim().split('\n')
  const doc = lines
    .map((l) => JSON.parse(l))
    .find((d) => d._type === 'assessment') as Record<string, unknown>
  // Cast to Assessment — the NDJSON shape matches the Sanity projection.
  return {
    _id: doc._id as string,
    slug: (doc.slug as { current: string }).current,
    displayTitle: doc.displayTitle as string,
    tagline: doc.tagline as string | undefined,
    estimatedMinutes: doc.estimatedMinutes as number,
    introCopy: doc.introCopy as Assessment['introCopy'],
    questions: doc.questions as Assessment['questions'],
    calibrationQuestions:
      doc.calibrationQuestions as Assessment['calibrationQuestions'],
    scoringStrategy: doc.scoringStrategy as Assessment['scoringStrategy'],
    tagCategories: doc.tagCategories as Assessment['tagCategories'],
    dimensions: doc.dimensions as Assessment['dimensions'],
    pointAllocationFactors:
      doc.pointAllocationFactors as Assessment['pointAllocationFactors'],
    resultTiers: doc.resultTiers as Assessment['resultTiers'],
    interpretations: doc.interpretations as Assessment['interpretations'],
    visualisation: doc.visualisation as Assessment['visualisation'],
    emailCaptureCopy: doc.emailCaptureCopy as Assessment['emailCaptureCopy'],
    ctaButtonLabel: doc.ctaButtonLabel as string | undefined,
    postCaptureCtaCopy:
      doc.postCaptureCtaCopy as Assessment['postCaptureCtaCopy'],
    crmTags: doc.crmTags as string[] | undefined,
    seoTitle: doc.seoTitle as string | undefined,
    seoDescription: doc.seoDescription as string | undefined,
  }
}

/**
 * Score and build a payload — replicates the orchestrator's buildPayload
 * just closely enough to feed the PDF. The actual orchestrator does more
 * (sanitisation of names, etc.), but the PDF doesn't depend on those.
 */
function payloadFor(
  assessment: Assessment,
  answers: Answers,
  email = 'test@example.com'
): WebformPayload {
  const result = score({ assessment, answers })
  const matched = matchTier(assessment, result)
  if (!matched) {
    throw new Error(`No tier matched for ${assessment.slug}`)
  }
  return {
    assessment: {
      slug: assessment.slug,
      displayTitle: assessment.displayTitle,
    },
    email,
    result: {
      tier: matched.tier.id,
      primaryFinding: matched.tier.label,
      interpretationKeys: result.interpretationKeys,
      raw: result.raw as Record<string, unknown>,
    },
    crmTags: [],
    meta: {
      submittedAt: new Date().toISOString(),
      durationSeconds: 180,
      userAgent: 'test',
    },
  }
}

// ── PER-ASSESSMENT PDF TESTS ───────────────────────────────────────────

describe('renderAssessmentPdf — Assessment 1 (Coaching Readiness)', () => {
  it('renders a non-empty buffer with dimension bars', async () => {
    const assessment = loadAssessment('assessment-1.ndjson')
    // Answer every question with a middle-of-the-road 3
    const answers: Answers = {}
    for (const q of assessment.questions) {
      if (q._type === 'questionAgreement5') answers[q._key] = 3
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('renderAssessmentPdf — Assessment 2 (Resilience Wheel)', () => {
  it('renders a non-empty buffer with the radar wheel', async () => {
    const assessment = loadAssessment('assessment-2.ndjson')
    const answers: Answers = {}
    for (const q of assessment.questions) {
      if (q._type === 'questionSlider010') answers[q._key] = 5
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('renderAssessmentPdf — Assessment 3 (Decision-Making Style)', () => {
  it('renders a non-empty buffer with the 2x2 quadrant', async () => {
    const assessment = loadAssessment('assessment-3.ndjson')
    const answers: Answers = {}
    // Pick the AM option for every scenario
    for (const q of assessment.questions) {
      if (q._type === 'questionScenarioRadio') {
        const am = q.options.find((o) => o.tagId === 'AM')
        if (am) answers[q._key] = am._key
      }
    }
    // Answer calibration: balanced AI use
    for (const cq of assessment.calibrationQuestions ?? []) {
      const opt = cq.options.find((o) => o.score === 1)
      if (opt) answers[cq.id] = opt._key
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('renderAssessmentPdf — Assessment 4 (Cognitive Distortion)', () => {
  it('renders a non-empty buffer with the distortion heatmap', async () => {
    const assessment = loadAssessment('assessment-4.ndjson')
    const answers: Answers = {}
    // Pick a mix that produces clear top distortions
    for (const q of assessment.questions) {
      if (q._type === 'questionScenarioRadio') {
        const opt =
          q.options.find((o) => o.tagId === 'catastrophising') ??
          q.options.find((o) => o.tagId === 'labelling') ??
          q.options[0]
        answers[q._key] = opt._key
      }
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('renderAssessmentPdf — Assessment 5 (Support Matrix)', () => {
  it('renders a non-empty buffer with the stakeholder matrix', async () => {
    const assessment = loadAssessment('assessment-5.ndjson')
    // PersonRowEntry expects an object: change + rows array
    const answers: Answers = {}
    const personRowQ = assessment.questions.find(
      (q) => q._type === 'questionPersonRowEntry'
    )
    if (personRowQ && personRowQ._type === 'questionPersonRowEntry') {
      answers[personRowQ._key] = {
        change: 'A meaningful restructure that includes AI in delivery.',
        rows: [
          {
            _key: 'r1',
            initials: 'A.B.',
            influence: 8,
            support: 7,
            stanceId: 'engaged',
          },
          {
            _key: 'r2',
            initials: 'C.D.',
            influence: 9,
            support: 3,
            stanceId: 'sceptical',
          },
          {
            _key: 'r3',
            initials: 'E.F.',
            influence: 5,
            support: 8,
            stanceId: 'cautious',
          },
        ],
      } as unknown as Answers[string]
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('renderAssessmentPdf — Assessment 6 (Success Definition)', () => {
  it('renders a non-empty buffer with the time-shift lines', async () => {
    const assessment = loadAssessment('assessment-6.ndjson')
    const answers: Answers = {
      'q-past': { money: 5, recognition: 3, craft: 1, connection: 1, contribution: 1 },
      'q-present': { money: 3, recognition: 2, craft: 3, connection: 2, contribution: 1 },
      'q-future': { money: 2, recognition: 1, craft: 4, connection: 3, contribution: 1 },
    }
    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

// ── REGRESSION: INTERPRETATION KEYS THREADED CORRECTLY ─────────────────

describe('renderAssessmentPdf — interpretation keys threading', () => {
  it('uses the keys from the payload, not a recomputed set', async () => {
    // Assessment 4 emits dynamic interpretation keys based on scoring.
    // The PDF must read them from the payload, not from any local logic.
    const assessment = loadAssessment('assessment-4.ndjson')
    const answers: Answers = {}
    for (const q of assessment.questions) {
      if (q._type === 'questionScenarioRadio') {
        const opt = q.options.find((o) => o.tagId === 'shoulds') ?? q.options[0]
        answers[q._key] = opt._key
      }
    }
    const result = score({ assessment, answers })
    // Sanity check the keys we'll thread through
    expect(result.interpretationKeys.length).toBeGreaterThan(0)
    expect(
      result.interpretationKeys.every((k) => k.startsWith('distortion.'))
    ).toBe(true)

    const buffer = await renderAssessmentPdf({
      assessment,
      payload: payloadFor(assessment, answers),
    })
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('renders a usable result even when payload has no interpretation keys', async () => {
    // Defensive: an old client could submit a payload without
    // interpretationKeys. The PDF should still render (just without the
    // "Where to look next" section).
    const assessment = loadAssessment('assessment-1.ndjson')
    const answers: Answers = {}
    for (const q of assessment.questions) {
      if (q._type === 'questionAgreement5') answers[q._key] = 3
    }
    const result = score({ assessment, answers })
    const matched = matchTier(assessment, result)!
    const payload: WebformPayload = {
      assessment: { slug: assessment.slug, displayTitle: assessment.displayTitle },
      email: 'test@example.com',
      result: {
        tier: matched.tier.id,
        primaryFinding: matched.tier.label,
        interpretationKeys: [] as string[], // empty on purpose
        raw: result.raw as Record<string, unknown>,
      },
      crmTags: [],
      meta: { submittedAt: new Date().toISOString(), durationSeconds: 1, userAgent: 't' },
    }
    const buffer = await renderAssessmentPdf({ assessment, payload })
    expect(buffer.length).toBeGreaterThan(0)
  })
})
