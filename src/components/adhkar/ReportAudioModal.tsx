"use client";

import React, { useState } from "react";
import { X, AlertCircle, Send, Copy, Check } from "lucide-react";
import type { AdhkarItem } from "@/lib/adhkar/types";

interface ReportAudioModalProps {
  item: AdhkarItem | null;
  onClose: () => void;
}

export function ReportAudioModal({ item, onClose }: ReportAudioModalProps) {
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const mailtoSubject = encodeURIComponent(`[Adhkar Audio Issue] Dhikr #${item.id} (${item.title})`);
  const mailtoBody = encodeURIComponent(
    `Dhikr ID: ${item.id}\nCategory: ${item.category}\nTitle: ${item.title}\nAudio URL: ${item.audioUrl || "Quran audio"}\n\nProblem details:\n${description || "[Describe issue here - e.g. pronunciation mismatch, cut off, etc.]"}`
  );
  const mailtoLink = `mailto:support@aayahstudio.com?subject=${mailtoSubject}&body=${mailtoBody}`;

  const handleCopyDetails = () => {
    const text = `Dhikr #${item.id} (${item.title})\nCategory: ${item.category}\nAudio: ${item.audioUrl || "Quran audio"}\nIssue: ${description || "Audio problem reported"}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setDescription("");
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-audio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h3 id="report-audio-title" className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            <span>Report Audio Problem</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report modal"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check size={20} />
            </div>
            <h4 className="text-sm font-bold text-foreground">Thank you for reporting!</h4>
            <p className="text-xs text-muted-foreground">
              Your feedback helps ensure 100% authentic pronunciation and coverage.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1 border border-border/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dhikr:</span>
                <span className="font-semibold text-foreground">#{item.id} - {item.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium text-foreground capitalize">{item.category}</span>
              </div>
              {item.openduaId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OpenDua ID:</span>
                  <span className="font-mono text-primary text-[11px]">{item.openduaId}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="issue-description" className="text-xs font-semibold text-foreground">
                Describe the problem:
              </label>
              <textarea
                id="issue-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., audio cuts off early, Arabic text pronunciation differs slightly, volume issue..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <a
                href={mailtoLink}
                className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
              >
                <Send size={13} />
                <span>Send via Email</span>
              </a>

              <button
                type="button"
                onClick={handleCopyDetails}
                className="w-full sm:w-auto py-2 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy details"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
