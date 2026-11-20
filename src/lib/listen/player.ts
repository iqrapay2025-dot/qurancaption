export type RepeatMode = "off" | "surah" | "all";

export const ALLOWED_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof ALLOWED_SPEEDS)[number];

export const DEFAULT_RECITER_ID = 1;
export const DEFAULT_SURAH = 1;

/**
 * Returns the next surah number given current surah (1-114) and repeat mode.
 * - "surah": returns the current surah (replays it)
 * - "all": advances and wraps from 114 to 1
 * - "off": advances and stops at 114
 */
export function nextSurah(current: number, mode: RepeatMode = "off"): number {
  if (mode === "surah") return current;
  if (current >= 114) {
    return mode === "all" ? 1 : 114;
  }
  return Math.max(1, current + 1);
}

/**
 * Returns the previous surah number given current surah (1-114) and repeat mode.
 * - "surah": returns the current surah
 * - "all": moves back and wraps from 1 to 114
 * - "off": moves back and stops at 1
 */
export function prevSurah(current: number, mode: RepeatMode = "off"): number {
  if (mode === "surah") return current;
  if (current <= 1) {
    return mode === "all" ? 114 : 1;
  }
  return Math.min(114, current - 1);
}

/**
 * Formats seconds into mm:ss or h:mm:ss string.
 * Examples:
 *   formatTime(0) -> "0:00"
 *   formatTime(59) -> "0:59"
 *   formatTime(61) -> "1:01"
 *   formatTime(3599) -> "59:59"
 *   formatTime(3600) -> "1:00:00"
 */
export function formatTime(seconds: number | unknown): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const paddedSecs = String(secs).padStart(2, "0");
  if (hrs > 0) {
    const paddedMins = String(mins).padStart(2, "0");
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

/**
 * Clamps playback speed to the nearest allowed value: 0.75, 1, 1.25, 1.5.
 */
export function clampSpeed(speed: number | unknown): PlaybackSpeed {
  if (typeof speed !== "number" || !Number.isFinite(speed)) return 1;
  if (speed <= 0.75) return 0.75;
  if (speed >= 1.5) return 1.5;

  let closest: PlaybackSpeed = 1;
  let minDiff = Infinity;
  for (const s of ALLOWED_SPEEDS) {
    const diff = Math.abs(speed - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

export type ListenQueryParams = {
  surah?: string | number | null;
  reciter?: string | number | null;
};

/**
 * Parses query params (?surah=36&reciter=1) and returns validated surah (1-114) and reciter ID.
 * Falls back to defaults (surah 1, reciter 1) if missing, invalid, out of range, or unknown reciter.
 */
export function parseListenQuery(
  query: ListenQueryParams | URLSearchParams | Record<string, string | string[] | undefined> | null | undefined,
  validReciterIds?: number[] | Set<number>
): { surah: number; reciter: number } {
  let rawSurah: any = null;
  let rawReciter: any = null;

  if (query) {
    if (typeof (query as any).get === "function") {
      const search = query as URLSearchParams;
      rawSurah = search.get("surah");
      rawReciter = search.get("reciter");
    } else {
      const obj = query as Record<string, any>;
      rawSurah = Array.isArray(obj.surah) ? obj.surah[0] : obj.surah;
      rawReciter = Array.isArray(obj.reciter) ? obj.reciter[0] : obj.reciter;
    }
  }

  // Validate surah
  let surah = DEFAULT_SURAH;
  if (rawSurah !== null && rawSurah !== undefined && rawSurah !== "") {
    const parsed = Number(rawSurah);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 114) {
      surah = parsed;
    }
  }

  // Validate reciter
  let reciter = DEFAULT_RECITER_ID;
  if (rawReciter !== null && rawReciter !== undefined && rawReciter !== "") {
    const parsed = Number(rawReciter);
    if (Number.isInteger(parsed) && parsed > 0) {
      if (validReciterIds) {
        const allowed = validReciterIds instanceof Set ? validReciterIds : new Set(validReciterIds);
        if (allowed.has(parsed)) {
          reciter = parsed;
        }
      } else {
        reciter = parsed;
      }
    }
  }

  return { surah, reciter };
}
