import { defineType, defineField, defineArrayMember } from 'sanity'

/**
 * CrossCombination — a triggerable pattern across two or more assessments.
 *
 * When a user submits an assessment, the route looks up all their prior
 * submissions and evaluates each active combination against the full set.
 * If a combination matches, a nudge email is sent.
 *
 * The condition is structured (not a string-DSL like the tier evaluator)
 * because it operates across submissions rather than within one. The
 * structure: an array of "requirements", each specifying an assessment
 * slug and acceptable tier ids and/or interpretation keys. A combination
 * matches when EVERY requirement is satisfied by at least one of the
 * user's submissions. Within a single requirement, the tier/key lists
 * are OR-ed (any one match satisfies the requirement).
 *
 * Authoring intent:
 *   - Russell writes a short headline ("Worth a second look") and a
 *     two-paragraph email body framed as a coach's observation.
 *   - He lists the requirements: e.g. "Assessment 3, tier IS-leaning"
 *     plus "Assessment 4, interpretation key distortion.ai_magnification".
 *   - When both conditions are met by the user's submission history,
 *     the email is sent (once per user per combination).
 */
export default defineType({
  name: 'crossCombination',
  title: 'Cross-Assessment Combination',
  type: 'document',
  groups: [
    { name: 'core', title: 'Core', default: true },
    { name: 'condition', title: 'When to fire' },
    { name: 'email', title: 'Email' },
    { name: 'meta', title: 'Display' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal title',
      type: 'string',
      group: 'core',
      description:
        'Internal name for this combination — shown in the Studio list and used in submission records.',
      validation: (R) => R.required().max(120),
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
      name: 'rationale',
      title: 'What this combination diagnoses',
      type: 'text',
      rows: 3,
      group: 'core',
      description:
        'Two-or-three-line note describing why this pattern is worth flagging. Internal only — not shown to the user.',
      validation: (R) => R.required().max(500),
    }),
    defineField({
      name: 'requirements',
      title: 'Requirements (all must be met)',
      type: 'array',
      group: 'condition',
      description:
        'Two or more requirements. The combination matches only when EVERY requirement is satisfied by at least one of the user\'s submissions. Within a single requirement, tier ids and interpretation keys are OR-ed (any one match satisfies that requirement).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'requirement',
          fields: [
            defineField({
              name: 'assessmentSlug',
              title: 'Assessment slug',
              type: 'string',
              description:
                'The slug of the assessment this requirement refers to (e.g. "decision-making-style").',
              validation: (R) => R.required().max(80),
            }),
            defineField({
              name: 'anyOfTiers',
              title: 'Any of these tier ids (OR)',
              type: 'array',
              of: [{ type: 'string' }],
              description:
                'A submission of this assessment satisfies the requirement if its tier id is in this list. Leave blank to skip tier matching for this requirement.',
            }),
            defineField({
              name: 'anyOfInterpretationKeys',
              title: 'Any of these interpretation keys (OR)',
              type: 'array',
              of: [{ type: 'string' }],
              description:
                'A submission satisfies the requirement if any of its interpretation keys appears in this list (e.g. "distortion.ai_magnification"). Leave blank to skip key matching. If both anyOfTiers and anyOfInterpretationKeys are set, EITHER one matching is enough.',
            }),
          ],
          preview: {
            select: {
              slug: 'assessmentSlug',
              tiers: 'anyOfTiers',
              keys: 'anyOfInterpretationKeys',
            },
            prepare(sel) {
              const tiers = (sel.tiers as string[] | undefined) ?? []
              const keys = (sel.keys as string[] | undefined) ?? []
              const desc = [
                tiers.length ? `tiers: ${tiers.join(', ')}` : null,
                keys.length ? `keys: ${keys.join(', ')}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return {
                title: (sel.slug as string | undefined) ?? '(no assessment)',
                subtitle: desc || '(no constraints — always matches)',
              }
            },
          },
        }),
      ],
      validation: (R) =>
        R.required()
          .min(2)
          .error('A combination must reference at least two assessments.'),
    }),
    defineField({
      name: 'emailSubject',
      title: 'Email subject',
      type: 'string',
      group: 'email',
      description:
        'Kept short and unsales-y. E.g. "Something I noticed across your two results".',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'emailBody',
      title: 'Email body',
      type: 'array',
      of: [{ type: 'block', styles: [{ title: 'Normal', value: 'normal' }] }],
      group: 'email',
      description:
        'The body of the nudge email, as Portable Text. Two or three paragraphs. Frame it as a coach\'s observation, not a sales pitch.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA label (optional)',
      type: 'string',
      group: 'email',
      description:
        'Optional call-to-action button text. Leave blank for a no-CTA email — sometimes the observation alone is the right shape.',
      validation: (R) => R.max(80),
    }),
    defineField({
      name: 'ctaHref',
      title: 'CTA URL (optional)',
      type: 'url',
      group: 'email',
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      group: 'meta',
      description:
        'Untick to disable this combination without deleting the document. Useful for testing combinations in isolation.',
      initialValue: true,
    }),
    defineField({
      name: 'orderInList',
      title: 'Priority',
      type: 'number',
      group: 'meta',
      description:
        'Lower numbers evaluate first. When multiple combinations match a single submission, only the first-matched combination fires.',
      initialValue: 100,
      validation: (R) => R.required().min(0),
    }),
  ],
  orderings: [
    {
      title: 'Priority',
      name: 'orderInList',
      by: [{ field: 'orderInList', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      order: 'orderInList',
      isActive: 'isActive',
    },
    prepare(sel) {
      const title = (sel.title as string | undefined) ?? 'Untitled combination'
      const order = sel.order as number | undefined
      const isActive = sel.isActive as boolean | undefined
      return {
        title,
        subtitle: [
          typeof order === 'number' ? `#${order}` : null,
          isActive === false ? '(inactive)' : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
