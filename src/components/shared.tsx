"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Logo({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  return (
    <Wrapper onClick={onClick}>
      <img src="/favicon-32x32.png" width="30" height="30" alt="" aria-hidden="true" className="shrink-0" />
      <span className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${compact ? "hidden md:inline" : ""}`}>
        <span className="text-gold">Quran</span> Caption Studio
      </span>
    </Wrapper>
  );
}

function Wrapper({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const cls = "flex items-center gap-2.5 rounded-sm";
  return onClick ? (
    <button onClick={onClick} className={cls} aria-label="Quran Caption Studio home">{children}</button>
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
