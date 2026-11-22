// Reviewed by the site owner before launch: pending

import { SURAH_VERSE_COUNTS } from "./editor-link";

/**
 * Curated list of standalone, inspiring verse keys on guidance, mercy, patience,
 * gratitude and trust in Allah. Short verses, strictly under 40 words.
 * NO Quran text typed, paraphrased or stored here.
 */
export const DAILY_AYAH_KEYS: string[] = [
  "1:1",
  "1:2",
  "1:5",
  "1:6",
  "2:152",
  "2:153",
  "2:186",
  "2:255",
  "2:286",
  "3:139",
  "3:159",
  "3:173",
  "3:200",
  "4:147",
  "6:17",
  "7:180",
  "9:51",
  "9:129",
  "10:57",
  "10:62",
  "11:88",
  "12:86",
  "12:90",
  "13:28",
  "14:7",
  "14:40",
  "15:98",
  "16:97",
  "16:128",
  "17:24",
  "17:70",
  "17:82",
  "18:10",
  "19:96",
  "20:25",
  "20:114",
  "20:130",
  "21:87",
  "21:89",
  "23:118",
  "24:35",
  "25:63",
  "25:74",
  "26:80",
  "27:19",
  "28:24",
  "29:69",
  "30:21",
  "31:17",
  "39:53",
  "40:60",
  "41:34",
  "42:19",
  "46:15",
  "55:60",
  "57:4",
  "65:2",
  "65:3",
  "93:3",
  "94:5",
  "94:6",
];

// Fixed epoch date for deterministic daily cycling
const EPOCH_TIME = new Date(2026, 0, 1).getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Deterministically picks a verse key based on visitor's local date.
 * Returns the same ayah all day, changes the next day, and wraps cleanly at list length.
 */
export function pickDailyKey(date: Date = new Date()): string {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayIndex = Math.floor((localDate - EPOCH_TIME) / MS_PER_DAY);
  const total = DAILY_AYAH_KEYS.length;
  const wrappedIndex = ((dayIndex % total) + total) % total;
  return DAILY_AYAH_KEYS[wrappedIndex];
}

/**
 * Parses a verse key into surah number and ayah number.
 */
export function parseDailyKey(key: string): { surah: number; ayah: number } | null {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const surah = parseInt(parts[0], 10);
  const ayah = parseInt(parts[1], 10);
  if (isNaN(surah) || isNaN(ayah)) return null;
  if (surah < 1 || surah > 114) return null;
  const max = SURAH_VERSE_COUNTS[surah - 1];
  if (ayah < 1 || ayah > max) return null;
  return { surah, ayah };
}

/**
 * Strips Arabic diacritics / tashkeel and recitation stop symbols for a simplified,
 * clean reading experience.
 */
export function stripTashkeel(text: string): string {
  if (!text) return "";
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
}

/**
 * Returns balanced, responsive typography classes based on verse length and optional user size offset (-1, 0, +1).
 * Prevents long verses (e.g. 11:88, 2:255, 2:286) from ballooning into huge, crowded blocks of text.
 */
export function getDailyAyahArabicClass(textLength: number, sizeOffset: number = 0): string {
  if (sizeOffset <= -1) {
    if (textLength > 180) {
      return "text-base sm:text-lg md:text-xl leading-[2.2] sm:leading-[2.3]";
    }
    if (textLength > 90) {
      return "text-lg sm:text-xl md:text-2xl leading-[2.2] sm:leading-[2.3]";
    }
    return "text-xl sm:text-2xl md:text-3xl leading-loose";
  }

  if (sizeOffset >= 1) {
    if (textLength > 180) {
      return "text-xl sm:text-2xl md:text-3xl leading-[2.3] sm:leading-loose";
    }
    if (textLength > 90) {
      return "text-2xl sm:text-3xl leading-loose";
    }
    return "text-2xl sm:text-3xl md:text-4xl leading-loose";
  }

  if (textLength > 180) {
    return "text-[17px] sm:text-lg md:text-xl lg:text-2xl leading-[2.25] sm:leading-[2.35]";
  }
  if (textLength > 90) {
    return "text-lg sm:text-xl md:text-2xl leading-[2.2] sm:leading-loose";
  }
  return "text-xl sm:text-2xl md:text-3xl leading-loose";
}

