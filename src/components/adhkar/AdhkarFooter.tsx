"use client";

import Link from "next/link";
import { BookOpen, ShieldCheck, Mail, ExternalLink, Heart } from "lucide-react";

export function AdhkarFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card/60 py-8 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck size={14} />
            </span>
            <span className="font-semibold text-foreground">
              Authentic Sources & Scholarly References
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] flex-wrap">
            <a
              href="https://sunnah.com/hisn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>Hisn al-Muslim (Sunnah.com)</span>
              <ExternalLink size={11} />
            </a>
            <span>·</span>
            <a
              href="https://aladhan.com/prayer-times-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>AlAdhan API</span>
              <ExternalLink size={11} />
            </a>
            <span>·</span>
            <a
              href="mailto:support@aayahstudio.com?subject=Adhkar%20Error%20Report%20or%20Correction"
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              <Mail size={12} />
              <span>Report an Error</span>
            </a>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/90 max-w-3xl">
          All Adhkar and Du&apos;as are compiled exclusively from authentic hadith collections
          (Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Jami` at-Tirmidhi, and Hisn al-Muslim).
          No third-party runtime dependencies are used for text and references.
          Coordinates are rounded to approximately 1.1km for privacy and never sent to external servers.
        </p>

        {/* Audio Licensing & Attribution */}
        <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground/80 leading-relaxed space-y-1">
          <p>
            <strong>Audio Attribution:</strong> Recitation by <strong>Muhammad Jumah</strong> for{" "}
            <a
              href="https://opendua.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              OpenDua
            </a>
            , licensed under{" "}
            <a
              href="https://opendua.hdfund.org/licence/audio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CC BY 4.0
            </a>
            . Audio is matched to the text only where the Arabic is identical. Where Quran ayah audio is used, recitation is voiced by the selected reciter. This usage does not imply endorsement by OpenDua, Ihsan Labs, or the Human Development Fund.
          </p>
        </div>

        <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <span>© {new Date().getFullYear()} Aayah Studio. Open Data & MIT Licensed content.</span>
          <span className="flex items-center gap-1">
            <span>Made with sincerity for the Ummah</span>
            <Heart size={11} className="text-red-500 fill-red-500" />
          </span>
        </div>
      </div>
    </footer>
  );
}
