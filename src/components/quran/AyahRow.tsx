"use client";

import React from "react";
import { BookOpen, Link2, Check, Play, Repeat } from "lucide-react";
import type { ApiVerse } from "@/lib/quran/server";
import { TRANSLITERATION_ID } from "@/lib/quran/types";
import {
  ARABIC_SIZE_MAP,
  TRANSLATION_SIZE_MAP,
  ARABIC_SCRIPT_FONTS,
  type QuranSettings,
} from "@/lib/quran/settings";
import { tajweedGroup } from "@/lib/quran/tajweed";
import { AyahBookmarkButton } from "./AyahBookmarkButton";

export type AyahRowProps = {
  v: ApiVerse;
  chapterId: number;
  chapterNameSimple: string;
  isHighlighted: boolean;
  isBlurred: boolean;
  hideText: boolean;
  selectMode: boolean;
  isSelected: boolean;
  isCopied: boolean;
  settings: QuranSettings;
  onToggleSelect: (n: number) => void;
  onPractice: (n: number) => void;
  onPlay: (n: number) => void;
  onOpenTafsir: (n: number) => void;
  onCopyLink: (n: number) => void;
  onToggleReveal: (n: number) => void;
  setTafsirButtonRef: (n: number, el: HTMLButtonElement | null) => void;
};

export const AyahRow = React.memo(function AyahRow({
  v,
  chapterId,
  chapterNameSimple,
  isHighlighted,
  isBlurred,
  hideText,
  selectMode,
  isSelected,
  isCopied,
  settings,
  onToggleSelect,
  onPractice,
  onPlay,
  onOpenTafsir,
  onCopyLink,
  onToggleReveal,
  setTafsirButtonRef,
}: AyahRowProps) {
  return (
    <div
      id={`ayah-${v.n}`}
      data-ayah-num={v.n}
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 220px" }}
      className={`group rounded-2xl border p-4 sm:p-6 transition-all duration-500 ${
        isHighlighted
          ? "border-gold bg-gold/10 ring-2 ring-gold/40 shadow-md"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      {/* Row header: Ayah badge & Action buttons */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 mb-4">
        <div className="flex items-center gap-2">
          {selectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(v.n)}
              aria-label={`Select ayah ${v.n}`}
              className="size-4.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground/90 font-mono tracking-tight shadow-2xs"
            title={`Surah ${chapterId}, Ayah ${v.n}`}
          >
            <span className="text-muted-foreground font-normal">{chapterId}:</span>
            {v.n}
          </span>
        </div>

        <div
          data-tour={v.n === 1 ? "ayah-actions" : undefined}
          className="flex items-center gap-1 sm:gap-1.5 shrink-0"
        >
          <button
            type="button"
            data-tour={v.n === 1 ? "ayah-practice" : undefined}
            onClick={() => onPractice(v.n)}
            aria-label={`Practice ayah ${v.n}`}
            title="Practice (Memorize) this ayah"
            className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Repeat size={13} className="text-muted-foreground" />
            <span className="hidden sm:inline">Practice</span>
          </button>

          <button
            type="button"
            data-tour={v.n === 1 ? "ayah-play" : undefined}
            onClick={() => onPlay(v.n)}
            aria-label={`Play from ayah ${v.n}`}
            title={`Play from ayah ${v.n}`}
            className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Play size={13} className="text-muted-foreground" />
            <span className="hidden sm:inline">Play from here</span>
            <span className="sm:hidden text-[11px]">Play</span>
          </button>

          <button
            ref={(el) => setTafsirButtonRef(v.n, el)}
            type="button"
            data-tour={v.n === 1 ? "ayah-tafsir" : undefined}
            onClick={() => onOpenTafsir(v.n)}
            aria-label={`Open tafsir for ayah ${v.n}`}
            title={`Open tafsir for ayah ${v.n}`}
            className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            <BookOpen size={13} className="text-muted-foreground" />
            <span className="hidden sm:inline">Tafsir</span>
          </button>

          <button
            type="button"
            onClick={() => onCopyLink(v.n)}
            aria-label={`Copy link to ayah ${v.n}`}
            title="Copy link to this ayah"
            className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isCopied ? (
              <>
                <Check size={13} className="text-primary" />
                <span className="hidden sm:inline text-primary">Copied</span>
              </>
            ) : (
              <>
                <Link2 size={13} className="text-muted-foreground" />
                <span className="hidden sm:inline">Copy link</span>
              </>
            )}
          </button>

          <div data-tour={v.n === 1 ? "ayah-bookmark" : undefined}>
            <AyahBookmarkButton
              surah={chapterId}
              ayah={v.n}
              surahName={chapterNameSimple}
            />
          </div>
        </div>
      </div>

      {/* Ayah Content (Arabic, transliteration, translations) with optional blur */}
      <div
        onClick={() => {
          if (hideText) onToggleReveal(v.n);
        }}
        className={`transition-all duration-300 ${
          isBlurred ? "filter blur-md select-none cursor-pointer hover:opacity-80" : ""
        }`}
        title={isBlurred ? "Tap to reveal" : undefined}
      >
        {/* Arabic Verse Text */}
        <div
          dir="rtl"
          lang="ar"
          style={{
            fontSize: ARABIC_SIZE_MAP[settings.arabicSize],
            fontFamily: ARABIC_SCRIPT_FONTS[settings.script],
          }}
          className="leading-loose text-right text-foreground mb-4 select-text"
        >
          {settings.tajweed && v.tajweed ? (
            v.tajweed.map(([t, r], i) => {
              const g = tajweedGroup(r);
              return g ? (
                <span key={i} style={{ color: g.color }}>
                  {t}
                </span>
              ) : (
                <span key={i}>{t}</span>
              );
            })
          ) : (
            v.arabic
          )}
        </div>

        {/* Transliteration */}
        {settings.transliteration && v.translations[TRANSLITERATION_ID] && (
          <div
            style={{ fontSize: TRANSLATION_SIZE_MAP[settings.translationSize] }}
            className="italic text-muted-foreground/90 select-text mb-3 leading-relaxed"
          >
            {v.translations[TRANSLITERATION_ID]}
          </div>
        )}

        {/* Translations */}
        <div className="space-y-3">
          {settings.translations.map((trId) => {
            const text = v.translations[trId];
            if (!text) return null;
            return (
              <div
                key={trId}
                style={{ fontSize: TRANSLATION_SIZE_MAP[settings.translationSize] }}
                className="leading-relaxed text-muted-foreground select-text"
              >
                {settings.translations.length > 1 && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-0.5">
                    {trId.replace(/_/g, " ")}
                  </span>
                )}
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
