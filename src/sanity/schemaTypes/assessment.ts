import { defineType, defineField, defineArrayMember } from 'sanity'

/**
 * Assessment schema for fab.partners.
 *
 * One document = one assessment. Polymorphic question types, declarative
 * scoring metadata, result tiers + interpretations as Portable Text.
 *
 * Scoring runs client-side; this schema stores only the definitions
 * and the metadata each scoring strategy needs.
 *
 * Strategies (handled in src/lib/assessment/scoring/[strategy].ts):
 *   - dimensional-likert  (assessments 1, 2 — Likert path)
 *   - dimensional-slider  (assessment 2 — slider path)
 *   - tally-by-tag        (assessments 3, 4)
 *   - support-matrix      (assessment 5)
 *   - time-shift-points   (assessment 6)
 *
 * For consistency with the existing schemaTypes (hero.ts, journey.ts,
 * humanValue.ts, siteSettings.ts), this file uses default export and
 * minimal ceremony.
 */
export default defineType({
  name: 'assessment',
  title: 'Assessment',
  type: 'document',
  groups: [
    { name: 'core', title: 'Core', default: true },
    { name: 'questions', title: 'Questions' },
    { name: 'scoring', title: 'Scoring' },
    { name: 'results', title: 'Results' },
    { name: 'handoff', title: 'Email & Handoff' },
    { name: 'meta', title: 'SEO & Attribution' },
  ],
  fields: [
    // ── CORE ─────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title (internal)',
      type: 'string',
      description: 'For Studio + URLs. The user-facing title lives in `displayTitle`.',
      validation: (r) => r.required(),
      group: 'core',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      validation: (r) => r.required(),
      group: 'core',
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      description: 'Shown to the user on the assessment page.',
      validation: (r) => r.required(),
      group: 'core',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'core',
    }),
    defineField({
      name: 'estimatedMinutes',
      title: 'Estimated minutes to complete',
      type: 'number',
      validation: (r) => r.required().min(1).max(20),
      group: 'core',
    }),
    defineField({
      name: 'introCopy',
      title: 'Intro copy',
      type: 'array',
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
      group: 'core',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Live', value: 'live' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (r) => r.required(),
      group: 'core',
    }),
    defineField({
      name: 'orderInList',
      title: 'Order in list',
      type: 'number',
      group: 'core',
    }),

    // ── QUESTIONS (polymorphic array) ────────────────────────────────
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      group: 'questions',
      of: [
        // A — Agreement 1–5 (Likert)
        defineArrayMember({
          name: 'questionAgreement5',
          title: 'Agreement scale (1–5)',
          type: 'object',
          fields: [
            defineField({ name: 'prompt', type: 'text', rows: 2, validation: (r) => r.required() }),
            defineField({
              name: 'dimensionId',
              type: 'string',
              description: 'Must match a dimension declared in the Scoring tab.',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'reverseScored',
              type: 'boolean',
              description:
                'If true, a "Strongly agree" answer counts as 1 not 5.',
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: 'prompt', subtitle: 'dimensionId' },
            prepare: ({ title, subtitle }) => ({
              title: title?.slice(0, 80) ?? 'Untitled question',
              subtitle: subtitle ? `dim: ${subtitle}` : 'no dimension',
            }),
          },
        }),

        // B — Slider 0–10 with anchors
        defineArrayMember({
          name: 'questionSlider010',
          title: 'Slider (0–10)',
          type: 'object',
          fields: [
            defineField({ name: 'prompt', type: 'text', rows: 2, validation: (r) => r.required() }),
            defineField({ name: 'dimensionId', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'anchorLow', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'anchorHigh', type: 'string', validation: (r) => r.required() }),
          ],
          preview: {
            select: { title: 'prompt', subtitle: 'dimensionId' },
            prepare: ({ title, subtitle }) => ({
              title: title?.slice(0, 80) ?? 'Untitled slider',
              subtitle: subtitle ? `dim: ${subtitle}` : 'no dimension',
            }),
          },
        }),

        // C — Scenario radio (4 options, each tagged)
        defineArrayMember({
          name: 'questionScenarioRadio',
          title: 'Scenario (4-option radio)',
          type: 'object',
          fields: [
            defineField({ name: 'scenarioTitle', type: 'string' }),
            defineField({ name: 'prompt', type: 'text', rows: 3, validation: (r) => r.required() }),
            defineField({
              name: 'options',
              type: 'array',
              validation: (r) => r.length(4).error('Must have exactly 4 options.'),
              of: [
                defineArrayMember({
                  name: 'scenarioOption',
                  type: 'object',
                  fields: [
                    defineField({ name: 'label', type: 'text', rows: 2, validation: (r) => r.required() }),
                    defineField({
                      name: 'tagId',
                      type: 'string',
                      description:
                        'Category this option counts toward (must match an entry in Scoring).',
                      validation: (r) => r.required(),
                    }),
                  ],
                  preview: {
                    select: { title: 'label', subtitle: 'tagId' },
                    prepare: ({ title, subtitle }) => ({
                      title: title?.slice(0, 80) ?? 'Untitled option',
                      subtitle: subtitle ? `→ ${subtitle}` : 'no tag',
                    }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'scenarioTitle', subtitle: 'prompt' },
            prepare: ({ title, subtitle }) => ({
              title: title ?? subtitle?.slice(0, 60) ?? 'Untitled scenario',
              subtitle: title ? subtitle?.slice(0, 80) : undefined,
            }),
          },
        }),

        // D — Point allocation (factors shared across rounds)
        defineArrayMember({
          name: 'questionPointAllocation',
          title: 'Point allocation (across factors)',
          type: 'object',
          fields: [
            defineField({ name: 'roundLabel', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'prompt',
              type: 'array',
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
            }),
            defineField({
              name: 'roundId',
              type: 'string',
              description: 'Stable identifier (typically "past", "present", "future").',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'totalPoints',
              type: 'number',
              initialValue: 11,
              validation: (r) => r.required().min(2),
            }),
          ],
          preview: {
            select: { title: 'roundLabel', subtitle: 'roundId' },
            prepare: ({ title, subtitle }) => ({
              title: title ?? 'Untitled round',
              subtitle: subtitle ? `round: ${subtitle}` : undefined,
            }),
          },
        }),

        // E — Person row entry (Support Matrix — dynamic rows)
        defineArrayMember({
          name: 'questionPersonRowEntry',
          title: 'Person row entry (Support Matrix)',
          type: 'object',
          description: 'Only one of these per assessment.',
          fields: [
            defineField({ name: 'changePromptLabel', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'changePromptHelp', type: 'text', rows: 3 }),
            defineField({
              name: 'changePromptExamples',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              validation: (r) => r.max(4),
            }),
            defineField({ name: 'minRows', type: 'number', initialValue: 6, validation: (r) => r.required().min(2).max(20) }),
            defineField({ name: 'maxRows', type: 'number', initialValue: 10, validation: (r) => r.required().min(2).max(20) }),
            defineField({ name: 'influenceAnchorLow', type: 'string', initialValue: 'No influence' }),
            defineField({ name: 'influenceAnchorHigh', type: 'string', initialValue: 'High influence' }),
            defineField({ name: 'supportAnchorLow', type: 'string', initialValue: 'Opposes' }),
            defineField({ name: 'supportAnchorHigh', type: 'string', initialValue: 'Strongly supports' }),
            defineField({
              name: 'stanceOptions',
              type: 'array',
              of: [
                defineArrayMember({
                  name: 'stanceOption',
                  type: 'object',
                  fields: [
                    defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
                    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
                    defineField({ name: 'description', type: 'string' }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'id' } },
                }),
              ],
            }),
          ],
          preview: { prepare: () => ({ title: 'Person row entry (Support Matrix)' }) },
        }),
      ],
    }),

    // ── POINT ALLOCATION FACTORS (only used by assessment 6) ─────────
    defineField({
      name: 'pointAllocationFactors',
      title: 'Point-allocation factors',
      type: 'array',
      group: 'questions',
      hidden: ({ document }) =>
        !(document?.questions as { _type?: string }[] | undefined)?.some(
          (q) => q._type === 'questionPointAllocation'
        ),
      of: [
        defineArrayMember({
          name: 'factor',
          type: 'object',
          fields: [
            defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'description', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'id' } },
        }),
      ],
    }),

    // ── SCORING ──────────────────────────────────────────────────────
    defineField({
      name: 'scoringStrategy',
      title: 'Scoring strategy',
      type: 'string',
      options: {
        list: [
          { title: 'Dimensional Likert (avg per dimension)', value: 'dimensional-likert' },
          { title: 'Dimensional Slider (avg per dimension)', value: 'dimensional-slider' },
          { title: 'Tally by tag (count picks per category)', value: 'tally-by-tag' },
          { title: 'Support matrix (rule-based diagnostic)', value: 'support-matrix' },
          { title: 'Time-shift points (compare rounds)', value: 'time-shift-points' },
        ],
        layout: 'dropdown',
      },
      validation: (r) => r.required(),
      group: 'scoring',
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'array',
      group: 'scoring',
      hidden: ({ parent }) =>
        parent?.scoringStrategy !== 'dimensional-likert' &&
        parent?.scoringStrategy !== 'dimensional-slider',
      of: [
        defineArrayMember({
          name: 'dimension',
          type: 'object',
          fields: [
            defineField({
              name: 'id',
              type: 'string',
              description: 'Stable identifier referenced by questions.',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'description', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'id' } },
        }),
      ],
    }),
    defineField({
      name: 'tagCategories',
      title: 'Tag categories',
      type: 'array',
      group: 'scoring',
      hidden: ({ parent }) => parent?.scoringStrategy !== 'tally-by-tag',
      of: [
        defineArrayMember({
          name: 'tagCategory',
          type: 'object',
          fields: [
            defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'group', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'id' } },
        }),
      ],
    }),
    defineField({
      name: 'calibrationQuestions',
      title: 'Calibration questions',
      type: 'array',
      group: 'scoring',
      hidden: ({ parent }) => parent?.scoringStrategy !== 'tally-by-tag',
      of: [
        defineArrayMember({
          name: 'calibration',
          type: 'object',
          fields: [
            defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'prompt', type: 'text', rows: 2, validation: (r) => r.required() }),
            defineField({
              name: 'options',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
                    defineField({ name: 'score', type: 'number', validation: (r) => r.required() }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'score' } },
                }),
              ],
              validation: (r) => r.min(2).max(6),
            }),
          ],
          preview: { select: { title: 'prompt', subtitle: 'id' } },
        }),
      ],
    }),

    // ── RESULTS ──────────────────────────────────────────────────────
    defineField({
      name: 'resultTiers',
      title: 'Result tiers',
      type: 'array',
      group: 'results',
      of: [
        defineArrayMember({
          name: 'resultTier',
          type: 'object',
          fields: [
            defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'condition',
              type: 'string',
              description:
                'Expression evaluated by the engine. e.g. `overall >= 4.2`, `overall >= 3.4 && overall < 4.2`, `primary_tag == "IM"`.',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'headline',
              type: 'array',
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
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'condition' },
            prepare: ({ title, subtitle }) => ({
              title: title ?? 'Untitled tier',
              subtitle: subtitle ? `if ${subtitle}` : undefined,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'interpretations',
      title: 'Interpretations',
      type: 'array',
      group: 'results',
      of: [
        defineArrayMember({
          name: 'interpretation',
          type: 'object',
          fields: [
            defineField({
              name: 'key',
              type: 'string',
              description:
                'Key the scoring engine looks up (e.g. `gap.currency`, `distortion.ai_magnification`).',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'label', type: 'string' }),
            defineField({
              name: 'body',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [
                    { title: 'Normal', value: 'normal' },
                    { title: 'Heading 3', value: 'h3' },
                  ],
                  marks: {
                    decorators: [
                      { title: 'Emphasis', value: 'em' },
                      { title: 'Strong', value: 'strong' },
                    ],
                  },
                  lists: [],
                }),
              ],
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'key', subtitle: 'label' },
            prepare: ({ title, subtitle }) => ({
              title: title ?? 'Untitled interpretation',
              subtitle,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'visualisation',
      title: 'Result visualisation',
      type: 'string',
      options: {
        list: [
          { title: 'Dimension bars', value: 'dimensionBars' },
          { title: 'Radar / wheel', value: 'radarWheel' },
          { title: '2×2 quadrant', value: 'quadrant2x2' },
          { title: 'Distortion heatmap', value: 'distortionHeatmap' },
          { title: 'Stakeholder matrix', value: 'stakeholderMatrix' },
          { title: 'Time-shift lines', value: 'timeShiftLines' },
        ],
        layout: 'dropdown',
      },
      validation: (r) => r.required(),
      group: 'results',
    }),

    // ── HANDOFF ──────────────────────────────────────────────────────
    defineField({
      name: 'emailCaptureCopy',
      title: 'Email capture copy',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: { decorators: [{ title: 'Emphasis', value: 'em' }, { title: 'Strong', value: 'strong' }] },
          lists: [],
        }),
      ],
      group: 'handoff',
    }),
    defineField({
      name: 'ctaButtonLabel',
      type: 'string',
      initialValue: 'Send me the PDF',
      group: 'handoff',
    }),
    defineField({
      name: 'postCaptureCtaCopy',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: { decorators: [{ title: 'Emphasis', value: 'em' }, { title: 'Strong', value: 'strong' }] },
          lists: [],
        }),
      ],
      group: 'handoff',
    }),
    defineField({
      name: 'webformEndpoint',
      title: 'Webform endpoint override (optional)',
      type: 'url',
      description:
        'If set, results POST here instead of /api/assessment-submit.',
      group: 'handoff',
    }),
    defineField({
      name: 'crmTags',
      title: 'CRM tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      group: 'handoff',
    }),

    // ── META ─────────────────────────────────────────────────────────
    defineField({
      name: 'attributionFooter',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: { decorators: [{ title: 'Emphasis', value: 'em' }, { title: 'Strong', value: 'strong' }] },
          lists: [],
        }),
      ],
      group: 'meta',
    }),
    defineField({ name: 'seoTitle', type: 'string', group: 'meta' }),
    defineField({
      name: 'seoDescription',
      type: 'text',
      rows: 2,
      validation: (r) => r.max(160).warning('Aim for under 160 characters.'),
      group: 'meta',
    }),
  ],

  preview: {
    select: { title: 'displayTitle', subtitle: 'status', slug: 'slug.current' },
    prepare: ({ title, subtitle, slug }) => ({
      title: title ?? 'Untitled assessment',
      subtitle: `[${subtitle ?? 'draft'}] /${slug ?? ''}`,
    }),
  },
})
