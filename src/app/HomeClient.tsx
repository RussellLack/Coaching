"use client";

import Link from "next/link";
import Image from "next/image";
import StrategyCallForm from "@/components/StrategyCallForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type SiteSettings = { title: string; tagline: string; bookingEmail: string; defaultCalendarUrl?: string }
type Hero = { headline: string; subheadline: string; body: string; ctaLabel: string }
type HumanValue = { title: string; body: string; order: number }
type Journey = { title: string; description: string; order: number }

interface Props {
  siteSettings: SiteSettings
  hero: Hero
  humanValues: HumanValue[]
  journeys: Journey[]
  lang: Locale
  dict: Dictionary
}

export default function HomeClient({ siteSettings, hero, humanValues, journeys, lang, dict }: Props) {
  const bookingUrl = siteSettings?.defaultCalendarUrl || `mailto:${siteSettings?.bookingEmail || 'russell@fab.partners'}`;
  const heroHeadline = hero?.headline || dict.hero.headline;
  const heroBody = hero?.body || dict.hero.body;
  const home = localePath(lang, '/');
  const assessments = localePath(lang, '/assessments');
  const privacy = localePath(lang, '/privacy');

  return (
    <main style={{ background: 'var(--teal)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={home} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image
            src='/fab-partners-logo-cream.png'
            alt='Fab Partners'
            width={1008}
            height={944}
            priority
            style={{ height: 'clamp(40px, 5.5vw, 54px)', width: 'auto' }}
          />
        </Link>
        <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
          <LanguageSwitcher current={lang} />
          <Link href={assessments} style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', color: 'rgba(245,240,235,0.65)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {dict.nav.assessments}
          </Link>
          <a href='#book' style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.8rem', color: 'var(--coral)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--coral)', padding: '0.5rem 1.25rem' }}>
            {dict.nav.strategySession}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '6rem 2rem 5rem' }}>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '1.5rem' }}>
          {siteSettings?.tagline || dict.hero.tagline}
        </p>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 400, lineHeight: 1.15, color: 'var(--cream)', marginBottom: '2rem', letterSpacing: '-0.01em' }}>
          {heroHeadline}
        </h1>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.75)', maxWidth: '600px', marginBottom: '2.5rem' }}>
          {heroBody}
        </p>
        <Link href={assessments} style={{ display: 'inline-block', background: 'var(--coral)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1rem 2rem', textDecoration: 'none', marginRight: '1rem' }}>
          {dict.hero.ctaPrimary}
        </Link>
        <a href='#book' style={{ display: 'inline-block', color: 'var(--coral)', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1rem 0', textDecoration: 'none' }}>
          {dict.hero.ctaSecondary}
        </a>
      </section>

      {/* Diagnostics */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '1.5rem' }}>
            {dict.diagnostics.label}
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: 1.25 }}>
            {dict.diagnostics.heading}
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', maxWidth: '580px', marginBottom: '2.5rem' }}>
            {dict.diagnostics.body}
          </p>
          <Link href={assessments} style={{ display: 'inline-block', background: 'transparent', color: 'var(--coral)', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.875rem 1.75rem', textDecoration: 'none', border: '1px solid var(--coral)' }}>
            {dict.diagnostics.cta}
          </Link>
        </div>
      </section>

      {/* Human Value */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '3rem' }}>
            {dict.humanValue.label}
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
            {dict.whatYouGet.label}
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '3rem', lineHeight: 1.25 }}>
            {dict.whatYouGet.heading}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
            {dict.whatYouGet.items.map(({ title, body }, i) => {
              const label = String(i + 1).padStart(2, '0');
              return (
              <div key={label}>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.7rem', color: 'var(--coral)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>{label}</p>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 400, color: 'var(--cream)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(245,240,235,0.6)' }}>{body}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journeys */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.4)', marginBottom: '1.5rem' }}>
            {dict.journeys.label}
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1rem', lineHeight: 1.25 }}>
            {dict.journeys.heading}
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', maxWidth: '580px', marginBottom: '3rem' }}>
            {dict.journeys.body}
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
            {dict.book.label}
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            {dict.book.heading}
          </h2>
          <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '1rem', lineHeight: 1.7, color: 'rgba(245,240,235,0.7)', marginBottom: '2.5rem' }}>
            {dict.book.body}
          </p>
          {siteSettings?.defaultCalendarUrl ? (
            <a href={bookingUrl} style={{ display: 'inline-block', background: 'var(--coral)', color: 'white', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1.1rem 2.5rem', textDecoration: 'none' }}>
              {dict.book.cta}
            </a>
          ) : (
            <StrategyCallForm bookingEmail={siteSettings?.bookingEmail || 'russell@fab.partners'} />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '0.75rem', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.1em' }}>
          © {new Date().getFullYear()} fab.partners · <Link href={privacy} style={{ color: 'rgba(245,240,235,0.3)', textDecoration: 'none' }}>{dict.footer.privacy}</Link>
        </p>
      </footer>

    </main>
  );
}
