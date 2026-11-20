import { DEFAULT_TR1 } from "./types";

export type ArabicFontSize = "sm" | "md" | "lg" | "xl" | "2xl";
export type TranslationFontSize = "sm" | "md" | "lg";
export type ArabicScript = "Amiri Quran" | "Scheherazade New" | "Amiri";

export type QuranSettings = {
  version: 1;
  arabicSize: ArabicFontSize;
  translationSize: TranslationFontSize;
  script: ArabicScript;
  translations: string[];
  transliteration: boolean;
  tajweed: boolean;
  defaultTafsir: string;
};

export const SETTINGS_STORAGE_KEY = "qcs-quran-settings";

export const ARABIC_SIZE_MAP: Record<ArabicFontSize, string> = {
  sm: "1.5rem",
  md: "1.875rem",
  lg: "2.25rem",
  xl: "2.75rem",
  "2xl": "3.25rem",
};

export const TRANSLATION_SIZE_MAP: Record<TranslationFontSize, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
};

export const ARABIC_SCRIPT_FONTS: Record<ArabicScript, string> = {
  "Amiri Quran": "'Amiri Quran', serif",
  "Scheherazade New": "'Scheherazade New', serif",
  Amiri: "'Amiri', serif",
};

export const VALID_SCRIPTS: ArabicScript[] = ["Amiri Quran", "Scheherazade New", "Amiri"];
export const VALID_ARABIC_SIZES: ArabicFontSize[] = ["sm", "md", "lg", "xl", "2xl"];
export const VALID_TRANSLATION_SIZES: TranslationFontSize[] = ["sm", "md", "lg"];

export const defaultSettings: QuranSettings = {
  version: 1,
  arabicSize: "lg",
  translationSize: "md",
  script: "Amiri Quran",
  translations: [DEFAULT_TR1],
  transliteration: false,
  tajweed: false,
  defaultTafsir: "ibn_kathir",
};

/**
 * Safely parses raw settings from localStorage or external input.
 * Falls back to defaultSettings for invalid, corrupt, or missing fields.
 * Never throws.
 */
export function parseSettings(raw: unknown): QuranSettings {
  if (!raw) return { ...defaultSettings };

  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...defaultSettings };
    }
  }

  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { ...defaultSettings };
  }

  // Version check
  if (obj.version !== 1) {
    return { ...defaultSettings };
  }

  // Arabic size
  const arabicSize: ArabicFontSize = VALID_ARABIC_SIZES.includes(obj.arabicSize)
    ? obj.arabicSize
    : defaultSettings.arabicSize;

  // Translation size
  const translationSize: TranslationFontSize = VALID_TRANSLATION_SIZES.includes(obj.translationSize)
    ? obj.translationSize
    : defaultSettings.translationSize;

  // Script
  const script: ArabicScript = VALID_SCRIPTS.includes(obj.script)
    ? obj.script
    : defaultSettings.script;

  // Translations (array of up to 3 non-empty string IDs)
  let translations = defaultSettings.translations;
  if (Array.isArray(obj.translations)) {
    const validIds = obj.translations.filter(
      (id: unknown) => typeof id === "string" && id.trim().length > 0
    );
    if (validIds.length > 0) {
      translations = validIds.slice(0, 3);
    }
  }

  // Transliteration & Tajweed
  const transliteration = typeof obj.transliteration === "boolean" ? obj.transliteration : defaultSettings.transliteration;
  const tajweed = typeof obj.tajweed === "boolean" ? obj.tajweed : defaultSettings.tajweed;

  // Default tafsir
  const defaultTafsir =
    typeof obj.defaultTafsir === "string" && obj.defaultTafsir.trim().length > 0
      ? obj.defaultTafsir.trim()
      : defaultSettings.defaultTafsir;

  return {
    version: 1,
    arabicSize,
    translationSize,
    script,
    translations,
    transliteration,
    tajweed,
    defaultTafsir,
  };
}

/**
 * Serializes settings object to JSON string.
 */
export function serializeSettings(settings: QuranSettings): string {
  try {
    return JSON.stringify(settings);
  } catch {
    return JSON.stringify(defaultSettings);
  }
}

/**
 * Reads settings from localStorage safely.
 */
export function readSavedSettings(): QuranSettings {
  if (typeof window === "undefined") return { ...defaultSettings };
  try {
    const item = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return parseSettings(item);
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Saves settings to localStorage safely.
 */
export function saveSettings(settings: QuranSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(settings));
  } catch {}
}
