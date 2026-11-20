"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export function QuranShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/brand/ayah-badge-dark.png"
              alt="Ayah Studio"
              width={28}
              height={28}
              className="size-7 object-contain"
            />
            <span className="font-semibold text-foreground">Ayah Studio</span>
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
            <Link className="underline hover:text-foreground" href="/listen">
              Listen
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
          </div>
          <p className="text-xs">© Ayah Studio</p>
        </div>
      </footer>
    </div>
  );
}
