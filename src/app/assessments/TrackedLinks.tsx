'use client'

/**
 * Click-tracking wrappers for the /assessments index page.
 *
 * The page itself is a server component (fetches Sanity data, returns
 * JSX). Adding `onClick` handlers would require turning it into a
 * client component, which means losing the server-side data fetch.
 * Instead, these small client components handle just the click event;
 * the page renders them with the right props.
 *
 * Two flavours:
 *   - ArchetypeRecLink — for the recommendations inside an archetype
 *     tile. Fires `archetype_clicked` with the archetype id + rank
 *     (0 = "Start here", 1+ = "Also worth considering").
 *   - DirectoryCardLink — for the directory cards. Fires
 *     `directory_clicked` with just the assessment slug.
 *
 * The tracked event fires synchronously on click; navigation happens
 * via the standard Link behaviour right after. There's no `await` —
 * if the analytics call somehow blocks (it shouldn't, since `track()`
 * just pushes onto dataLayer), navigation still proceeds.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

interface ArchetypeRecLinkProps {
  archetypeId: string
  assessmentSlug: string
  rank: number
  className?: string
  children: ReactNode
}

export function ArchetypeRecLink({
  archetypeId,
  assessmentSlug,
  rank,
  className,
  children,
}: ArchetypeRecLinkProps) {
  return (
    <Link
      href={`/assessments/${assessmentSlug}`}
      className={className}
      onClick={() => {
        track({
          name: 'archetype_clicked',
          params: {
            archetype_id: archetypeId,
            assessment_slug: assessmentSlug,
            rank,
          },
        })
      }}
    >
      {children}
    </Link>
  )
}

interface DirectoryCardLinkProps {
  assessmentSlug: string
  className?: string
  children: ReactNode
}

export function DirectoryCardLink({
  assessmentSlug,
  className,
  children,
}: DirectoryCardLinkProps) {
  return (
    <Link
      href={`/assessments/${assessmentSlug}`}
      className={className}
      onClick={() => {
        track({
          name: 'directory_clicked',
          params: { assessment_slug: assessmentSlug },
        })
      }}
    >
      {children}
    </Link>
  )
}
