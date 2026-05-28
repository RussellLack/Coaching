/**
 * Tests for the consent module (`src/lib/consent.ts`).
 *
 * What we care about:
 *   - readPersistedConsent() returns 'unknown' on SSR (no window) and
 *     falls back to 'unknown' for corrupted values.
 *   - writePersistedConsent() persists + dispatches the change event.
 *   - isAnalyticsAllowed() returns true ONLY for 'granted'.
 *   - 'unknown' is also written by passing 'unknown' to clear the key
 *     (used by reset()).
 *
 * We don't unit-test the useConsent() hook here — that's covered
 * indirectly by the GoogleAnalytics component tests and any banner
 * component test, both of which exercise the hook end-to-end. The
 * pure helpers carry the behaviour that matters.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest'
import {
  readPersistedConsent,
  writePersistedConsent,
  isAnalyticsAllowed,
  CONSENT_STORAGE_KEY,
  CONSENT_CHANGE_EVENT,
} from './consent'

// ── DOM SHIM ────────────────────────────────────────────────────────────

interface MinimalWindow {
  localStorage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
  dispatchEvent: (event: Event) => boolean
  addEventListener?: (type: string, listener: EventListener) => void
  removeEventListener?: (type: string, listener: EventListener) => void
}

const ORIGINAL_WINDOW: unknown = (globalThis as unknown as { window?: unknown })
  .window

const STORAGE: Map<string, string> = new Map()
const dispatched: Event[] = []

const minimalLocalStorage = {
  getItem: (key: string) => (STORAGE.has(key) ? STORAGE.get(key)! : null),
  setItem: (key: string, value: string) => {
    STORAGE.set(key, value)
  },
  removeItem: (key: string) => {
    STORAGE.delete(key)
  },
}

beforeAll(() => {
  ;(globalThis as unknown as { window: MinimalWindow }).window = {
    localStorage: minimalLocalStorage,
    dispatchEvent: (event: Event) => {
      dispatched.push(event)
      return true
    },
  }
  // CustomEvent shim — vitest's node environment doesn't have it.
  if (typeof globalThis.CustomEvent === 'undefined') {
    class CustomEventShim<T> extends Event {
      detail: T
      constructor(type: string, init?: { detail: T }) {
        super(type)
        this.detail = (init?.detail as T) ?? (undefined as unknown as T)
      }
    }
    ;(globalThis as unknown as { CustomEvent: typeof CustomEventShim }).CustomEvent =
      CustomEventShim
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
  STORAGE.clear()
  dispatched.length = 0
})

afterEach(() => {
  STORAGE.clear()
})

// ── readPersistedConsent ────────────────────────────────────────────────

describe('readPersistedConsent', () => {
  it('returns "unknown" when nothing is stored', () => {
    expect(readPersistedConsent()).toBe('unknown')
  })

  it('returns "granted" when "granted" is stored', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
    expect(readPersistedConsent()).toBe('granted')
  })

  it('returns "denied" when "denied" is stored', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    expect(readPersistedConsent()).toBe('denied')
  })

  it('returns "unknown" for any unrecognised value', () => {
    // Defensive: corrupted value, future-format value, or someone
    // poking at localStorage with the wrong key.
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'maybe')
    expect(readPersistedConsent()).toBe('unknown')
  })

  it('returns "unknown" when localStorage throws', () => {
    // Simulate private-browsing quota errors.
    const win = (globalThis as unknown as { window: MinimalWindow }).window
    const originalStorage = win.localStorage
    win.localStorage = {
      getItem: () => {
        throw new Error('Storage quota exceeded')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    try {
      expect(readPersistedConsent()).toBe('unknown')
    } finally {
      win.localStorage = originalStorage
    }
  })
})

// ── writePersistedConsent ───────────────────────────────────────────────

describe('writePersistedConsent', () => {
  it('persists "granted" to localStorage', () => {
    writePersistedConsent('granted')
    expect(minimalLocalStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
  })

  it('persists "denied" to localStorage', () => {
    writePersistedConsent('denied')
    expect(minimalLocalStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied')
  })

  it('removes the key when writing "unknown" (used by reset)', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
    writePersistedConsent('unknown')
    expect(minimalLocalStorage.getItem(CONSENT_STORAGE_KEY)).toBe(null)
  })

  it('dispatches a CONSENT_CHANGE_EVENT with the new state', () => {
    writePersistedConsent('granted')
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].type).toBe(CONSENT_CHANGE_EVENT)
    const detail = (dispatched[0] as unknown as { detail: { consent: string } })
      .detail
    expect(detail.consent).toBe('granted')
  })

  it('still dispatches the event when localStorage write fails', () => {
    const win = (globalThis as unknown as { window: MinimalWindow }).window
    const originalStorage = win.localStorage
    win.localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Storage write failed')
      },
      removeItem: () => {},
    }
    try {
      writePersistedConsent('granted')
      // The dispatch still happens — in-memory state isn't stuck just
      // because storage broke
      expect(dispatched).toHaveLength(1)
    } finally {
      win.localStorage = originalStorage
    }
  })
})

// ── isAnalyticsAllowed ──────────────────────────────────────────────────

describe('isAnalyticsAllowed', () => {
  it('returns false when consent is unknown', () => {
    expect(isAnalyticsAllowed()).toBe(false)
  })

  it('returns false when consent is denied', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    expect(isAnalyticsAllowed()).toBe(false)
  })

  it('returns true when consent is granted', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
    expect(isAnalyticsAllowed()).toBe(true)
  })

  it('returns false for corrupted storage values', () => {
    minimalLocalStorage.setItem(CONSENT_STORAGE_KEY, 'yes please')
    expect(isAnalyticsAllowed()).toBe(false)
  })
})

// ── ROUND-TRIP ──────────────────────────────────────────────────────────

describe('round-trip', () => {
  it('write then read returns the same state', () => {
    writePersistedConsent('granted')
    expect(readPersistedConsent()).toBe('granted')

    writePersistedConsent('denied')
    expect(readPersistedConsent()).toBe('denied')

    writePersistedConsent('unknown')
    expect(readPersistedConsent()).toBe('unknown')
  })
})
