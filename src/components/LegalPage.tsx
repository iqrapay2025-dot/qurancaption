"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-5 py-12 w-full">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.updated}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-3">
          <picture className="size-6 block shrink-0">
            <source srcSet="/brand/ayah-badge-dark-48.webp" type="image/webp" />
            <img
              src="/brand/ayah-badge-dark-48.png"
              alt="Aayah Studio"
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              className="size-6 object-contain"
            />
          </picture>
          <span className="font-semibold text-foreground">Aayah Studio</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link className="underline hover:text-foreground" href="/guide">
            Guide
          </Link>
          ·
          <Link className="underline hover:text-foreground" href="/quran">
            Quran
          </Link>
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
          ·
          <a className="underline hover:text-foreground" href={`mailto:${SITE.email}`}>
            Aayah Studio support
          </a>
        </div>
        <p className="mt-3 text-xs">© Aayah Studio</p>
      </footer>
    </div>
  );
}
