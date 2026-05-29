'use client'

/**
 * CookieConsentBanner — bottom-right consent prompt for analytics.
 *
 * Renders only when consent state is 'unknown'. Two buttons of equal
 * visual weight (per GDPR's "reject must be as easy as accept" rule),
 * a one-line explanation, and a link to the privacy policy page.
 *
 * Style:
 *   - Cream card on the dark teal site background, picking up the
 *     existing palette (no new colours introduced)
 *   - Georgia serif default (the site font) for the body, system sans
 *     for the buttons so they read as actionable controls
 *   - Bottom-right rather than full-width sticky bottom — the latter
 *     covers content and feels intrusive; the corner placement is
 *     present without obstructing
 *   - max-width: 360px so the message stays readable on desktop, and
 *     responsive scaling on mobile (it occupies a corner there too,
 *     adjusted for thumb reach)
 *   - Subtle box-shadow to lift it off the page background
 *
 * Behaviour:
 *   - SSR-safe: returns null on the server (consent is 'unknown'
 *     there but we don't want the banner flashing before hydration
 *     even reads the persisted value)
 *   - On mount, waits for the consent hook to reconcile with
 *     localStorage. If the user previously decided, the banner stays
 *     hidden. If they're new, banner appears
 *   - Accept → grants consent, banner hides, GA component reacts
 *   - Reject → denies consent, banner hides, GA stays unloaded
 *   - Esc key dismisses the banner WITHOUT setting state — i.e.
 *     treats it as "ask me later" so the user isn't penalised by
 *     accidentally hitting Esc. The banner reappears on next visit
 *
 * The privacy policy link is hardcoded to /privacy — placeholder page
 * provided alongside this banner. If Russell moves the privacy policy
 * elsewhere, change the href here.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useConsent } from '@/lib/consent'

export function CookieConsentBanner() {
  const { consent, grant, deny } = useConsent()
  const [mounted, setMounted] = useState(false)
  // "Dismissed for this session" — not persisted, just hides the
  // banner if the user Esc-presses. State resets on next page load.
  const [dismissedThisSession, setDismissedThisSession] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissedThisSession(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!mounted) return null
  if (consent !== 'unknown') return null
  if (dismissedThisSession) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="consent-banner-body"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        maxWidth: 360,
        zIndex: 1000,
        background: '#f5f0eb',
        color: '#1a1a1a',
        border: '1px solid #d6cbb8',
        borderRadius: 4,
        padding: '20px 22px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <p
        id="consent-banner-body"
        style={{ margin: '0 0 14px 0' }}
      >
        Fab Partners would like to use Google Analytics to understand
        which assessments are useful and which aren&rsquo;t. No personal
        information is sent and your email is never tracked. You can
        change your mind any time.{' '}
        <Link
          href="/privacy"
          style={{ color: '#0F4C5C', textDecoration: 'underline' }}
        >
          Read the privacy notice
        </Link>
        .
      </p>
      <div
        style={{
          display: 'flex',
          gap: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        <button
          type="button"
          onClick={grant}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#0d2b2e',
            color: '#f5f0eb',
            border: 'none',
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Accept analytics
        </button>
        <button
          type="button"
          onClick={deny}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'transparent',
            color: '#0d2b2e',
            border: '1px solid #0d2b2e',
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
