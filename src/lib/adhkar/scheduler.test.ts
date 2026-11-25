import { describe, it, expect } from "vitest";
import {
  buildTodayReminders,
  isInsideQuietHours,
  DEFAULT_REMINDER_SETTINGS,
} from "./scheduler";
import { evaluateItemStatus } from "./tracking";
import type { PrayerTimings, PrayerSettings } from "@/lib/prayer-times/types";
import { DEFAULT_PRAYER_SETTINGS } from "@/lib/prayer-times/types";

describe("Adhkar Scheduler & Tracking Logic", () => {
  const mockTimings: PrayerTimings = {
    Fajr: "05:15",
    Sunrise: "06:30",
    Dhuhr: "12:30",
    Asr: "15:45",
    Maghrib: "18:15",
    Isha: "19:35",
  };

  const mockSettings: PrayerSettings = {
    ...DEFAULT_PRAYER_SETTINGS,
    afterSalahOffsetMinutes: 10,
  };

  it("builds 7 daily reminders (Morning, Evening, and 5 After-Salah with 10min offsets)", () => {
    const testDate = new Date(2026, 10, 25, 8, 0, 0);
    const reminders = buildTodayReminders(mockTimings, mockSettings, testDate);

    // Morning, Evening, and 5 prayers
    expect(reminders.length).toBe(7);

    const morning = reminders.find((r) => r.type === "morning");
    expect(morning).toBeDefined();
    expect(morning?.targetTimeStr).toBe("05:15");

    const dhuhr = reminders.find((r) => r.prayer === "Dhuhr");
    expect(dhuhr).toBeDefined();
    expect(dhuhr?.targetTimeStr).toBe("12:40"); // 12:30 + 10 min

    const asr = reminders.find((r) => r.prayer === "Asr");
    expect(asr).toBeDefined();
    expect(asr?.targetTimeStr).toBe("15:55"); // 15:45 + 10 min

    const evening = reminders.find((r) => r.type === "evening");
    expect(evening).toBeDefined();
    expect(evening?.targetTimeStr).toBe("15:45");
  });

  it("evaluates overnight quiet hours correctly", () => {
    // 23:00 (inside 22:30 - 05:00)
    const lateNight = new Date(2026, 10, 25, 23, 0, 0);
    expect(isInsideQuietHours(lateNight, "22:30", "05:00")).toBe(true);

    // 03:30 (inside 22:30 - 05:00)
    const earlyMorning = new Date(2026, 10, 25, 3, 30, 0);
    expect(isInsideQuietHours(earlyMorning, "22:30", "05:00")).toBe(true);

    // 14:00 (outside quiet hours)
    const afternoon = new Date(2026, 10, 25, 14, 0, 0);
    expect(isInsideQuietHours(afternoon, "22:30", "05:00")).toBe(false);
  });

  it("evaluates dynamic status between pending, done, and missed", () => {
    const baseNow = new Date(2026, 10, 25, 16, 0, 0);

    // Done stays done
    expect(evaluateItemStatus("done", "05:15", 120, baseNow)).toBe("done");

    // Fajr at 05:15 is expired by 16:00 -> missed
    expect(evaluateItemStatus("pending", "05:15", 120, baseNow)).toBe("missed");

    // Isha at 19:35 is still upcoming -> pending
    expect(evaluateItemStatus("pending", "19:35", 120, baseNow)).toBe("pending");
  });
});
