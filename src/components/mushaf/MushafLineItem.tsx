"use client";

import React from "react";
import { MushafLine, MushafWord, MushafFontType } from "@/lib/mushaf/types";
import { SurahHeaderBanner } from "./SurahHeaderBanner";

interface MushafLineItemProps {
  line: MushafLine;
  pageNumber: number;
  fontFamily: string;
  useFallbackFont?: boolean;
  fontType?: MushafFontType;
  fontSizeMultiplier?: number;
  tajweedEnabled?: boolean;
  activeAyahKey?: string | null;
  selectedAyahKey?: string | null;
  onSelectWord: (word: MushafWord) => void;
}

// Helper to ensure tajweed segments never start with orphaned combining diacritics
// which would cause browsers to render dotted circles (U+25CC)
function normalizeWordTajweed(segments: Array<{ text: string; color?: string; rule?: string }>) {
  const COMBINING_REGEX = /^[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]+/;
  const segs = segments.map((s) => ({ ...s, text: s.text.replace(/\u0672/g, "\u0640\u0670") }));
  for (let i = 1; i < segs.length; i++) {
    const m = segs[i].text.match(COMBINING_REGEX);
    if (m) {
      segs[i - 1].text += m[0];
      segs[i].text = segs[i].text.slice(m[0].length);
    }
  }
  for (let i = 1; i < segs.length; i++) {
    if (segs[i].text.startsWith("\u0653") && /[\u0627\u0649\u0648\u064A]$/.test(segs[i - 1].text)) {
      segs[i - 1].text += "\u0653";
      segs[i].text = segs[i].text.slice(1);
    }
  }
  return segs.filter((s) => s.text.length > 0);
}

export const MushafLineItem = React.memo(function MushafLineItem({
  line,
  pageNumber,
  fontFamily,
  useFallbackFont = false,
  fontType = "kfgqpc",
  fontSizeMultiplier = 1,
  tajweedEnabled = false,
  activeAyahKey,
  selectedAyahKey,
  onSelectWord,
}: MushafLineItemProps) {
  // Surah Header Line with Arabesque Banner
  if (line.type === "surah_header") {
    return (
      <SurahHeaderBanner
        surahNumber={line.surah_number}
        surahNameArabic={line.surah_name_arabic}
        surahNameEnglish={line.surah_name_english}
        surahNameSimple={line.surah_name_simple}
        ayahCount={line.ayah_count}
        revelationPlace={line.revelation_place}
        fontSizeMultiplier={fontSizeMultiplier}
      />
    );
  }

  // Bismillah Line (scales smoothly with fontSizeMultiplier)
  if (line.type === "bismillah") {
    return (
      <div className="my-1 sm:my-2 w-full text-center py-1">
        <span
          dir="rtl"
          style={{
            fontFamily: "'UthmanicHafs', 'Amiri Quran', 'Scheherazade New', serif",
            fontSize: `calc(clamp(1.25rem, 3.5vw, 2.25rem) * ${fontSizeMultiplier})`,
          }}
          className="font-uthmani text-foreground/90 font-medium tracking-wide leading-relaxed inline-block"
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </span>
      </div>
    );
  }

  // Text Line
  const words = line.words || [];
  const isPage1Or2 = pageNumber === 1 || pageNumber === 2;

  return (
    <div
      dir="rtl"
      className={`w-full flex flex-row items-center leading-normal sm:leading-loose py-0.5 sm:py-1 px-2 sm:px-3 max-w-full ${
        isPage1Or2 ? "justify-center gap-1.5 sm:gap-3" : "justify-between"
      }`}
      style={{
        fontFamily: tajweedEnabled ? "'UthmanicHafs', 'Amiri Quran', serif" : fontFamily,
      }}
    >
      {words.map((word) => {
        const isEndMarker = word.char_type_name === "end";
        const isActive = activeAyahKey === word.verse_key;
        const isSelected = selectedAyahKey === word.verse_key;

        const isUnicodeFont = fontType === "amiri" || fontType === "uthmanic" || tajweedEnabled;
        const glyphText = (isUnicodeFont || useFallbackFont)
          ? word.text_qpc_hafs || word.text_uthmani || word.code_v2
          : word.code_v2;

        const hasTajweed = tajweedEnabled && !isEndMarker && word.tajweed && word.tajweed.length > 0;

        return (
          <span
            key={word.id || `${word.verse_key}-${word.position}`}
            onClick={() => onSelectWord(word)}
            title={word.translation?.text ? `${word.verse_key}: ${word.translation.text}` : word.verse_key}
            className={`cursor-pointer transition-colors duration-150 inline-block text-center rounded select-none shrink-0 ${
              isActive
                ? "bg-gold/30 text-gold-foreground font-semibold ring-1 ring-gold/50"
                : isSelected
                ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                : "hover:bg-primary/10 hover:text-primary"
            } ${
              isEndMarker
                ? "text-gold font-bold px-1.5 mx-0.5 min-w-[1.3em] text-center"
                : "px-0.5 text-foreground"
            }`}
          >
            {hasTajweed ? (
              <span className="inline leading-normal whitespace-nowrap">
                {normalizeWordTajweed(word.tajweed!).map((seg, sIdx) => (
                  <span
                    key={sIdx}
                    style={{ color: seg.color || undefined }}
                  >
                    {seg.text}
                  </span>
                ))}
              </span>
            ) : (
              glyphText
            )}
          </span>
        );
      })}
    </div>
  );
});
