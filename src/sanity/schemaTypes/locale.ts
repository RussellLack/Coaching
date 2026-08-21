import { defineType, defineField } from 'sanity'
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from '@/i18n/config'

/**
 * Field-level translation.
 *
 * A translatable field becomes an object with one sub-field per
 * language, rather than the document being duplicated per language.
 * That choice matters most for the assessments, where a single document
 * interleaves prose with scoring configuration: duplicating documents
 * would duplicate the scoring config too, and any drift between copies
 * would silently give the same person different results in different
 * languages. One document, many languages, one set of scoring rules.
 *
 * English is required and is the fallback. A missing translation falls
 * back to English rather than rendering an empty page — visible in the
 * Studio as an untranslated field, invisible as a breakage to a reader.
 */

/** Preview: show the English value, name what still needs translating. */
const localePreview = {
  select: LOCALES.reduce(
    (acc, l) => ({ ...acc, [l]: l }),
    {} as Record<string, string>
  ),
  prepare(sel: Record<string, string | undefined>) {
    const missing = LOCALES.filter((l) => !sel[l]?.trim())
    return {
      title: sel[DEFAULT_LOCALE] || '(untranslated)',
      subtitle: missing.length
        ? `Missing: ${missing.map((l) => LOCALE_LABELS[l]).join(', ')}`
        : 'All languages set',
    }
  },
}

export const localeString = defineType({
  name: 'localeString',
  title: 'Text (translated)',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: LOCALES.map((locale) =>
    defineField({
      name: locale,
      title: LOCALE_LABELS[locale],
      type: 'string',
      validation: (rule) =>
        locale === DEFAULT_LOCALE ? rule.required() : rule,
    })
  ),
  preview: localePreview,
})

export const localeText = defineType({
  name: 'localeText',
  title: 'Long text (translated)',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: LOCALES.map((locale) =>
    defineField({
      name: locale,
      title: LOCALE_LABELS[locale],
      type: 'text',
      rows: 3,
      validation: (rule) =>
        locale === DEFAULT_LOCALE ? rule.required() : rule,
    })
  ),
  preview: localePreview,
})
