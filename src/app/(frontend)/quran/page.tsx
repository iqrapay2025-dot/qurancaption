import type { Metadata } from "next";
import Link from "next/link";
import { getChapters } from "@/lib/quran/server";
import { QuranShell } from "@/components/quran/QuranShell";
import { SurahList } from "@/components/quran/SurahList";
import { ContinueCard } from "@/components/quran/ContinueCard";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Read the Quran",
  description: "Read the Holy Quran with Arabic script, translations, and tafsir commentary.",
  alternates: { canonical: "/quran" },
};

export default async function QuranPage() {
  let chapters: any[] = [];
  let error: string | null = null;

  try {
    const data = await getChapters();
    chapters = data.chapters;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load surah list. Please check your connection.";
  }

  return (
    <QuranShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        <ContinueCard className="mb-6 sm:mb-8" />
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Read the Quran
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Reading and listening are free. No account needed.
          </p>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Browse all 114 surahs with Arabic recitation, authentic translations, and tafsir.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-base text-foreground font-medium">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Unable to fetch the surah list from UmmahAPI.
            </p>
            <Link
              href="/quran"
              className="mt-4 inline-block rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Try again
            </Link>
          </div>
        ) : (
          <SurahList chapters={chapters} />
        )}
      </div>
    </QuranShell>
  );
}
