export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "var(--teal)",
        padding: "3rem 2rem 2rem",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
            marginBottom: "2.5rem",
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
              Fab Partners
            </p>
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "0.85rem",
                color: "rgba(245,240,235,0.5)",
                margin: 0,
                maxWidth: "240px",
                lineHeight: 1.6,
              }}
            >
              Private coaching for the AI transition.
            </p>
          </div>

          {/* Nav links */}
          <nav
            style={{
              display: "flex",
              gap: "2rem",
              alignItems: "center",
            }}
          >
            <a
              href="/"
              style={{
                fontFamily: "Helvetica Neue, Arial, sans-serif",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(245,240,235,0.6)",
                textDecoration: "none",
              }}
            >
              Home
            </a>
            <a
              href="/privacy"
              style={{
                fontFamily: "Helvetica Neue, Arial, sans-serif",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(245,240,235,0.6)",
                textDecoration: "none",
              }}
            >
              Privacy
            </a>
            <a
              href="mailto:hello@fab.partners"
              style={{
                fontFamily: "Helvetica Neue, Arial, sans-serif",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--coral)",
                textDecoration: "none",
              }}
            >
              hello@fab.partners
            </a>
          </nav>
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
