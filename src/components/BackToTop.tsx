"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

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
      className="fixed right-4 bottom-20 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none md:bottom-6"
    >
      <ArrowUp size={17} aria-hidden="true" />
      Go back up
    </button>
  );
}
