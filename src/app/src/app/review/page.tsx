"use client";
import { useState } from "react";

const tasks = [
  {
    number: "01",
    title: "Experience the live offer",
    instruction: "Visit the public site at fab.partners. Read it as a senior professional encountering it for the first time. Notice your first impression, what you trust, what feels unclear.",
    link: "https://fab.partners",
    linkLabel: "Open the live site",
  },
  {
    number: "02",
    title: "Take the free snapshot",
    instruction: "Select the archetype closest to your professional role and complete the three-question snapshot. Read your result. Does it feel specific? Does it create a reason to continue?",
    link: "https://fab.partners/#snapshot",
    linkLabel: "Go to the snapshot",
  },
  {
    number: "03",
    title: "Inspect the paid preview",
    instruction: "After completing the snapshot, click through to the Deep Navigation Scan preview. Review the description and the proposed contents. Does the offer feel worth £495? What would make it more credible?",
    link: null,
    linkLabel: null,
  },
  {
    number: "04",
    title: "Give your pricing feedback",
    instruction: "Complete the short feedback form below. Your responses inform pricing, positioning and what proof would increase trust.",
    link: null,
    linkLabel: null,
  },
];

const evidenceItems = [
  {
    label: "Diagnostic module sample",
    preview: "The Authority Navigation module examines six dimensions: positional authority, reputational authority, relational authority, intellectual authority, institutional authority, and the degree to which each is AI-exposed. Clients typically find two or three dimensions where their confidence is well-founded and one or two where it is more fragile than expected.",
  },
  {
    label: "AI Navigation Brief extract",
    preview: "\"Your primary exposure lies in the formalised elements of your work — the deliverables, frameworks and process documentation that AI can now approximate. Your defensible ground is the quality of your diagnostic conversation: the questions you ask, the discomfort you create, and the relationships that make sustained change possible. The recommended coaching journey is Strategic Repositioning, beginning with a clarification of your professional narrative.\"",
    isQuote: true,
  },
  {
    label: "Coaching journey recommendation",
    preview: "Based on your profile, the recommended starting journey is Value Clarity: a structured engagement focused on precisely mapping where your professional value is defensible and where it is exposed to AI substitution. This typically runs over six to eight sessions with structured reflection between each.",
  },
];

type FormData = {
  role: string;
  clarity: string;
  snapshot: string;
  price: string;
  priceReason: string;
  trust: string;
  overall: string;
  comments: string;
};

