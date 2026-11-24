"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, Wifi, HardDrive, X } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
      setShowToast(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showToast) return null;
  if (dismissed && isOffline) return null;

  return (
    <aside
      aria-label="Offline status banner"
      className="fixed top-14 left-0 right-0 z-40 flex items-center justify-center p-2 pointer-events-none animate-slide-down"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-lg text-xs font-medium backdrop-blur-md transition-all bg-card/95 border-border text-foreground">
        {isOffline ? (
          <>
            <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <WifiOff size={13} /> Offline Mode
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              Reading and listening from local storage
            </span>
            <Link
              href="/offline"
              className="text-primary hover:underline font-semibold flex items-center gap-1 ml-1"
            >
              <HardDrive size={12} /> Downloads
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted ml-1"
              aria-label="Dismiss offline banner"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <span className="flex size-2 rounded-full bg-emerald-500" />
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Wifi size={13} /> Back Online
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
