import { MushafPageData, MushafLine, MushafWord } from "./types";
import { SURAHS_META, getJuzByPage, getSurahMeta } from "./data";
import fs from "fs";
import path from "path";

// In-memory cache
const memoryCache = new Map<number, MushafPageData>();

// Safe disk cache directory
const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "mushaf");

function getDiskCache(page: number): MushafPageData | null {
  try {
    const filePath = path.join(CACHE_DIR, `page-${page}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Disk cache read failed, ignore
  }
  return null;
}

function setDiskCache(page: number, data: MushafPageData): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const filePath = path.join(CACHE_DIR, `page-${page}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
  } catch {
    // Disk cache write failed, ignore
  }
}

interface RawWord {
  id: number;
  position: number;
  verse_key: string;
  page_number: number;
  line_number: number;
  code_v2: string;
  text_qpc_hafs?: string;
  text_uthmani?: string;
  char_type_name: string;
  translation?: {
    text: string;
    language_name?: string;
  };
}

interface RawVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  words: RawWord[];
}

interface RawApiResponse {
  verses: RawVerse[];
}

export async function fetchMushafPage(pageNumber: number): Promise<MushafPageData> {
  const page = Math.min(604, Math.max(1, Math.floor(pageNumber)));

  // Check memory cache
  if (memoryCache.has(page)) {
    return memoryCache.get(page)!;
  }

  // Check disk cache
  const cached = getDiskCache(page);
  if (cached) {
    memoryCache.set(page, cached);
    return cached;
  }

  const url = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,text_qpc_hafs,text_uthmani&mushaf=1`;

  let response: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 86400 * 30 }, // Cache on server for 30 days
      });
      if (response.ok) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `Failed to fetch Mushaf page ${page}: ${response ? response.statusText : lastError?.message || "Unknown error"}`
    );
  }

  const data: RawApiResponse = await response.json();
  const verses = data.verses || [];

  // Total lines on page: 8 for pages 1 & 2; 15 for pages 3-604
  const totalLines = page === 1 || page === 2 ? 8 : 15;

  const wordsByLine = new Map<number, MushafWord[]>();
  const verseKeysSet = new Set<string>();
  const surahsOnPage = new Map<number, any>();

  verses.forEach((v) => {
    verseKeysSet.add(v.verse_key);
    const surahId = parseInt(v.verse_key.split(":")[0], 10);
    if (!surahsOnPage.has(surahId)) {
      const meta = getSurahMeta(surahId);
      if (meta) {
        surahsOnPage.set(surahId, {
          id: meta.id,
          name_arabic: meta.name_arabic,
          name_english: meta.name_english,
          name_simple: meta.name_simple,
          start_page: meta.start_page,
        });
      }
    }

    (v.words || []).forEach((w) => {
      const lineNum = w.line_number;
      if (!wordsByLine.has(lineNum)) {
        wordsByLine.set(lineNum, []);
      }
      wordsByLine.get(lineNum)!.push({
        id: w.id,
        position: w.position,
        verse_key: v.verse_key,
        page_number: w.page_number,
        line_number: w.line_number,
        code_v2: w.code_v2,
        text_qpc_hafs: w.text_qpc_hafs,
        text_uthmani: w.text_uthmani,
        char_type_name: w.char_type_name,
        translation: w.translation,
      });
    });
  });

  // Track surah header and bismillah lines
  const headerLines = new Map<number, number>();
  const bismillahLines = new Set<number>();

  verses
    .filter((v) => v.verse_number === 1)
    .forEach((v) => {
      const surahId = parseInt(v.verse_key.split(":")[0], 10);
      const firstWord = v.words && v.words[0];
      const firstWordLine = firstWord ? firstWord.line_number : 1;

      if (surahId === 1) {
        headerLines.set(1, 1);
      } else if (surahId === 9) {
        headerLines.set(firstWordLine - 1, surahId);
      } else {
        headerLines.set(firstWordLine - 2, surahId);
        bismillahLines.add(firstWordLine - 1);
      }
    });

  const lines: MushafLine[] = [];

  for (let i = 1; i <= totalLines; i++) {
    if (headerLines.has(i)) {
      const surahId = headerLines.get(i)!;
      const meta = getSurahMeta(surahId);
      lines.push({
        line_number: i,
        type: "surah_header",
        surah_number: surahId,
        surah_name_arabic: meta?.name_arabic,
        surah_name_english: meta?.name_english,
        ayah_count: meta?.verses_count,
        revelation_place: meta?.revelation_place,
      });
    } else if (bismillahLines.has(i)) {
      lines.push({
        line_number: i,
        type: "bismillah",
      });
    } else {
      const words = wordsByLine.get(i) || [];
      lines.push({
        line_number: i,
        type: "text",
        words,
      });
    }
  }

  const juzNumber = getJuzByPage(page);

  const result: MushafPageData = {
    page_number: page,
    juz_number: juzNumber,
    lines,
    surahs: Array.from(surahsOnPage.values()),
    verse_keys: Array.from(verseKeysSet),
  };

  memoryCache.set(page, result);
  setDiskCache(page, result);

  return result;
}
