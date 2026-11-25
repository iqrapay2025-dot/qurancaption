import { describe, it, expect } from "vitest";
import {
  cleanTimeStr,
  applyMinuteAdjustment,
  formatPrayerDisplayTime,
  calculateNextPrayer,
  getTimezoneSuggestedCity,
  clearSavedLocation,
  checkGeolocationPermission,
} from "./client";
import type { PrayerTimings } from "./types";

describe("Prayer Times Calculation & Time Manipulation", () => {
  it("cleans AlAdhan raw timing strings with timezones", () => {
    expect(cleanTimeStr("05:14 (EST)")).toBe("05:14");
    expect(cleanTimeStr("18:30 (+03)")).toBe("18:30");
    expect(cleanTimeStr("5:05")).toBe("05:05");
  });

  it("applies per-prayer minute adjustments correctly", () => {
    expect(applyMinuteAdjustment("05:10", 15)).toBe("05:25");
    expect(applyMinuteAdjustment("05:10", -15)).toBe("04:55");
    expect(applyMinuteAdjustment("23:50", 20)).toBe("00:10"); // wrap around midnight
    expect(applyMinuteAdjustment("00:05", -10)).toBe("23:55"); // wrap backwards
  });

  it("formats 24h into 12h display strings", () => {
    expect(formatPrayerDisplayTime("05:14", true)).toBe("5:14 AM");
    expect(formatPrayerDisplayTime("12:30", true)).toBe("12:30 PM");
    expect(formatPrayerDisplayTime("18:45", true)).toBe("6:45 PM");
    expect(formatPrayerDisplayTime("00:15", true)).toBe("12:15 AM");
  });

  it("determines next prayer and countdown accurately", () => {
    const mockTimings: PrayerTimings = {
      Fajr: "05:00",
      Sunrise: "06:15",
      Dhuhr: "12:30",
      Asr: "15:45",
      Maghrib: "18:15",
      Isha: "19:45",
    };

    // Simulated 10:00 AM (between Sunrise and Dhuhr)
    const morningDate = new Date(2026, 10, 25, 10, 0, 0);
    const info1 = calculateNextPrayer(mockTimings, morningDate);
    expect(info1.nextPrayer).toBe("Dhuhr");
    expect(info1.minutesRemaining).toBe(150); // 2h 30m
    expect(info1.formattedCountdown).toBe("2h 30m");

    // Simulated 17:00 PM (between Asr and Maghrib)
    const afternoonDate = new Date(2026, 10, 25, 17, 0, 0);
    const info2 = calculateNextPrayer(mockTimings, afternoonDate);
    expect(info2.nextPrayer).toBe("Maghrib");
    expect(info2.minutesRemaining).toBe(75); // 1h 15m
    expect(info2.formattedCountdown).toBe("1h 15m");

    // Simulated 21:00 PM (after Isha -> Next is tomorrow Fajr)
    const nightDate = new Date(2026, 10, 25, 21, 0, 0);
    const info3 = calculateNextPrayer(mockTimings, nightDate);
    expect(info3.nextPrayer).toBe("Fajr");
    expect(info3.currentPrayer).toBe("Isha");
    expect(info3.minutesRemaining).toBe(480); // 8 hours
  });

  it("suggests a valid city based on system timezone without permissions", () => {
    const suggested = getTimezoneSuggestedCity();
    expect(suggested).toBeDefined();
    expect(suggested.city).toBeTruthy();
    expect(suggested.country).toBeTruthy();
  });

  it("clears saved location back to default", () => {
    const cleared = clearSavedLocation();
    expect(cleared.location.isSaved).toBe(false);
    expect(cleared.location.city).toBe("Makkah");
  });

  it("checks geolocation permission status safely", async () => {
    const status = await checkGeolocationPermission();
    expect(["granted", "denied", "prompt", "unsupported"]).toContain(status);
  });
});
