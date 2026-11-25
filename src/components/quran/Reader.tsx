"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Settings, Video, CheckSquare, ArrowRight, Play, Pause, BookOpen, FileText, Sparkles } from "lucide-react";
import { DuaHandsIcon } from "@/components/icons/DuaHandsIcon";
import type { Chapter, ApiVerse } from "@/lib/quran/server";
import { DEFAULT_TR1, TRANSLITERATION_ID } from "@/lib/quran/types";
import { adjacentSurahs, showSeparateBismillah, BISMILLAH_ARABIC } from "@/lib/quran/reader";
import { getSurahMeta } from "@/lib/mushaf/data";
import { useQuranSettings } from "@/lib/quran/useQuranSettings";
import { AudioPlayer, type AudioPlayerHandle } from "./AudioPlayer";
import { AyahRow } from "./AyahRow";
import { OfflineSurahButton } from "./OfflineSurahButton";
import { getOfflineSurahContent } from "@/lib/offline/db";
import { saveContinueReading } from "@/lib/library/storage";
import { buildEditorLink } from "@/lib/editor-link";
import { buildMistakeReportMailto } from "@/lib/mistake-report";
import Attribution from "@/components/Attribution";
import { TourReplayButton } from "@/components/tour/TourReplayButton";
import { TodayPlanChip } from "@/components/planner/TodayPlanChip";

const TafsirDrawer = dynamic(
  () => import("./TafsirDrawer").then((m) => m.TafsirDrawer),
  { ssr: false }
);
const QuranSettingsDrawer = dynamic(
  () => import("./QuranSettingsDrawer").then((m) => m.QuranSettingsDrawer),
  { ssr: false }
);
const PracticeDrawer = dynamic(
  () => import("./PracticeDrawer").then((m) => m.PracticeDrawer),
  { ssr: false }
);

type Props = {
  chapter: Chapter;
  initialVerses: ApiVerse[];
};

