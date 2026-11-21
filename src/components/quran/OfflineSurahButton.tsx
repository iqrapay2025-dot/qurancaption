"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Download,
  CheckCircle2,
  Loader2,
  Trash2,
  HardDrive,
  AlertCircle,
  X,
  Volume2,
} from "lucide-react";
import type { Chapter } from "@/lib/quran/server";
import {
  getOfflineSurahContent,
  getOfflineSurahAudio,
  deleteOfflineSurahContent,
  deleteOfflineSurahAudio,
  formatBytes,
} from "@/lib/offline/db";
import { downloadSurahPackage, type DownloadProgress } from "@/lib/offline/downloader";

interface Props {
  chapter: Chapter;
  reciterId?: number;
  reciterName?: string;
}

export function OfflineSurahButton({
  chapter,
  reciterId = 1,
  reciterName = "Mishari Rashid al-`Afasy",
}: Props) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Check download status for this surah & reciter
  const checkStatus = useCallback(async () => {
    try {
      const [content, audio] = await Promise.all([
        getOfflineSurahContent(chapter.id),
        getOfflineSurahAudio(chapter.id, reciterId),
      ]);

      const hasContent = !!content && content.verses.length > 0;
      const hasAudio = !!audio && audio.files.length > 0;

      setIsDownloaded(hasContent && hasAudio);
      setTotalSize(audio?.totalBytes || 0);
    } catch {
      setIsDownloaded(false);
    }
  }, [chapter.id, reciterId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle outside click to close menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setErrorMsg(null);
    abortControllerRef.current = new AbortController();

    try {
      await downloadSurahPackage({
        surah: chapter.id,
        chapter,
        reciterId,
        reciterName,
        signal: abortControllerRef.current.signal,
        onProgress: (p) => {
          setProgress(p);
        },
      });

      await checkStatus();
      setIsDownloading(false);
      setProgress(null);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setErrorMsg("Download cancelled");
      } else {
        setErrorMsg(err?.message || "Failed to download");
      }
      setIsDownloading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloading(false);
    setProgress(null);
  };

  const handleDelete = async () => {
    try {
      await Promise.all([
        deleteOfflineSurahContent(chapter.id),
        deleteOfflineSurahAudio(chapter.id, reciterId),
      ]);
      await checkStatus();
      setMenuOpen(false);
    } catch {
      setErrorMsg("Failed to delete offline data");
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={
          isDownloading
            ? `Downloading ${progress?.percent || 0}%`
            : isDownloaded
            ? "Surah available offline"
            : "Download Surah for offline"
        }
        className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring ${
          isDownloaded
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            : isDownloading
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        {isDownloading ? (
          <>
            <Loader2 size={13} className="animate-spin text-primary" />
            <span>{progress?.percent || 0}%</span>
          </>
        ) : isDownloaded ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Offline ready</span>
            <span className="sm:hidden">Offline</span>
          </>
        ) : (
          <>
            <Download size={13} />
            <span className="hidden sm:inline">Download offline</span>
            <span className="sm:hidden">Offline</span>
          </>
        )}
      </button>

      {/* Popover Card */}
      {menuOpen && (
        <div
          role="dialog"
          aria-label="Offline download settings"
          className="absolute right-0 top-full mt-2 z-30 w-72 sm:w-80 rounded-xl border border-border bg-card p-4 shadow-xl text-foreground text-xs transition-all"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/80">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <HardDrive size={15} className="text-primary" />
              <span>Offline Muraja&apos;a &amp; Reading</span>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Download Surah {chapter.nameSimple} ({chapter.versesCount} verses) to read, listen, and revise in Practice mode without internet.
            </p>

            <div className="rounded-lg bg-muted/60 p-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Verses &amp; Translations</span>
                <span className="font-medium text-foreground">Included</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Volume2 size={12} /> Reciter audio
                </span>
                <span className="font-medium text-foreground truncate max-w-[120px]">
                  {reciterName}
                </span>
              </div>
              {isDownloaded && totalSize > 0 && (
                <div className="flex items-center justify-between text-muted-foreground border-t border-border/50 pt-1">
                  <span>Storage used</span>
                  <span className="font-semibold text-foreground">{formatBytes(totalSize)}</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                <AlertCircle size={13} />
                <span>{errorMsg}</span>
              </div>
            )}

            {isDownloading && progress && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>
                    {progress.stage === "text"
                      ? "Downloading verses..."
                      : `Downloading audio (${progress.completedAyahs}/${progress.totalAyahs})`}
                  </span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              {isDownloading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive py-1.5 font-medium hover:bg-destructive/20 transition-colors"
                >
                  Cancel download
                </button>
              ) : isDownloaded ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm border border-border bg-card py-1.5 font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                >
                  <Trash2 size={13} /> Remove download
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary py-2 font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
                >
                  <Download size={13} /> Download ({chapter.versesCount} verses)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
