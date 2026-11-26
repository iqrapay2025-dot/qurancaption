import type { Chapter, ApiVerse } from "@/lib/quran/server";
import type { MushafPageData } from "@/lib/mushaf/types";
import { getSurahMeta, SURAHS_META } from "@/lib/mushaf/data";
import { mapLegacyReciterId } from "@/lib/listen/mp3quran";

export const DB_NAME = "ayah_studio_offline_v1";
export const DB_VERSION = 5;

export const STORES = {
  CONTENT: "surah_content",
  AUDIO: "surah_audio",
  MUSHAF: "mushaf_pages",
  FULL_AUDIO: "listen_audio",
  ADHKAR: "adhkar_content",
  ADHKAR_AUDIO: "adhkar_audio",
} as const;

export interface OfflineSurahContent {
  surah: number;
  chapter: Chapter;
  verses: ApiVerse[];
  downloadedAt: number;
  sizeBytes: number;
}

export interface OfflineVerseAudioRecord {
  verseKey: string;
  blob: Blob;
  mimeType: string;
}

export interface OfflineSurahAudio {
  id: string; // `${surah}_${reciterId}`
  surah: number;
  reciterId: number;
  reciterName: string;
  files: OfflineVerseAudioRecord[];
  fullAudioBlob?: Blob;
  downloadedAt: number;
  totalBytes: number;
}

export interface OfflineMushafPage {
  page_number: number;
  data: MushafPageData;
  downloadedAt: number;
  sizeBytes: number;
}

export interface OfflineFullAudio {
  id: string; // `${surah}_${reciterId}`
  surah: number;
  reciterId: number;
  reciterName: string;
  blob: Blob;
  mimeType: string;
  downloadedAt: number;
  sizeBytes: number;
}

export interface OfflineAdhkarAudioRecord {
  url: string; // audioUrl (e.g. "/audio/opendua/OD-001.mp3" or ayah audio url)
  category: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  downloadedAt: number;
}

export interface OfflineDownloadSummary {
  surah: number;
  surahName: string;
  surahNameArabic: string;
  versesCount: number;
  hasText: boolean;
  hasAudio: boolean;
  hasMushaf?: boolean;
  mushafPages?: number[];
  reciterId?: number;
  reciterName?: string;
  totalBytes: number;
  downloadedAt: number;
}

/**
 * Open or upgrade the offline IndexedDB database.
 */
export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.CONTENT)) {
        db.createObjectStore(STORES.CONTENT, { keyPath: "surah" });
      }
      if (!db.objectStoreNames.contains(STORES.AUDIO)) {
        db.createObjectStore(STORES.AUDIO, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.MUSHAF)) {
        db.createObjectStore(STORES.MUSHAF, { keyPath: "page_number" });
      }
      if (!db.objectStoreNames.contains(STORES.FULL_AUDIO)) {
        db.createObjectStore(STORES.FULL_AUDIO, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.ADHKAR)) {
        db.createObjectStore(STORES.ADHKAR, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.ADHKAR_AUDIO)) {
        const store = db.createObjectStore(STORES.ADHKAR_AUDIO, { keyPath: "url" });
        store.createIndex("by_category", "category", { unique: false });
      }
    };

    request.onblocked = () => {
      console.warn("IndexedDB upgrade blocked: another tab has an older version open.");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open offline database"));
  });
}

/**
 * Safely read all records from an IndexedDB store without crashing if the store is missing.
 * Prevents transaction deadlocks, handles aborts, and includes a timeout safety guard.
 */
export async function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  if (!db || !db.objectStoreNames || !db.objectStoreNames.contains(storeName)) {
    return [];
  }
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: T[]) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // 2500ms safety timeout for mobile WebKit / low-memory background tabs
    const timer = setTimeout(() => finish([]), 2500);

    try {
      const tx = db.transaction(storeName, "readonly");
      tx.onabort = () => {
        clearTimeout(timer);
        finish([]);
      };
      tx.onerror = () => {
        clearTimeout(timer);
        finish([]);
      };

      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        clearTimeout(timer);
        finish(req.result || []);
      };
      req.onerror = () => {
        clearTimeout(timer);
        finish([]);
      };
    } catch {
      clearTimeout(timer);
      finish([]);
    }
  });
}