export default function ReviewPage() {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    role: "",
    clarity: "",
    snapshot: "",
    price: "",
    priceReason: "",
    trust: "",
    overall: "",
    comments: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const toggleTask = (num: string) => {
    const updated = new Set(completedTasks);
    if (updated.has(num)) updated.delete(num);
    else updated.add(num);
    setCompletedTasks(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main style={{ background: "#111", minHeight: "100vh", color: "#e8e2da" }}>

      {/* Header — clearly distinct from public site */}
      <header style={{ background: "#1a1a1a", borderBottom: "1px solid #333", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#888" }}>Executive OS</span>
          <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", background: "#2a2a2a", color: "#aaa", padding: "0.25rem 0.6rem", border: "1px solid #444", letterSpacing: "0.1em", textTransform: "uppercase" }}>Reviewer Workspace</span>
        </div>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", color: "#555", letterSpacing: "0.08em" }}>Private — not part of the public site</span>
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem" }}>

        {/* Intro */}
        <div style={{ marginBottom: "4rem" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: "1rem" }}>
            Market Testing · Private Access
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 400, color: "#e8e2da", marginBottom: "1.25rem", lineHeight: 1.2 }}>
            You are reviewing a premium coaching offer.
          </h1>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", lineHeight: 1.75, color: "#888", maxWidth: "560px", marginBottom: "1.5rem" }}>
            This workspace guides you through four tasks. It is entirely separate from the public-facing site. Your feedback is used to refine the offer, test pricing assumptions and understand what increases trust with a senior professional audience.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["Approximately 20 minutes", "No sign-in required", "Responses are confidential"].map(tag => (
              <span key={tag} style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "#666", border: "1px solid #333", padding: "0.3rem 0.75rem" }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Task Flow */}
        <section style={{ marginBottom: "4rem" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: "2rem" }}>
            Task Flow
          </p>
          <div style={{ display: "grid", gap: "1px", background: "#222" }}>
            {tasks.map((task) => {
              const done = completedTasks.has(task.number);
              return (
                <div key={task.number} style={{ background: "#111", padding: "1.75rem 2rem", display: "grid", gridTemplateColumns: "2.5rem 1fr auto", gap: "1.25rem", alignItems: "start" }}>
                  <button
                    onClick={() => toggleTask(task.number)}
                    style={{ width: "2rem", height: "2rem", border: `1px solid ${done ? "#E34234" : "#333"}`, background: done ? "#E34234" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.15rem" }}
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                  >
                    {done && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", color: "#555" }}>{task.number}</span>
                      <h3 style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.9rem", fontWeight: 500, color: done ? "#666" : "#e8e2da", margin: 0, textDecoration: done ? "line-through" : "none" }}>{task.title}</h3>
                    </div>
                    <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", lineHeight: 1.65, color: "#666", margin: 0 }}>{task.instruction}</p>
                    {task.link && (
                      <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.75rem", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "#E34234", letterSpacing: "0.08em", textDecoration: "none", borderBottom: "1px solid rgba(227,66,52,0.3)" }}>
                        {task.linkLabel} ↗
                      </a>
                    )}
                  </div>
                  <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", color: done ? "#E34234" : "#333", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {done ? "Done" : "To do"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Evidence Pack */}
        <section style={{ marginBottom: "4rem" }}>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: "0.75rem" }}>
            Evidence Pack
          </p>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "#666", lineHeight: 1.65, marginBottom: "2rem" }}>
            These extracts give you context to judge the paid offer. They represent the kind of output a client would receive — not the complete methodology.
          </p>
          <div style={{ display: "grid", gap: "1px", background: "#222" }}>
            {evidenceItems.map((item) => {
              const isOpen = expandedEvidence === item.label;
              return (
                <div key={item.label} style={{ background: "#111" }}>
                  <button
                    onClick={() => setExpandedEvidence(isOpen ? null : item.label)}
                    style={{ width: "100%", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "#e8e2da" }}
                  >
                    <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: isOpen ? "#E34234" : "#aaa" }}>{item.label}</span>
                    <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", color: "#444", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>↓</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 2rem 1.75rem" }}>
                      {item.isQuote ? (
                        <blockquote style={{ fontFamily: "Georgia, serif", fontSize: "0.9rem", lineHeight: 1.75, color: "#888", borderLeft: "2px solid #E34234", paddingLeft: "1.25rem", margin: 0, fontStyle: "italic" }}>
                          {item.preview}
                        </blockquote>
                      ) : (
                        <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", lineHeight: 1.75, color: "#777", margin: 0 }}>{item.preview}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Feedback Form */}
        <section>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: "0.75rem" }}>
            Pricing Feedback
          </p>
          <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "#666", lineHeight: 1.65, marginBottom: "2.5rem" }}>
            Your honest response is more useful than a polite one.
          </p>

          {submitted ? (
            <div style={{ padding: "3rem", border: "1px solid #333", textAlign: "center" }}>
              <div style={{ width: "2rem", height: "2px", background: "#E34234", margin: "0 auto 1.5rem" }} />
              <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "1.2rem", color: "#e8e2da", marginBottom: "0.75rem" }}>Thank you.</h3>
              <p style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.85rem", color: "#666" }}>Your feedback has been recorded.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "2rem" }}>

              {/* Role */}
              <div>
                <label style={labelStyle}>Your professional role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={inputStyle} required>
                  <option value="">Select your role</option>
                  <option>Senior Executive</option>
                  <option>Founder / Operator</option>
                  <option>Independent Consultant</option>
                  <option>Deep Domain Expert</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Site clarity */}
              <div>
                <label style={labelStyle}>Did the live site make the offer clear within the first 30 seconds?</label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {["Yes — I understood what it was immediately", "Mostly — it took a moment to click", "Not really — I needed to read carefully", "No — I was still unsure after reading"].map(opt => (
                    <label key={opt} style={radioLabelStyle}>
                      <input type="radio" name="clarity" value={opt} onChange={e => setFormData({ ...formData, clarity: e.target.value })} style={{ accentColor: "#E34234" }} required />
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: "#888" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Snapshot */}
              <div>
                <label style={labelStyle}>How did the free snapshot feel?</label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {["Specific and useful — I recognised myself in it", "Reasonable but fairly generic", "Interesting but the result felt too vague", "Not relevant to my situation"].map(opt => (
                    <label key={opt} style={radioLabelStyle}>
                      <input type="radio" name="snapshot" value={opt} onChange={e => setFormData({ ...formData, snapshot: e.target.value })} style={{ accentColor: "#E34234" }} required />
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: "#888" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label style={labelStyle}>The Deep Navigation Scan is priced at £495. What is your honest reaction?</label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {["Clearly worth it — I would pay this", "Possibly worth it — depends on the output quality", "On the high side — I'd want more evidence first", "Too expensive for what's described"].map(opt => (
                    <label key={opt} style={radioLabelStyle}>
                      <input type="radio" name="price" value={opt} onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ accentColor: "#E34234" }} required />
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: "#888" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price reason */}
              <div>
                <label style={labelStyle}>What would make the £495 feel like an obvious decision? <span style={{ color: "#555" }}>(optional)</span></label>
                <textarea
                  value={formData.priceReason}
                  onChange={e => setFormData({ ...formData, priceReason: e.target.value })}
                  rows={3}
                  placeholder="e.g. a sample output, a case study, a money-back guarantee..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Trust */}
              <div>
                <label style={labelStyle}>What proof or context would most increase your trust in this offer?</label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {["Client testimonials or case studies", "Coach's credentials and professional background", "Sample output from the diagnostic", "Clear explanation of the coaching methodology", "A free introductory call before committing"].map(opt => (
                    <label key={opt} style={radioLabelStyle}>
                      <input type="radio" name="trust" value={opt} onChange={e => setFormData({ ...formData, trust: e.target.value })} style={{ accentColor: "#E34234" }} required />
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: "#888" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Overall */}
              <div>
                <label style={labelStyle}>Overall, would you recommend this offer to a peer facing AI disruption?</label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {["Yes — without hesitation", "Probably — with some caveats", "Uncertain — I'd want to know more first", "No — I don't think it would land well"].map(opt => (
                    <label key={opt} style={radioLabelStyle}>
                      <input type="radio" name="overall" value={opt} onChange={e => setFormData({ ...formData, overall: e.target.value })} style={{ accentColor: "#E34234" }} required />
                      <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.875rem", color: "#888" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label style={labelStyle}>Any other observations — on tone, copy, design or the overall offer? <span style={{ color: "#555" }}>(optional)</span></label>
                <textarea
                  value={formData.comments}
                  onChange={e => setFormData({ ...formData, comments: e.target.value })}
                  rows={4}
                  placeholder="Your honest observations are the most useful thing you can give..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <button type="submit" style={{ padding: "1.1rem 2.5rem", background: "#E34234", color: "white", border: "none", fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", alignSelf: "start" }}>
                Submit Feedback
              </button>
            </form>
          )}
        </section>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e1e1e", padding: "2rem", textAlign: "center" }}>
        <span style={{ fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: "0.75rem", color: "#333" }}>Reviewer workspace · Executive OS · Private access only</span>
      </footer>

    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Helvetica Neue, Arial, sans-serif",
  fontSize: "0.85rem",
  color: "#aaa",
  marginBottom: "0.75rem",
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  color: "#e8e2da",
  fontFamily: "Helvetica Neue, Arial, sans-serif",
  fontSize: "0.875rem",
  outline: "none",
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.75rem 1rem",
  border: "1px solid #1e1e1e",
  cursor: "pointer",
};