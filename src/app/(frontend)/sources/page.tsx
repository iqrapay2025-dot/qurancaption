import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcesClient } from "@/components/SourcesClient";
import { InstallAppButton } from "@/components/InstallAppButton";

export const metadata: Metadata = {
  title: "Sources & Accuracy | Ayah Studio",
  description:
    "Quran text, translations, recitation audio sources, commentary and caption alignment details.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <SourcesClient />
      </main>

      <footer className="border-t border-border bg-card px-4 sm:px-5 py-8 text-center text-sm text-muted-foreground w-full">
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
          <p className="max-w-2xl text-xs text-muted-foreground">
            Quran data, translations and recitation audio provided by{" "}
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
            <Link className="underline hover:text-foreground" href="/">
              Home
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
            <Link className="underline hover:text-foreground" href="/guide">
              Guide
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
            <InstallAppButton />
          </div>
          <p className="text-xs">© Ayah Studio</p>
        </div>
      </footer>
    </div>
  );
}
