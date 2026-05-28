/**
 * Assessment result PDF.
 *
 * Uses @react-pdf/renderer to compose the PDF as React components.
 * Same Portable Text content as the on-screen result; just rendered to
 * a print-shaped layout with a different component tree.
 *
 * The PDF includes:
 *   - Cover: assessment title + tier badge + date
 *   - Scorecard: dimension scores + headline
 *   - Interpretations: one block per matched interpretation
 *   - Next steps: CTA copy
 *   - Footer: attribution
 */

import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import type { PortableTextBlock } from '@portabletext/types'
import type { Assessment, WebformPayload } from '@/types/assessment'
import { PDF_COLOURS } from './colours'
import { PdfVisualisation } from './visualisations'

// ── FONT REGISTRATION ──────────────────────────────────────────────────
// React-PDF doesn't ship with great default fonts. We register Inter and
// Source Serif 4 from Google Fonts at module load time. These calls are
// memoised by @react-pdf so they're cheap on repeat invocations.

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf',
      fontWeight: 600,
    },
  ],
})

Font.register({
  family: 'SourceSerif',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxX5OwGvjU.ttf',
      fontWeight: 700,
    },
  ],
})

// ── STYLES ─────────────────────────────────────────────────────────────

// Colour palette is imported from ./colours so PDF visualisations can
// share it. Local alias kept so the existing StyleSheet declarations
// below don't need rewriting.
const COLOURS = PDF_COLOURS

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOURS.background,
    padding: 56,
    fontFamily: 'Inter',
    fontSize: 11,
    color: COLOURS.bodyText,
    lineHeight: 1.55,
  },
  // Cover
  cover: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topMeta: {
    fontSize: 9,
    color: COLOURS.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  coverHeadline: {
    marginTop: 24,
  },
  coverDisplayTitle: {
    fontFamily: 'SourceSerif',
    fontSize: 28,
    color: COLOURS.ink,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  coverTagline: {
    fontSize: 12,
    color: COLOURS.muted,
    lineHeight: 1.5,
  },
  tierBadgeLabel: {
    fontSize: 9,
    color: COLOURS.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tierBadge: {
    fontFamily: 'SourceSerif',
    fontSize: 36,
    color: COLOURS.accent,
    lineHeight: 1.1,
  },
  coverFooter: {
    fontSize: 9,
    color: COLOURS.faint,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'SourceSerif',
    fontSize: 16,
    color: COLOURS.ink,
    marginBottom: 12,
  },

  // Interpretations
  interpretationBlock: {
    borderLeftWidth: 2,
    borderLeftColor: COLOURS.accent,
    backgroundColor: COLOURS.surface,
    padding: 14,
    marginBottom: 12,
  },

  // Prose
  paragraph: {
    marginBottom: 8,
  },
  prose: {
    fontSize: 11,
    lineHeight: 1.55,
    color: COLOURS.bodyText,
  },
  em: { fontStyle: 'italic' },
  strong: { fontWeight: 600 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 56,
    right: 56,
    fontSize: 8,
    color: COLOURS.faint,
    borderTopWidth: 0.5,
    borderTopColor: COLOURS.border,
    paddingTop: 8,
  },
})

// ── PORTABLE TEXT → PDF ────────────────────────────────────────────────
// A minimal renderer for the subset of Portable Text our content uses:
// normal blocks, h3 headings, emphasis, strong. Anything else falls through
// as plain text. Worth keeping deliberately small so PDF output stays
// predictable.

function renderPortableText(blocks: PortableTextBlock[] | undefined): ReactElement[] {
  if (!blocks) return []
  return blocks.map((block, i) => {
    if (block._type !== 'block') return <Text key={i} />

    const children = ((block.children ?? []) as Array<{
      _key?: string
      _type?: string
      text?: string
      marks?: string[]
    }>).map((child, j) => {
      const text = child.text ?? ''
      const marks = child.marks ?? []
      const style: Record<string, unknown> = {}
      if (marks.includes('em')) Object.assign(style, styles.em)
      if (marks.includes('strong')) Object.assign(style, styles.strong)
      return (
        <Text key={child._key ?? j} style={style}>
          {text}
        </Text>
      )
    })

    const isHeading = block.style === 'h3'
    return (
      <Text
        key={(block as { _key?: string })._key ?? i}
        style={[
          styles.paragraph,
          styles.prose,
          isHeading
            ? {
                fontFamily: 'SourceSerif',
                fontSize: 13,
                color: COLOURS.ink,
                marginTop: 6,
                marginBottom: 4,
              }
            : {},
        ]}
      >
        {children}
      </Text>
    )
  })
}

// ── PDF DOCUMENT ───────────────────────────────────────────────────────

interface AssessmentPdfProps {
  assessment: Assessment
  payload: WebformPayload
}

function AssessmentPdf({ assessment, payload }: AssessmentPdfProps) {
  const matchedTier = assessment.resultTiers.find(
    (t) => t.id === payload.result.tier
  )
  const raw = payload.result.raw as {
    dimensions?: Record<string, number>
    overall?: number
    lowestDimension?: string
  }
  // Interpretation keys arrive on the payload — computed by the scoring
  // engine on the client. The PDF used to reimplement this logic for
  // Assessment 1 only; now it just reads what the engine produced.
  const interpretationKeys = payload.result.interpretationKeys ?? []
  const interpretations = (assessment.interpretations ?? []).filter((i) =>
    interpretationKeys.includes(i.key)
  )

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document
      title={`${assessment.displayTitle} — ${matchedTier?.label ?? 'Result'}`}
      author="fab.partners"
    >
      {/* COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View>
            <Text style={styles.topMeta}>fab.partners · assessment result</Text>
            <View style={styles.coverHeadline}>
              <Text style={styles.coverDisplayTitle}>
                {assessment.displayTitle}
              </Text>
              {assessment.tagline && (
                <Text style={styles.coverTagline}>{assessment.tagline}</Text>
              )}
            </View>
          </View>

          <View>
            <Text style={styles.tierBadgeLabel}>Your result</Text>
            <Text style={styles.tierBadge}>
              {matchedTier?.label ?? 'Result'}
            </Text>
          </View>

          <View style={styles.coverFooter}>
            <Text>{today}</Text>
          </View>
        </View>
      </Page>

      {/* SCORECARD + HEADLINE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getVisualisationSectionTitle(assessment)}</Text>
          <PdfVisualisation assessment={assessment} rawResult={raw} />
        </View>

        {matchedTier && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What this means</Text>
            {renderPortableText(matchedTier.headline)}
          </View>
        )}

        <PageFooter assessment={assessment} />
      </Page>

      {/* INTERPRETATIONS */}
      {interpretations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where to look next</Text>
            {interpretations.map((interp) => (
              <View
                key={interp._key}
                style={styles.interpretationBlock}
                wrap={false}
              >
                {renderPortableText(interp.body)}
              </View>
            ))}
          </View>
          <PageFooter assessment={assessment} />
        </Page>
      )}

      {/* NEXT STEPS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>If you want to talk this through</Text>
          {assessment.postCaptureCtaCopy ? (
            renderPortableText(assessment.postCaptureCtaCopy)
          ) : (
            <Text style={styles.prose}>
              I do a free 30-minute conversation specifically for this kind of
              reflection. No agenda, no upsell.
            </Text>
          )}
          <Text style={[styles.prose, { marginTop: 16 }]}>
            Book at: fab.partners/book
          </Text>
        </View>
        <PageFooter assessment={assessment} />
      </Page>
    </Document>
  )
}

function PageFooter({ assessment }: { assessment: Assessment }) {
  return (
    <View style={styles.footer} fixed>
      {assessment.attributionFooter ? (
        <View>{renderPortableText(assessment.attributionFooter)}</View>
      ) : (
        <Text>fab.partners</Text>
      )}
    </View>
  )
}

// ── SECTION TITLE PER VISUALISATION ────────────────────────────────────
// Each assessment gets a section heading above its visualisation. The
// heading names the artefact rather than the abstract concept — "Your
// stakeholder map" reads better than "Your scoring matrix" — so the
// reader sees what the visual IS, not what method produced it.

function getVisualisationSectionTitle(assessment: Assessment): string {
  switch (assessment.visualisation) {
    case 'radarWheel':
      return 'Your resilience wheel'
    case 'stakeholderMatrix':
      return 'Your stakeholder map'
    case 'distortionHeatmap':
      return 'Your patterns, ranked'
    case 'timeShiftLines':
      return 'The shape of your success'
    case 'quadrant2x2':
      return 'Where you sit'
    case 'dimensionBars':
      return 'Your scorecard'
    default: {
      const _exhaustive: never = assessment.visualisation
      return 'Your result'
    }
  }
}

// ── PUBLIC API ─────────────────────────────────────────────────────────

export async function renderAssessmentPdf(args: {
  assessment: Assessment
  payload: WebformPayload
}): Promise<Buffer> {
  const { assessment, payload } = args
  // renderToBuffer accepts a React element, not a JSX expression.
  return await renderToBuffer(
    <AssessmentPdf assessment={assessment} payload={payload} />
  )
}
