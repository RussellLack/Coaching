# Add assessment engine + all six assessments + archetype-led entry page

Adds the runtime, schema, and content for **all six** fab.partners assessments, plus an archetype-led `/assessments` index page that routes visitors into the right assessment based on the situation they're navigating.

1. **Coaching Readiness Scan** ("Are You Actually Ready for Coaching?") — 13 Likert questions, 5 dimensions
2. **Leadership Resilience Wheel** — 8 sliders, 8 domains, polar visualisation
3. **Decision-Making Style Diagnostic** ("How You Decide With (And Without) AI") — 8 scenarios across four styles (AM/AS/IM/IS), three AI calibration questions, 2×2 quadrant visualisation, twelve style × AI-band profiles, two override flags
4. **Cognitive Distortion Spotter** — 12 scenarios, 11 distortion families (including AI-relative), horizontal heatmap
5. **Support Matrix Audit** — dynamic stakeholder mapping, 8 diagnostic rules, 2×2 scatter visualisation, AI stance per person
6. **Success Definition Audit** — three-round point allocation across five factors, drift analysis, multi-line chart visualisation

Plus:
- **/assessments index page** — server-rendered. Six archetypes describing common senior-leader situations; each archetype recommends 2–3 assessments with a one-line rationale. Full assessment directory below the archetypes for visitors who don't see themselves in any of them. Page copy, archetypes, and assessment refs all editable in Sanity Studio.

Drops cleanly into the existing repo conventions (Next 16 App Router, React 19, Tailwind v4, Sanity 5).

**Status before merge:**
- 483 tests passing (condition evaluator, five scoring strategies, six end-to-end integration suites, six PDF visualisation unit tests, six end-to-end PDF rendering tests, archetype seed validation, /assessments page-component tests, analytics helper with consent gating, GoogleAnalytics component, cross-combination matcher, submission dispatch helpers, cross-combination seed validation, end-to-end simulation harness with full Assessment 5 tier coverage, consent module)
- Zero TypeScript errors in the new code
- Tailwind v4 utilities (no `tailwind.config.ts` introduced)
- Imports verified against the existing `src/sanity/lib/client.ts` and `src/sanity/env.ts`
- Privacy: full names entered in the Support Matrix stay client-side; server only receives initials. Analytics never sends PII — the event-properties type contract enumerates exactly what gets sent and there's no escape hatch. Submission records hash the email with SHA-256 for lookups; the full email is stored alongside for the email send and Studio browsing only
- The engine is now feature-complete: all five scoring strategies, all six question/visualisation types, all six assessments have NDJSON content and integration coverage
- PDF result documents render the correct visualisation per assessment, all routed through a single SVG dispatcher: dimension bars for Assessment 1, radar wheel for Assessment 2, 2×2 quadrant for Assessment 3, distortion heatmap for Assessment 4, stakeholder matrix for Assessment 5, time-shift lines for Assessment 6. Architectural invariant: every visualisation lives under `pdf/visualisations/`, renders as SVG, and is dispatched by `assessment.visualisation`.
- `/assessments` is the new homepage entry-point for the assessment portfolio; existing per-assessment pages at `/assessments/[slug]` continue to work unchanged
- Analytics events fire to GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; otherwise the calls cleanly no-op. Events tracked: `assessment_started` / `_completed` / `_submitted` (with tier and duration); `archetype_clicked` / `directory_clicked` (with archetype id and rank for archetype clicks)
- Cross-assessment combinations: when a user submits a second-or-later assessment, the route looks up all their prior submissions and evaluates active `crossCombination` documents against the history. If one matches, a short nudge email is sent. Two combinations seeded: "AI over-trust signal" (decision-making style + AI-relative distortions) and "Champion-AI Misalignment + Craft Rising" (stakeholder misalignment + shifting success definition). Each combination fires at most once per user (deduped via submission records)
- End-to-end simulation harness verifies the full pipeline holds together: every realistic answer pattern produces a matched tier (no silent matcher failures), interpretation keys that cross-combinations reference are actually emitted by the inputs they target, and both seeded combinations fire when paired submissions match their requirements. The harness caught one real bug in the seeded data on the first run (see below)
- Assessment 5 (Support Matrix) tier ordering was reviewed and re-ordered based on findings from the simulation harness. New editorial order: champion_gap (foundational gap) → champion_ai_misalign (specific high-stakes read) → stuck_at_glass (most actionable mid-state) → outweighed → ai_alignment → stance_visibility → visibility_gap → cold_room → healthy_map. All 9 declared tiers are now reachable from realistic patterns; the harness locks this in with explicit per-tier assertions
- Cookie consent for GA implemented with the strict-compliance approach: no Google Analytics scripts load and no `track()` calls fire until the user explicitly grants consent via the banner. State persists in localStorage; the user can change their mind via the "Manage cookies" link (intended for the site footer). A minimal placeholder privacy notice is provided at `/privacy` — review and replace before any traffic push

