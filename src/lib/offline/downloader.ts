import type { Chapter, ApiVerse } from "@/lib/quran/server";
import { DEFAULT_TR1, type SurahAudio } from "@/lib/quran/types";
import {
  saveOfflineSurahContent,
  saveOfflineSurahAudio,
  type OfflineVerseAudioRecord,
} from "./db";

export interface DownloadProgress {
  stage: "idle" | "text" | "audio" | "complete" | "error";
  percent: number; // 0 to 100
  completedAyahs: number;
  totalAyahs: number;
  error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Downloads a complete Surah (text + recitation audio for the given reciter)
 * and stores it into IndexedDB for offline reading, listening, and revision.
 */
export async function downloadSurahPackage(params: {
  surah: number;
  chapter: Chapter;
  reciterId: number;
  reciterName: string;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}): Promise<void> {
  const { surah, chapter, reciterId, reciterName, onProgress, signal } = params;

  try {
    // Stage 1: Download Text & Translations
    onProgress?.({
      stage: "text",
      percent: 10,
      completedAyahs: 0,
      totalAyahs: chapter.versesCount,
    });

    const versesRes = await fetch(
      `/api/quran/verses?surah=${surah}&translations=${DEFAULT_TR1}`,
      { signal }
    );
    if (!versesRes.ok) {
      throw new Error(`Failed to download verses for Surah ${surah}`);
    }
    const versesData = await versesRes.json();
    const verses: ApiVerse[] = Array.isArray(versesData?.verses) ? versesData.verses : [];
    if (verses.length === 0) {
      throw new Error("No verse data returned for Surah");
    }

    // Save text to IndexedDB
    await saveOfflineSurahContent(surah, chapter, verses);

    // Also cache page HTML in CacheStorage if supported
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await window.caches.open("ayah-studio-v1");
        const pageUrl = `/quran/${surah}`;
        const pageRes = await fetch(pageUrl, { signal });
        if (pageRes.ok) {
          await cache.put(pageUrl, pageRes);
        }
      } catch {}
    }

    // Stage 2: Download Audio Metadata
    onProgress?.({
      stage: "audio",
      percent: 25,
      completedAyahs: 0,
      totalAyahs: chapter.versesCount,
    });

    const audioMetaRes = await fetch(
      `/api/quran/audio?surah=${surah}&reciter=${reciterId}`,
      { signal }
    );
    if (!audioMetaRes.ok) {
      throw new Error("Failed to load recitation audio metadata");
    }
    const audioData: SurahAudio = await audioMetaRes.json();
    const files = Array.isArray(audioData?.files) ? audioData.files : [];
    if (files.length === 0) {
      throw new Error("No recitation audio files found for this reciter");
    }

    // Stage 3: Download Verse Audio Blobs with concurrency limit (3 at a time)
    const audioRecords: OfflineVerseAudioRecord[] = [];
    let completedCount = 0;
    const totalCount = files.length;

    // Optional: Also fetch full surah audio if available
    let fullAudioBlob: Blob | undefined;
    if (typeof audioData.audioUrl === "string" && audioData.audioUrl.startsWith("http")) {
      fetch(audioData.audioUrl, { signal })
        .then((r) => (r.ok ? r.blob() : undefined))
        .then((b) => {
          if (b) fullAudioBlob = b;
        })
        .catch(() => {});
    }

    // Download in chunks of 3
    const CHUNK_SIZE = 3;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      if (signal?.aborted) {
        throw new Error("Download aborted");
      }

      const chunk = files.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (file) => {
          if (!file.audioUrl) return null;
          try {
            const res = await fetch(file.audioUrl, { signal });
            if (!res.ok) return null;
            const blob = await res.blob();
            return {
              verseKey: file.verseKey,
              blob,
              mimeType: blob.type || "audio/mpeg",
            };
          } catch {
            return null;
          }
        })
      );

      for (const rec of results) {
        if (rec) {
          audioRecords.push(rec);
        }
      }

      completedCount += chunk.length;
      const progressPercent = Math.min(
        95,
        Math.round(25 + (completedCount / totalCount) * 70)
      );

      onProgress?.({
        stage: "audio",
        percent: progressPercent,
        completedAyahs: Math.min(completedCount, totalCount),
        totalAyahs: totalCount,
      });
    }

    // Save audio files to IndexedDB
    await saveOfflineSurahAudio(
      surah,
      reciterId,
      reciterName,
      audioRecords,
      fullAudioBlob
    );

    onProgress?.({
      stage: "complete",
      percent: 100,
      completedAyahs: totalCount,
      totalAyahs: totalCount,
    });
  } catch (err: any) {
    if (signal?.aborted) return;
    onProgress?.({
      stage: "error",
      percent: 0,
      completedAyahs: 0,
      totalAyahs: chapter.versesCount,
      error: err?.message || "Failed to download offline package",
    });
    throw err;
  }
}