/**
 * Format raw byte size into human readable string (e.g. 1.2 MB).
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[Math.min(i, units.length - 1)];
  const rawValue = bytes / Math.pow(1024, i);
  const rounded = Math.round(rawValue * 10) / 10;
  return `${rounded} ${unit}`;
}

/**
 * Estimate size of JSON content.
 */
export function estimateJsonSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 1024;
  }
}

/**
 * Save Surah content (chapter metadata + verses) for offline reading.
 */
export async function saveOfflineSurahContent(
  surah: number,
  chapter: Chapter,
  verses: ApiVerse[]
): Promise<void> {
  const db = await openOfflineDb();
  const sizeBytes = estimateJsonSize({ chapter, verses });
  const record: OfflineSurahContent = {
    surah,
    chapter,
    verses,
    downloadedAt: Date.now(),
    sizeBytes,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTENT, "readwrite");
    const store = tx.objectStore(STORES.CONTENT);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get offline Surah content if downloaded.
 */
export async function getOfflineSurahContent(
  surah: number
): Promise<{ chapter: Chapter; verses: ApiVerse[]; sizeBytes?: number } | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.CONTENT, "readonly");
      const store = tx.objectStore(STORES.CONTENT);
      const req = store.get(surah);
      req.onsuccess = () => {
        const result = req.result as OfflineSurahContent | undefined;
        if (result && Array.isArray(result.verses) && result.chapter) {
          resolve({ chapter: result.chapter, verses: result.verses, sizeBytes: result.sizeBytes || 0 });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save Surah audio files (verse-by-verse and optional full audio) for a reciter.
 */
export async function saveOfflineSurahAudio(
  surah: number,
  reciterId: number,
  reciterName: string,
  files: OfflineVerseAudioRecord[],
  fullAudioBlob?: Blob
): Promise<void> {
  const db = await openOfflineDb();
  let totalBytes = files.reduce((acc, f) => acc + (f.blob ? f.blob.size : 0), 0);
  if (fullAudioBlob) {
    totalBytes += fullAudioBlob.size;
  }

  const record: OfflineSurahAudio = {
    id: `${surah}_${reciterId}`,
    surah,
    reciterId,
    reciterName,
    files,
    fullAudioBlob,
    downloadedAt: Date.now(),
    totalBytes,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUDIO, "readwrite");
    const store = tx.objectStore(STORES.AUDIO);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve offline Surah audio with usable blob URLs.
 */
export async function getOfflineSurahAudio(
  surah: number,
  reciterId?: number
): Promise<{
  files: Array<{ verseKey: string; audioUrl: string }>;
  fullAudioUrl?: string;
  totalBytes: number;
  reciterId?: number;
} | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO, "readonly");
      const store = tx.objectStore(STORES.AUDIO);

      const candidateKeys: string[] = [];
      if (reciterId) {
        candidateKeys.push(`${surah}_${reciterId}`);
        const mapped = mapLegacyReciterId(reciterId);
        if (mapped !== reciterId) candidateKeys.push(`${surah}_${mapped}`);
        if (reciterId === 123) candidateKeys.push(`${surah}_1`);
        if (reciterId === 1) candidateKeys.push(`${surah}_123`);
      }

      const mapAudioRecord = (result: OfflineSurahAudio) => {
        const mappedFiles = (result.files || []).map((f) => {
          const safeBlob = f.blob && f.blob.type && f.blob.type.startsWith("audio/")
            ? f.blob
            : new Blob([f.blob], { type: "audio/mpeg" });
          return {
            verseKey: f.verseKey,
            audioUrl: URL.createObjectURL(safeBlob),
          };
        });

        let fullAudioUrl: string | undefined;
        if (result.fullAudioBlob) {
          const safeBlob = result.fullAudioBlob.type && result.fullAudioBlob.type.startsWith("audio/")
            ? result.fullAudioBlob
            : new Blob([result.fullAudioBlob], { type: "audio/mpeg" });
          fullAudioUrl = URL.createObjectURL(safeBlob);
        }

        return {
          files: mappedFiles,
          fullAudioUrl,
          totalBytes: result.totalBytes || 0,
          reciterId: result.reciterId,
        };
      };

      const tryNextKey = (index: number) => {
        if (index < candidateKeys.length) {
          const req = store.get(candidateKeys[index]);
          req.onsuccess = () => {
            const result = req.result as OfflineSurahAudio | undefined;
            if (result && Array.isArray(result.files) && result.files.length > 0) {
              resolve(mapAudioRecord(result));
            } else {
              tryNextKey(index + 1);
            }
          };
          req.onerror = () => tryNextKey(index + 1);
        } else {
          // Fallback: scan for any saved audio for this surah
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const all = allReq.result as OfflineSurahAudio[] | undefined;
            const match = all?.find((item) => item.surah === surah && item.files?.length);
            if (match) {
              resolve(mapAudioRecord(match));
            } else {
              resolve(null);
            }
          };
          allReq.onerror = () => resolve(null);
        }
      };

      tryNextKey(0);
    });
  } catch {
    return null;
  }
}

