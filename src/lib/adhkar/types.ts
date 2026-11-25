export type AdhkarCategory =
  | "morning"
  | "evening"
  | "after-salah"
  | "sleep"
  | "waking"
  | "general";

export interface AdhkarSource {
  book: string;
  hadith_reference: string;
  narrator?: string;
  grading?: string;
  sunnah_url?: string;
}

export interface AdhkarItem {
  id: string;
  category: AdhkarCategory;
  order: number;
  title: string;
  arabic: string;
  transliteration: string;
  translation_en: string;
  repeat: number;
  virtue?: string;
  source: AdhkarSource;
  sourceDataset: string;
}

export interface AdhkarCategoryMeta {
  slug: AdhkarCategory;
  title: string;
  titleArabic: string;
  description: string;
  icon: string;
  color: string;
  suggestedTime?: string;
}

export const ADHKAR_CATEGORIES: AdhkarCategoryMeta[] = [
  {
    slug: "morning",
    title: "Morning Adhkar",
    titleArabic: "أَذْكَارُ الصَّبَاحِ",
    description: "Protection and light for the day, recited from Fajr until sunrise.",
    icon: "Sunrise",
    color: "amber",
    suggestedTime: "Fajr to Sunrise",
  },
  {
    slug: "evening",
    title: "Evening Adhkar",
    titleArabic: "أَذْكَارُ الْمَسَاءِ",
    description: "Protection through the night, recited from Asr until Maghrib.",
    icon: "Sunset",
    color: "indigo",
    suggestedTime: "Asr to Maghrib",
  },
  {
    slug: "after-salah",
    title: "After Salah",
    titleArabic: "أَذْكَارُ بَعْدَ الصَّلَاةِ",
    description: "Tasbih and supplications following the five daily obligatory prayers.",
    icon: "Clock",
    color: "emerald",
    suggestedTime: "Post Obligatory Prayers",
  },
  {
    slug: "sleep",
    title: "Before Sleep",
    titleArabic: "أَذْكَارُ النَّوْمِ",
    description: "Guarding supplications and Ayat al-Kursi before resting at night.",
    icon: "Moon",
    color: "purple",
    suggestedTime: "Bedtime",
  },
  {
    slug: "waking",
    title: "Upon Waking",
    titleArabic: "أَذْكَارُ الِاسْتِيقَاظِ",
    description: "Gratitude for the renewal of life upon awakening from sleep.",
    icon: "Sun",
    color: "gold",
    suggestedTime: "Upon Awakening",
  },
  {
    slug: "general",
    title: "Daily & General Du'as",
    titleArabic: "أَدْعِيَةٌ عَامَّةٌ",
    description: "Essential supplications for travel, home, mosque, and daily life.",
    icon: "BookOpen",
    color: "teal",
    suggestedTime: "Throughout the Day",
  },
];
