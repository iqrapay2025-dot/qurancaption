"use client";

import { Sparkles } from "lucide-react";
import { useTour } from "./TourProvider";
import type { TourId } from "@/lib/tours/types";

interface TourReplayButtonProps {
  tourId: TourId;
  label?: string;
  className?: string;
  variant?: "pill" | "icon" | "outline";
}

export function TourReplayButton({
  tourId,
  label = "Tour",
  className = "",
  variant = "pill",
}: TourReplayButtonProps) {
  const { startTour } = useTour();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => startTour(tourId)}
        aria-label={`Start ${tourId} tour`}
        title="Start interactive guide tour"
        className={`grid size-8 place-items-center rounded-sm border border-border text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring ${className}`}
      >
        <Sparkles size={14} className="text-gold" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => startTour(tourId)}
      aria-label={`Start ${tourId} tour`}
      title="Start interactive guide tour"
      className={`inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-gold/50 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${className}`}
    >
      <Sparkles size={13} className="text-gold shrink-0" />
      <span>{label}</span>
    </button>
  );
}
