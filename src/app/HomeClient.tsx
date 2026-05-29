"use client";

type SiteSettings = {
  title: string;
  tagline: string;
  bookingEmail: string;
  scanPrice: string;
};
type Hero = { headline: string; subheadline: string; body: string; ctaLabel: string };
type HumanValue = { title: string; body: string; order: number };
type Journey = { title: string; description: string; order: number };

interface Props {
  siteSettings: SiteSettings;
  hero: Hero;
  humanValues: HumanValue[];
  journeys: Journey[];
}

const ASSESSMENTS = [
  { slug: "coaching-readiness", title: "Coaching Readiness Scan", description: "Are you actually ready for coaching? Thirteen questions, five dimensions. Tells you what kind of support would be genuinely useful — and whether now is the right moment.", minutes: 4 },
  { slug: "resilience-wheel", title: "Leadership Resilience Wheel", description: "Eight domains, eight sliders. A diagnostic read on where your foundation is solid and where it is thin. Useful before any significant move.", minutes: 8 },
  { slug: "decision-making-style", title: "Decision-Making Style Diagnostic", description: "How do you decide with AI in the room — and without it? Eight scenarios, a 2x2 result, twelve profiles. Surfaces patterns most senior leaders haven't named.", minutes: 10 },
  { slug: "cognitive-distortion-spotter", title: "Cognitive Distortion Spotter", description: "Twelve scenarios. Eleven distortion families, including three specific to how people read AI. Identifies the two or three patterns most likely to be shaping your current reads.", minutes: 8 },
  { slug: "support-matrix", title: "Support Matrix Audit", description: "Who is actually with you? Map the influence and alignment of the people your work depends on. Designed for leaders navigating change that requires others to move.", minutes: 12 },
  { slug: "success-definition-audit", title: "Success Definition Audit", description: "What did success mean to you five years ago? What does it mean now? What do you want it to mean? Three rounds, five factors. Designed for the moment when the old answer no longer quite fits.", minutes: 10 },
];

const JOURNEYS = [
  { number: "01", title: "Value Clarity", description: "Where your professional value is defensible and where it is exposed. The first question, for most senior leaders navigating AI." },
  { number: "02", title: "Authority Navigation", description: "Rebuilding the foundations of authority so they rest on what AI cannot replicate: judgement, trust, professional context." },
  { number: "03", title: "Identity Transition", description: "The work that becomes necessary when expertise that once felt singular no longer does." },
  { number: "04", title: "Strategic Repositioning", description: "A professional narrative that holds in conversations with peers, clients and boards — in conditions that are genuinely new." },
  { number: "05", title: "Operating Model Reset", description: "Redesigning how you work so that AI augments what makes you distinctively useful rather than displacing it." },
  { number: "06", title: "Sustained Accountability", description: "Ongoing challenge, reflection and professional accountability. For the period after the insight, when the harder work begins." },
];

