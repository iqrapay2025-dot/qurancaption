export const LIBRARY_STORAGE_KEY = "ayah-library-v1";
export const MAX_BOOKMARKS = 500;
export const MAX_NOTE_LENGTH = 140;

export interface BookmarkItem {
  surah: number;
  ayah: number;
  verseKey: string; // e.g. "2:255"
  note?: string;
  createdAt: number;
}

export interface ContinueReading {
  surah: number;
  ayah: number;
  surahName?: string;
  page?: number;
  mode?: "verses" | "mushaf";
  timestamp: number;
}

export interface ContinueListening {
  surah: number;
  reciterId: number;
  time: number; // seconds
  surahName?: string;
  timestamp: number;
}

export interface LibraryState {
  version: 1;
  reading: ContinueReading | null;
  listening: ContinueListening | null;
  bookmarks: BookmarkItem[];
}

export function getDefaultLibraryState(): LibraryState {
  return {
    version: 1,
    reading: null,
    listening: null,
    bookmarks: [],
  };
}

/**
 * Validates and normalizes raw library state.
 * Any corrupt or invalid section is safely replaced with default without crashing.
 */
export function validateAndParseLibrary(raw: unknown): LibraryState {
  if (!raw) return getDefaultLibraryState();

  let data: any = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return getDefaultLibraryState();
    }
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return getDefaultLibraryState();
  }

  // Version check
  if (data.version !== 1) {
    return getDefaultLibraryState();
  }

  // Validate reading
  let reading: ContinueReading | null = null;
  if (data.reading && typeof data.reading === "object") {
    const s = Number(data.reading.surah);
    const a = Number(data.reading.ayah);
    if (Number.isInteger(s) && s >= 1 && s <= 114 && Number.isInteger(a) && a >= 1) {
      const p = Number(data.reading.page);
      reading = {
        surah: s,
        ayah: a,
        surahName: typeof data.reading.surahName === "string" ? data.reading.surahName : undefined,
        page: Number.isInteger(p) && p >= 1 && p <= 604 ? p : undefined,
        mode: data.reading.mode === "mushaf" ? "mushaf" : "verses",
        timestamp: typeof data.reading.timestamp === "number" ? data.reading.timestamp : Date.now(),
      };
    }
  }

  // Validate listening
  let listening: ContinueListening | null = null;
  if (data.listening && typeof data.listening === "object") {
    const s = Number(data.listening.surah);
    const r = Number(data.listening.reciterId);
    const t = Number(data.listening.time);
    if (
      Number.isInteger(s) &&
      s >= 1 &&
      s <= 114 &&
      Number.isInteger(r) &&
      r >= 1 &&
      !isNaN(t) &&
      t >= 0
    ) {
      listening = {
        surah: s,
        reciterId: r,
        time: t,
        surahName:
          typeof data.listening.surahName === "string" ? data.listening.surahName : undefined,
        timestamp:
          typeof data.listening.timestamp === "number" ? data.listening.timestamp : Date.now(),
      };
    }
  }

  // Validate bookmarks (capped at 500, note <= 140)
  const bookmarks: BookmarkItem[] = [];
  const seenKeys = new Set<string>();

  if (Array.isArray(data.bookmarks)) {
    for (const b of data.bookmarks) {
      if (bookmarks.length >= MAX_BOOKMARKS) break;
      if (!b || typeof b !== "object") continue;

      const s = Number(b.surah);
      const a = Number(b.ayah);
      if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1) continue;

      const verseKey = `${s}:${a}`;
      if (seenKeys.has(verseKey)) continue;
      seenKeys.add(verseKey);

      let note: string | undefined = undefined;
      if (typeof b.note === "string") {
        note = b.note.trim().slice(0, MAX_NOTE_LENGTH);
      }

      bookmarks.push({
        surah: s,
        ayah: a,
        verseKey,
        note,
        createdAt: typeof b.createdAt === "number" ? b.createdAt : Date.now(),
      });
    }
  }

  return {
    version: 1,
    reading,
    listening,
    bookmarks,
  };
}

/**
 * Reads current LibraryState from localStorage. Safe against SSR, corrupt data and errors.
 */
export function getLibrary(): LibraryState {
  if (typeof window === "undefined") return getDefaultLibraryState();
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    return validateAndParseLibrary(raw);
  } catch {
    return getDefaultLibraryState();
  }
}

/**
 * Saves current LibraryState to localStorage. Safe against quota errors.
 */
export function saveLibrary(state: LibraryState): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(state));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent("ayah-library-change", { detail: state }));
    return true;
  } catch {
    // Quota exceeded or private browsing restricted: fail quietly
    return false;
  }
}

/**
 * Saves 'Continue reading' position.
 */
export function saveContinueReading(item: {
  surah: number;
  ayah: number;
  surahName?: string;
  page?: number;
  mode?: "verses" | "mushaf";
}): void {
  const current = getLibrary();
  current.reading = {
    surah: item.surah,
    ayah: item.ayah,
    surahName: item.surahName,
    page: item.page,
    mode: item.mode,
    timestamp: Date.now(),
  };
  saveLibrary(current);
}

