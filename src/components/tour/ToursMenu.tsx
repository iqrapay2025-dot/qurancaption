"use client";

import { useState, useRef, useEffect } from "react";
import { Compass, Sparkles, ChevronRight, X, Play } from "lucide-react";
import { useTour } from "./TourProvider";
import type { TourDefinition, TourId } from "@/lib/tours/types";
import { TOUR_LIST } from "@/lib/tours/definitions";
import { useRouter } from "next/navigation";

interface ToursMenuProps {
  className?: string;
  buttonVariant?: "nav" | "button" | "icon";
  label?: string;
  onSelectTour?: () => void;
}

export function ToursMenu({
  className = "",
  buttonVariant = "button",
  label = "Tours",
  onSelectTour,
}: ToursMenuProps) {
  const [open, setOpen] = useState(false);
  const { startTour } = useTour();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSelectTour = (tour: TourDefinition) => {
    setOpen(false);
    onSelectTour?.();

    // If tour is for a different route, navigate there with ?tour=<id>
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;

    const isEditorTour = tour.id === "editor";
    const onEditor = currentHash === "#/editor" || currentHash.startsWith("#/editor?");

    if (isEditorTour && !onEditor) {
      window.location.href = `/#/editor?tour=editor`;
      return;
    }

    if (!isEditorTour && tour.route !== currentPath) {
      router.push(`${tour.route}?tour=${tour.id}`);
      return;
    }

    // Brief timeout to allow mobile drawer or dropdown unmount to settle before Driver measures DOM
    setTimeout(() => {
      startTour(tour.id);
    }, 100);
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {buttonVariant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Guided tours"
          aria-expanded={open}
          title="Take a product tour"
          className="grid size-9 place-items-center rounded-sm border border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Compass size={17} aria-hidden="true" />
        </button>
      ) : buttonVariant === "nav" ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 rounded-sm p-2.5 transition-colors hover:bg-muted text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="mt-0.5 text-gold shrink-0">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-xs lg:text-sm font-medium leading-none flex items-center gap-1.5">
              Take a Tour
              <span className="rounded bg-gold/15 px-1 py-0.2 text-[10px] font-semibold text-gold">
                Interactive
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 font-normal">
              Step-by-step walkthrough of features
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Sparkles size={13} className="text-gold" />
          <span>{label}</span>
        </button>
      )}

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Interactive Tours Menu"
            className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-xl border border-border bg-card p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:rounded-md sm:p-2 sm:shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
              <div className="flex items-center gap-2">
                <Compass size={17} className="text-gold" />
                <span className="font-semibold text-sm text-foreground">Interactive Tours</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close tours menu"
                className="text-muted-foreground hover:text-foreground p-1 rounded-sm"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-2 divide-y divide-border/40">
              {TOUR_LIST.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => handleSelectTour(tour)}
                  className="w-full text-left p-2.5 rounded-sm hover:bg-muted transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-xs sm:text-sm text-foreground group-hover:text-gold transition-colors flex items-center gap-1.5">
                      <Play size={12} className="text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                      <span>{tour.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">
                      {tour.description}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/60 group-hover:text-gold transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
