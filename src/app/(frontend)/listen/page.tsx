import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ListenPlayer } from "./ListenPlayer";
import { ContinueCard } from "@/components/quran/ContinueCard";
import { buildMistakeReportMailto } from "@/lib/mistake-report";
import { InstallAppButton } from "@/components/InstallAppButton";
import { getActiveDonateUrl } from "@/lib/donate";

export const metadata: Metadata = {
  title: "Listen to the Quran - Full Surah Recitations | Aayah Studio",
  description: "Full-surah recitations by the reciter you choose. Pick a surah and press play.",
  alternates: { canonical: "/listen" },
  openGraph: {
    title: "Listen to the Quran - Full Surah Recitations | Aayah Studio",
    description: "Full-surah recitations by the reciter you choose. Pick a surah and press play.",
    url: "/listen",
    siteName: "Aayah Studio",
    images: [
      {
        url: "/brand/ayah-badge-dark.png",
        width: 512,
        height: 512,
        alt: "Aayah Studio",
      },
    ],
  },
};

export default function ListenPage() {
  const hasDonateUrl = Boolean(getActiveDonateUrl());
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden w-full max-w-full">
      <SiteHeader />
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-12 w-full max-w-full">
          <ContinueCard className="mb-6 sm:mb-8" />
          {/* Header Title & Subtitle */}
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
              Listen to the Quran
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Reading and listening are free. No account needed.
            </p>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-muted-foreground">
              Full-surah recitations by the reciter you choose. Pick a surah and press play.
            </p>
          </div>

          {/* Client Player Component */}
          <ListenPlayer />
        </div>
      </main>

      {/* Shared Footer with UmmahAPI attribution and badge */}
      <footer className="border-t border-border bg-card px-4 sm:px-5 py-8 text-center text-sm text-muted-foreground w-full">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <picture className="size-7 block shrink-0">
              <source srcSet="/brand/ayah-badge-dark-48.webp" type="image/webp" />
              <img
                src="/brand/ayah-badge-dark-48.png"
                alt="Aayah Studio"
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
                className="size-7 object-contain"
              />
            </picture>
            <span className="font-semibold text-foreground">Aayah Studio</span>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Full-surah audio provided by{" "}
            <a
              href="https://mp3quran.net"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              MP3Quran.net
            </a>
            . Quran chapters and metadata via{" "}
            <a
              href="https://ummahapi.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              UmmahAPI
            </a>{" "}
            (Quran text from Tanzil.net, CC BY 3.0; translations via quran.com). Shown exactly as published.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:text-sm">
            <Link className="underline hover:text-foreground" href="/guide">
              Guide
            </Link>
            ·
            <Link className="underline hover:text-foreground" href="/quran">
              Quran
            </Link>
            ·
            <Link className="underline hover:text-foreground" href="/listen">
              Listen
            </Link>
            ·
            <Link className="underline hover:text-foreground" href="/sources">
              Sources
            </Link>
            ·
            <a
              suppressHydrationWarning
              className="underline hover:text-foreground"
              href={buildMistakeReportMailto()}
            >
              Report a mistake
            </a>
            ·
            <Link className="underline hover:text-foreground" href="/editors">
              Editors
            </Link>
            ·
            <Link className="underline hover:text-foreground" href="/terms">
              Terms of use
            </Link>
            ·
            <Link className="underline hover:text-foreground" href="/privacy">
              Privacy policy
            </Link>
            {hasDonateUrl && (
              <>
                ·
                <Link className="underline hover:text-foreground" href="/donate">
                  Donate
                </Link>
              </>
            )}
            ·
            <InstallAppButton />
          </div>
          <p className="text-xs">© Aayah Studio</p>
        </div>
      </footer>
    </div>
  );
}
