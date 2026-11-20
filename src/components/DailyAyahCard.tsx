"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Play,
  Pause,
  Copy,
  Share2,
  Check,
  Sparkles,
} from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import { pickDailyKey, parseDailyKey } from "@/lib/daily-ayah";
import { DEFAULT_TR1, DEFAULT_RECITER, type ApiVerse, type SurahAudio } from "@/lib/quran/types";
import { SURAH_NAMES_SIMPLE } from "@/lib/quran/reader";

export function DailyAyahCard() {
  const [verse, setVerse] = useState<ApiVerse | null>(null);
  const [surahName, setSurahName] = useState("");
  const [surahNum, setSurahNum] = useState(1);
  const [ayahNum, setAyahNum] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }

    const key = pickDailyKey();
    const parsed = parseDailyKey(key);
    if (!parsed) {
      setFailed(true);
      setLoading(false);
      return;
    }

    setSurahNum(parsed.surah);
    setAyahNum(parsed.ayah);
    const sName = SURAH_NAMES_SIMPLE[parsed.surah - 1] || `Surah ${parsed.surah}`;
    setSurahName(sName);

    // Fetch verse data with default translation
    fetch(`/api/quran/verses?surah=${parsed.surah}&translations=${DEFAULT_TR1}`)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.verses)) {
          const v = data.verses.find((item: ApiVerse) => item.n === parsed.ayah);
          if (v) {
            setVerse(v);
          } else {
            setFailed(true);
          }
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch audio url
    fetch(`/api/quran/audio?surah=${parsed.surah}&reciter=${DEFAULT_RECITER}`)
      .then((res) => res.json())
      .then((data: SurahAudio) => {
        if (Array.isArray(data?.files)) {
          const targetKey = `${parsed.surah}:${parsed.ayah}`;
          const file = data.files.find((f) => f.verseKey === targetKey);
          if (file?.audioUrl) {
            setAudioUrl(file.audioUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleTogglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleCopy = async () => {
    if (!verse) return;
    const trText = verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";
    const url = `${window.location.origin}/quran/${surahNum}#ayah-${ayahNum}`;
    const textToCopy = `${verse.arabic}\n\n${trText}\n\n— ${surahName} ${surahNum}:${ayahNum}\n${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!verse) return;
    const trText = verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";
    const url = `${window.location.origin}/quran/${surahNum}#ayah-${ayahNum}`;
    const textToShare = `${verse.arabic}\n\n${trText}\n— ${surahName} ${surahNum}:${ayahNum}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Ayah Studio — ${surahName} ${surahNum}:${ayahNum}`,
          text: textToShare,
          url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${textToShare}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (failed) {
    // Hide quietly if fetch fails
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <BadgeLoader size="inline" label="Loading daily ayah..." />
      </div>
    );
  }

  if (!verse) return null;

  const translationText =
    verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";

  return (
    <div className="rounded-2xl border border-gold/40 bg-card p-6 sm:p-8 shadow-md relative overflow-hidden transition-all">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3 mb-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
          <Sparkles size={14} /> Daily Ayah
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {surahName} {surahNum}:{ayahNum}
        </span>
      </div>

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {/* Arabic Verse in Amiri Quran Font */}
      <p
        dir="rtl"
        lang="ar"
        style={{ fontFamily: "'Amiri Quran', serif" }}
        className="text-right text-2xl sm:text-3xl leading-loose text-foreground my-3"
      >
        {verse.arabic}
      </p>

      {/* Translation */}
      <p className="text-sm sm:text-base leading-relaxed text-muted-foreground mt-3">
        {translationText}
      </p>

      {/* Reference */}
      <p className="mt-2 text-xs font-medium text-foreground">
        — {surahName} {surahNum}:{ayahNum}
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
        <Link
          href={`/quran/${surahNum}#ayah-${ayahNum}`}
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <BookOpen size={14} /> Read in context
        </Link>

        {audioUrl && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Pause" : "Listen"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-primary" />
              <span className="text-primary">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
