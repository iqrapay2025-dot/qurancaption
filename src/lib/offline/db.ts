import type { Chapter, ApiVerse } from "@/lib/quran/server";

export const DB_NAME = "ayah_studio_offline_v1";
export const DB_VERSION = 1;

export const STORES = {
  CONTENT: "surah_content",
  AUDIO: "surah_audio",
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

export interface OfflineDownloadSummary {
  surah: number;
  surahName: string;
  surahNameArabic: string;
  versesCount: number;
  hasText: boolean;
  hasAudio: boolean;
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open offline database"));
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
): Promise<{ chapter: Chapter; verses: ApiVerse[] } | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.CONTENT, "readonly");
      const store = tx.objectStore(STORES.CONTENT);
      const req = store.get(surah);
      req.onsuccess = () => {
        const result = req.result as OfflineSurahContent | undefined;
        if (result && Array.isArray(result.verses) && result.chapter) {
          resolve({ chapter: result.chapter, verses: result.verses });
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
  reciterId: number
): Promise<{
  files: Array<{ verseKey: string; audioUrl: string }>;
  fullAudioUrl?: string;
  totalBytes: number;
} | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO, "readonly");
      const store = tx.objectStore(STORES.AUDIO);
      const req = store.get(`${surah}_${reciterId}`);
      req.onsuccess = () => {
        const result = req.result as OfflineSurahAudio | undefined;
        if (result && Array.isArray(result.files) && result.files.length > 0) {
          const mappedFiles = result.files.map((f) => ({
            verseKey: f.verseKey,
            audioUrl: URL.createObjectURL(f.blob),
          }));
          const fullAudioUrl = result.fullAudioBlob
            ? URL.createObjectURL(result.fullAudioBlob)
            : undefined;

          resolve({
            files: mappedFiles,
            fullAudioUrl,
            totalBytes: result.totalBytes,
          });
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
 * List all downloaded Surahs and summary of used storage.
 */
export async function listOfflineDownloads(): Promise<OfflineDownloadSummary[]> {
  try {
    const db = await openOfflineDb();

    // Fetch all content
    const contents: OfflineSurahContent[] = await new Promise((resolve) => {
      const tx = db.transaction(STORES.CONTENT, "readonly");
      const store = tx.objectStore(STORES.CONTENT);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    // Fetch all audio
    const audios: OfflineSurahAudio[] = await new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO, "readonly");
      const store = tx.objectStore(STORES.AUDIO);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const map = new Map<number, OfflineDownloadSummary>();

    for (const c of contents) {
      map.set(c.surah, {
        surah: c.surah,
        surahName: c.chapter?.nameSimple || `Surah ${c.surah}`,
        surahNameArabic: c.chapter?.nameArabic || "",
        versesCount: c.chapter?.versesCount || c.verses?.length || 0,
        hasText: true,
        hasAudio: false,
        totalBytes: c.sizeBytes || 0,
        downloadedAt: c.downloadedAt,
      });
    }

    for (const a of audios) {
      const existing = map.get(a.surah);
      if (existing) {
        existing.hasAudio = true;
        existing.reciterId = a.reciterId;
        existing.reciterName = a.reciterName;
        existing.totalBytes += a.totalBytes;
        existing.downloadedAt = Math.max(existing.downloadedAt, a.downloadedAt);
      } else {
        map.set(a.surah, {
          surah: a.surah,
          surahName: `Surah ${a.surah}`,
          surahNameArabic: "",
          versesCount: a.files?.length || 0,
          hasText: false,
          hasAudio: true,
          reciterId: a.reciterId,
          reciterName: a.reciterName,
          totalBytes: a.totalBytes,
          downloadedAt: a.downloadedAt,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.surah - b.surah);
  } catch {
    return [];
  }
}

/**
 * Wipe all offline downloads (text and audio).
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.CONTENT, STORES.AUDIO], "readwrite");
      tx.objectStore(STORES.CONTENT).clear();
      tx.objectStore(STORES.AUDIO).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