/**
 * Delete offline content for a Surah.
 */
export async function deleteOfflineSurahContent(surah: number): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONTENT, "readwrite");
      const store = tx.objectStore(STORES.CONTENT);
      const req = store.delete(surah);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Delete offline audio for a Surah and reciter.
 */
export async function deleteOfflineSurahAudio(surah: number, reciterId: number): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO, "readwrite");
      const store = tx.objectStore(STORES.AUDIO);
      const req = store.delete(`${surah}_${reciterId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * List all downloaded Surahs and summary of used storage across all offline stores
 * (text content, verse audio, full listen audio, and Madani Mushaf pages).
 */
export async function listOfflineDownloads(): Promise<OfflineDownloadSummary[]> {
  try {
    const db = await openOfflineDb();

    // Fetch records in parallel safely without throwing if any store is missing or delayed
    const [contents, audios, fullAudios, mushafPages] = await Promise.all([
      getAllFromStore<OfflineSurahContent>(db, STORES.CONTENT),
      getAllFromStore<OfflineSurahAudio>(db, STORES.AUDIO),
      getAllFromStore<OfflineFullAudio>(db, STORES.FULL_AUDIO),
      getAllFromStore<OfflineMushafPage>(db, STORES.MUSHAF),
    ]);

    const map = new Map<number, OfflineDownloadSummary>();

    // Merge Text Contents
    for (const c of contents) {
      const meta = getSurahMeta(c.surah);
      map.set(c.surah, {
        surah: c.surah,
        surahName: c.chapter?.nameSimple || meta?.name_simple || `Surah ${c.surah}`,
        surahNameArabic: c.chapter?.nameArabic || meta?.name_arabic || "",
        versesCount: c.chapter?.versesCount || meta?.verses_count || c.verses?.length || 0,
        hasText: true,
        hasAudio: false,
        hasMushaf: false,
        totalBytes: c.sizeBytes || 0,
        downloadedAt: c.downloadedAt,
      });
    }

    // Merge Verse Audios
    for (const a of audios) {
      const meta = getSurahMeta(a.surah);
      const existing = map.get(a.surah);
      if (existing) {
        existing.hasAudio = true;
        existing.reciterId = existing.reciterId || a.reciterId;
        existing.reciterName = existing.reciterName || a.reciterName;
        existing.totalBytes += (a.totalBytes || 0);
        existing.downloadedAt = Math.max(existing.downloadedAt, a.downloadedAt);
      } else {
        map.set(a.surah, {
          surah: a.surah,
          surahName: meta?.name_simple || `Surah ${a.surah}`,
          surahNameArabic: meta?.name_arabic || "",
          versesCount: meta?.verses_count || a.files?.length || 0,
          hasText: false,
          hasAudio: true,
          hasMushaf: false,
          reciterId: a.reciterId,
          reciterName: a.reciterName,
          totalBytes: a.totalBytes || 0,
          downloadedAt: a.downloadedAt,
        });
      }
    }

    // Merge Full Listen Audios
    for (const fa of fullAudios) {
      const meta = getSurahMeta(fa.surah);
      const existing = map.get(fa.surah);
      if (existing) {
        existing.hasAudio = true;
        existing.reciterId = existing.reciterId || fa.reciterId;
        existing.reciterName = existing.reciterName || fa.reciterName;
        existing.totalBytes += (fa.sizeBytes || 0);
        existing.downloadedAt = Math.max(existing.downloadedAt, fa.downloadedAt);
      } else {
        map.set(fa.surah, {
          surah: fa.surah,
          surahName: meta?.name_simple || `Surah ${fa.surah}`,
          surahNameArabic: meta?.name_arabic || "",
          versesCount: meta?.verses_count || 0,
          hasText: false,
          hasAudio: true,
          hasMushaf: false,
          reciterId: fa.reciterId,
          reciterName: fa.reciterName,
          totalBytes: fa.sizeBytes || 0,
          downloadedAt: fa.downloadedAt,
        });
      }
    }

    // Merge Mushaf Pages (group by Surah)
    for (const p of mushafPages) {
      const surahsForPage: number[] = p.data?.surahs?.length
        ? p.data.surahs.map((s) => s.id)
        : SURAHS_META.filter((sm) => p.page_number >= sm.start_page && p.page_number <= sm.end_page).map((sm) => sm.id);

      const targetSurahs = surahsForPage.length > 0 ? surahsForPage : [1];
      const pageShareBytes = Math.round((p.sizeBytes || 0) / targetSurahs.length);

      for (const surahId of targetSurahs) {
        const meta = getSurahMeta(surahId);
        const existing = map.get(surahId);
        if (existing) {
          existing.hasMushaf = true;
          if (!existing.mushafPages) existing.mushafPages = [];
          if (!existing.mushafPages.includes(p.page_number)) {
            existing.mushafPages.push(p.page_number);
            existing.mushafPages.sort((a, b) => a - b);
          }
          existing.totalBytes += pageShareBytes;
          existing.downloadedAt = Math.max(existing.downloadedAt, p.downloadedAt);
        } else {
          map.set(surahId, {
            surah: surahId,
            surahName: meta?.name_simple || `Surah ${surahId}`,
            surahNameArabic: meta?.name_arabic || "",
            versesCount: meta?.verses_count || 0,
            hasText: false,
            hasAudio: false,
            hasMushaf: true,
            mushafPages: [p.page_number],
            totalBytes: pageShareBytes,
            downloadedAt: p.downloadedAt,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.surah - b.surah);
  } catch {
    return [];
  }
}

/**
 * Delete all offline content for a Surah across text, audio, and full audio.
 */
export async function deleteOfflineSurah(surah: number, reciterId?: number): Promise<void> {
  await deleteOfflineSurahContent(surah);
  if (reciterId) {
    await deleteOfflineSurahAudio(surah, reciterId);
    await deleteOfflineFullAudio(surah, reciterId);
  } else {
    // Delete all reciter audio for this surah
    try {
      const db = await openOfflineDb();
      const deleteKeysStartingWith = async (storeName: string) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result as string[];
          for (const k of keys) {
            if (typeof k === "string" && (k === String(surah) || k.startsWith(`${surah}_`))) {
              store.delete(k);
            }
          }
        };
      };
      await deleteKeysStartingWith(STORES.AUDIO);
      await deleteKeysStartingWith(STORES.FULL_AUDIO);
    } catch {}
  }
}

/**
 * Wipe all offline downloads (text, audio, mushaf, full audio).
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORES.CONTENT, STORES.AUDIO, STORES.MUSHAF, STORES.FULL_AUDIO],
        "readwrite"
      );
      tx.objectStore(STORES.CONTENT).clear();
      tx.objectStore(STORES.AUDIO).clear();
      tx.objectStore(STORES.MUSHAF).clear();
      tx.objectStore(STORES.FULL_AUDIO).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/**
 * Save Mushaf page data for offline reading.
 */
export async function saveOfflineMushafPage(pageData: MushafPageData): Promise<void> {
  const db = await openOfflineDb();
  const sizeBytes = estimateJsonSize(pageData);
  const record: OfflineMushafPage = {
    page_number: pageData.page_number,
    data: pageData,
    downloadedAt: Date.now(),
    sizeBytes,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUSHAF, "readwrite");
    const store = tx.objectStore(STORES.MUSHAF);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve offline Mushaf page.
 */
export async function getOfflineMushafPage(pageNumber: number): Promise<MushafPageData | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.MUSHAF, "readonly");
      const store = tx.objectStore(STORES.MUSHAF);
      const req = store.get(pageNumber);
      req.onsuccess = () => {
        const result = req.result as OfflineMushafPage | undefined;
        resolve(result?.data || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if a Mushaf page is downloaded.
 */
export async function hasOfflineMushafPage(pageNumber: number): Promise<boolean> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.MUSHAF, "readonly");
      const store = tx.objectStore(STORES.MUSHAF);
      const req = store.count(pageNumber);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * List all downloaded Mushaf page numbers.
 */
export async function listOfflineMushafPages(): Promise<number[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.MUSHAF, "readonly");
      const store = tx.objectStore(STORES.MUSHAF);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as number[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a downloaded Mushaf page.
 */
export async function deleteOfflineMushafPage(pageNumber: number): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MUSHAF, "readwrite");
      const store = tx.objectStore(STORES.MUSHAF);
      const req = store.delete(pageNumber);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Save full Surah audio MP3 blob (used by Listen player).
 */
export async function saveOfflineFullAudio(
  surah: number,
  reciterId: number,
  reciterName: string,
  blob: Blob
): Promise<void> {
  const db = await openOfflineDb();
  // Ensure blob always has valid audio/mpeg MIME type for reliable HTML5 playback
  const safeBlob = blob.type && blob.type.startsWith("audio/")
    ? blob
    : new Blob([blob], { type: "audio/mpeg" });

  const record: OfflineFullAudio = {
    id: `${surah}_${reciterId}`,
    surah,
    reciterId,
    reciterName,
    blob: safeBlob,
    mimeType: safeBlob.type,
    downloadedAt: Date.now(),
    sizeBytes: safeBlob.size,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FULL_AUDIO, "readwrite");
    const store = tx.objectStore(STORES.FULL_AUDIO);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve full Surah audio blob as a blob URL.
 * Automatically tries direct ID, mapped legacy IDs, and falls back to any downloaded recitation for this Surah.
 */
export async function getOfflineFullAudio(
  surah: number,
  reciterId?: number
): Promise<{ audioUrl: string; sizeBytes: number; reciterName: string; reciterId: number } | null> {
  try {
    const db = await openOfflineDb();

    const mapResult = (result: OfflineFullAudio) => {
      const rawBlob = result.blob;
      const safeBlob = rawBlob.type && rawBlob.type.startsWith("audio/")
        ? rawBlob
        : new Blob([rawBlob], { type: "audio/mpeg" });

      return {
        audioUrl: URL.createObjectURL(safeBlob),
        sizeBytes: result.sizeBytes || safeBlob.size,
        reciterName: result.reciterName || "Offline Reciter",
        reciterId: result.reciterId || reciterId || 123,
      };
    };

    const checkStoreAudio = (): Promise<{ audioUrl: string; sizeBytes: number; reciterName: string; reciterId: number } | null> => {
      if (!db.objectStoreNames.contains(STORES.AUDIO)) {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        try {
          const audioTx = db.transaction(STORES.AUDIO, "readonly");
          const audioStore = audioTx.objectStore(STORES.AUDIO);
          const audioReq = audioStore.getAll();
          audioReq.onsuccess = () => {
            const audios = audioReq.result as OfflineSurahAudio[] | undefined;
            const match = audios?.find((item) => item.surah === surah);
            if (!match) return resolve(null);

            // If match has fullAudioBlob:
            if (match.fullAudioBlob) {
              const safeBlob = match.fullAudioBlob.type && match.fullAudioBlob.type.startsWith("audio/")
                ? match.fullAudioBlob
                : new Blob([match.fullAudioBlob], { type: "audio/mpeg" });
              return resolve({
                audioUrl: URL.createObjectURL(safeBlob),
                sizeBytes: safeBlob.size,
                reciterName: match.reciterName || "Offline Reciter",
                reciterId: match.reciterId || reciterId || 1,
              });
            }

            // If match has verse files, combine them into single continuous audio:
            if (Array.isArray(match.files) && match.files.length > 0) {
              const blobs = match.files.map((f) => f.blob).filter(Boolean);
              if (blobs.length > 0) {
                const combined = new Blob(blobs, { type: "audio/mpeg" });
                return resolve({
                  audioUrl: URL.createObjectURL(combined),
                  sizeBytes: combined.size,
                  reciterName: match.reciterName || "Offline Reciter",
                  reciterId: match.reciterId || reciterId || 1,
                });
              }
            }

            resolve(null);
          };
          audioReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    };

    // 1. Try STORES.FULL_AUDIO first
    if (db.objectStoreNames.contains(STORES.FULL_AUDIO)) {
      const fullResult = await new Promise<{ audioUrl: string; sizeBytes: number; reciterName: string; reciterId: number } | null>((resolve) => {
        try {
          const tx = db.transaction(STORES.FULL_AUDIO, "readonly");
          const store = tx.objectStore(STORES.FULL_AUDIO);

          const candidateKeys: string[] = [];
          if (reciterId) {
            candidateKeys.push(`${surah}_${reciterId}`);
            const mapped = mapLegacyReciterId(reciterId);
            if (mapped !== reciterId) candidateKeys.push(`${surah}_${mapped}`);
            if (reciterId === 123) candidateKeys.push(`${surah}_1`);
            if (reciterId === 1) candidateKeys.push(`${surah}_123`);
          }

          const tryNextKey = (index: number) => {
            if (index < candidateKeys.length) {
              const req = store.get(candidateKeys[index]);
              req.onsuccess = () => {
                const result = req.result as OfflineFullAudio | undefined;
                if (result && result.blob) {
                  resolve(mapResult(result));
                } else {
                  tryNextKey(index + 1);
                }
              };
              req.onerror = () => tryNextKey(index + 1);
            } else {
              // If no candidate key matched, scan for ANY saved audio for this Surah
              const allReq = store.getAll();
              allReq.onsuccess = () => {
                const all = allReq.result as OfflineFullAudio[] | undefined;
                const match = all?.find((item) => item.surah === surah && item.blob);
                if (match) {
                  resolve(mapResult(match));
                } else {
                  resolve(null);
                }
              };
              allReq.onerror = () => resolve(null);
            }
          };

          tryNextKey(0);
        } catch {
          resolve(null);
        }
      });

      if (fullResult) return fullResult;
    }

    // 2. Fallback to STORES.AUDIO if not in STORES.FULL_AUDIO
    return await checkStoreAudio();
  } catch {
    return null;
  }
}

/**
 * Check if full Surah audio is downloaded.
 */
export async function hasOfflineFullAudio(surah: number, reciterId?: number): Promise<boolean> {
  try {
    const res = await getOfflineFullAudio(surah, reciterId);
    return Boolean(res);
  } catch {
    return false;
  }
}

/**
 * Delete full Surah audio.
 */
export async function deleteOfflineFullAudio(surah: number, reciterId: number): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FULL_AUDIO, "readwrite");
      const store = tx.objectStore(STORES.FULL_AUDIO);
      const req = store.delete(`${surah}_${reciterId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Detailed breakdown of device storage used by Aayah Studio offline stores.
 */
export async function getStorageUsageSummary(): Promise<{
  totalBytes: number;
  textBytes: number;
  audioBytes: number;
  mushafBytes: number;
  surahsCount: number;
  mushafPagesCount: number;
  availableBytes?: number;
}> {
  try {
    const db = await openOfflineDb();

    const [contents, audios, fullAudios, mushafPages, adhkarAudios] = await Promise.all([
      getAllFromStore<OfflineSurahContent>(db, STORES.CONTENT),
      getAllFromStore<OfflineSurahAudio>(db, STORES.AUDIO),
      getAllFromStore<OfflineFullAudio>(db, STORES.FULL_AUDIO),
      getAllFromStore<OfflineMushafPage>(db, STORES.MUSHAF),
      getAllFromStore<OfflineAdhkarAudioRecord>(db, STORES.ADHKAR_AUDIO),
    ]);

    const textBytes = contents.reduce((acc, c) => acc + (c.sizeBytes || 0), 0);
    let audioBytes = audios.reduce((acc, a) => acc + (a.totalBytes || 0), 0);
    audioBytes += fullAudios.reduce((acc, fa) => acc + (fa.sizeBytes || 0), 0);
    const mushafBytes = mushafPages.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    const adhkarAudioBytes = adhkarAudios.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);

    let availableBytes: number | undefined;
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.quota && est.usage) {
          availableBytes = Math.max(0, est.quota - est.usage);
        }
      } catch {}
    }

    return {
      totalBytes: textBytes + audioBytes + mushafBytes + adhkarAudioBytes,
      textBytes,
      audioBytes: audioBytes + adhkarAudioBytes,
      mushafBytes,
      surahsCount: contents.length,
      mushafPagesCount: mushafPages.length,
      availableBytes,
    };
  } catch {
    return {
      totalBytes: 0,
      textBytes: 0,
      audioBytes: 0,
      mushafBytes: 0,
      surahsCount: 0,
      mushafPagesCount: 0,
    };
  }
}

