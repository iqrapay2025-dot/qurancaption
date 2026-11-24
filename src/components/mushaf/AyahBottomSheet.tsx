"use client";

import React, { useState } from "react";
import { Play, Pause, BookOpen, Video, Link2, Check, X } from "lucide-react";
import { buildEditorLink } from "@/lib/editor-link";
import { getSurahMeta } from "@/lib/mushaf/data";

interface AyahBottomSheetProps {
  open: boolean;
  onClose: () => void;
  verseKey: string | null;
  textArabic?: string;
  translation?: string;
  isPlaying?: boolean;
  onPlay: (verseKey: string) => void;
  onOpenTafsir: (surah: number, ayah: number) => void;
}

export function AyahBottomSheet({
  open,
  onClose,
  verseKey,
  textArabic,
  translation,
  isPlaying = false,
  onPlay,
  onOpenTafsir,
}: AyahBottomSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!open || !verseKey) return null;

  const [surahStr, ayahStr] = verseKey.split(":");
  const surah = parseInt(surahStr, 10);
  const ayah = parseInt(ayahStr, 10);
  const surahMeta = getSurahMeta(surah);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/quran/${surah}#ayah-${ayah}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const editorUrl = buildEditorLink({ surah, from: ayah, to: ayah });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ayah ${verseKey}`}
        className="relative z-10 w-full max-w-xl rounded-t-2xl border-t border-border bg-card p-5 sm:p-6 shadow-2xl transition-transform animate-slide-up"
      >
        {/* Drag handle */}
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-border" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {verseKey}
              </span>
              <h3 className="font-bold text-base text-foreground">
                {surahMeta ? `${surahMeta.name_simple} (${surahMeta.name_english})` : `Surah ${surah}`}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ayah {ayah} • {surahMeta?.revelation_place === "makkah" ? "Makki" : "Madani"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Arabic & Translation snippet */}
        <div className="py-4 space-y-2.5">
          {textArabic && (
            <p
              dir="rtl"
              className="text-right text-xl sm:text-2xl font-uthmani text-foreground leading-loose"
            >
              {textArabic}
            </p>
          )}
          {translation && (
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              &ldquo;{translation}&rdquo;
            </p>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {/* Play Ayah */}
          <button
            type="button"
            onClick={() => onPlay(verseKey)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 bg-background hover:border-gold hover:bg-gold/5 transition-all text-foreground group"
          >
            <div className={`p-2 rounded-full ${isPlaying ? "bg-gold text-gold-foreground" : "bg-primary/10 text-primary group-hover:bg-gold/20 group-hover:text-gold"}`}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </div>
            <span className="text-xs font-medium">
              {isPlaying ? "Pause" : "Play Ayah"}
            </span>
          </button>

          {/* Tafsir */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTafsir(surah, ayah);
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 bg-background hover:border-primary hover:bg-primary/5 transition-all text-foreground group"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
              <BookOpen size={18} />
            </div>
            <span className="text-xs font-medium">Tafsir</span>
          </button>

          {/* Make Captions */}
          <a
            href={editorUrl}
            onClick={onClose}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 bg-background hover:border-primary hover:bg-primary/5 transition-all text-foreground group"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
              <Video size={18} />
            </div>
            <span className="text-xs font-medium">Captions</span>
          </a>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 bg-background hover:border-border hover:bg-muted transition-all text-foreground"
          >
            <div className="p-2 rounded-full bg-muted text-muted-foreground">
              {copied ? <Check size={18} className="text-emerald-500" /> : <Link2 size={18} />}
            </div>
            <span className="text-xs font-medium">{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
