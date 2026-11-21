"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import type { TourDefinition, TourId } from "@/lib/tours/types";
import { TOURS, TOUR_LIST, getTourById } from "@/lib/tours/definitions";
import { runTour, isTourRunning, stopActiveTour } from "@/lib/tours/runner";
import {
  isTourCompleted,
  hasSessionTourStarted,
  markSessionTourStarted,
  shouldAutoStartTour,
} from "@/lib/tours/storage";

interface TourContextValue {
  startTour: (id: TourId) => Promise<void>;
  stopTour: () => void;
  isTourActive: boolean;
  activeTourId: TourId | null;
  tours: TourDefinition[];
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const autoStartAttemptedRef = useRef<Set<string>>(new Set());

  const handleStartTour = useCallback(async (id: TourId) => {
    const tour = getTourById(id);
    if (!tour) return;

    setActiveTourId(id);
    setIsTourActive(true);

    try {
      await runTour(tour, {
        onStart: () => {
          setActiveTourId(id);
          setIsTourActive(true);
        },
        onDestroy: () => {
          setActiveTourId(null);
          setIsTourActive(false);
        },
      });
    } catch {
      setActiveTourId(null);
      setIsTourActive(false);
    }
  }, []);

  const handleStopTour = useCallback(() => {
    stopActiveTour();
    setActiveTourId(null);
    setIsTourActive(false);
  }, []);

  // Helper to wait until SplashLoader has completed its exit animation
  const waitReady = useCallback((callback: () => void) => {
    if (typeof window === "undefined") return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const splash = document.querySelector(".ql-loader");
      const isSplashShowing = Boolean(splash);

      if (!isSplashShowing || attempts >= 30) {
        clearInterval(interval);
        setTimeout(callback, 120);
      }
    }, 60);
  }, []);

  // Helper to extract ?tour=<id> from either location.search or location.hash
  const getTourParam = useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    // Check location.search first (?tour=...)
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get("tour");
    if (fromSearch) return fromSearch;

    // Check location.hash (?tour=... after #/editor?tour=...)
    const hash = window.location.hash;
    if (hash.includes("?")) {
      const hashQuery = hash.slice(hash.indexOf("?") + 1);
      const hashParams = new URLSearchParams(hashQuery);
      return hashParams.get("tour");
    }

    return null;
  }, []);

  const cleanTourParam = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      let cleanSearch = "";
      if (window.location.search) {
        const sp = new URLSearchParams(window.location.search);
        sp.delete("tour");
        const qs = sp.toString();
        if (qs) cleanSearch = `?${qs}`;
      }

      let cleanHash = window.location.hash;
      if (cleanHash.includes("?")) {
        const [hashPath, hashQuery] = cleanHash.split("?");
        const hp = new URLSearchParams(hashQuery);
        hp.delete("tour");
        const qs = hp.toString();
        cleanHash = qs ? `${hashPath}?${qs}` : hashPath;
      }

      const newUrl = (window.location.pathname || "/") + cleanSearch + cleanHash;
      window.history.replaceState({}, document.title, newUrl);
    } catch {}
  }, []);

  // Check URL query parameters for ?tour=<id> on load, path change, or hash change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAndRunQueryTour = () => {
      const tourParam = getTourParam();
      if (!tourParam) return;

      const tour = getTourById(tourParam.toLowerCase());
      if (!tour) return;

      waitReady(() => {
        cleanTourParam();
        handleStartTour(tour.id);
      });
    };

    checkAndRunQueryTour();
    window.addEventListener("hashchange", checkAndRunQueryTour);
    return () => {
      window.removeEventListener("hashchange", checkAndRunQueryTour);
    };
  }, [pathname, handleStartTour, waitReady, getTourParam, cleanTourParam]);

  // Check for auto-start condition on the current page
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If ?tour query param is present, let the query effect handle it exclusively
    if (getTourParam()) return;

    let targetTourId: TourId | null = null;
    const hash = window.location.hash;

    if (hash === "#/editor" || hash.startsWith("#/editor?") || hash.startsWith("#/editor/")) {
      targetTourId = "editor";
    } else if (pathname === "/" || pathname === "/home") {
      targetTourId = "welcome";
    } else if (pathname === "/quran" || pathname?.startsWith("/quran/")) {
      if (pathname === "/quran/bookmarks") {
        targetTourId = "bookmarks";
      } else {
        targetTourId = "quran-reader";
      }
    } else if (pathname === "/listen" || pathname?.startsWith("/listen/")) {
      targetTourId = "listen";
    }

    if (!targetTourId) return;

    const pageKey = `${pathname || ""}${hash || ""}`;
    if (autoStartAttemptedRef.current.has(pageKey)) return;
    autoStartAttemptedRef.current.add(pageKey);

    let active = true;
    waitReady(() => {
      if (!active) return;

      const cookieBanner = document.getElementById("cookie-consent-banner");
      const isCookieBannerOpen = Boolean(cookieBanner);

      const dialog = document.querySelector('dialog[open], [role="dialog"]');
      const isModalOpen = Boolean(dialog);

      const completed = isTourCompleted(targetTourId!);
      const sessionStarted = hasSessionTourStarted();

      const shouldStart = shouldAutoStartTour({
        tourId: targetTourId!,
        tourQueryParam: null,
        isCompleted: completed,
        sessionTourStarted: sessionStarted,
        isCookieBannerOpen,
        isModalOpen,
        isDrawerOpen: false,
        isSplashActive: false,
      });

      if (shouldStart && !isTourRunning()) {
        markSessionTourStarted();
        handleStartTour(targetTourId!);
      }
    });

    return () => {
      active = false;
    };
  }, [pathname, handleStartTour, waitReady, getTourParam]);

  // Clean up tour on route change if destination is different
  useEffect(() => {
    return () => {
      if (isTourRunning()) {
        stopActiveTour();
      }
    };
  }, [pathname]);

  const value = useMemo<TourContextValue>(
    () => ({
      startTour: handleStartTour,
      stopTour: handleStopTour,
      isTourActive,
      activeTourId,
      tours: TOUR_LIST,
    }),
    [handleStartTour, handleStopTour, isTourActive, activeTourId]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