/**
 * Save all adhkar data locally into IndexedDB for offline use.
 */
export async function saveOfflineAdhkar(adhkarItems: any[]): Promise<number> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.ADHKAR, "readwrite");
      const store = tx.objectStore(STORES.ADHKAR);
      const jsonStr = JSON.stringify(adhkarItems);
      const sizeBytes = new Blob([jsonStr]).size;
      const record = {
        id: "all_adhkar",
        items: adhkarItems,
        downloadedAt: Date.now(),
        sizeBytes,
        count: adhkarItems.length,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(sizeBytes);
      req.onerror = () => reject(req.error || new Error("Failed to save adhkar"));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Check if Adhkar data is cached offline in IndexedDB.
 */
export async function isAdhkarOffline(): Promise<boolean> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ADHKAR, "readonly");
      const store = tx.objectStore(STORES.ADHKAR);
      const req = store.get("all_adhkar");
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get offline cached Adhkar items.
 */
export async function getOfflineAdhkar(): Promise<any[] | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ADHKAR, "readonly");
      const store = tx.objectStore(STORES.ADHKAR);
      const req = store.get("all_adhkar");
      req.onsuccess = () => resolve(req.result ? req.result.items : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove cached Adhkar from IndexedDB.
 */
export async function deleteOfflineAdhkar(): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.ADHKAR, "readwrite");
      const store = tx.objectStore(STORES.ADHKAR);
      const req = store.delete("all_adhkar");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Save offline Adhkar audio records into IndexedDB.
 */
