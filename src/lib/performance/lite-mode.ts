/**
 * Lite Mode detection and management for low-memory / slow-network mobile devices.
 * Automatically enables reduced transparency/effects on low-end hardware,
 * while allowing user manual override in settings.
 */

export const LITE_MODE_STORAGE_KEY = "qcs-lite-mode";

export type LiteModePreference = "auto" | "on" | "off";

export function getLiteModePreference(): LiteModePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const val = localStorage.getItem(LITE_MODE_STORAGE_KEY);
    if (val === "on" || val === "off" || val === "auto") return val;
  } catch {}
  return "auto";
}

export function setLiteModePreference(pref: LiteModePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LITE_MODE_STORAGE_KEY, pref);
  } catch {}
  applyLiteMode();
}

/**
 * Checks if Lite Mode should be active based on preference and device signals.
 */
export function isLiteModeActive(): boolean {
  if (typeof window === "undefined") return false;

  const pref = getLiteModePreference();
  if (pref === "on") return true;
  if (pref === "off") return false;

  // Auto detection signals
  try {
    // 1. Data Saver mode enabled
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return true;

    // 2. Slow connection (2g or slow-2g)
    if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;

    // 3. Low device memory (<= 2GB)
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (typeof mem === "number" && mem <= 2) return true;

    // 4. Low CPU core count (<= 2 cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
  } catch {}

  return false;
}

/**
 * Applies or removes the .lite-mode class on document.documentElement.
 */
export function applyLiteMode(): boolean {
  if (typeof document === "undefined") return false;
  const active = isLiteModeActive();
  if (active) {
    document.documentElement.classList.add("lite-mode");
  } else {
    document.documentElement.classList.remove("lite-mode");
  }
  return active;
}
