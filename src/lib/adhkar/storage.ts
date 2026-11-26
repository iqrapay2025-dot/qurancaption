import type { AdhkarCategory, AdhkarItem } from "./types";
import { saveOfflineAdhkar, isAdhkarOffline, deleteOfflineAdhkar } from "@/lib/offline/db";

export type ArabicFontChoice =
  | "UthmanicHafs"
  | "Amiri Quran"
  | "Amiri"
  | "Scheherazade New";

export interface AdhkarPreferences {
  arabicFont: ArabicFontChoice;
  arabicSize: number; // 20 - 44 px
  showTransliteration: boolean;
  vibration: boolean;
  autoOpenSuggested: boolean;
}

export const DEFAULT_PREFERENCES: AdhkarPreferences = {
  arabicFont: "UthmanicHafs",
  arabicSize: 28,
  showTransliteration: true,
  vibration: true,
  autoOpenSuggested: true,
};

const STORAGE_KEYS = {
  PREFS: "qcs-adhkar-prefs",
  AUDIO_SETTINGS: "qcs-adhkar-audio-settings",
  AUDIO_FEEDBACK: "qcs-adhkar-audio-feedback",
  COUNTERS: "qcs-adhkar-counters", // { [dateStr]: { [id]: number } }
  COMPLETIONS: "qcs-adhkar-completed", // { [dateStr]: string[] of ids or categories }
  STREAK: "qcs-adhkar-streak",
};

export interface AdhkarAudioSettings {
  speed: 0.75 | 1 | 1.25 | 1.5;
  repeat: 1 | 3 | 5;
  listenAndRepeat: boolean;
  autoCount: boolean;
  autoAdvance?: boolean;
  hasSeenTip: boolean;
  firstPlayedAt?: number;
  feedbackSubmitted?: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AdhkarAudioSettings = {
  speed: 1,
  repeat: 1,
  listenAndRepeat: false,
  autoCount: false,
  autoAdvance: true,
  hasSeenTip: false,
};

/**
 * Load adhkar audio settings from localStorage.
 */
export function loadAdhkarAudioSettings(): AdhkarAudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

/**
 * Save adhkar audio settings to localStorage.
 */
export function saveAdhkarAudioSettings(
  settings: Partial<AdhkarAudioSettings>
): AdhkarAudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;
  try {
    const current = loadAdhkarAudioSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export interface AudioFeedbackRecord {
  rating: "Yes" | "Somewhat" | "No";
  comment?: string;
  submittedAt: number;
}

/**
 * Save audio feedback.
 */
export function saveAudioFeedback(record: AudioFeedbackRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIO_FEEDBACK, JSON.stringify(record));
    saveAdhkarAudioSettings({ feedbackSubmitted: true });
  } catch {}
}

/**
 * Get saved audio feedback if any.
 */
export function getAudioFeedback(): AudioFeedbackRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIO_FEEDBACK);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Get current date key formatted YYYY-MM-DD in user's local timezone.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Load adhkar preferences from localStorage.
 */
export function loadAdhkarPreferences(): AdhkarPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save adhkar preferences to localStorage.
 */
export function saveAdhkarPreferences(prefs: Partial<AdhkarPreferences>): AdhkarPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const current = loadAdhkarPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Trigger light haptic vibration feedback if enabled and supported.
 */
export function triggerHaptic(duration = 20): void {
  if (typeof window === "undefined") return;
  try {
    const prefs = loadAdhkarPreferences();
    if (prefs.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  } catch {}
}

/**
 * Get the current remaining count for a dhikr item today.
 * Returns defaultRepeat if not yet tapped.
 */
export function getDhikrRemaining(id: string, defaultRepeat: number): number {
  if (typeof window === "undefined") return defaultRepeat;
  try {
    const today = getLocalDateKey();
    const raw = localStorage.getItem(`${STORAGE_KEYS.COUNTERS}-${today}`);
    if (!raw) return defaultRepeat;
    const map = JSON.parse(raw);
    return typeof map[id] === "number" ? map[id] : defaultRepeat;
  } catch {
    return defaultRepeat;
  }
}

/**
 * Decrement the counter for a dhikr item.
 * Decreases remaining count by 1 until 0.
 * Returns { remaining, isDone, wasJustCompleted }.
 */
export function decrementDhikr(
  id: string,
  defaultRepeat: number
): { remaining: number; isDone: boolean; wasJustCompleted: boolean } {
  if (typeof window === "undefined") {
    const rem = Math.max(0, defaultRepeat - 1);
    return { remaining: rem, isDone: rem === 0, wasJustCompleted: rem === 0 };
  }

  try {
    const today = getLocalDateKey();
    const storageKey = `${STORAGE_KEYS.COUNTERS}-${today}`;
    const raw = localStorage.getItem(storageKey);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};

    const currentRemaining = typeof map[id] === "number" ? map[id] : defaultRepeat;
    if (currentRemaining <= 0) {
      return { remaining: 0, isDone: true, wasJustCompleted: false };
    }

    const nextRemaining = currentRemaining - 1;
    map[id] = nextRemaining;
    localStorage.setItem(storageKey, JSON.stringify(map));

    triggerHaptic(nextRemaining === 0 ? 40 : 18);

    const wasJustCompleted = nextRemaining === 0;
    if (wasJustCompleted) {
      recordItemCompletion(id, today);
    }

    return {
      remaining: nextRemaining,
      isDone: nextRemaining === 0,
      wasJustCompleted,
    };
  } catch {
    const rem = Math.max(0, defaultRepeat - 1);
    return { remaining: rem, isDone: rem === 0, wasJustCompleted: rem === 0 };
  }
}

