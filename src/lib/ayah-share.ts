import { SURAH_VERSE_COUNTS } from "./editor-link";
import { SURAH_NAMES_SIMPLE } from "./quran/reader";

export function validateAyahParams(
  surahParam: unknown,
  ayahParam: unknown
): { surah: number; ayah: number; surahName: string; totalAyahs: number } | null {
  const sStr = typeof surahParam === "string" ? surahParam.trim() : String(surahParam ?? "");
  const aStr = typeof ayahParam === "string" ? ayahParam.trim() : String(ayahParam ?? "");

  if (!/^[1-9]\d{0,2}$/.test(sStr)) return null;
  if (!/^[1-9]\d{0,2}$/.test(aStr)) return null;

  const surah = Number(sStr);
  const ayah = Number(aStr);

  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
  const totalAyahs = SURAH_VERSE_COUNTS[surah - 1] || 0;
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > totalAyahs) return null;

  const surahName = SURAH_NAMES_SIMPLE[surah - 1] || `Surah ${surah}`;
  return { surah, ayah, surahName, totalAyahs };
}

export function trimAyahDescription(
  translation: string,
  maxLength = 170,
  suffix = " Read, listen and create Quran caption videos on Ayah Studio."
): string {
  if (!translation || typeof translation !== "string") {
    return `Read and listen to the Holy Quran with translation and tafsir on Ayah Studio.`;
  }
  const clean = translation.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    const trailingPunctuation = /[.!?]$/.test(clean) ? "" : ".";
    return `${clean}${trailingPunctuation}${suffix}`;
  }
  // Trim on a word boundary
  let trimmed = clean.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    trimmed = trimmed.slice(0, lastSpace);
  }
  // Remove trailing punctuation
  trimmed = trimmed.replace(/[,;:.!?\-–—]+$/, "");
  return `${trimmed}…${suffix}`;
}

export function buildAyahShareUrl(surah: number, ayah: number, origin = ""): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/ayah/${surah}/${ayah}`;
}

export function calculateOgFontSize(textLength: number): {
  arSize: number;
  trSize: number;
} {
  if (textLength < 60) {
    return { arSize: 34, trSize: 24 };
  }
  if (textLength < 140) {
    return { arSize: 28, trSize: 20 };
  }
  if (textLength < 250) {
    return { arSize: 24, trSize: 18 };
  }
  return { arSize: 20, trSize: 16 };
}
