"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MushafPageData, MushafWord, MushafFontType } from "@/lib/mushaf/types";
import { getSurahMeta } from "@/lib/mushaf/data";
import { useMushafFont } from "./useMushafFont";
import { MushafHeader } from "./MushafHeader";
import { MushafPage } from "./MushafPage";
import { MushafFooter } from "./MushafFooter";
import { AyahBottomSheet } from "./AyahBottomSheet";
import { Reciter, DEFAULT_RECITER } from "@/lib/quran/types";
import { saveContinueReading } from "@/lib/library/storage";
import { registerAudioPlayback, notifyAudioPlaybackStarted } from "@/lib/audio/single-audio";
import {
  getOfflineMushafPage,
  saveOfflineMushafPage,
  getOfflineSurahAudio,
} from "@/lib/offline/db";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

const TafsirDrawer = dynamic(
  () => import("@/components/quran/TafsirDrawer").then((m) => m.TafsirDrawer),
  { ssr: false }
);

interface MushafViewProps {
  initialPageData: MushafPageData;
  initialPageNumber: number;
}

export function MushafView({ initialPageData, initialPageNumber }: MushafViewProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<number>(initialPageNumber);
  const [pageData, setPageData] = useState<MushafPageData>(initialPageData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Font settings & scaling
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1);
  const [fontType, setFontType] = useState<MushafFontType>("kfgqpc");
  const [tajweedEnabled, setTajweedEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedSize = localStorage.getItem("qcs-mushaf-font-size");
      if (savedSize) {
        const val = parseFloat(savedSize);
        if (!isNaN(val) && val >= 0.7 && val <= 1.6) {
          setFontSizeMultiplier(val);
        }
      }
      const savedType = localStorage.getItem("qcs-mushaf-font-type");
      if (savedType === "kfgqpc" || savedType === "amiri" || savedType === "uthmanic") {
        setFontType(savedType as MushafFontType);
      }
      const savedTajweed = localStorage.getItem("qcs-mushaf-tajweed");
      if (savedTajweed === "true") {
        setTajweedEnabled(true);
      }
    } catch {}
  }, []);

  const handleFontSizeChange = (multiplier: number) => {
    const clamped = Math.max(0.7, Math.min(1.6, multiplier));
    setFontSizeMultiplier(clamped);
    try {
      localStorage.setItem("qcs-mushaf-font-size", String(clamped));
    } catch {}
  };

  const handleFontTypeChange = (type: MushafFontType) => {
    setFontType(type);
    try {
      localStorage.setItem("qcs-mushaf-font-type", type);
    } catch {}
  };

  const handleTajweedChange = (enabled: boolean) => {
    setTajweedEnabled(enabled);
    try {
      localStorage.setItem("qcs-mushaf-tajweed", String(enabled));
    } catch {}
  };

  // Font loading
  const { isLoaded: fontLoaded, error: fontError, fontFamily } = useMushafFont(currentPage, fontType);

  // Selection & Bottom Sheet
  const [selectedWord, setSelectedWord] = useState<MushafWord | null>(null);
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  // Tafsir state
  const [tafsirSurah, setTafsirSurah] = useState<number | null>(null);
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);

  // Audio Playback
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [reciterId, setReciterId] = useState<number>(DEFAULT_RECITER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = Number(saved);
        if (Number.isInteger(parsed) && parsed > 0) setReciterId(parsed);
      }
    } catch {}
  }, []);

  const [activeAyahKey, setActiveAyahKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load Reciters list
  useEffect(() => {
    fetch("/api/quran/reciters")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReciters(data);
        else if (data && Array.isArray(data.reciters)) setReciters(data.reciters);
      })
      .catch(() => {
        // Fallback or ignore
      });
  }, []);

  // Save Reciter preference
  const handleSelectReciter = (id: number) => {
    setReciterId(id);
    try {
      localStorage.setItem("qcs-quran-reciter", String(id));
    } catch {}
  };

  // Register with Single-Audio coordinator
  useEffect(() => {
    const unregister = registerAudioPlayback("reader", () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });
    return () => unregister();
  }, []);

  // Save 'Continue reading' and update document title on page change
  useEffect(() => {
    if (pageData && pageData.surahs && pageData.surahs.length > 0) {
      const primarySurah = pageData.surahs[0];
      const firstVerseKey = pageData.verse_keys[0] || `${primarySurah.id}:1`;
      const [s, a] = firstVerseKey.split(":").map(Number);
      saveContinueReading({
        surah: s || primarySurah.id,
        ayah: a || 1,
        surahName: primarySurah.name_simple,
        page: currentPage,
        mode: "mushaf",
      });
      if (typeof document !== "undefined") {
        document.title = `Mushaf Page ${currentPage} — Madani Mushaf | Aayah Studio`;
      }
    }
  }, [currentPage, pageData]);

  // Page navigation
  const navigateToPage = useCallback(
    async (newPage: number) => {
      const p = Math.min(604, Math.max(1, Math.floor(newPage)));
      if (p === currentPage && pageData) return;

      setLoading(true);
      setError(null);
      setCurrentPage(p);
      window.history.pushState(null, "", `/mushaf/${p}`);

      try {
        // 1. Try offline IndexedDB cache first
        const offline = await getOfflineMushafPage(p);
        if (offline && offline.lines && offline.lines.length > 0) {
          setPageData(offline);
          setLoading(false);
          return;
        }

        // 2. Fetch from network
        const res = await fetch(`/api/quran/mushaf?page=${p}`);
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();
        setPageData(data);
        saveOfflineMushafPage(data).catch(() => {});
      } catch (err: any) {
        // Fallback to offline if fetch failed
        const offline = await getOfflineMushafPage(p).catch(() => null);
        if (offline && offline.lines && offline.lines.length > 0) {
          setPageData(offline);
        } else {
          setError(err.message || "Failed to load page");
        }
      } finally {
        setLoading(false);
      }
    },
    [currentPage, pageData]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageDown") {
        if (currentPage < 604) navigateToPage(currentPage + 1);
      } else if (e.key === "ArrowRight" || e.key === "PageUp") {
        if (currentPage > 1) navigateToPage(currentPage - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, navigateToPage]);

  // Touch Swipe gestures (RTL-aware)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Ensure horizontal gesture
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swiped Left -> in RTL Mushaf, this turns to NEXT page
        if (currentPage < 604) navigateToPage(currentPage + 1);
      } else {
        // Swiped Right -> in RTL Mushaf, this turns to PREVIOUS page
        if (currentPage > 1) navigateToPage(currentPage - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Ayah Selection & Action Sheet
  const handleSelectWord = (word: MushafWord) => {
    setSelectedWord(word);
    setSheetOpen(true);
  };

  // Play Ayah Audio
  const handlePlayAyah = async (verseKey: string) => {
    if (isPlaying && activeAyahKey === verseKey) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    notifyAudioPlaybackStarted("reader");

    const [sStr, aStr] = verseKey.split(":");
    const surah = parseInt(sStr, 10);
    const ayah = parseInt(aStr, 10);

    try {
      let audioUrlToPlay: string | null = null;

      // 1. Try offline stored verse audio
      try {
        const offlineAudio = await getOfflineSurahAudio(surah, reciterId);
        const matchOffline = offlineAudio?.files?.find((f) => f.verseKey === verseKey);
        if (matchOffline?.audioUrl) {
          audioUrlToPlay = matchOffline.audioUrl;
        }
      } catch {}

      // 2. Fetch from network if not cached offline
      if (!audioUrlToPlay) {
        const res = await fetch(`/api/quran/audio?surah=${surah}&reciter=${reciterId}`);
        if (!res.ok) throw new Error("Failed to load audio");
        const audioData = await res.json();
        const files: { verseKey: string; audioUrl: string }[] = audioData.files || [];
        const match = files.find((f) => f.verseKey === verseKey);

        if (!match || !match.audioUrl) {
          throw new Error("Ayah audio file not found");
        }
        audioUrlToPlay = match.audioUrl;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrlToPlay;
      setActiveAyahKey(verseKey);
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setActiveAyahKey(null);
      };

      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setActiveAyahKey(null);
      };

      await audioRef.current.play();
    } catch (err) {
      console.error("Audio play error:", err);
      setIsPlaying(false);
      setActiveAyahKey(null);
    }
  };

  // Open Tafsir
  const handleOpenTafsir = (surah: number, ayah: number) => {
    setTafsirSurah(surah);
    setTafsirAyah(ayah);
  };

  // Calculate full Ayah Arabic text & translation for the currently selected word's ayah
  const fullAyahWords = useMemo(() => {
    if (!selectedWord) return [];
    const allWords: MushafWord[] = pageData.lines.flatMap((l) => l.words || []);
    return allWords.filter((w: MushafWord) => w.verse_key === selectedWord.verse_key);
  }, [selectedWord, pageData]);

  const fullAyahArabic = useMemo(() => {
    if (!fullAyahWords.length) return "";
    return fullAyahWords
      .filter((w: MushafWord) => w.char_type_name !== "end")
      .map((w: MushafWord) => w.text_uthmani || w.text_qpc_hafs || "")
      .join(" ");
  }, [fullAyahWords]);

  const fullAyahTranslation = useMemo(() => {
    if (!fullAyahWords.length) return "";
    return fullAyahWords
      .filter((w: MushafWord) => w.char_type_name !== "end" && !!w.translation?.text)
      .map((w: MushafWord) => w.translation?.text)
      .join(" ");
  }, [fullAyahWords]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-gold/30">
      {/* Header */}
      <MushafHeader
        pageNumber={currentPage}
        juzNumber={pageData.juz_number}
        surahs={pageData.surahs}
        onPageChange={navigateToPage}
        reciters={reciters}
        selectedReciterId={reciterId}
        onSelectReciter={handleSelectReciter}
        fontSizeMultiplier={fontSizeMultiplier}
        onFontSizeChange={handleFontSizeChange}
        fontType={fontType}
        onFontTypeChange={handleFontTypeChange}
        tajweedEnabled={tajweedEnabled}
        onTajweedChange={handleTajweedChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground animate-fade-in">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm font-medium">Loading Mushaf page {currentPage}...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center p-6 rounded-2xl border border-destructive/30 bg-destructive/5 max-w-md">
            <AlertCircle className="text-destructive" size={36} />
            <p className="font-semibold text-foreground">Could not load Mushaf page</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => navigateToPage(currentPage)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <MushafPage
            pageData={pageData}
            fontFamily={fontFamily}
            useFallbackFont={fontError || !fontLoaded}
            fontType={fontType}
            fontSizeMultiplier={fontSizeMultiplier}
            tajweedEnabled={tajweedEnabled}
            activeAyahKey={activeAyahKey}
            selectedAyahKey={selectedWord?.verse_key}
            onSelectWord={handleSelectWord}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}
      </main>

      {/* Footer */}
      <MushafFooter pageNumber={currentPage} onPageChange={navigateToPage} />

      {/* Ayah Bottom Sheet */}
      {selectedWord && (
        <AyahBottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          verseKey={selectedWord.verse_key}
          selectedWord={selectedWord}
          fullAyahArabic={fullAyahArabic}
          fullAyahTranslation={fullAyahTranslation}
          isPlayingAyah={isPlaying && activeAyahKey === selectedWord.verse_key}
          onPlayAyah={handlePlayAyah}
          onOpenTafsir={handleOpenTafsir}
        />
      )}

      {/* Tafsir Drawer */}
      {tafsirSurah !== null && tafsirAyah !== null && (
        <TafsirDrawer
          surah={tafsirSurah}
          ayah={tafsirAyah}
          totalVerses={getSurahMeta(tafsirSurah)?.verses_count || 286}
          isOpen={true}
          onClose={() => {
            setTafsirSurah(null);
            setTafsirAyah(null);
          }}
          onNavigateAyah={(newAyah) => setTafsirAyah(newAyah)}
        />
      )}
    </div>
  );
}
