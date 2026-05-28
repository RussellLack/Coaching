/**
 * Analytics helper for fab.partners.
 *
 * Thin, defensive wrapper around `gtag` for Google Analytics 4. Three
 * design rules, all enforced here so the call sites stay simple:
 *
 *   1. Never throws. If GA isn't loaded yet, or the measurement ID isn't
 *      set, or the user is in an environment with no `window`, the
 *      `track()` call quietly does nothing. The point is that adding
 *      analytics shouldn't introduce a new failure mode in the rest of
 *      the app.
 *
 *   2. Never sends PII. The event-name and properties type below
 *      enumerates exactly what gets sent. There's no escape hatch for
 *      arbitrary key/value pairs — if we want to track something new,
 *      we add the event to the type. Stops a careless future commit from
 *      sending `email` or `name` to GA.
 *
 *   3. Server-side safe. The helper checks `typeof window` before
 *      reaching for `gtag`, so calling it from a server component just
 *      no-ops rather than crashing the render.
 *
 * Configuration:
 *   The GA measurement ID comes from `NEXT_PUBLIC_GA_MEASUREMENT_ID`. If
 *   the env var is unset (the default for development), gtag is never
 *   loaded and `track()` no-ops — same shape as a CI environment or a
 *   dev preview. To enable in production, set the env var in Netlify.
 *
 * Why a separate file from `GoogleAnalytics.tsx`:
 *   The component injects the gtag script tag; this file fires events.
 *   Splitting them means the engine and the assessments-index page can
 *   import `track()` without pulling in `next/script` and friends.
 */

// ── EVENT TYPES ─────────────────────────────────────────────────────────

import { isAnalyticsAllowed } from './consent'

// Allowed events. Adding one means adding a case here AND in the union below.
// The TypeScript-enforced shape is what stops a typo from silently sending
// a non-event.

interface AssessmentStartedEvent {
  name: 'assessment_started'
  params: {
    assessment_slug: string
  }
}

interface AssessmentCompletedEvent {
  name: 'assessment_completed'
  params: {
    assessment_slug: string
    tier: string
    duration_seconds: number
  }
}

interface AssessmentSubmittedEvent {
  name: 'assessment_submitted'
  params: {
    assessment_slug: string
    tier: string
    duration_seconds: number
  }
}

interface ArchetypeClickedEvent {
  name: 'archetype_clicked'
  params: {
    archetype_id: string
    assessment_slug: string
    // 0 = "Start here" (first recommendation in the tile)
    // 1+ = "Also worth considering"
    rank: number
  }
}

interface DirectoryClickedEvent {
  name: 'directory_clicked'
  params: {
    assessment_slug: string
  }
}

export type AnalyticsEvent =
  | AssessmentStartedEvent
  | AssessmentCompletedEvent
  | AssessmentSubmittedEvent
  | ArchetypeClickedEvent
  | DirectoryClickedEvent

// ── GTAG SHIM ───────────────────────────────────────────────────────────

// We declare the global rather than importing from a types package — saves
// a dependency, and the surface area is tiny.

type GtagFn = (
  command: 'event' | 'config' | 'consent' | 'set',
  ...args: unknown[]
) => void

declare global {
  interface Window {
    gtag?: GtagFn
    // gtag.js pushes events into dataLayer as well; we never read it,
    // but having the type ensures we don't accidentally clobber it.
    dataLayer?: unknown[]
  }
}

// ── PUBLIC API ──────────────────────────────────────────────────────────

/**
 * Fire a tracked event.
 *
 * Safe to call from anywhere — server components, event handlers, effects.
 * No-ops if:
 *   - window isn't defined (SSR / server components)
 *   - gtag isn't loaded (no measurement ID, or script hasn't loaded yet)
 *   - the user has not granted consent (per `isAnalyticsAllowed()`)
 *
 * The consent gate is the strict-compliance position: until the user
 * has explicitly opted in, nothing fires. This is the same gate that
 * prevents the GA script tag from being injected at all (see
 * GoogleAnalytics.tsx), so this check is belt-and-braces — even if
 * gtag somehow exists, we still don't send.
 *
 * In tests, the helper still calls `window.gtag` if it exists AND
 * consent is granted, so tests can stub both. Otherwise it returns
 * silently.
 */
export function track(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return
  if (!isAnalyticsAllowed()) return
  const gtag = window.gtag
  if (typeof gtag !== 'function') return
  try {
    gtag('event', event.name, event.params)
  } catch {
    // Never let analytics break the rest of the app.
  }
}

/**
 * Returns the configured GA measurement ID, or null if not set.
 *
 * Used by the `GoogleAnalytics` component to decide whether to inject
 * the gtag script at all. The env var is `NEXT_PUBLIC_*` so it's
 * inlined at build time — this function exists to centralise the
 * lookup and to make it stub-able in tests.
 */
export function getMeasurementId(): string | null {
  // Allow both Next.js env-var format and a window-level override so
  // tests can set this without rebuilding.
  const winId =
    typeof window !== 'undefined'
      ? ((window as unknown as { __FAB_GA_ID__?: string }).__FAB_GA_ID__ ??
        null)
      : null
  if (winId) return winId
  const envId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (envId && envId.trim()) return envId.trim()
  return null
}
