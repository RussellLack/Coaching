import { defineType, defineField, defineArrayMember } from 'sanity'

/**
 * Archetype — a description of a senior leader's situation, used as the
 * entry-point on the assessments index page.
 *
 * Each archetype recommends 2-3 specific assessments with a one-line
 * rationale per recommendation. The recommendations are ordered — the
 * first recommendation is shown as "Start here", subsequent ones as
 * "Also worth considering" or similar.
 *
 * Archetypes are ordered by `orderInList`; they appear in that order on
 * the public page.
 */
export default defineType({
  name: 'archetype',
  title: 'Archetype',
  type: 'document',
  groups: [
    { name: 'core', title: 'Core', default: true },
    { name: 'recommendations', title: 'Recommendations' },
    { name: 'meta', title: 'Display' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Internal name (also shown on the archetype tile if no displayTitle is set).',
      group: 'core',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      description:
        'The headline shown on the archetype tile. Designed to make the visitor say "yes, that\'s me".',
      group: 'core',
      validation: (R) => R.max(160),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'core',
      options: { source: 'title', maxLength: 80 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'situation',
      title: 'Situation description',
      type: 'array',
      of: [{ type: 'block', styles: [{ title: 'Normal', value: 'normal' }] }],
      description:
        'Two or three lines describing the archetype\'s situation. Plain prose; this is the "is this you?" copy.',
      group: 'core',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'recommendations',
      title: 'Recommended assessments',
      type: 'array',
      group: 'recommendations',
      description:
        'Two or three assessments to recommend, in priority order. The first is shown as "Start here". Drag to reorder.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'recommendation',
          fields: [
            defineField({
              name: 'assessment',
              title: 'Assessment',
              type: 'reference',
              to: [{ type: 'assessment' }],
              validation: (R) => R.required(),
            }),
            defineField({
              name: 'rationale',
              title: 'Why this one for this archetype',
              type: 'text',
              rows: 2,
              description:
                'One-line rationale shown beneath the assessment title. Make it specific to this archetype, not generic.',
              validation: (R) => R.required().max(320),
            }),
          ],
          preview: {
            select: {
              title: 'assessment.displayTitle',
              subtitle: 'rationale',
            },
          },
        }),
      ],
      validation: (R) =>
        R.required().min(2).max(3).error('Each archetype must recommend 2 or 3 assessments.'),
    }),
    defineField({
      name: 'orderInList',
      title: 'Order in list',
      type: 'number',
      description:
        'Lower numbers appear first on the assessments index page. Leave gaps (10, 20, 30…) so reordering is easy.',
      group: 'meta',
      validation: (R) => R.required().min(0),
    }),
    defineField({
      name: 'isDraft',
      title: 'Hide from the public page',
      type: 'boolean',
      description:
        'Tick this to keep an archetype out of the live page while still working on it.',
      group: 'meta',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: 'Order in list',
      name: 'orderInList',
      by: [{ field: 'orderInList', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'displayTitle',
      fallback: 'title',
      order: 'orderInList',
      isDraft: 'isDraft',
    },
    prepare(sel) {
      const title = (sel.title as string | undefined) ?? (sel.fallback as string | undefined) ?? 'Untitled archetype'
      const order = sel.order as number | undefined
      const isDraft = sel.isDraft as boolean | undefined
      const subtitleParts: string[] = []
      if (typeof order === 'number') subtitleParts.push(`#${order}`)
      if (isDraft) subtitleParts.push('(hidden)')
      return {
        title,
        subtitle: subtitleParts.join(' · '),
      }
    },
  },
})
