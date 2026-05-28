/**
 * Tests for the analytics helper (`src/lib/analytics.ts`).
 *
 * What we care about:
 *   - `track()` never throws — including when window is undefined,
 *     when gtag is undefined, or when gtag throws.
 *   - When gtag IS defined, `track()` calls it with the right shape.
 *   - The event-name and properties contract holds at the type level
 *     (verified at compile time, but worth asserting at runtime too).
 *   - `getMeasurementId()` reads from the env var and falls back to
 *     window.__FAB_GA_ID__ for tests.
 *
 * Environment: vitest defaults to a node environment with no `window`.
 * The analytics module checks `typeof window === 'undefined'` and
 * no-ops when missing, so most of the no-op tests work without setup.
 * For the tests that need to stub `window.gtag`, we set up a minimal
 * window-like global in `beforeAll`.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { track, getMeasurementId, type AnalyticsEvent } from './analytics'

// ── MINIMAL DOM SHIM ────────────────────────────────────────────────────

// vitest's default environment is node. Rather than pull in jsdom, we
// install a tiny `window` global that has just what the analytics
// helper actually touches: a place to hang `gtag` and `__FAB_GA_ID__`.

interface MinimalWindow {
  gtag?: unknown
  __FAB_GA_ID__?: string
  localStorage?: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
  dispatchEvent?: (event: Event) => boolean
  addEventListener?: (type: string, listener: EventListener) => void
  removeEventListener?: (type: string, listener: EventListener) => void
}

const ORIGINAL_WINDOW: unknown = (globalThis as unknown as { window?: unknown })
  .window

// In-memory localStorage shim — the consent module reads/writes
// localStorage, and we want isolation between tests.
const STORAGE: Map<string, string> = new Map()
const minimalLocalStorage = {
  getItem(key: string) {
    return STORAGE.has(key) ? STORAGE.get(key)! : null
  },
  setItem(key: string, value: string) {
    STORAGE.set(key, value)
  },
  removeItem(key: string) {
    STORAGE.delete(key)
  },
}

beforeAll(() => {
  ;(globalThis as unknown as { window: MinimalWindow }).window = {
    localStorage: minimalLocalStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
})

afterAll(() => {
  if (ORIGINAL_WINDOW === undefined) {
    delete (globalThis as unknown as { window?: unknown }).window
  } else {
    ;(globalThis as unknown as { window: unknown }).window = ORIGINAL_WINDOW
  }
})

// ── HELPERS ─────────────────────────────────────────────────────────────

/**
 * Stub a global window.gtag and return the mock so tests can assert on
 * its call args. Cleans up automatically on test teardown.
 */
function stubGtag() {
  const mock = vi.fn()
  ;(window as unknown as { gtag?: unknown }).gtag = mock
  return mock
}

function clearGtag() {
  delete (window as unknown as { gtag?: unknown }).gtag
}

function clearMeasurementId() {
  delete (window as unknown as { __FAB_GA_ID__?: string }).__FAB_GA_ID__
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
}

function grantConsentInStorage() {
  minimalLocalStorage.setItem('fab-partners-consent-v1', 'granted')
}

function denyConsentInStorage() {
  minimalLocalStorage.setItem('fab-partners-consent-v1', 'denied')
}

function clearConsentInStorage() {
  minimalLocalStorage.removeItem('fab-partners-consent-v1')
}

// ── track() ─────────────────────────────────────────────────────────────

describe('track()', () => {
  beforeEach(() => {
    clearGtag()
    // Grant consent in localStorage so track() doesn't bail at the consent
    // gate. The consent check (isAnalyticsAllowed) is exercised separately
    // in its own describe block below.
    grantConsentInStorage()
  })
  afterEach(() => {
    clearGtag()
    clearConsentInStorage()
  })

  it('does nothing when gtag is undefined', () => {
    // Just confirms no throw — there's nothing to assert when the
    // function is supposed to no-op.
    expect(() =>
      track({
        name: 'assessment_started',
        params: { assessment_slug: 'coaching-readiness' },
      })
    ).not.toThrow()
  })

  it('calls gtag with event name and params when gtag is defined', () => {
    const gtag = stubGtag()
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'coaching-readiness' },
    })
    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith('event', 'assessment_started', {
      assessment_slug: 'coaching-readiness',
    })
  })

  it('handles assessment_completed with tier and duration', () => {
    const gtag = stubGtag()
    track({
      name: 'assessment_completed',
      params: {
        assessment_slug: 'resilience-wheel',
        tier: 'foundation_strong',
        duration_seconds: 215,
      },
    })
    expect(gtag).toHaveBeenCalledWith('event', 'assessment_completed', {
      assessment_slug: 'resilience-wheel',
      tier: 'foundation_strong',
      duration_seconds: 215,
    })
  })

  it('handles assessment_submitted', () => {
    const gtag = stubGtag()
    track({
      name: 'assessment_submitted',
      params: {
        assessment_slug: 'support-matrix',
        tier: 'champion_misalignment',
        duration_seconds: 340,
      },
    })
    expect(gtag).toHaveBeenCalledWith('event', 'assessment_submitted', {
      assessment_slug: 'support-matrix',
      tier: 'champion_misalignment',
      duration_seconds: 340,
    })
  })

  it('handles archetype_clicked with rank', () => {
    const gtag = stubGtag()
    track({
      name: 'archetype_clicked',
      params: {
        archetype_id: 'archetype-asked-to-lead-ai',
        assessment_slug: 'coaching-readiness',
        rank: 0,
      },
    })
    expect(gtag).toHaveBeenCalledWith('event', 'archetype_clicked', {
      archetype_id: 'archetype-asked-to-lead-ai',
      assessment_slug: 'coaching-readiness',
      rank: 0,
    })
  })

  it('handles directory_clicked', () => {
    const gtag = stubGtag()
    track({
      name: 'directory_clicked',
      params: { assessment_slug: 'success-definition-audit' },
    })
    expect(gtag).toHaveBeenCalledWith('event', 'directory_clicked', {
      assessment_slug: 'success-definition-audit',
    })
  })

  it('swallows errors thrown by gtag (never propagates to caller)', () => {
    const gtag = vi.fn(() => {
      throw new Error('gtag exploded')
    })
    ;(window as unknown as { gtag?: unknown }).gtag = gtag

    // The track() call must not throw, even though gtag does.
    expect(() =>
      track({
        name: 'assessment_started',
        params: { assessment_slug: 'coaching-readiness' },
      })
    ).not.toThrow()
    expect(gtag).toHaveBeenCalledTimes(1)
  })

  it('does nothing when gtag is set to a non-function value', () => {
    // Defensive: someone might assign a string or object to window.gtag
    ;(window as unknown as { gtag?: unknown }).gtag = 'not a function'
    expect(() =>
      track({
        name: 'assessment_started',
        params: { assessment_slug: 'coaching-readiness' },
      })
    ).not.toThrow()
  })
})

