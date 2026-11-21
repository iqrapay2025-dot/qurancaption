import type { TourId } from "./types";

export const TOUR_STORAGE_PREFIX = "qcs-tour-";
export const TOUR_STORAGE_SUFFIX = "-done";
export const TOUR_SESSION_KEY = "qcs-tour-session-started";

/**
 * Safely get a localStorage key
 */
function safeGetItem(storage: Storage | undefined, key: string): string | null {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    return s?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Safely set a localStorage key
 */
function safeSetItem(storage: Storage | undefined, key: string, value: string): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    s?.setItem(key, value);
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Safely remove a localStorage key
 */
function safeRemoveItem(storage: Storage | undefined, key: string): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    s?.removeItem(key);
  } catch {
    // Ignore errors
  }
}

export function getTourStorageKey(id: TourId): string {
  return `${TOUR_STORAGE_PREFIX}${id}${TOUR_STORAGE_SUFFIX}`;
}

export function isTourCompleted(id: TourId, storage?: Storage): boolean {
  const val = safeGetItem(storage, getTourStorageKey(id));
  if (!val) return false;
  return val === "1" || val === "true" || val.trim().length > 0;
}

export function markTourCompleted(id: TourId, storage?: Storage): void {
  safeSetItem(storage, getTourStorageKey(id), "1");
}

export function resetTour(id: TourId, storage?: Storage): void {
  safeRemoveItem(storage, getTourStorageKey(id));
}

export function resetAllTours(storage?: Storage): void {
  const tourIds: TourId[] = ["welcome", "quran-reader", "listen", "editor", "bookmarks"];
  for (const id of tourIds) {
    resetTour(id, storage);
  }
}

export function hasSessionTourStarted(storage?: Storage): boolean {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    return s?.getItem(TOUR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSessionTourStarted(storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    s?.setItem(TOUR_SESSION_KEY, "1");
  } catch {
    // Ignore
  }
}

export function resetSessionTour(storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    s?.removeItem(TOUR_SESSION_KEY);
  } catch {
    // Ignore
  }
}

export interface AutoStartCheckParams {
  tourId: TourId;
  tourQueryParam?: string | null;
  isCompleted?: boolean;
  sessionTourStarted?: boolean;
  isCookieBannerOpen?: boolean;
  isModalOpen?: boolean;
  isDrawerOpen?: boolean;
  isSplashActive?: boolean;
}

/**
 * Pure helper deciding if a tour should auto-start.
 */
export function shouldAutoStartTour({
  tourId,
  tourQueryParam,
  isCompleted = false,
  sessionTourStarted = false,
  isCookieBannerOpen = false,
  isModalOpen = false,
  isDrawerOpen = false,
  isSplashActive = false,
}: AutoStartCheckParams): boolean {
  // If ?tour=<id> query parameter is present for this tour, start unconditionally
  if (tourQueryParam && tourQueryParam.toLowerCase() === tourId.toLowerCase()) {
    return true;
  }

  // If a different tour is requested via ?tour, don't start this one
  if (tourQueryParam) {
    return false;
  }

  // Don't auto-start if splash loader is still showing or page is not ready
  if (isSplashActive) {
    return false;
  }

  // Don't auto-start if cookie banner, modal, or drawer is active
  if (isCookieBannerOpen || isModalOpen || isDrawerOpen) {
    return false;
  }

  // Don't auto-start if already completed
  if (isCompleted) {
    return false;
  }

  // Avoid tour fatigue: at most one auto-started tour per session
  if (sessionTourStarted) {
    return false;
  }

  return true;
}
