"use client";

import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import type { TranslationRes } from "@/lib/quran/types";
import {
  type QuranSettings,
  type ArabicFontSize,
  type TranslationFontSize,
  type ArabicScript,
  VALID_SCRIPTS,
} from "@/lib/quran/settings";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  settings: QuranSettings;
  onUpdate: (updater: Partial<QuranSettings> | ((prev: QuranSettings) => QuranSettings)) => void;
  onReset: () => void;
};

export function QuranSettingsDrawer({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onReset,
}: Props) {
  const [availableTranslations, setAvailableTranslations] = useState<TranslationRes[]>([]);

  // Fetch translations catalog
  useEffect(() => {
    let active = true;
    fetch("/api/quran/translations")
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.translations)) {
          setAvailableTranslations(data.translations);

          // Drop any saved translation ID that is no longer in the list
          const validIds = new Set(data.translations.map((t: TranslationRes) => t.id));
          const filtered = settings.translations.filter((id) => validIds.has(id));
          if (filtered.length !== settings.translations.length && filtered.length > 0) {
            onUpdate({ translations: filtered });
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [settings.translations, onUpdate]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleTranslation = (id: string) => {
    const isSelected = settings.translations.includes(id);
    if (isSelected) {
      if (settings.translations.length > 1) {
        onUpdate({ translations: settings.translations.filter((t) => t !== id) });
      }
    } else {
      if (settings.translations.length < 3) {
        onUpdate({ translations: [...settings.translations, id] });
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Display settings"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
          <h2 className="text-lg font-bold text-foreground">Reader Display Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Arabic Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">Arabic Font Size</span>
              <span className="text-xs text-muted-foreground uppercase">{settings.arabicSize}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-muted p-1 rounded-lg">
              {(["sm", "md", "lg", "xl", "2xl"] as ArabicFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdate({ arabicSize: size })}
                  className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                    settings.arabicSize === size
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Translation Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">Translation Font Size</span>
              <span className="text-xs text-muted-foreground uppercase">{settings.translationSize}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg">
              {(["sm", "md", "lg"] as TranslationFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdate({ translationSize: size })}
                  className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                    settings.translationSize === size
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
                </button>
              ))}
            </div>
          </div>

          {/* Arabic Script */}
          <div>
            <label htmlFor="arabic-script-select" className="block font-semibold text-foreground mb-2">
              Arabic Script / Font
            </label>
            <select
              id="arabic-script-select"
              value={settings.script}
              onChange={(e) => onUpdate({ script: e.target.value as ArabicScript })}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {VALID_SCRIPTS.map((script) => (
                <option key={script} value={script}>
                  {script}
                </option>
              ))}
            </select>
          </div>

          {/* Tajweed Colors */}
          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <span className="font-semibold text-foreground block">Tajweed Colors</span>
              <span className="text-xs text-muted-foreground">Color-coded pronunciation rules</span>
            </div>
            <input
              type="checkbox"
              id="toggle-tajweed"
              aria-label="Tajweed colors"
              checked={settings.tajweed}
              onChange={(e) => onUpdate({ tajweed: e.target.checked })}
              className="size-5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </div>

          {/* Transliteration */}
          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <span className="font-semibold text-foreground block">Transliteration</span>
              <span className="text-xs text-muted-foreground">Phonetic English pronunciation</span>
            </div>
            <input
              type="checkbox"
              id="toggle-transliteration"
              aria-label="Transliteration"
              checked={settings.transliteration}
              onChange={(e) => onUpdate({ transliteration: e.target.checked })}
              className="size-5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </div>

          {/* Translations (up to 3) */}
          <div className="border-t border-border/60 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">Translations (up to 3)</span>
              <span className="text-xs text-muted-foreground">{settings.translations.length}/3 selected</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 space-y-1.5">
              {availableTranslations.length > 0 ? (
                availableTranslations.map((tr) => {
                  const isChecked = settings.translations.includes(tr.id);
                  const isDisableUncheck = isChecked && settings.translations.length === 1;
                  const isDisableCheck = !isChecked && settings.translations.length >= 3;

                  return (
                    <label
                      key={tr.id}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-xs ${
                        isChecked ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <div className="truncate">
                        <span>{tr.name}</span>
                        <span className="ml-1 text-[11px] opacity-75">({tr.language})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisableUncheck || isDisableCheck}
                        onChange={() => toggleTranslation(tr.id)}
                        className="size-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer disabled:opacity-40"
                      />
                    </label>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center">Loading translations...</div>
              )}
            </div>
          </div>

          {/* Default Tafsir */}
          <div className="border-t border-border/60 pt-4">
            <label htmlFor="default-tafsir-select" className="block font-semibold text-foreground mb-2">
              Default Tafsir
            </label>
            <select
              id="default-tafsir-select"
              value={settings.defaultTafsir === "maarif" ? "ibn_kathir" : settings.defaultTafsir}
              onChange={(e) => onUpdate({ defaultTafsir: e.target.value })}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="ibn_kathir">Tafsir Ibn Kathir</option>
              <option value="muyassar">Al-Tafsir Al-Muyassar</option>
            </select>
          </div>

          {/* Reset to Defaults */}
          <div className="border-t border-border/60 pt-4 flex justify-end">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <RotateCcw size={13} />
              <span>Reset to defaults</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
