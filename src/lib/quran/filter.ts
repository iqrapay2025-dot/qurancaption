import type { Chapter } from "./server";

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    // Remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    // Normalize variants of Alif (أ, إ, آ, ٱ) to plain Alif (ا)
    .replace(/[أإآٱ]/g, "ا")
    // Normalize Ta Marbuta (ة) to Ha (ه)
    .replace(/ة/g, "ه")
    // Normalize Ya (ي, ى)
    .replace(/ى/g, "ي")
    .trim();
}

export function normalizeSearchString(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Strip hyphens, apostrophes, and common quotes
    .replace(/[-'’"`ʻʿ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterChapters(chapters: Chapter[], query: string): Chapter[] {
  if (!query || !query.trim()) return chapters;

  const trimmed = query.trim();
  const num = Number(trimmed);
  const isNumber = Number.isInteger(num) && num >= 1 && num <= 114;

  const normQuery = normalizeSearchString(trimmed);
  const normArabicQuery = normalizeArabic(trimmed);
  const collapsedQuery = normQuery.replace(/\s+/g, "");

  return chapters.filter((c) => {
    // 1. Match by surah number
    if (isNumber && c.id === num) return true;
    if (String(c.id) === trimmed) return true;

    // 2. Match by English name
    const normName = normalizeSearchString(c.nameSimple);
    if (normName.includes(normQuery) || normName.replace(/\s+/g, "").includes(collapsedQuery)) {
      return true;
    }

    // 3. Match by meaning
    const normMeaning = normalizeSearchString(c.meaning);
    if (normMeaning.includes(normQuery) || normMeaning.replace(/\s+/g, "").includes(collapsedQuery)) {
      return true;
    }

    // 4. Match by Arabic name
    const normArabic = normalizeArabic(c.nameArabic);
    if (normArabic.includes(normArabicQuery)) {
      return true;
    }

    return false;
  });
}
