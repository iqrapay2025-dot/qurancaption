"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import {
  loadPrayerSettings,
  getTodayPrayerTimes,
  calculateNextPrayer,
} from "@/lib/prayer-times/client";
import type { NextPrayerInfo, PrayerSettings, PrayerTimings } from "@/lib/prayer-times/types";
import { DEFAULT_PRAYER_SETTINGS } from "@/lib/prayer-times/types";

export function PrayerTimesHeaderChip({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [nextInfo, setNextInfo] = useState<NextPrayerInfo | null>(null);

  useEffect(() => {
    setMounted(true);
    let active = true;

    const loadData = async () => {
      const s = loadPrayerSettings();
      if (!active) return;
      setSettings(s);
      try {
        const t = await getTodayPrayerTimes(s);
        if (!active) return;
        setTimings(t);
        setNextInfo(calculateNextPrayer(t));
      } catch {}
    };

    loadData();

    // Recalculate countdown every 45 seconds
    const interval = setInterval(() => {
      if (timings) {
        setNextInfo(calculateNextPrayer(timings));
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleUpdateSettings = async (updated: Partial<PrayerSettings>) => {
    const { savePrayerSettings } = await import("@/lib/prayer-times/client");
    const nextSettings = savePrayerSettings(updated);
    setSettings(nextSettings);
    const t = await getTodayPrayerTimes(nextSettings);
    setTimings(t);
    setNextInfo(calculateNextPrayer(t));
  };

  if (!mounted) {
    return (
      <Link
        href="/adhkar"
        aria-label="Set location for prayer times"
        className={`inline-flex items-center gap-1 rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors shadow-2xs ${className}`}
      >
        <MapPin size={11} className="text-primary" />
        <span>Set location</span>
      </Link>
    );
  }

  const isLocationSaved = !!settings.location?.isSaved;

  if (!isLocationSaved) {
    return (
      <Link
        href="/adhkar"
        aria-label="Set location for prayer times"
        title="Set your location for accurate prayer times"
        className={`inline-flex items-center gap-1 rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-ring ${className}`}
      >
        <MapPin size={11} className="text-primary" />
        <span>Set location</span>
      </Link>
    );
  }

  if (!nextInfo) return null;

  return (
    <Link
      href="/adhkar"
      aria-label={`Next prayer: ${nextInfo.nextPrayer} in ${nextInfo.formattedCountdown}`}
      title={`Next prayer: ${nextInfo.nextPrayer} at ${nextInfo.nextPrayerTime} (${nextInfo.formattedCountdown} left)`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-ring ${className}`}
    >
      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground hidden sm:inline">Next:</span>
      <span className="text-primary font-bold">{nextInfo.nextPrayer}</span>
      <span className="text-muted-foreground font-mono">{nextInfo.formattedCountdown}</span>
    </Link>
  );
}
