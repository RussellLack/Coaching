"use client";

import { useState } from "react";

const archetypes = [
  { id: "exec", label: "Senior Executive", description: "Leading organisations through AI-driven change whilst protecting your own judgement and authority." },
  { id: "founder", label: "Founder / Operator", description: "Rebuilding your operating model around AI whilst retaining what made the business distinctively yours." },
  { id: "consultant", label: "Independent Consultant", description: "Repositioning your expertise in a landscape where AI can replicate much of what you previously charged for." },
  { id: "expert", label: "Deep Domain Expert", description: "Protecting the value of accumulated knowledge when AI systems appear to match your output." },
];

const questions: Record<string, { q: string; options: string[] }[]> = {
  exec: [
    { q: "How confident are you that your judgement calls are genuinely irreplaceable by AI systems?", options: ["Very confident — I make decisions no model could make", "Uncertain — some decisions feel exposed", "Not sure — I haven't thought it through carefully"] },
    { q: "When your organisation adopts new AI tools, where does your authority tend to come from?", options: ["Experience and context that the tools lack", "Managing the people and politics around the tools", "I'm not sure my current authority is well-grounded"] },
    { q: "How clearly can you articulate your professional value in a world of capable AI?", options: ["Very clearly — I've thought this through", "I have a general sense but couldn't make it precise", "This is something I actively worry about"] },
  ],
  founder: [
    { q: "How much of your company's current value depends on things AI could replicate within two years?", options: ["Very little — our moat is human and relational", "Some parts are exposed, others are not", "More than I'm comfortable admitting"] },
    { q: "When you make key decisions, how much do you rely on instinct built up over years?", options: ["Heavily — that instinct is core to what I do", "I balance instinct with data and analysis", "I'm trying to rely on it less as tools improve"] },
    { q: "How clearly have you mapped which parts of your role should be automated versus protected?", options: ["I have a clear map and act on it", "I've thought about it but haven't been systematic", "This is work I haven't done yet"] },
  ],
  consultant: [
    { q: "How much of what you charge for could a well-prompted AI produce in a fraction of the time?", options: ["Very little — my value is relational and contextual", "Some deliverables are exposed, my judgement is not", "More than I'd like — I'm actively repositioning"] },
    { q: "When clients engage you, what are they primarily paying for?", options: ["Access to my judgement and accumulated experience", "Quality of output that AI hasn't matched yet", "Accountability, trust and ongoing relationship"] },
    { q: "How confident are you in the durability of your current positioning over the next three years?", options: ["Confident — I'm already repositioning well", "Moderately confident with some concerns", "This is a significant source of professional anxiety"] },
  ],
  expert: [
    { q: "How much of your expertise is tacit — held in judgement and pattern recognition rather than articulated knowledge?", options: ["Most of it — it can't easily be written down", "A good proportion, alongside formalised knowledge", "Mostly formalised — which makes me feel exposed"] },
    { q: "When AI systems produce outputs in your domain, how do you experience them?", options: ["Useful tools I can direct and critique confidently", "Occasionally impressive, occasionally wrong in subtle ways", "Threatening to the perception of my value"] },
    { q: "Have you articulated clearly to others why your expertise remains valuable in an AI-capable environment?", options: ["Yes — I can make this case compellingly", "I've tried but the message hasn't fully landed", "This is something I need to work on"] },
  ],
};