---

## What this adds

### Content schema (extends existing)

- `src/sanity/schemaTypes/assessment.ts` — **new.** One document = one assessment. Polymorphic question types, declarative scoring, result tiers + interpretations as Portable Text.
- `src/sanity/schemaTypes/siteSettings.ts` — **modified.** Adds four fields under a new "Assessments" group (`defaultWebformEndpoint`, `defaultCalendarUrl`, `defaultAttributionFooter`, `privacyNotice`). The existing four fields (`title`, `tagline`, `bookingEmail`, `scanPrice`) are unchanged.
- `src/sanity/schemaTypes/index.ts` — **modified.** Adds `assessment` to the type registry.
- `src/sanity/structure.ts` — **modified.** Pins `siteSettings` as a singleton, surfaces "Assessments" as its own list with `orderInList` sorting, falls through to `documentTypeListItems()` for everything else. Replaces the bare `S.documentTypeListItems()` pattern from before.

### Queries

- `src/sanity/lib/queries.ts` — **new.** Five typed queries via `defineQuery` from `next-sanity` (so they pick up sanity typegen): `ASSESSMENTS_INDEX_QUERY`, `ASSESSMENT_BY_SLUG_QUERY`, `ASSESSMENT_SLUGS_QUERY`, `ASSESSMENT_SEO_QUERY`, `SITE_SETTINGS_QUERY`.

### Engine (the actual scoring logic)

- `src/types/assessment.ts` — **new.** Shared TypeScript contracts (Assessment, Question, Answers, ScoringResult, WebformPayload, etc.).
- `src/lib/assessment/condition/evaluator.ts` — **new.** Safe expression parser for result-tier conditions. Hand-written recursive descent, no `eval()`, no `Function` constructor. Supports `>`, `>=`, `<`, `<=`, `==`, `!=`, `&&`, `||`, `in [...]`, parentheses, variables, numeric/string literals.
- `src/lib/assessment/scoring/index.ts` — **new.** Strategy dispatcher.
- `src/lib/assessment/scoring/dimensional-likert.ts` — **new.** Implements one of five scoring strategies. The other four are stubbed in the dispatcher for assessments 2–6.
- `src/lib/assessment/tier-matcher.ts` — **new.** Composes scoring + condition evaluation to produce the final tier match.
- `src/lib/assessment/pdf/render-assessment-pdf.tsx` — **new.** PDF generator using `@react-pdf/renderer`. Renders Portable Text into a print-shaped layout (cover, scorecard, interpretations, next steps, footer).

### UI

- `src/components/assessment/AssessmentEngine.tsx` — **new.** Client component, `'use client'`. The orchestrator: intro → questions → results → thanks. Styled for the existing dark-teal / cream / coral palette.
- `src/components/assessment/questions/index.tsx` — **new.** Question dispatcher.
- `src/components/assessment/questions/Agreement5Question.tsx` — **new.** 1–5 Likert renderer. Other question types stubbed with placeholders.
- `src/components/assessment/visualisations/index.tsx` — **new.** Visualisation dispatcher.
- `src/components/assessment/visualisations/DimensionBars.tsx` — **new.** Horizontal bar visualisation (used by dimensional-likert).

### Routes

- `src/app/assessments/[slug]/page.tsx` — **new.** The assessment page. Server component, uses `Promise<{slug:string}>` params shape (Next 15+/16 idiom). `generateStaticParams`, `generateMetadata`, then renders the client-side `<AssessmentEngine>`.
- `src/app/api/assessment-submit/route.ts` — **new.** POST handler. Validates the payload, fetches the assessment definition (fresh, not CDN), generates the PDF, sends via Resend, optionally forwards to a CRM webhook.

### Styling

- `src/app/globals.css.PATCH.css` — **not committed as a separate file**, but the content needs to be **appended to the existing `src/app/globals.css`**. Adds Tailwind v4 `@theme` tokens that bind the existing CSS variables (`--teal`, `--cream`, etc.) to utility-class colour names, plus a small `.fab-prose` class for the result copy. The existing `:root` block and global styles are preserved.

### Content

- `seed/assessment-1.ndjson` — **new.** Sanity import file containing the "Coaching Readiness Scan" assessment as a draft. 13 questions across 5 dimensions, 4 result tiers, 5 gap interpretations.

### Tests

