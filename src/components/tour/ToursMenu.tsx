"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Compass,
  ChevronRight,
  X,
  Play,
  Search,
  BookOpen,
  Layers,
  Calendar,
  Sunrise,
  Headphones,
  Bookmark,
  Video,
  Clock,
} from "lucide-react";
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

// Icon and theme config for each tour
const TOUR_META: Record<
  TourId,
  {
    icon: any;
    color: string;
    category: string;
    duration: string;
  }
> = {
  welcome: {
    icon: Compass,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    category: "Overview",
    duration: "~2 mins",
  },
  "quran-reader": {
    icon: BookOpen,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    category: "Quran",
    duration: "~2 mins",
  },
  mushaf: {
    icon: Layers,
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    category: "Mushaf",
    duration: "~2 mins",
  },
  planner: {
    icon: Calendar,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    category: "Memorization",
    duration: "~2 mins",
  },
  adhkar: {
    icon: Sunrise,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    category: "Adhkar & Prayer",
    duration: "~2 mins",
  },
  listen: {
    icon: Headphones,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    category: "Audio",
    duration: "~2 mins",
  },
  bookmarks: {
    icon: Bookmark,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    category: "Library",
    duration: "~1 min",
  },
  editor: {
    icon: Video,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    category: "Creator Studio",
    duration: "~3 mins",
  },
};

export function ToursMenu({
  className = "",
  buttonVariant = "button",
  label = "Interactive Tours",
  onSelectTour,
}: ToursMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { startTour } = useTour();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add("All");
    for (const t of TOUR_LIST) {
      const meta = TOUR_META[t.id];
      if (meta?.category) set.add(meta.category);
    }
    return Array.from(set);
  }, []);

  const filteredTours = useMemo(() => {
    return TOUR_LIST.filter((tour) => {
      const meta = TOUR_META[tour.id];
      const matchesCat =
        selectedCategory === "All" || meta?.category === selectedCategory;

      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tour.name.toLowerCase().includes(q) ||
        tour.description.toLowerCase().includes(q) ||
        tour.route.toLowerCase().includes(q) ||
        meta?.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectTour = (tour: TourDefinition) => {
    setOpen(false);
    onSelectTour?.();

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

    // Brief timeout to let the modal completely unmount before Driver highlights the DOM
    setTimeout(() => {
      startTour(tour.id);
    }, 150);
  };

  return (
    <>
      {buttonVariant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Guided tours"
          aria-expanded={open}
          title="Take an interactive tour"
          className={`grid size-9 place-items-center rounded-sm border border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${className}`}
        >
          <Compass size={17} aria-hidden="true" />
        </button>
      ) : buttonVariant === "nav" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={`flex w-full items-start gap-3 rounded-sm p-2.5 transition-colors hover:bg-muted text-foreground focus-visible:outline-2 focus-visible:outline-ring ${className}`}
        >
          <span className="mt-0.5 text-gold shrink-0">
            <Compass size={16} aria-hidden="true" />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-xs lg:text-sm font-medium leading-none flex items-center gap-1.5">
              Take a Tour
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
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
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring ${className}`}
        >
          <Compass size={14} className="text-gold" />
          <span>{label}</span>
          <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
            {TOUR_LIST.length} Tours
          </span>
        </button>
      )}

      {/* Top-Level Full Viewport Modal Portal */}
      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tours-modal-title"
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-gold/15 text-gold">
                      <Compass size={17} />
                    </span>
                    <h2
                      id="tours-modal-title"
                      className="text-base sm:text-lg font-bold text-foreground"
                    >
                      Interactive Feature Tours
                    </h2>
                    <span className="hidden sm:inline-block rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold">
                      {TOUR_LIST.length} Interactive Guides
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select any feature below for an interactive, step-by-step walkthrough.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close tours modal"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="p-3 sm:px-5 sm:py-3 border-b border-border bg-background/50 space-y-2.5">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tours (e.g. planner, tajweed, audio, prayer times)..."
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tour Cards List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 divide-none">
                {filteredTours.length > 0 ? (
                  filteredTours.map((tour) => {
                    const meta = TOUR_META[tour.id] || {
                      icon: Compass,
                      color: "text-primary bg-primary/10 border-primary/20",
                      category: "Guide",
                      duration: "~2 mins",
                    };
                    const IconComponent = meta.icon;

                    return (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => handleSelectTour(tour)}
                        className="w-full text-left p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
                          <div
                            className={`flex size-10 items-center justify-center rounded-xl border shrink-0 mt-0.5 ${meta.color}`}
                          >
                            <IconComponent size={20} />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {tour.name}
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                {tour.route}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {tour.description}
                            </p>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium pt-0.5">
                              <span className="flex items-center gap-1">
                                <Compass size={11} className="text-gold" />
                                {tour.steps.length} steps
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {meta.duration}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="self-end sm:self-center shrink-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground text-xs font-bold transition-all shadow-xs">
                            <Play size={11} className="fill-current" />
                            <span>Start Tour</span>
                            <ChevronRight size={13} />
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm font-semibold text-foreground">No tours match your search</p>
                    <p className="text-xs text-muted-foreground">
                      Try searching for another keyword or select "All" categories.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:px-5 sm:py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-[10px]">Esc</kbd> anytime to exit a tour.
                </span>
                <span>All tours work offline and on mobile.</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
