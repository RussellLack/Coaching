/**
 * Type contracts for the fab.partners assessment engine.
 *
 * These types model what the engine actually consumes. They are intentionally
 * looser than the Sanity-generated types — the engine should work with any
 * source of correctly-shaped data, not just Sanity.
 *
 * When the Sanity TypeGen output is more specific than these (e.g. exact union
 * literals from radio dropdowns), the Sanity types win — these are the
 * lowest-common-denominator runtime contract.
 */

import type { PortableTextBlock } from '@portabletext/types'

// ── QUESTION TYPES ────────────────────────────────────────────────────────

export type QuestionType =
  | 'questionAgreement5'
  | 'questionSlider010'
  | 'questionScenarioRadio'
  | 'questionPointAllocation'
  | 'questionPersonRowEntry'

export interface Agreement5Question {
  _key: string
  _type: 'questionAgreement5'
  prompt: string
  dimensionId: string
  reverseScored?: boolean
}

export interface Slider010Question {
  _key: string
  _type: 'questionSlider010'
  prompt: string
  dimensionId: string
  anchorLow: string
  anchorHigh: string
}

export interface ScenarioOption {
  _key: string
  label: string
  tagId: string
}

export interface ScenarioRadioQuestion {
  _key: string
  _type: 'questionScenarioRadio'
  scenarioTitle?: string
  prompt: string
  options: ScenarioOption[]
}

export interface PointAllocationQuestion {
  _key: string
  _type: 'questionPointAllocation'
  roundLabel: string
  roundId: string
  totalPoints: number
  prompt?: PortableTextBlock[]
}

export interface StanceOption {
  _key: string
  id: string
  label: string
  description?: string
}

export interface PersonRowEntryQuestion {
  _key: string
  _type: 'questionPersonRowEntry'
  changePromptLabel: string
  changePromptHelp?: string
  changePromptExamples?: string[]
  minRows: number
  maxRows: number
  influenceAnchorLow: string
  influenceAnchorHigh: string
  supportAnchorLow: string
  supportAnchorHigh: string
  stanceOptions?: StanceOption[]
}

export type Question =
  | Agreement5Question
  | Slider010Question
  | ScenarioRadioQuestion
  | PointAllocationQuestion
  | PersonRowEntryQuestion

// ── SCORING METADATA ──────────────────────────────────────────────────────

export type ScoringStrategy =
  | 'dimensional-likert'
  | 'dimensional-slider'
  | 'tally-by-tag'
  | 'support-matrix'
  | 'time-shift-points'

export interface Dimension {
  _key: string
  id: string
  label: string
  description?: string
}

export interface TagCategory {
  _key: string
  id: string
  label: string
  group?: string
}

export interface CalibrationOption {
  _key: string
  label: string
  score: number
}

export interface CalibrationQuestion {
  _key: string
  id: string
  prompt: string
  options: CalibrationOption[]
}

export interface PointAllocationFactor {
  _key: string
  id: string
  label: string
  description?: string
}

// ── RESULT TIERS & INTERPRETATIONS ────────────────────────────────────────

export interface ResultTier {
  _key: string
  id: string
  label: string
  condition: string
  headline: PortableTextBlock[]
}

export interface Interpretation {
  _key: string
  key: string
  label?: string
  body: PortableTextBlock[]
}

export type Visualisation =
  | 'dimensionBars'
  | 'radarWheel'
  | 'quadrant2x2'
  | 'distortionHeatmap'
  | 'stakeholderMatrix'
  | 'timeShiftLines'

// ── ASSESSMENT DOCUMENT ───────────────────────────────────────────────────

export interface Assessment {
  _id: string
  slug: string
  displayTitle: string
  tagline?: string
  estimatedMinutes: number
  introCopy?: PortableTextBlock[]

  questions: Question[]
  pointAllocationFactors?: PointAllocationFactor[]

  scoringStrategy: ScoringStrategy
  dimensions?: Dimension[]
  tagCategories?: TagCategory[]
  calibrationQuestions?: CalibrationQuestion[]

  resultTiers: ResultTier[]
  interpretations?: Interpretation[]
  visualisation: Visualisation

  emailCaptureCopy?: PortableTextBlock[]
  ctaButtonLabel?: string
  postCaptureCtaCopy?: PortableTextBlock[]
  webformEndpoint?: string
  crmTags?: string[]

  attributionFooter?: PortableTextBlock[]
  seoTitle?: string
  seoDescription?: string
}

// ── ANSWER STORAGE ────────────────────────────────────────────────────────

// Answers are keyed by question _key so they survive reordering of the
// questions array. The shape of `value` depends on the question type.

export type AgreementAnswer = number // 1–5
export type SliderAnswer = number // 0–10
export type RadioAnswer = string // _key of the selected option
export type PointAllocationAnswer = Record<string, number> // factorId → points
export type PersonRow = {
  _key: string
  initials: string
  influence: number // 0–10
  support: number // 0–10
  stanceId?: string
}
export type PersonRowEntryAnswer = {
  changeDescription: string
  rows: PersonRow[]
}
export type CalibrationAnswer = number // score from the picked option

