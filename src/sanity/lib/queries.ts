import { defineQuery } from 'next-sanity'

/**
 * GROQ queries for the assessment engine.
 *
 * All queries use defineQuery so types are generated automatically by
 * sanity typegen.
 */

// Portable Text fragment — reused across every block of result copy.
const portableTextFragment = /* groq */ `
  ...,
  _type == "block" => {
    ...,
    children[]{
      ...,
      marks[]
    }
  }
`

// ── INDEX (list of live assessments) ───────────────────────────────
export const ASSESSMENTS_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "assessment" && status == "live"] | order(coalesce(orderInList, 999), displayTitle){
    _id,
    "slug": slug.current,
    displayTitle,
    tagline,
    estimatedMinutes
  }
`)

// ── ASSESSMENT BY SLUG ─────────────────────────────────────────────
export const ASSESSMENT_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "assessment" && slug.current == $slug && status == "live"][0]{
    _id,
    "slug": slug.current,
    displayTitle,
    tagline,
    estimatedMinutes,
    introCopy[]{ ${portableTextFragment} },

    questions[]{
      _key,
      _type,
      _type == "questionAgreement5" => {
        prompt,
        dimensionId,
        reverseScored
      },
      _type == "questionSlider010" => {
        prompt,
        dimensionId,
        anchorLow,
        anchorHigh
      },
      _type == "questionScenarioRadio" => {
        scenarioTitle,
        prompt,
        options[]{ _key, label, tagId }
      },
      _type == "questionPointAllocation" => {
        roundLabel,
        roundId,
        totalPoints,
        prompt[]{ ${portableTextFragment} }
      },
      _type == "questionPersonRowEntry" => {
        changePromptLabel,
        changePromptHelp,
        changePromptExamples,
        minRows,
        maxRows,
        influenceAnchorLow,
        influenceAnchorHigh,
        supportAnchorLow,
        supportAnchorHigh,
        stanceOptions[]{ _key, id, label, description }
      }
    },

    pointAllocationFactors[]{ _key, id, label, description },

    scoringStrategy,
    dimensions[]{ _key, id, label, description },
    tagCategories[]{ _key, id, label, group },
    calibrationQuestions[]{
      _key,
      id,
      prompt,
      options[]{ _key, label, score }
    },

    resultTiers[]{
      _key,
      id,
      label,
      condition,
      headline[]{ ${portableTextFragment} }
    },
    interpretations[]{
      _key,
      key,
      label,
      body[]{ ${portableTextFragment} }
    },
    visualisation,

    emailCaptureCopy[]{ ${portableTextFragment} },
    ctaButtonLabel,
    postCaptureCtaCopy[]{ ${portableTextFragment} },
    webformEndpoint,
    crmTags,

    attributionFooter[]{ ${portableTextFragment} },
    seoTitle,
    seoDescription
  }
`)

// ── SLUGS (for generateStaticParams) ───────────────────────────────
export const ASSESSMENT_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "assessment" && status == "live" && defined(slug.current)]{
    "slug": slug.current
  }
`)

// ── SEO ────────────────────────────────────────────────────────────
export const ASSESSMENT_SEO_QUERY = defineQuery(/* groq */ `
  *[_type == "assessment" && slug.current == $slug && status == "live"][0]{
    "slug": slug.current,
    seoTitle,
    seoDescription,
    displayTitle,
    tagline
  }
`)

// ── SITE SETTINGS (singleton) ──────────────────────────────────────
export const SITE_SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_type == "siteSettings"][0]{
    title,
    tagline,
    bookingEmail,
    scanPrice,
    defaultWebformEndpoint,
    defaultCalendarUrl,
    defaultAttributionFooter[]{ ${portableTextFragment} },
    privacyNotice[]{ ${portableTextFragment} }
  }
`)

// ── CROSS-ASSESSMENT COMBINATIONS ──────────────────────────────────
// Used by the /api/assessment-submit route to evaluate combination
// matches against a user's submission history.

// Query: all active combinations, ordered by priority.
export const ACTIVE_COMBINATIONS_QUERY = defineQuery(/* groq */ `
  *[_type == "crossCombination" && isActive != false] | order(orderInList asc, title asc){
    _id,
    title,
    "slug": slug.current,
    rationale,
    requirements[]{
      _key,
      assessmentSlug,
      anyOfTiers,
      anyOfInterpretationKeys
    },
    emailSubject,
    emailBody[]{ ${portableTextFragment} },
    ctaLabel,
    ctaHref,
    isActive,
    orderInList
  }
`)

// Query: all submissions for a given email hash, oldest first. The
// route uses this to evaluate combinations against the user's full
// history.
export const SUBMISSIONS_BY_EMAIL_HASH_QUERY = defineQuery(/* groq */ `
  *[_type == "submission" && emailHash == $emailHash] | order(submittedAt asc){
    _id,
    email,
    emailHash,
    assessmentSlug,
    tierId,
    interpretationKeys,
    crmTags,
    submittedAt,
    combinationMatched
  }
`)
// One bundled query for the /assessments page. Pulls:
//   - The index-page settings singleton (copy, headings, SEO).
//   - All non-draft archetypes ordered by orderInList, with their
//     referenced assessments dereferenced inline (slug + display fields).
//   - All live assessments as a flat directory, ordered by orderInList.
//
// The page renders archetypes above the directory, then the directory
// below. Server-rendered; no client fetch required for the page itself.
//
// Named ASSESSMENTS_INDEX_PAGE_QUERY (not ASSESSMENTS_INDEX_QUERY) to
// disambiguate from the existing simple list query used elsewhere.

export const ASSESSMENTS_INDEX_PAGE_QUERY = defineQuery(/* groq */ `
{
  "settings": *[_type == "assessmentsIndexSettings"][0]{
    heroHeadline,
    heroIntro[]{ ${portableTextFragment} },
    archetypesHeading,
    directoryHeading,
    directoryIntro,
    seoTitle,
    seoDescription
  },
  "archetypes": *[_type == "archetype" && isDraft != true] | order(orderInList asc, title asc){
    _id,
    title,
    displayTitle,
    "slug": slug.current,
    situation[]{ ${portableTextFragment} },
    recommendations[]{
      _key,
      rationale,
      "assessment": assessment->{
        "slug": slug.current,
        displayTitle,
        tagline,
        estimatedMinutes
      }
    },
    orderInList,
    isDraft
  },
  "directory": *[_type == "assessment" && status == "live"] | order(orderInList asc, displayTitle asc){
    _id,
    "slug": slug.current,
    displayTitle,
    tagline,
    estimatedMinutes,
    orderInList
  }
}
`)
