"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Download, Check, Loader2, Trash2, HardDrive } from "lucide-react";
import {
  hasOfflineFullAudio,
  getOfflineFullAudio,
  deleteOfflineFullAudio,
  formatBytes,
} from "@/lib/offline/db";
import { downloadFullSurahAudio } from "@/lib/offline/downloader";

interface OfflineAudioButtonProps {
  surah: number;
  reciterId: number;
  reciterName: string;
  audioUrl?: string | null;
  className?: string;
  variant?: "pill" | "icon";
}

export function OfflineAudioButton({
  surah,
  reciterId,
  reciterName,
  audioUrl,
  className = "",
  variant = "pill",
}: OfflineAudioButtonProps) {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const offline = await getOfflineFullAudio(surah, reciterId);
      if (offline) {
        setIsDownloaded(true);
        setFileSize(offline.sizeBytes);
      } else {
        setIsDownloaded(false);
        setFileSize(null);
      }
    } catch {
      setIsDownloaded(false);
    }
  }, [surah, reciterId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (downloading) {
      // Cancel
      abortControllerRef.current?.abort();
      setDownloading(false);
      setProgress(0);
      return;
    }

    if (isDownloaded) {
      // Toggle / ask to delete
      const ok = window.confirm(
        `Remove offline audio for Surah ${surah} (${reciterName}) to free space?`
      );
      if (ok) {
        await deleteOfflineFullAudio(surah, reciterId);
        setIsDownloaded(false);
        setFileSize(null);
      }
      return;
    }

    if (!audioUrl) return;

    setDownloading(true);
    setProgress(5);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      await downloadFullSurahAudio({
        surah,
        reciterId,
        reciterName,
        audioUrl,
        onProgress: (pct) => setProgress(pct),
        signal: abortControllerRef.current.signal,
      });
      setIsDownloaded(true);
      await checkStatus();
    } catch (err: any) {
      if (err?.message !== "Download aborted") {
        setError(err?.message || "Download failed");
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={!audioUrl && !isDownloaded}
        title={
          downloading
            ? `Downloading ${progress}% (Click to cancel)`
            : isDownloaded
            ? `Downloaded (${formatBytes(fileSize || 0)}). Click to remove.`
            : "Download for offline listening"
        }
        aria-label={isDownloaded ? "Offline audio downloaded" : "Download offline audio"}
        className={`relative grid size-8 sm:size-9 place-items-center rounded-lg border transition-colors touch-manipulation ${
          isDownloaded
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            : downloading
            ? "border-gold/50 bg-gold/10 text-gold"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
        } ${className}`}
      >
        {downloading ? (
          <div className="flex flex-col items-center">
            <Loader2 size={15} className="animate-spin text-gold" />
          </div>
        ) : isDownloaded ? (
          <Check size={16} className="text-primary" />
        ) : (
          <Download size={15} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!audioUrl && !isDownloaded}
      title={
        downloading
          ? `Downloading ${progress}% (Click to cancel)`
          : isDownloaded
          ? `Downloaded (${formatBytes(fileSize || 0)}). Click to remove.`
          : "Download for offline listening"
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
        isDownloaded
          ? "border-primary/40 bg-primary/10 text-primary hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          : downloading
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
    >
      {downloading ? (
        <>
          <Loader2 size={13} className="animate-spin text-gold shrink-0" />
          <span className="font-mono text-[11px]">{progress}%</span>
        </>
      ) : isDownloaded ? (
        <>
          <Check size={13} className="text-primary shrink-0" />
          <span className="text-[11px] font-semibold">Offline</span>
          {fileSize ? (
            <span className="text-[10px] text-primary/80 font-mono hidden sm:inline">
              ({formatBytes(fileSize)})
            </span>
          ) : null}
        </>
      ) : (
        <>
          <Download size={13} className="shrink-0" />
          <span className="text-[11px]">Save Offline</span>
        </>
      )}
      {error && <span className="text-[10px] text-destructive ml-1">{error}</span>}
    </button>
  );
}
