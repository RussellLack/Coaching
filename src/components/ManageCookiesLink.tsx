'use client'

/**
 * ManageCookiesLink — a button styled as a text link that re-opens the
 * cookie consent banner by resetting consent state to 'unknown'.
 *
 * Intended for the site footer alongside other meta links. Renders as
 * "Manage cookies" by default but accepts a `label` prop in case
 * Russell wants different copy ("Cookie settings", "Change cookie
 * preferences", etc.).
 *
 * Implementation note: this is a <button>, not an <a>, because there's
 * no URL navigation — only state change. Styled to look like a link
 * for visual consistency with neighbouring footer links.
 *
 * Why a separate component rather than just calling reset() inline:
 * isolates the use-client boundary. Most footers are server components
 * for performance. Embedding this small button doesn't force the whole
 * footer to become client-rendered.
 */

import { useConsent } from '@/lib/consent'

interface Props {
  label?: string
  className?: string
}

export function ManageCookiesLink({
  label = 'Manage cookies',
  className,
}: Props) {
  const { reset } = useConsent()
  return (
    <button
      type="button"
      onClick={reset}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        textDecoration: 'underline',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
