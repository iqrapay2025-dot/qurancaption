"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  Play,
  BookOpen,
  Volume2,
  FileText,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ArrowRight,
  Wifi,
  WifiOff,
  Home,
  ChevronLeft,
} from "lucide-react";
import {
  listOfflineDownloads,
  deleteOfflineSurah,
  deleteOfflineMushafPage,
  clearAllOfflineData,
  formatBytes,
  getStorageUsageSummary,
  listOfflineMushafPages,
  type OfflineDownloadSummary,
} from "@/lib/offline/db";
import {
  downloadCompleteQuranText,
  downloadMushafRange,
} from "@/lib/offline/downloader";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloads, setDownloads] = useState<OfflineDownloadSummary[]>([]);
  const [mushafPages, setMushafPages] = useState<number[]>([]);
  const [storageSummary, setStorageSummary] = useState<{
    totalBytes: number;
    textBytes: number;
    audioBytes: number;
    mushafBytes: number;
    surahsCount: number;
    mushafPagesCount: number;
    availableBytes?: number;
  }>({
    totalBytes: 0,
    textBytes: 0,
    audioBytes: 0,
    mushafBytes: 0,
    surahsCount: 0,
    mushafPagesCount: 0,
  });

  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"all" | "surahs" | "recitations" | "mushaf">("all");

  // Batch download state
  const [textDownloadStatus, setTextDownloadStatus] = useState<"idle" | "downloading" | "complete" | "error">("idle");
  const [textProgress, setTextProgress] = useState<{ done: number; total: number }>({ done: 0, total: 114 });

  const [juz30Status, setJuz30Status] = useState<"idle" | "downloading" | "complete" | "error">("idle");
  const [juz30Progress, setJuz30Progress] = useState<{ done: number; total: number }>({ done: 0, total: 23 });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Online / offline listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pages, summary] = await Promise.all([
        listOfflineDownloads(),
        listOfflineMushafPages(),
        getStorageUsageSummary(),
      ]);
      setDownloads(list);
      setMushafPages(pages);
      setStorageSummary(summary);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Download All 114 Surahs Text
  const handleDownloadAllText = async () => {
    if (textDownloadStatus === "downloading") {
      abortControllerRef.current?.abort();
      setTextDownloadStatus("idle");
      return;
    }

    setTextDownloadStatus("downloading");
    setTextProgress({ done: 0, total: 114 });
    abortControllerRef.current = new AbortController();

    try {
      await downloadCompleteQuranText(
        (done, total) => setTextProgress({ done, total }),
        abortControllerRef.current.signal
      );
      setTextDownloadStatus("complete");
      await refreshData();
    } catch (err: any) {
      if (err?.message !== "Download aborted") {
        setTextDownloadStatus("error");
      }
    }
  };

  // Download Juz 30 (Mushaf Pages 582 to 604)
  const handleDownloadJuz30 = async () => {
    if (juz30Status === "downloading") {
      abortControllerRef.current?.abort();
      setJuz30Status("idle");
      return;
    }

    setJuz30Status("downloading");
    setJuz30Progress({ done: 0, total: 23 });
    abortControllerRef.current = new AbortController();

    try {
      await downloadMushafRange(
        582,
        604,
        (done, total) => setJuz30Progress({ done, total }),
        abortControllerRef.current.signal
      );
      setJuz30Status("complete");
      await refreshData();
    } catch (err: any) {
      if (err?.message !== "Download aborted") {
        setJuz30Status("error");
      }
    }
  };

  // Delete Surah
  const handleDeleteSurah = async (surah: number, reciterId?: number) => {
    await deleteOfflineSurah(surah, reciterId);
    await refreshData();
  };

  // Clear all
  const handleClearAll = async () => {
    await clearAllOfflineData();
    setConfirmClear(false);
    await refreshData();
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Back to Home navigation */}
        <div className="flex items-center justify-between pb-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 -ml-2 rounded-lg hover:bg-muted"
            title="Go back to Home"
          >
            <ChevronLeft size={16} className="text-primary" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-medium text-muted-foreground">Aayah Studio Offline</span>
        </div>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                isOnline ? "bg-primary/10 text-primary border border-primary/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}>
                {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                {isOnline ? "Online" : "Offline Mode"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Offline Downloads &amp; Storage
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOnline
                ? "Download Surahs, audio recitations, and Mushaf pages to read and listen without internet."
                : "You are currently offline. Access your downloaded Surahs, recitations, and Mushaf pages with 0 KB data usage."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="Return to Home"
            >
              <Home size={14} className="text-primary" /> Home
            </Link>
            <Link
              href="/quran"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <BookOpen size={14} /> Read
            </Link>
            <Link
              href="/listen"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Volume2 size={14} /> Listen
            </Link>
          </div>
        </div>

        {/* Storage Summary Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <HardDrive size={16} className="text-primary" />
              <span>Total Used</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-2">
              {formatBytes(storageSummary.totalBytes)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {storageSummary.availableBytes ? `${formatBytes(storageSummary.availableBytes)} free` : "IndexedDB"}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Volume2 size={16} className="text-primary" />
              <span>Audio</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-2">
              {formatBytes(storageSummary.audioBytes)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Recitations saved
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <FileText size={16} className="text-primary" />
              <span>Quran Text</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-2">
              {storageSummary.surahsCount} / 114
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatBytes(storageSummary.textBytes)}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <BookOpen size={16} className="text-primary" />
              <span>Mushaf Pages</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-2">
              {storageSummary.mushafPagesCount} / 604
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatBytes(storageSummary.mushafBytes)}
            </p>
          </div>
        </div>

        {/* 1-Tap Quick Download Packs */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Download size={18} className="text-primary" />
            Quick Offline Download Packs
          </h2>
          <p className="text-xs text-muted-foreground">
            Download entire collections in a single tap so you can read and listen anywhere, anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Pack 1: Complete Quran Text */}
            <div className="p-4 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">
                    Complete Quran Text (All 114 Surahs)
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0 whitespace-nowrap">~4.5 MB</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Downloads all 6,236 verses in Arabic with English translation into local storage.
                </p>
              </div>

              {textDownloadStatus === "downloading" ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Downloading...</span>
                    <span>{textProgress.done} / {textProgress.total} Surahs</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${Math.round((textProgress.done / textProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : storageSummary.surahsCount === 114 ? (
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <CheckCircle2 size={16} /> All 114 Surahs stored offline
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadAllText}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Download size={14} /> Download All 114 Surahs Text
                </button>
              )}
            </div>

            {/* Pack 2: Juz 'Amma Mushaf Pages */}
            <div className="p-4 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">
                    Juz &apos;Amma (Juz 30) Mushaf Pages
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0 whitespace-nowrap">~2.2 MB</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Downloads Madani Mushaf pages 582 to 604 (Surah An-Naba to An-Nas) with QCF fonts.
                </p>
              </div>

              {juz30Status === "downloading" ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Downloading...</span>
                    <span>{juz30Progress.done} / {juz30Progress.total} Pages</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${Math.round((juz30Progress.done / juz30Progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadJuz30}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold transition-colors"
                >
                  <Download size={14} /> Download Juz 30 Mushaf Pages
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Downloaded Surahs & Content List */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Downloaded Surahs &amp; Recitations ({downloads.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved locally in browser IndexedDB for zero-data offline reading, listening, and revision.
              </p>
            </div>
            {downloads.length > 0 && (
              <div>
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90"
                    >
                      Yes, Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-2.5 py-1 rounded border border-border bg-card text-xs hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Clear all downloads
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div role="tablist" aria-label="Filter downloads" className="flex border-b border-border/60 gap-2 sm:gap-4 overflow-x-auto pb-px text-xs font-semibold">
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "all"}
              onClick={() => setFilterTab("all")}
              className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>All Downloads</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterTab === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {downloads.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "surahs"}
              onClick={() => setFilterTab("surahs")}
              className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "surahs"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={13} />
              <span>Quran Surahs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterTab === "surahs" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {downloads.filter((d) => d.hasText).length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "recitations"}
              onClick={() => setFilterTab("recitations")}
              className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "recitations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Volume2 size={13} />
              <span>Recitations</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterTab === "recitations" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {downloads.filter((d) => d.hasAudio).length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "mushaf"}
              onClick={() => setFilterTab("mushaf")}
              className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "mushaf"
                  ? "border-gold text-gold-dark dark:text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen size={13} className={filterTab === "mushaf" ? "text-gold" : "text-muted-foreground"} />
              <span>Madani Mushaf</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                filterTab === "mushaf"
                  ? "bg-gold/20 text-gold-dark dark:text-gold"
                  : "bg-muted text-muted-foreground"
              }`}>
                {mushafPages.length > 0 ? `${mushafPages.length} p.` : downloads.filter((d) => d.hasMushaf).length}
              </span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" /> Loading offline records...
            </div>
          ) : (() => {
            const filtered = downloads.filter((d) => {
              if (filterTab === "surahs") return d.hasText;
              if (filterTab === "recitations") return d.hasAudio;
              if (filterTab === "mushaf") return d.hasMushaf;
              return true;
            });

            if (filtered.length === 0) {
              const emptyLabel =
                filterTab === "surahs"
                  ? "No Quran Surah texts downloaded yet"
                  : filterTab === "recitations"
                  ? "No Recitations downloaded yet"
                  : filterTab === "mushaf"
                  ? "No Madani Mushaf pages downloaded yet"
                  : "No Surahs downloaded yet";

              return (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6">
                  <HardDrive size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-foreground">{emptyLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Use the quick download packs above, or tap the download button on any Surah in the Listen or Read page.
                  </p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-border/60">
                {filtered.map((d) => (
                  <div
                    key={`${d.surah}_${d.reciterId || 0}`}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {d.surah}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{d.surahName}</span>
                          {d.surahNameArabic && (
                            <span className="font-quran text-base text-foreground/80">
                              {d.surahNameArabic}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {d.hasAudio && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Volume2 size={12} /> {d.reciterName || "Reciter"}
                            </span>
                          )}
                          {d.hasText && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <FileText size={12} /> {d.versesCount} verses
                            </span>
                          )}
                          {d.hasMushaf && (
                            <span className="flex items-center gap-1 text-gold-dark dark:text-gold font-medium">
                              <BookOpen size={12} /> KFGQPC Mushaf {d.mushafPages?.length ? `(p. ${d.mushafPages[0]}${d.mushafPages.length > 1 ? `–${d.mushafPages[d.mushafPages.length - 1]}` : ""})` : ""}
                            </span>
                          )}
                          <span>•</span>
                          <span className="font-mono">{formatBytes(d.totalBytes)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      {d.hasAudio && (
                        <Link
                          href={`/listen?surah=${d.surah}&reciter=${d.reciterId || 1}`}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-primary transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Play offline audio"
                        >
                          <Play size={13} className="text-primary fill-primary" />
                          <span>Listen</span>
                        </Link>
                      )}
                      {d.hasText && (
                        <Link
                          href={`/quran/${d.surah}`}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-primary transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Read offline text"
                        >
                          <BookOpen size={13} />
                          <span>Read</span>
                        </Link>
                      )}
                      {d.hasMushaf && (
                        <Link
                          href={`/mushaf/${d.mushafPages?.[0] || 1}`}
                          className="px-2.5 py-1.5 rounded-lg border border-gold/40 bg-gold/10 text-gold-dark dark:text-gold hover:bg-gold/20 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Read offline in Madani Mushaf"
                        >
                          <BookOpen size={13} className="text-gold" />
                          <span>Mushaf</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSurah(d.surah, d.reciterId)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete from offline storage"
                        aria-label={`Delete offline download for Surah ${d.surahName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
