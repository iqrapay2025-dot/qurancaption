import type { Metadata } from "next";
import { QuranShell } from "@/components/quran/QuranShell";
import { BookmarksView } from "@/components/quran/BookmarksView";

export const metadata: Metadata = {
  title: "Bookmarks - Saved Ayahs | Ayah Studio",
  description: "View and manage your bookmarked Quran verses, with offline browser storage and notes.",
  alternates: { canonical: "/quran/bookmarks" },
};

export default function BookmarksPage() {
  return (
    <QuranShell>
      <BookmarksView />
    </QuranShell>
  );
}