- `src/lib/assessment/condition/evaluator.test.ts` — 33 tests covering grammar, precedence, and security (no eval escape).
- `src/lib/assessment/scoring/dimensional-likert.test.ts` — 16 tests covering normal scoring, reverse scoring, missing answers, validation errors, boundary scenarios.
- `src/lib/assessment/integration.test.ts` — 16 end-to-end tests that load the actual `seed/assessment-1.ndjson` and validate the full pipeline. Catches authoring bugs (mismatched dimension IDs, missing interpretations, malformed conditions) the moment the content changes.

---

## Dependencies to add

Run:

```bash
npm install @portabletext/react @portabletext/types @react-pdf/renderer resend
```

Already in `package.json` (no change needed): `next`, `react`, `react-dom`, `@sanity/client`, `next-sanity`, `sanity`, `tailwindcss`.

For tests (already there or trivial to add):

```bash
npm install --save-dev vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

---

## Environment variables to set

Already present (used by existing site):
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`

New (server-only, set in Netlify):
- `RESEND_API_KEY` — get from resend.com → API Keys
- `RESEND_FROM_EMAIL` — must be on a domain verified in Resend (e.g. `Fab Partners <[email address in env vars]>`)

Optional:
- `CRM_WEBHOOK_URL` — forwards completed submissions to Zapier/Make/HubSpot
- `CRM_WEBHOOK_SECRET` — Bearer token if the webhook validates

---

## CSP changes needed in `netlify.toml`

