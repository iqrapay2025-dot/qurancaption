import type { PrayerTimings, PrayerSettings, PrayerName } from "@/lib/prayer-times/types";
import { cleanTimeStr, applyMinuteAdjustment } from "@/lib/prayer-times/client";
import { getLocalDateKey } from "./storage";
import { markPrayerAdhkarDone, markWindowAdhkarDone } from "./tracking";

export type ReminderType = "morning" | "evening" | "after-salah";

export interface ScheduledReminder {
  id: string; // unique reminder id for today e.g. "2026-11-25_after_salah_Dhuhr"
  type: ReminderType;
  prayer?: PrayerName;
  title: string;
  body: string;
  targetTimeStr: string; // e.g. "12:40"
  targetTimestamp: number;
  url: string;
  category: string;
}

export interface ReminderNotificationEvent {
  reminder: ScheduledReminder;
  snoozedUntil?: number;
}

export interface ReminderSettings {
  enabled: boolean;
  browserNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:30"
  quietHoursEnd: string; // "05:00"
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  browserNotifications: false, // OFF by default
  quietHoursEnabled: true,
  quietHoursStart: "22:30",
  quietHoursEnd: "05:00",
};

const STORAGE_KEYS = {
  SETTINGS: "qcs-adhkar-reminder-settings",
  DISPATCHED_MAP: "qcs-adhkar-dispatched-reminders", // { [id]: number timestamp }
  SNOOZE_MAP: "qcs-adhkar-snoozed-reminders", // { [id]: number timestamp }
};

/**
 * Load reminder settings from localStorage.
 */
export function loadReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

/**
 * Save reminder settings.
 */
export function saveReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_REMINDER_SETTINGS;
  try {
    const current = loadReminderSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

/**
 * Request browser Notification permission only when explicitly toggled.
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Check if the given time falls inside quiet hours.
 */
export function isInsideQuietHours(
  now: Date,
  startStr: string,
  endStr: string
): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = cleanTimeStr(startStr).split(":").map(Number);
  const startMinutes = sH * 60 + sM;

  const [eH, eM] = cleanTimeStr(endStr).split(":").map(Number);
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g. 22:30 to 05:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Generate all scheduled reminders for today based on prayer times and user offset.
 */
export function buildTodayReminders(
  timings: PrayerTimings,
  settings: PrayerSettings,
  now: Date = new Date()
): ScheduledReminder[] {
  const todayKey = getLocalDateKey(now);
  const reminders: ScheduledReminder[] = [];

  const createDateAtTime = (timeStr: string) => {
    const [h, m] = cleanTimeStr(timeStr).split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  // 1. Morning Adhkar: window starts at Fajr
  if (timings.Fajr) {
    const fajrTime = cleanTimeStr(timings.Fajr);
    reminders.push({
      id: `${todayKey}_morning_fajr`,
      type: "morning",
      title: "Morning Adhkar Time",
      body: "Start your day with light, remembrance and protection from Fajr until sunrise.",
      targetTimeStr: fajrTime,
      targetTimestamp: createDateAtTime(fajrTime),
      url: "/adhkar/morning",
      category: "morning",
    });
  }

  // 2. 5 After-Salah Adhkar reminders: [prayer time + "I usually pray" offset]
  const salahPrayers: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const prayer of salahPrayers) {
    if (timings[prayer]) {
      const scheduledTime = applyMinuteAdjustment(
        timings[prayer],
        settings.afterSalahOffsetMinutes || 10
      );
      reminders.push({
        id: `${todayKey}_after_salah_${prayer}`,
        type: "after-salah",
        prayer,
        title: `After ${prayer} Adhkar`,
        body: `Recite your post-prayer supplications and tasbih for ${prayer}.`,
        targetTimeStr: scheduledTime,
        targetTimestamp: createDateAtTime(scheduledTime),
        url: `/adhkar/after-salah?prayer=${prayer.toLowerCase()}`,
        category: "after-salah",
      });
    }
  }

  // 3. Evening Adhkar: window starts at Asr
  if (timings.Asr) {
    const asrTime = cleanTimeStr(timings.Asr);
    reminders.push({
      id: `${todayKey}_evening_asr`,
      type: "evening",
      title: "Evening Adhkar Time",
      body: "Protect your evening with the authentic evening remembrances before Maghrib.",
      targetTimeStr: asrTime,
      targetTimestamp: createDateAtTime(asrTime),
      url: "/adhkar/evening",
      category: "evening",
    });
  }

  return reminders;
}

/**
 * Check if a reminder has already been dispatched today (never spam).
 */
export function isReminderDispatched(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHED_MAP);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return !!map[id];
  } catch {
    return false;
  }
}

/**
 * Mark a reminder as dispatched.
 */
export function markReminderDispatched(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHED_MAP);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = Date.now();
    localStorage.setItem(STORAGE_KEYS.DISPATCHED_MAP, JSON.stringify(map));
  } catch {}
}

/**
 * Snooze a reminder for 10 minutes.
 */
export function snoozeReminder(id: string, snoozeMinutes = 10): number {
  const snoozeUntil = Date.now() + snoozeMinutes * 60000;
  if (typeof window === "undefined") return snoozeUntil;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = snoozeUntil;
    localStorage.setItem(STORAGE_KEYS.SNOOZE_MAP, JSON.stringify(map));
  } catch {}
  return snoozeUntil;
}

/**
 * Get active snoozed timestamp for a reminder.
 */
export function getSnoozedUntil(id: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[id] || null;
  } catch {
    return null;
  }
}

/**
 * Clear snooze when handled or done.
 */
export function clearSnooze(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[id];
    localStorage.setItem(STORAGE_KEYS.SNOOZE_MAP, JSON.stringify(map));
  } catch {}
}

/**
 * Evaluate pending reminders against real timestamps.
 * Returns the highest priority active reminder to trigger right now, if any.
 */
export function evaluateReminders(
  timings: PrayerTimings,
  settings: PrayerSettings,
  reminderSettings: ReminderSettings,
  now: Date = new Date()
): ScheduledReminder | null {
  if (!reminderSettings.enabled) return null;

  // Check quiet hours
  if (
    reminderSettings.quietHoursEnabled &&
    isInsideQuietHours(
      now,
      reminderSettings.quietHoursStart,
      reminderSettings.quietHoursEnd
    )
  ) {
    return null;
  }

  const allReminders = buildTodayReminders(timings, settings, now);
  const nowMs = now.getTime();

  for (const r of allReminders) {
    // Check if snoozed
    const snoozedUntil = getSnoozedUntil(r.id);
    if (snoozedUntil) {
      if (nowMs >= snoozedUntil) {
        // Snooze duration elapsed, ready to trigger again
        clearSnooze(r.id);
        return r;
      }
      continue; // Still within snooze window
    }

    // Check if already dispatched once
    if (isReminderDispatched(r.id)) {
      continue;
    }

    // Check if reminder target time has arrived (within a 60 min validity window)
    const diff = nowMs - r.targetTimestamp;
    if (diff >= 0 && diff <= 60 * 60000) {
      return r;
    }
  }

  return null;
}

/**
 * Trigger browser Notification if permitted.
 */
export function triggerBrowserNotification(reminder: ScheduledReminder): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(reminder.title, {
      body: reminder.body,
      icon: "/brand/ayah-badge-light-96.webp",
      tag: reminder.id, // replaces previous notification with same tag
    });
    n.onclick = () => {
      window.focus();
      if (typeof window !== "undefined") {
        window.location.href = reminder.url;
      }
      n.close();
    };
  } catch {}
}