export type AnswerValue =
  | AgreementAnswer
  | SliderAnswer
  | RadioAnswer
  | PointAllocationAnswer
  | PersonRowEntryAnswer
  | CalibrationAnswer

export type Answers = Record<string, AnswerValue>

// ── SCORING RESULTS ───────────────────────────────────────────────────────

// Each strategy returns a shape that includes whatever the result-tier
// conditions and visualisations need to consume. The `interpretationKeys`
// list tells the renderer which interpretation cards to fetch and display
// alongside the headline tier.

export interface BaseScoringResult {
  /**
   * Variables made available to the condition evaluator.
   * E.g. { overall: 4.1, currency: 3.5 } for dimensional-likert.
   */
  variables: Record<string, number | string>

  /**
   * Interpretation keys to render alongside the tier (e.g. ["gap.currency"]).
   */
  interpretationKeys: string[]

  /**
   * Strategy-specific raw result used by the visualisation component
   * and by the CRM payload. Shape varies by strategy.
   */
  raw: Record<string, unknown>
}

export interface DimensionalLikertResult extends BaseScoringResult {
  variables: {
    overall: number
    [dimensionId: string]: number | string
  }
  raw: {
    dimensions: Record<string, number>
    overall: number
    lowestDimension: string
    highestDimension: string
  }
}

// ── ENGINE RUNTIME ────────────────────────────────────────────────────────

export interface ScoringContext {
  assessment: Assessment
  answers: Answers
}

export type ScoringFunction = (ctx: ScoringContext) => BaseScoringResult

// ── WEBFORM PAYLOAD ───────────────────────────────────────────────────────

export interface WebformPayload {
  assessment: {
    slug: string
    displayTitle: string
  }
  email: string
  result: {
    tier: string
    primaryFinding: string
    // Interpretation keys emitted by the scoring engine. The PDF renderer
    // uses these to look up matched interpretation copy without having
    // to reimplement strategy-specific scoring logic.
    interpretationKeys: string[]
    raw: Record<string, unknown>
  }
  crmTags: string[]
  meta: {
    submittedAt: string
    durationSeconds: number
    userAgent: string
  }
}

// ── ASSESSMENTS INDEX PAGE ────────────────────────────────────────────────

/**
 * A single recommendation from an archetype to an assessment.
 *
 * The `assessment` field is dereferenced by the GROQ projection — the
 * page receives the slug, displayTitle, tagline, and estimatedMinutes
 * inline rather than a raw reference. This lets the page render
 * everything in a single fetch.
 */
export interface ArchetypeRecommendation {
  _key: string
  rationale: string
  assessment: {
    slug: string
    displayTitle: string
    tagline?: string
    estimatedMinutes?: number
  }
}

export interface Archetype {
  _id: string
  title: string
  displayTitle?: string
  slug: string
  situation: PortableTextBlock[]
  recommendations: ArchetypeRecommendation[]
  orderInList: number
  isDraft?: boolean
}

/**
 * A row in the public assessment directory — a slim projection of the
 * full Assessment doc, just what the index page needs to render a card.
 */
export interface AssessmentDirectoryRow {
  _id: string
  slug: string
  displayTitle: string
  tagline?: string
  estimatedMinutes?: number
  orderInList?: number
}

export interface AssessmentsIndexSettings {
  heroHeadline: string
  heroIntro: PortableTextBlock[]
  archetypesHeading: string
  directoryHeading: string
  directoryIntro?: string
  seoTitle?: string
  seoDescription?: string
}

/**
 * The complete bundle returned by the assessments-index query.
 *
 * Renders into the /assessments page server component.
 */
export interface AssessmentsIndexPageData {
  settings: AssessmentsIndexSettings | null
  archetypes: Archetype[]
  directory: AssessmentDirectoryRow[]
}

// ── CROSS-ASSESSMENT COMBINATIONS ─────────────────────────────────────────

/**
 * A stored submission record — written to Sanity after a successful
 * assessment submission, used as the lookup source for cross-assessment
 * combination matching.
 *
 * Only the email hash is used for the lookup query; the full email is
 * stored alongside for the email send and so Russell can browse
 * submissions in Studio.
 */
export interface SubmissionRecord {
  _id?: string
  email: string
  emailHash: string
  assessmentSlug: string
  tierId: string
  interpretationKeys: string[]
  crmTags: string[]
  submittedAt: string
  combinationMatched?: string | null
}

/**
 * One requirement inside a cross-assessment combination's condition.
 * Satisfied when the user has at least one submission of the named
 * assessment whose tier id is in `anyOfTiers` OR whose interpretation
 * keys overlap with `anyOfInterpretationKeys`.
 */
export interface CrossCombinationRequirement {
  _key: string
  assessmentSlug: string
  anyOfTiers?: string[]
  anyOfInterpretationKeys?: string[]
}

export interface CrossCombination {
  _id: string
  title: string
  slug: string
  rationale: string
  requirements: CrossCombinationRequirement[]
  emailSubject: string
  emailBody: PortableTextBlock[]
  ctaLabel?: string
  ctaHref?: string
  isActive: boolean
  orderInList: number
}
