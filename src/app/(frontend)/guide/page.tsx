import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared";
import { GuideContent } from "@/components/GuideContent";
import { GUIDE_FAQ } from "@/lib/guide";

export const metadata: Metadata = {
  title: "User guide",
  description:
    "Learn how to choose Quran verses, preview recitation, style captions and export files in Quran Caption Studio.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Logo compact />
          <div className="flex flex-wrap justify-end gap-2">
            <a
              href="/"
              className="rounded-sm border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              Go back to home
            </a>
            <Link
              href="/#/editor"
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Start creating
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Quran Caption Studio guide
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Follow these steps to make captions, match them to a recitation and
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
        <Link className="underline" href="/guide">
          Guide
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="/editors">
          Editors
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="/terms">
          Terms of use
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="/privacy">
          Privacy policy
        </Link>
      </footer>
    </div>
  );
}
