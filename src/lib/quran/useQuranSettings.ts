"use client";

import { useState, useEffect, useCallback } from "react";
import {
  defaultSettings,
  readSavedSettings,
  saveSettings,
  type QuranSettings,
} from "./settings";

export function useQuranSettings() {
  const [settings, setSettings] = useState<QuranSettings>(defaultSettings);
  const [isMounted, setIsMounted] = useState(false);

  // Read saved settings after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = readSavedSettings();
    setSettings(saved);
    setIsMounted(true);
  }, []);

  const updateSettings = useCallback(
    (updater: Partial<QuranSettings> | ((prev: QuranSettings) => QuranSettings)) => {
      setSettings((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    saveSettings(defaultSettings);
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isMounted,
  };
}
