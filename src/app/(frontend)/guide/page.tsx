import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { GuideContent } from "@/components/GuideContent";
import { GUIDE_FAQ } from "@/lib/guide";
import { getActiveDonateUrl } from "@/lib/donate";

export const metadata: Metadata = {
  title: "User guide",
  description:
    "Learn how to choose Quran verses, preview recitation, style captions and export files in Ayah Studio.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  const hasDonateUrl = Boolean(getActiveDonateUrl());
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-5 py-10 sm:py-14 w-full">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ayah Studio guide
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Follow these steps to read the Quran, make captions, match them to a recitation and
          bring them into your video editor.
        </p>
        <div className="mt-8">
          <GuideContent />
        </div>
        <section aria-labelledby="guide-faq" className="mt-10">
          <h2 id="guide-faq" className="text-xl font-bold">
            FAQ
          </h2>
          <dl className="mt-4 space-y-3">
            {GUIDE_FAQ.map(({ question, answer }) => (
              <div
                key={question}
                className="rounded-sm border border-border bg-card p-4"
              >
                <dt className="font-semibold">{question}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <Link
          href="/#/editor"
          className="mt-8 inline-flex rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Start creating
        </Link>
      </main>
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
        <div>
          <Link className="underline hover:text-foreground" href="/guide">
            Guide
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/quran">
            Quran
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-foreground" href="/editors">
            Editors
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
