"use client";

import Link from "next/link";

type SiteSettings = { title: string; tagline: string; bookingEmail: string; defaultCalendarUrl?: string }
type Hero = { headline: string; subheadline: string; body: string; ctaLabel: string }
type HumanValue = { title: string; body: string; order: number }
type Journey = { title: string; description: string; order: number }

interface Props {
  siteSettings: SiteSettings
  hero: Hero
  humanValues: HumanValue[]
  journeys: Journey[]
}

export default function HomeClient({ siteSettings, hero, humanValues, journeys }: Props) {
  const bookingUrl = siteSettings?.defaultCalendarUrl || `mailto:${siteSettings?.bookingEmail || 'hello@fab.partners'}`;
  const heroHeadline = hero?.headline || 'Your expertise is not in decline. Its context has changed.';
  const heroBody = hero?.body || 'Executive OS is a private coaching practice for senior professionals navigating AI disruption.';

  return (
    <main style={{ background: 'var(--teal)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300, letterSpacing: '0.15em', fontSize: '0.85rem', color: 'var(--cream)', textTransform: 'uppercase' }}>
          {siteSettings?.title || 'Executive OS'}
        </span>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href='/assessments' style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', color: 'rgba(245,240,235,0.6)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Assessments
          </Link>
          <a href='#book' style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', color: 'var(--coral)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--coral)', padding: '0.5rem 1.25rem' }}>
            Book a Call
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '6rem 2rem 5rem' }}>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '1.5rem' }}>
          {siteSettings?.tagline || 'Human Coaching · AI Transition'}
        </p>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 400, lineHeight: 1.15, color: 'var(--cream)', marginBottom: '2rem', letterSpacing: '-0.01em' }}>
          {heroHeadline}
        </h1>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.75)', maxWidth: '600px', marginBottom: '2.5rem' }}>
          {heroBody}
        </p>
        <Link href='/assessments' style={{ display: 'inline-block', background: 'var(--coral)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1rem 2rem', textDecoration: 'none', marginRight: '1rem' }}>
          Start a Diagnostic
        </Link>
        <a href='#book' style={{ display: 'inline-block', color: 'var(--coral)', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1rem 0', textDecoration: 'none' }}>
          Book a Strategy Call
        </a>
      </section>

      {/* Diagnostics */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '1.5rem' }}>
            Free Diagnostics
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: 1.25 }}>
            Start by understanding where you actually stand.
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', maxWidth: '580px', marginBottom: '2.5rem' }}>
            Six diagnostic assessments, each taking four to twelve minutes. They cover leadership exposure, team dynamics, career positioning, and personal decisions under AI disruption. Each produces a personalised result and a PDF report.
          </p>
          <Link href='/assessments' style={{ display: 'inline-block', background: 'transparent', color: 'var(--coral)', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.875rem 1.75rem', textDecoration: 'none', border: '1px solid var(--coral)' }}>
            View All Assessments
          </Link>
        </div>
      </section>

      {/* Human Value */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '3rem' }}>
            Why Human Coaching
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '3rem' }}>
            {humanValues.map(({ title, body }) => (
              <div key={title}>
                <div style={{ width: '2rem', height: '2px', background: 'var(--coral)', marginBottom: '1.25rem' }} />
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 400, color: 'var(--cream)', marginBottom: '0.75rem' }}>{title}</h3>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.9rem', lineHeight: 1.65, color: 'rgba(245,240,235,0.65)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '1.5rem' }}>
            What You Get
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '3rem', lineHeight: 1.25 }}>
            A result, a report, and a clear next step.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
            {[
              { label: '01', title: 'Your tier', body: 'A calibrated position — Ready, Almost Ready, or Not Yet — with an honest account of what it means.' },
              { label: '02', title: 'Dimension scores', body: 'Where your exposure is concentrated and where your strengths are strongest.' },
              { label: '03', title: 'A PDF report', body: 'Sent immediately by email. Private, no login required, yours to keep.' },
              { label: '04', title: 'A coaching prompt', body: 'A direct invitation to a strategy session, calibrated to your result.' },
            ].map(({ label, title, body }) => (
              <div key={label}>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.7rem', color: 'var(--coral)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>{label}</p>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 400, color: 'var(--cream)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(245,240,235,0.6)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journeys */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '1.5rem' }}>
            Coaching Journeys
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1rem', lineHeight: 1.25 }}>
            The Deep Navigation Scan is where the work begins.
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', maxWidth: '580px', marginBottom: '3rem' }}>
            A structured diagnostic engagement — four to six hours across two sessions — that maps your professional position in detail. It is the foundation for all subsequent coaching work.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2.5rem' }}>
            {journeys.map(({ title, description }) => (
              <div key={title} style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', fontWeight: 400, color: 'var(--cream)', marginBottom: '0.75rem' }}>{title}</h3>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(245,240,235,0.6)' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking */}
      <section id='book' style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '1.5rem' }}>
            Strategy Session
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            Forty-five minutes. Confidential. No obligation.
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', marginBottom: '2.5rem' }}>
            Book a private strategy session to discuss your assessment results or your situation directly. This is not a sales call.
          </p>
          <a href={bookingUrl} style={{ display: 'inline-block', background: 'var(--coral)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1.1rem 2.5rem', textDecoration: 'none' }}>
            Book a Strategy Session
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.1em' }}>
          © {new Date().getFullYear()} fab.partners · <a href='/privacy' style={{ color: 'rgba(245,240,235,0.3)', textDecoration: 'none' }}>Privacy</a>
        </p>
      </footer>

    </main>
  );
}
