import type { AdhkarCategory, AdhkarItem, AdhkarCategoryMeta } from "./types";
import { ADHKAR_CATEGORIES } from "./types";

import morningData from "../../../data/adhkar/morning.json";
import eveningData from "../../../data/adhkar/evening.json";
import afterSalahData from "../../../data/adhkar/after-salah.json";
import sleepData from "../../../data/adhkar/sleep.json";
import wakingData from "../../../data/adhkar/waking.json";
import generalData from "../../../data/adhkar/general.json";
import allData from "../../../data/adhkar/adhkar.json";

const categoryMap: Record<AdhkarCategory, AdhkarItem[]> = {
  morning: morningData as AdhkarItem[],
  evening: eveningData as AdhkarItem[],
  "after-salah": afterSalahData as AdhkarItem[],
  sleep: sleepData as AdhkarItem[],
  waking: wakingData as AdhkarItem[],
  general: generalData as AdhkarItem[],
};

const allAdhkarList = allData as AdhkarItem[];

/**
 * Get all adhkar items for a specific category.
 */
export function getAdhkarByCategory(category: AdhkarCategory): AdhkarItem[] {
  return categoryMap[category] || [];
}

/**
 * Get all adhkar across all categories.
 */
export function getAllAdhkar(): AdhkarItem[] {
  return allAdhkarList;
}

/**
 * Get a single dhikr item by its unique ID.
 */
export function getDhikrById(id: string): AdhkarItem | undefined {
  return allAdhkarList.find((item) => item.id === id);
}

/**
 * Get category metadata by slug.
 */
export function getCategoryMeta(category: AdhkarCategory): AdhkarCategoryMeta | undefined {
  return ADHKAR_CATEGORIES.find((c) => c.slug === category);
}

/**
 * Strip Arabic diacritics / tashkeel for tolerant searching.
 */
export function stripArabicTashkeel(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // Tashkeel / Harakat
    .replace(/[إأآٱ]/g, "ا") // Normalize Alef
    .replace(/ة/g, "ه") // Normalize Ta Marbuta
    .replace(/ى/g, "ي") // Normalize Alef Maqsura
    .trim();
}

/**
 * Normalize English/transliterated text for fuzzy/tolerant search.
 */
export function normalizeLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/['-`’ʻ]/g, "") // Remove apostrophes/hamza
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tolerant search across all adhkar items (Arabic, transliteration, English, title, and source).
 */
export function searchAdhkar(query: string, items?: AdhkarItem[]): AdhkarItem[] {
  const q = query.trim();
  if (!q) return items || allAdhkarList;

  const dataset = items || allAdhkarList;
  const isArabicQuery = /[\u0600-\u06FF]/.test(q);

  if (isArabicQuery) {
    const cleanQ = stripArabicTashkeel(q);
    return dataset.filter((item) => {
      const cleanArabic = stripArabicTashkeel(item.arabic);
      const cleanTitle = stripArabicTashkeel(item.title);
      return cleanArabic.includes(cleanQ) || cleanTitle.includes(cleanQ);
    });
  }

  const normQ = normalizeLatin(q);
  const qTokens = normQ.split(" ").filter(Boolean);

  return dataset.filter((item) => {
    const normTitle = normalizeLatin(item.title);
    const normTrans = normalizeLatin(item.transliteration);
    const normTranslat = normalizeLatin(item.translation_en);
    const normVirtue = item.virtue ? normalizeLatin(item.virtue) : "";
    const normRef = normalizeLatin(item.source?.hadith_reference || "");

    const haystack = `${normTitle} ${normTrans} ${normTranslat} ${normVirtue} ${normRef}`;
    return qTokens.every((token) => haystack.includes(token));
  });
}

/**
 * Determine suggested category based on current local hour of day.
 * - 04:00 - 07:00: Upon Waking / Morning
 * - 05:00 - 12:00: Morning Adhkar
 * - 15:00 - 20:00: Evening Adhkar
 * - 21:00 - 04:00: Before Sleep
 */
export function getSuggestedCategory(currentHour?: number): {
  category: AdhkarCategory;
  reason: string;
} {
  const hour = currentHour !== undefined ? currentHour : new Date().getHours();

  if (hour >= 4 && hour < 6) {
    return {
      category: "waking",
      reason: "Early morning awakenings & gratitude",
    };
  }
  if (hour >= 6 && hour < 12) {
    return {
      category: "morning",
      reason: "Morning adhkar (Fajr until sunrise/noon)",
    };
  }
  if (hour >= 12 && hour < 15) {
    return {
      category: "after-salah",
      reason: "Dhuhr prayer & midday supplications",
    };
  }
  if (hour >= 15 && hour < 20) {
    return {
      category: "evening",
      reason: "Evening adhkar (Asr until Maghrib)",
    };
  }
  return {
    category: "sleep",
    reason: "Nighttime & bedtime protection",
  };
}
