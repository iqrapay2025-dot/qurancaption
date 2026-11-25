"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Clock, X, ArrowRight } from "lucide-react";
import {
  evaluateReminders,
  loadReminderSettings,
  markReminderDispatched,
  snoozeReminder,
  type ScheduledReminder,
} from "@/lib/adhkar/scheduler";
import { loadPrayerSettings, getTodayPrayerTimes } from "@/lib/prayer-times/client";
import { markPrayerAdhkarDone, markWindowAdhkarDone } from "@/lib/adhkar/tracking";
import type { PrayerName } from "@/lib/prayer-times/types";

export function ReminderBanner() {
  const [activeReminder, setActiveReminder] = useState<ScheduledReminder | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkReminders = async () => {
      try {
        const prayerSettings = loadPrayerSettings();
        const reminderSettings = loadReminderSettings();
        if (!reminderSettings.enabled) return;

        const timings = await getTodayPrayerTimes(prayerSettings);
        const trigger = evaluateReminders(
          timings,
          prayerSettings,
          reminderSettings,
          new Date()
        );

        if (trigger) {
          setActiveReminder(trigger);
          markReminderDispatched(trigger.id);
        }
      } catch {}
    };

    // Initial check
    checkReminders();

    // Recheck on tab focus and visibility change
    const handleFocus = () => checkReminders();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkReminders();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic evaluation every 30 seconds
    timer = setInterval(checkReminders, 30000);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!activeReminder) return null;

  const handleMarkDone = () => {
    if (activeReminder.type === "after-salah" && activeReminder.prayer) {
      markPrayerAdhkarDone(activeReminder.prayer);
    } else if (activeReminder.type === "morning") {
      markWindowAdhkarDone("morning");
    } else if (activeReminder.type === "evening") {
      markWindowAdhkarDone("evening");
    }
    setActiveReminder(null);
  };

  const handleSnooze = () => {
    snoozeReminder(activeReminder.id, 10);
    setActiveReminder(null);
  };

  const handleDismiss = () => {
    setActiveReminder(null);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-md w-full rounded-2xl border border-primary/40 bg-card p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-250 ring-1 ring-primary/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Bell size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Reminder
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {activeReminder.targetTimeStr}
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground mt-1">
              {activeReminder.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {activeReminder.body}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss reminder"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
        <Link
          href={activeReminder.url}
          onClick={handleDismiss}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 px-3 text-xs font-bold text-primary-foreground hover:opacity-95 transition-opacity shadow-xs"
        >
          <span>Open</span>
          <ArrowRight size={13} />
        </Link>

        <button
          type="button"
          onClick={handleMarkDone}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <Check size={14} className="text-primary" />
          <span>Mark Done</span>
        </button>

        <button
          type="button"
          onClick={handleSnooze}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Clock size={13} />
          <span className="hidden sm:inline">Snooze (10m)</span>
        </button>
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground/80 italic text-center">
        Reminders work while Aayah Studio is open. Push reminders for when closed are coming soon.
      </div>
    </div>
  );
}
