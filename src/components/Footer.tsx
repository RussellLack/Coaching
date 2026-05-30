import Link from "next/link";

const ASSESSMENTS = [
  { title: "Are You Actually Ready for Coaching?", slug: "coaching-readiness-scan" },
  { title: "The Resilience Wheel", slug: "resilience-wheel" },
  { title: "Map Your Real Support Network", slug: "stakeholder-support-matrix" },
  { title: "Eleven Thinking Traps", slug: "cognitive-distortion-spotter" },
  { title: "The Shape of Your Success", slug: "success-definition-audit" },
  { title: "Decide Well Under Pressure", slug: "decision-making-style" },
];

const linkStyle: React.CSSProperties = {
  fontFamily: "Helvetica Neue, Arial, sans-serif",
  fontSize: "0.8rem",
  letterSpacing: "0.05em",
  color: "rgba(245,240,235,0.6)",
  textDecoration: "none",
  display: "block",
  marginBottom: "0.6rem",
  lineHeight: 1.4,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "Helvetica Neue, Arial, sans-serif",
  fontSize: "0.7rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(245,240,235,0.35)",
  marginBottom: "1rem",
  display: "block",
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "var(--teal)",
        padding: "3.5rem 2rem 2rem",
        marginTop: "auto",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr",
            gap: "3rem",
            marginBottom: "3rem",
            alignItems: "flex-start",
          }}
        >
          {/* Brand */}
          <div>
            <p
              style={{
                fontFamily: "Helvetica Neue, Arial, sans-serif",
                fontWeight: 300,
                letterSpacing: "0.15em",
                fontSize: "0.85rem",
                color: "var(--cream)",
                textTransform: "uppercase",
                margin: "0 0 0.5rem",
              }}
            >
              Executive OS
            </p>
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "0.85rem",
                color: "rgba(245,240,235,0.5)",
                margin: 0,
                maxWidth: "200px",
                lineHeight: 1.6,
              }}
            >
              Private coaching for the AI transition.
            </p>
          </div>

          {/* Assessments */}
          <div>
            <span style={labelStyle}>Assessments</span>
            {ASSESSMENTS.map(({ title, slug }) => (
              <Link key={slug} href={`/assessments/${slug}`} style={linkStyle}>
                {title}
              </Link>
            ))}
          </div>

          {/* Site links */}
          <div>
            <span style={labelStyle}>Site</span>
            <Link href="/" style={linkStyle}>Home</Link>
            <Link href="/assessments" style={linkStyle}>All Assessments</Link>
            <a href="/#book" style={linkStyle}>Strategy Session</a>
            <Link href="/privacy" style={linkStyle}>Privacy</Link>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.08)",
            marginBottom: "1.5rem",
          }}
        />

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <p
            style={{
              fontFamily: "Helvetica Neue, Arial, sans-serif",
              fontSize: "0.75rem",
              color: "rgba(245,240,235,0.35)",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            &copy; {year} Fab Partners. All rights reserved.
          </p>
          <p
            style={{
              fontFamily: "Helvetica Neue, Arial, sans-serif",
              fontSize: "0.75rem",
              color: "rgba(245,240,235,0.35)",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            Designed by{" "}
            <a
              href="https://ecm.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(245,240,235,0.5)", textDecoration: "none" }}
            >
              ECM.DEV
            </a>{" "}
            using{" "}
            <a
              href="https://www.sanity.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(245,240,235,0.5)", textDecoration: "none" }}
            >
              Sanity.io
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}
