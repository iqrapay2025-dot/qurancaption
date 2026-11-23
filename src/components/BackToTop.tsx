"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const isAudioPage =
    pathname === "/listen" ||
    pathname?.startsWith("/listen/") ||
    pathname === "/quran" ||
    pathname?.startsWith("/quran/");

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 320);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Go back up"
      onClick={() => {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth";
        window.scrollTo({ top: 0, behavior });
      }}
      className={`fixed right-3.5 sm:right-5 z-40 flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/80 bg-card/90 backdrop-blur-xs text-foreground/80 shadow-md transition-all hover:bg-muted hover:text-foreground hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${
        isAudioPage ? "bottom-20 sm:bottom-20" : "bottom-6 sm:bottom-6"
      }`}
    >
      <ArrowUp size={16} aria-hidden="true" />
      <span className="sr-only">Go back up</span>
    </button>
  );
}
