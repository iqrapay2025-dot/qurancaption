import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveDonateUrl } from "@/lib/donate";
import { Heart, Server, BookOpen, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Support Aayah Studio",
  description:
    "Reading and listening to the Quran are free for everyone, with no account needed. Donations help keep Aayah Studio accessible, ad-free, and continuously improving.",
  alternates: { canonical: "/donate" },
};

export default function DonatePage() {
  const donateUrl = getActiveDonateUrl();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-5 py-10 sm:py-14 w-full">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
          <Heart size={14} className="fill-primary text-primary" />
          <span>Support the Project</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          Support Aayah Studio
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Reading and listening to the Quran are free for everyone, with no account needed. Aayah Studio is built for the global community, and your donations help keep it free, accessible, and ad-free for all.
        </p>

        {donateUrl ? (
          <>
            {/* What donations cover */}
            <section aria-labelledby="donations-cover" className="mt-8">
              <h2 id="donations-cover" className="text-lg font-semibold text-foreground">
                What your donations cover
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                <li className="rounded-sm border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Server size={16} />
                    <span>Hosting</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Fast cloud infrastructure and global edge caching to keep the site online and speedy worldwide.
                  </p>
                </li>
                <li className="rounded-sm border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <BookOpen size={16} />
                    <span>Recitation & Tafsir Data</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Streaming verified audio recitations, authentic text, and comprehensive tafsir commentaries.
                  </p>
                </li>
                <li className="rounded-sm border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Sparkles size={16} />
                    <span>New Features</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Continuous improvements to the studio editor, memorization tools, offline PWA, and mobile experience.
                  </p>
                </li>
              </ul>
            </section>

            {/* Donation Action */}
            <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center flex flex-col items-center">
              <a
                href={donateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-sm bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
              >
                Donate with Paystack
              </a>
              <p className="mt-3 text-xs text-muted-foreground max-w-md">
                Give any amount you like. Payments are processed securely by Paystack. We never see your card details.
              </p>
              <p className="mt-6 text-sm font-medium text-foreground">
                Jazakumullahu khayran
              </p>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-sm border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Donations are not open yet. Reading and listening remain completely free for everyone.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Back to home
            </Link>
          </div>
        )}
      </main>

      {/* Shared Footer */}
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
          {donateUrl && (
            <>
              <Link className="underline hover:text-foreground" href="/donate">
                Donate
              </Link>{" "}
              ·{" "}
            </>
          )}
          <Link className="underline hover:text-foreground" href="/terms">
            Terms of use
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/privacy">
            Privacy policy
          </Link>
        </div>
        <p className="mt-3 text-xs">© Aayah Studio</p>
      </footer>
    </div>
  );
}
