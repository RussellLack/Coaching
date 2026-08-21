import { notFound } from 'next/navigation'
import HomeClient from '../HomeClient'
import { getHomeData } from '../home-data'
import { DEFAULT_LOCALE, PREFIXED_LOCALES, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { buildAlternates } from '@/i18n/metadata'
import type { Metadata } from 'next'

/**
 * Homepage for the prefixed locales (/nb, /sv, /da).
 *
 * English is served by the unprefixed route so that existing indexed
 * URLs keep working; only these three carry a prefix.
 */

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang) || lang === DEFAULT_LOCALE) return {}
  return { alternates: buildAlternates(lang, '/') }
}

export default async function LocalisedHome({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang) || lang === DEFAULT_LOCALE) notFound()

  const data = await getHomeData(lang)
  return <HomeClient {...data} lang={lang} dict={getDictionary(lang)} />
}
