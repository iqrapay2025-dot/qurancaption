"use client";

import React from "react";
import { getSurahMeta } from "@/lib/mushaf/data";

interface SurahHeaderBannerProps {
  surahNumber?: number;
  surahNameArabic?: string;
  surahNameEnglish?: string;
  surahNameSimple?: string;
  ayahCount?: number;
  revelationPlace?: string;
  fontSizeMultiplier?: number;
}

/**
 * Authentic Islamic arabesque Surah Header Banner modeled after the classical
 * Madani Mushaf cartouche (with symmetric ornamental scrollwork wings and central frame).
 */
export function SurahHeaderBanner({
  surahNumber,
  surahNameArabic,
  surahNameEnglish,
  surahNameSimple,
  ayahCount,
  revelationPlace,
  fontSizeMultiplier = 1,
}: SurahHeaderBannerProps) {
  const meta = surahNumber ? getSurahMeta(surahNumber) : null;
  const arabicTitle = surahNameArabic || meta?.name_arabic || "";
  const englishMeaning = surahNameEnglish || meta?.name_english || "";
  const simpleName = surahNameSimple || meta?.name_simple || (surahNumber ? `Surah ${surahNumber}` : "");
  const verses = ayahCount || meta?.verses_count || 0;
  const place = revelationPlace || meta?.revelation_place || "madinah";
  const isMakkah = place === "makkah";

  return (
    <div className="relative my-3 sm:my-5 w-full flex items-center justify-center select-none px-0.5">
      {/* Outer Arabesque Container */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-gold/40 dark:border-gold/30 bg-gradient-to-r from-card/90 via-primary/5 to-card/90 dark:from-[#0c1329] dark:via-[#111c38] dark:to-[#0c1329] shadow-sm overflow-hidden py-2.5 sm:py-3.5 px-3 sm:px-6">
        {/* Subtle decorative inner corner patterns */}
        <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none opacity-20 dark:opacity-30 border-t-2 border-l-2 border-gold rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-20 dark:opacity-30 border-t-2 border-r-2 border-gold rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none opacity-20 dark:opacity-30 border-b-2 border-l-2 border-gold rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none opacity-20 dark:opacity-30 border-b-2 border-r-2 border-gold rounded-br-lg" />

        {/* Main Content Layout with Left & Right Arabesque Scrollwork Wings */}
        <div className="relative flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Arabesque Ornamental Wing */}
          <div className="hidden sm:flex items-center justify-center shrink-0 w-12 md:w-20 text-gold/80 dark:text-gold/90">
            <svg
              viewBox="0 0 100 80"
              className="w-full h-auto max-h-12 drop-shadow-xs"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer apex finial */}
              <path d="M 5 40 Q 20 28, 38 40 Q 20 52, 5 40 Z" fill="currentColor" fillOpacity="0.25" />
              {/* Flowing C and S scrolls */}
              <path d="M 18 40 C 26 22, 48 16, 68 28 C 84 38, 76 60, 56 60 C 42 60, 38 48, 50 42 C 58 38, 64 45, 60 52" />
              <path d="M 18 40 C 26 58, 48 64, 68 52 C 84 42, 76 20, 56 20 C 42 20, 38 32, 50 38 C 58 42, 64 35, 60 28" />
              {/* Corner connector curls */}
              <circle cx="86" cy="18" r="4" fill="currentColor" />
              <circle cx="86" cy="62" r="4" fill="currentColor" />
              <path d="M 68 28 Q 78 20, 86 18" />
              <path d="M 68 52 Q 78 60, 86 62" />
            </svg>
          </div>

          {/* Center Ornate Cartouche */}
          <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0 py-0.5">
            {/* Top Surah Number & Meta Pill */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <span className="font-mono px-2 py-0.5 rounded-full bg-gold/15 dark:bg-gold/20 text-gold-dark dark:text-gold font-bold border border-gold/30">
                {surahNumber ? `Surah ${surahNumber}` : "Surah"}
              </span>
              <span>•</span>
              <span className="text-foreground/80 font-medium">
                {verses} {verses === 1 ? "Ayah" : "Ayat"} ({isMakkah ? "Makki" : "Madani"})
              </span>
            </div>

            {/* Central Calligraphic Surah Name */}
            <div className="relative py-0.5 my-0.5">
              <h3
                dir="rtl"
                style={{
                  fontFamily: "'UthmanicHafs', 'Amiri Quran', 'Scheherazade New', serif",
                  fontSize: `calc(clamp(1.25rem, 4vw, 2rem) * ${fontSizeMultiplier})`,
                }}
                className="font-uthmani font-bold text-foreground dark:text-gold tracking-wide leading-tight drop-shadow-2xs"
              >
                سُورَةُ {arabicTitle}
              </h3>
            </div>

            {/* Bottom English Transliteration & Meaning */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-foreground/80 mt-1 max-w-full truncate">
              <span className="font-semibold text-foreground">{simpleName}</span>
              {englishMeaning && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="italic text-muted-foreground truncate">&ldquo;{englishMeaning}&rdquo;</span>
                </>
              )}
            </div>
          </div>

          {/* Right Arabesque Ornamental Wing (Mirrored) */}
          <div className="hidden sm:flex items-center justify-center shrink-0 w-12 md:w-20 text-gold/80 dark:text-gold/90 scale-x-[-1]">
            <svg
              viewBox="0 0 100 80"
              className="w-full h-auto max-h-12 drop-shadow-xs"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer apex finial */}
              <path d="M 5 40 Q 20 28, 38 40 Q 20 52, 5 40 Z" fill="currentColor" fillOpacity="0.25" />
              {/* Flowing C and S scrolls */}
              <path d="M 18 40 C 26 22, 48 16, 68 28 C 84 38, 76 60, 56 60 C 42 60, 38 48, 50 42 C 58 38, 64 45, 60 52" />
              <path d="M 18 40 C 26 58, 48 64, 68 52 C 84 42, 76 20, 56 20 C 42 20, 38 32, 50 38 C 58 42, 64 35, 60 28" />
              {/* Corner connector curls */}
              <circle cx="86" cy="18" r="4" fill="currentColor" />
              <circle cx="86" cy="62" r="4" fill="currentColor" />
              <path d="M 68 28 Q 78 20, 86 18" />
              <path d="M 68 52 Q 78 60, 86 62" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
