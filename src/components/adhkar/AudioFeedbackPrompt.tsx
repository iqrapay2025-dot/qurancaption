"use client";

import React, { useState, useEffect } from "react";
import { X, MessageSquareHeart, Check, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import {
  loadAdhkarAudioSettings,
  saveAudioFeedback,
  saveAdhkarAudioSettings,
} from "@/lib/adhkar/storage";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function AudioFeedbackPrompt() {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<"Yes" | "Somewhat" | "No" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const settings = loadAdhkarAudioSettings();
    // Only show if user has played audio, at least 1 week has passed, and hasn't submitted/dismissed feedback
    if (
      settings.firstPlayedAt &&
      !settings.feedbackSubmitted &&
      Date.now() - settings.firstPlayedAt >= ONE_WEEK_MS
    ) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    // Mark as dismissed so it doesn't prompt again
    saveAdhkarAudioSettings({ feedbackSubmitted: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    saveAudioFeedback({
      rating,
      comment: comment.trim() || undefined,
      submittedAt: Date.now(),
    });

    setSubmitted(true);
    setTimeout(() => {
      setVisible(false);
    }, 2000);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Audio feedback"
      className="my-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5 shadow-xs transition-all animate-in fade-in duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquareHeart size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Help us improve: Was the Adhkar audio helpful?
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              You&apos;ve been listening to Adhkar recitations this week. We&apos;d love your feedback!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss feedback prompt"
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
        >
          <X size={15} />
        </button>
      </div>

      {submitted ? (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Check size={15} />
          <span>Thank you! Your feedback has been saved for our team to review.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["Yes", "Somewhat", "No"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRating(opt)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  rating === opt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                {opt === "Yes" && <ThumbsUp size={12} />}
                {opt === "Somewhat" && <Meh size={12} />}
                {opt === "No" && <ThumbsDown size={12} />}
                <span>{opt}</span>
              </button>
            ))}
          </div>

          {rating && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional: Any specific dhikr or thoughts you want to share?"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-95"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
