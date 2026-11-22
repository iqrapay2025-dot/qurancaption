"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Headphones,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  ExternalLink,
} from "lucide-react";
import BadgeLoader from "@/components/BadgeLoader";
import { buildMistakeReportMailto } from "@/lib/mistake-report";
import type { TranslationRes, Reciter } from "@/lib/quran/types";

interface TafsirItem {
  id: string;
  name: string;
  author?: string;
  language?: string;
}

export function SourcesClient() {
  const [translations, setTranslations] = useState<TranslationRes[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [tafsirs, setTafsirs] = useState<TafsirItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetch("/api/quran/translations").then((r) => r.json()),
      fetch("/api/quran/reciters").then((r) => r.json()),
      fetch("/api/quran/tafsir").then((r) => r.json()),
    ])
      .then(([trRes, recRes, tafRes]) => {
        if (!active) return;

        if (trRes.status === "fulfilled" && Array.isArray(trRes.value?.translations)) {
          setTranslations(trRes.value.translations);
        }
        if (recRes.status === "fulfilled" && Array.isArray(recRes.value?.reciters)) {
          setReciters(recRes.value.reciters);
        }
        if (tafRes.status === "fulfilled" && Array.isArray(tafRes.value?.tafsirs)) {
          setTafsirs(tafRes.value.tafsirs);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      {/* Title */}
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          Sources & Accuracy
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Details on Quran text sources, translations, reciters, commentary, and caption alignment.
        </p>
      </div>

      <div className="space-y-10">
        {/* Section 1: Quran Text & Data */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-lg font-semibold text-foreground mb-3">
            <BookOpen size={20} className="text-primary" />
            <h2>Quran Text and Data</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Quran data, translations and recitation audio are provided by{" "}
            <a
              href="https://ummahapi.com"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              UmmahAPI
            </a>{" "}
            (Quran text from Tanzil.net, CC BY 3.0; translations via quran.com) and are shown exactly
            as published.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              href="https://tanzil.net"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-2.5 py-1 text-foreground hover:border-gold transition-colors"
            >
              Tanzil.net (CC BY 3.0) <ExternalLink size={12} />
            </a>
            <a
              href="https://quran.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-2.5 py-1 text-foreground hover:border-gold transition-colors"
            >
              quran.com <ExternalLink size={12} />
            </a>
            <a
              href="https://ummahapi.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-2.5 py-1 text-foreground hover:border-gold transition-colors"
            >
              UmmahAPI <ExternalLink size={12} />
            </a>
          </div>
        </section>

        {/* Section 2: Translations */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <CheckCircle size={20} className="text-primary" />
              <h2>Translations</h2>
            </div>
            {translations.length > 0 && (
              <span className="text-xs text-muted-foreground">{translations.length} available</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Translations are rendered verbatim from verified editions without modification.
          </p>

          {loading ? (
            <div className="py-6 flex justify-center">
              <BadgeLoader size="inline" label="Loading translations catalog..." />
            </div>
          ) : translations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {translations.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-border/80 bg-background/50 p-3.5 text-xs"
                >
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  {t.author && <p className="text-muted-foreground mt-0.5">Author: {t.author}</p>}
                  <p className="text-primary font-mono text-[11px] uppercase tracking-wider mt-1">
                    Language: {t.language}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Translations catalog temporarily unavailable.
            </p>
          )}
        </section>

        {/* Section 3: Reciters */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <Headphones size={20} className="text-primary" />
              <h2>Reciters & Audio</h2>
            </div>
            {reciters.length > 0 && (
              <span className="text-xs text-muted-foreground">{reciters.length} available</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Recitation audio is sourced from reputable Qari recitations, verified for full surah coverage.
          </p>

          {loading ? (
            <div className="py-6 flex justify-center">
              <BadgeLoader size="inline" label="Loading reciters catalog..." />
            </div>
          ) : reciters.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reciters.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border/80 bg-background/50 p-3.5 text-xs"
                >
                  <p className="font-semibold text-foreground">{r.name}</p>
                  {r.nameArabic && (
                    <p className="font-serif text-muted-foreground mt-0.5" dir="rtl">
                      {r.nameArabic}
                    </p>
                  )}
                  {r.style && (
                    <p className="text-muted-foreground text-[11px] mt-1 capitalize">
                      Style: {r.style}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Reciters catalog temporarily unavailable.
            </p>
          )}
        </section>

        {/* Section 4: Tafsir (rendered only if available) */}
        {tafsirs.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
                <BookOpen size={20} className="text-primary" />
                <h2>Tafsir Commentary</h2>
              </div>
              <span className="text-xs text-muted-foreground">{tafsirs.length} available</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tafsirs.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-border/80 bg-background/50 p-3.5 text-xs"
                >
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  {t.author && <p className="text-muted-foreground mt-0.5">Author: {t.author}</p>}
                  {t.language && (
                    <p className="text-primary font-mono text-[11px] uppercase tracking-wider mt-1">
                      Language: {t.language}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Caption Timing */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-lg font-semibold text-foreground mb-3">
            <Clock size={20} className="text-primary" />
            <h2>Caption Timing & Alignment</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Caption timings in Aayah Studio are computed directly from recitation audio and ayah
            lengths. While automated timing provides accurate alignment for creating video
            subtitles, exact pause and word boundaries may be approximate.
          </p>
        </section>

        {/* Section 6: Report a Mistake */}
        <section className="rounded-xl border border-gold/40 bg-card p-6 sm:p-8 shadow-xs text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-lg font-semibold text-foreground mb-1">
                <AlertTriangle size={18} className="text-gold" />
                <h2>Report a Mistake</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tell us what you found and where.
              </p>
            </div>
            <a
              href={buildMistakeReportMailto()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Mail size={16} /> Report a mistake
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
