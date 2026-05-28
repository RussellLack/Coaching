import { defineType, defineField } from 'sanity'

/**
 * Submission — a record of a single completed assessment by a single user.
 *
 * Written to Sanity by the /api/assessment-submit route after the primary
 * PDF email has been queued. Stores the minimum needed to evaluate
 * cross-assessment combinations (email + assessment slug + tier +
 * interpretation keys + CRM tags + timestamp), plus a hash of the email
 * for privacy-preserving lookups in the Studio.
 *
 * No PII other than the email itself. Full names entered in Assessment 5
 * never reach the submission record — they're sanitised to initials at
 * payload-build time and don't propagate further.
 *
 * Russell can browse submissions in Studio, filter by emailHash, and
 * see at a glance who's taken which assessment. The Studio view is also
 * how he'd manually trigger or re-trigger a combination email if needed.
 */
export default defineType({
  name: 'submission',
  title: 'Submission',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'result', title: 'Result' },
    { name: 'context', title: 'Context' },
  ],
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'identity',
      description:
        'The email the user submitted with. Stored for cross-assessment matching; never displayed publicly.',
      validation: (R) => R.required().max(254),
      readOnly: true,
    }),
    defineField({
      name: 'emailHash',
      title: 'Email hash (lookup key)',
      type: 'string',
      group: 'identity',
      description:
        'SHA-256 of the lowercased, trimmed email. Used for fast lookup queries. Same email always produces the same hash.',
      validation: (R) => R.required().length(64),
      readOnly: true,
    }),
    defineField({
      name: 'assessmentSlug',
      title: 'Assessment',
      type: 'string',
      group: 'result',
      description:
        'The slug of the assessment that was taken (e.g. "coaching-readiness").',
      validation: (R) => R.required().max(80),
      readOnly: true,
    }),
    defineField({
      name: 'tierId',
      title: 'Tier matched',
      type: 'string',
      group: 'result',
      description:
        'The id of the result tier that matched (e.g. "ready", "intuitive_maximiser").',
      validation: (R) => R.required().max(80),
      readOnly: true,
    }),
    defineField({
      name: 'interpretationKeys',
      title: 'Interpretation keys',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'result',
      description:
        'The interpretation keys emitted by the scoring engine (e.g. "distortion.catastrophising", "factor.rising.craft"). Used by combination matching to find specific patterns.',
      readOnly: true,
    }),
    defineField({
      name: 'crmTags',
      title: 'CRM tags',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'result',
      description:
        'Tags emitted by the engine (e.g. "rising:craft", "distortion:catastrophising"). Useful for combination-condition queries.',
      readOnly: true,
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted at',
      type: 'datetime',
      group: 'context',
      validation: (R) => R.required(),
      readOnly: true,
    }),
    defineField({
      name: 'combinationMatched',
      title: 'Combination matched',
      type: 'string',
      group: 'context',
      description:
        'If a cross-assessment combination triggered a nudge email for this submission, the combination id is recorded here. Null for normal first-of-kind submissions.',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Most recent first',
      name: 'submittedAtDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      email: 'email',
      assessmentSlug: 'assessmentSlug',
      tierId: 'tierId',
      submittedAt: 'submittedAt',
      combinationMatched: 'combinationMatched',
    },
    prepare(sel) {
      const email = (sel.email as string | undefined) ?? 'unknown'
      const slug = (sel.assessmentSlug as string | undefined) ?? '?'
      const tier = (sel.tierId as string | undefined) ?? '?'
      const at = sel.submittedAt as string | undefined
      const combo = sel.combinationMatched as string | undefined
      const datePart = at ? new Date(at).toISOString().split('T')[0] : ''
      return {
        title: `${email} — ${slug}`,
        subtitle: [tier, datePart, combo ? `→ ${combo}` : null]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
