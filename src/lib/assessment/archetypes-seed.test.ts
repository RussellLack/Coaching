/**
 * Tests for the archetype seed NDJSON.
 *
 * Confirms structural correctness:
 *   - Each archetype has the required fields.
 *   - Each archetype recommends 2 or 3 assessments.
 *   - All assessment references point at known assessment IDs (resolved
 *     by reading the assessment NDJSON files in the same folder).
 *   - Every live assessment is recommended by at least one archetype
 *     (so no one ends up orphaned on the assessments-index page).
 *
 * These tests run against the static seed files, not Sanity itself, so
 * they're fast and don't require network. They're the equivalent of
 * link-checking the page before it ships.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SEED_DIR = join(__dirname, '../../../seed')

interface ArchetypeDoc {
  _type: 'archetype'
  _id: string
  title: string
  displayTitle?: string
  slug: { _type: 'slug'; current: string }
  situation: unknown[]
  recommendations: {
    _key: string
    assessment: { _type: 'reference'; _ref: string }
    rationale: string
  }[]
  orderInList: number
  isDraft?: boolean
}

interface AssessmentDoc {
  _type: 'assessment'
  _id: string
  slug: { current: string }
  displayTitle: string
}

function loadArchetypes(): ArchetypeDoc[] {
  const content = readFileSync(join(SEED_DIR, 'archetypes.ndjson'), 'utf-8')
  return content
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as ArchetypeDoc)
}

function loadAssessmentIds(): Set<string> {
  const ids = new Set<string>()
  for (const f of readdirSync(SEED_DIR)) {
    if (!f.startsWith('assessment-') || !f.endsWith('.ndjson')) continue
    const content = readFileSync(join(SEED_DIR, f), 'utf-8')
    for (const line of content.trim().split('\n')) {
      const doc = JSON.parse(line) as { _type?: string; _id?: string }
      if (doc._type === 'assessment' && doc._id) ids.add(doc._id)
    }
  }
  return ids
}

describe('Archetype seed NDJSON — structure', () => {
  const archetypes = loadArchetypes()

  it('contains exactly six archetypes', () => {
    expect(archetypes).toHaveLength(6)
  })

  it('every archetype has the required fields', () => {
    for (const a of archetypes) {
      expect(a._id).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.slug?.current).toBeTruthy()
      expect(Array.isArray(a.situation)).toBe(true)
      expect(a.situation.length).toBeGreaterThan(0)
      expect(Array.isArray(a.recommendations)).toBe(true)
      expect(typeof a.orderInList).toBe('number')
    }
  })

  it('every archetype recommends 2 or 3 assessments', () => {
    for (const a of archetypes) {
      expect(a.recommendations.length).toBeGreaterThanOrEqual(2)
      expect(a.recommendations.length).toBeLessThanOrEqual(3)
    }
  })

  it('every recommendation has a rationale and a reference', () => {
    for (const a of archetypes) {
      for (const r of a.recommendations) {
        expect(r.rationale).toBeTruthy()
        expect(r.rationale.length).toBeGreaterThan(20)
        expect(r.rationale.length).toBeLessThanOrEqual(320)
        expect(r.assessment?._ref).toBeTruthy()
      }
    }
  })

  it('orderInList values are unique', () => {
    const orders = archetypes.map((a) => a.orderInList)
    const unique = new Set(orders)
    expect(unique.size).toBe(orders.length)
  })

  it('slugs are unique', () => {
    const slugs = archetypes.map((a) => a.slug.current)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })
})

describe('Archetype seed NDJSON — references resolve', () => {
  const archetypes = loadArchetypes()
  const knownAssessmentIds = loadAssessmentIds()

  it('every recommended assessment exists in the seed files', () => {
    for (const a of archetypes) {
      for (const r of a.recommendations) {
        expect(
          knownAssessmentIds.has(r.assessment._ref),
          `Archetype ${a._id} references unknown assessment ${r.assessment._ref}`
        ).toBe(true)
      }
    }
  })

  it('every live assessment is recommended by at least one archetype', () => {
    const recommendedIds = new Set<string>()
    for (const a of archetypes) {
      for (const r of a.recommendations) {
        recommendedIds.add(r.assessment._ref)
      }
    }
    const orphaned: string[] = []
    for (const id of knownAssessmentIds) {
      if (!recommendedIds.has(id)) orphaned.push(id)
    }
    expect(
      orphaned,
      `Assessments not recommended by any archetype: ${orphaned.join(', ')}`
    ).toEqual([])
  })
})

describe('Archetype seed NDJSON — content quality', () => {
  const archetypes = loadArchetypes()

  it('every archetype has a situation description with substantive text', () => {
    for (const a of archetypes) {
      const text = a.situation
        .map((b) => {
          const block = b as { children?: { text: string }[] }
          return (block.children ?? []).map((c) => c.text).join('')
        })
        .join(' ')
      expect(
        text.length,
        `Archetype ${a._id} situation is too short`
      ).toBeGreaterThan(80)
    }
  })

  it('every rationale is substantive (>40 chars)', () => {
    for (const a of archetypes) {
      for (const r of a.recommendations) {
        expect(
          r.rationale.length,
          `Archetype ${a._id} rec rationale too short`
        ).toBeGreaterThan(40)
      }
    }
  })
})

describe('Assessments index settings seed NDJSON', () => {
  it('parses and has required hero fields', () => {
    const content = readFileSync(
      join(SEED_DIR, 'assessments-index-settings.ndjson'),
      'utf-8'
    )
    const doc = JSON.parse(content.trim()) as {
      _type: string
      _id: string
      heroHeadline: string
      heroIntro: unknown[]
      archetypesHeading: string
      directoryHeading: string
    }
    expect(doc._type).toBe('assessmentsIndexSettings')
    expect(doc._id).toBe('assessmentsIndexSettings')
    expect(doc.heroHeadline).toBeTruthy()
    expect(Array.isArray(doc.heroIntro)).toBe(true)
    expect(doc.heroIntro.length).toBeGreaterThan(0)
    expect(doc.archetypesHeading).toBeTruthy()
    expect(doc.directoryHeading).toBeTruthy()
  })
})
