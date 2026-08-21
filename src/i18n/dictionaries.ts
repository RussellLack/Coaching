/**
 * UI strings that live in code rather than in Sanity.
 *
 * Content editable in the Studio (hero copy, journeys, human values) is
 * NOT here — it comes from Sanity and is translated there. This file is
 * only the surrounding chrome, plus fallbacks used when a Sanity field
 * is empty.
 *
 * The English entries are the source of truth. Translations are Bokmål,
 * Swedish and Danish, keeping the Fab Partners register: first person,
 * dry, no sales pressure.
 */

import type { Locale } from './config'

export type Dictionary = {
  nav: { assessments: string; strategySession: string; home: string }
  hero: {
    tagline: string
    headline: string
    body: string
    ctaPrimary: string
    ctaSecondary: string
  }
  diagnostics: { label: string; heading: string; body: string; cta: string }
  humanValue: { label: string }
  whatYouGet: {
    label: string
    heading: string
    items: { title: string; body: string }[]
  }
  journeys: { label: string; heading: string; body: string }
  book: { label: string; heading: string; body: string; cta: string }
  footer: { privacy: string }
  language: { label: string }
}

const en: Dictionary = {
  nav: { assessments: 'Assessments', strategySession: 'Strategy Session', home: 'Fab Partners' },
  hero: {
    tagline: 'Human Coaching · AI Transition',
    headline: 'Your expertise is not in decline. Its context has changed.',
    body: 'Fab Partners is a private coaching practice for senior professionals navigating AI disruption.',
    ctaPrimary: 'Start a Diagnostic',
    ctaSecondary: 'Book a Strategy Call',
  },
  diagnostics: {
    label: 'Free Diagnostics',
    heading: 'Start by understanding where you actually stand.',
    body: 'Six diagnostic assessments, each taking four to twelve minutes. They cover leadership exposure, team dynamics, career positioning, and personal decisions under AI disruption. Each produces a personalised result and a PDF report.',
    cta: 'View All Assessments',
  },
  humanValue: { label: 'Why Human Coaching' },
  whatYouGet: {
    label: 'What You Get',
    heading: 'A result, a report, and a clear next step.',
    items: [
      { title: 'Your tier', body: 'A calibrated position — Ready, Almost Ready, or Not Yet — with an honest account of what it means.' },
      { title: 'Dimension scores', body: 'Where your exposure is concentrated and where your strengths are strongest.' },
      { title: 'A PDF report', body: 'Sent immediately by email. Private, no login required, yours to keep.' },
      { title: 'A coaching prompt', body: 'A direct invitation to a strategy session, calibrated to your result.' },
    ],
  },
  journeys: {
    label: 'Coaching Journeys',
    heading: 'The Deep Navigation Scan is where the work begins.',
    body: 'A structured diagnostic engagement — four to six hours across two sessions — that maps your professional position in detail. It is the foundation for all subsequent coaching work.',
  },
  book: {
    label: 'Strategy Session',
    heading: 'Forty-five minutes. Confidential. No obligation.',
    body: 'Book a private strategy session to discuss your assessment results or your situation directly. This is not a sales call.',
    cta: 'Book a Strategy Session',
  },
  footer: { privacy: 'Privacy' },
  language: { label: 'Language' },
}

const nb: Dictionary = {
  nav: { assessments: 'Kartlegginger', strategySession: 'Strategisamtale', home: 'Fab Partners' },
  hero: {
    tagline: 'Menneskelig coaching · AI-omstilling',
    headline: 'Kompetansen din er ikke på vei ned. Konteksten har endret seg.',
    body: 'Fab Partners er en privat coachingpraksis for erfarne fagfolk og ledere som navigerer i AI-omstillingen.',
    ctaPrimary: 'Start en kartlegging',
    ctaSecondary: 'Book en strategisamtale',
  },
  diagnostics: {
    label: 'Gratis kartlegginger',
    heading: 'Begynn med å forstå hvor du faktisk står.',
    body: 'Seks kartlegginger, hver på fire til tolv minutter. De dekker lederes eksponering, teamdynamikk, karriereposisjon og personlige valg under AI-omstilling. Hver av dem gir et personlig resultat og en PDF-rapport.',
    cta: 'Se alle kartlegginger',
  },
  humanValue: { label: 'Hvorfor menneskelig coaching' },
  whatYouGet: {
    label: 'Dette får du',
    heading: 'Et resultat, en rapport og et tydelig neste steg.',
    items: [
      { title: 'Nivået ditt', body: 'En kalibrert plassering – Klar, Nesten klar eller Ikke ennå – med en ærlig gjennomgang av hva det betyr.' },
      { title: 'Skår per dimensjon', body: 'Hvor eksponeringen din er samlet, og hvor styrkene dine er sterkest.' },
      { title: 'En PDF-rapport', body: 'Sendt på e-post med én gang. Privat, ingen innlogging, din å beholde.' },
      { title: 'Et coachingspørsmål', body: 'En direkte invitasjon til en strategisamtale, tilpasset resultatet ditt.' },
    ],
  },
  journeys: {
    label: 'Coachingløp',
    heading: 'Deep Navigation Scan er der arbeidet begynner.',
    body: 'Et strukturert kartleggingsforløp – fire til seks timer fordelt på to økter – som kartlegger den faglige posisjonen din i detalj. Det er grunnlaget for alt videre coachingarbeid.',
  },
  book: {
    label: 'Strategisamtale',
    heading: 'Førtifem minutter. Fortrolig. Uforpliktende.',
    body: 'Book en privat strategisamtale for å snakke om resultatene dine eller situasjonen din direkte. Dette er ikke en salgssamtale.',
    cta: 'Book en strategisamtale',
  },
  footer: { privacy: 'Personvern' },
  language: { label: 'Språk' },
}

