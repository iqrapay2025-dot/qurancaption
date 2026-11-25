import { PlannerPlan } from "./types";

export interface PlannerReminderSettings {
  enabled: boolean;
  browserNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "05:00"
}

export const DEFAULT_PLANNER_REMINDER_SETTINGS: PlannerReminderSettings = {
  enabled: true,
  browserNotifications: false, // OFF by default
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "05:00",
};

const STORAGE_KEYS = {
  SETTINGS: "aayah_planner_reminder_settings",
  DISPATCHED_MAP: "aayah_planner_dispatched_reminders",
  SNOOZE_MAP: "aayah_planner_snoozed_reminders",
};

export interface ActivePlannerReminder {
  id: string;
  type: "sabaq" | "manzil";
  title: string;
  body: string;
  timestamp: number;
}

export function loadPlannerReminderSettings(): PlannerReminderSettings {
  if (typeof window === "undefined") return DEFAULT_PLANNER_REMINDER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_PLANNER_REMINDER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PLANNER_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_PLANNER_REMINDER_SETTINGS;
  }
}

export function savePlannerReminderSettings(settings: PlannerReminderSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function isQuietHours(now: Date, start: string, end: string): boolean {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Spans midnight, e.g. 22:00 to 05:00
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  }
  return curMinutes >= startMinutes && curMinutes < endMinutes;
}

export function checkDuePlannerReminders(
  plan: PlannerPlan,
  settings: PlannerReminderSettings = loadPlannerReminderSettings()
): ActivePlannerReminder | null {
  if (!settings.enabled || plan.paused) return null;

  const now = new Date();
  if (settings.quietHoursEnabled && isQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) {
    return null;
  }

  const todayStr = now.toISOString().split("T")[0];
  const nowTs = now.getTime();

  // Check snooze map
  let snoozeMap: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    if (raw) snoozeMap = JSON.parse(raw);
  } catch {
    snoozeMap = {};
  }

  // Check dispatched map
  let dispatchedMap: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHED_MAP);
    if (raw) dispatchedMap = JSON.parse(raw);
  } catch {
    dispatchedMap = {};
  }

  // 1. Sabaq reminder
  const [sabH, sabM] = plan.reminderTimes.sabaq.split(":").map(Number);
  const sabaqTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sabH, sabM, 0).getTime();
  const sabaqId = `${todayStr}_sabaq`;

  if (nowTs >= sabaqTarget) {
    const isDispatched = dispatchedMap[sabaqId];
    const snoozedUntil = snoozeMap[sabaqId];
    const isSnoozedActive = snoozedUntil && nowTs < snoozedUntil;

    if (!isDispatched && !isSnoozedActive) {
      return {
        id: sabaqId,
        type: "sabaq",
        title: "Time for your Sabaq",
        body: `Ready for today's new lesson (${plan.dailyLessonSize} lines)? Spend 15 minutes to memorize and recite fluently.`,
        timestamp: sabaqTarget,
      };
    }
  }

  // 2. Manzil reminder
  const [manH, manM] = plan.reminderTimes.murajaah.split(":").map(Number);
  const manzilTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), manH, manM, 0).getTime();
  const manzilId = `${todayStr}_manzil`;

  if (nowTs >= manzilTarget) {
    const isDispatched = dispatchedMap[manzilId];
    const snoozedUntil = snoozeMap[manzilId];
    const isSnoozedActive = snoozedUntil && nowTs < snoozedUntil;

    if (!isDispatched && !isSnoozedActive) {
      return {
        id: manzilId,
        type: "manzil",
        title: "Time to revise your Manzil",
        body: "Strengthen your memorization with today's revision slice. Keep your Quran glowing!",
        timestamp: manzilTarget,
      };
    }
  }

  return null;
}

export function dismissPlannerReminder(reminderId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHED_MAP);
    const map = raw ? JSON.parse(raw) : {};
    map[reminderId] = Date.now();
    localStorage.setItem(STORAGE_KEYS.DISPATCHED_MAP, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function snoozePlannerReminder(reminderId: string, minutes: number = 10): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    const map = raw ? JSON.parse(raw) : {};
    map[reminderId] = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.SNOOZE_MAP, JSON.stringify(map));
  } catch {
    // ignore
  }
}
