"use client";

import { X, Type, Vibrate, Eye, ExternalLink, SlidersHorizontal, Bell, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeSelector, type ThemeMode } from "@/components/shared";
import type { AdhkarPreferences, ArabicFontChoice } from "@/lib/adhkar/storage";
import {
  loadReminderSettings,
  saveReminderSettings,
  requestBrowserNotificationPermission,
  type ReminderSettings,
} from "@/lib/adhkar/scheduler";

interface AdhkarSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: AdhkarPreferences;
  onUpdatePrefs: (updated: Partial<AdhkarPreferences>) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const FONTS: { id: ArabicFontChoice; label: string; sample: string }[] = [
  { id: "UthmanicHafs", label: "Uthmanic Hafs (Default)", sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { id: "Amiri Quran", label: "Amiri Quran Script", sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { id: "Amiri", label: "Amiri Classic", sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { id: "Scheherazade New", label: "Scheherazade New", sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
];

export function AdhkarSettingsDrawer({
  isOpen,
  onClose,
  prefs,
  onUpdatePrefs,
  themeMode,
  setThemeMode,
}: AdhkarSettingsDrawerProps) {
  if (!isOpen) return null;

  const fontClass =
    prefs.arabicFont === "Amiri Quran"
      ? "font-amiri"
      : prefs.arabicFont === "Amiri"
      ? "font-amiri"
      : prefs.arabicFont === "Scheherazade New"
      ? "font-scheherazade"
      : "font-uthmani";

  const [reminders, setReminders] = useState<ReminderSettings>(loadReminderSettings());

  const handleToggleBrowserNotifications = async (checked: boolean) => {
    if (checked) {
      const granted = await requestBrowserNotificationPermission();
      const updated = saveReminderSettings({ browserNotifications: granted });
      setReminders(updated);
    } else {
      const updated = saveReminderSettings({ browserNotifications: false });
      setReminders(updated);
    }
  };

  const handleUpdateReminders = (part: Partial<ReminderSettings>) => {
    const updated = saveReminderSettings(part);
    setReminders(updated);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adhkar-settings-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h2 id="adhkar-settings-title" className="text-base font-bold text-foreground">
                Adhkar Settings
              </h2>
              <p className="text-xs text-muted-foreground">Customize text, theme and feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-6 flex-1">
          {/* Theme Selector (Milestone 2 Requirement) */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Appearance & Theme
            </label>
            <ThemeSelector
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              className="w-full justify-between"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Applied instantly with zero flash on reload.
            </p>
          </div>

          {/* Arabic Font Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Arabic Script & Font
            </label>
            <div className="grid grid-cols-1 gap-2">
              {FONTS.map((f) => {
                const isSelected = prefs.arabicFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdatePrefs({ arabicFont: f.id })}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{f.label}</div>
                      <div
                        dir="rtl"
                        className={`text-sm mt-1 text-foreground/80 ${
                          f.id === "Amiri Quran" || f.id === "Amiri"
                            ? "font-amiri"
                            : f.id === "Scheherazade New"
                            ? "font-scheherazade"
                            : "font-uthmani"
                        }`}
                      >
                        {f.sample}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="size-2 rounded-full bg-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arabic Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="adhkar-font-size-slider" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Arabic Font Size
              </label>
              <span className="text-xs font-bold text-primary">{prefs.arabicSize}px</span>
            </div>
            <input
              id="adhkar-font-size-slider"
              type="range"
              min={20}
              max={42}
              step={1}
              value={prefs.arabicSize}
              onChange={(e) => onUpdatePrefs({ arabicSize: Number(e.target.value) })}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            {/* Live Preview */}
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 text-center">
              <div
                dir="rtl"
                className={`text-foreground leading-relaxed ${fontClass}`}
                style={{ fontSize: `${prefs.arabicSize}px` }}
              >
                أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ
              </div>
            </div>
          </div>

          {/* Transliteration Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="flex items-center gap-2.5">
              <Eye size={17} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Show Transliteration
                </div>
                <div className="text-xs text-muted-foreground">
                  English phonetic pronunciation guide
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              id="toggle-transliteration"
              checked={prefs.showTransliteration}
              onChange={(e) => onUpdatePrefs({ showTransliteration: e.target.checked })}
              className="size-5 rounded border-border accent-primary cursor-pointer"
            />
          </div>

          {/* Haptic Vibration Feedback */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="flex items-center gap-2.5">
              <Vibrate size={17} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Haptic Vibration
                </div>
                <div className="text-xs text-muted-foreground">
                  Subtle vibration on each tap and completion
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              id="toggle-vibration"
              checked={prefs.vibration}
              onChange={(e) => onUpdatePrefs({ vibration: e.target.checked })}
              className="size-5 rounded border-border accent-primary cursor-pointer"
            />
          </div>

          {/* Adhkar Reminders Section (Milestone 5) */}
          <div className="pt-4 border-t border-border space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Adhkar Reminders & Timers
              </label>
              <p className="text-[11px] text-muted-foreground">
                In-app alerts for Morning, Evening, and Post-Salah supplications.
              </p>
            </div>

            {/* In-app reminder toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Bell size={17} className="text-muted-foreground" />
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    In-App Reminders
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Shows banners and alerts when a window opens
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                id="toggle-in-app-reminders"
                checked={reminders.enabled}
                onChange={(e) => handleUpdateReminders({ enabled: e.target.checked })}
                className="size-5 rounded border-border accent-primary cursor-pointer"
              />
            </div>

            {/* Browser notification toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Bell size={17} className="text-muted-foreground" />
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    Browser Notifications
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Desktop / mobile system notifications (opt-in)
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                id="toggle-browser-notifications"
                checked={reminders.browserNotifications}
                onChange={(e) => handleToggleBrowserNotifications(e.target.checked)}
                className="size-5 rounded border-border accent-primary cursor-pointer"
              />
            </div>

            {/* Quiet Hours */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={15} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Quiet Hours</span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-quiet-hours"
                  checked={reminders.quietHoursEnabled}
                  onChange={(e) => handleUpdateReminders({ quietHoursEnabled: e.target.checked })}
                  className="size-4 rounded border-border accent-primary cursor-pointer"
                />
              </div>
              {reminders.quietHoursEnabled && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-muted-foreground">From</span>
                  <input
                    type="time"
                    value={reminders.quietHoursStart}
                    onChange={(e) => handleUpdateReminders({ quietHoursStart: e.target.value })}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={reminders.quietHoursEnd}
                    onChange={(e) => handleUpdateReminders({ quietHoursEnd: e.target.value })}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Note required by Milestone 5 */}
            <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground italic leading-relaxed border border-border/50">
              Note: Reminders work while Aayah Studio is open in your browser. Push reminders for when the site is closed are coming later.
            </div>
          </div>

          {/* Privacy & Data Management (Milestone 6) */}
          <div className="pt-4 border-t border-border space-y-3">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Privacy & Local Data
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We collect zero personal data on external servers. All preferences, counters, and rounded coordinates remain strictly on your device.
            </p>

            <button
              type="button"
              onClick={() => {
                if (confirm("Delete your reminder history, snoozes, and today's tracking data?")) {
                  try {
                    localStorage.removeItem("qcs-adhkar-dispatched-reminders");
                    localStorage.removeItem("qcs-adhkar-snoozed-reminders");
                    localStorage.removeItem("qcs-adhkar-today-dashboard");
                    localStorage.removeItem("qcs-adhkar-weekly-history");
                    alert("Reminder and tracking data deleted successfully.");
                  } catch {}
                }
              }}
              className="w-full text-left rounded-xl border border-border bg-card p-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <div className="font-semibold text-red-500 dark:text-red-400">
                Delete My Reminder Data
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Clears dispatched reminders, snoozes, and today&apos;s schedule tracking
              </div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground text-center">
          Preferences are automatically saved on this device.
        </div>
      </div>
    </div>
  );
}