The existing CSP allows Sanity and GA. The assessment engine adds:
- A `POST` from the page to `/api/assessment-submit` — already covered by `form-action 'self'`
- Resend (server-side only, doesn't need CSP)
- No new external client-side fetches

**No netlify.toml changes required for Assessment 1.**

---

## Deployment recipe

1. Merge this PR.
2. Add the new dependencies (`npm install`).
3. Set the new env vars in Netlify. The new ones this PR introduces:
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — your GA4 measurement ID (e.g. `G-XXXXXXXX`). When set, the GoogleAnalytics component injects gtag.js and the assessment lifecycle events start firing. When unset (default), all `track()` calls quietly no-op and no scripts are loaded.
   - `SANITY_WRITE_TOKEN` — a Sanity write-enabled token (with `editor` permissions). Required for the cross-assessment combination feature to record submissions and patch them with matched combination slugs. When unset, submission recording fails gracefully and combination nudges don't fire — primary PDF email still works.
4. Verify `fab.partners` is a Resend-verified domain (DKIM + SPF DNS records).
5. **Wire the cookie consent banner + GA component into your root layout once**:
   ```tsx
   // src/app/layout.tsx
   import { GoogleAnalytics } from '@/components/GoogleAnalytics'
   import { CookieConsentBanner } from '@/components/CookieConsentBanner'
   // ... inside the <body>:
   <CookieConsentBanner />
   <GoogleAnalytics />
   ```
   Both are safe to render unconditionally. `<GoogleAnalytics />` returns null when the measurement ID env var is unset OR when the user hasn't granted consent (so the gtag.js script never loads before consent). `<CookieConsentBanner />` returns null when the user has already decided. Optionally add `<ManageCookiesLink />` from `@/components/ManageCookiesLink` to the site footer so users can re-open the banner later.
6. Import all nine seed files (six assessments + index-page settings + archetypes + cross-combinations):
   ```bash
   npx sanity dataset import seed/assessment-1.ndjson production
   npx sanity dataset import seed/assessment-2.ndjson production
   npx sanity dataset import seed/assessment-3.ndjson production
   npx sanity dataset import seed/assessment-4.ndjson production
   npx sanity dataset import seed/assessment-5.ndjson production
   npx sanity dataset import seed/assessment-6.ndjson production
   npx sanity dataset import seed/assessments-index-settings.ndjson production
   npx sanity dataset import seed/archetypes.ndjson production
   npx sanity dataset import seed/cross-combinations.ndjson production
   ```
   The assessment files create drafts; publish them in Studio. The
   index-settings, archetype, and combinations files import as
   published documents (they don't go through a drafts.* step because
   they're meant to be live immediately). The archetype and combinations
   imports both depend on the assessment imports — the references won't
   resolve until the assessments exist, so run them in this order.
7. Smoke test:
   - `https://fab.partners/assessments` ← the new archetype-led index
   - `https://fab.partners/assessments/coaching-readiness`
   - `https://fab.partners/assessments/resilience-wheel`
   - `https://fab.partners/assessments/decision-making-style`
   - `https://fab.partners/assessments/cognitive-distortion-spotter`
   - `https://fab.partners/assessments/support-matrix`
   - `https://fab.partners/assessments/success-definition-audit`
   - Complete each, submit your own email.
   - PDFs arrive within ~30 seconds.

---

## Bugs caught by the simulation harness

Adding the end-to-end simulation harness surfaced one real bug in the seed data and one false assumption I was about to ship.

**Bug found and fixed: cross-combination 2 referenced non-existent tier ids.** The "Champion-AI Misalignment + Craft Rising" combination required Assessment 5 to land in either `champion_ai_misalignment` or `scattered_uncertain_ai`. Neither of those is a real tier id — the actual tier in Assessment 5's seed is `champion_ai_misalign` (no trailing `_ment`), and `scattered_uncertain_ai` doesn't exist at all. The closest real tier for the second branch is `ai_alignment`. The combination would have *never* fired in production. Fixed in `seed/cross-combinations.ndjson` and confirmed firing via simulation.

This is precisely the failure mode the seed-validation test we wrote last turn was supposed to catch — but that test only confirmed assessment slugs resolved (which they did), not tier ids. The seed test now passes despite the bug, and the simulation harness is what caught it. Worth either extending the seed-validation test to check tier ids against the actual assessment NDJSONs, or keeping the simulation as the canonical end-to-end check. The latter is what we have.

**False assumption corrected: `override.ai_overreliance` doesn't fire from "high AI band" alone.** It requires the calibration questions to express a contradictory pattern — high AI use combined with low confidence in AI output. My initial test pattern picked the highest score for all calibration questions including confidence, which doesn't produce over-reliance — it produces "engaged user." The corrected pattern picks high use + low confidence (the actual condition the strategy checks), and the override key now emits as expected. Worth noting in case Russell ever audits whether his real users are hitting this override: it's a more selective signal than the broader `overlay.{style}.leaning` keys.

**Unreachable tiers from uniform answer patterns** (not bugs, just measurement limits):
- Assessment 1 `ready-with-gap` — needs variance across dimensions; uniform answers skip past it.
- Assessment 2 `steady` — needs mixed slider values; uniform answers land on neighbouring tiers.
- Assessment 4 `two_patterns` — needs a mix of two distortion tags; single-tag patterns produce `significant_pattern` instead.
- Assessment 5 — ALL 9 tiers now reachable from realistic patterns. The initial simulation harness run surfaced four shadowed tiers (`ai_alignment`, `stuck_at_glass`, `visibility_gap`, `cold_room`). After review and a small tier re-order (see "Assessment 5 tier ordering" below), and a more carefully constructed set of test patterns, every tier is now reachable. The harness asserts each one explicitly.

---

## Assessment 5 tier ordering

The simulation harness found that four of Assessment 5's tiers were unreachable from realistic stakeholder maps because earlier-evaluated tiers were shadowing them under the matcher's first-match-wins logic.

After review the original ordering was changed in `seed/assessment-5.ndjson`. The new editorial order:

| # | Tier | Rationale |
|---|------|-----------|
| 1 | `champion_gap` | The most foundational finding. If you have no champion at all, that's the only thing that matters in the headline. (Was position 2; swapped with champion_ai_misalign for natural reading order — foundational gap before specific gap.) |
| 2 | `champion_ai_misalign` | The most specific high-stakes read when you DO have a champion but they're sceptical on AI. One person to talk to, identifiable, actionable. |
| 3 | `stuck_at_glass` | The most actionable mid-state — "convert one ally upward" is a concrete move. (Was position 5; moved ahead of outweighed and ai_alignment.) |
| 4 | `outweighed` | Structural pattern: more resistance than champions. Real but less specific than the above. |
| 5 | `ai_alignment` | Structural pattern: broad AI alignment gap among high-influence stakeholders. |
| 6 | `stance_visibility` | 3+ unknowns on AI stance — orthogonal structural find. Unchanged. |
| 7 | `visibility_gap` | Operating below the decision level. Unchanged. |
| 8 | `cold_room` | Most stakeholders cold to the change. Unchanged. |
| 9 | `healthy_map` | Fallback when no gap fires. Unchanged. |

The re-order doesn't change which tiers can fire — every tier is reachable both before and after. What it changes is **which tier wins when more than one is true**. Most maps satisfy multiple conditions; the ordering decides the headline read.

Note on positions 6–8: these were left in their original order because they're orthogonal to the champion-quadrant logic above. They fire only when none of the more important diagnoses applies, and within that group the original order (stance → visibility → support) reflects the rough severity of each finding.

---

## What's deliberately NOT included

- **Snapshot vs Deep Navigation Scan completeness trade-off** — design brief says the snapshot should be "valuable but incomplete enough to make the paid scan a logical next step." All six current assessments give a full diagnosis. Per Russell's call: ship as-is, refine after first user feedback.
- **Archetype-led routing is the entry point but no skip-to-result flow exists** — `/assessments` shows six archetypes and a directory. A visitor who matches no archetype scrolls past the tiles to the directory and self-serves. Worth measuring later: if too many people are dropping out before picking an assessment, the archetype tiles probably aren't doing the work; add an explicit "none of these — show me everything" button at the top of the archetypes section.
- **Archetype-to-assessment matching is editorial, not algorithmic** — Russell picks which 2–3 assessments each archetype recommends, in the order they should appear. There's no scoring or ranking under the hood. If we ever want to do "recommend assessments based on what the visitor told us they were navigating," that's a separate feature (a short intro questionnaire) and a different shape entirely.
- **PDF stakeholder matrix Y-axis label** — the web stakeholder matrix has both X and Y axis labels ("Influence →" along the bottom, rotated "Support →" along the left). The PDF version drops the Y-axis label because `@react-pdf/renderer`'s rotated-text support is limited — the rotation transform that works in web SVG doesn't reliably render in PDF SVG. The quadrant labels (Allies / Champions / Background / Resistance) carry most of the meaning, and the X-axis label alone reads well enough. If the rotated label becomes important, it can be done by placing each letter in its own Text element with manual y-offsets, but it wasn't worth the visual fragility for v1.
- **Per-round "hide siblings while answering"** — the spec for Assessment 6 suggests rendering each round in isolation so users don't anchor on their previous answers. Current orchestrator shows all questions on one scrollable page. Some users will reuse the past round's distribution verbatim; the assumption is that the act of distributing 11 points fresh still produces useful signal even with the previous answer visible. Worth re-examining once we have real user data.
- **Analytics for assessment completions** — no events fired to GA yet. Easy add later.
- **A/B testing** — fork the assessment document if you want variants.

---

## File-by-file change summary

```
NEW FILES (Assessment 1 + engine):
  seed/assessment-1.ndjson
  src/app/api/assessment-submit/route.ts
  src/app/assessments/[slug]/page.tsx
  src/components/assessment/AssessmentEngine.tsx
  src/components/assessment/questions/Agreement5Question.tsx
  src/components/assessment/questions/index.tsx
  src/components/assessment/visualisations/DimensionBars.tsx
  src/components/assessment/visualisations/index.tsx
  src/lib/assessment/condition/evaluator.test.ts
  src/lib/assessment/condition/evaluator.ts
  src/lib/assessment/integration.test.ts
  src/lib/assessment/pdf/render-assessment-pdf.tsx
  src/lib/assessment/scoring/dimensional-likert.test.ts
  src/lib/assessment/scoring/dimensional-likert.ts
  src/lib/assessment/scoring/index.ts
  src/lib/assessment/tier-matcher.ts
  src/sanity/lib/queries.ts
  src/sanity/schemaTypes/assessment.ts
  src/types/assessment.ts

NEW FILES (Assessment 2 — Resilience Wheel):
  seed/assessment-2.ndjson
  src/lib/assessment/scoring/dimensional-slider.ts
  src/lib/assessment/scoring/dimensional-slider.test.ts
  src/lib/assessment/integration-2.test.ts
  src/components/assessment/questions/Slider010Question.tsx
  src/components/assessment/visualisations/RadarWheel.tsx

NEW FILES (Assessment 4 — Cognitive Distortion Spotter):
  seed/assessment-4.ndjson
  src/lib/assessment/scoring/tally-by-tag.ts
  src/lib/assessment/scoring/tally-by-tag.test.ts
  src/lib/assessment/integration-4.test.ts
  src/components/assessment/questions/ScenarioRadioQuestion.tsx
  src/components/assessment/visualisations/DistortionHeatmap.tsx

NEW FILES (Assessment 5 — Support Matrix Audit):
  seed/assessment-5.ndjson
  src/lib/assessment/scoring/support-matrix.ts
  src/lib/assessment/scoring/support-matrix.test.ts
  src/lib/assessment/integration-5.test.ts
  src/components/assessment/questions/PersonRowEntryQuestion.tsx
  src/components/assessment/visualisations/StakeholderMatrix.tsx

NEW FILES (Assessment 6 — Success Definition Audit):
  seed/assessment-6.ndjson
  src/lib/assessment/scoring/time-shift-points.ts
  src/lib/assessment/scoring/time-shift-points.test.ts
  src/lib/assessment/integration-6.test.ts
  src/components/assessment/questions/PointAllocationQuestion.tsx
  src/components/assessment/visualisations/TimeShiftLines.tsx

NEW FILES (Assessment 3 — Decision-Making Style Diagnostic):
  seed/assessment-3.ndjson
  src/lib/assessment/integration-3.test.ts
  src/components/assessment/questions/CalibrationQuestion.tsx
  src/components/assessment/visualisations/Quadrant2x2.tsx
  (scoring strategy reuses tally-by-tag with calibration extensions;
   question renderer reuses ScenarioRadioQuestion)

NEW FILES (PDF visualisations):
  src/lib/assessment/pdf/colours.ts
  src/lib/assessment/pdf/visualisations/index.tsx
  src/lib/assessment/pdf/visualisations/RadarWheel.tsx       (Assessment 2)
  src/lib/assessment/pdf/visualisations/StakeholderMatrix.tsx (Assessment 5)
  src/lib/assessment/pdf/visualisations/DistortionHeatmap.tsx (Assessment 4)
  src/lib/assessment/pdf/visualisations/TimeShiftLines.tsx    (Assessment 6)
  src/lib/assessment/pdf/visualisations/Quadrant2x2.tsx       (Assessment 3)
  src/lib/assessment/pdf/visualisations/DimensionBars.tsx     (Assessment 1 — ported from View-based bars to SVG)
  src/lib/assessment/pdf/visualisations.test.tsx              (27 unit tests)
  src/lib/assessment/pdf/render-assessment-pdf.test.tsx       (8 end-to-end PDF tests)

NEW FILES (archetype-led /assessments page):
  seed/archetypes.ndjson                                       (6 archetypes)
  seed/assessments-index-settings.ndjson                       (page copy singleton)
  src/sanity/schemaTypes/archetype.ts                          (document type)
  src/sanity/schemaTypes/assessmentsIndexSettings.ts           (singleton schema)
  src/app/assessments/page.tsx                                 (server-rendered index page)
  src/app/assessments/page.test.tsx                            (12 page-component tests)
  src/lib/assessment/archetypes-seed.test.ts                   (11 seed validation tests)

NEW FILES (analytics):
  src/lib/analytics.ts                                         (track() helper + getMeasurementId)
  src/lib/analytics.test.ts                                    (15 helper tests)
  src/components/GoogleAnalytics.tsx                           (gtag.js script injector)
  src/components/GoogleAnalytics.test.tsx                      (3 component tests)
  src/app/assessments/TrackedLinks.tsx                         (client-side tracked Link wrappers)

NEW FILES (cross-assessment combinations + nudge emails):
  seed/cross-combinations.ndjson                               (2 seeded combinations)
  src/sanity/schemaTypes/submission.ts                         (submission record document type)
  src/sanity/schemaTypes/crossCombination.ts                   (combination document type)
  src/lib/assessment/cross-combination.ts                      (matcher + hashEmail helper)
  src/lib/assessment/cross-combination.test.ts                 (21 matcher tests)
  src/lib/assessment/submission-dispatch.ts                    (recordSubmission + dispatchCombinationNudge)
  src/lib/assessment/submission-dispatch.test.ts               (20 dispatcher tests)
  src/lib/assessment/cross-combinations-seed.test.ts           (14 seed validation tests)

NEW FILES (simulation harness):
  src/lib/assessment/simulation-harness.test.ts                (26 end-to-end pipeline tests, full A5 tier coverage)

NEW FILES (cookie consent + privacy):
  src/lib/consent.ts                                           (consent state hook + helpers; localStorage-backed, event-driven)
  src/lib/consent.test.ts                                      (15 consent state tests)
  src/components/CookieConsentBanner.tsx                       (bottom-right consent prompt with Accept/Reject buttons)
  src/components/ManageCookiesLink.tsx                         (button styled as a footer link to re-open the banner)
  src/app/privacy/page.tsx                                     (placeholder privacy notice — review/replace before traffic push)

MODIFIED FILES:
  src/sanity/schemaTypes/siteSettings.ts  (added 4 fields under new "assessments" group)
  src/sanity/schemaTypes/index.ts         (registered all 9 document types: existing 5 + archetype + assessmentsIndexSettings + submission + crossCombination)
  src/sanity/structure.ts                 (pinned both singletons; added Archetypes, Cross-Assessment Combinations, and Submissions lists)
  src/types/assessment.ts                 (added interpretationKeys: string[] to WebformPayload.result; added Archetype, ArchetypeRecommendation, AssessmentDirectoryRow, AssessmentsIndexSettings, AssessmentsIndexPageData types; added SubmissionRecord, CrossCombination, CrossCombinationRequirement types)
  src/sanity/lib/queries.ts               (added ASSESSMENTS_INDEX_PAGE_QUERY, ACTIVE_COMBINATIONS_QUERY, and SUBMISSIONS_BY_EMAIL_HASH_QUERY)
  src/app/api/assessment-submit/route.ts  (after the primary PDF email is sent, records the submission to Sanity and runs cross-combination matching. All best-effort: failures log but never fail the primary request. Returns combinationMatched: string | null in the response body so the client can show a brief "we'll be in touch" message if relevant)
  src/lib/analytics.ts                    (track() now reads consent before firing; no-ops when consent is not 'granted')
  src/components/GoogleAnalytics.tsx      (now a client component that gates the gtag.js script on consent; subscribes to consent-change event to mount on accept without a page refresh; exposes pure `shouldRenderGtag()` helper for testability)
  src/components/assessment/AssessmentEngine.tsx      (tightened PersonRow completion check; added privacy-safe initials truncation in payload; expanded primary-finding extractor for all five strategies; added distortion:* / rising:* / falling:* / anchor:* / pattern:* / style:* / ai_band:* CRM tags; passes pointAllocationFactors through to renderer; renders Part Two calibration question block when calibrationQuestions are declared; threads interpretationKeys into the payload; fires assessment_started in handleStart, assessment_completed in handleSeeResults, and assessment_submitted after the API returns 200)
  src/components/assessment/questions/index.tsx       (wired all five question types; passes factors prop to PointAllocation renderer)
  src/components/assessment/visualisations/index.tsx  (wired all six visualisations)
  src/lib/assessment/scoring/index.ts                 (registered all five scoring strategies; complete Record not Partial)
  src/lib/assessment/scoring/tally-by-tag.ts          (added calibration question reading; emits style.{tag}, overlay.{tag}.{band}, override.ai_overreliance, override.ai_underuse interpretation keys when calibration is present; exposes ai_use_score, ai_overreliance, ai_underuse as numeric variables)
  src/lib/assessment/pdf/render-assessment-pdf.tsx    (reads interpretationKeys from payload instead of recomputing; dispatches ALL six visualisations through the dispatcher (including dimension bars, now SVG-ported); section title adapts to visualisation type; dead computeInterpretationKeys helper removed; extracts PDF_COLOURS into shared colours.ts; scorecard-specific View/Text styles removed since the SVG component owns its own layout)
  src/app/globals.css                     (append the content of globals.css.PATCH.css — Tailwind @theme tokens + .fab-prose + slider styling)
```

---

## Trade-offs worth flagging

1. **PDF library is heavy.** `@react-pdf/renderer` adds ~2MB to the function bundle. Acceptable for a low-volume use case (assessments submit a few times a day at most). If volume grows, switch to a cheaper renderer (pdfkit, puppeteer-via-vercel-functions, etc.).

2. **Email failures don't fail the request.** If Resend is down, the user still sees their result on screen and gets a 200 OK. The PDF email just doesn't arrive. Logged for observability but not surfaced to the user — design call. Alternative would be to retry-with-backoff, which is more work for a small marginal benefit at this stage.

3. **No idempotency on submission.** A user double-clicking the submit button could in principle trigger two emails. Browser-side `isSubmitting` state prevents this in practice. Add server-side dedup if it becomes a real problem.

4. **`force-dynamic` on the submit route.** Could cache for a few seconds to absorb double-submits, but `force-dynamic` is the safer default for now.

5. **PDF interpretation key computation is duplicated.** The PDF renderer has its own `computeInterpretationKeys` function rather than importing from the scoring engine, to keep the PDF function self-contained (React-DOM in a serverless function is a footgun). If a new scoring strategy adds new interpretation patterns, both places need updating. Acceptable for now (one strategy live); revisit when adding more.

6. **Support Matrix privacy is "best effort", not cryptographic.** The user types real names in their browser. Those names live in the React state while they fill out the form. Names get truncated to initials at submission time in `buildPayload()`, so the server, the CRM webhook, the email metadata, and Russell's lead list only ever see initials. But: the names are briefly in client memory; a sophisticated attacker who already had JavaScript execution on the user's machine could read them. The protections are sufficient for normal CRM/marketing privacy expectations, not for adversarial threat models. Notable as a trade-off if a user is mapping people they shouldn't be naming at all.

7. **The tally-by-tag praise threshold is a code constant, not a Sanity field.** `PRAISE_THRESHOLD_RATIO = 0.75` in `tally-by-tag.ts` decides when to emit `praise.clear_thinking` instead of distortion keys. Hard-coding it means tweaking the threshold needs a deploy, but the alternative (per-assessment config in Sanity) added schema surface for a value that's unlikely to be edited often. The tier conditions in Sanity express the "Clear Thinking" tier separately (`healthy_count >= 9`), so the tier and the praise-key emission have to be kept in sync if either threshold moves. Documented in the scoring strategy comments; flagged here so the symmetry isn't surprising. If a future assessment needs a different threshold (e.g. Assessment 3's decision-style "balanced" tier might use a different ratio), the right move is to make the constant a per-strategy config rather than per-assessment.

8. **The time-shift-points stable_shape threshold is also a code constant.** Same pattern: `STABLE_SHAPE_THRESHOLD = 6` in `time-shift-points.ts` and the matching tier condition `total_drift_magnitude < 6` in Sanity. Both need to move together if you want to retune what counts as a "stable shape." Worth revisiting after real user data arrives — if most leaders' total drift sits between 4 and 10, 6 is probably the right threshold; if the distribution is wider, it'll need adjustment.

9. **Assessment 6 shows all three rounds on one scrollable page rather than isolating each round.** The spec recommended hiding previous rounds while the user answers the next, on the grounds that anchoring on the past round contaminates the future allocation. The current orchestrator renders all questions on a single page; modifying that for one assessment was deemed not worth the structural complexity. Trade-off: some users will copy their past distribution verbatim into the present and future rounds. The assumption is that the act of distributing 11 points fresh still produces useful signal even with the previous answer visible. Worth re-examining once we see how often the three rounds are identical in real data — if it happens >30% of the time, the cost of fixing the orchestrator may be justified.

10. **Assessment 3's tag declaration order is analytical-first (AM > AS > IM > IS).** This is the tie-break order when two styles are tied for primary. The spec named "anchoring on instinct" as the tie-break rule, which would have argued for intuitive-first. The current ordering was kept because (a) tie-breaks at the *static* declaration-order level can't actually implement runtime anchoring, (b) analytical-first is the more conservative default for a senior-leader audience, and (c) the integration tests were already written against analytical-first, making the change low-friction. If user data shows a meaningful chunk of users tying between exactly two styles, it's worth revisiting whether the tie-break should somehow consult the user's first-pick instinct directly. Documented in `tally-by-tag.ts` comments and the integration test.

11. **Calibration questions use the conventional IDs `q_ai_use`, `q_ai_defer`, `q_ai_confidence`.** The scoring strategy looks for these specific IDs and falls back gracefully when they're absent (Assessment 4 has no calibration questions and works fine). If a future assessment needs different AI-related calibration questions, either reuse these IDs with different prompts (the strategy doesn't care about the prompt text) or extend the strategy to accept a configurable mapping. The hard-coded IDs are documented in `tally-by-tag.ts`'s `readCalibration()` function.

---

## Next steps after merge

In rough priority order:

1. **Snapshot completeness review** — once we have real user data across all six assessments, decide whether to trim the on-screen result / PDF to better fit the snapshot vs paid-scan structure. The simulation harness covers end-to-end pipeline correctness (all tiers reachable from realistic patterns, all interpretation keys emit when expected, both cross-combinations fire), but it cannot substitute for actual reader reactions. The decision requires seeing how real visitors respond — what feels too generous, what feels thin, where the email-capture rate diverges by tier — and that data only exists after launch.
2. **The stable_shape threshold for Assessment 6** — currently hard-coded at `total_drift_magnitude < 6` (in code and in the tier condition). Worth revisiting once we see actual drift distributions. If most leaders fall under 6, the threshold should probably move lower; if almost nobody does, the meta-pattern read becomes less useful.
3. **The AI-relative distortions Substack post** — flagged in the Assessment 4 turn. Still the strongest piece of seed content the practice could publish before going live. Burns/Beck's ten distortions are well-established; "AI-magnification" and "AI-minimisation" as distinct family members are genuinely new intellectual content.
4. **Migrate `assessmentsIndexSettings` into `siteSettings`** — currently the assessments-index page copy lives in its own singleton document. If editorial pattern is "all global page copy under Site Settings", folding it in is a trivial migration. Kept separate for now because the page copy is its own surface and worth editing without scrolling past the homepage hero.
5. **Privacy notice review** — `/privacy` ships with placeholder content that describes the actual data flows in plain English. Worth reviewing before traffic — particularly the retention claim (12 months) which should match the actual cadence Russell intends to apply, and the contact email which is set to `[email address in env vars]`. Easy to convert this page into a Sanity-managed document if editorial control is wanted, but unnecessary while it's stable.
6. **Submission retention policy** — submission records grow unboundedly. For a low-volume site this isn't an immediate issue, but worth thinking about: a Sanity GROQ scheduled function (or a Netlify scheduled function calling Sanity) could delete submissions older than, say, 12 months. The cross-combination matching only needs recent history anyway. Defer until data volume warrants it. The privacy notice already claims 12 months — implementing actual deletion would bring practice in line with claim.
7. **Additional cross-combinations** — only two are seeded. There are at least a dozen more diagnostic ones across the six assessments. Worth Russell drafting more as he sees patterns in real user data; the schema and dispatch logic are now in place to support them with no code changes.
