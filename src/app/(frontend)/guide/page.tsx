import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { GuideContent } from "@/components/GuideContent";
import { getActiveDonateUrl } from "@/lib/donate";

export const metadata: Metadata = {
  title: "User Guide | Ayah Studio",
  description:
    "Complete guide to Ayah Studio: read with tafsir, listen to world-class reciters, memorize verses, and design stunning Quran video captions.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "Ayah Studio Guide",
    description:
      "Complete guide to reading the Quran, listening to reciters, and creating video captions in Ayah Studio.",
    url: "/guide",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayah Studio Guide",
    description:
      "Complete guide to reading the Quran, listening to reciters, and creating video captions in Ayah Studio.",
  },
};

export default function GuidePage() {
  const hasDonateUrl = Boolean(getActiveDonateUrl());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Skip to content link for accessibility */}
      <a
        href="#guide-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-sm focus:shadow-md"
      >
        Skip to guide content
      </a>

      <SiteHeader />

      <main id="guide-main" className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <header className="mb-8 sm:mb-12 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-gold mb-2 block">
            Documentation & Help
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Ayah Studio Guide
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Everything you need to know about reading the Quran with classical tafsirs, streaming recitations with the background player, memorizing verses, and creating beautiful video captions.
          </p>
        </header>

        <GuideContent />
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground bg-card/40">
        <div className="flex items-center justify-center gap-2 mb-3">
          <picture className="size-6 block shrink-0">
            <source srcSet="/brand/ayah-badge-dark-48.webp" type="image/webp" />
            <img
              src="/brand/ayah-badge-dark-48.png"
              alt="Ayah Studio"
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              className="size-6 object-contain"
            />
          </picture>
          <span className="font-semibold text-foreground">Ayah Studio</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm">
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
          <Link className="underline hover:text-foreground" href="/editors">
            Editors
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/terms">
            Terms of use
          </Link>
          <span>·</span>
          <Link className="underline hover:text-foreground" href="/privacy">
            Privacy policy
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
        <p className="mt-4 text-xs text-muted-foreground/80">© Ayah Studio</p>
      </footer>
    </div>
  );
}
