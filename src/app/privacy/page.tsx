import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";

export const metadata: Metadata = {
  title: "Privacy notice — Fab Partners",
  description:
    "How Fab Partners handles personal data on this website and in coaching engagements.",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "4rem 1.5rem 6rem",
        lineHeight: 1.65,
      }}
    >
      <p style={{ marginBottom: "0.5rem", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
        Privacy
      </p>
      <h1
        style={{
          fontSize: "2.25rem",
          fontFamily: "var(--font-geist-sans), serif",
          fontWeight: 500,
          lineHeight: 1.2,
          margin: "0 0 2rem",
        }}
      >
        How we handle your data.
      </h1>

      <p>
        Fab Partners offers private coaching for senior professionals
        navigating AI disruption. The practice rests on confidentiality, and
        we take a deliberately minimal approach to personal data — both
        because it is required of us under EU and EEA data protection law,
        and because the work itself depends on trust.
      </p>

      <p>
        This notice explains what we collect, why, how long we keep it, and
        what rights you have. It applies to fab.partners and to the coaching
        engagements that follow from it. Last updated: 25 May 2026.
      </p>

      <h2 style={sectionHeading}>Who we are</h2>
      <p>
        The data controller is <strong>Fab Partners AS</strong>,
        organisasjonsnummer 932 443 511, registered at Sognsveien 118C,
        0860 Oslo, Norway. For any question about your data, contact{" "}
        <a href="mailto:hello@fab.partners" style={linkStyle}>
          hello@fab.partners
        </a>
        .
      </p>

      <h2 style={sectionHeading}>What we collect on this website</h2>
      <p>
        We use Google Analytics 4 to understand, in aggregate, how the site
        is used — pages viewed, broad geography, device type, how people
        arrived. Google Consent Mode v2 is configured so that{" "}
        <strong>no analytics cookies and no identifying data are set or
          sent until you actively accept the cookie banner</strong>. If you
        decline, we receive a cookieless ping for the page — a single
        anonymous beacon that tells us a visit happened, with no profile
        attached. IP addresses are anonymised. We do not use Google
        Analytics for advertising, do not run ad-personalisation signals,
        and do not pass your data on to advertising platforms.
      </p>

      <h2 style={sectionHeading}>What we collect when you contact us</h2>
      <p>
        If you take the free snapshot, request a strategy session, or email
        us at hello@fab.partners, we receive whatever you choose to share —
        typically a name, an email address, and a short description of your
        situation. We use this only to respond to you. We do not add you to
        a mailing list, and we do not pass your details to any third party.
      </p>

      <h2 style={sectionHeading}>What happens inside a coaching engagement</h2>
      <p>
        The substance of coaching conversations belongs to you. Notes we
        keep are minimal, kept only for as long as is useful to the work,
        and never shared with anyone outside the engagement. AI systems are
        not used to process, transcribe, or train on the content of
        coaching sessions. If at any point you want our notes deleted, we
        will do so on request.
      </p>

      <h2 style={sectionHeading}>How long we keep things</h2>
      <p>
        Analytics data is retained for 14 months in Google Analytics and
        then automatically deleted. Email correspondence is kept for as
        long as the conversation is active and for a short period
        afterwards, then archived or deleted. Coaching notes are kept only
        for the duration of an engagement plus a short handover period,
        unless you ask us to retain them longer or delete them sooner.
      </p>

      <h2 style={sectionHeading}>Who else processes data on our behalf</h2>
      <p>
        Google Ireland Limited (Google Analytics) processes anonymised
        website usage data. Netlify, Inc. hosts the website itself. Both
        are bound by their own data processing terms; we do not share
        coaching content with either, and neither has access to anything
        beyond standard infrastructure logs.
      </p>

      <h2 style={sectionHeading}>Your rights</h2>
      <p>
        Under the EU and EEA General Data Protection Regulation, you have
        the right to access the personal data we hold about you, to have it
        corrected if it is wrong, to have it deleted, to restrict or object
        to its processing, and to receive a copy in a portable format.
        Email{" "}
        <a href="mailto:hello@fab.partners" style={linkStyle}>
          hello@fab.partners
        </a>{" "}
        and we will respond within one business day, and complete the
        request within one month. If you believe we have mishandled your
        data, you may lodge a complaint with Datatilsynet, the Norwegian
        Data Protection Authority, at{" "}
        <a
          href="https://www.datatilsynet.no/"
          style={linkStyle}
          target="_blank"
          rel="noopener noreferrer"
        >
          datatilsynet.no
        </a>
        .
      </p>

      <h2 style={sectionHeading}>Cookie preferences</h2>
      <p>
        You can change your cookie choice at any time. The button below
        clears your current preference and brings the banner back so you
        can choose again.
      </p>
      <div style={{ margin: "1.5rem 0 2rem" }}>
        <CookiePreferencesButton />
      </div>

      <h2 style={sectionHeading}>Changes to this notice</h2>
      <p>
        If we change how we handle data, we will update this page and adjust
        the date at the top. Material changes will be flagged on the
        homepage.
      </p>

      <p style={{ marginTop: "3rem", opacity: 0.7, fontSize: "0.9rem" }}>
        <Link href="/" style={linkStyle}>
          ← Back to fab.partners
        </Link>
      </p>
    </main>
  );
}

const sectionHeading = {
  fontSize: "1.05rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  marginTop: "2.5rem",
  marginBottom: "0.75rem",
} as const;

const linkStyle = {
  color: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
} as const;
