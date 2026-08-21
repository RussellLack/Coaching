import { client } from '@/lib/sanity'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config'

/**
 * Homepage content from Sanity, resolved to a single language.
 *
 * Each field is read through a three-step coalesce:
 *
 *   1. field[$lang]  — the requested translation
 *   2. field.en      — English, when that translation is missing
 *   3. field         — the field itself, when it is still a plain string
 *
 * Step 3 is what makes the rollout safe. Translated fields and
 * not-yet-migrated fields both resolve correctly, so this code can ship
 * before the content migration runs without a window where the site
 * renders "[object Object]". It is worth keeping permanently: any
 * document created before the migration, or restored from an old
 * backup, still renders.
 */

const loc = (field: string) =>
  `"${field}": coalesce(${field}[$lang], ${field}.en, ${field})`

const HERO = `*[_type == "hero"][0]{
  ${loc('headline')},
  ${loc('subheadline')},
  ${loc('body')},
  ${loc('ctaLabel')}
}`

const SITE_SETTINGS = `*[_type == "siteSettings"][0]{
  bookingEmail,
  defaultCalendarUrl,
  scanPrice,
  ${loc('tagline')},
  "title": coalesce(title.en, title)
}`

const HUMAN_VALUES = `*[_type == "humanValue"] | order(order asc){
  order,
  ${loc('title')},
  ${loc('body')}
}`

const JOURNEYS = `*[_type == "journey"] | order(order asc){
  order,
  ${loc('title')},
  ${loc('description')}
}`

export async function getHomeData(locale: Locale) {
  const params = { lang: locale ?? DEFAULT_LOCALE }
  const [siteSettings, hero, humanValues, journeys] = await Promise.all([
    client.fetch(SITE_SETTINGS, params),
    client.fetch(HERO, params),
    client.fetch(HUMAN_VALUES, params),
    client.fetch(JOURNEYS, params),
  ])
  return { siteSettings, hero, humanValues, journeys }
}