/**
 * Downloads full Surah audio (MP3 stream) directly into IndexedDB for the Listen page.
 */
export async function downloadFullSurahAudio(params: {
  surah: number;
  reciterId: number;
  reciterName: string;
  audioUrl: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { surah, reciterId, reciterName, audioUrl, onProgress, signal } = params;

  onProgress?.(5);
  const res = await fetch(audioUrl, { signal });
  if (!res.ok) {
    throw new Error(`Failed to download audio file (${res.status})`);
  }

  const contentLength = Number(res.headers.get("content-length"));
  let blob: Blob;

  if (contentLength && res.body) {
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    while (true) {
      if (signal?.aborted) throw new Error("Download aborted");
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        const pct = Math.min(95, Math.round((received / contentLength) * 90) + 5);
        onProgress?.(pct);
      }
    }
    blob = new Blob(chunks, { type: "audio/mpeg" });
  } else {
    onProgress?.(50);
    blob = await res.blob();
  }

  const { saveOfflineFullAudio } = await import("./db");
  await saveOfflineFullAudio(surah, reciterId, reciterName, blob);
  onProgress?.(100);
}

/**
 * Downloads a single Mushaf page (JSON + Font) for offline reading.
 */
export async function downloadMushafPage(pageNumber: number, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`/api/quran/mushaf?page=${pageNumber}`, { signal });
  if (!res.ok) throw new Error(`Failed to download Mushaf page ${pageNumber}`);
  const data = await res.json();

  const { saveOfflineMushafPage } = await import("./db");
  await saveOfflineMushafPage(data);

  // Pre-cache page font into CacheStorage if supported
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cache = await window.caches.open("ayah-studio-v1");
      const fontUrl = `https://verses.quran.com/fonts/quran/hafs/v2/woff2/p${pageNumber}.woff2`;
      const fontRes = await fetch(fontUrl, { signal });
      if (fontRes.ok) {
        await cache.put(fontUrl, fontRes);
      }
    } catch {}
  }
}

/**
 * Downloads a range of Mushaf pages (e.g. a Surah or a Juz).
 */
export async function downloadMushafRange(
  startPage: number,
  endPage: number,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const start = Math.max(1, startPage);
  const end = Math.min(604, endPage);
  const total = end - start + 1;
  let done = 0;

  const BATCH_SIZE = 4;
  for (let i = start; i <= end; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error("Download aborted");
    const batch = [];
    for (let j = i; j < Math.min(end + 1, i + BATCH_SIZE); j++) {
      batch.push(downloadMushafPage(j, signal).then(() => {
        done++;
        onProgress?.(done, total);
      }));
    }
    await Promise.all(batch);
  }
}

/**
 * Downloads all 114 Surahs' texts (Arabic + translation) in parallel batches (~4.5MB total).
 */
export async function downloadCompleteQuranText(
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const chaptersRes = await fetch("/api/quran/chapters", { signal });
  if (!chaptersRes.ok) throw new Error("Failed to load chapters list");
  const chaptersData = await chaptersRes.json();
  const chapters: Chapter[] = chaptersData.chapters || [];

  const { saveOfflineSurahContent } = await import("./db");
  let done = 0;
  const total = chapters.length;

  const BATCH_SIZE = 5;
  for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error("Download aborted");
    const batch = chapters.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (c) => {
        try {
          const res = await fetch(`/api/quran/verses?surah=${c.id}&translations=${DEFAULT_TR1}`, { signal });
          if (res.ok) {
            const data = await res.json();
            const verses = Array.isArray(data?.verses) ? data.verses : [];
            await saveOfflineSurahContent(c.id, c, verses);
          }
        } catch {}
        done++;
        onProgress?.(done, total);
      })
    );
  }
}
