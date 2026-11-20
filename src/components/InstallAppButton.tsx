"use client";

import { useEffect, useState, useRef } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is already running in standalone PWA mode
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS Safari
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIos && isSafari) {
      setIsIosSafari(true);
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  // If beforeinstallprompt hasn't fired and not iOS Safari, hide button
  if (!deferredPrompt && !isIosSafari) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIosSafari) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        aria-label="Install Ayah Studio App"
      >
        <Download size={13} /> Install app
      </button>

      {/* iOS Safari instructions dialog */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-label="Install on iPhone"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-base font-semibold text-foreground">Install on iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  1
                </span>
                <span>
                  Tap the <Share size={14} className="inline text-foreground" /> <strong>Share</strong> button in Safari toolbar.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  2
                </span>
                <span>
                  Scroll down and tap <PlusSquare size={14} className="inline text-foreground" /> <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top right to install Ayah Studio.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-6 w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
