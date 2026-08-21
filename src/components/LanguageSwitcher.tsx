"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABELS, localePath, stripLocale, type Locale } from "@/i18n/config";

/**
 * Language switcher.
 *
 * Keeps the reader on the page they are already on: it strips the locale
 * prefix off the current path and re-prefixes it for the target language,
 * so /nb/assessments switches to /sv/assessments rather than dumping the
 * visitor back on the homepage.
 *
 * Rendered as real links, not a JavaScript-driven select, so each
 * language is crawlable and opens in a new tab if someone wants that.
 */

const sans = "'Helvetica Neue', Arial, sans-serif";

export default function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";
  const { route } = stripLocale(pathname);

  return (
    <nav
      aria-label="Language"
      style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}
    >
      {LOCALES.map((locale, i) => {
        const isCurrent = locale === current;
        return (
          <span key={locale} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{ color: "rgba(245,240,235,0.25)", fontSize: "0.7rem", padding: "0 0.35rem" }}
              >
                /
              </span>
            )}
            <Link
              href={localePath(locale, route)}
              hrefLang={locale}
              aria-current={isCurrent ? "true" : undefined}
              style={{
                fontFamily: sans,
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: isCurrent ? "var(--cream)" : "rgba(245,240,235,0.5)",
                borderBottom: isCurrent ? "1px solid var(--coral)" : "1px solid transparent",
                paddingBottom: "2px",
              }}
            >
              {LOCALE_LABELS[locale]}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