// ── getMeasurementId() ──────────────────────────────────────────────────

describe('getMeasurementId()', () => {
  beforeEach(() => {
    clearMeasurementId()
  })
  afterEach(() => {
    clearMeasurementId()
  })

  it('returns null when no measurement ID is set', () => {
    expect(getMeasurementId()).toBe(null)
  })

  it('returns the env var value when set', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-ABC123'
    expect(getMeasurementId()).toBe('G-ABC123')
  })

  it('returns null when env var is an empty string', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ''
    expect(getMeasurementId()).toBe(null)
  })

  it('returns null when env var is whitespace only', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = '   '
    expect(getMeasurementId()).toBe(null)
  })

  it('trims surrounding whitespace from the env var', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = '  G-ABC123  '
    expect(getMeasurementId()).toBe('G-ABC123')
  })

  it('prefers window.__FAB_GA_ID__ over env var (test override)', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-FROM-ENV'
    ;(window as unknown as { __FAB_GA_ID__?: string }).__FAB_GA_ID__ =
      'G-FROM-WINDOW'
    expect(getMeasurementId()).toBe('G-FROM-WINDOW')
  })
})

// ── EVENT TYPE CONTRACT ─────────────────────────────────────────────────

describe('AnalyticsEvent type contract', () => {
  it('enforces event name + params shape at compile time', () => {
    // These should all compile. If a future commit changes the
    // contract, this test acts as a small canary for the at-runtime
    // expectations even though the real test is the TypeScript build.
    const events: AnalyticsEvent[] = [
      {
        name: 'assessment_started',
        params: { assessment_slug: 'x' },
      },
      {
        name: 'assessment_completed',
        params: { assessment_slug: 'x', tier: 't', duration_seconds: 1 },
      },
      {
        name: 'assessment_submitted',
        params: { assessment_slug: 'x', tier: 't', duration_seconds: 1 },
      },
      {
        name: 'archetype_clicked',
        params: { archetype_id: 'a', assessment_slug: 'x', rank: 0 },
      },
      {
        name: 'directory_clicked',
        params: { assessment_slug: 'x' },
      },
    ]
    expect(events).toHaveLength(5)
  })
})

// ── CONSENT GATE ────────────────────────────────────────────────────────

describe('track() consent gate', () => {
  beforeEach(() => {
    clearGtag()
    clearConsentInStorage()
  })
  afterEach(() => {
    clearGtag()
    clearConsentInStorage()
  })

  it('does NOT call gtag when consent is unknown (no decision yet)', () => {
    const gtag = stubGtag()
    // Consent is 'unknown' by default — no storage entry exists
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'coaching-readiness' },
    })
    expect(gtag).not.toHaveBeenCalled()
  })

  it('does NOT call gtag when consent is denied', () => {
    const gtag = stubGtag()
    denyConsentInStorage()
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'coaching-readiness' },
    })
    expect(gtag).not.toHaveBeenCalled()
  })

  it('DOES call gtag when consent is granted', () => {
    const gtag = stubGtag()
    grantConsentInStorage()
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'coaching-readiness' },
    })
    expect(gtag).toHaveBeenCalledTimes(1)
  })

  it('consent gate respects revocation: granted → denied stops new events', () => {
    const gtag = stubGtag()
    grantConsentInStorage()
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'a' },
    })
    expect(gtag).toHaveBeenCalledTimes(1)

    denyConsentInStorage()
    track({
      name: 'assessment_started',
      params: { assessment_slug: 'b' },
    })
    // Still 1 — the second call was blocked by the gate
    expect(gtag).toHaveBeenCalledTimes(1)
  })
})
