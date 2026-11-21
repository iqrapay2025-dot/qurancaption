import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveDonateUrl } from "@/lib/donate";
import { Heart, BookOpen, Headphones, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You - Ayah Studio",
  description: "Thank you for supporting Ayah Studio.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouPage() {
  const hasDonateUrl = Boolean(getActiveDonateUrl());
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 px-5 py-12 sm:py-16 w-full text-center flex flex-col items-center">
        <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary mb-6">
          <Heart size={28} className="fill-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground font-display">
          Jazakumullahu khayran
        </h1>

        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
          Thank you deeply for your support. Your generosity helps keep Ayah Studio completely free, ad-free, and accessible for readers and learners around the world.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-5 max-w-lg w-full text-left">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            If your payment went through, you will receive a receipt by email from Paystack shortly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <Link
            href="/quran"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 shadow-sm transition-opacity flex-1 sm:flex-initial"
          >
            <BookOpen size={16} />
            <span>Read the Quran</span>
          </Link>

          <Link
            href="/listen"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors flex-1 sm:flex-initial"
          >
            <Headphones size={16} />
            <span>Listen to the Quran</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors w-full sm:w-auto"
          >
            <Home size={16} />
            <span>Back to home</span>
          </Link>
        </div>
      </main>

      {/* Shared Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="/brand/ayah-badge-dark.png"
            alt="Ayah Studio"
            width={24}
            height={24}
            className="size-6 object-contain"
          />
          <span className="font-semibold text-foreground">Ayah Studio</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <Link className="underline hover:text-foreground" href="/guide">
            Guide
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/quran">
            Quran
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/listen">
            Listen
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/sources">
            Sources
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/terms">
            Terms of use
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/privacy">
            Privacy policy
          </Link>
          {hasDonateUrl && (
            <>
              {" "}·{" "}
              <Link className="underline hover:text-foreground" href="/donate">
                Donate
              </Link>
            </>
          )}
        </div>
        <p className="mt-3 text-xs">© Ayah Studio</p>
      </footer>
    </div>
  );
}
