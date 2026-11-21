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
  Download,
  Loader2,
  X,
} from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import { pickDailyKey, parseDailyKey } from "@/lib/daily-ayah";
import { DEFAULT_TR1, DEFAULT_RECITER, type ApiVerse, type SurahAudio } from "@/lib/quran/types";
import { SURAH_NAMES_SIMPLE } from "@/lib/quran/reader";
import {
  renderAyahImage,
  buildDailyAyahFilename,
} from "@/lib/daily-ayah-image";
import { registerAudioPlayback, notifyAudioPlaybackStarted } from "@/lib/audio/single-audio";

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
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [imageFormat, setImageFormat] = useState<"png" | "jpg">("png");
  const [imageTheme, setImageTheme] = useState<"light" | "dark">("dark");
  const [renderingImage, setRenderingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Detect current theme
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setImageTheme(isDark ? "dark" : "light");
    }

    if (typeof navigator !== "undefined") {
      if (typeof navigator.share === "function") {
        setCanShare(true);
        try {
          if (typeof navigator.canShare === "function") {
            const testFile = new File(["test"], "test.png", { type: "image/png" });
            if (navigator.canShare({ files: [testFile] })) {
              setCanShareFiles(true);
            }
          }
        } catch {}
      }
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

  useEffect(() => {
    if (!imageMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImageMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setImageMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [imageMenuOpen]);

  const handleExportImage = async (action: "download" | "share" = "download") => {
    if (!verse) return;
    setRenderingImage(true);
    setImageError(null);

    const trText =
      verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";

    try {
      const blob = await renderAyahImage({
        arabic: verse.arabic,
        translation: trText,
        reference: `— ${surahName} ${surahNum}:${ayahNum}`,
        surah: surahNum,
        ayah: ayahNum,
        theme: imageTheme,
        format: imageFormat,
      });

      const filename = buildDailyAyahFilename(surahNum, ayahNum, imageFormat);

      if (action === "share" && canShareFiles && typeof navigator !== "undefined" && navigator.share) {
        try {
          const file = new File([blob], filename, {
            type: imageFormat === "jpg" ? "image/jpeg" : "image/png",
          });
          await navigator.share({
            files: [file],
            title: `Ayah Studio — ${surahName} ${surahNum}:${ayahNum}`,
            text: `${verse.arabic}\n\n${trText}\n— ${surahName} ${surahNum}:${ayahNum}`,
          });
          setImageMenuOpen(false);
          return;
        } catch (shareErr) {
          if ((shareErr as Error)?.name === "AbortError") {
            return;
          }
        }
      }

      // Download link fallback
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      setImageMenuOpen(false);
    } catch (err) {
      console.error("Failed to render daily ayah image:", err);
      setImageError("Could not render image. Please try again.");
      setTimeout(() => setImageError(null), 3500);
    } finally {
      setRenderingImage(false);
    }
  };

  useEffect(() => {
    const unregister = registerAudioPlayback("daily", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });
    return unregister;
  }, []);

  const handleTogglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyAudioPlaybackStarted("daily");
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleCopy = async () => {
    if (!verse) return;
    const trText = verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";
    const url = `${window.location.origin}/ayah/${surahNum}/${ayahNum}`;
    const textToCopy = `${verse.arabic}\n\n${trText}\n\n— ${surahName} ${surahNum}:${ayahNum}\n\n${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!verse) return;
    const trText = verse.translations[DEFAULT_TR1] || Object.values(verse.translations)[0] || "";
    const url = `${window.location.origin}/ayah/${surahNum}/${ayahNum}`;
    const textToShare = `${verse.arabic}\n\n${trText}\n\n— ${surahName} ${surahNum}:${ayahNum}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Ayah Studio — ${surahName} ${surahNum}:${ayahNum}`,
          text: textToShare,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${textToShare}\n\n${url}`);
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
    <div className="rounded-2xl border border-gold/40 bg-card p-5 sm:p-8 shadow-md relative transition-all">
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
          onPlay={() => {
            setIsPlaying(true);
            notifyAudioPlaybackStarted("daily");
          }}
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
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity touch-manipulation"
        >
          <BookOpen size={14} /> Read in context
        </Link>

        {audioUrl && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Pause" : "Listen"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation"
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
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors touch-manipulation"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>

        {/* Download as Image Button & Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setImageMenuOpen((prev) => !prev)}
            disabled={renderingImage}
            aria-label="Download verse as image"
            aria-expanded={imageMenuOpen}
            aria-haspopup="dialog"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 touch-manipulation"
          >
            {renderingImage ? (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Rendering...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Download image</span>
              </>
            )}
          </button>

          {/* Options Menu Dialog */}
          {imageMenuOpen && (
            <div
              role="dialog"
              aria-label="Image download settings"
              className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-[min(16rem,calc(100vw-3rem))] rounded-lg border border-border bg-card p-3 shadow-xl z-30 text-xs flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between border-b border-border pb-1.5 font-semibold text-foreground">
                <span>Save Verse Card</span>
                <button
                  type="button"
                  onClick={() => setImageMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Theme option */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
                <div className="grid grid-cols-2 gap-1.5 bg-muted/50 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setImageTheme("dark")}
                    className={`rounded py-1 px-2 text-center text-xs font-medium transition-colors ${
                      imageTheme === "dark"
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTheme("light")}
                    className={`rounded py-1 px-2 text-center text-xs font-medium transition-colors ${
                      imageTheme === "light"
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>

              {/* Format option */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Format</span>
                <div className="grid grid-cols-2 gap-1.5 bg-muted/50 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setImageFormat("png")}
                    className={`rounded py-1 px-2 text-center text-xs font-medium transition-colors ${
                      imageFormat === "png"
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFormat("jpg")}
                    className={`rounded py-1 px-2 text-center text-xs font-medium transition-colors ${
                      imageFormat === "jpg"
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    JPG
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleExportImage("download")}
                  disabled={renderingImage}
                  className="flex-1 rounded-sm bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Download
                </button>
                {canShareFiles && (
                  <button
                    type="button"
                    onClick={() => handleExportImage("share")}
                    disabled={renderingImage}
                    title="Share image via native sheet"
                    aria-label="Share image file"
                    className="rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Share2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {imageError && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium">{imageError}</p>
      )}
    </div>
  );
}
