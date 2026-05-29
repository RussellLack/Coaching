'use client'

import { useMemo, useState } from 'react'
import { track } from '@/lib/analytics'
import { PortableText } from '@portabletext/react'
import type {
  Answers,
  AnswerValue,
  Assessment,
  WebformPayload,
} from '@/types/assessment'
import { score } from '@/lib/assessment/scoring'
import { matchTier } from '@/lib/assessment/tier-matcher'
import { QuestionRenderer } from './questions'
import { CalibrationQuestionRenderer } from './questions/CalibrationQuestion'
import { AssessmentVisualisation } from './visualisations'

/**
 * AssessmentEngine — the orchestrator.
 *
 * Stages: intro → questions → results → thanks.
 * Scoring runs client-side. Webform handler called only on email submit.
 */

export interface AssessmentEngineProps {
  assessment: Assessment
  defaultWebformEndpoint?: string
  bookingUrl?: string
}

type Stage = 'intro' | 'questions' | 'results' | 'thanks'

export function AssessmentEngine({
  assessment,
  defaultWebformEndpoint,
  bookingUrl = 'mailto:hello@fab.partners?subject=Strategy session request',
}: AssessmentEngineProps) {
  const [stage, setStage] = useState<Stage>('intro')
  const [answers, setAnswers] = useState<Answers>({})
  const [email, setEmail] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const answeredCount = useMemo(
    () => countAnsweredQuestions(assessment, answers),
    [assessment, answers]
  )
  const requiredCount = useMemo(
    () => countRequiredQuestions(assessment),
    [assessment]
  )
  const isComplete = answeredCount >= requiredCount

  const result = useMemo(() => {
    if (stage !== 'results' && stage !== 'thanks') return null
    const scoring = score({ assessment, answers })
    const matched = matchTier(assessment, scoring)
    return { scoring, matched }
  }, [stage, assessment, answers])

  // Use the assessment-specific override if set, otherwise the configured
  // default, otherwise our own Next.js Route Handler.
  const webformEndpoint =
    assessment.webformEndpoint ??
    defaultWebformEndpoint ??
    '/api/assessment-submit'

  function handleStart() {
    setStartedAt(Date.now())
    setStage('questions')
    // Analytics: visitor has engaged with the assessment. Fires once per
    // session; if the visitor goes back to the intro stage and starts
    // again, we'd track that as a separate start.
    track({
      name: 'assessment_started',
      params: { assessment_slug: assessment.slug },
    })
  }

  function handleAnswerChange(questionKey: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }))
  }

  function handleSeeResults() {
    if (!isComplete) return
    setStage('results')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    // Analytics: visitor has seen the on-screen result. The matched tier
    // is the most actionable property — lets us segment completions by
    // outcome (e.g. "how many people land in the high-readiness tier").
    if (result?.matched && startedAt) {
      track({
        name: 'assessment_completed',
        params: {
          assessment_slug: assessment.slug,
          tier: result.matched.tier.id,
          duration_seconds: Math.round((Date.now() - startedAt) / 1000),
        },
      })
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmissionError(null)

    if (!email || !isValidEmail(email)) {
      setSubmissionError('Please enter a valid email address.')
      return
    }
    if (!result || !result.matched) {
      setSubmissionError('Result not ready yet.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = buildPayload({
        assessment,
        email,
        result: { scoring: result.scoring, matched: result.matched },
        startedAt: startedAt ?? Date.now(),
      })
      const res = await fetch(webformEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`Webform returned ${res.status}`)
      }
      // Analytics: the visitor has submitted their email and the API
      // accepted it. This is the conversion event — fire it only on
      // success, never on submit-attempt. Failed submissions shouldn't
      // be counted as conversions.
      if (result?.matched && startedAt) {
        track({
          name: 'assessment_submitted',
          params: {
            assessment_slug: assessment.slug,
            tier: result.matched.tier.id,
            duration_seconds: Math.round((Date.now() - startedAt) / 1000),
          },
        })
      }
      setStage('thanks')
    } catch (err) {
      setSubmissionError(
        err instanceof Error
          ? `We couldn’t send your results: ${err.message}. Please try again.`
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12 sm:py-16">
      <header className="mb-10 space-y-3">
        <h1 className="font-serif text-3xl leading-tight text-cream sm:text-4xl">
          {assessment.displayTitle}
        </h1>
        {assessment.tagline && (
          <p className="text-lg text-cream-muted">{assessment.tagline}</p>
        )}
      </header>

      {stage === 'intro' && (
        <section className="space-y-6">
          {assessment.introCopy && (
            <div className="fab-prose">
              <PortableText value={assessment.introCopy} />
            </div>
          )}
          <p className="text-sm text-cream-dim sans">
            About {assessment.estimatedMinutes} minutes. No email required to
            see your result.
          </p>
          <PrimaryButton onClick={handleStart}>Start</PrimaryButton>
        </section>
      )}

      {stage === 'questions' && (
        <section>
          <ol className="space-y-10">
            {assessment.questions.map((q, i) => (
              <li key={q._key}>
                <QuestionRenderer
                  question={q}
                  questionNumber={i + 1}
                  value={answers[q._key]}
                  onChange={(v) => handleAnswerChange(q._key, v)}
                  pointAllocationFactors={assessment.pointAllocationFactors}
                />
              </li>
            ))}
          </ol>

          {/* Part Two: calibration questions (Assessment 3) */}
          {assessment.calibrationQuestions &&
            assessment.calibrationQuestions.length > 0 && (
              <section className="mt-16 border-t border-teal-mid pt-10">
                <header className="mb-8 space-y-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-coral sans">
                    Part Two
                  </p>
                  <h2 className="text-2xl font-serif text-cream">
                    Three quick questions about AI in your decisions
                  </h2>
                  <p className="text-sm text-cream-muted sans">
                    The diagnostic reads on the next screen are calibrated by
                    how heavily you actually use AI in your decision process.
                  </p>
                </header>
                <ol className="space-y-8">
                  {assessment.calibrationQuestions.map((cq, i) => (
                    <li key={cq._key}>
                      <CalibrationQuestionRenderer
                        question={cq}
                        questionNumber={assessment.questions.length + i + 1}
                        value={answers[cq.id] as string | undefined}
                        onChange={(v) => handleAnswerChange(cq.id, v)}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            )}

          <div className="mt-12 flex flex-col items-start gap-3 border-t border-teal-mid pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cream-dim sans" aria-live="polite">
              {answeredCount} of {requiredCount} answered
            </p>
            <PrimaryButton onClick={handleSeeResults} disabled={!isComplete}>
              See my result
            </PrimaryButton>
          </div>
        </section>
      )}

      {stage === 'results' && result?.matched && (
        <ResultScreen
          assessment={assessment}
          result={{ scoring: result.scoring, matched: result.matched }}
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleEmailSubmit}
          isSubmitting={isSubmitting}
          submissionError={submissionError}
          bookingUrl={bookingUrl}
        />
      )}

      {stage === 'results' && !result?.matched && (
        <section className="rounded-sm border border-teal-mid bg-teal-mid/30 p-6 text-cream-muted">
          We couldn’t match your answers to a specific result. This is unusual
          — please refresh and try again.
        </section>
      )}

      {stage === 'thanks' && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-cream">
            Thanks — your full diagnosis is on the way.
          </h2>
          <p className="text-cream-muted">
            Check your inbox (and spam folder, just in case).
          </p>
        </section>
      )}

      {assessment.attributionFooter && (
        <footer className="mt-16 border-t border-teal-mid pt-6 text-sm text-cream-dim">
          <div className="fab-prose sans" style={{ color: 'inherit' }}>
            <PortableText value={assessment.attributionFooter} />
          </div>
        </footer>
      )}
    </div>
  )
}

// ── RESULT SCREEN ──────────────────────────────────────────────────

interface ResultScreenProps {
  assessment: Assessment
  result: {
    scoring: ReturnType<typeof score>
    matched: NonNullable<ReturnType<typeof matchTier>>
  }
  bookingUrl?: string
  email: string
  onEmailChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  submissionError: string | null
}

function ResultScreen({
  assessment,
  result,
  email,
  onEmailChange,
  onSubmit,
  isSubmitting,
  submissionError,
  bookingUrl = 'mailto:hello@fab.partners?subject=Strategy session request',
}: ResultScreenProps) {
  const { tier, interpretations, scoring } = result.matched
  return (
    <section className="space-y-10">
      {/* Tier badge */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-cream-dim sans">
          Your result
        </p>
        <p className="font-serif text-4xl leading-tight text-cream sm:text-5xl">
          {tier.label}
        </p>
      </div>

      {/* Visualisation card */}
      <div className="rounded-sm border border-teal-mid bg-teal-mid/30 p-6 sm:p-8">
        <AssessmentVisualisation assessment={assessment} scoring={scoring} />
      </div>

      {/* Tier headline */}
      <div className="fab-prose">
        <PortableText value={tier.headline} />
      </div>

      {/* Interpretations */}
      {interpretations.length > 0 && (
        <div className="space-y-6">
          {interpretations.map((i) => (
            <div
              key={i._key}
              className="border-l-2 border-coral bg-teal-mid/40 px-5 py-4 sm:px-6 sm:py-5"
            >
              <div className="fab-prose">
                <PortableText value={i.body} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email capture */}
      <form
        onSubmit={onSubmit}
        className="mt-4 space-y-4 border-t border-teal-mid pt-8"
      >
        {assessment.emailCaptureCopy && (
          <div className="fab-prose">
            <PortableText value={assessment.emailCaptureCopy} />
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="sans w-full rounded-sm border border-teal-mid bg-transparent px-4 py-3 text-base text-cream placeholder:text-cream-dim focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="sans rounded-sm bg-coral px-6 py-3 font-medium text-teal transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending…' : assessment.ctaButtonLabel ?? 'Send me the PDF'}
          </button>
        </div>
        {submissionError && (
          <p className="text-sm text-coral sans" role="alert">
            {submissionError}
          </p>
        )}
      </form>

      {assessment.postCaptureCtaCopy && (
        <div className="fab-prose pt-2 text-cream-muted">
          <PortableText value={assessment.postCaptureCtaCopy} />
        </div>
      )}
    
        <PostResultCTA
          tierId={tier?.id ?? 'not-yet'}
          bookingUrl={bookingUrl}
        />
</section>
  )
}

// ── PRIMARY BUTTON ────────────────────────────────────────────────

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sans inline-flex items-center justify-center rounded-sm bg-coral px-6 py-3 font-medium text-teal transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

// ── HELPERS ───────────────────────────────────────────────────────

function countRequiredQuestions(assessment: Assessment): number {
  const scenarioCount = assessment.questions.filter((q) =>
    [
      'questionAgreement5',
      'questionSlider010',
      'questionScenarioRadio',
      'questionPointAllocation',
      'questionPersonRowEntry',
    ].includes(q._type)
  ).length
  const calibrationCount = assessment.calibrationQuestions?.length ?? 0
  return scenarioCount + calibrationCount
}

function countAnsweredQuestions(
  assessment: Assessment,
  answers: Answers
): number {
  let count = 0
  for (const q of assessment.questions) {
    const a = answers[q._key]
    if (a === undefined || a === null) continue
    if (q._type === 'questionAgreement5' || q._type === 'questionSlider010') {
      if (typeof a === 'number') count++
    } else if (q._type === 'questionScenarioRadio') {
      if (typeof a === 'string' && a.length > 0) count++
    } else if (q._type === 'questionPointAllocation') {
      if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
        const sum = Object.values(a as Record<string, number>).reduce(
          (s, n) => s + (typeof n === 'number' ? n : 0),
          0
        )
        if (sum === q.totalPoints) count++
      }
    } else if (q._type === 'questionPersonRowEntry') {
      // Require: a non-empty change description AND at least minRows rows
      // where the initials field has been filled in. Sliders default to 5
      // so they don't need explicit interaction (per Slider010 UX choice),
      // but the name is the meaningful signal that the user has typed
      // someone in.
      if (
        typeof a === 'object' &&
        a !== null &&
        'changeDescription' in a &&
        'rows' in a &&
        typeof (a as { changeDescription: unknown }).changeDescription ===
          'string' &&
        (a as { changeDescription: string }).changeDescription.trim().length >
          0 &&
        Array.isArray((a as { rows: unknown[] }).rows)
      ) {
        const filledRows = (
          (a as { rows: { initials?: unknown }[] }).rows
        ).filter(
          (r) =>
            typeof r.initials === 'string' && r.initials.trim().length > 0
        ).length
        if (filledRows >= q.minRows) count++
      }
    }
  }
  // Calibration questions: each answer is the picked option's _key (a string)
  for (const cq of assessment.calibrationQuestions ?? []) {
    const a = answers[cq.id]
    if (typeof a === 'string' && a.length > 0) count++
  }
  return count
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function buildPayload(args: {
  assessment: Assessment
  email: string
  result: {
    scoring: ReturnType<typeof score>
    matched: NonNullable<ReturnType<typeof matchTier>>
  }
  startedAt: number
}): WebformPayload {
  const { assessment, email, result, startedAt } = args
  const { tier } = result.matched

  const dynamicTags: string[] = [`tier:${tier.id}`]
  const raw = result.scoring.raw as Record<string, unknown>
  if (typeof raw.lowestDimension === 'string')
    dynamicTags.push(`lowest:${raw.lowestDimension}`)
  // For support-matrix results, surface each fired flag as a CRM tag so
  // Russell can filter the lead list by what's actually going on for them.
  if (Array.isArray(raw.flagsFired)) {
    for (const flag of raw.flagsFired as string[]) {
      if (flag !== 'healthy_map') dynamicTags.push(`flag:${flag}`)
    }
  }
  // For tally-by-tag results, surface top distortions as CRM tags. This
  // lets us filter the lead list by primary cognitive pattern — useful
  // for sales-cycle nurture (catastrophisers respond differently to
  // outreach than minimisers do).
  if (Array.isArray(raw.topTags)) {
    for (const tag of raw.topTags as string[]) {
      dynamicTags.push(`distortion:${tag}`)
    }
  }
  // For tally-by-tag results WITH calibration (Assessment 3), surface
  // the decision style + AI band as separate tags. style:* lets us
  // segment leads by primary decision pattern; ai_band:* lets us tier
  // them by how heavily AI is already in their process. Cross-cut is
  // the highest-information CRM segment in the assessment set.
  if (
    raw.calibration &&
    typeof raw.calibration === 'object' &&
    Array.isArray(raw.topTags) &&
    (raw.topTags as string[]).length > 0
  ) {
    const cal = raw.calibration as { aiBand: string }
    const style = (raw.topTags as string[])[0]
    dynamicTags.push(`style:${style}`)
    if (cal.aiBand && cal.aiBand !== 'unknown') {
      dynamicTags.push(`ai_band:${cal.aiBand}`)
    }
  }
  // For time-shift-points results, surface rising/falling/anchor as CRM
  // tags. Rising factor is the single most predictive variable for what
  // kind of coaching the person actually wants.
  if (typeof raw.rising_factor === 'string') {
    dynamicTags.push(`rising:${raw.rising_factor}`)
  }
  if (typeof raw.falling_factor === 'string') {
    dynamicTags.push(`falling:${raw.falling_factor}`)
  }
  if (typeof raw.anchor_factor === 'string') {
    dynamicTags.push(`anchor:${raw.anchor_factor}`)
  }
  if (raw.is_stable_shape === true) {
    dynamicTags.push('pattern:stable_shape')
  }

  const primaryFinding = extractPrimaryFinding(tier.label, raw)

  // Privacy: if the raw payload contains person rows (Support Matrix),
  // strip full names down to initials before transmission. Full names
  // stay client-side only.
  const sanitisedRaw = sanitiseRawForTransmission(raw)

  return {
    assessment: {
      slug: assessment.slug,
      displayTitle: assessment.displayTitle,
    },
    email: email.trim(),
    result: {
      tier: tier.id,
      primaryFinding,
      // Pass the scoring engine's interpretation keys through verbatim.
      // The PDF reads these instead of recomputing strategy-specific logic.
      interpretationKeys: result.scoring.interpretationKeys,
      raw: sanitisedRaw,
    },
    crmTags: [...(assessment.crmTags ?? []), ...dynamicTags],
    meta: {
      submittedAt: new Date().toISOString(),
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
  }
}

function sanitiseRawForTransmission(
  raw: Record<string, unknown>
): Record<string, unknown> {
  // Look for `rows` and `quadrants` (Support Matrix shape) and truncate names.
  const out: Record<string, unknown> = { ...raw }
  if (Array.isArray(raw.rows)) {
    out.rows = (raw.rows as { initials?: unknown }[]).map((r) => ({
      ...r,
      initials: typeof r.initials === 'string' ? toInitials(r.initials) : '',
    }))
  }
  if (raw.quadrants && typeof raw.quadrants === 'object') {
    const q = raw.quadrants as Record<string, { initials?: unknown }[]>
    out.quadrants = Object.fromEntries(
      Object.entries(q).map(([k, list]) => [
        k,
        list.map((r) => ({
          ...r,
          initials:
            typeof r.initials === 'string' ? toInitials(r.initials) : '',
        })),
      ])
    )
  }
  return out
}

// Reduce a name to initials. "Mike Johnson" → "MJ"; "Anna" → "A";
// "anna marie" → "AM"; already-initials like "AB" or "M.J." passed through
// (cleaned of dots and uppercased).
function toInitials(s: string): string {
  const cleaned = s.replace(/[.\s]+/g, ' ').trim()
  if (!cleaned) return ''
  const parts = cleaned.split(' ').filter(Boolean)
  // If the user typed something that's already short and looks like
  // initials, keep up to 4 chars uppercased.
  if (parts.length === 1 && parts[0].length <= 4) {
    return parts[0].toUpperCase()
  }
  return parts
    .slice(0, 3)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function extractPrimaryFinding(
  tierLabel: string,
  raw: Record<string, unknown>
): string {
  const parts: string[] = [tierLabel]
  if (typeof raw.overall === 'number') parts.push(`overall ${raw.overall.toFixed(1)}`)
  if (typeof raw.lowestDimension === 'string')
    parts.push(`lowest: ${raw.lowestDimension}`)
  if (Array.isArray(raw.flagsFired)) {
    const flags = (raw.flagsFired as string[]).filter(
      (f) => f !== 'healthy_map'
    )
    if (flags.length > 0) {
      parts.push(`${flags.length} flag${flags.length === 1 ? '' : 's'}: ${flags[0]}`)
    } else {
      parts.push('healthy map')
    }
  }
  // tally-by-tag: surface top distortion(s) + healthy proportion.
  if (Array.isArray(raw.topTags) && typeof raw.healthy_count === 'number') {
    const tops = raw.topTags as string[]
    const healthy = raw.healthy_count as number
    const answered = (raw.answered_count as number | undefined) ?? 0
    if (tops.length > 0) {
      parts.push(`top: ${tops.join(', ')}`)
    }
    if (answered > 0) {
      parts.push(`healthy: ${healthy}/${answered}`)
    }
  }
  // tally-by-tag with calibration: surface the AI band + override flags.
  if (raw.calibration && typeof raw.calibration === 'object') {
    const cal = raw.calibration as {
      aiBand: string
      aiOverrelianceFlag: boolean
      aiUnderuseFlag: boolean
    }
    if (cal.aiBand && cal.aiBand !== 'unknown') {
      parts.push(`AI band: ${cal.aiBand}`)
    }
    if (cal.aiOverrelianceFlag) parts.push('AI overreliance')
    if (cal.aiUnderuseFlag) parts.push('AI underuse')
  }
  // time-shift-points: surface rising/falling/anchor.
  if (
    typeof raw.rising_factor === 'string' &&
    typeof raw.falling_factor === 'string'
  ) {
    parts.push(`rising: ${raw.rising_factor}`)
    parts.push(`falling: ${raw.falling_factor}`)
    if (typeof raw.anchor_factor === 'string') {
      parts.push(`anchor: ${raw.anchor_factor}`)
    }
  }
  return parts.join(' — ')
}


// PostResultCTA — contextual coaching CTA below the result
const READY_TIERS = ['ready', 'ready-with-gap'];
const ALMOST_TIERS = ['almost-ready'];

function PostResultCTA({ tierId, bookingUrl }: { tierId: string; bookingUrl: string }) {
  const isReady = READY_TIERS.includes(tierId);
  const isAlmost = ALMOST_TIERS.includes(tierId);
  const isNotYet = !isReady && !isAlmost;

  const wrap: React.CSSProperties = { marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2.5rem' };
  const heading: React.CSSProperties = { fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cream)', marginBottom: '0.75rem' };
  const body: React.CSSProperties = { fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', maxWidth: '480px', marginBottom: '1.5rem' };
  const btnP: React.CSSProperties = { display: 'inline-block', background: 'var(--coral)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.85rem 1.75rem', textDecoration: 'none' };
  const btnO: React.CSSProperties = { display: 'inline-block', border: '1px solid var(--coral)', color: 'var(--coral)', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.85rem 1.75rem', textDecoration: 'none' };

  return (
    <div style={wrap}>
      {isReady && (
        <>
          <p style={heading}>Take this further.</p>
          <p style={body}>Your result suggests you are in a good position to get real value from a focused conversation. A 45-minute strategy session — private, no obligation — is the natural next step. Bring the PDF.</p>
          <a href={bookingUrl} style={btnP}>Book a Strategy Session</a>
        </>
      )}
      {isAlmost && (
        <>
          <p style={heading}>Worth a conversation.</p>
          <p style={body}>Your result identifies something specific. A strategy session is not about selling you a coaching programme — it is an honest conversation about whether there is work here worth doing, and what kind. Forty-five minutes. Confidential. No obligation.</p>
          <a href={bookingUrl} style={btnP}>Request a Strategy Session</a>
        </>
      )}
      {isNotYet && (
        <>
          <p style={heading}>Not the right moment — but worth staying in touch.</p>
          <p style={body}>Your result is honest about timing. If you would like a brief, informal conversation to think through what would actually help you right now, that is also on offer. No agenda.</p>
          <a href="mailto:hello@fab.partners?subject=Brief conversation request" style={btnO}>Get in touch</a>
        </>
      )}
    </div>
  );
}

