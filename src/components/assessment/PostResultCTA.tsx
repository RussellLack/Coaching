"use client";

interface PostResultCTAProps {
  tier: string;
  bookingUrl: string;
}

export function PostResultCTA({ tier, bookingUrl }: PostResultCTAProps) {
  const isReady = tier === "ready";
  const isAlmost = tier === "almost-ready";
  const isReadyWithGap = tier === "ready-with-gap";
  const isNotYet = tier === "not-yet";

  const heading = isReady || isReadyWithGap
    ? "Your result is a starting point, not a verdict."
    : isAlmost
    ? "There is more clarity available to you."
    : "Understanding your position is the first step.";

  const body = isReady
    ? "A strategy session will take this further into what the result means for your specific role, relationships, and next moves."
    : isReadyWithGap
    ? "Your result shows clear strengths alongside a concentrated area of risk. A strategy session can address both directly."
    : isAlmost
    ? "A strategy session is a low-commitment way to explore what this result means and what would change it."
    : "A conversation is often more useful than another assessment. If you would find it helpful to talk through your situation, that option is open.";

  const ctaLabel = isNotYet ? "Get in touch" : "Book a Strategy Session";
  const ctaHref = isNotYet
    ? "mailto:hello@fab.partners?subject=Enquiry following assessment result"
    : bookingUrl;
  const isPrimary = isNotYet === false;

  return (
    <div style={{
      marginTop: "3rem",
      paddingTop: "2.5rem",
      borderTop: "1px solid rgba(255,255,255,0.1)",
    }}>
      <p style={{
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--coral)",
        marginBottom: "1rem",
      }}>
        Strategy Session
      </p>
      <h3 style={{
        fontFamily: "Georgia, serif",
        fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
        fontWeight: 400,
        color: "var(--cream)",
        marginBottom: "1rem",
        lineHeight: 1.3,
      }}>
        {heading}
      </h3>
      <p style={{
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: "0.95rem",
        lineHeight: 1.7,
        color: "rgba(245,240,235,0.7)",
        maxWidth: "520px",
        marginBottom: "1.75rem",
      }}>
        {body}
      </p>
      <p style={{
        fontFamily: "Helvetica Neue, Arial, sans-serif",
        fontSize: "0.8rem",
        color: "rgba(245,240,235,0.45)",
        marginBottom: "1.5rem",
        letterSpacing: "0.05em",
      }}>
        Forty-five minutes. Confidential. No obligation.
      </p>
      <a
        href={ctaHref}
        style={{
          display: "inline-block",
          background: isPrimary ? "var(--coral)" : "transparent",
          color: isPrimary ? "white" : "var(--coral)",
          border: isPrimary ? "none" : "1px solid var(--coral)",
          fontFamily: "Helvetica Neue, Arial, sans-serif",
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "1rem 2rem",
          textDecoration: "none",
        }}
      >
        {ctaLabel}
      </a>
    </div>
  );
}
