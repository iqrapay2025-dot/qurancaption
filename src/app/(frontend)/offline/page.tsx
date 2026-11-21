"use client";

import Image from "next/image";
import Link from "next/link";
import { RotateCcw, Home, Bookmark } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="mx-auto flex flex-col items-center max-w-sm rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-lg">
        <Image
          src="/brand/ayah-badge-dark-96.webp"
          alt="Ayah Studio"
          width={80}
          height={80}
          className="size-20 object-contain mb-6"
          priority
        />

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          You are offline
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Reading and streaming live recitations require an active internet connection. You can still access your saved bookmarks and downloaded offline Surahs below.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <Link
            href="/quran/bookmarks"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
          >
            <Bookmark size={16} /> Saved &amp; Offline Surahs
          </Link>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw size={16} /> Try again
          </button>
        </div>
      </div>
    </div>
  );
}
