/**
 * Tests for the /assessments index page component.
 *
 * Approach: the page is an async server component that calls
 * `client.fetch(ASSESSMENTS_INDEX_PAGE_QUERY)` and returns a JSX tree.
 * We mock the Sanity client at the module level (via vi.mock) so the
 * page receives the data we control, then we walk the returned
 * ReactElement tree to confirm:
 *
 *   - The hero headline renders from the settings.
 *   - Each archetype appears as a tile with its recommendations.
 *   - The directory section renders.
 *   - Defensive defaults work when settings is null.
 *   - Falsy-archetype data hides the archetypes section without
 *     crashing the page.
 *
 * No @testing-library/react needed — the page returns a raw React tree
 * and ReactElement objects expose .type, .props, and .props.children,
 * which is enough to verify what the page produced.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import type {
  Archetype,
  AssessmentDirectoryRow,
  AssessmentsIndexPageData,
  AssessmentsIndexSettings,
} from '@/types/assessment'

// ── MOCKS ───────────────────────────────────────────────────────────────

// Hoisted so the vi.mock factory can reference it. The mock returns
// whatever this variable holds at call-time.
const mockFetch = vi.fn()

vi.mock('@/sanity/lib/client', () => ({
  client: { fetch: mockFetch },
}))

// We import the page module AFTER the mock is registered.
async function loadPage() {
  const mod = await import('@/app/assessments/page')
  return mod.default
}

// ── FIXTURES ────────────────────────────────────────────────────────────

const FIXTURE_SETTINGS: AssessmentsIndexSettings = {
  heroHeadline: 'Six assessments. Pick the one that fits where you are.',
  heroIntro: [
    {
      _type: 'block',
      _key: 'h1',
      style: 'normal',
      markDefs: [],
      children: [
        { _type: 'span', _key: 'h1s', marks: [], text: 'Hero intro one.' },
      ],
    },
  ],
  archetypesHeading: 'Where are you right now?',
  directoryHeading: 'Or pick by what you want to look at',
  directoryIntro: 'All six, in order.',
  seoTitle: 'Assessments — fab.partners',
  seoDescription: 'Six short diagnostics for senior leaders.',
}

const FIXTURE_ARCHETYPE: Archetype = {
  _id: 'archetype-test',
  title: 'Test archetype',
  displayTitle: 'A test archetype that names a situation',
  slug: 'test-archetype',
  situation: [
    {
      _type: 'block',
      _key: 's1',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 's1s',
          marks: [],
          text: 'A short situation read.',
        },
      ],
    },
  ],
  recommendations: [
    {
      _key: 'r1',
      rationale: 'Specific rationale for why this assessment.',
      assessment: {
        slug: 'coaching-readiness',
        displayTitle: 'Coaching Readiness Scan',
        tagline: 'Are you ready for coaching?',
        estimatedMinutes: 3,
      },
    },
    {
      _key: 'r2',
      rationale: 'And here is why the second one too.',
      assessment: {
        slug: 'resilience-wheel',
        displayTitle: 'Resilience Wheel',
        tagline: 'Eight domains, eight sliders.',
        estimatedMinutes: 4,
      },
    },
  ],
  orderInList: 10,
}

const FIXTURE_DIRECTORY_ROW: AssessmentDirectoryRow = {
  _id: 'assessment-1',
  slug: 'coaching-readiness',
  displayTitle: 'Coaching Readiness Scan',
  tagline: 'Are you actually ready for coaching?',
  estimatedMinutes: 3,
  orderInList: 1,
}

// ── HELPERS ─────────────────────────────────────────────────────────────

/**
 * Lightweight renderer. Given a React element tree, recursively invokes
 * function components and yields the resulting text leaves. This is
 * enough for shape-of-output assertions without pulling in
 * @testing-library/react.
 *
 * Two caveats:
 *   - Doesn't handle hooks (useState, useEffect, etc). Our page tree is
 *     all pure server components, so this is fine.
 *   - Doesn't handle Suspense, Context.Provider, or other React
 *     machinery. Also fine — none of those appear in the page.
 */
function* walkText(node: ReactNode): Generator<string> {
  if (node === null || node === undefined || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') {
    yield String(node)
    return
  }
  if (Array.isArray(node)) {
    for (const child of node) yield* walkText(child)
    return
  }
  const el = node as ReactElement & {
    type?: unknown
    props?: { children?: ReactNode } & Record<string, unknown>
  }
  // If the type is a function, invoke it and walk the returned tree.
  if (typeof el.type === 'function') {
    try {
      const rendered = (el.type as (p: unknown) => ReactNode)(el.props ?? {})
      yield* walkText(rendered)
    } catch {
      // Component threw — swallow and continue
    }
    return
  }
  // Intrinsic (string-typed) element: descend into children
  if (el.props && 'children' in el.props) {
    yield* walkText(el.props.children)
  }
}

function collectText(node: ReactNode): string {
  return Array.from(walkText(node)).join(' ')
}