const sv: Dictionary = {
  nav: { assessments: 'Kartläggningar', strategySession: 'Strategisamtal', home: 'Fab Partners' },
  hero: {
    tagline: 'Mänsklig coaching · AI-omställning',
    headline: 'Din kompetens är inte på väg ned. Sammanhanget har förändrats.',
    body: 'Fab Partners är en privat coachingpraktik för erfarna specialister och ledare som navigerar i AI-omställningen.',
    ctaPrimary: 'Starta en kartläggning',
    ctaSecondary: 'Boka ett strategisamtal',
  },
  diagnostics: {
    label: 'Kostnadsfria kartläggningar',
    heading: 'Börja med att förstå var du faktiskt står.',
    body: 'Sex kartläggningar, var och en på fyra till tolv minuter. De täcker ledares exponering, teamdynamik, karriärposition och personliga val under AI-omställning. Var och en ger ett personligt resultat och en PDF-rapport.',
    cta: 'Se alla kartläggningar',
  },
  humanValue: { label: 'Varför mänsklig coaching' },
  whatYouGet: {
    label: 'Det här får du',
    heading: 'Ett resultat, en rapport och ett tydligt nästa steg.',
    items: [
      { title: 'Din nivå', body: 'En kalibrerad placering – Redo, Nästan redo eller Inte än – med en ärlig genomgång av vad det innebär.' },
      { title: 'Poäng per dimension', body: 'Var din exponering är samlad och var dina styrkor är starkast.' },
      { title: 'En PDF-rapport', body: 'Skickas med e-post direkt. Privat, ingen inloggning, din att behålla.' },
      { title: 'En coachingfråga', body: 'En direkt inbjudan till ett strategisamtal, anpassad till ditt resultat.' },
    ],
  },
  journeys: {
    label: 'Coachingresor',
    heading: 'Deep Navigation Scan är där arbetet börjar.',
    body: 'Ett strukturerat kartläggningsuppdrag – fyra till sex timmar fördelat på två pass – som kartlägger din professionella position i detalj. Det är grunden för allt fortsatt coachingarbete.',
  },
  book: {
    label: 'Strategisamtal',
    heading: 'Fyrtiofem minuter. Förtroligt. Utan förpliktelser.',
    body: 'Boka ett privat strategisamtal för att prata om dina resultat eller din situation direkt. Det här är inte ett säljsamtal.',
    cta: 'Boka ett strategisamtal',
  },
  footer: { privacy: 'Integritet' },
  language: { label: 'Språk' },
}

const da: Dictionary = {
  nav: { assessments: 'Kortlægninger', strategySession: 'Strategisamtale', home: 'Fab Partners' },
  hero: {
    tagline: 'Menneskelig coaching · AI-omstilling',
    headline: 'Din faglighed er ikke på vej ned. Sammenhængen har ændret sig.',
    body: 'Fab Partners er en privat coachingpraksis for erfarne fagfolk og ledere, der navigerer i AI-omstillingen.',
    ctaPrimary: 'Start en kortlægning',
    ctaSecondary: 'Book en strategisamtale',
  },
  diagnostics: {
    label: 'Gratis kortlægninger',
    heading: 'Begynd med at forstå, hvor du faktisk står.',
    body: 'Seks kortlægninger, hver på fire til tolv minutter. De dækker lederes eksponering, teamdynamik, karriereposition og personlige valg under AI-omstilling. Hver af dem giver et personligt resultat og en PDF-rapport.',
    cta: 'Se alle kortlægninger',
  },
  humanValue: { label: 'Hvorfor menneskelig coaching' },
  whatYouGet: {
    label: 'Det får du',
    heading: 'Et resultat, en rapport og et tydeligt næste skridt.',
    items: [
      { title: 'Dit niveau', body: 'En kalibreret placering – Klar, Næsten klar eller Ikke endnu – med en ærlig gennemgang af, hvad det betyder.' },
      { title: 'Score per dimension', body: 'Hvor din eksponering er samlet, og hvor dine styrker er stærkest.' },
      { title: 'En PDF-rapport', body: 'Sendt på e-mail med det samme. Privat, ingen login, din at beholde.' },
      { title: 'Et coachingspørgsmål', body: 'En direkte invitation til en strategisamtale, tilpasset dit resultat.' },
    ],
  },
  journeys: {
    label: 'Coachingforløb',
    heading: 'Deep Navigation Scan er der, arbejdet begynder.',
    body: 'Et struktureret kortlægningsforløb – fire til seks timer fordelt på to sessioner – der kortlægger din faglige position i detaljer. Det er fundamentet for alt videre coachingarbejde.',
  },
  book: {
    label: 'Strategisamtale',
    heading: 'Femogfyrre minutter. Fortroligt. Uforpligtende.',
    body: 'Book en privat strategisamtale for at tale om dine resultater eller din situation direkte. Det her er ikke en salgssamtale.',
    cta: 'Book en strategisamtale',
  },
  footer: { privacy: 'Privatliv' },
  language: { label: 'Sprog' },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, nb, sv, da }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en
}
