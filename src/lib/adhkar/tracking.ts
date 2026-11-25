import type { PrayerTimings, PrayerName } from "@/lib/prayer-times/types";
import { cleanTimeStr } from "@/lib/prayer-times/client";
import { getLocalDateKey } from "./storage";

export type DailyStatus = "pending" | "done" | "missed";

export interface PrayerTrackingItem {
  prayer: PrayerName;
  status: DailyStatus;
  scheduledTime: string; // e.g. "12:40"
  completedAt?: number;
}

export interface TodayDashboardState {
  date: string; // YYYY-MM-DD
  morningStatus: DailyStatus;
  eveningStatus: DailyStatus;
  prayers: Record<PrayerName, DailyStatus>;
  prayerCompletedAt: Partial<Record<PrayerName, number>>;
  morningCompletedAt?: number;
  eveningCompletedAt?: number;
}

const STORAGE_KEYS = {
  TODAY_DASHBOARD: "qcs-adhkar-today-dashboard",
  WEEKLY_HISTORY: "qcs-adhkar-weekly-history",
  RESET_PREFERENCE: "qcs-adhkar-reset-timing", // "midnight" | "after-isha"
};

const DEFAULT_PRAYERS: Record<PrayerName, DailyStatus> = {
  Fajr: "pending",
  Sunrise: "pending",
  Dhuhr: "pending",
  Asr: "pending",
  Maghrib: "pending",
  Isha: "pending",
};

/**
 * Load today's tracking state from localStorage or initialize freshly for today.
 */
export function loadTodayDashboardState(): TodayDashboardState {
  const todayKey = getLocalDateKey();
  const defaultState: TodayDashboardState = {
    date: todayKey,
    morningStatus: "pending",
    eveningStatus: "pending",
    prayers: {
      Fajr: "pending",
      Sunrise: "pending",
      Dhuhr: "pending",
      Asr: "pending",
      Maghrib: "pending",
      Isha: "pending",
    },
    prayerCompletedAt: {},
  };

  if (typeof window === "undefined") return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TODAY_DASHBOARD);
    if (!raw) return defaultState;
    const parsed: TodayDashboardState = JSON.parse(raw);

    // If date changed, archive to history and reset for new day
    if (parsed.date !== todayKey) {
      archiveDayToHistory(parsed);
      localStorage.setItem(STORAGE_KEYS.TODAY_DASHBOARD, JSON.stringify(defaultState));
      return defaultState;
    }

    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

/**
 * Save today's tracking state.
 */
export function saveTodayDashboardState(state: TodayDashboardState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.TODAY_DASHBOARD, JSON.stringify(state));
  } catch {}
}

/**
 * Archive a day's record into weekly history.
 */
function archiveDayToHistory(dayState: TodayDashboardState): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY_HISTORY);
    const list: TodayDashboardState[] = raw ? JSON.parse(raw) : [];

    // Filter out if date already exists
    const filtered = list.filter((item) => item.date !== dayState.date);
    filtered.push(dayState);

    // Keep up to 14 days
    const trimmed = filtered.slice(-14);
    localStorage.setItem(STORAGE_KEYS.WEEKLY_HISTORY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Get the last 7 days history for weekly summary.
 */
export function getWeeklyHistory(): TodayDashboardState[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY_HISTORY);
    const list: TodayDashboardState[] = raw ? JSON.parse(raw) : [];
    return list.slice(-7);
  } catch {
    return [];
  }
}

/**
 * Calculate dynamic status (pending, done, missed) based on current real time and prayer timings.
 */
export function evaluateItemStatus(
  currentStatus: DailyStatus,
  targetTimeStr: string,
  expiryMinutes = 120,
  now: Date = new Date()
): DailyStatus {
  if (currentStatus === "done") return "done";

  const [hStr, mStr] = cleanTimeStr(targetTimeStr).split(":");
  const targetDate = new Date(now);
  targetDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);

  const expiryDate = new Date(targetDate.getTime() + expiryMinutes * 60000);

  if (now.getTime() > expiryDate.getTime()) {
    return "missed";
  }

  return "pending";
}

/**
 * Mark a prayer's after-salah adhkar as done.
 */
export function markPrayerAdhkarDone(prayer: PrayerName): TodayDashboardState {
  const current = loadTodayDashboardState();
  const updated: TodayDashboardState = {
    ...current,
    prayers: {
      ...current.prayers,
      [prayer]: "done",
    },
    prayerCompletedAt: {
      ...current.prayerCompletedAt,
      [prayer]: Date.now(),
    },
  };
  saveTodayDashboardState(updated);
  return updated;
}

/**
 * Mark Morning or Evening adhkar as done.
 */
export function markWindowAdhkarDone(windowName: "morning" | "evening"): TodayDashboardState {
  const current = loadTodayDashboardState();
  const updated: TodayDashboardState = {
    ...current,
    morningStatus: windowName === "morning" ? "done" : current.morningStatus,
    eveningStatus: windowName === "evening" ? "done" : current.eveningStatus,
    morningCompletedAt: windowName === "morning" ? Date.now() : current.morningCompletedAt,
    eveningCompletedAt: windowName === "evening" ? Date.now() : current.eveningCompletedAt,
  };
  saveTodayDashboardState(updated);
  return updated;
}
