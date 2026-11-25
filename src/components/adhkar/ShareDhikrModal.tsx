"use client";

import { useState } from "react";
import { X, Copy, Check, Share2 } from "lucide-react";
import type { AdhkarItem } from "@/lib/adhkar/types";

interface ShareDhikrModalProps {
  item: AdhkarItem;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDhikrModal({ item, isOpen, onClose }: ShareDhikrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://aayahstudio.com";
  const shareUrl = `${siteUrl}/adhkar/${item.category}`;

  const shareText = `✨ ${item.title} ✨\n\n${item.arabic}\n\n"${item.translation_en}"\n\nRepeat: ${item.repeat} time${item.repeat > 1 ? "s" : ""}\nReference: ${item.source.book} (${item.source.hadith_reference})\n\nRead & track your daily Adhkar on Aayah Studio:\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${item.title} - Aayah Studio Adhkar`,
          text: shareText,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dhikr-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        <h3 id="share-dhikr-title" className="text-lg font-bold text-foreground">
          Share Dhikr
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Share this authentic remembrance with your family and loved ones
        </p>

        {/* Preview Card */}
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">
            {item.title}
          </div>
          <div
            dir="rtl"
            className="my-3 font-quran text-xl sm:text-2xl leading-loose text-foreground text-right"
          >
            {item.arabic}
          </div>
          <p className="text-xs sm:text-sm text-foreground/80 italic line-clamp-3">
            &ldquo;{item.translation_en}&rdquo;
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            <span>{item.source.book} ({item.source.hadith_reference})</span>
            <span className="font-semibold text-primary">Aayah Studio</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 px-4 text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            {copied ? (
              <>
                <Check size={16} className="text-primary" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity shadow-xs"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
