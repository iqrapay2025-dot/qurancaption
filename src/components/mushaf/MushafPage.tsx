"use client";

import React from "react";
import { MushafPageData, MushafWord, MushafFontType } from "@/lib/mushaf/types";
import { MushafLineItem } from "./MushafLineItem";

interface MushafPageProps {
  pageData: MushafPageData;
  fontFamily: string;
  useFallbackFont?: boolean;
  fontType?: MushafFontType;
  fontSizeMultiplier?: number;
  tajweedEnabled?: boolean;
  activeAyahKey?: string | null;
  selectedAyahKey?: string | null;
  onSelectWord: (word: MushafWord) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export const MushafPage = React.memo(function MushafPage({
  pageData,
  fontFamily,
  useFallbackFont = false,
  fontType = "kfgqpc",
  fontSizeMultiplier = 1,
  tajweedEnabled = false,
  activeAyahKey,
  selectedAyahKey,
  onSelectWord,
  onTouchStart,
  onTouchEnd,
}: MushafPageProps) {
  const isPage1Or2 = pageData.page_number === 1 || pageData.page_number === 2;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="w-full max-w-2xl mx-auto my-2 sm:my-6 rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-card/90 shadow-md p-2.5 sm:p-6 md:p-8 flex flex-col justify-between min-h-[520px] sm:min-h-[720px] transition-all overflow-x-hidden"
    >
      {/* Top Header Row of Mushaf page (Surah name / Juz indicator inside frame) */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 sm:mb-3 text-[11px] sm:text-xs text-muted-foreground select-none">
        <span className="font-semibold text-foreground/80">
          الجزء {pageData.juz_number}
        </span>
        <span className="font-uthmani font-bold text-foreground text-sm sm:text-base">
          {pageData.surahs.map((s) => s.name_arabic).join(" - ")}
        </span>
      </div>

      {/* Mushaf Lines */}
      <div
        className={`w-full flex flex-col justify-between flex-1 py-1 sm:py-2 px-1 sm:px-2 ${
          isPage1Or2 ? "justify-center gap-2 sm:gap-4 my-auto" : ""
        }`}
        style={{
          fontSize: `calc(clamp(12px, 3.8vw, 26px) * ${fontSizeMultiplier})`,
          lineHeight: `${1.7 * Math.max(0.9, fontSizeMultiplier)}`,
        }}
      >
        {pageData.lines.map((line) => (
          <MushafLineItem
            key={line.line_number}
            line={line}
            pageNumber={pageData.page_number}
            fontFamily={fontFamily}
            useFallbackFont={useFallbackFont}
            fontType={fontType}
            fontSizeMultiplier={fontSizeMultiplier}
            tajweedEnabled={tajweedEnabled}
            activeAyahKey={activeAyahKey}
            selectedAyahKey={selectedAyahKey}
            onSelectWord={onSelectWord}
          />
        ))}
      </div>

      {/* Bottom Page Number in Mushaf frame */}
      <div className="border-t border-border/50 pt-2.5 mt-3 flex items-center justify-center select-none">
        <span className="font-mono text-xs sm:text-sm font-semibold text-muted-foreground px-3 py-0.5 rounded-full bg-muted/40 border border-border/40">
          {pageData.page_number}
        </span>
      </div>
    </div>
  );
});
