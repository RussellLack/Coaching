import type { StructureBuilder, StructureResolver } from 'sanity/structure'

/**
 * Studio structure for fab.partners.
 *
 * Groups the assessments under their own list item; everything else
 * flows through documentTypeListItems() as before.
 *
 * The siteSettings document is treated as a singleton — pinned at the
 * top of the structure and excluded from the auto-list so there's only
 * ever one of it.
 */
const SINGLETON_TYPES = new Set([
  'siteSettings',
  'assessmentsIndexSettings',
])

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // 1. Site Settings (singleton — pinned to a fixed ID)
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document().schemaType('siteSettings').documentId('siteSettings')
        ),

      // 2. Assessments Index page settings (singleton)
      S.listItem()
        .title('Assessments Index — page copy')
        .id('assessmentsIndexSettings')
        .child(
          S.document()
            .schemaType('assessmentsIndexSettings')
            .documentId('assessmentsIndexSettings')
        ),

      S.divider(),

      // 3. Assessments — own list, ordered by orderInList
      S.listItem()
        .title('Assessments')
        .id('assessments')
        .schemaType('assessment')
        .child(
          S.documentTypeList('assessment')
            .title('Assessments')
            .defaultOrdering([
              { field: 'orderInList', direction: 'asc' },
              { field: 'displayTitle', direction: 'asc' },
            ])
        ),

      // 4. Archetypes — own list, ordered by orderInList
      S.listItem()
        .title('Archetypes')
        .id('archetypes')
        .schemaType('archetype')
        .child(
          S.documentTypeList('archetype')
            .title('Archetypes')
            .defaultOrdering([
              { field: 'orderInList', direction: 'asc' },
              { field: 'title', direction: 'asc' },
            ])
        ),

      // 5. Cross-Assessment Combinations — definitions for the nudge emails
      S.listItem()
        .title('Cross-Assessment Combinations')
        .id('crossCombinations')
        .schemaType('crossCombination')
        .child(
          S.documentTypeList('crossCombination')
            .title('Cross-Assessment Combinations')
            .defaultOrdering([
              { field: 'orderInList', direction: 'asc' },
              { field: 'title', direction: 'asc' },
            ])
        ),

      // 6. Submissions — read-only records of every completed assessment
      S.listItem()
        .title('Submissions')
        .id('submissions')
        .schemaType('submission')
        .child(
          S.documentTypeList('submission')
            .title('Submissions')
            .defaultOrdering([
              { field: 'submittedAt', direction: 'desc' },
            ])
        ),

      S.divider(),

      // 7. Everything else from existing schema (hero, humanValue, journey),
      //    minus singletons and document types we've already surfaced.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId()
        return (
          id &&
          !SINGLETON_TYPES.has(id) &&
          id !== 'assessment' &&
          id !== 'archetype' &&
          id !== 'submission' &&
          id !== 'crossCombination'
        )
      }),
    ])
