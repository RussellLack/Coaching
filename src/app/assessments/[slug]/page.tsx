import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { client } from '@/sanity/lib/client'
import {
  ASSESSMENT_BY_SLUG_QUERY,
  ASSESSMENT_SEO_QUERY,
  ASSESSMENT_SLUGS_QUERY,
  SITE_SETTINGS_QUERY,
} from '@/sanity/lib/queries'
import { AssessmentEngine } from '@/components/assessment/AssessmentEngine'
import type { Assessment } from '@/types/assessment'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Static generation — one route per live assessment. Uses the API
 * directly (not CDN) so freshly-published assessments don't 404 at
 * build time.
 */
export async function generateStaticParams() {
  const slugs = await client
    .withConfig({ useCdn: false })
    .fetch(ASSESSMENT_SLUGS_QUERY)
  return slugs.map((s: { slug: string | null }) => ({ slug: s.slug! }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await client.fetch(ASSESSMENT_SEO_QUERY, { slug })
  if (!data) return {}
  return {
    title: data.seoTitle ?? data.displayTitle,
    description: data.seoDescription ?? data.tagline ?? undefined,
  }
}

export default async function AssessmentPage({ params }: PageProps) {
  const { slug } = await params

  const [assessment, settings] = await Promise.all([
    client.fetch(ASSESSMENT_BY_SLUG_QUERY, { slug }),
    client.fetch(SITE_SETTINGS_QUERY),
  ])

  if (!assessment) notFound()

  return (
    <main className="min-h-screen">
      <AssessmentEngine
        assessment={assessment as Assessment}
        defaultWebformEndpoint={settings?.defaultWebformEndpoint ?? undefined}
      
          bookingUrl={settings?.defaultCalendarUrl ?? `mailto:${settings?.bookingEmail ?? ''}`}
        />
    </main>
  )
}
