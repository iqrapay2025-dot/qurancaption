"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Logo({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  return (
    <Wrapper onClick={onClick}>
      <div className="relative shrink-0 flex items-center justify-center size-8 sm:size-9">
        <picture className="dark:hidden w-full h-full flex items-center justify-center">
          <source srcSet="/brand/ayah-badge-light-48.webp 1x, /brand/ayah-badge-light-96.webp 2x" type="image/webp" />
          <img
            src="/brand/ayah-badge-light-48.png"
            alt="Aayah Studio"
            width={36}
            height={36}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-contain"
          />
        </picture>
        <picture className="hidden dark:flex w-full h-full items-center justify-center">
          <source srcSet="/brand/ayah-badge-dark-48.webp 1x, /brand/ayah-badge-dark-96.webp 2x" type="image/webp" />
          <img
            src="/brand/ayah-badge-dark-48.png"
            alt="Aayah Studio"
            width={36}
            height={36}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-contain"
          />
        </picture>
      </div>
      <span className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${compact ? "hidden md:inline" : ""}`}>
        <span className="text-gold">Aayah</span> Studio
      </span>
    </Wrapper>
  );
}

function Wrapper({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const cls = "flex items-center gap-2.5 rounded-sm";
  return onClick ? (
    <button onClick={onClick} className={cls} aria-label="Aayah Studio home">{children}</button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function useTheme() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = localStorage.getItem("qcs-theme");
    setDark(s ? s === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("qcs-theme", dark ? "dark" : "light");
  }, [dark, ready]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
