"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, X, Check, Trash2 } from "lucide-react";
import {
  getLibrary,
  subscribeLibrary,
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
  MAX_NOTE_LENGTH,
} from "@/lib/library/storage";

interface Props {
  surah: number;
  ayah: number;
  surahName?: string;
}

export function AyahBookmarkButton({ surah, ayah }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [note, setNote] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const verseKey = `${surah}:${ayah}`;

  // Sync with library storage
  useEffect(() => {
    const update = () => {
      const lib = getLibrary();
      const found = lib.bookmarks.find((b) => b.verseKey === verseKey);
      if (found) {
        setBookmarked(true);
        setNote(found.note || "");
      } else {
        setBookmarked(false);
        setNote("");
      }
    };

    update();
    const unsub = subscribeLibrary(update);
    return () => unsub();
  }, [verseKey]);

  // Click outside to auto-save and close note popover
  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        updateBookmarkNote(surah, ayah, noteRef.current);
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popoverOpen, surah, ayah]);

  const handleToggle = () => {
    if (bookmarked) {
      // If already bookmarked, open the popover to edit note or remove
      setPopoverOpen((prev) => !prev);
    } else {
      // Add bookmark and open popover so user can enter an optional note
      addBookmark({ surah, ayah });
      setBookmarked(true);
      setPopoverOpen(true);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    updateBookmarkNote(surah, ayah, note);
    setPopoverOpen(false);
  };

  const handleRemove = () => {
    removeBookmark(surah, ayah);
    setBookmarked(false);
    setNote("");
    setPopoverOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex min-h-[36px] min-w-[36px] sm:min-h-[32px] sm:min-w-[32px] h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card transition-colors hover:bg-muted touch-manipulation focus-visible:outline-2 focus-visible:outline-ring ${
          bookmarked ? "text-primary border-primary/50 bg-primary/10" : "text-muted-foreground hover:text-foreground"
        }`}
        title={bookmarked ? "Edit bookmark note or remove" : "Bookmark this ayah"}
        aria-label={bookmarked ? `Bookmarked ayah ${ayah}` : `Bookmark ayah ${ayah}`}
      >
        <Bookmark
          size={14}
          className={bookmarked ? "fill-primary text-primary" : "text-muted-foreground"}
        />
      </button>

      {/* Note popover */}
      {popoverOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1.5 z-40 w-72 rounded-lg border border-border bg-card p-3 shadow-lg text-left"
          role="dialog"
          aria-label="Bookmark note"
        >
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            <span className="text-xs font-semibold text-foreground">
              Bookmark: {surah}:{ayah}
            </span>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-2">
            <label htmlFor={`note-${surah}-${ayah}`} className="sr-only">
              Optional note
            </label>
            <textarea
              id={`note-${surah}-${ayah}`}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              onBlur={() => updateBookmarkNote(surah, ayah, note)}
              placeholder="Add an optional note (e.g. favorite tafsir, reflection)..."
              rows={2}
              maxLength={MAX_NOTE_LENGTH}
              className="w-full resize-none rounded-md border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {note.length}/{MAX_NOTE_LENGTH}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 text-red-500 hover:underline px-1 py-0.5"
                >
                  <Trash2 size={12} /> Remove
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
