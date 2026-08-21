/**
 * Locale configuration.
 *
 * English is deliberately unprefixed: fab.partners stays at `/`, and the
 * other languages live at `/nb`, `/sv`, `/da`. That keeps every URL that
 * is already indexed exactly where it is — a prefix for English would
 * have redirected the entire existing site.
 *
 * Norwegian is Bokmål only. Nynorsk is a separate written standard and
 * is not served by this audience.
 */

export const LOCALES = ['en', 'nb', 'sv', 'da'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** The three that carry a URL prefix — everything except the default. */
export const PREFIXED_LOCALES = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE
) as Exclude<Locale, 'en'>[]

/** Endonyms: each language named the way its own speakers name it. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  nb: 'Norsk',
  sv: 'Svenska',
  da: 'Dansk',
}

/** Value for the <html lang> attribute and hreflang annotations. */
export const HTML_LANG: Record<Locale, string> = {
  en: 'en-GB',
  nb: 'nb-NO',
  sv: 'sv-SE',
  da: 'da-DK',
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Path for a route in a given locale. `route` is the locale-independent
 * path, e.g. '/' or '/assessments'.
 */
export function localePath(locale: Locale, route = '/'): string {
  const clean = route === '/' ? '' : route.replace(/\/$/, '')
  if (locale === DEFAULT_LOCALE) return clean || '/'
  return `/${locale}${clean}`
}

/** Strip a locale prefix off a pathname, returning the bare route. */
export function stripLocale(pathname: string): {
  locale: Locale
  route: string
} {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/)
  if (match && isLocale(match[1]) && match[1] !== DEFAULT_LOCALE) {
    return { locale: match[1], route: match[2] || '/' }
  }
  return { locale: DEFAULT_LOCALE, route: pathname || '/' }
}
