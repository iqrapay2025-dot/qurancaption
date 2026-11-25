"use client";

import { useState, useEffect } from "react";
import { MapPin, Compass, Search, AlertCircle, X, Check } from "lucide-react";
import {
  checkGeolocationPermission,
  requestRoundedGeolocation,
  getTimezoneSuggestedCity,
} from "@/lib/prayer-times/client";
import type { PrayerLocation, PrayerSettings } from "@/lib/prayer-times/types";

interface LocationPrePromptCardProps {
  settings: PrayerSettings;
  onLocationSaved: (location: PrayerLocation) => void;
  onOpenCityPicker: () => void;
}

const DISMISS_KEY = "qcs-location-prompt-dismissed-until";

export function LocationPrePromptCard({
  settings,
  onLocationSaved,
  onOpenCityPicker,
}: LocationPrePromptCardProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    // If location is already explicitly saved, never show prompt
    if (settings.location.isSaved) {
      setVisible(false);
      return;
    }

    // Check 7-day dismissal
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      setVisible(false);
      return;
    }

    // Check browser permission status
    checkGeolocationPermission().then((status) => {
      if (status === "denied") {
        setIsDenied(true);
      } else {
        setIsDenied(false);
      }
      setVisible(true);
    });
  }, [settings.location.isSaved]);

  const handleAllow = async (interactive = true) => {
    if (interactive) setLoading(true);
    setErrorMsg(null);
    try {
      const loc = await requestRoundedGeolocation();
      onLocationSaved(loc);
      setVisible(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Location access was not granted.");
      // Automatically show city options / fallback
      setIsDenied(true);
    } finally {
      if (interactive) setLoading(false);
    }
  };

  const handleNotNow = () => {
    // Remember dismissal for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(nextWeek));
    setVisible(false);
  };

  const handleApplySuggestedCity = () => {
    const tzCity = getTimezoneSuggestedCity();
    onLocationSaved({ ...tzCity, isSaved: true });
    setVisible(false);
  };

  if (!visible) return null;

  const suggestedCity = getTimezoneSuggestedCity();

  return (
    <div
      role="region"
      aria-label="Location Permission Pre-prompt"
      className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 sm:p-6 shadow-sm transition-all"
    >
      <div className="flex items-start gap-3.5">
        <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Compass size={20} className={loading ? "animate-spin text-primary" : ""} />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Allow location for accurate prayer times?
            </h3>
            <button
              type="button"
              onClick={handleNotNow}
              aria-label="Dismiss location prompt"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            We use your location only to calculate Fajr, Dhuhr, Asr, Maghrib and Isha for your area.
            It stays on your device and you can change it anytime.
          </p>

          {/* If browser permission is blocked / denied */}
          {isDenied && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span>Location is blocked in your browser. You can allow it from the lock icon in the address bar, or pick a city below.</span>
              </div>
            </div>
          )}

          {errorMsg && !isDenied && (
            <p className="text-xs text-red-500">{errorMsg}</p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
            {!isDenied && (
              <button
                type="button"
                onClick={() => handleAllow(true)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95 transition-opacity shadow-xs disabled:opacity-50"
              >
                <Compass size={14} className={loading ? "animate-spin" : ""} />
                <span>{loading ? "Checking..." : "Allow"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCityPicker}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              <Search size={13} />
              <span>Choose city</span>
            </button>

            {/* One-tap suggestion based on user's timezone */}
            {suggestedCity && (
              <button
                type="button"
                onClick={handleApplySuggestedCity}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
                title={`One-tap city suggestion based on your timezone (${suggestedCity.timezone})`}
              >
                <MapPin size={13} />
                <span>Use {suggestedCity.city}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNotNow}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline ml-1"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
