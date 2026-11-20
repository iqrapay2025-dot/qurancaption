"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Bookmark,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import {
  getLibrary,
  subscribeLibrary,
  removeBookmark,
  updateBookmarkNote,
  exportBookmarksJson,
  importBookmarksJson,
  type BookmarkItem,
  MAX_NOTE_LENGTH,
} from "@/lib/library/storage";
import type { ApiVerse } from "@/lib/quran/types";
import { DEFAULT_TR1 } from "@/lib/quran/types";

interface SurahGroup {
  surah: number;
  surahName?: string;
  items: BookmarkItem[];
}

interface CachedSurahData {
  verses: ApiVerse[];
  loading: boolean;
  error?: string;
}

export function BookmarksView() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [surahData, setSurahData] = useState<Record<number, CachedSurahData>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync bookmarks from storage
  useEffect(() => {
    setMounted(true);
    const update = () => {
      const lib = getLibrary();
      setBookmarks(lib.bookmarks);
    };

    update();
    const unsub = subscribeLibrary(update);
    return () => unsub();
  }, []);

  // Group bookmarks by surah
  const groups: SurahGroup[] = [];
  const surahMap = new Map<number, BookmarkItem[]>();
  for (const b of bookmarks) {
    if (!surahMap.has(b.surah)) {
      surahMap.set(b.surah, []);
    }
    surahMap.get(b.surah)!.push(b);
  }
  surahMap.forEach((items, surah) => {
    // Sort ayahs in ascending order
    items.sort((a, b) => a.ayah - b.ayah);
    groups.push({ surah, items });
  });
  // Sort surahs in ascending order
  groups.sort((a, b) => a.surah - b.surah);

  // Fetch verses for each distinct surah (one request per surah)
  useEffect(() => {
    const neededSurahs = groups.map((g) => g.surah);
    neededSurahs.forEach((surahId) => {
      if (surahData[surahId]) return; // already fetched or in progress

      setSurahData((prev) => ({
        ...prev,
        [surahId]: { verses: [], loading: true },
      }));

      fetch(`/api/quran/verses?surah=${surahId}&translations=${DEFAULT_TR1}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load verses");
          return res.json();
        })
        .then((data) => {
          setSurahData((prev) => ({
            ...prev,
            [surahId]: {
              verses: Array.isArray(data?.verses) ? data.verses : [],
              loading: false,
            },
          }));
        })
        .catch((err) => {
          setSurahData((prev) => ({
            ...prev,
            [surahId]: { verses: [], loading: false, error: err.message },
          }));
        });
    });
  }, [groups]);

  const handleExport = () => {
    const jsonStr = exportBookmarksJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ayah-studio-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback("Bookmarks exported successfully.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBookmarksJson(content);
      if (res.success) {
        setFeedback(`Imported ${res.added} bookmark${res.added === 1 ? "" : "s"} successfully!`);
      } else {
        setFeedback(`Import failed: ${res.error || "Invalid file"}`);
      }
      setTimeout(() => setFeedback(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleStartEdit = (b: BookmarkItem) => {
    setEditingKey(b.verseKey);
    setEditNote(b.note || "");
  };

  const handleSaveEdit = (b: BookmarkItem) => {
    updateBookmarkNote(b.surah, b.ayah, editNote);
    setEditingKey(null);
  };

  const handleRemove = (b: BookmarkItem) => {
    removeBookmark(b.surah, b.ayah);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <BadgeLoader size="inline" label="Loading bookmarks..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Bookmarks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved in this browser only. Clearing your browser data removes them.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload bookmarks JSON file"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <Upload size={15} /> Import
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={bookmarks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="mb-6 rounded-md bg-primary/10 border border-primary/20 px-4 py-2.5 text-xs sm:text-sm text-primary flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Empty State */}
      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Bookmark size={24} />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No bookmarks saved yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-muted-foreground">
            While reading any surah in the Quran reader, tap the bookmark icon on any ayah to save it
            here with optional personal notes.
          </p>
          <Link
            href="/quran"
            className="mt-6 inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <BookOpen size={16} /> Read the Quran
          </Link>
        </div>
      ) : (
        /* Grouped Bookmarks */
        <div className="space-y-8">
          {groups.map((group) => {
            const cached = surahData[group.surah];
            return (
              <div
                key={group.surah}
                className="rounded-lg border border-border bg-card p-5 sm:p-6 shadow-xs"
              >
                {/* Surah Header */}
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base sm:text-lg text-foreground">
                      Surah {group.surah}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({group.items.length} ayah{group.items.length === 1 ? "" : "s"} saved)
                    </span>
                  </div>
                  <Link
                    href={`/quran/${group.surah}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open Surah <ArrowRight size={13} />
                  </Link>
                </div>

                {/* Items in this Surah */}
                <div className="divide-y divide-border">
                  {group.items.map((b) => {
                    const verseData = cached?.verses?.find((v) => v.n === b.ayah);
                    const isEditing = editingKey === b.verseKey;

                    return (
                      <div key={b.verseKey} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Link
                            href={`/quran/${b.surah}#ayah-${b.ayah}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            Ayah {b.surah}:{b.ayah}
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (isEditing ? setEditingKey(null) : handleStartEdit(b))}
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              title="Edit note"
                            >
                              <Edit2 size={13} /> Note
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(b)}
                              className="text-xs text-muted-foreground hover:text-red-500 inline-flex items-center gap-1"
                              title="Remove bookmark"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Arabic and Translation */}
                        {cached?.loading ? (
                          <div className="py-3">
                            <BadgeLoader size="inline" label="Loading verse..." />
                          </div>
                        ) : verseData ? (
                          <div className="space-y-2">
                            <p
                              className="text-right font-serif text-xl sm:text-2xl leading-relaxed text-foreground"
                              dir="rtl"
                            >
                              {verseData.arabic}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                              {verseData.translations[DEFAULT_TR1] ||
                                Object.values(verseData.translations)[0] ||
                                ""}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Verse {b.surah}:{b.ayah}
                          </p>
                        )}

                        {/* Note display or inline edit */}
                        {isEditing ? (
                          <div className="mt-3 rounded-md border border-border bg-background p-2.5">
                            <label htmlFor={`edit-${b.verseKey}`} className="sr-only">
                              Edit Note
                            </label>
                            <textarea
                              id={`edit-${b.verseKey}`}
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                              rows={2}
                              maxLength={MAX_NOTE_LENGTH}
                              placeholder="Add an optional note..."
                              className="w-full resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                            />
                            <div className="flex items-center justify-between pt-1 border-t border-border mt-1 text-[11px] text-muted-foreground">
                              <span>
                                {editNote.length}/{MAX_NOTE_LENGTH}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingKey(null)}
                                  className="text-xs hover:underline"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(b)}
                                  className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                                >
                                  <Check size={12} /> Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : b.note ? (
                          <div className="mt-2.5 rounded-md bg-muted/50 border border-border/60 px-3 py-1.5 text-xs text-foreground flex items-center justify-between">
                            <span className="italic">&ldquo;{b.note}&rdquo;</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
