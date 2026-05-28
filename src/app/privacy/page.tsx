import type { Metadata } from 'next'
import Link from 'next/link'
import { ManageCookiesLink } from '@/components/ManageCookiesLink'

/**
 * Privacy notice — placeholder content for fab.partners.
 *
 * This page is intentionally written in plain English rather than legal
 * boilerplate. It states what data is collected, by whom, why, and how
 * to opt out. It does NOT attempt to function as a full legal privacy
 * policy — Russell should review and replace before any meaningful
 * traffic push.
 *
 * What this page is for:
 *   1. Giving the consent banner something to link to (a GDPR/PECR
 *      requirement — the user must be able to read what they're
 *      consenting to before they consent).
 *   2. Documenting the actual data flows: GA4 analytics, assessment
 *      submission data, the cross-combination email nudge logic.
 *      These should be reviewed against Russell's actual practices.
 *
 * What this page is NOT:
 *   - A substitute for legal review. The language is conservative but
 *     this isn't a lawyer's privacy policy.
 *   - A cookie list. GA4 sets a small number of cookies (_ga, _ga_*);
 *     a full cookie audit would list each name, purpose, lifetime, and
 *     domain. Defer until volume warrants.
 *
 * The page is a server component for performance. The "Manage cookies"
 * button is the one client-component island.
 */

export const metadata: Metadata = {
  title: 'Privacy notice — fab.partners',
  description:
    'How fab.partners handles your data, including assessment results, email submissions, and analytics.',
}

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '64px 24px 96px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 17,
        lineHeight: 1.65,
        color: '#f5f0eb',
      }}
    >
      <h1
        style={{
          fontSize: 36,
          fontWeight: 400,
          margin: '0 0 8px 0',
          color: '#f5f0eb',
        }}
      >
        Privacy notice
      </h1>
      <p
        style={{
          margin: '0 0 32px 0',
          color: '#A89A82',
          fontSize: 14,
        }}
      >
        Last updated: May 2026
      </p>

      <h2 style={hStyle}>What we collect, and why</h2>
      <p style={pStyle}>
        fab.partners is a small coaching practice. We collect the minimum
        data needed to run the assessments and follow up with people
        who&rsquo;ve asked us to.
      </p>

      <h3 style={h3Style}>Assessment submissions</h3>
      <p style={pStyle}>
        When you complete an assessment and enter your email to receive
        the PDF, we store:
      </p>
      <ul style={ulStyle}>
        <li>Your email address.</li>
        <li>
          The assessment you took and the result you reached (the named
          tier, the interpretation keys that contributed to it, and the
          CRM tags we use to organise leads).
        </li>
        <li>The time you submitted.</li>
      </ul>
      <p style={pStyle}>
        We use this to send you the PDF, to track which assessments are
        useful enough to keep building, and — if you take more than one
        assessment — to notice patterns across your results that might
        be worth bringing up.
      </p>
      <p style={pStyle}>
        For one assessment (the Support Matrix), you&rsquo;ll enter the
        names of people in your stakeholder map. Those names never
        leave your browser. Only the initials reach our servers — we
        can&rsquo;t see who you mapped.
      </p>

      <h3 style={h3Style}>Analytics</h3>
      <p style={pStyle}>
        If you accept the cookie banner, we use Google Analytics 4 to
        understand which assessments people visit and which they
        complete. We don&rsquo;t send your email, your assessment
        answers, or any personal information to Google. The events we
        track are all about the assessment lifecycle — started,
        completed, submitted — plus which entry points (archetype tile,
        directory link) people click on.
      </p>
      <p style={pStyle}>
        Google Analytics anonymises IP addresses by default. If you
        decline analytics, no Google scripts load and no analytics
        cookies are set.
      </p>

      <h2 style={hStyle}>Who sees this data</h2>
      <p style={pStyle}>
        Russell Lack runs fab.partners and is the only person with
        access to the submission records. We use Sanity to store the
        data and Resend to send the PDF emails — neither of them
        accesses your information for any purpose other than running
        these services for us.
      </p>
      <p style={pStyle}>
        We don&rsquo;t sell data, share it with third-party advertisers,
        or use it to train AI models.
      </p>

      <h2 style={hStyle}>How long we keep it</h2>
      <p style={pStyle}>
        Assessment submission records are retained while they&rsquo;re
        useful for spotting cross-assessment patterns — practically,
        about twelve months. After that they&rsquo;re deleted. If
        you&rsquo;d like us to delete your records sooner, email Russell
        and we&rsquo;ll do it within a working week.
      </p>

      <h2 style={hStyle}>Your choices</h2>
      <ul style={ulStyle}>
        <li>
          <strong>Cookies and analytics:</strong>{' '}
          <ManageCookiesLink label="Change your cookie preference" />.
        </li>
        <li>
          <strong>Delete your data:</strong> email Russell at the
          address below and we&rsquo;ll remove your submission records.
        </li>
        <li>
          <strong>Stop receiving the nudge emails:</strong> reply to
          any of them with &ldquo;please stop&rdquo; and we will.
          We&rsquo;re a small practice; there&rsquo;s no list to
          unsubscribe from beyond the one Russell maintains by hand.
        </li>
      </ul>

      <h2 style={hStyle}>Contact</h2>
      <p style={pStyle}>
        Email Russell at{' '}
        <Link
          href="mailto:russell@fab.partners"
          style={{ color: '#0F4C5C', textDecoration: 'underline' }}
        >
          russell@fab.partners
        </Link>{' '}
        for anything related to your data.
      </p>

      <p
        style={{
          marginTop: 48,
          color: '#A89A82',
          fontSize: 14,
        }}
      >
        This is a working document. If you spot something that needs
        clarifying, tell us — we&rsquo;d rather fix it than dress it up.
      </p>
    </main>
  )
}

// ── INLINE STYLES ───────────────────────────────────────────────────────
// Kept inline so the page doesn't depend on global Tailwind classes
// that may evolve. The privacy page is a stable surface where the
// styling shouldn't drift as the rest of the site does.

const hStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  margin: '40px 0 12px 0',
  color: '#f5f0eb',
}

const h3Style: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  margin: '24px 0 8px 0',
  color: '#f5f0eb',
}

const pStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
}

const ulStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
  paddingLeft: 24,
}
