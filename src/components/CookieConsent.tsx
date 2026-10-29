"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "cookie_consent_choice";

export function useCookieConsent() {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_KEY);
      if (stored === "accepted" || stored === "declined") {
        setConsent(stored);
      }
    } catch (e) {
      // localStorage not available — treat as no choice
    }
  }, []);

  const hasChoice = consent !== null;
  const showBanner = !hasChoice;

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_KEY, "accepted");
    } catch (e) {
      // ignore
    }
    setConsent("accepted");
  };

  const decline = () => {
    try {
      localStorage.setItem(COOKIE_KEY, "declined");
    } catch (e) {
      // ignore
    }
    setConsent("declined");
  };

  const hasAnalyticsConsent = () => consent === "accepted";

  return { consent, hasChoice, showBanner, accept, decline, hasAnalyticsConsent };
}

export default function CookieConsent() {
  const { consent, showBanner, accept, decline, hasAnalyticsConsent } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-navy text-sm py-3 px-4 shadow-xl z-50 max-w-2xl mx-auto"
    >
      <div className="max-w-2xl mx-auto text-center text-sm">
        <p className="text-muted-foreground mb-3">
          We use essential cookies to keep you signed in and process payments.
          With your permission, we also use analytics cookies to improve the site.
        </p>
        <div className="flex gap-3">
          <button
            onClick={accept}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="rounded-sm border border-primary px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
          >
            Decline
          </button>
          <span className="ml-4 text-xs text-muted-foreground">
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-primary"
              onClick={decline}
            >
              Cookie settings
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
