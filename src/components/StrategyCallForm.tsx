"use client";

import { useId, useState } from "react";

/**
 * Strategy call enquiry form.
 *
 * Posts to /api/contact, which emails the enquiry to CONTACT_EMAIL via
 * Postmark (with Reply-To set to the enquirer) and sends the enquirer a
 * confirmation.
 *
 * Data protection notes — the lawful basis here is GDPR Art 6(1)(b),
 * taking steps at the data subject's request prior to entering into a
 * contract. Answering an enquiry therefore needs no consent tick-box,
 * and one is deliberately not used: consent that is a precondition of
 * getting a reply is not freely given, so it would not be valid consent.
 * What Art 13 does require is clear information at the point of
 * collection, which is the notice rendered below the fields.
 *
 * MARKETING_CONSENT_TEXT is the one genuinely optional opt-in. It ships
 * unticked, and its exact wording is sent with the enquiry so there is a
 * record of what was agreed to (Art 7(1)).
 */

export const MARKETING_CONSENT_TEXT =
  "You may email me occasionally about Fab Partners writing and new assessments. I can unsubscribe at any time.";

type Status = "idle" | "sending" | "sent" | "error";

const sans = "'Helvetica Neue', Arial, sans-serif";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: sans,
  fontSize: "0.75rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(245,240,235,0.55)",
  marginBottom: "0.5rem",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: sans,
  fontSize: "1rem",
  lineHeight: 1.5,
  color: "var(--cream)",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 0,
  padding: "0.85rem 1rem",
};

export default function StrategyCallForm({
  bookingEmail = "hello@fab.partners",
}: {
  bookingEmail?: string;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!name || !email) {
      setStatus("error");
      setError("Please give us a name and an email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setError("That email address doesn't look right.");
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          context: "Strategy session — homepage form",
          marketingConsent: data.get("marketingConsent") === "on",
          marketingConsentText: MARKETING_CONSENT_TEXT,
          // Honeypot. Real people leave this empty; it is visually
          // hidden and taken out of the tab order.
          company: String(data.get("company") ?? ""),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Request failed");
      }

      form.reset();
      setStatus("sent");
    } catch (err) {
      console.error("strategy call form", err);
      setStatus("error");
      setError(
        `Something went wrong sending that. Please email ${bookingEmail} instead.`,
      );
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        style={{
          border: "1px solid var(--coral)",
          padding: "2rem",
          textAlign: "left",
          fontFamily: sans,
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--coral)",
            margin: "0 0 1rem",
          }}
        >
          Request received
        </p>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "rgba(245,240,235,0.8)",
            margin: 0,
          }}
        >
          Thank you — a confirmation is on its way to your inbox, and you
          will hear back within one business day to arrange a time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ textAlign: "left" }}>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <label htmlFor={`${id}-name`} style={labelStyle}>
            Your name
          </label>
          <input
            id={`${id}-name`}
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={120}
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor={`${id}-email`} style={labelStyle}>
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor={`${id}-message`} style={labelStyle}>
            What you would like to discuss{" "}
            <span style={{ textTransform: "none", letterSpacing: "0.04em" }}>
              (optional)
            </span>
          </label>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={4}
            maxLength={4000}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>

        {/* Honeypot — hidden from people, catnip for bots. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
          <label htmlFor={`${id}-company`}>Company</label>
          <input
            id={`${id}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            fontFamily: sans,
            fontSize: "0.85rem",
            lineHeight: 1.6,
            color: "rgba(245,240,235,0.7)",
            cursor: "pointer",
          }}
        >
          <input
            name="marketingConsent"
            type="checkbox"
            style={{ marginTop: "0.25rem", accentColor: "var(--coral)" }}
          />
          <span>{MARKETING_CONSENT_TEXT}</span>
        </label>

        <p
          style={{
            fontFamily: sans,
            fontSize: "0.8rem",
            lineHeight: 1.6,
            color: "rgba(245,240,235,0.45)",
            margin: 0,
          }}
        >
          Fab Partners AS uses what you send here only to reply to you and
          arrange the session. It is not added to a mailing list unless you
          tick the box above, and it is never passed to a third party. See
          the{" "}
          <a
            href="/privacy"
            style={{ color: "rgba(245,240,235,0.7)", textDecoration: "underline" }}
          >
            privacy notice
          </a>{" "}
          for how long it is kept and how to have it deleted.
        </p>

        <div>
          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              background: "var(--coral)",
              color: "white",
              fontFamily: sans,
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "1.1rem 2.5rem",
              border: "none",
              cursor: status === "sending" ? "wait" : "pointer",
              opacity: status === "sending" ? 0.6 : 1,
            }}
          >
            {status === "sending" ? "Sending…" : "Request a Strategy Session"}
          </button>
        </div>

        <p
          role="alert"
          aria-live="polite"
          style={{
            fontFamily: sans,
            fontSize: "0.85rem",
            color: "var(--coral)",
            margin: 0,
            minHeight: "1.2em",
          }}
        >
          {error}
        </p>
      </div>
    </form>
  );
}
