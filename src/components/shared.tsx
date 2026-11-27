"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function Logo({ onClick, compact, iconOnly }: { onClick?: () => void; compact?: boolean; iconOnly?: boolean }) {
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
      {!iconOnly && (
        <span className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${compact ? "hidden md:inline" : ""}`}>
          <span className="text-gold">Aayah</span> Studio
        </span>
      )}
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

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [dark, setDark] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("qcs-theme") as ThemeMode | null;
      const initialMode: ThemeMode =
        stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
      setThemeModeState(initialMode);

      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const computeDark = (mode: ThemeMode) =>
        mode === "system" ? mql.matches : mode === "dark";

      const initialDark = computeDark(initialMode);
      setDark(initialDark);
      document.documentElement.classList.toggle("dark", initialDark);
      setReady(true);

      const handleSystemChange = (e: MediaQueryListEvent) => {
        const currentStored = localStorage.getItem("qcs-theme") as ThemeMode | null;
        if (!currentStored || currentStored === "system") {
          setDark(e.matches);
          document.documentElement.classList.toggle("dark", e.matches);
        }
      };

      mql.addEventListener("change", handleSystemChange);
      return () => mql.removeEventListener("change", handleSystemChange);
    } catch {}
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("qcs-theme", mode);
    } catch {}
    const isDark =
      mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : mode === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    setThemeMode(dark ? "light" : "dark");
  }, [dark, setThemeMode]);

  return { themeMode, dark, setThemeMode, toggle, ready };
}

export function ThemeToggle({
  dark,
  toggle,
  themeMode,
  setThemeMode,
  className = "",
}: {
  dark: boolean;
  toggle: () => void;
  themeMode?: ThemeMode;
  setThemeMode?: (mode: ThemeMode) => void;
  className?: string;
}) {
  const handleClick = () => {
    if (setThemeMode && themeMode) {
      if (themeMode === "system") {
        setThemeMode(dark ? "light" : "dark");
      } else if (themeMode === "light") {
        setThemeMode("dark");
      } else {
        setThemeMode("light");
      }
    } else {
      toggle();
    }
  };

  const label =
    themeMode === "system"
      ? `System theme (${dark ? "dark" : "light"}). Click to switch`
      : dark
      ? "Dark mode. Click to switch"
      : "Light mode. Click to switch";

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`relative grid size-9 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${className}`}
    >
      {themeMode === "system" ? (
        <Laptop size={16} />
      ) : dark ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
      {themeMode === "system" && (
        <span
          className="absolute bottom-1 right-1 size-1.5 rounded-full bg-primary"
          title="System mode"
        />
      )}
    </button>
  );
}

export function ThemeSelector({
  themeMode,
  setThemeMode,
  className = "",
}: {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  className?: string;
}) {
  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
    { mode: "system", label: "System", icon: Laptop },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className={`inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-sm ${className}`}
    >
      {options.map(({ mode, label, icon: Icon }) => {
        const isSelected = themeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setThemeMode(mode)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              isSelected
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} className={isSelected ? "text-primary" : ""} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
