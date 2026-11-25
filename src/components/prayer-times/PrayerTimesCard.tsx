"use client";

import { useMemo } from "react";
import { Clock, MapPin, Edit3, AlertCircle, Compass } from "lucide-react";
import type { PrayerTimings, PrayerSettings, PrayerName } from "@/lib/prayer-times/types";
import { CALCULATION_METHODS } from "@/lib/prayer-times/types";
import { formatPrayerDisplayTime, calculateNextPrayer } from "@/lib/prayer-times/client";

interface PrayerTimesCardProps {
  timings: PrayerTimings;
  settings: PrayerSettings;
  onOpenSettings: () => void;
  onDetectLocation?: () => void;
}

const PRAYERS: { name: PrayerName; arabic: string }[] = [
  { name: "Fajr", arabic: "الفجر" },
  { name: "Sunrise", arabic: "الشروق" },
  { name: "Dhuhr", arabic: "الظهر" },
  { name: "Asr", arabic: "العصر" },
  { name: "Maghrib", arabic: "المغرب" },
  { name: "Isha", arabic: "العشاء" },
];

export function PrayerTimesCard({
  timings,
  settings,
  onOpenSettings,
  onDetectLocation,
}: PrayerTimesCardProps) {
  const nextInfo = useMemo(() => calculateNextPrayer(timings), [timings]);

  const methodName = useMemo(() => {
    const found = CALCULATION_METHODS.find((m) => m.id === settings.methodId);
    return found ? found.name.split("(")[0].trim() : "Calculated";
  }, [settings.methodId]);

  return (
    <section
      aria-label="Daily Prayer Times"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden"
    >
      {/* Top Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Today&apos;s Prayer Times
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              Next: {nextInfo.nextPrayer} in {nextInfo.formattedCountdown}
            </span>
          </div>

          {/* Subtitle: [Method name] · [City] · Edit */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <span>{methodName}</span>
            <span>·</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <MapPin size={12} className="text-primary" />
              {settings.location.city}
              {settings.location.country ? `, ${settings.location.country}` : ""}
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              <Edit3 size={11} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onDetectLocation && (
            <button
              type="button"
              onClick={onDetectLocation}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/30 rounded-xl px-3 py-1.5 bg-primary/5 transition-colors"
              title="Detect your exact location with GPS"
            >
              <Compass size={13} />
              <span>Use my location</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-1.5 bg-muted/40 hover:bg-muted transition-colors"
          >
            Adjust Times
          </button>
        </div>
      </div>

      {/* Grid of 6 Prayers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 py-4">
        {PRAYERS.map(({ name, arabic }) => {
          const rawTime = timings[name] || "00:00";
          const displayTime = formatPrayerDisplayTime(rawTime, true);
          const isNext = nextInfo.nextPrayer === name;
          const isCurrent = nextInfo.currentPrayer === name;
          const adjustment = settings.adjustments[name] || 0;

          return (
            <div
              key={name}
              className={`relative rounded-xl border p-3 text-center transition-all ${
                isNext
                  ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                  : isCurrent
                  ? "border-primary/50 bg-primary/[0.04]"
                  : "border-border/70 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              {isNext && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                  Upcoming
                </span>
              )}

              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {name}
              </div>
              <div
                dir="rtl"
                lang="ar"
                className="font-quran text-xs text-primary my-0.5"
              >
                {arabic}
              </div>
              <div className="text-sm sm:text-base font-bold text-foreground font-mono">
                {displayTime}
              </div>

              {/* Adjusted badge */}
              {adjustment !== 0 && !settings.useCustomTimes && (
                <span
                  title={`Adjusted by ${adjustment > 0 ? `+${adjustment}` : adjustment} minutes`}
                  className="mt-1 inline-block text-[10px] font-semibold text-primary bg-primary/10 rounded-sm px-1.5 py-0.2"
                >
                  {adjustment > 0 ? `+${adjustment}m` : `${adjustment}m`}
                </span>
              )}

              {settings.useCustomTimes && (
                <span className="mt-1 inline-block text-[10px] font-semibold text-amber-500 bg-amber-500/10 rounded-sm px-1.5 py-0.2">
                  Custom
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Note: Times are calculated. Confirm with your local mosque. */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5 italic">
          <AlertCircle size={13} className="text-muted-foreground shrink-0" />
          <span>Times are calculated. Confirm with your local mosque.</span>
        </p>
        <span className="text-[10px] opacity-75">
          {settings.useCustomTimes ? "Using Custom Timetable" : "Powered by AlAdhan"}
        </span>
      </div>
    </section>
  );
}
