"use client";

import { useEffect, useState } from "react";
import { MushafFontType } from "@/lib/mushaf/types";

const loadedFonts = new Set<number>();

export function useMushafFont(page: number, fontType: MushafFontType = "kfgqpc") {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => loadedFonts.has(page));
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (fontType !== "kfgqpc") {
      setIsLoaded(true);
      return;
    }

    if (loadedFonts.has(page)) {
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    setError(false);

    const fontId = `mushaf-font-p${page}`;
    let styleEl = document.getElementById(fontId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = fontId;
      styleEl.textContent = `
        @font-face {
          font-family: 'p${page}-v2';
          src: url('https://verses.quran.com/fonts/quran/hafs/v2/woff2/p${page}.woff2') format('woff2'),
               url('https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p${page}.woff2') format('woff2');
          font-display: block;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Preload next and prev page fonts
    const preloadPage = (p: number) => {
      if (p < 1 || p > 604) return;
      const preloadId = `mushaf-preload-p${p}`;
      if (!document.getElementById(preloadId)) {
        const link = document.createElement("link");
        link.id = preloadId;
        link.rel = "preload";
        link.as = "font";
        link.type = "font/woff2";
        link.crossOrigin = "anonymous";
        link.href = `https://verses.quran.com/fonts/quran/hafs/v2/woff2/p${p}.woff2`;
        document.head.appendChild(link);
      }
    };

    if (page < 604) preloadPage(page + 1);
    if (page > 1) preloadPage(page - 1);

    // Wait for the font to be ready
    let active = true;

    if ("fonts" in document) {
      document.fonts
        .load(`1rem p${page}-v2`)
        .then((fonts) => {
          if (!active) return;
          if (fonts.length > 0) {
            loadedFonts.add(page);
            setIsLoaded(true);
          } else {
            // Try checking ready
            document.fonts.ready.then(() => {
              if (active) {
                loadedFonts.add(page);
                setIsLoaded(true);
              }
            });
          }
        })
        .catch(() => {
          if (!active) return;
          // Fallback to true after brief delay so text renders
          setError(true);
          setIsLoaded(true);
        });

      // Safety timeout so UI never stays stuck
      const timer = setTimeout(() => {
        if (active && !isLoaded) {
          setIsLoaded(true);
        }
      }, 1500);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setIsLoaded(true);
    }
  }, [page]);

  if (fontType === "amiri") {
    return {
      isLoaded: true,
      error: false,
      fontFamily: "'Amiri Quran', 'Amiri', serif",
    };
  }

  if (fontType === "uthmanic") {
    return {
      isLoaded: true,
      error: false,
      fontFamily: "'UthmanicHafs', 'Amiri Quran', serif",
    };
  }

  return {
    isLoaded,
    error,
    fontFamily: isLoaded && !error ? `'p${page}-v2', 'UthmanicHafs', 'Amiri Quran', serif` : `'UthmanicHafs', 'Amiri Quran', serif`,
  };
}
