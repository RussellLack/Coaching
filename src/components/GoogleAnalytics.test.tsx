/**
 * Tests for the GoogleAnalytics component.
 *
 * The component itself is a thin wrapper that uses React state to
 * subscribe to consent changes. The interesting logic — "should we
 * render gtag right now?" — is extracted into `shouldRenderGtag()`,
 * which we test directly.
 *
 * Coverage:
 *   - No measurement ID → returns null
 *   - Measurement ID + consent unknown → returns null
 *   - Measurement ID + consent denied → returns null
 *   - Measurement ID + consent granted → returns { measurementId }
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { shouldRenderGtag } from './GoogleAnalytics'

interface MinimalWindow {
  __FAB_GA_ID__?: string
  localStorage?: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
}

const ORIGINAL_WINDOW: unknown = (globalThis as unknown as { window?: unknown })
  .window

const STORAGE: Map<string, string> = new Map()

beforeAll(() => {
  ;(globalThis as unknown as { window: MinimalWindow }).window = {
    localStorage: {
      getItem: (k) => (STORAGE.has(k) ? STORAGE.get(k)! : null),
      setItem: (k, v) => STORAGE.set(k, v),
      removeItem: (k) => STORAGE.delete(k),
    },
  }
})

afterAll(() => {
  if (ORIGINAL_WINDOW === undefined) {
    delete (globalThis as unknown as { window?: unknown }).window
  } else {
    ;(globalThis as unknown as { window: unknown }).window = ORIGINAL_WINDOW
  }
})

beforeEach(() => {
  delete (window as unknown as MinimalWindow).__FAB_GA_ID__
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  STORAGE.clear()
})

function setMeasurementId(id: string) {
  ;(window as unknown as MinimalWindow).__FAB_GA_ID__ = id
}

function grantConsent() {
  STORAGE.set('fab-partners-consent-v1', 'granted')
}

function denyConsent() {
  STORAGE.set('fab-partners-consent-v1', 'denied')
}

// ── shouldRenderGtag ────────────────────────────────────────────────────

describe('shouldRenderGtag', () => {
  it('returns null when no measurement ID is set', () => {
    grantConsent() // even with consent
    expect(shouldRenderGtag()).toBe(null)
  })

  it('returns null when measurement ID is set but consent is unknown', () => {
    setMeasurementId('G-TEST123')
    // No consent decision yet
    expect(shouldRenderGtag()).toBe(null)
  })

  it('returns null when measurement ID is set but consent is denied', () => {
    setMeasurementId('G-TEST123')
    denyConsent()
    expect(shouldRenderGtag()).toBe(null)
  })

  it('returns the measurement ID when both ID is set AND consent is granted', () => {
    setMeasurementId('G-TEST123')
    grantConsent()
    const result = shouldRenderGtag()
    expect(result).not.toBe(null)
    expect(result?.measurementId).toBe('G-TEST123')
  })

  it('respects revocation: granted → denied returns null again', () => {
    setMeasurementId('G-TEST123')
    grantConsent()
    expect(shouldRenderGtag()).not.toBe(null)
    denyConsent()
    expect(shouldRenderGtag()).toBe(null)
  })
})
