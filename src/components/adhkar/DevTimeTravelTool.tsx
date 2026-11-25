"use client";

import { useState } from "react";
import { FastForward, Clock, RotateCcw, AlertTriangle, Play } from "lucide-react";

interface DevTimeTravelToolProps {
  onSimulateTime?: (simulatedHour: number, simulatedMinute: number) => void;
  onResetTime?: () => void;
  onTriggerTestReminder?: (type: "morning" | "after-salah" | "evening") => void;
}

export function DevTimeTravelTool({
  onSimulateTime,
  onResetTime,
  onTriggerTestReminder,
}: DevTimeTravelToolProps) {
  // Only render in development when explicitly enabled
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS !== "true") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(5);
  const [minute, setMinute] = useState(25);
  const [simulatedActive, setSimulatedActive] = useState(false);

  const presets = [
    { label: "Fajr (05:15)", h: 5, m: 15, type: "morning" as const },
    { label: "Sunrise (06:30)", h: 6, m: 30, type: "morning" as const },
    { label: "Dhuhr Salah (12:40)", h: 12, m: 40, type: "after-salah" as const },
    { label: "Asr Salah (15:55)", h: 15, m: 55, type: "after-salah" as const },
    { label: "Evening (17:00)", h: 17, m: 0, type: "evening" as const },
    { label: "Quiet Hours (23:30)", h: 23, m: 30, type: "evening" as const },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setHour(p.h);
    setMinute(p.m);
    setSimulatedActive(true);
    onSimulateTime?.(p.h, p.m);
  };

  const handleReset = () => {
    setSimulatedActive(false);
    onResetTime?.();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Dev Time Travel & Simulator Tool"
          className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-card/95 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-lg backdrop-blur-md hover:bg-muted transition-all"
        >
          <FastForward size={14} />
          <span>Dev Time Travel</span>
          {simulatedActive && (
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>
      ) : (
        <div className="w-80 rounded-2xl border border-amber-500/40 bg-card p-4 shadow-2xl backdrop-blur-md space-y-3 animate-in zoom-in-95 duration-150 text-foreground">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <FastForward size={16} />
              <span>Dev Time Simulator</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Close
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Test prayer transitions, after-salah offsets, midnight resets, and reminder dispatches.
          </p>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="rounded-lg border border-border bg-muted/30 p-1.5 text-[11px] font-medium hover:border-primary text-left transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Time Input */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Custom:</span>
            <input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-12 rounded border border-border bg-card px-1 py-0.5 text-center font-mono"
            />
            <span>:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="w-12 rounded border border-border bg-card px-1 py-0.5 text-center font-mono"
            />
            <button
              type="button"
              onClick={() => {
                setSimulatedActive(true);
                onSimulateTime?.(hour, minute);
              }}
              className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground"
            >
              Set
            </button>
          </div>

          {/* Reset button */}
          {simulatedActive && (
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
            >
              <RotateCcw size={13} />
              <span>Reset to Real Time</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
