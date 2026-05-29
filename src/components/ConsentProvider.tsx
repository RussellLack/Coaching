"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ConsentStatus = "unknown" | "granted" | "denied";

const STORAGE_KEY = "fab.consent.analytics.v1";

type ConsentContextValue = {
  status: ConsentStatus;
  accept: () => void;
  decline: () => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function pushConsentUpdate(next: ConsentStatus) {
  if (typeof window === "undefined") return;
  if (next === "unknown") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: unknown[]) => w.dataLayer.push(args);

  gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: next === "granted" ? "granted" : "denied",
  });
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("unknown");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "granted" || stored === "denied") {
        setStatus(stored);
        pushConsentUpdate(stored);
      }
    } catch {
      // localStorage unavailable — stay "unknown"
    }
  }, []);

  const persist = useCallback((next: ConsentStatus) => {
    setStatus(next);
    try {
      if (next === "unknown") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // ignore
    }
    pushConsentUpdate(next);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      status,
      accept: () => persist("granted"),
      decline: () => persist("denied"),
      reset: () => persist("unknown"),
    }),
    [status, persist],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used inside <ConsentProvider>");
  }
  return ctx;
}
