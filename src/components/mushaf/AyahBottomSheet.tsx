"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, BookOpen, Video, Link2, Check, X, Volume2 } from "lucide-react";
import { buildEditorLink } from "@/lib/editor-link";
import { getSurahMeta } from "@/lib/mushaf/data";
import { MushafWord } from "@/lib/mushaf/types";
import { registerAudioPlayback, notifyAudioPlaybackStarted } from "@/lib/audio/single-audio";

interface AyahBottomSheetProps {
  open: boolean;
  onClose: () => void;
  verseKey: string | null;
  selectedWord?: MushafWord | null;
  fullAyahArabic?: string;
  fullAyahTranslation?: string;
  isPlayingAyah?: boolean;
  onPlayAyah: (verseKey: string) => void;
  onOpenTafsir: (surah: number, ayah: number) => void;
}

export function AyahBottomSheet({
  open,
  onClose,
  verseKey,
  selectedWord,
  fullAyahArabic,
  fullAyahTranslation,
  isPlayingAyah = false,
  onPlayAyah,
  onOpenTafsir,
}: AyahBottomSheetProps) {
  const [copied, setCopied] = useState(false);
  const [isWordPlaying, setIsWordPlaying] = useState(false);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop word audio if sheet closes
  useEffect(() => {
    if (!open && wordAudioRef.current) {
      wordAudioRef.current.pause();
      setIsWordPlaying(false);
    }
  }, [open]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
        wordAudioRef.current = null;
      }
    };
  }, []);

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

  const handlePlayWord = () => {
    if (!selectedWord) return;

    if (isWordPlaying && wordAudioRef.current) {
      wordAudioRef.current.pause();
      setIsWordPlaying(false);
      return;
    }

    notifyAudioPlaybackStarted("reader");

    let audioSrc = selectedWord.audio_url || "";
    if (audioSrc && !audioSrc.startsWith("http")) {
      audioSrc = `https://audio.qurancdn.com/${audioSrc}`;
    }
    if (!audioSrc) {
      const sPad = surahStr.padStart(3, "0");
      const aPad = ayahStr.padStart(3, "0");
      const pPad = String(selectedWord.position).padStart(3, "0");
      audioSrc = `https://audio.qurancdn.com/wbw/${sPad}_${aPad}_${pPad}.mp3`;
    }

    if (!wordAudioRef.current) {
      wordAudioRef.current = new Audio();
    }

    wordAudioRef.current.src = audioSrc;
    setIsWordPlaying(true);

    const cleanup = registerAudioPlayback("reader", () => {
      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
        setIsWordPlaying(false);
      }
    });

    wordAudioRef.current.onended = () => {
      setIsWordPlaying(false);
      cleanup();
    };

    wordAudioRef.current.onerror = () => {
      setIsWordPlaying(false);
      cleanup();
    };

    wordAudioRef.current.play().catch(() => {
      setIsWordPlaying(false);
      cleanup();
    });
  };

  const handlePlayEntireAyah = () => {
    if (isWordPlaying && wordAudioRef.current) {
      wordAudioRef.current.pause();
      setIsWordPlaying(false);
    }
    onPlayAyah(verseKey);
  };

  const editorUrl = buildEditorLink({ surah, from: ayah, to: ayah });

  const wordArabic = selectedWord?.text_uthmani || selectedWord?.text_qpc_hafs || "";
  const wordTrans = selectedWord?.translation?.text;
  const wordTranslit = selectedWord?.transliteration?.text;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ayah ${verseKey}`}
        className="relative z-10 w-full max-w-xl rounded-t-2xl sm:rounded-t-3xl border-t border-border bg-card p-4 sm:p-6 shadow-2xl transition-transform animate-slide-up max-h-[88vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-border" />

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

        {/* Word-by-word Audio & Details Card */}
        {selectedWord && selectedWord.char_type_name !== "end" && (
          <div className="my-3 p-3 sm:p-4 rounded-xl border border-gold/40 bg-gold/5 dark:bg-gold/10 flex items-center justify-between gap-3 animate-fade-in">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gold/20 text-gold-dark dark:text-gold font-mono">
                  Word {selectedWord.position}
                </span>
                {wordTranslit && (
                  <span className="text-xs text-muted-foreground italic truncate">
                    {wordTranslit}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  dir="rtl"
                  style={{ fontFamily: "'UthmanicHafs', 'Amiri Quran', 'Scheherazade New', serif" }}
                  className="font-uthmani text-2xl font-bold text-foreground"
                >
                  {wordArabic}
                </span>
                {wordTrans && (
                  <span className="text-xs text-foreground/80 font-medium">
                    &ldquo;{wordTrans}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Play Word Audio Button */}
            <button
              type="button"
              onClick={handlePlayWord}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                isWordPlaying
                  ? "bg-gold text-gold-foreground border-gold shadow-xs"
                  : "bg-background border-gold/40 text-gold-dark dark:text-gold hover:bg-gold/15"
              }`}
              title="Play word pronunciation"
            >
              {isWordPlaying ? (
                <>
                  <Pause size={15} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} />
                  <span>Play Word</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Full Ayah Arabic & Translation snippet */}
        <div className="py-2.5 sm:py-3 space-y-2 border-b border-border/60">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">
            Entire Ayah {verseKey}
          </span>
          {fullAyahArabic && (
            <p
              dir="rtl"
              style={{ fontFamily: "'UthmanicHafs', 'Amiri Quran', 'Scheherazade New', serif" }}
              className="text-right text-xl sm:text-2xl font-uthmani text-foreground leading-loose"
            >
              {fullAyahArabic}
            </p>
          )}
          {fullAyahTranslation && (
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              &ldquo;{fullAyahTranslation}&rdquo;
            </p>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          {/* Play Entire Ayah */}
          <button
            type="button"
            onClick={handlePlayEntireAyah}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 bg-background hover:border-gold hover:bg-gold/5 transition-all text-foreground group"
          >
            <div
              className={`p-2 rounded-full ${
                isPlayingAyah
                  ? "bg-gold text-gold-foreground"
                  : "bg-primary/10 text-primary group-hover:bg-gold/20 group-hover:text-gold"
              }`}
            >
              {isPlayingAyah ? <Pause size={18} /> : <Play size={18} />}
            </div>
            <span className="text-xs font-medium">
              {isPlayingAyah ? "Pause Ayah" : "Play Entire Ayah"}
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
