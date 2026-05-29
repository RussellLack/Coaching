/**
 * Shared colour palette for the PDF result document and its visualisations.
 *
 * These are print-safe colours — warm cream background, deep teal accent,
 * a desaturated brick-red highlight. Different from the web theme (which
 * is dark teal with coral on cream), because the PDF is meant to be read
 * on light paper / a light screen and to remain legible if printed
 * monochrome.
 */
export const PDF_COLOURS = {
  ink: '#1A1814',
  bodyText: '#3F3A2E',
  muted: '#5F5747',
  faint: '#897F6A',
  accent: '#0F4C5C',
  accentTint: '#E6EEF0',
  surface: '#F4F1EB',
  border: '#E8E3D8',
  background: '#FAF8F4',
  highlight: '#C2452C',
  dim: '#A89A82',
} as const

export type PdfColour = (typeof PDF_COLOURS)[keyof typeof PDF_COLOURS]
