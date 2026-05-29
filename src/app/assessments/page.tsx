import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'

import { client } from '@/sanity/lib/client'
import { ASSESSMENTS_INDEX_PAGE_QUERY } from '@/sanity/lib/queries'
import type {
  Archetype,
  AssessmentDirectoryRow,
  AssessmentsIndexPageData,
  AssessmentsIndexSettings,
} from '@/types/assessment'
import { ArchetypeRecLink, DirectoryCardLink } from './TrackedLinks'

/**
 * /assessments — the archetype-led entry page.
 *
 * Two sections:
 *   1. Archetype tiles. Each tile is a self-contained "is this you?" read,
 *      with 2-3 recommended assessments inline. First recommendation is
 *      framed as "Start here"; the rest as "Also worth considering".
 *   2. Full assessment directory. Shows all six live assessments as cards.
 *      Fallback for visitors who don't see themselves in any archetype,
 *      or who already know which assessment they want.
 *
 * Pure server component. No client-side state, no fetches at runtime.
 *
 * Defensive design: if Sanity has no assessmentsIndexSettings doc yet,
 * the page falls back to sensible defaults rather than 404ing — meaning
 * Russell can deploy the schema and the page works immediately, and add
 * polished copy later.
 */

export async function generateMetadata(): Promise<Metadata> {
  const data = await client.fetch(ASSESSMENTS_INDEX_PAGE_QUERY)
  const settings = data?.settings as AssessmentsIndexSettings | null
  if (!settings) return { title: 'Assessments — fab.partners' }
  return {
    title: settings.seoTitle ?? 'Assessments — fab.partners',
    description: settings.seoDescription ?? undefined,
  }
}

const DEFAULTS = {
  heroHeadline: 'Six assessments. Pick the one that fits where you are.',
  archetypesHeading: 'Where are you right now?',
  directoryHeading: 'Or pick by what you want to look at',
}

export default async function AssessmentsIndexPage() {
  const data = (await client.fetch(
    ASSESSMENTS_INDEX_PAGE_QUERY
  )) as AssessmentsIndexPageData

  const settings = data?.settings
  const archetypes = data?.archetypes ?? []
  const directory = data?.directory ?? []

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:py-20">
      <Hero settings={settings} />

      {archetypes.length > 0 && (
        <section className="mt-16 md:mt-20">
          <h2 className="font-serif text-2xl text-cream md:text-3xl">
            {settings?.archetypesHeading ?? DEFAULTS.archetypesHeading}
          </h2>
          <ul className="mt-8 space-y-8">
            {archetypes.map((archetype) => (
              <li key={archetype._id}>
                <ArchetypeTile archetype={archetype} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {directory.length > 0 && (
        <section className="mt-16 md:mt-20">
          <h2 className="font-serif text-2xl text-cream md:text-3xl">
            {settings?.directoryHeading ?? DEFAULTS.directoryHeading}
          </h2>
          {settings?.directoryIntro && (
            <p className="mt-3 max-w-xl text-base text-cream-muted">
              {settings.directoryIntro}
            </p>
          )}
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {directory.map((a) => (
              <li key={a._id}>
                <DirectoryCard assessment={a} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────

function Hero({ settings }: { settings: AssessmentsIndexSettings | null }) {
  const headline = settings?.heroHeadline ?? DEFAULTS.heroHeadline
  return (
    <header>
      <h1 className="font-serif text-3xl text-cream md:text-5xl">
        {headline}
      </h1>
      {settings?.heroIntro && (
        <div className="fab-prose mt-6">
          <PortableText value={settings.heroIntro} />
        </div>
      )}
    </header>
  )
}

// ── Archetype tile ────────────────────────────────────────────────────

function ArchetypeTile({ archetype }: { archetype: Archetype }) {
  return (
    <article className="rounded-sm border border-teal-mid bg-teal-mid/20 p-6 md:p-8">
      <h3 className="font-serif text-xl text-cream md:text-2xl">
        {archetype.displayTitle || archetype.title}
      </h3>
      {archetype.situation && (
        <div className="fab-prose mt-3 text-base text-cream-muted">
          <PortableText value={archetype.situation} />
        </div>
      )}

      {archetype.recommendations && archetype.recommendations.length > 0 && (
        <ol className="mt-6 space-y-4">
          {archetype.recommendations.map((rec, i) => (
            <li
              key={rec._key}
              className="border-t border-teal-mid/60 pt-4 first:border-t-0 first:pt-0"
            >
              <RecommendationRow
                rec={rec}
                index={i}
                archetypeId={archetype._id}
              />
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

function RecommendationRow({
  rec,
  index,
  archetypeId,
}: {
  rec: import('@/types/assessment').ArchetypeRecommendation
  index: number
  archetypeId: string
}) {
  // The first recommendation is "Start here", the rest are "Also worth
  // considering". The label is shown small and uppercase so the
  // assessment title remains the dominant visual element.
  const label = index === 0 ? 'Start here' : 'Also worth considering'
  return (
    <ArchetypeRecLink
      archetypeId={archetypeId}
      assessmentSlug={rec.assessment.slug}
      rank={index}
      className="group block"
    >
      <p className="sans text-[11px] uppercase tracking-[0.14em] text-cream-dim">
        {label}
      </p>
      <h4 className="mt-1 font-serif text-lg text-cream group-hover:text-coral md:text-xl">
        {rec.assessment.displayTitle}
      </h4>
      <p className="sans mt-2 text-sm leading-snug text-cream-muted">
        {rec.rationale}
      </p>
      {rec.assessment.estimatedMinutes && (
        <p className="sans mt-2 text-xs text-cream-dim">
          About {rec.assessment.estimatedMinutes} minutes.
        </p>
      )}
    </ArchetypeRecLink>
  )
}

// ── Directory card ────────────────────────────────────────────────────

function DirectoryCard({
  assessment,
}: {
  assessment: AssessmentDirectoryRow
}) {
  return (
    <DirectoryCardLink
      assessmentSlug={assessment.slug}
      className="group block h-full rounded-sm border border-teal-mid bg-transparent p-5 transition hover:border-coral"
    >
      <h3 className="font-serif text-lg leading-snug text-cream group-hover:text-coral">
        {assessment.displayTitle}
      </h3>
      {assessment.tagline && (
        <p className="sans mt-2 text-sm leading-snug text-cream-muted">
          {assessment.tagline}
        </p>
      )}
      {assessment.estimatedMinutes && (
        <p className="sans mt-3 text-xs text-cream-dim">
          About {assessment.estimatedMinutes} minutes.
        </p>
      )}
    </DirectoryCardLink>
  )
}