function* walkElements(node: ReactNode): Generator<ReactElement> {
  if (node === null || node === undefined || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') return
  if (Array.isArray(node)) {
    for (const child of node) yield* walkElements(child)
    return
  }
  const el = node as ReactElement & {
    type?: unknown
    props?: { children?: ReactNode } & Record<string, unknown>
  }
  yield el
  if (typeof el.type === 'function') {
    try {
      const rendered = (el.type as (p: unknown) => ReactNode)(el.props ?? {})
      yield* walkElements(rendered)
    } catch {
      // ignore
    }
    return
  }
  if (el.props && 'children' in el.props) {
    yield* walkElements(el.props.children)
  }
}

function findLinks(node: ReactNode): { href: string }[] {
  const links: { href: string }[] = []
  for (const el of walkElements(node)) {
    const props = el.props as { href?: string } | undefined
    if (props?.href) links.push({ href: props.href })
  }
  return links
}

// ── TESTS ───────────────────────────────────────────────────────────────

describe('AssessmentsIndexPage — full data', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders hero, archetypes, and directory sections', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [FIXTURE_DIRECTORY_ROW],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    expect(text).toContain('Six assessments. Pick the one that fits')
    expect(text).toContain('Where are you right now?')
    expect(text).toContain('Or pick by what you want to look at')
    expect(text).toContain('A test archetype that names a situation')
    expect(text).toContain('A short situation read.')
  })

  it('shows each recommendation with its assessment displayTitle and rationale', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    // Both recommended assessment titles surface
    expect(text).toContain('Coaching Readiness Scan')
    expect(text).toContain('Resilience Wheel')

    // Rationales surface
    expect(text).toContain('Specific rationale for why this assessment.')
    expect(text).toContain('And here is why the second one too.')
  })

  it('labels the first recommendation "Start here" and the rest "Also worth considering"', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    expect(text).toContain('Start here')
    expect(text).toContain('Also worth considering')
  })

  it('generates correct assessment links for archetype recommendations', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const links = findLinks(tree)
    const hrefs = links.map((l) => l.href)

    expect(hrefs).toContain('/assessments/coaching-readiness')
    expect(hrefs).toContain('/assessments/resilience-wheel')
  })

  it('renders each directory assessment as a link card', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [],
      directory: [
        { ...FIXTURE_DIRECTORY_ROW },
        {
          ...FIXTURE_DIRECTORY_ROW,
          _id: 'assessment-2',
          slug: 'resilience-wheel',
          displayTitle: 'Resilience Wheel',
        },
      ],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const hrefs = findLinks(tree).map((l) => l.href)

    expect(hrefs).toContain('/assessments/coaching-readiness')
    expect(hrefs).toContain('/assessments/resilience-wheel')
  })
})

describe('AssessmentsIndexPage — defensive defaults', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders with no settings (Sanity has no singleton yet)', async () => {
    const data: AssessmentsIndexPageData = {
      settings: null,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [FIXTURE_DIRECTORY_ROW],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    // Falls back to the DEFAULTS constants
    expect(text).toContain('Six assessments. Pick the one that fits')
    expect(text).toContain('Where are you right now?')
    expect(text).toContain('Or pick by what you want to look at')
  })

  it('hides the archetypes section when no archetypes exist', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [],
      directory: [FIXTURE_DIRECTORY_ROW],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    expect(text).not.toContain('Where are you right now?')
    // Directory still renders
    expect(text).toContain('Or pick by what you want to look at')
    expect(text).toContain('Coaching Readiness Scan')
  })

  it('hides the directory section when no assessments are live', async () => {
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [FIXTURE_ARCHETYPE],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    expect(text).toContain('Where are you right now?')
    expect(text).not.toContain('Or pick by what you want to look at')
  })

  it('falls back to title when archetype displayTitle is missing', async () => {
    const noDisplayTitle: Archetype = {
      ...FIXTURE_ARCHETYPE,
      displayTitle: undefined,
    }
    const data: AssessmentsIndexPageData = {
      settings: FIXTURE_SETTINGS,
      archetypes: [noDisplayTitle],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    // Falls back to .title since .displayTitle is missing
    expect(text).toContain('Test archetype')
  })

  it('renders even with zero archetypes and zero directory rows', async () => {
    const data: AssessmentsIndexPageData = {
      settings: null,
      archetypes: [],
      directory: [],
    }
    mockFetch.mockResolvedValue(data)

    const Page = await loadPage()
    const tree = await Page()
    const text = collectText(tree)

    // Hero still surfaces (with defaults); both sections hidden
    expect(text).toContain('Six assessments. Pick the one that fits')
    expect(text).not.toContain('Where are you right now?')
    expect(text).not.toContain('Or pick by what you want to look at')
  })
})

// ── METADATA ────────────────────────────────────────────────────────────

describe('AssessmentsIndexPage — generateMetadata', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('uses seoTitle and seoDescription from settings', async () => {
    mockFetch.mockResolvedValue({
      settings: FIXTURE_SETTINGS,
      archetypes: [],
      directory: [],
    })
    const mod = await import('@/app/assessments/page')
    const metadata = await mod.generateMetadata()
    expect(metadata.title).toBe('Assessments — fab.partners')
    expect(metadata.description).toBe('Six short diagnostics for senior leaders.')
  })

  it('falls back to defaults when settings is null', async () => {
    mockFetch.mockResolvedValue({
      settings: null,
      archetypes: [],
      directory: [],
    })
    const mod = await import('@/app/assessments/page')
    const metadata = await mod.generateMetadata()
    expect(metadata.title).toBe('Assessments — fab.partners')
    expect(metadata.description).toBeUndefined()
  })
})