const S = {
  label: { fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(245,240,235,0.4)", marginBottom: "2rem" },
  sectionWrap: { maxWidth: "860px", margin: "0 auto", padding: "0 2rem" },
  divider: { width: "2rem", height: "2px", background: "var(--coral)", marginBottom: "1.25rem" },
  bodyText: { fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "rgba(245,240,235,0.75)" },
  pillarTitle: { fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 500, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--cream)", marginBottom: "0.75rem" },
  ctaPrimary: { display: "inline-block", background: "var(--coral)", color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "1rem 2rem", textDecoration: "none" },
  ctaOutline: { display: "inline-block", border: "1px solid var(--coral)", color: "var(--coral)", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "0.65rem 1.5rem", textDecoration: "none" },
};

export default function HomeClient({ siteSettings, hero, humanValues }: Props) {
  const siteTitle = siteSettings?.title || "Executive OS";
  const siteTagline = siteSettings?.tagline || "Human Coaching · AI Transition";
  const heroHeadline = hero?.headline || "Your expertise is not in decline. Its context has changed.";
  const heroBody = hero?.body || "Fab Partners offer private coaching for senior professionals navigating AI disruption. Not AI training. Not generic coaching. Precise, confidential work on identity, judgement and professional value.";
  const bookingEmail = siteSettings?.bookingEmail || "hello@fab.partners";

  const pillars = humanValues?.length > 0 ? humanValues.slice(0, 3) : [
    { title: "Confidentiality", body: "AI systems log, store and train on what you share. A coaching conversation does not." },
    { title: "Contextual Judgement", body: "No model understands your specific history, relationships, blind spots and professional context the way a skilled coach can." },
    { title: "Accountability", body: "Sustained behaviour change requires challenge and accountability from a person you trust — not a tool you can ignore." },
  ];

  return (
    <main style={{ background: "var(--teal)", minHeight: "100vh" }}>

      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.15em", fontSize: "0.85rem", color: "var(--cream)", textTransform: "uppercase" }}>
          {siteTitle}
        </span>
        <a href="/assessments" style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.6)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Assessments
        </a>
        <a href="#book" style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "var(--coral)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--coral)", padding: "0.5rem 1.25rem" }}>
          Book a Call
        </a>
      </nav>

      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "6rem 2rem 5rem" }}>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--coral)", marginBottom: "1.5rem" }}>
          {siteTagline}
        </p>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 400, lineHeight: 1.15, color: "var(--cream)", marginBottom: "2rem", letterSpacing: "-0.01em" }}>
          {heroHeadline}
        </h1>
        <p style={{ ...S.bodyText, fontSize: "1.1rem", maxWidth: "600px", marginBottom: "2.5rem" }}>
          {heroBody}
        </p>
        <a href="/assessments" style={S.ctaPrimary}>Start with a diagnostic</a>
        <p style={{ marginTop: "1.25rem", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "rgba(245,240,235,0.45)" }}>
          Already know what you need?{" "}
          <a href="#book" style={{ color: "rgba(245,240,235,0.6)", textDecoration: "underline" }}>Request a strategy session</a>
        </p>
      </section>

      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={S.sectionWrap}>
          <p style={S.label}>Why Human Coaching</p>
          <p style={{ ...S.bodyText, fontSize: "1.05rem", maxWidth: "640px", marginBottom: "3.5rem", color: "rgba(245,240,235,0.65)" }}>
            AI is useful preparation. It is not a coaching relationship. The distinction is not sentimental — it is structural.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "3rem" }}>
            {pillars.map(({ title, body }) => (
              <div key={title}>
                <div style={S.divider} />
                <p style={S.pillarTitle}>{title}</p>
                <p style={S.bodyText}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="diagnostics" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={S.sectionWrap}>
          <p style={S.label}>The Diagnostics</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 400, color: "var(--cream)", lineHeight: 1.2, marginBottom: "1.5rem", letterSpacing: "-0.01em" }}>
            Six tools. Immediate results. No generic quiz.
          </h2>
          <p style={{ ...S.bodyText, maxWidth: "620px", marginBottom: "3.5rem" }}>
            Each diagnostic takes between four and twelve minutes and produces a specific, written result you can act on. Results are emailed as a PDF. No data is sold. Nothing is shared.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ASSESSMENTS.map((a, i) => (
              <a key={a.slug} href={"/assessments/" + a.slug} style={{ display: "block", borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : "none", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "1.5rem 0", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                  <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 500, fontSize: "0.9rem", letterSpacing: "0.04em", color: "var(--cream)", margin: 0 }}>{a.title}</p>
                  <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "rgba(245,240,235,0.3)", flexShrink: 0, marginLeft: "1rem" }}>{a.minutes} min</span>
                </div>
                <p style={{ ...S.bodyText, fontSize: "0.9rem", margin: 0 }}>{a.description}</p>
              </a>
            ))}
          </div>
          <div style={{ marginTop: "2.5rem" }}>
            <p style={{ ...S.bodyText, fontSize: "0.9rem", marginBottom: "1rem" }}>Not sure where to start?</p>
            <a href="/assessments" style={S.ctaOutline}>Find your situation</a>
          </div>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem", background: "rgba(255,255,255,0.02)" }}>
        <div style={S.sectionWrap}>
          <p style={S.label}>What You Get</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 400, color: "var(--cream)", lineHeight: 1.2, marginBottom: "1.5rem", letterSpacing: "-0.01em" }}>
            A result that is specific to you. Not a category. Not a score.
          </h2>
          <p style={{ ...S.bodyText, maxWidth: "620px", marginBottom: "1.5rem" }}>
            Each diagnostic produces a written interpretation of your answers, a visualisation of your pattern, and a PDF document you can keep. The result tells you something you can act on — not just where you sit on a scale.
          </p>
          <p style={{ ...S.bodyText, maxWidth: "620px" }}>
            You do not need to share your email to see your result on screen. The PDF is sent to an address you choose, when you choose.
          </p>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={S.sectionWrap}>
          <p style={S.label}>From Diagnosis to Coaching</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 400, color: "var(--cream)", lineHeight: 1.2, marginBottom: "1.5rem", letterSpacing: "-0.01em" }}>
            The diagnostic work creates the conditions for the coaching to work.
          </h2>
          <p style={{ ...S.bodyText, maxWidth: "620px", marginBottom: "1.25rem" }}>
            Most coaching starts with a blank sheet. A first session spent finding the question. A few sessions establishing trust before anything useful is said.
          </p>
          <p style={{ ...S.bodyText, maxWidth: "620px", marginBottom: "3.5rem" }}>
            When you arrive at a strategy session having completed one or more assessments, there is already a shared vocabulary. A specific pattern named. Something to work from rather than towards.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2.5rem", marginBottom: "2.5rem" }}>
            {JOURNEYS.map((j) => (
              <div key={j.number}>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "var(--coral)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>{j.number}</p>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 500, fontSize: "0.9rem", letterSpacing: "0.04em", color: "var(--cream)", marginBottom: "0.5rem" }}>{j.title}</p>
                <p style={{ ...S.bodyText, fontSize: "0.875rem" }}>{j.description}</p>
              </div>
            ))}
          </div>
          <p style={{ ...S.bodyText, fontSize: "0.875rem", fontStyle: "italic" }}>
            The Deep Navigation Scan identifies which journey is most relevant for you.
          </p>
        </div>
      </section>

      <section id="book" style={{ padding: "6rem 2rem", textAlign: "center" }}>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,235,0.4)", marginBottom: "1.5rem" }}>Begin Here</p>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 400, color: "var(--cream)", lineHeight: 1.2, marginBottom: "1.5rem", letterSpacing: "-0.01em" }}>A private strategy session.</h2>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "rgba(245,240,235,0.65)", maxWidth: "520px", margin: "0 auto 0.75rem" }}>Forty-five minutes. Confidential. No obligation.</p>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "rgba(245,240,235,0.65)", maxWidth: "520px", margin: "0 auto 2.5rem" }}>
          An honest conversation about where you are, what the diagnostic work has surfaced, and whether this engagement is right for you. If you have not taken a diagnostic yet, we can start there. If you have, bring the result.
        </p>
        <a href={"mailto:" + bookingEmail + "?subject=Strategy session request"} style={S.ctaPrimary}>Request a Strategy Session</a>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "rgba(245,240,235,0.35)", marginTop: "1.5rem" }}>Responses within one business day.</p>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.15em", fontSize: "0.8rem", color: "rgba(245,240,235,0.3)", textTransform: "uppercase" }}>{siteTitle}</span>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.3)" }}>Private coaching practice. All conversations confidential.</span>
      </footer>

    </main>
  );
}
