"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Clock, X, Check, ArrowRight } from "lucide-react";
import { loadPlan } from "@/lib/planner/storage";
import {
  checkDuePlannerReminders,
  dismissPlannerReminder,
  snoozePlannerReminder,
  ActivePlannerReminder,
} from "@/lib/planner/reminders";

export function PlannerReminderToast() {
  const [activeReminder, setActiveReminder] = useState<ActivePlannerReminder | null>(null);

  useEffect(() => {
    const plan = loadPlan();
    if (!plan) return;

    const check = () => {
      const due = checkDuePlannerReminders(plan);
      setActiveReminder(due);
    };

    check();
    const interval = setInterval(check, 30 * 1000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss toast after 15 seconds so it doesn't obstruct other UI permanently
  useEffect(() => {
    if (!activeReminder) return;
    const timer = setTimeout(() => {
      dismissPlannerReminder(activeReminder.id);
      setActiveReminder(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [activeReminder]);

  if (!activeReminder) return null;

  const handleSnooze = () => {
    snoozePlannerReminder(activeReminder.id, 10);
    setActiveReminder(null);
  };

  const handleDismiss = () => {
    dismissPlannerReminder(activeReminder.id);
    setActiveReminder(null);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full rounded-2xl border border-emerald-600/30 bg-card/95 backdrop-blur-md p-4 shadow-2xl animate-slide-up text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
          <Bell size={18} />
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground leading-tight">
            {activeReminder.title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activeReminder.body}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs font-semibold">
            <Link
              href="/planner"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Open Plan <ArrowRight size={12} />
            </Link>

            <span className="text-border">·</span>

            <button
              type="button"
              onClick={handleSnooze}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Clock size={12} /> Snooze 10m
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss reminder"
          className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
