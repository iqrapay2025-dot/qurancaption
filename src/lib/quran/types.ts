export type Chapter = { id: number; nameArabic: string; nameSimple: string; meaning: string; versesCount: number; available: boolean };
export type TranslationRes = { id: string; name: string; author: string; language: string };
export type Reciter = { id: number; name: string; nameArabic: string | null; style: string | null };
export type ApiVerse = { key: string; n: number; arabic: string; translations: Record<string, string>; tajweed?: [string, string?][] };
export type AyahFile = { verseKey: string; audioUrl: string };
// UmmahAPI returns no verse timestamps: continuous audio needs manual timing; ayah files are timed by their own length.
export type SurahAudio = { reciterId: number; surah: number; audioUrl: string; files: AyahFile[] };
export type TafsirInfo = { id: string; name: string; language: string; author?: string };
export type TafsirEntry = { tafsir: string; surah: number; ayah: number; language: string; paragraphs: string[] };
export type ApiErr = { code: string; message: string; retryAfter?: number };

export const TRANSLITERATION_ID = "transliteration";
export const DEFAULT_TR1 = "sahih_international";
export const DEFAULT_TR2 = "pickthall";
export const DEFAULT_RECITER = 1;

export const VALID_TRANSLATION_KEYS = [
  "sahih_international",
  "pickthall",
  "yusuf_ali",
  "urdu",
  "turkish",
  "indonesian",
  "french",
  "german",
  "bengali",
  "spanish",
  "malay",
  "bosnian",
] as const;

export type TranslationKey = (typeof VALID_TRANSLATION_KEYS)[number];