/**
 * Reset counter for a specific dhikr item.
 */
export function resetDhikr(id: string, defaultRepeat: number): number {
  if (typeof window === "undefined") return defaultRepeat;
  try {
    const today = getLocalDateKey();
    const storageKey = `${STORAGE_KEYS.COUNTERS}-${today}`;
    const raw = localStorage.getItem(storageKey);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[id] = defaultRepeat;
    localStorage.setItem(storageKey, JSON.stringify(map));
    return defaultRepeat;
  } catch {
    return defaultRepeat;
  }
}

/**
 * Record an item completion for today's streak & tracking.
 */
function recordItemCompletion(id: string, todayKey: string): void {
  try {
    const key = `${STORAGE_KEYS.COMPLETIONS}-${todayKey}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
      updateDailyStreak(todayKey);
    }
  } catch {}
}

/**
 * Calculate user's consecutive days streak.
 */
export function calculateStreak(): { currentStreak: number; bestStreak: number; todayActive: boolean } {
  if (typeof window === "undefined") {
    return { currentStreak: 0, bestStreak: 0, todayActive: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!raw) return { currentStreak: 0, bestStreak: 0, todayActive: false };
    const data = JSON.parse(raw);
    const today = getLocalDateKey();
    const todayActive = !!data.completedDays?.[today];
    return {
      currentStreak: data.currentStreak || 0,
      bestStreak: data.bestStreak || 0,
      todayActive,
    };
  } catch {
    return { currentStreak: 0, bestStreak: 0, todayActive: false };
  }
}

/**
 * Update daily streak record.
 */
function updateDailyStreak(todayKey: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    const data: {
      completedDays?: Record<string, boolean>;
      currentStreak?: number;
      bestStreak?: number;
      lastDate?: string;
    } = raw ? JSON.parse(raw) : { completedDays: {} };

    data.completedDays = data.completedDays || {};
    if (data.completedDays[todayKey]) return; // already counted today

    data.completedDays[todayKey] = true;

    // Check yesterday
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayKey = getLocalDateKey(d);

    let streak = 1;
    if (data.lastDate === yesterdayKey) {
      streak = (data.currentStreak || 0) + 1;
    }

    data.currentStreak = streak;
    data.bestStreak = Math.max(streak, data.bestStreak || 0);
    data.lastDate = todayKey;

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(data));
  } catch {}
}

/**
 * Check if all items in a category are completed for today.
 */
export function getCategoryProgress(
  category: AdhkarCategory,
  items: AdhkarItem[]
): { completed: number; total: number; percentage: number; isFullyCompleted: boolean } {
  if (items.length === 0) {
    return { completed: 0, total: 0, percentage: 0, isFullyCompleted: false };
  }

  let completedCount = 0;
  for (const item of items) {
    const rem = getDhikrRemaining(item.id, item.repeat);
    if (rem === 0) {
      completedCount++;
    }
  }

  const percentage = Math.round((completedCount / items.length) * 100);
  return {
    completed: completedCount,
    total: items.length,
    percentage,
    isFullyCompleted: completedCount === items.length,
  };
}

/**
 * Reset all counters for a category.
 */
export function resetCategoryCounters(items: AdhkarItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const today = getLocalDateKey();
    const storageKey = `${STORAGE_KEYS.COUNTERS}-${today}`;
    const raw = localStorage.getItem(storageKey);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    for (const item of items) {
      map[item.id] = item.repeat;
    }
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {}
}

export { saveOfflineAdhkar, isAdhkarOffline, deleteOfflineAdhkar };
