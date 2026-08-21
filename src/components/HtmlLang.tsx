"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { HTML_LANG, stripLocale } from "@/i18n/config";

/**
 * Keeps <html lang> in step with the URL.
 *
 * The root layout is shared across every locale, so the attribute has to
 * be corrected on the client when a visitor moves between languages.
 * It matters for screen readers, which pick pronunciation from it, and
 * for browser translation prompts.
 */
export default function HtmlLang() {
  const pathname = usePathname() ?? "/";
  useEffect(() => {
    const { locale } = stripLocale(pathname);
    document.documentElement.lang = HTML_LANG[locale];
  }, [pathname]);
  return null;
}