export async function saveOfflineAdhkarAudio(
  records: OfflineAdhkarAudioRecord[]
): Promise<number> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains(STORES.ADHKAR_AUDIO)) {
        resolve(0);
        return;
      }
      const tx = db.transaction(STORES.ADHKAR_AUDIO, "readwrite");
      const store = tx.objectStore(STORES.ADHKAR_AUDIO);
      let totalBytes = 0;
      for (const rec of records) {
        store.put(rec);
        totalBytes += rec.sizeBytes;
      }
      tx.oncomplete = () => resolve(totalBytes);
      tx.onerror = () => reject(tx.error || new Error("Failed to save adhkar audio"));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Get an offline cached audio blob by URL.
 */
export async function getOfflineAdhkarAudioBlob(url: string): Promise<Blob | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(STORES.ADHKAR_AUDIO)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORES.ADHKAR_AUDIO, "readonly");
      const store = tx.objectStore(STORES.ADHKAR_AUDIO);
      const req = store.get(url);
      req.onsuccess = () => {
        const result = req.result as OfflineAdhkarAudioRecord | undefined;
        resolve(result?.blob || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if audio for a specific category has been downloaded offline.
 */
export async function isAdhkarCategoryAudioOffline(category: string): Promise<boolean> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(STORES.ADHKAR_AUDIO)) {
        resolve(false);
        return;
      }
      const tx = db.transaction(STORES.ADHKAR_AUDIO, "readonly");
      const store = tx.objectStore(STORES.ADHKAR_AUDIO);
      const index = store.index("by_category");
      const req = index.count(IDBKeyRange.only(category));
      req.onsuccess = () => resolve((req.result || 0) > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Delete all offline audio files belonging to a specific category.
 */
export async function deleteOfflineAdhkarCategoryAudio(category: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORES.ADHKAR_AUDIO)) {
        resolve();
        return;
      }
      const tx = db.transaction(STORES.ADHKAR_AUDIO, "readwrite");
      const store = tx.objectStore(STORES.ADHKAR_AUDIO);
      const index = store.index("by_category");
      const req = index.openCursor(IDBKeyRange.only(category));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}
}
