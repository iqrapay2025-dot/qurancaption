import { Suspense } from "react";
import type { Metadata } from "next";
import { QuranShell } from "@/components/quran/QuranShell";
import { QuranSearch } from "@/components/quran/QuranSearch";
import BadgeLoader from "@/components/BadgeLoader";

export const metadata: Metadata = {
  title: "Search the Quran",
  description: "Search across the Holy Quran by Arabic words or translation terms.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function QuranSearchPage() {
  return (
    <QuranShell>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <BadgeLoader size="inline" label="Loading search..." />
          </div>
        }
      >
        <QuranSearch />
      </Suspense>
    </QuranShell>
  );
}
