import type { AyahFile } from "./types";

/**
 * Finds the index of the file corresponding to verseKey.
 * Returns null if the list is empty or the key is not found.
 */
export function findStartIndex(files: AyahFile[], verseKey: string): number | null {
  if (!files || files.length === 0) return null;
  const idx = files.findIndex((f) => f.verseKey === verseKey);
  return idx >= 0 ? idx : null;
}

/**
 * Returns the next audio file after verseKey in the files array.
 * Returns null if verseKey is not found or is the last file.
 */
export function nextFile(files: AyahFile[], verseKey: string): AyahFile | null {
  if (!files || files.length === 0) return null;
  const idx = files.findIndex((f) => f.verseKey === verseKey);
  if (idx < 0 || idx >= files.length - 1) return null;
  return files[idx + 1];
}

/**
 * Returns the previous audio file before verseKey in the files array.
 * Returns null if verseKey is not found or is the first file.
 */
export function prevFile(files: AyahFile[], verseKey: string): AyahFile | null {
  if (!files || files.length === 0) return null;
  const idx = files.findIndex((f) => f.verseKey === verseKey);
  if (idx <= 0) return null;
  return files[idx - 1];
}
