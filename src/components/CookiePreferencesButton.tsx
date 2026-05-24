"use client";

import { useConsent } from "./ConsentProvider";

/**
 * A small inline control that lets a visitor reset their cookie choice.
 * Used on the /privacy page so people can change their mind without
 * having to hunt for the banner.
 */
export function CookiePreferencesButton() {
  const { status, reset } = useConsent();

  const label =
    status === "granted"
      ? "Currently: accepted. Reset preference"
      : status === "denied"
        ? "Currently: declined. Reset preference"
        : "Open cookie preferences";

  return (
    <button
      type="button"
      onClick={reset}
      style={{
        display: "inline-block",
        padding: "0.55rem 1.1rem",
        backgroundColor: "transparent",
        color: "inherit",
        border: "1px solid currentColor",
        borderRadius: "2px",
        cursor: "pointer",
        fontSize: "0.85rem",
        letterSpacing: "0.02em",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
