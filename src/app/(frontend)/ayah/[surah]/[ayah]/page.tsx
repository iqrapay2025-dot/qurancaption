import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Headphones, Video, Sparkles, ArrowRight, Share2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { validateAyahParams, trimAyahDescription, buildAyahShareUrl } from "@/lib/ayah-share";
import { getVerses } from "@/lib/quran/server";
import { DEFAULT_TR1 } from "@/lib/quran/types";
import { buildEditorLink } from "@/lib/editor-link";
import { siteUrl } from "@/lib/site";
import { getActiveDonateUrl } from "@/lib/donate";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ surah: string; ayah: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { surah: surahStr, ayah: ayahStr } = await params;
  const valid = validateAyahParams(surahStr, ayahStr);

  if (!valid) {
    return {
      title: "Ayah Not Found — Ayah Studio",
      description: "The requested Quran verse could not be found.",
    };
  }

  let translation = "";
  try {
    const res = await getVerses(valid.surah, valid.ayah, valid.ayah, [DEFAULT_TR1]);
    const v = res.verses[0];
    if (v) {
      translation = v.translations[DEFAULT_TR1] || Object.values(v.translations)[0] || "";
    }
  } catch {}

  const title = `Surah ${valid.surahName} ${valid.surah}:${valid.ayah} — Ayah Studio`;
  const description = trimAyahDescription(translation);
  const canonical = `/ayah/${valid.surah}/${valid.ayah}`;
  const fullUrl = buildAyahShareUrl(valid.surah, valid.ayah, siteUrl());
  const ogImageUrl = `${fullUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      siteName: "Ayah Studio",
      url: fullUrl,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AyahSharePage({ params }: PageProps) {
  const { surah: surahStr, ayah: ayahStr } = await params;
  const valid = validateAyahParams(surahStr, ayahStr);

  if (!valid) {
    notFound();
  }

  let arabic = "";
  let translation = "";
  let fetchError = false;

  try {
    const res = await getVerses(valid.surah, valid.ayah, valid.ayah, [DEFAULT_TR1]);
    const v = res.verses[0];
    if (v) {
      arabic = v.arabic;
      translation = v.translations[DEFAULT_TR1] || Object.values(v.translations)[0] || "";
    } else {
      fetchError = true;
    }
  } catch {
    fetchError = true;
  }

  const hasDonateUrl = Boolean(getActiveDonateUrl());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="mx-auto max-w-3xl flex-1 px-4 sm:px-6 py-8 sm:py-14 w-full">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <Link href="/quran" className="hover:text-foreground transition-colors">
              Quran
            </Link>
            <span>/</span>
            <Link href={`/quran/${valid.surah}`} className="hover:text-foreground transition-colors">
              {valid.surahName}
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Ayah {valid.ayah}</span>
          </div>

          <span className="font-mono text-[11px] rounded-full border border-border bg-muted/60 px-2 py-0.5">
            {valid.surah}:{valid.ayah}
          </span>
        </div>

        {/* Verse Card */}
        <article className="rounded-2xl border border-gold/40 bg-card p-6 sm:p-10 shadow-lg relative">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <Sparkles size={14} /> Surah {valid.surahName}
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              Ayah {valid.ayah} of {valid.totalAyahs}
            </span>
          </div>

          {fetchError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Unable to load this ayah text right now. Please explore the full chapter directly.
              </p>
              <Link
                href={`/quran/${valid.surah}#ayah-${valid.ayah}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <BookOpen size={14} /> Open in Quran Reader
              </Link>
            </div>
          ) : (
            <>
              {/* Arabic Verse */}
              <div
                dir="rtl"
                lang="ar"
                className="font-quran text-2xl sm:text-3xl lg:text-4xl leading-loose sm:leading-loose text-right text-foreground mb-6 select-text"
              >
                {arabic}
              </div>

              {/* Translation */}
              <p className="text-base sm:text-lg leading-relaxed text-foreground/90 select-text font-normal mb-4">
                &ldquo;{translation}&rdquo;
              </p>

              {/* Reference */}
              <div className="text-xs sm:text-sm font-semibold text-gold mb-8">
                — Surah {valid.surahName} {valid.surah}:{valid.ayah}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-6 border-t border-border/70">
                <Link
                  href={`/quran/${valid.surah}#ayah-${valid.ayah}`}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
                >
                  <BookOpen size={15} /> Read in full context
                </Link>

                <Link
                  href={`/listen?surah=${valid.surah}`}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Headphones size={15} /> Listen to recitation
                </Link>

                <Link
                  href={buildEditorLink({ surah: valid.surah, from: valid.ayah, to: valid.ayah })}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Video size={15} /> Create caption video
                </Link>
              </div>
            </>
          )}
        </article>

        {/* Ayah Studio Intro Section */}
        <section
          aria-labelledby="about-ayah-studio"
          className="mt-10 rounded-xl border border-border bg-card/60 p-6 sm:p-8"
        >
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
            <Sparkles size={16} />
            <h2 id="about-ayah-studio" className="font-semibold text-base sm:text-lg text-foreground">
              About Ayah Studio
            </h2>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Ayah Studio is a serene Quran platform designed for seekers and creators worldwide.
            Read authentic translations, study classical tafsir, listen to world-renowned reciters,
            and create beautiful synced Quran video captions for free with no account required.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
            >
              Explore Ayah Studio home <ArrowRight size={14} />
            </Link>
            <span className="text-muted-foreground/60">·</span>
            <Link
              href="/quran"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground"
            >
              Browse all 114 Surahs
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground mt-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="/brand/ayah-badge-dark.png"
            alt="Ayah Studio"
            width={24}
            height={24}
            className="size-6 object-contain"
          />
          <span className="font-semibold text-foreground">Ayah Studio</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm">
          <Link className="underline hover:text-foreground" href="/guide">
            Guide
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/quran">
            Quran
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/listen">
            Listen
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/terms">
            Terms
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          {hasDonateUrl && (
            <>
              <span>·</span>
              <Link className="underline hover:text-foreground" href="/donate">
                Donate
              </Link>
            </>
          )}
        </div>
        <p className="mt-3 text-xs">© Ayah Studio · Free for the Ummah</p>
      </footer>
    </div>
  );
}