/**
 * Saves 'Continue listening' position.
 */
export function saveContinueListening(item: {
  surah: number;
  reciterId: number;
  time: number;
  surahName?: string;
}): void {
  const current = getLibrary();
  current.listening = {
    surah: item.surah,
    reciterId: item.reciterId,
    time: Math.max(0, item.time),
    surahName: item.surahName,
    timestamp: Date.now(),
  };
  saveLibrary(current);
}

/**
 * Clears continue reading & listening history. Keeps bookmarks intact.
 */
export function clearContinueHistory(): void {
  const current = getLibrary();
  current.reading = null;
  current.listening = null;
  saveLibrary(current);
}

/**
 * Adds or updates a bookmark. Returns updated bookmarks list.
 */
export function addBookmark(item: {
  surah: number;
  ayah: number;
  note?: string;
}): BookmarkItem[] {
  const current = getLibrary();
  const verseKey = `${item.surah}:${item.ayah}`;
  const existingIdx = current.bookmarks.findIndex((b) => b.verseKey === verseKey);

  const cleanNote = item.note ? item.note.trim().slice(0, MAX_NOTE_LENGTH) : undefined;

  if (existingIdx >= 0) {
    current.bookmarks[existingIdx].note = cleanNote;
  } else {
    if (current.bookmarks.length >= MAX_BOOKMARKS) {
      return current.bookmarks;
    }
    current.bookmarks.unshift({
      surah: item.surah,
      ayah: item.ayah,
      verseKey,
      note: cleanNote,
      createdAt: Date.now(),
    });
  }

  saveLibrary(current);
  return current.bookmarks;
}

/**
 * Removes a bookmark.
 */
export function removeBookmark(surah: number, ayah: number): BookmarkItem[] {
  const current = getLibrary();
  const verseKey = `${surah}:${ayah}`;
  current.bookmarks = current.bookmarks.filter((b) => b.verseKey !== verseKey);
  saveLibrary(current);
  return current.bookmarks;
}

/**
 * Updates bookmark note.
 */
export function updateBookmarkNote(surah: number, ayah: number, note: string): BookmarkItem[] {
  const current = getLibrary();
  const verseKey = `${surah}:${ayah}`;
  const item = current.bookmarks.find((b) => b.verseKey === verseKey);
  if (item) {
    item.note = note.trim().slice(0, MAX_NOTE_LENGTH);
    saveLibrary(current);
  }
  return current.bookmarks;
}

/**
 * Checks if an ayah is bookmarked.
 */
export function isBookmarked(surah: number, ayah: number): boolean {
  const current = getLibrary();
  const verseKey = `${surah}:${ayah}`;
  return current.bookmarks.some((b) => b.verseKey === verseKey);
}

/**
 * Exports bookmarks as a clean formatted JSON string.
 */
export function exportBookmarksJson(): string {
  const lib = getLibrary();
  const exportPayload = {
    app: "Aayah Studio",
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: lib.bookmarks,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Validates, imports and merges bookmarks from JSON.
 * Returns added count and success flag.
 */
export function importBookmarksJson(jsonStr: string): {
  success: boolean;
  added: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") {
      return { success: false, added: 0, error: "Invalid JSON file." };
    }

    const items = Array.isArray(parsed.bookmarks)
      ? parsed.bookmarks
      : Array.isArray(parsed)
      ? parsed
      : null;

    if (!items) {
      return { success: false, added: 0, error: "File contains no bookmarks array." };
    }

    const current = getLibrary();
    const existingMap = new Map(current.bookmarks.map((b) => [b.verseKey, b]));
    let addedCount = 0;

    for (const item of items) {
      if (current.bookmarks.length >= MAX_BOOKMARKS) break;
      if (!item || typeof item !== "object") continue;

      const s = Number(item.surah);
      const a = Number(item.ayah);
      if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1) continue;

      const verseKey = `${s}:${a}`;
      let note: string | undefined = undefined;
      if (typeof item.note === "string") {
        note = item.note.trim().slice(0, MAX_NOTE_LENGTH);
      }

      if (existingMap.has(verseKey)) {
        // If existing has no note and imported does, update note
        const existing = existingMap.get(verseKey)!;
        if (!existing.note && note) {
          existing.note = note;
        }
      } else {
        const newBm: BookmarkItem = {
          surah: s,
          ayah: a,
          verseKey,
          note,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        };
        current.bookmarks.push(newBm);
        existingMap.set(verseKey, newBm);
        addedCount++;
      }
    }

    saveLibrary(current);
    return { success: true, added: addedCount };
  } catch {
    return { success: false, added: 0, error: "Failed to parse JSON file." };
  }
}

/**
 * Subscribes to library state changes across tabs (via window storage event)
 * and within the same tab (via custom ayah-library-change event).
 */
export function subscribeLibrary(callback: (state: LibraryState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LIBRARY_STORAGE_KEY) {
      callback(getLibrary());
    }
  };

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) callback(detail);
    else callback(getLibrary());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("ayah-library-change", handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("ayah-library-change", handleCustom);
  };
}
