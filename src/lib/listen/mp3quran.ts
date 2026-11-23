export interface ListenReciter {
  id: number;
  name: string;
  nameArabic: string | null;
  style: string | null;
  server: string;
  surahTotal: number;
  surahList: number[];
}

/**
 * Maps legacy 11 UmmahAPI reciter IDs to corresponding MP3Quran reciter IDs
 * so returning users keep their chosen reciter smoothly.
 */
export const LEGACY_RECITER_MAP: Record<number, number> = {
  1: 123, // Mishari Alafasi
  2: 54,  // Abdulrahman Alsudaes
  3: 51,  // Abdulbasit Abdulsamad
  4: 51,  // Abdulbasit Abdulsamad
  5: 102, // Maher Al Meaqli
  6: 30,  // Saad Al-Ghamdi
  7: 116, // Hani Ar-Rifai
  8: 4,   // Shaik Abu Bakr Al Shatri
  9: 92,  // Yasser Al-Dosari
  10: 31, // Saud Al-Shuraim
  11: 59, // Abdullah Al-Juhany
};

export const DEFAULT_LISTEN_RECITER_ID = 123; // Mishary Alafasi

export function mapLegacyReciterId(id: number): number {
  return LEGACY_RECITER_MAP[id] ?? id;
}

/**
 * Builds the direct MP3 audio stream URL for a given surah.
 * Surah number is padded to 3 digits (e.g. 1 -> "001.mp3", 114 -> "114.mp3").
 */
export function buildListenAudioUrl(server: string, surah: number): string {
  const cleanServer = server.endsWith("/") ? server : `${server}/`;
  const pad3 = String(surah).padStart(3, "0");
  return `${cleanServer}${pad3}.mp3`;
}

// Popular reciters pinned to top of the selector in intuitive order
export const FEATURED_RECITER_IDS = [
  123, // Mishary Alafasi
  54,  // Abdulrahman Alsudaes
  31,  // Saud Al-Shuraim
  102, // Maher Al Meaqli
  30,  // Saad Al-Ghamdi
  51,  // Abdulbasit Abdulsamad
  118, // Mahmoud Khalil Al-Hussary (Murattal)
  11802, // Mahmoud Khalil Al-Hussary (Mujawwad)
  112, // Mohammed Siddiq Al-Minshawi
  92,  // Yasser Al-Dosari
  4,   // Abu Bakr Al Shatri
  86,  // Nasser Alqatami
  221, // Raad Al Kurdi
  12,  // Idrees Abkr
  59,  // Abdullah Al-Juhany
];

export function sortListenReciters(reciters: ListenReciter[]): ListenReciter[] {
  const featuredRank = new Map<number, number>();
  FEATURED_RECITER_IDS.forEach((id, index) => featuredRank.set(id, index));

  return [...reciters].sort((a, b) => {
    const rankA = featuredRank.has(a.id) ? featuredRank.get(a.id)! : 9999;
    const rankB = featuredRank.has(b.id) ? featuredRank.get(b.id)! : 9999;

    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}
