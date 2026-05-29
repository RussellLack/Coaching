/**
 * Validation tests for the cross-combination seed NDJSON.
 *
 * Confirms structural correctness:
 *   - Each combination has the required fields.
 *   - Each combination's requirements reference assessments that exist.
 *   - Tier ids and interpretation key prefixes referenced in
 *     requirements are plausible (we can't fully validate them without
 *     loading every assessment NDJSON, but we can check the shape).
 *   - The email body has enough content to be a credible coaching note.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SEED_DIR = join(__dirname, '../../../seed')

interface CombinationDoc {
  _type: 'crossCombination'
  _id: string
  title: string
  slug: { _type: 'slug'; current: string }
  rationale: string
  requirements: {
    _key: string
    assessmentSlug: string
    anyOfTiers?: string[]
    anyOfInterpretationKeys?: string[]
  }[]
  emailSubject: string
  emailBody: unknown[]
  ctaLabel?: string
  ctaHref?: string
  isActive: boolean
  orderInList: number
}

function loadCombinations(): CombinationDoc[] {
  const content = readFileSync(
    join(SEED_DIR, 'cross-combinations.ndjson'),
    'utf-8'
  )
  return content
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as CombinationDoc)
}

function loadAssessmentSlugs(): Set<string> {
  const slugs = new Set<string>()
  for (const f of readdirSync(SEED_DIR)) {
    if (!f.startsWith('assessment-') || !f.endsWith('.ndjson')) continue
    const content = readFileSync(join(SEED_DIR, f), 'utf-8')
    for (const line of content.trim().split('\n')) {
      const doc = JSON.parse(line) as {
        _type?: string
        slug?: { current?: string }
      }
      if (doc._type === 'assessment' && doc.slug?.current) {
        slugs.add(doc.slug.current)
      }
    }
  }
  return slugs
}

describe('Cross-combination seed NDJSON — structure', () => {
  const combinations = loadCombinations()

  it('contains at least two combinations', () => {
    expect(combinations.length).toBeGreaterThanOrEqual(2)
  })

  it('every combination has the required top-level fields', () => {
    for (const c of combinations) {
      expect(c._id).toBeTruthy()
      expect(c.title).toBeTruthy()
      expect(c.slug?.current).toBeTruthy()
      expect(c.rationale.length).toBeGreaterThan(50)
      expect(Array.isArray(c.requirements)).toBe(true)
      expect(c.emailSubject).toBeTruthy()
      expect(Array.isArray(c.emailBody)).toBe(true)
      expect(typeof c.isActive).toBe('boolean')
      expect(typeof c.orderInList).toBe('number')
    }
  })

  it('every combination has at least two requirements', () => {
    for (const c of combinations) {
      expect(c.requirements.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every requirement has an assessment slug and at least one match criterion', () => {
    for (const c of combinations) {
      for (const r of c.requirements) {
        expect(r._key).toBeTruthy()
        expect(r.assessmentSlug).toBeTruthy()
        const hasTiers = (r.anyOfTiers ?? []).length > 0
        const hasKeys = (r.anyOfInterpretationKeys ?? []).length > 0
        expect(
          hasTiers || hasKeys,
          `Combination ${c._id} requirement on ${r.assessmentSlug} has no match criteria`
        ).toBe(true)
      }
    }
  })

  it('orderInList values are unique', () => {
    const orders = combinations.map((c) => c.orderInList)
    const unique = new Set(orders)
    expect(unique.size).toBe(orders.length)
  })

  it('slugs are unique', () => {
    const slugs = combinations.map((c) => c.slug.current)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })
})

describe('Cross-combination seed NDJSON — references resolve', () => {
  const combinations = loadCombinations()
  const knownSlugs = loadAssessmentSlugs()

  it('every requirement references a known assessment', () => {
    for (const c of combinations) {
      for (const r of c.requirements) {
        expect(
          knownSlugs.has(r.assessmentSlug),
          `Combination ${c._id} references unknown assessment slug "${r.assessmentSlug}"`
        ).toBe(true)
      }
    }
  })

  it('requirements reference distinct assessments within a combination', () => {
    // Best practice — a combination shouldn't have two requirements both
    // pointing at the same assessment. If we ever need to express "this
    // assessment with two different conditions", that's an AND inside a
    // single requirement, not two requirements.
    for (const c of combinations) {
      const slugs = c.requirements.map((r) => r.assessmentSlug)
      const unique = new Set(slugs)
      expect(unique.size).toBe(slugs.length)
    }
  })
})

describe('Cross-combination seed NDJSON — content quality', () => {
  const combinations = loadCombinations()

  it('every email body has substantive paragraphs', () => {
    for (const c of combinations) {
      expect(c.emailBody.length).toBeGreaterThanOrEqual(3)
      const totalText = c.emailBody
        .map((b) => {
          const block = b as { children?: { text?: string }[] }
          return (block.children ?? []).map((s) => s.text ?? '').join('')
        })
        .join(' ')
      expect(totalText.length).toBeGreaterThan(400)
    }
  })

  it('email subjects are short enough for inbox preview', () => {
    for (const c of combinations) {
      expect(c.emailSubject.length).toBeLessThanOrEqual(120)
    }
  })

  it('every combination has a rationale that explains why it exists', () => {
    for (const c of combinations) {
      expect(c.rationale.length).toBeGreaterThan(80)
    }
  })

  it('CTA href and label are either both set or both absent', () => {
    for (const c of combinations) {
      const hasLabel = !!c.ctaLabel && c.ctaLabel.length > 0
      const hasHref = !!c.ctaHref && c.ctaHref.length > 0
      expect(
        hasLabel === hasHref,
        `Combination ${c._id} has mismatched CTA: label=${hasLabel} href=${hasHref}`
      ).toBe(true)
    }
  })
})

describe('Cross-combination seed NDJSON — known seeded combinations', () => {
  const combinations = loadCombinations()

  it('includes the AI over-trust combination', () => {
    const found = combinations.find((c) => c.slug.current === 'ai-overtrust')
    expect(found).toBeDefined()
    // Should require both decision-making-style AND cognitive-distortion-spotter
    const slugs = found?.requirements.map((r) => r.assessmentSlug)
    expect(slugs).toContain('decision-making-style')
    expect(slugs).toContain('cognitive-distortion-spotter')
  })

  it('includes the champion-craft misalignment combination', () => {
    const found = combinations.find(
      (c) => c.slug.current === 'champion-craft-misalignment'
    )
    expect(found).toBeDefined()
    const slugs = found?.requirements.map((r) => r.assessmentSlug)
    expect(slugs).toContain('support-matrix')
    expect(slugs).toContain('success-definition-audit')
  })
})
