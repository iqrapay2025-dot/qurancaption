"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, Link2, Check, Play, Settings, Repeat, Video, CheckSquare, ArrowRight } from "lucide-react";
import type { Chapter, ApiVerse } from "@/lib/quran/server";
import { DEFAULT_TR1, TRANSLITERATION_ID } from "@/lib/quran/types";
import { adjacentSurahs, showSeparateBismillah, BISMILLAH_ARABIC } from "@/lib/quran/reader";
import {
  ARABIC_SIZE_MAP,
  TRANSLATION_SIZE_MAP,
  ARABIC_SCRIPT_FONTS,
} from "@/lib/quran/settings";
import { useQuranSettings } from "@/lib/quran/useQuranSettings";
import { tajweedGroup } from "@/lib/quran/tajweed";
import { TafsirDrawer } from "./TafsirDrawer";
import { QuranSettingsDrawer } from "./QuranSettingsDrawer";
import { AudioPlayer, type AudioPlayerHandle } from "./AudioPlayer";
import { PracticeDrawer } from "./PracticeDrawer";
import { AyahBookmarkButton } from "./AyahBookmarkButton";
import { OfflineSurahButton } from "./OfflineSurahButton";
import { getOfflineSurahContent } from "@/lib/offline/db";
import { saveContinueReading } from "@/lib/library/storage";
import { buildEditorLink } from "@/lib/editor-link";
import { buildMistakeReportMailto } from "@/lib/mistake-report";
import Attribution from "@/components/Attribution";
import { TourReplayButton } from "@/components/tour/TourReplayButton";

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

  const handleToggleAyahSelection = (n: number) => {
    if (!selectedRange) {
      setSelectedRange({ from: n, to: n });
      return;
    }
    if (n < selectedRange.from) {
      setSelectedRange({ from: n, to: selectedRange.to });
    } else if (n > selectedRange.to) {
      setSelectedRange({ from: selectedRange.from, to: n });
    } else {
      if (n === selectedRange.from && n === selectedRange.to) {
        setSelectedRange(null);
      } else if (n === selectedRange.from) {
        setSelectedRange({ from: n + 1, to: selectedRange.to });
      } else if (n === selectedRange.to) {
        setSelectedRange({ from: selectedRange.from, to: n - 1 });
      } else {
        setSelectedRange({ from: selectedRange.from, to: n });
      }
    }
  };

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
            });
          } else {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
              lastSaveTime = Date.now();
              saveContinueReading({
                surah: chapter.id,
                ayah: bestAyah,
                surahName: chapter.nameSimple,
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

  const handleCopyLink = async (ayahNumber: number) => {
    const url = `${window.location.origin}/quran/${chapter.id}#ayah-${ayahNumber}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAyah(ayahNumber);
      setTimeout(() => setCopiedAyah(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenTafsir = (ayahNumber: number) => {
    setActiveAyahTafsir(ayahNumber);
  };

  const handleCloseTafsir = () => {
    const closedAyah = activeAyahTafsir;
    setActiveAyahTafsir(null);
    if (closedAyah) {
      tafsirButtonRefs.current.get(closedAyah)?.focus();
    }
  };

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

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/quran" className="hover:text-foreground transition-colors whitespace-nowrap">
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
              <span>Settings</span>
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

          {/* Make Captions, Select Mode & Offline Download Controls */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 pt-4 border-t border-border/60">
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
          const isHighlighted = highlightedAyah === v.n || playingAyah === v.n || practiceActiveAyah === v.n;
          const isBlurred = hideText && !revealedAyahs.has(v.n);

          return (
            <div
              key={v.key}
              id={`ayah-${v.n}`}
              data-ayah-num={v.n}
              style={{ contentVisibility: "auto" }}
              className={`group rounded-2xl border p-4 sm:p-6 transition-all duration-500 ${
                isHighlighted
                  ? "border-gold bg-gold/10 ring-2 ring-gold/40 shadow-md"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {/* Row header: Ayah badge & Action buttons */}
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 mb-4">
                <div className="flex items-center gap-2">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={
                        selectedRange !== null &&
                        v.n >= selectedRange.from &&
                        v.n <= selectedRange.to
                      }
                      onChange={() => handleToggleAyahSelection(v.n)}
                      aria-label={`Select ayah ${v.n}`}
                      className="size-4.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  )}
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground/90 font-mono tracking-tight shadow-2xs"
                    title={`Surah ${chapter.id}, Ayah ${v.n}`}
                  >
                    <span className="text-muted-foreground font-normal">{chapter.id}:</span>{v.n}
                  </span>
                </div>

                <div
                  data-tour={v.n === 1 ? "ayah-actions" : undefined}
                  className="flex items-center gap-1 sm:gap-1.5 shrink-0"
                >
                  <button
                    type="button"
                    data-tour={v.n === 1 ? "ayah-practice" : undefined}
                    onClick={() => {
                      setPracticeAyah(v.n);
                      setPracticeOpen(true);
                    }}
                    aria-label={`Practice ayah ${v.n}`}
                    title="Practice (Memorize) this ayah"
                    className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Repeat size={13} className="text-muted-foreground" />
                    <span className="hidden sm:inline">Practice</span>
                  </button>

                  <button
                    type="button"
                    data-tour={v.n === 1 ? "ayah-play" : undefined}
                    onClick={() => playerRef.current?.playFromAyah(v.n)}
                    aria-label={`Play from ayah ${v.n}`}
                    title={`Play from ayah ${v.n}`}
                    className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Play size={13} className="text-muted-foreground" />
                    <span className="hidden sm:inline">Play from here</span>
                    <span className="sm:hidden text-[11px]">Play</span>
                  </button>

                  <button
                    ref={(el) => {
                      if (el) tafsirButtonRefs.current.set(v.n, el);
                      else tafsirButtonRefs.current.delete(v.n);
                    }}
                    type="button"
                    data-tour={v.n === 1 ? "ayah-tafsir" : undefined}
                    onClick={() => handleOpenTafsir(v.n)}
                    aria-label={`Open tafsir for ayah ${v.n}`}
                    title={`Open tafsir for ayah ${v.n}`}
                    className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <BookOpen size={13} className="text-muted-foreground" />
                    <span className="hidden sm:inline">Tafsir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(v.n)}
                    aria-label={`Copy link to ayah ${v.n}`}
                    title="Copy link to this ayah"
                    className="inline-flex min-h-[36px] sm:min-h-[32px] h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {copiedAyah === v.n ? (
                      <>
                        <Check size={13} className="text-primary" />
                        <span className="hidden sm:inline text-primary">Copied</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={13} className="text-muted-foreground" />
                        <span className="hidden sm:inline">Copy link</span>
                      </>
                    )}
                  </button>

                  <div data-tour={v.n === 1 ? "ayah-bookmark" : undefined}>
                    <AyahBookmarkButton
                      surah={chapter.id}
                      ayah={v.n}
                      surahName={chapter.nameSimple}
                    />
                  </div>
                </div>
              </div>

              {/* Ayah Content (Arabic, transliteration, translations) with optional blur */}
              <div
                onClick={() => {
                  if (hideText) {
                    setRevealedAyahs((prev) => {
                      const next = new Set(prev);
                      if (next.has(v.n)) next.delete(v.n);
                      else next.add(v.n);
                      return next;
                    });
                  }
                }}
                className={`transition-all duration-300 ${
                  isBlurred ? "filter blur-md select-none cursor-pointer hover:opacity-80" : ""
                }`}
                title={isBlurred ? "Tap to reveal" : undefined}
              >
                {/* Arabic Verse Text */}
                <div
                  dir="rtl"
                  lang="ar"
                  style={{
                    fontSize: ARABIC_SIZE_MAP[settings.arabicSize],
                    fontFamily: ARABIC_SCRIPT_FONTS[settings.script],
                  }}
                  className="leading-loose text-right text-foreground mb-4 select-text"
                >
                  {settings.tajweed && v.tajweed ? (
                    v.tajweed.map(([t, r], i) => {
                      const g = tajweedGroup(r);
                      return g ? (
                        <span key={i} style={{ color: g.color }}>
                          {t}
                        </span>
                      ) : (
                        <span key={i}>{t}</span>
                      );
                    })
                  ) : (
                    v.arabic
                  )}
                </div>

                {/* Transliteration */}
                {settings.transliteration && v.translations[TRANSLITERATION_ID] && (
                  <div
                    style={{ fontSize: TRANSLATION_SIZE_MAP[settings.translationSize] }}
                    className="italic text-muted-foreground/90 select-text mb-3 leading-relaxed"
                  >
                    {v.translations[TRANSLITERATION_ID]}
                  </div>
                )}

                {/* Translations */}
                <div className="space-y-3">
                  {settings.translations.map((trId) => {
                    const text = v.translations[trId];
                    if (!text) return null;
                    return (
                      <div
                        key={trId}
                        style={{ fontSize: TRANSLATION_SIZE_MAP[settings.translationSize] }}
                        className="leading-relaxed text-muted-foreground select-text"
                      >
                        {settings.translations.length > 1 && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-0.5">
                            {trId.replace(/_/g, " ")}
                          </span>
                        )}
                        {text}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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

        <Link href="/quran" className="hover:text-foreground transition-colors">
          Surah Index
        </Link>

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
