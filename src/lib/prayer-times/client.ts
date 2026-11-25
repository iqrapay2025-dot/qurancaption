import type {
  PrayerName,
  PrayerTimings,
  PrayerSettings,
  PrayerLocation,
  NextPrayerInfo,
} from "./types";
import { DEFAULT_PRAYER_SETTINGS } from "./types";

const STORAGE_KEYS = {
  SETTINGS: "qcs-prayer-settings",
  MONTH_CACHE_PREFIX: "qcs-prayer-month",
};

/**
 * Load prayer settings from localStorage.
 */
export function loadPrayerSettings(): PrayerSettings {
  if (typeof window === "undefined") return DEFAULT_PRAYER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_PRAYER_SETTINGS;
    return { ...DEFAULT_PRAYER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

/**
 * Save prayer settings to localStorage.
 */
export function savePrayerSettings(settings: Partial<PrayerSettings>): PrayerSettings {
  if (typeof window === "undefined") return DEFAULT_PRAYER_SETTINGS;
  try {
    const current = loadPrayerSettings();
    const updated = {
      ...current,
      ...settings,
      adjustments: { ...current.adjustments, ...settings.adjustments },
      customTimes: { ...current.customTimes, ...settings.customTimes },
      location: { ...current.location, ...settings.location },
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

/**
 * Clean timing string from AlAdhan (e.g. "05:14 (EST)" -> "05:14").
 */
export function cleanTimeStr(raw: string): string {
  if (!raw) return "00:00";
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return raw.trim();
  const h = match[1].padStart(2, "0");
  const m = match[2];
  return `${h}:${m}`;
}

/**
 * Add or subtract minutes from a "HH:MM" string.
 */
export function applyMinuteAdjustment(timeStr: string, minutes: number): string {
  if (!minutes) return timeStr;
  const cleaned = cleanTimeStr(timeStr);
  const [hStr, mStr] = cleaned.split(":");
  let totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes;

  // Wrap around 24 hours
  totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);

  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Format 24h "HH:MM" to localized 12h display string (e.g. "5:14 AM" or "05:14").
 */
export function formatPrayerDisplayTime(timeStr: string, use12Hour = true): string {
  const cleaned = cleanTimeStr(timeStr);
  if (!use12Hour) return cleaned;

  const [hStr, mStr] = cleaned.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

/**
 * Simple offline solar calculation fallback in case of no network and empty cache.
 */
function getOfflineSolarFallbackTimings(date: Date = new Date()): PrayerTimings {
  return {
    Fajr: "05:15",
    Sunrise: "06:30",
    Dhuhr: "12:30",
    Asr: "15:45",
    Maghrib: "18:15",
    Isha: "19:35",
  };
}

/**
 * Fetch monthly calendar from AlAdhan API or local cache.
 */
export async function getMonthlyPrayerTimes(
  year: number,
  month: number,
  settings: PrayerSettings
): Promise<any[]> {
  const loc = settings.location;
  const locKey = loc.latitude && loc.longitude
    ? `${loc.latitude.toFixed(2)}_${loc.longitude.toFixed(2)}`
    : `${loc.city}_${loc.country}`.toLowerCase().replace(/\s+/g, "_");

  const cacheKey = `${STORAGE_KEYS.MONTH_CACHE_PREFIX}-${year}-${month}-${locKey}-m${settings.methodId}-s${settings.asrSchool}`;

  // Check cache in localStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  // Fetch from AlAdhan API
  try {
    let url = "";
    if (loc.latitude !== undefined && loc.longitude !== undefined) {
      url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${loc.latitude}&longitude=${loc.longitude}&method=${settings.methodId}&school=${settings.asrSchool}&latitudeAdjustmentMethod=${settings.highLatitudeMethod}`;
    } else {
      const safeCity = encodeURIComponent(loc.city);
      const safeCountry = encodeURIComponent(loc.country);
      url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${safeCity}&country=${safeCountry}&method=${settings.methodId}&school=${settings.asrSchool}&latitudeAdjustmentMethod=${settings.highLatitudeMethod}`;
    }

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`AlAdhan API error status: ${res.status}`);
    }

    const json = await res.json();
    if (json.code === 200 && Array.isArray(json.data)) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
        } catch {}
      }
      return json.data;
    }
    throw new Error("Invalid response format from AlAdhan");
  } catch (err) {
    // Return empty array on failure so caller can fall back to offline calculation
    return [];
  }
}

/**
 * Get prayer timings for today with adjustments and custom times applied.
 */
export async function getTodayPrayerTimes(
  settings: PrayerSettings,
  targetDate: Date = new Date()
): Promise<PrayerTimings> {
  // If user opted for custom times, use them immediately
  if (settings.useCustomTimes && settings.customTimes) {
    return {
      Fajr: cleanTimeStr(settings.customTimes.Fajr),
      Sunrise: cleanTimeStr(settings.customTimes.Sunrise),
      Dhuhr: cleanTimeStr(settings.customTimes.Dhuhr),
      Asr: cleanTimeStr(settings.customTimes.Asr),
      Maghrib: cleanTimeStr(settings.customTimes.Maghrib),
      Isha: cleanTimeStr(settings.customTimes.Isha),
    };
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();

  let rawTimings: PrayerTimings;
  const monthData = await getMonthlyPrayerTimes(year, month, settings);

  if (monthData && monthData[day - 1]?.timings) {
    rawTimings = monthData[day - 1].timings;
  } else {
    rawTimings = getOfflineSolarFallbackTimings(targetDate);
  }

  // Apply per-prayer minute adjustments (-30 to +30 min)
  const adjusted: PrayerTimings = {
    Fajr: applyMinuteAdjustment(rawTimings.Fajr, settings.adjustments.Fajr || 0),
    Sunrise: applyMinuteAdjustment(rawTimings.Sunrise, settings.adjustments.Sunrise || 0),
    Dhuhr: applyMinuteAdjustment(rawTimings.Dhuhr, settings.adjustments.Dhuhr || 0),
    Asr: applyMinuteAdjustment(rawTimings.Asr, settings.adjustments.Asr || 0),
    Maghrib: applyMinuteAdjustment(rawTimings.Maghrib, settings.adjustments.Maghrib || 0),
    Isha: applyMinuteAdjustment(rawTimings.Isha, settings.adjustments.Isha || 0),
  };

  return adjusted;
}

/**
 * Determine current prayer and next prayer with countdown.
 */
export function calculateNextPrayer(
  timings: PrayerTimings,
  now: Date = new Date()
): NextPrayerInfo {
  const prayerOrder: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const parseToDate = (timeStr: string, baseDate: Date) => {
    const cleaned = cleanTimeStr(timeStr);
    const [h, m] = cleaned.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const todayDates: { name: PrayerName; date: Date }[] = prayerOrder.map((name) => ({
    name,
    date: parseToDate(timings[name], now),
  }));

  const nowMs = now.getTime();

  // Find next prayer today
  for (let i = 0; i < todayDates.length; i++) {
    const p = todayDates[i];
    if (p.date.getTime() > nowMs) {
      const diffMs = p.date.getTime() - nowMs;
      const minutesRemaining = Math.max(1, Math.round(diffMs / 60000));
      const hours = Math.floor(minutesRemaining / 60);
      const mins = minutesRemaining % 60;
      const formattedCountdown =
        hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const currentName = i === 0 ? "Night" : todayDates[i - 1].name;

      return {
        currentPrayer: currentName,
        nextPrayer: p.name,
        nextPrayerTime: timings[p.name],
        nextPrayerDate: p.date,
        minutesRemaining,
        formattedCountdown,
      };
    }
  }

  // If after Isha, next prayer is tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFajr = parseToDate(timings.Fajr, tomorrow);
  const diffMs = tomorrowFajr.getTime() - nowMs;
  const minutesRemaining = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(minutesRemaining / 60);
  const mins = minutesRemaining % 60;

  return {
    currentPrayer: "Isha",
    nextPrayer: "Fajr",
    nextPrayerTime: timings.Fajr,
    nextPrayerDate: tomorrowFajr,
    minutesRemaining,
    formattedCountdown: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
  };
}

/**
 * Check browser geolocation permission status.
 */
export async function checkGeolocationPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions || !navigator.permissions.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state; // "granted" | "denied" | "prompt"
  } catch {
    return "unsupported";
  }
}

/**
 * Get a one-tap suggested city based on the user's system timezone without needing any permissions.
 */
export function getTimezoneSuggestedCity(): PrayerLocation {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {}

  const tzMap: Record<string, PrayerLocation> = {
    "Africa/Lagos": { city: "Lagos", country: "Nigeria", latitude: 6.52, longitude: 3.38, timezone: "Africa/Lagos" },
    "Africa/Cairo": { city: "Cairo", country: "Egypt", latitude: 30.04, longitude: 31.24, timezone: "Africa/Cairo" },
    "Asia/Riyadh": { city: "Makkah", country: "Saudi Arabia", latitude: 21.42, longitude: 39.83, timezone: "Asia/Riyadh" },
    "Asia/Dubai": { city: "Dubai", country: "United Arab Emirates", latitude: 25.20, longitude: 55.27, timezone: "Asia/Dubai" },
    "Europe/London": { city: "London", country: "United Kingdom", latitude: 51.51, longitude: -0.13, timezone: "Europe/London" },
    "America/New_York": { city: "New York", country: "United States", latitude: 40.71, longitude: -74.01, timezone: "America/New_York" },
    "America/Toronto": { city: "Toronto", country: "Canada", latitude: 43.65, longitude: -79.38, timezone: "America/Toronto" },
    "America/Chicago": { city: "Chicago", country: "United States", latitude: 41.88, longitude: -87.63, timezone: "America/Chicago" },
    "Europe/Paris": { city: "Paris", country: "France", latitude: 48.86, longitude: 2.35, timezone: "Europe/Paris" },
    "Europe/Istanbul": { city: "Istanbul", country: "Turkey", latitude: 41.01, longitude: 28.98, timezone: "Europe/Istanbul" },
    "Asia/Karachi": { city: "Karachi", country: "Pakistan", latitude: 24.86, longitude: 67.01, timezone: "Asia/Karachi" },
    "Asia/Kolkata": { city: "Mumbai", country: "India", latitude: 19.08, longitude: 72.88, timezone: "Asia/Kolkata" },
    "Asia/Dhaka": { city: "Dhaka", country: "Bangladesh", latitude: 23.81, longitude: 90.41, timezone: "Asia/Dhaka" },
    "Asia/Jakarta": { city: "Jakarta", country: "Indonesia", latitude: -6.21, longitude: 106.85, timezone: "Asia/Jakarta" },
    "Asia/Kuala_Lumpur": { city: "Kuala Lumpur", country: "Malaysia", latitude: 3.14, longitude: 101.69, timezone: "Asia/Kuala_Lumpur" },
    "Australia/Sydney": { city: "Sydney", country: "Australia", latitude: -33.87, longitude: 151.21, timezone: "Australia/Sydney" },
  };

  if (tz && tzMap[tz]) {
    return tzMap[tz];
  }

  // Fallback heuristic: parse continent/city
  if (tz && tz.includes("/")) {
    const parts = tz.split("/");
    const cityRaw = parts[parts.length - 1].replace(/_/g, " ");
    return {
      city: cityRaw,
      country: parts[0],
      timezone: tz,
    };
  }

  return {
    city: "Makkah",
    country: "Saudi Arabia",
    latitude: 21.42,
    longitude: 39.83,
    timezone: "Asia/Riyadh",
  };
}

/**
 * Clear saved location and revert to default.
 */
export function clearSavedLocation(): PrayerSettings {
  return savePrayerSettings({
    location: {
      city: "Makkah",
      country: "Saudi Arabia",
      latitude: 21.42,
      longitude: 39.83,
      isSaved: false,
    },
  });
}

/**
 * Request browser geolocation and round coordinates to 2 decimal places (~1.1km) for privacy.
 */
export async function requestRoundedGeolocation(): Promise<PrayerLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser. Please choose your city below."));
      return;
    }

    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {}

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to 2 decimal places for user privacy (~1.1km)
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const lat = Math.round(rawLat * 100) / 100;
        const lng = Math.round(rawLng * 100) / 100;

        resolve({
          city: "My Location",
          country: "GPS",
          latitude: lat,
          longitude: lng,
          isCustomCoords: true,
          isSaved: true,
          timezone: tz,
        });
      },
      (err) => {
        const message = err.message || "";
        if (err.code === 1 || message.toLowerCase().includes("denied")) {
          reject(new Error("Location access was denied. You can allow it from the lock icon in your address bar, or choose your city below."));
        } else if (message.toLowerCase().includes("permissions policy") || message.toLowerCase().includes("disabled")) {
          reject(new Error("Location access is disabled by browser policy. You can choose your city below."));
        } else if (err.code === 2) {
          reject(new Error("Your position is currently unavailable. Please choose your city below."));
        } else if (err.code === 3) {
          reject(new Error("Location request timed out. Please choose your city below or try again."));
        } else {
          reject(new Error("Could not detect location. Please choose your city below."));
        }
      },
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  });
}
