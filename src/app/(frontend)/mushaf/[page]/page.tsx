import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchMushafPage } from "@/lib/mushaf/server";
import { MushafView } from "@/components/mushaf/MushafView";

interface PageProps {
  params: Promise<{
    page: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);

  if (isNaN(page) || page < 1 || page > 604) {
    return {
      title: "Mushaf | Aayah Studio",
    };
  }

  return {
    title: `Mushaf Page ${page} — Madani Mushaf`,
    description: `Read the Holy Quran page-by-page in authentic Madani Mushaf style with King Fahd Complex (KFGQPC) fonts, tafsir, and recitations.`,
    alternates: {
      canonical: `/mushaf/${page}`,
    },
    openGraph: {
      title: `Mushaf Page ${page} — Madani Mushaf | Aayah Studio`,
      description: `Authentic Madani Mushaf reading mode for Quran with audio and tafsir.`,
    },
  };
}

export default async function MushafRoute({ params }: PageProps) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);

  if (isNaN(page) || page < 1 || page > 604) {
    notFound();
  }

  let pageData;
  try {
    pageData = await fetchMushafPage(page);
  } catch (error) {
    console.error(`Failed to prefetch Mushaf page ${page}:`, error);
    // If server prefetch fails, fallback to rendering pageData on client
    pageData = {
      page_number: page,
      juz_number: 1,
      lines: [],
      surahs: [],
      verse_keys: [],
    };
  }

  return <MushafView initialPageData={pageData} initialPageNumber={page} />;
}