export function Reader({ chapter, initialVerses }: Props) {
  const { settings, updateSettings, resetSettings } = useQuranSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAyahTafsir, setActiveAyahTafsir] = useState<number | null>(null);
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [verses, setVerses] = useState<ApiVerse[]>(initialVerses);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceAyah, setPracticeAyah] = useState<number>(1);
  const [practiceActiveAyah, setPracticeActiveAyah] = useState<number | null>(null);
  const [hideText, setHideText] = useState(false);
  const [revealedAyahs, setRevealedAyahs] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  const tafsirButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const playerRef = useRef<AudioPlayerHandle>(null);

  // Fallback to offline stored verses if initialVerses is empty (e.g. offline reload)
  useEffect(() => {
    if (verses.length === 0) {
      getOfflineSurahContent(chapter.id).then((cached) => {
        if (cached && cached.verses.length > 0) {
          setVerses(cached.verses);
        }
      });
    }
  }, [chapter.id, verses.length]);

  const handleToggleAyahSelection = useCallback((n: number) => {
    setSelectedRange((prev) => {
      if (!prev) {
        return { from: n, to: n };
      }
      if (n < prev.from) {
        return { from: n, to: prev.to };
      } else if (n > prev.to) {
        return { from: prev.from, to: n };
      } else {
        if (n === prev.from && n === prev.to) {
          return null;
        } else if (n === prev.from) {
          return { from: n + 1, to: prev.to };
        } else if (n === prev.to) {
          return { from: prev.from, to: n - 1 };
        } else {
          return { from: prev.from, to: n };
        }
      }
    });
  }, []);

  // Dynamic verse fetching when settings differ from SSR initialVerses
  useEffect(() => {
    const needsCustom =
      settings.tajweed ||
      settings.transliteration ||
      settings.translations.length > 1 ||
      (settings.translations.length === 1 && settings.translations[0] !== DEFAULT_TR1);

    if (!needsCustom) {
      setVerses(initialVerses);
      return;
    }

    let active = true;
    const trList = [...settings.translations];
    if (settings.transliteration && !trList.includes(TRANSLITERATION_ID)) {
      trList.push(TRANSLITERATION_ID);
    }
    const url = `/api/quran/verses?surah=${chapter.id}&from=1&to=${chapter.versesCount}&translations=${trList.join(",")}${
      settings.tajweed ? "&tajweed=1" : ""
    }`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.verses)) {
          setVerses(data.verses);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [
    chapter.id,
    chapter.versesCount,
    initialVerses,
    settings.tajweed,
    settings.transliteration,
    settings.translations,
  ]);

  const { prev, next } = adjacentSurahs(chapter.id);
  const hasBismillah = showSeparateBismillah(chapter.id);
  const surahMeta = getSurahMeta(chapter.id);
  const mushafPage = surahMeta ? surahMeta.start_page : 1;

  // Handle URL hash scrolling and highlighting on mount or hashchange
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#ayah-(\d+)$/);
      if (match) {
        const ayahNum = Number(match[1]);
        const el = document.getElementById(`ayah-${ayahNum}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedAyah(ayahNum);
          const t = setTimeout(() => setHighlightedAyah(null), 2000);
          return () => clearTimeout(t);
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Track most visible ayah on screen and save continue reading position at most once a second
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const visibilityMap = new Map<number, number>();
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastSaveTime = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ayahNum = Number(entry.target.getAttribute("data-ayah-num"));
          if (ayahNum) {
            visibilityMap.set(ayahNum, entry.intersectionRatio);
          }
        });

        let bestAyah = 0;
        let maxRatio = 0;
        visibilityMap.forEach((ratio, ayah) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            bestAyah = ayah;
          }
        });

        if (bestAyah > 0 && maxRatio > 0.1) {
          const now = Date.now();
          if (now - lastSaveTime >= 1000) {
            lastSaveTime = now;
            saveContinueReading({
              surah: chapter.id,
              ayah: bestAyah,
              surahName: chapter.nameSimple,
              page: mushafPage,
              mode: "verses",
            });
          } else {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
              lastSaveTime = Date.now();
              saveContinueReading({
                surah: chapter.id,
                ayah: bestAyah,
                surahName: chapter.nameSimple,
                page: mushafPage,
                mode: "verses",
              });
            }, 1000 - (now - lastSaveTime));
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    const elements = document.querySelectorAll("[data-ayah-num]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [chapter.id, chapter.nameSimple, verses]);

  const handleCopyLink = useCallback(async (ayahNumber: number) => {
    const url = `${window.location.origin}/quran/${chapter.id}#ayah-${ayahNumber}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAyah(ayahNumber);
      setTimeout(() => setCopiedAyah(null), 2000);
    } catch {
      // Fallback
    }
  }, [chapter.id]);

  const handleOpenTafsir = useCallback((ayahNumber: number) => {
    setActiveAyahTafsir(ayahNumber);
  }, []);

  const handleCloseTafsir = useCallback(() => {
    const closedAyah = activeAyahTafsir;
    setActiveAyahTafsir(null);
    if (closedAyah) {
      tafsirButtonRefs.current.get(closedAyah)?.focus();
    }
  }, [activeAyahTafsir]);

  const handlePractice = useCallback((n: number) => {
    setPracticeAyah(n);
    setPracticeOpen(true);
  }, []);

  const handlePlayAyah = useCallback((n: number) => {
    playerRef.current?.playAyah(n, "single");
  }, []);

  const handleToggleReveal = useCallback((n: number) => {
    setRevealedAyahs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const setTafsirButtonRef = useCallback((n: number, el: HTMLButtonElement | null) => {
    if (el) tafsirButtonRefs.current.set(n, el);
    else tafsirButtonRefs.current.delete(n);
  }, []);

  const activeVerse = verses.find((v) => v.n === activeAyahTafsir);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 pb-28 sm:pb-36">
      {/* Top Navigation & Surah Header */}
      <div className="mb-10 text-center">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs sm:text-sm font-medium text-muted-foreground">
          {prev ? (
            <Link
              href={`/quran/${prev.id}`}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
            >
              <ChevronLeft size={16} className="shrink-0" /> <span className="truncate">{prev.nameSimple}</span>
            </Link>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop: Verses / Mushaf Switch */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg border border-border bg-muted/60 text-xs">
              <span
                className="px-2 py-1 rounded-md bg-background text-foreground shadow-2xs font-semibold flex items-center gap-1"
                title="Currently in Verse-by-verse translation view"
              >
                <FileText size={13} className="text-primary" />
                <span>Verses</span>
              </span>
              <Link
                href={`/mushaf/${mushafPage}`}
                className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-medium"
                title="Switch to Madani Mushaf page view"
              >
                <BookOpen size={13} />
                <span>Mushaf</span>
              </Link>
            </div>

            {/* Mobile: Compact single button to switch to Mushaf view */}
            <Link
              href={`/mushaf/${mushafPage}`}
              className="sm:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="Switch to Madani Mushaf view"
            >
              <BookOpen size={13} className="text-primary" />
              <span>Mushaf</span>
            </Link>

            <Link href="/quran" className="hover:text-foreground transition-colors whitespace-nowrap hidden md:inline">
              Surah Index
            </Link>
            <TourReplayButton tourId="quran-reader" />
            <button
              type="button"
              data-tour="reader-settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Display settings"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          {next ? (
            <Link
              href={`/quran/${next.id}`}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
            >
              <span className="truncate">{next.nameSimple}</span> <ChevronRight size={16} className="shrink-0" />
            </Link>
          ) : (
            <span />
          )}
        </div>

        <div data-tour="surah-nav-header" className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div
            dir="rtl"
            lang="ar"
            className="font-quran text-4xl sm:text-5xl text-foreground mb-3 leading-relaxed"
          >
            {chapter.nameArabic}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {chapter.nameSimple}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Reading and listening are free. No account needed.
          </p>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            {chapter.meaning} · {chapter.versesCount} verses
          </p>

          {/* Make Captions, Play Entire Surah, Select Mode & Offline Download Controls */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                if (playingAyah !== null && playerRef.current?.getPlaybackScope() === "continuous") {
                  playerRef.current?.stop();
                } else {
                  playerRef.current?.playEntireSurah(1);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                playingAyah !== null && playerRef.current?.getPlaybackScope() === "continuous"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
              title="Play all verses of this surah continuously"
            >
              {playingAyah !== null && playerRef.current?.getPlaybackScope() === "continuous" ? (
                <>
                  <Pause size={14} /> Pause surah
                </>
              ) : (
                <>
                  <Play size={14} className="text-primary" /> Play entire surah
                </>
              )}
            </button>
            <Link
              href={buildEditorLink({ surah: chapter.id })}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Video size={14} /> Make captions from this surah
            </Link>
            <button
              type="button"
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedRange(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-sm border border-border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectMode
                  ? "bg-muted text-foreground border-foreground/30"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <CheckSquare size={14} />
              {selectMode ? "Exit select mode" : "Select ayahs"}
            </button>
            <OfflineSurahButton
              chapter={chapter}
              reciterId={playerRef.current?.getReciterId?.() || 1}
              reciterName={
                playerRef.current?.getReciters?.().find((r) => r.id === (playerRef.current?.getReciterId?.() || 1))?.name ||
                "Mishari Rashid al-`Afasy"
              }
            />
          </div>
        </div>

        {/* Separate Bismillah Banner */}
        {hasBismillah && (
          <div className="mt-8 text-center" aria-label="Bismillah">
            <p
              dir="rtl"
              lang="ar"
              className="font-quran text-2xl sm:text-3xl text-foreground/90 select-none py-2"
            >
              {BISMILLAH_ARABIC}
            </p>
          </div>
        )}
      </div>

      {/* Verses List */}
      <div className="space-y-4">
        {verses.map((v) => {
          const isHighlighted =
            highlightedAyah === v.n ||
            playingAyah === v.n ||
            practiceActiveAyah === v.n;
          const isBlurred = hideText && !revealedAyahs.has(v.n);
          const isSelected =
            selectMode &&
            selectedRange !== null &&
            v.n >= selectedRange.from &&
            v.n <= selectedRange.to;

          return (
            <AyahRow
              key={v.key}
              v={v}
              chapterId={chapter.id}
              chapterNameSimple={chapter.nameSimple}
              isHighlighted={isHighlighted}
              isPlaying={playingAyah === v.n}
              isBlurred={isBlurred}
              hideText={hideText}
              selectMode={selectMode}
              isSelected={isSelected}
              isCopied={copiedAyah === v.n}
              settings={settings}
              onToggleSelect={handleToggleAyahSelection}
              onPractice={handlePractice}
              onPlay={handlePlayAyah}
              onOpenTafsir={handleOpenTafsir}
              onCopyLink={handleCopyLink}
              onToggleReveal={handleToggleReveal}
              setTafsirButtonRef={setTafsirButtonRef}
            />
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm font-medium text-muted-foreground">
        {prev ? (
          <Link
            href={`/quran/${prev.id}`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} /> {prev.nameSimple}
          </Link>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <Link href="/quran" className="hover:text-foreground transition-colors">
            Surah Index
          </Link>
          <span className="text-border">·</span>
          <TodayPlanChip />
          <span className="text-border">·</span>
          <Link
            href="/adhkar"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline transition-colors"
          >
            <DuaHandsIcon size={13} />
            <span>Daily adhkar →</span>
          </Link>
        </div>

        {next ? (
          <Link
            href={`/quran/${next.id}`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {next.nameSimple} <ChevronRight size={16} />
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* Source Credits & Attribution */}
      <div className="mt-12 rounded-lg border border-border bg-card p-5">
        <Attribution
          translations={[
            {
              id: DEFAULT_TR1,
              name: "Sahih International",
              author: "Saheeh International",
              language: "english",
            },
          ]}
        />
        <div className="mt-4 pt-3 border-t border-border/60 text-center text-xs text-muted-foreground">
          Notice an error in text or audio?{" "}
          <a
            href={buildMistakeReportMailto()}
            className="text-primary underline hover:text-foreground transition-colors"
          >
            Report a mistake
          </a>
        </div>
      </div>

      {/* Tafsir Drawer */}
      <TafsirDrawer
        surah={chapter.id}
        ayah={activeAyahTafsir ?? 1}
        totalVerses={chapter.versesCount}
        arabicText={activeVerse?.arabic}
        isOpen={activeAyahTafsir !== null}
        onClose={handleCloseTafsir}
        onNavigateAyah={(newAyah) => setActiveAyahTafsir(newAyah)}
      />

      {/* Settings Drawer */}
      <QuranSettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
      />

      {/* Practice / Memorize Drawer */}
      <PracticeDrawer
        isOpen={practiceOpen}
        onClose={() => {
          setPracticeOpen(false);
        }}
        onOpen={() => {
          setPracticeOpen(true);
        }}
        chapter={chapter}
        selectedAyah={practiceAyah}
        onActiveAyahChange={setPracticeActiveAyah}
        onHideTextChange={setHideText}
        getAudioFiles={() => playerRef.current?.getAudioFiles() ?? []}
        reciterName={
          playerRef.current
            ?.getReciters()
            .find((r) => r.id === playerRef.current?.getReciterId())?.name
        }
        reciterId={playerRef.current?.getReciterId()}
        onStopOtherAudio={() => playerRef.current?.stop()}
        verses={verses}
        onOpenTafsir={(ayah) => setActiveAyahTafsir(ayah)}
      />

      {/* Sticky Range Selection Bar */}
      {selectMode && selectedRange && (
        <div className="fixed bottom-20 sm:bottom-24 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-md w-full rounded-xl border border-gold bg-card/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Caption Selection
            </p>
            <p className="text-sm font-bold text-foreground truncate">
              {selectedRange.from === selectedRange.to
                ? `Ayah ${selectedRange.from}`
                : `Ayahs ${selectedRange.from}–${selectedRange.to}`}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                ({selectedRange.to - selectedRange.from + 1} verses)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedRange(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Reset
            </button>
            <Link
              href={buildEditorLink({
                surah: chapter.id,
                from: selectedRange.from,
                to: selectedRange.to,
              })}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-xs"
            >
              Make captions <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Audio Player */}
      <AudioPlayer
        ref={playerRef}
        chapter={chapter}
        onActiveAyahChange={setPlayingAyah}
      />
    </div>
  );
}
