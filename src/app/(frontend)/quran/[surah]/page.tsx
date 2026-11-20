import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVerses, getChapters } from "@/lib/quran/server";
import { parseSurahParam } from "@/lib/quran/reader";
import { DEFAULT_TR1 } from "@/lib/quran/types";
import { QuranShell } from "@/components/quran/QuranShell";
import { Reader } from "@/components/quran/Reader";

export const revalidate = 3600;

type Props = {
  params: Promise<{ surah: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { surah: surahParam } = await params;
  const surahId = parseSurahParam(surahParam);
  if (!surahId) return { title: "Surah Not Found" };

  try {
    const { chapters } = await getChapters();
    const chapter = chapters.find((c) => c.id === surahId);
    if (!chapter) return { title: "Surah Not Found" };

    return {
      title: `Surah ${chapter.nameSimple} (${chapter.id}): read with translation and tafsir`,
      description: `Read Surah ${chapter.nameSimple} (${chapter.meaning}) in Arabic with English translation and classical Tafsir commentary.`,
      alternates: { canonical: `/quran/${chapter.id}` },
    };
  } catch {
    return {
      title: `Surah ${surahId} — Read the Quran`,
      description: `Read Surah ${surahId} in Arabic with English translation and tafsir.`,
      alternates: { canonical: `/quran/${surahId}` },
    };
  }
}

export default async function SurahReaderPage({ params }: Props) {
  const { surah: surahParam } = await params;
  const surahId = parseSurahParam(surahParam);
  if (!surahId) {
    notFound();
  }

  const { chapters } = await getChapters();
  const chapter = chapters.find((c) => c.id === surahId);
  if (!chapter) {
    notFound();
  }

  const { verses } = await getVerses(surahId, 1, chapter.versesCount, [DEFAULT_TR1]);

  return (
    <QuranShell>
      <Reader chapter={chapter} initialVerses={verses} />
    </QuranShell>
  );
}
