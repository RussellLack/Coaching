import { DEFAULT_LOCALE, HTML_LANG, LOCALES, localePath, type Locale } from './config'
import type { Metadata } from 'next'

/**
 * Canonical + hreflang annotations for one page in one locale.
 *
 * The canonical MUST be the page's own localised URL. Pointing every
 * language at the English URL tells search engines the translations are
 * duplicates of it, and they drop out of the index entirely — which
 * would quietly undo the whole point of translating them.
 *
 * The hreflang set is reciprocal: every locale lists every other, plus
 * an x-default pointing at unprefixed English for visitors whose
 * language we don't serve.
 */
export function buildAlternates(
  locale: Locale,
  route = '/'
): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    languages[HTML_LANG[l]] = localePath(l, route)
  }
  languages['x-default'] = localePath(DEFAULT_LOCALE, route)
  return { canonical: localePath(locale, route), languages }
}
