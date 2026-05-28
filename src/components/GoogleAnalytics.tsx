'use client'

/**
 * GoogleAnalytics — injects the gtag.js script when (a) a measurement
 * ID is configured AND (b) the user has granted analytics consent.
 *
 * Why this is a client component: the consent state lives in the
 * user's browser (localStorage), so the decision to render the script
 * tags is by definition a client-side one. The previous server-render
 * version always rendered the script when the env var was set,
 * regardless of consent — that's exactly what the compliance approach
 * disallows.
 *
 * Implementation: uses useState/useEffect to read consent and react to
 * changes. The component subscribes to the CONSENT_CHANGE_EVENT so it
 * mounts gtag.js immediately when the user clicks "Accept" without
 * needing a page refresh.
 *
 * To keep this testable without a full React render context, the
 * actual "should I render?" logic is extracted to a pure function
 * `shouldRenderGtag()`. The component is just a thin wrapper around
 * that decision plus the consent subscription.
 *
 * SSR: returns null on the server (consent is always 'unknown' there).
 * Script tags only appear after hydration AND consent === 'granted'.
 *
 * IP anonymisation: GA4 anonymises IP addresses by default (no
 * `anonymize_ip` flag needed). `send_page_view: false` suppresses the
 * auto page-view — App Router doesn't trigger gtag's default page-view
 * tracking anyway, and we fire explicit lifecycle events instead.
 */

import Script from 'next/script'
import { useEffect, useState } from 'react'
import {
  isAnalyticsAllowed,
  CONSENT_CHANGE_EVENT,
} from '@/lib/consent'
import { getMeasurementId } from '@/lib/analytics'

/**
 * Pure decision function: should the gtag scripts render right now?
 *
 * Exported for testability — the component is a thin wrapper, and the
 * decision is what's worth testing. Returns either null (render
 * nothing) or { measurementId } for the caller to use.
 *
 * Reads consent directly from localStorage rather than React state so
 * it can be called from anywhere. The component still uses state to
 * trigger re-renders on consent change.
 */
export function shouldRenderGtag(): { measurementId: string } | null {
  const measurementId = getMeasurementId()
  if (!measurementId) return null
  if (!isAnalyticsAllowed()) return null
  return { measurementId }
}

export function GoogleAnalytics() {
  // The state value isn't read directly — we just use it to force a
  // re-render when the consent event fires. The actual decision is in
  // shouldRenderGtag(), which reads consent fresh each time.
  const [, setTick] = useState(0)

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
  }, [])

  const decision = shouldRenderGtag()
  if (!decision) return null
  const { measurementId } = decision

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
