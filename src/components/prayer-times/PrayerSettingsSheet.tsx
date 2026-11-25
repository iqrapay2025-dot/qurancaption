"use client";

import { useState } from "react";
import {
  X,
  MapPin,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  CALCULATION_METHODS,
  PRESET_CITIES,
  type PrayerSettings,
  type PrayerName,
  type PrayerLocation,
} from "@/lib/prayer-times/types";
import {
  requestRoundedGeolocation,
  savePrayerSettings,
  formatPrayerDisplayTime,
  getTimezoneSuggestedCity,
  clearSavedLocation,
} from "@/lib/prayer-times/client";

interface PrayerSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrayerSettings;
  onUpdateSettings: (updated: Partial<PrayerSettings>) => void;
}

const PRAYERS: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

export function PrayerSettingsSheet({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: PrayerSettingsSheetProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGeolocation = async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const loc = await requestRoundedGeolocation();
      onUpdateSettings({ location: loc });
    } catch (err: any) {
      setGeoError(err?.message || "Location permission denied or unavailable.");
    } finally {
      setGeoLoading(false);
    }
  };

  const handleAdjustmentChange = (prayer: PrayerName, delta: number) => {
    const current = settings.adjustments[prayer] || 0;
    const nextVal = Math.max(-30, Math.min(30, current + delta));
    onUpdateSettings({
      adjustments: {
        ...settings.adjustments,
        [prayer]: nextVal,
      },
    });
  };

  const handleCustomTimeChange = (prayer: PrayerName, timeVal: string) => {
    onUpdateSettings({
      customTimes: {
        ...settings.customTimes,
        [prayer]: timeVal,
      },
    });
  };

  const handleResetToCalculated = () => {
    onUpdateSettings({
      useCustomTimes: false,
      adjustments: {
        Fajr: 0,
        Sunrise: 0,
        Dhuhr: 0,
        Asr: 0,
        Maghrib: 0,
        Isha: 0,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prayer-settings-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 id="prayer-settings-title" className="text-base font-bold text-foreground">
                Prayer Times Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Calculation methods, adjustments and offsets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close prayer settings"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-6 flex-1">
          {/* Location Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Location & Coordinates
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleGeolocation}
                disabled={geoLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
              >
                <Compass size={14} className={geoLoading ? "animate-spin text-primary" : "text-primary"} />
                <span>{geoLoading ? "Detecting GPS..." : "Detect My Location"}</span>
              </button>
            </div>

            {geoError && (
              <p className="text-xs text-red-500 mb-2">{geoError}</p>
            )}

            {/* City presets dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="select-city-dropdown" className="text-[11px] font-semibold text-muted-foreground block">
                Select City or Country
              </label>
              <select
                id="select-city-dropdown"
                aria-label="Select City"
                value={settings.location.isCustomCoords ? `GPS: ${settings.location.city}` : `${settings.location.city}, ${settings.location.country}`}
                onChange={(e) => {
                  const found = PRESET_CITIES.find(
                    (c) => `${c.city}, ${c.country}` === e.target.value
                  );
                  if (found) {
                    onUpdateSettings({
                      location: {
                        ...found,
                        isSaved: true,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      },
                    });
                  }
                }}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-2 focus:outline-primary"
              >
                {settings.location.isCustomCoords && (
                  <option value={`GPS: ${settings.location.city}`}>
                    GPS Coordinates ({settings.location.latitude?.toFixed(2)}, {settings.location.longitude?.toFixed(2)})
                  </option>
                )}
                {PRESET_CITIES.map((c) => (
                  <option key={`${c.city}-${c.country}`} value={`${c.city}, ${c.country}`}>
                    {c.city}, {c.country}
                  </option>
                ))}
              </select>
            </div>

            {/* Timezone Suggestion & Clear Location */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const tzLoc = getTimezoneSuggestedCity();
                  onUpdateSettings({
                    location: { ...tzLoc, isSaved: true },
                  });
                }}
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <MapPin size={12} />
                <span>One-tap timezone: Use {getTimezoneSuggestedCity().city}</span>
              </button>

              {settings.location.isSaved && (
                <button
                  type="button"
                  onClick={() => {
                    const reset = clearSavedLocation();
                    onUpdateSettings({ location: reset.location });
                  }}
                  className="text-[11px] font-medium text-red-500 hover:underline"
                >
                  Clear my location
                </button>
              )}
            </div>

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Privacy: GPS coordinates are rounded to ~1.1km and stored solely on your device.
            </p>
          </div>

          {/* Calculation Method */}
          <div>
            <label htmlFor="calculation-method-select" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Calculation Method
            </label>
            <select
              id="calculation-method-select"
              value={settings.methodId}
              onChange={(e) => onUpdateSettings({ methodId: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-2 focus:outline-primary"
            >
              {CALCULATION_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.description})
                </option>
              ))}
            </select>
          </div>

          {/* Asr Juristic School */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Asr Juristic Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ asrSchool: 0 })}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  settings.asrSchool === 0
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                Standard (Shafi&apos;i, Maliki, Hanbali)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ asrSchool: 1 })}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  settings.asrSchool === 1
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                Hanafi School
              </button>
            </div>
          </div>

          {/* "I usually pray ___ minutes after adhan" */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="after-salah-offset-input" className="text-xs font-semibold text-foreground">
                Prayer Offset for Reminders
              </label>
              <span className="text-xs font-bold text-primary">
                +{settings.afterSalahOffsetMinutes} min
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              &ldquo;I usually pray {settings.afterSalahOffsetMinutes} minutes after the adhan&rdquo; (used to schedule After-Salah Adhkar reminders).
            </p>
            <input
              id="after-salah-offset-input"
              type="range"
              min={0}
              max={45}
              step={5}
              value={settings.afterSalahOffsetMinutes}
              onChange={(e) => onUpdateSettings({ afterSalahOffsetMinutes: Number(e.target.value) })}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
          </div>

          {/* Per-Prayer Adjustments (-/+ 30 min) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Per-Prayer Minute Adjustments
              </label>
              <button
                type="button"
                onClick={handleResetToCalculated}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCcw size={11} />
                <span>Reset to calculated</span>
              </button>
            </div>

            <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
              {PRAYERS.map((p) => {
                const adj = settings.adjustments[p] || 0;
                return (
                  <div key={p} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="font-semibold text-foreground">{p}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdjustmentChange(p, -1)}
                        className="size-7 rounded-lg border border-border bg-muted/60 text-foreground font-bold hover:bg-muted"
                      >
                        -
                      </button>
                      <span
                        className={`w-12 text-center font-bold ${
                          adj !== 0 ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {adj > 0 ? `+${adj}m` : adj < 0 ? `${adj}m` : "0m"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustmentChange(p, 1)}
                        className="size-7 rounded-lg border border-border bg-muted/60 text-foreground font-bold hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* "Use my own times" manual override toggle */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="toggle-custom-times" className="text-xs font-bold text-foreground">
                  Use My Own Times
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Manually set exact times from your local mosque timetable
                </p>
              </div>
              <input
                type="checkbox"
                id="toggle-custom-times"
                checked={settings.useCustomTimes}
                onChange={(e) => onUpdateSettings({ useCustomTimes: e.target.checked })}
                className="size-5 rounded border-border accent-primary cursor-pointer"
              />
            </div>

            {settings.useCustomTimes && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                {PRAYERS.map((p) => (
                  <div key={p} className="space-y-1">
                    <label htmlFor={`custom-time-${p}`} className="text-[11px] font-semibold text-muted-foreground">
                      {p}
                    </label>
                    <input
                      id={`custom-time-${p}`}
                      type="time"
                      value={settings.customTimes[p] || "00:00"}
                      onChange={(e) => handleCustomTimeChange(p, e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-2 focus:outline-primary font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToCalculated}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
