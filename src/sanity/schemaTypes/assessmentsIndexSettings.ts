import { defineType, defineField } from 'sanity'

/**
 * Assessments index settings — singleton document holding the copy for
 * the /assessments page.
 *
 * Lives separately from siteSettings because the assessments-page copy
 * is its own surface and worth editing independently. If this proves
 * over-engineered, fields can be folded back into siteSettings later
 * (trivial migration).
 */
export default defineType({
  name: 'assessmentsIndexSettings',
  title: 'Assessments Index — page copy',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'sections', title: 'Section headings' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'string',
      group: 'hero',
      description:
        'The big serif heading at the top of the page. Names what this page is.',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'heroIntro',
      title: 'Hero intro',
      type: 'array',
      of: [{ type: 'block', styles: [{ title: 'Normal', value: 'normal' }] }],
      group: 'hero',
      description:
        'Two or three lines under the headline. Sets up what the rest of the page is for.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'archetypesHeading',
      title: 'Archetypes section heading',
      type: 'string',
      group: 'sections',
      description:
        'The label above the archetype tiles. Default: "Where are you right now?"',
      initialValue: 'Where are you right now?',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'directoryHeading',
      title: 'Directory section heading',
      type: 'string',
      group: 'sections',
      description:
        'The label above the full assessment directory. Default: "Or pick by what you want to look at"',
      initialValue: 'Or pick by what you want to look at',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'directoryIntro',
      title: 'Directory intro (optional)',
      type: 'text',
      rows: 2,
      group: 'sections',
      description:
        'Optional one-line lead-in for the directory section. Leave blank if not needed.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'meta',
      validation: (R) => R.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      group: 'meta',
      validation: (R) => R.max(160),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Assessments index — page copy' }),
  },
})
