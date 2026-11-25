"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DuaHandsIcon } from "@/components/icons/DuaHandsIcon";

interface MushafFooterProps {
  pageNumber: number;
  onPageChange: (newPage: number) => void;
}

export function MushafFooter({ pageNumber, onPageChange }: MushafFooterProps) {
  const canGoPrev = pageNumber > 1;
  const canGoNext = pageNumber < 604;

  return (
    <footer className="w-full border-t border-border/80 bg-background/95 backdrop-blur-sm py-4 px-3">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        {/* Pagination buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => onPageChange(pageNumber - 1)}
            aria-label="Previous Page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Prev Page</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-mono font-medium text-foreground">
            <span>Page {pageNumber}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">604</span>
          </div>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => onPageChange(pageNumber + 1)}
            aria-label="Next Page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Next Page</span>
            <ChevronRight size={16} />
          </button>

          <Link
            href="/adhkar"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors ml-1"
          >
            <DuaHandsIcon size={13} />
            <span>Daily adhkar →</span>
          </Link>
        </div>

        {/* Attribution required by acceptance criteria */}
        <p className="text-[11px] text-muted-foreground text-center">
          Quran text & fonts provided by{" "}
          <a
            href="https://quran.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Quran Foundation / Quran.com
          </a>{" "}
          (KFGQPC King Fahd Complex).
        </p>
      </div>
    </footer>
  );
}
