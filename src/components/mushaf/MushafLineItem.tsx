"use client";

import React from "react";
import { MushafLine, MushafWord } from "@/lib/mushaf/types";

interface MushafLineItemProps {
  line: MushafLine;
  pageNumber: number;
  fontFamily: string;
  useFallbackFont?: boolean;
  activeAyahKey?: string | null;
  selectedAyahKey?: string | null;
  onSelectWord: (word: MushafWord) => void;
}

export const MushafLineItem = React.memo(function MushafLineItem({
  line,
  pageNumber,
  fontFamily,
  useFallbackFont = false,
  activeAyahKey,
  selectedAyahKey,
  onSelectWord,
}: MushafLineItemProps) {
  // Surah Header Line
  if (line.type === "surah_header") {
    return (
      <div className="my-2 sm:my-3 w-full py-1.5 px-3 sm:px-4 rounded-xl border-2 border-gold/40 bg-gradient-to-r from-gold/10 via-primary/10 to-gold/10 text-center shadow-xs flex items-center justify-between">
        <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {line.ayah_count} Ayat • {line.revelation_place === "makkah" ? "Makki" : "Madani"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-xl font-uthmani font-bold text-foreground">
            سُورَةُ {line.surah_name_arabic}
          </span>
        </div>
        <span className="text-[11px] sm:text-xs font-medium text-foreground/80">
          {line.surah_name_english}
        </span>
      </div>
    );
  }

  // Bismillah Line
  if (line.type === "bismillah") {
    return (
      <div className="my-1.5 sm:my-2 w-full text-center py-1">
        <span
          dir="rtl"
          className="text-xl sm:text-2xl md:text-3xl font-uthmani text-foreground/90 font-medium tracking-wide"
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
      className={`w-full flex flex-row items-center leading-normal sm:leading-loose py-0.5 sm:py-1 px-1.5 sm:px-2.5 max-w-full ${
        isPage1Or2 ? "justify-center gap-1.5 sm:gap-3" : "justify-between"
      }`}
      style={{
        fontFamily,
      }}
    >
      {words.map((word) => {
        const isEndMarker = word.char_type_name === "end";
        const isActive = activeAyahKey === word.verse_key;
        const isSelected = selectedAyahKey === word.verse_key;

        const glyphText = useFallbackFont
          ? word.text_qpc_hafs || word.text_uthmani || word.code_v2
          : word.code_v2;

        return (
          <span
            key={word.id || `${word.verse_key}-${word.position}`}
            onClick={() => onSelectWord(word)}
            title={word.translation?.text ? `${word.verse_key}: ${word.translation.text}` : word.verse_key}
            className={`cursor-pointer transition-colors duration-150 inline-block px-0.5 rounded select-none shrink-0 ${
              isActive
                ? "bg-gold/30 text-gold-foreground font-semibold ring-1 ring-gold/50"
                : isSelected
                ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                : "hover:bg-primary/10 hover:text-primary"
            } ${isEndMarker ? "text-gold font-bold mx-0.5" : "text-foreground"}`}
          >
            {glyphText}
          </span>
        );
      })}
    </div>
  );
});
