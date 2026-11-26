import type { AdhkarCategory, AdhkarItem } from "./types";
import {
  saveOfflineAdhkarAudio,
  getOfflineAdhkarAudioBlob,
  isAdhkarCategoryAudioOffline,
  deleteOfflineAdhkarCategoryAudio,
  type OfflineAdhkarAudioRecord,
} from "@/lib/offline/db";

/**
 * Pinned category audio size estimates based on OpenDua audio files.
 */
export const CATEGORY_AUDIO_SIZE_ESTIMATES: Record<
  AdhkarCategory,
  { bytes: number; formatted: string; count: number }
> = {
  morning: { bytes: 8382734, formatted: "8.0 MB", count: 19 },
  evening: { bytes: 7769298, formatted: "7.4 MB", count: 19 },
  "after-salah": { bytes: 3132104, formatted: "3.0 MB", count: 13 },
  sleep: { bytes: 3850000, formatted: "3.7 MB", count: 8 },
  waking: { bytes: 785736, formatted: "0.8 MB", count: 3 },
  general: { bytes: 5600000, formatted: "5.4 MB", count: 37 },
};

/**
 * Check if the user is on an unmetered / Wi-Fi connection without Data Saver.
 */
export function isUnmeteredConnection(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!conn) {
    // If Network Information API is not supported, assume allowed
    return true;
  }

  // Data Saver enabled
  if (conn.saveData === true) {
    return false;
  }

  // Metered or cellular connection
  if (conn.type === "cellular" || conn.type === "none") {
    return false;
  }

  // Slow effective types
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g" || conn.effectiveType === "3g") {
    return false;
  }

  return true;
}

/**
 * Cache of active object URLs created from offline blobs to prevent memory leaks.
 */
const objectUrlCache = new Map<string, string>();

/**
 * Resolve an audio URL: if cached in IndexedDB, returns a blob URL; otherwise returns the network URL.
 */
export async function resolveAudioUrl(url: string): Promise<string> {
  if (!url) return "";

  // If already in memory object cache
  if (objectUrlCache.has(url)) {
    return objectUrlCache.get(url)!;
  }

  try {
    const blob = await getOfflineAdhkarAudioBlob(url);
    if (blob) {
      const objUrl = URL.createObjectURL(blob);
      objectUrlCache.set(url, objUrl);
      return objUrl;
    }
  } catch {}

  return url;
}

/**
 * Clean up an object URL if created.
 */
export function revokeResolvedAudioUrl(url: string): void {
  const objUrl = objectUrlCache.get(url);
  if (objUrl) {
    try {
      URL.revokeObjectURL(objUrl);
    } catch {}
    objectUrlCache.delete(url);
  }
}

/**
 * Preload an audio URL in the background ONLY if on an unmetered connection.
 */
const preloadedUrls = new Set<string>();

export function preloadAudioIfUnmetered(url?: string): void {
  if (!url || typeof window === "undefined") return;
  if (preloadedUrls.has(url)) return;
  if (!isUnmeteredConnection()) return;

  preloadedUrls.add(url);
  try {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audio.load();
  } catch {}
}

/**
 * Download all audio files for an Adhkar category into IndexedDB for offline playback.
 */
export async function downloadCategoryAudio(
  category: AdhkarCategory,
  items: AdhkarItem[],
  onProgress?: (progress: { completed: number; total: number; percent: number }) => void,
  signal?: AbortSignal
): Promise<{ savedCount: number; totalBytes: number }> {
  // Collect all items with audioUrl
  const audioItems = items.filter((item) => Boolean(item.audioUrl));
  const total = audioItems.length;

  if (total === 0) {
    return { savedCount: 0, totalBytes: 0 };
  }

  const records: OfflineAdhkarAudioRecord[] = [];
  let completed = 0;
  let totalBytes = 0;

  for (const item of audioItems) {
    if (signal?.aborted) {
      throw new Error("Download aborted");
    }

    const url = item.audioUrl!;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch audio from ${url}`);
      }
      const blob = await res.blob();
      records.push({
        url,
        category,
        blob,
        mimeType: blob.type || "audio/mpeg",
        sizeBytes: blob.size,
        downloadedAt: Date.now(),
      });
      totalBytes += blob.size;
    } catch (err: any) {
      if (err?.name === "AbortError" || signal?.aborted) {
        throw new Error("Download aborted");
      }
      console.warn(`Could not download audio for dhikr #${item.id}:`, err);
    }

    completed++;
    onProgress?.({
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    });
  }

  if (records.length > 0) {
    await saveOfflineAdhkarAudio(records);
  }

  return { savedCount: records.length, totalBytes };
}

export {
  isAdhkarCategoryAudioOffline,
  deleteOfflineAdhkarCategoryAudio,
};
