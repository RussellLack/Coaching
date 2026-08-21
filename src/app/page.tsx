import HomeClient from './HomeClient'
import { getHomeData } from './home-data'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { buildAlternates } from '@/i18n/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: buildAlternates(DEFAULT_LOCALE, '/'),
}

export default async function Home() {
  const data = await getHomeData(DEFAULT_LOCALE)
  return (
    <HomeClient
      {...data}
      lang={DEFAULT_LOCALE}
      dict={getDictionary(DEFAULT_LOCALE)}
    />
  )
}
