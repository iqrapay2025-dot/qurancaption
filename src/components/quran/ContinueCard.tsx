"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Headphones, X, ArrowRight } from "lucide-react";
import {
  getLibrary,
  subscribeLibrary,
  clearContinueHistory,
  type ContinueReading,
  type ContinueListening,
} from "@/lib/library/storage";

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function ContinueCard({ className = "" }: { className?: string }) {
  const [reading, setReading] = useState<ContinueReading | null>(null);
  const [listening, setListening] = useState<ContinueListening | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const lib = getLibrary();
      setReading(lib.reading);
      setListening(lib.listening);
    };

    update();
    const unsubscribe = subscribeLibrary((lib) => {
      setReading(lib.reading);
      setListening(lib.listening);
    });

    return () => unsubscribe();
  }, []);

  if (!mounted || (!reading && !listening)) {
    return null;
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    clearContinueHistory();
    setReading(null);
    setListening(null);
  };

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Continue where you left off
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Clear recent reading and listening history"
        >
          <X size={13} /> Clear history
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {reading && (
          <Link
            href={`/quran/${reading.surah}#ayah-${reading.ayah}`}
            className="flex-1 flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/60 p-3 hover:border-gold hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpen size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Continue reading</p>
                <p className="font-medium text-sm text-foreground truncate">
                  {reading.surahName ? `${reading.surahName}, ` : ""}ayah {reading.ayah}
                </p>
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:text-gold shrink-0 transition-colors"
            />
          </Link>
        )}

        {listening && (
          <Link
            href={`/listen?surah=${listening.surah}&reciter=${listening.reciterId}&t=${Math.floor(listening.time)}`}
            className="flex-1 flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/60 p-3 hover:border-gold hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Headphones size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Continue listening</p>
                <p className="font-medium text-sm text-foreground truncate">
                  {listening.surahName ? `${listening.surahName}, ` : `Surah ${listening.surah}, `}
                  {formatSeconds(listening.time)}
                </p>
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:text-gold shrink-0 transition-colors"
            />
          </Link>
        )}
      </div>
    </div>
  );
}
