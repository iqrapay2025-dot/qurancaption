"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  ChevronLeft,
  Save,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
  HelpCircle,
  Check,
  Bell,
  RefreshCw,
  Headphones,
} from "lucide-react";
import {
  loadPlan,
  savePlan,
  exportPlannerData,
  importPlannerData,
  clearAllPlannerData,
} from "@/lib/planner/storage";
import {
  loadPlannerReminderSettings,
  savePlannerReminderSettings,
  PlannerReminderSettings,
} from "@/lib/planner/reminders";
import { PlannerPlan, LessonSize } from "@/lib/planner/types";
import { getPaceEstimate } from "@/lib/planner/pace";
import { DEFAULT_RECITER, type Reciter } from "@/lib/quran/types";
import { PlannerShell } from "./PlannerShell";

export function PlannerSettings() {
  const router = useRouter();

  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [reminders, setReminders] = useState<PlannerReminderSettings>(loadPlannerReminderSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(DEFAULT_RECITER);

  useEffect(() => {
    setPlan(loadPlan());
    setReminders(loadPlannerReminderSettings());

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qcs-quran-reciter");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) setSelectedReciterId(parsed);
      }
    }

    fetch("/api/quran/reciters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.reciters || [];
        if (Array.isArray(list) && list.length > 0) setReciters(list);
      })
      .catch(() => {});
  }, []);

  if (!plan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">No Active Plan Found</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have a plan configured yet.
        </p>
        <Link
          href="/planner/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
        >
          Setup a Plan
        </Link>
      </div>
    );
  }

  const handleSaveSettings = () => {
    savePlan(plan);
    savePlannerReminderSettings(reminders);
    try {
      localStorage.setItem("qcs-quran-reciter", String(selectedReciterId));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExport = () => {
    const json = exportPlannerData();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aayah-hifz-plan-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importPlannerData(content);
      if (res.success) {
        setImportStatus("Plan successfully restored!");
        setPlan(loadPlan());
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus(res.error || "Failed to import plan");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAll = () => {
    clearAllPlannerData();
    setShowDeleteModal(false);
    router.push("/planner");
  };

  const handleRequestNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setReminders({ ...reminders, browserNotifications: true });
    } else {
      setReminders({ ...reminders, browserNotifications: false });
    }
  };

  return (
    <PlannerShell activeTab="settings" sabaqStartPage={plan?.startPoint.page || 1}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <Link
            href="/planner"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
          >
            <ChevronLeft size={14} /> Back to Today
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Planner Settings</h1>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          {savedSuccess ? (
            <>
              <Check size={14} /> Saved!
            </>
          ) : (
            <>
              <Save size={14} /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Plan Parameters */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Memorization Pace & Schedule
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2 p-4 rounded-xl border border-border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground block">
                Daily Sabaq Size & Pace
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {plan.paceName || getPaceEstimate(plan.dailyLessonSize).defaultPaceName} · {getPaceEstimate(plan.dailyLessonSize).timeEstimate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Preset / Mode
                </label>
                <select
                  value={[3, 5, 7, 10, 15].includes(plan.dailyLessonSize) ? plan.dailyLessonSize : "custom"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      const lines = plan.dailyLessonSize || 8;
                      setPlan({
                        ...plan,
                        dailyLessonSize: lines,
                        paceName: plan.paceName || getPaceEstimate(lines).defaultPaceName,
                      });
                    } else {
                      const lines = Number(val) as LessonSize;
                      setPlan({
                        ...plan,
                        dailyLessonSize: lines,
                        paceName: getPaceEstimate(lines).defaultPaceName,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground font-semibold text-xs"
                >
                  <option value={3}>3 lines / day (Gentle pace)</option>
                  <option value={5}>5 lines / day (Balanced pace)</option>
                  <option value={7}>7 lines / day (Standard pace - Half page)</option>
                  <option value={10}>10 lines / day (Intensive pace)</option>
                  <option value={15}>15 lines / day (Full page)</option>
                  <option value="custom">Custom lines...</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Pace Name
                </label>
                <input
                  type="text"
                  placeholder={getPaceEstimate(plan.dailyLessonSize).defaultPaceName}
                  value={plan.paceName || ""}
                  onChange={(e) => setPlan({ ...plan, paceName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground font-semibold text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {![3, 5, 7, 10, 15].includes(plan.dailyLessonSize) && (
              <div className="pt-2 border-t border-border/60 flex items-center gap-3">
                <label className="text-xs font-semibold text-foreground shrink-0">
                  Exact lines per day (1–30):
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={plan.dailyLessonSize}
                  onChange={(e) => {
                    const lines = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                    setPlan({
                      ...plan,
                      dailyLessonSize: lines,
                      paceName: plan.paceName || getPaceEstimate(lines).defaultPaceName,
                    });
                  }}
                  className="w-24 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground"
                />
                <span className="text-xs text-muted-foreground font-medium">
                  Generated time: <strong className="text-emerald-600 dark:text-emerald-400">{getPaceEstimate(plan.dailyLessonSize).timeEstimate}</strong>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Sabqi Window (Days)
            </label>
            <select
              value={plan.sabqiDays || 5}
              onChange={(e) => setPlan({ ...plan, sabqiDays: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold"
            >
              <option value={3}>3 days</option>
              <option value={5}>5 days (Standard)</option>
              <option value={7}>7 days (Extensive)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Manzil Cumulative Cycle (Days)
            </label>
            <select
              value={plan.manzilCycleDays || 30}
              onChange={(e) => setPlan({ ...plan, manzilCycleDays: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold"
            >
              <option value={15}>15 days (Fast rotation)</option>
              <option value={30}>30 days (Monthly cycle)</option>
              <option value={60}>60 days (Relaxed cycle)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Plan Status
            </label>
            <button
              type="button"
              onClick={() => setPlan({ ...plan, paused: !plan.paused })}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                plan.paused
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              }`}
            >
              {plan.paused ? "Paused (Tap to Resume)" : "Active"}
            </button>
          </div>

          {/* Preferred Reciter */}
          <div className="sm:col-span-2 p-4 rounded-xl border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-reciter-select" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Headphones size={14} className="text-primary" /> Preferred Quran Reciter Voice
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Used for Sabaq &amp; Muraja&apos;ah practice recitation
              </span>
            </div>
            <select
              id="settings-reciter-select"
              value={selectedReciterId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedReciterId(id);
                try {
                  localStorage.setItem("qcs-quran-reciter", String(id));
                } catch {}
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground font-semibold text-xs cursor-pointer focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {reciters.length > 0 ? (
                reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.style ? `· ${r.style}` : ""}
                  </option>
                ))
              ) : (
                <option value={selectedReciterId}>Mishary Rashid Alafasy</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Reminders & Notifications */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Bell size={15} /> Reminders & Notifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Sabaq Reminder Time
            </label>
            <input
              type="time"
              value={plan.reminderTimes.sabaq}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  reminderTimes: { ...plan.reminderTimes, sabaq: e.target.value },
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              Manzil Revision Time
            </label>
            <input
              type="time"
              value={plan.reminderTimes.murajaah}
              onChange={(e) =>
                setPlan({
                  ...plan,
                  reminderTimes: { ...plan.reminderTimes, murajaah: e.target.value },
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold"
            />
          </div>
        </div>

        {/* Quiet hours */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-foreground block">Quiet Hours (22:00 – 05:00)</span>
            <span className="text-muted-foreground">Suppress reminders while resting</span>
          </div>
          <input
            type="checkbox"
            checked={reminders.quietHoursEnabled}
            onChange={(e) => setReminders({ ...reminders, quietHoursEnabled: e.target.checked })}
            className="size-4.5 rounded border-border text-primary focus:ring-primary"
          />
        </div>

        {/* Browser Notifications */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-foreground block">Browser Push Notifications</span>
            <span className="text-muted-foreground">Alert even when tab is in background</span>
          </div>
          <button
            type="button"
            onClick={handleRequestNotification}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
              reminders.browserNotifications
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            {reminders.browserNotifications ? "Enabled ✓" : "Enable"}
          </button>
        </div>
      </div>

      {/* Backup, Export & Import */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Backup & Data Recovery
        </h2>
        <p className="text-xs text-muted-foreground">
          Your plan and progress are stored safely on your device. Export a backup anytime to transfer to another device.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
          >
            <Download size={14} /> Export Backup (JSON)
          </button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer">
            <Upload size={14} /> Import Backup
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {importStatus && (
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {importStatus}
          </div>
        )}
      </div>

      {/* Teacher Disclaimer */}
      <div className="p-4 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground flex items-start gap-2.5">
        <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
        <p>
          This planner helps you organize your memorization and revision. Review your recitation and tajweed regularly with a qualified teacher.
        </p>
      </div>

      {/* Danger Zone: Delete Plan */}
      <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <Trash2 size={15} /> Reset & Delete Data
        </h2>
        <p className="text-xs text-muted-foreground">
          Permanently delete your active plan and memorization history from this device.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-colors"
        >
          Delete My Planner Data
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-foreground">Delete Planner Data?</h3>
              <p className="text-xs text-muted-foreground">
                This will delete your plan and local progress records. This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="py-2.5 px-3 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PlannerShell>
  );
}
