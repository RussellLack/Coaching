import { defineType, defineField, defineArrayMember } from 'sanity'

/**
 * Site Settings — singleton (one document).
 *
 * Existing fields (pre-assessment integration):
 *   - title, tagline, bookingEmail, scanPrice
 *
 * Added by the assessment engine:
 *   - defaultWebformEndpoint  (where assessments POST results)
 *   - defaultCalendarUrl      (used in CTAs and follow-up emails)
 *   - defaultAttributionFooter (fallback footer copy for assessments)
 *   - privacyNotice           (shown beneath email capture)
 *
 * The new fields are grouped together in the Studio so they don't crowd
 * the existing fields.
 */
export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'assessments', title: 'Assessments' },
  ],
  fields: [
    // ── Existing fields (unchanged) ─────────────────────────────────────
    defineField({ name: 'title', title: 'Site Title', type: 'string', group: 'general' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', group: 'general' }),
    defineField({ name: 'bookingEmail', title: 'Booking Email', type: 'string', group: 'general' }),
    defineField({
      name: 'scanPrice',
      title: 'Deep Navigation Scan Price',
      type: 'string',
      group: 'general',
    }),

    // ── New fields for the assessment engine ────────────────────────────
    defineField({
      name: 'defaultWebformEndpoint',
      title: 'Default webform endpoint',
      type: 'url',
      description:
        'Where assessments POST results unless overridden per assessment. Defaults to /api/assessment-submit on the live site if left empty.',
      group: 'assessments',
    }),
    defineField({
      name: 'defaultCalendarUrl',
      title: 'Default calendar booking URL',
      type: 'url',
      description: 'Used in CTAs after assessment results.',
      group: 'assessments',
    }),
    defineField({
      name: 'defaultAttributionFooter',
      title: 'Default assessment attribution footer',
      type: 'array',
      description:
        'Used on any assessment that does not set its own attribution footer.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Emphasis', value: 'em' },
              { title: 'Strong', value: 'strong' },
            ],
          },
          lists: [],
        }),
      ],
      group: 'assessments',
    }),
    defineField({
      name: 'privacyNotice',
      title: 'Privacy notice (assessment forms)',
      type: 'array',
      description: 'Shown beneath the email capture on every assessment.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Emphasis', value: 'em' },
              { title: 'Strong', value: 'strong' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    validation: (r) => r.required(),
                  }),
                ],
              },
            ],
          },
          lists: [],
        }),
      ],
      group: 'assessments',
    }),
  ],
})
