"use client";

import { useConsent } from "./ConsentProvider";

export function CookieBanner() {
  const { status, accept, decline } = useConsent();

  if (status !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: "1.25rem 1.5rem",
        backgroundColor: "rgba(20, 20, 20, 0.97)",
        color: "#f5f5f5",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <p style={{ margin: 0, maxWidth: "44rem" }}>
          We use a single analytics cookie to understand how this site is used.
          No advertising, no profiling, no data shared with third parties beyond
          Google Analytics. Read the{" "}
          <a href="/privacy" style={{ color: "#fff", textDecoration: "underline" }}>
            privacy notice
          </a>
          .
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
          <button
            type="button"
            onClick={decline}
            style={{
              padding: "0.55rem 1.1rem",
              backgroundColor: "transparent",
              color: "#f5f5f5",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "0.85rem",
              letterSpacing: "0.02em",
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            style={{
              padding: "0.55rem 1.1rem",
              backgroundColor: "#f5f5f5",
              color: "#141414",
              border: "1px solid #f5f5f5",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "0.85rem",
              letterSpacing: "0.02em",
              fontWeight: 500,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
