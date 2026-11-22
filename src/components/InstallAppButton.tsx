"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Monitor, Smartphone, Check } from "lucide-react";

type InstallAppButtonProps = {
  variant?: "link" | "menu-item" | "button";
  className?: string;
};

export function InstallAppButton({
  variant = "link",
  className = "",
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activePlatform, setActivePlatform] = useState<"ios" | "android" | "desktop">("desktop");
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

    // Detect user platform
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

    if (isIos) {
      setActivePlatform("ios");
      if (isSafari) setIsIosSafari(true);
    } else if (isAndroid) {
      setActivePlatform("android");
    } else {
      setActivePlatform("desktop");
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
      } catch {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const renderTrigger = () => {
    if (variant === "menu-item") {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          data-tour="install-app-menu"
          className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors ${className}`}
          aria-label="Install Aayah Studio App"
        >
          <Download size={16} className="text-primary shrink-0" aria-hidden="true" />
          <div className="flex flex-col text-left">
            <span>Install App (PWA)</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              Works offline on mobile and desktop
            </span>
          </div>
        </button>
      );
    }

    if (variant === "button") {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          data-tour="install-app-button"
          className={`inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs ${className}`}
          aria-label="Install Aayah Studio App"
        >
          <Download size={14} className="text-primary" aria-hidden="true" />
          <span>Install app</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        data-tour="install-app-link"
        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline ${className}`}
        aria-label="Install Aayah Studio App"
      >
        <Download size={13} aria-hidden="true" /> Install app
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Instructions dialog */}
      {showGuide && (
        <div
          role="dialog"
          aria-label="How to install Aayah Studio"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">Install Aayah Studio</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-sm"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Install Aayah Studio directly to your home screen or desktop for fast offline reading, listening, and native app performance.
            </p>

            {/* Platform Selector Tabs */}
            <div className="flex rounded-md bg-muted p-1 mb-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActivePlatform("ios")}
                className={`flex-1 py-1.5 px-2 rounded text-center transition-all flex items-center justify-center gap-1.5 ${
                  activePlatform === "ios"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone size={13} /> iPhone / iPad
              </button>
              <button
                type="button"
                onClick={() => setActivePlatform("android")}
                className={`flex-1 py-1.5 px-2 rounded text-center transition-all flex items-center justify-center gap-1.5 ${
                  activePlatform === "android"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone size={13} /> Android
              </button>
              <button
                type="button"
                onClick={() => setActivePlatform("desktop")}
                className={`flex-1 py-1.5 px-2 rounded text-center transition-all flex items-center justify-center gap-1.5 ${
                  activePlatform === "desktop"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor size={13} /> Desktop
              </button>
            </div>

            {/* Platform Instructions */}
            {activePlatform === "ios" && (
              <ol className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    1
                  </span>
                  <span>
                    In Safari, tap the <Share size={14} className="inline text-foreground mx-0.5" /> <strong>Share</strong> button on the bottom bar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <PlusSquare size={14} className="inline text-foreground mx-0.5" /> <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner. The app will appear on your home screen!
                  </span>
                </li>
              </ol>
            )}

            {activePlatform === "android" && (
              <ol className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    1
                  </span>
                  <span>
                    In Chrome, tap the <strong>three dots menu (⋮)</strong> in the top-right corner.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    2
                  </span>
                  <span>
                    Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    3
                  </span>
                  <span>
                    Confirm by tapping <strong>Install</strong>.
                  </span>
                </li>
              </ol>
            )}

            {activePlatform === "desktop" && (
              <ol className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    1
                  </span>
                  <span>
                    Look for the <strong>Install icon (⊕ or 💻)</strong> on the right side of the browser address bar in Chrome or Edge.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    2
                  </span>
                  <span>
                    Alternatively, click the browser menu (⋮) and select <strong>Save and share &gt; Install Aayah Studio</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary mt-0.5">
                    3
                  </span>
                  <span>
                    Click <strong>Install</strong> to launch Aayah Studio in its own standalone window.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full rounded-md bg-primary py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
