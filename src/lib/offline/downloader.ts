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
