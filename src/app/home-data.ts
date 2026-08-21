import { client } from '@/lib/sanity'
import type { Locale } from '@/i18n/config'

/**
 * Homepage content from Sanity.
 *
 * `locale` is accepted now and ignored until the Sanity schema carries
 * per-language fields. Wiring it through at this point means the field-
 * level migration only has to change this projection, not every caller.
 */
export async function getHomeData(_locale: Locale) {
  const [siteSettings, hero, humanValues, journeys] = await Promise.all([
    client.fetch(`*[_type == "siteSettings"][0]`),
    client.fetch(`*[_type == "hero"][0]`),
    client.fetch(`*[_type == "humanValue"] | order(order asc)`),
    client.fetch(`*[_type == "journey"] | order(order asc)`),
  ])
  return { siteSettings, hero, humanValues, journeys }
}
