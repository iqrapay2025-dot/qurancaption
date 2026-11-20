export function parseSurahParam(s: string): number | null {
  if (!s || typeof s !== "string") return null;
  // Accept only strictly 1 to 3 digits with NO leading zeros (/^[1-9]\d{0,2}$/)
  if (!/^[1-9]\d{0,2}$/.test(s)) return null;
  const num = Number(s);
  if (!Number.isInteger(num) || num < 1 || num > 114) return null;
  return num;
}

export const SURAH_NAMES_SIMPLE = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am",
  "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim",
  "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj",
  "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas",
  "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin",
  "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf",
  "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid",
  "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun",
  "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan",
  "Al-Mursalat", "An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar",
  "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah",
  "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin",
  "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah",
  "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar",
  "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

export function adjacentSurahs(n: number) {
  const prev = n > 1 ? { id: n - 1, nameSimple: SURAH_NAMES_SIMPLE[n - 2] } : null;
  const next = n < 114 ? { id: n + 1, nameSimple: SURAH_NAMES_SIMPLE[n] } : null;
  return { prev, next };
}

/**
 * Returns whether to show a separate Bismillah banner above the first ayah.
 * Al-Fatihah's (1) first ayah IS the Bismillah.
 * At-Tawbah (9) has no Bismillah.
 * All other surahs (2-8, 10-114) have a separate Bismillah.
 */
export function showSeparateBismillah(surah: number): boolean {
  if (surah === 1 || surah === 9) return false;
  return surah >= 1 && surah <= 114;
}

export const BISMILLAH_ARABIC = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