type SiteSettings = { title: string; tagline: string; bookingEmail: string; scanPrice: string }
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
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showPaidPreview, setShowPaidPreview] = useState(false);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
    const qs = questions[selectedArchetype!];
    if (currentQuestion + 1 < qs.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const resetAssessment = () => {
    setSelectedArchetype(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
    setShowPaidPreview(false);
  };

  const exposureScore = answers.reduce((acc, a) => acc + a, 0);
  const maxScore = answers.length * 2;
  const exposureLevel = exposureScore / maxScore;

  const scanPrice = siteSettings?.scanPrice || "£495";
  const bookingEmail = siteSettings?.bookingEmail || "hello@fab.partners";
  const heroHeadline = hero?.headline || "Your expertise is not in decline. Its context has changed.";
  const heroBody = hero?.body || "Executive OS is a private coaching practice for senior professionals navigating AI disruption.";
  const heroCta = hero?.ctaLabel || "Take the Free Snapshot";

  return (
    <main style={{ background: "var(--teal)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.15em", fontSize: "0.85rem", color: "var(--cream)", textTransform: "uppercase" }}>
          {siteSettings?.title || "Executive OS"}
        </span>
        <a href="#book" style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "var(--coral)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--coral)", padding: "0.5rem 1.25rem" }}>
          Book a Call
        </a>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "6rem 2rem 5rem" }}>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--coral)", marginBottom: "1.5rem" }}>
          {siteSettings?.tagline || "Human Coaching · AI Transition"}
        </p>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 400, lineHeight: 1.15, color: "var(--cream)", marginBottom: "2rem", letterSpacing: "-0.01em" }}>
          {heroHeadline}
        </h1>
        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "1.1rem", lineHeight: 1.7, color: "rgba(245,240,235,0.75)", maxWidth: "600px", marginBottom: "2.5rem" }}>
          {heroBody}
        </p>
        <a href="#snapshot" style={{ display: "inline-block", background: "var(--coral)", color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "1rem 2rem", textDecoration: "none" }}>
          {heroCta}
        </a>
      </section>

      {/* Human Value */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,235,0.4)", marginBottom: "3rem" }}>
            Why Human Coaching
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "3rem" }}>
            {humanValues.map(({ title, body }) => (
              <div key={title}>
                <div style={{ width: "2rem", height: "2px", background: "var(--coral)", marginBottom: "1.25rem" }} />
                <h3 style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", fontWeight: 500, letterSpacing: "0.05em", color: "var(--cream)", marginBottom: "0.75rem", textTransform: "uppercase" }}>{title}</h3>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(245,240,235,0.65)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Snapshot Assessment */}
      <section id="snapshot" style={{ padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,235,0.4)", marginBottom: "1rem" }}>Free Snapshot</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 400, color: "var(--cream)", marginBottom: "1rem" }}>Where do you stand?</h2>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(245,240,235,0.65)", marginBottom: "3rem" }}>
            Select the role that best reflects your current professional position. Three questions. A useful starting point.
          </p>

          {!selectedArchetype && !showResult && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {archetypes.map((a) => (
                <button key={a.id} onClick={() => setSelectedArchetype(a.id)}
                  style={{ textAlign: "left", padding: "1.5rem 2rem", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "var(--cream)", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--coral)")}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}>
                  <div style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 500, fontSize: "0.95rem", marginBottom: "0.4rem" }}>{a.label}</div>
                  <div style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "rgba(245,240,235,0.55)", lineHeight: 1.5 }}>{a.description}</div>
                </button>
              ))}
            </div>
          )}

          {selectedArchetype && !showResult && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.4)" }}>Question {currentQuestion + 1} of {questions[selectedArchetype].length}</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {questions[selectedArchetype].map((_, i) => (
                    <div key={i} style={{ width: "2rem", height: "2px", background: i <= currentQuestion ? "var(--coral)" : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 400, lineHeight: 1.5, color: "var(--cream)", marginBottom: "2rem" }}>
                {questions[selectedArchetype][currentQuestion].q}
              </h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {questions[selectedArchetype][currentQuestion].options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(i)}
                    style={{ textAlign: "left", padding: "1.25rem 1.5rem", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(245,240,235,0.8)", cursor: "pointer", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.5, transition: "all 0.2s" }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--coral)"; e.currentTarget.style.color = "var(--cream)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(245,240,235,0.8)"; }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResult && !showPaidPreview && (
            <div>
              <div style={{ padding: "2.5rem", border: "1px solid rgba(255,255,255,0.12)", marginBottom: "2rem" }}>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--coral)", marginBottom: "1rem" }}>Your Snapshot</p>
                {exposureLevel < 0.4 && (<>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 400, color: "var(--cream)", marginBottom: "1rem" }}>Your position is largely defensible — for now.</h3>
                  <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(245,240,235,0.7)" }}>You appear to have a reasonably clear sense of where your value sits. The risk is complacency: the landscape is shifting faster than most professionals' self-assessments. A Deep Navigation Scan would test the robustness of your current positioning with greater precision.</p>
                </>)}
                {exposureLevel >= 0.4 && exposureLevel < 0.75 && (<>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 400, color: "var(--cream)", marginBottom: "1rem" }}>You have real clarity in some areas — and real exposure in others.</h3>
                  <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(245,240,235,0.7)" }}>This is the most common and the most actionable position. You are not in crisis, but you are not fully secure either. The work is to map the exposure precisely and build a clear narrative. That is exactly what the Deep Navigation Scan is designed to produce.</p>
                </>)}
                {exposureLevel >= 0.75 && (<>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 400, color: "var(--cream)", marginBottom: "1rem" }}>You are navigating significant uncertainty.</h3>
                  <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(245,240,235,0.7)" }}>That is not a failure of intelligence or effort. It reflects the genuine scale of what is changing. The most useful next step is a structured, confidential conversation — not more information, but clearer thinking about what matters most in your specific situation.</p>
                </>)}
              </div>
              <button onClick={() => setShowPaidPreview(true)}
                style={{ display: "block", width: "100%", padding: "1.25rem", background: "var(--coral)", color: "white", border: "none", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginBottom: "1rem" }}>
                See the Deep Navigation Scan
              </button>
              <button onClick={resetAssessment}
                style={{ display: "block", width: "100%", padding: "1rem", background: "transparent", color: "rgba(245,240,235,0.4)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", cursor: "pointer", letterSpacing: "0.05em" }}>
                Start again
              </button>
            </div>
          )}

          {showPaidPreview && (
            <div>
              <div style={{ border: "1px solid rgba(227,66,52,0.3)", padding: "2.5rem", marginBottom: "2rem" }}>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--coral)", marginBottom: "1.5rem" }}>
                  Deep Navigation Scan — {scanPrice}
                </p>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 400, color: "var(--cream)", marginBottom: "1.5rem" }}>A precise map of your professional position in the AI transition.</h3>
                <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                  {["Extended diagnostic across six professional dimensions","AI Navigation Brief: a written summary of your position, exposures and defensible strengths","Sample output from the diagnostic modules","Recommended coaching journey based on your specific profile","Private strategy session with your coach to work through the findings"].map((item) => (
                    <div key={item} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <div style={{ width: "1rem", height: "1px", background: "var(--coral)", marginTop: "0.65rem", flexShrink: 0 }} />
                      <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", color: "rgba(245,240,235,0.75)", lineHeight: 1.6, margin: 0 }}>{item}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.4)", lineHeight: 1.6 }}>The scan prepares the coaching conversation. It does not replace it.</p>
              </div>
              <a href="#book" style={{ display: "block", textAlign: "center", padding: "1.25rem", background: "var(--coral)", color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", marginBottom: "0.75rem" }}>
                Book a Private Strategy Session
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Coaching Journeys */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,235,0.4)", marginBottom: "1rem" }}>Coaching Journeys</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 400, color: "var(--cream)", marginBottom: "1rem" }}>From insight to sustained change.</h2>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.95rem", color: "rgba(245,240,235,0.6)", marginBottom: "3rem", maxWidth: "500px", lineHeight: 1.7 }}>
            The Deep Navigation Scan identifies which journey is most relevant to you. Each is a distinct coaching engagement, not a course.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {journeys.map((j, i) => (
              <div key={j.title} style={{ padding: "2rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "rgba(245,240,235,0.25)", marginBottom: "1rem" }}>0{i + 1}</div>
                <h3 style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.95rem", fontWeight: 500, color: "var(--cream)", marginBottom: "0.75rem" }}>{j.title}</h3>
                <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", lineHeight: 1.65, color: "rgba(245,240,235,0.55)" }}>{j.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking */}
      <section id="book" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,235,0.4)", marginBottom: "1.5rem" }}>Begin Here</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 400, color: "var(--cream)", marginBottom: "1.25rem" }}>A private strategy session.</h2>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(245,240,235,0.65)", marginBottom: "2.5rem" }}>
            Forty-five minutes. Confidential. No obligation. An honest conversation about where you are and whether this work is right for you.
          </p>
          <a href={`mailto:${bookingEmail}?subject=Executive OS — Strategy Session Request`}
            style={{ display: "inline-block", background: "var(--coral)", color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "1.1rem 2.5rem", textDecoration: "none", marginBottom: "1rem" }}>
            Request a Strategy Session
          </a>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.3)", marginTop: "1rem" }}>Responses within one business day.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "2.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "rgba(245,240,235,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {siteSettings?.title || "Executive OS"}
        </span>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "rgba(245,240,235,0.2)" }}>Private coaching practice. All conversations confidential.</span>
      </footer>
    </main>
  );
}
