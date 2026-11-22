"use client";

import {
  ArrowRight,
  Check,
  Download,
  ListChecks,
  Palette,
  BookOpen,
  BookText,
  Headphones,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { PRO_PRICE_NGN, FLUTTERWAVE_PRICE_USD } from "../lib/app/plans";
import type { AppUser } from "../lib/app/client";
import { SiteHeader } from "./SiteHeader";
import { BRAND_DESCRIPTION } from "../lib/brand";
import { ContinueCard } from "./quran/ContinueCard";
import { DailyAyahCard } from "./DailyAyahCard";
import { InstallAppButton } from "./InstallAppButton";
import { buildMistakeReportMailto } from "../lib/mistake-report";
import { getActiveDonateUrl } from "../lib/donate";

type Props = {
  onStart: () => void;
  user: AppUser | null;
  onLogin: () => void;
  onSignup: () => void;
  onProjects: () => void;
  onPricing: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  dark: boolean;
  toggleTheme: () => void;
};

const steps = [
  {
    icon: ListChecks,
    title: "Pick verses",
    body: "Choose a surah and ayah range, then layer Arabic, translation and transliteration exactly as published.",
  },
  {
    icon: Palette,
    title: "Style",
    body: "Set the script, size, colour and position. Preview it live over the recitation in 9:16, 16:9 or square.",
  },
  {
    icon: Download,
    title: "Export",
    body: "Download SRT or VTT, already timed to the audio, and drop it straight onto your timeline.",
  },
];

const readFeatures = [
  {
    icon: BookOpen,
    title: "Read",
    body: "All 114 surahs in Uthmani script, with your choice of translation.",
  },
  {
    icon: BookText,
    title: "Understand",
    body: "Open tafsir for any ayah, only when you want it.",
  },
  {
    icon: Headphones,
    title: "Listen",
    body: "Play ayah by ayah with a reciter of your choice. The current verse stays highlighted.",
  },
  {
    icon: Sliders,
    title: "Personalise",
    body: "Set font size, script style, translation and reciter. Your settings are saved in this browser.",
  },
];

const editors = ["CapCut", "Premiere Pro", "DaVinci Resolve", "Filmora"];
const btnGreen =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-linear-to-b from-[#2cbd6d] to-[#178f4a] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-[#178f4a]/25 transition hover:brightness-95";
const btnOutline =
  "inline-flex items-center justify-center rounded-sm border border-foreground/80 bg-card px-7 py-3 text-sm font-semibold transition hover:bg-foreground hover:text-background";

function Mosque() {
  return (
    <svg
      viewBox="0 0 600 360"
      aria-hidden="true"
      className="absolute right-0 bottom-0 h-full max-h-105 w-auto text-foreground opacity-[0.06]"
      fill="currentColor"
    >
      <path d="M40 360V150l20-40 20 40v210zM520 360V150l20-40 20 40v210zM140 360V220c0-60 40-100 100-130 10-40 30-60 60-90 30 30 50 50 60 90 60 30 100 70 100 130v140z" />
      <circle cx="430" cy="70" r="34" />
    </svg>
  );
}

export default function Landing({
  onStart,
  user,
  onLogin,
  onSignup,
  onProjects,
  onPricing,
  onSettings,
  onSignOut,
  dark,
  toggleTheme,
}: Props) {
  const hasDonateUrl = Boolean(getActiveDonateUrl());
  const v = {
    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        onStart={onStart}
        user={user}
        onLogin={onLogin}
        onSignup={onSignup}
        onProjects={onProjects}
        onPricing={onPricing}
        onSettings={onSettings}
        onSignOut={onSignOut}
        dark={dark}
        toggleTheme={toggleTheme}
      />

      {/* Hero Section */}
      <section id="top" className="scroll-mt-20 relative overflow-hidden bg-muted">
        <Mosque />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
          <div className="md:pr-6">
            <h1 className="text-4xl leading-[1.18] font-bold tracking-tight text-balance sm:text-5xl">
              Read the Quran. Create with it.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              {BRAND_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quran" data-tour="hero-read-quran" className={btnGreen}>
                Read the Quran <ArrowRight size={16} />
              </Link>
              <button type="button" data-tour="hero-create-captions" onClick={onStart} className={btnOutline}>
                Create captions
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No signup needed for your first export.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-88">
            <div className="absolute inset-x-6 -bottom-4 h-8 rounded-[50%] bg-foreground/20 blur-xl" />
            <div className="checker relative aspect-4/5 overflow-hidden rounded-md border-[6px] border-[#1a2547] shadow-2xl">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-7 text-center text-white">
                <p
                  translate="no"
                  dir="rtl"
                  lang="ar"
                  className="font-quran text-4xl leading-[1.9] [text-shadow:0_2px_12px_rgba(0,0,0,.7)] sm:text-5xl"
                >
                  {v.arabic}
                </p>
                <p className="mx-auto mt-3 max-w-xs text-[15px] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">
                  {v.text}
                </p>
                <p className="mt-4 text-xs font-semibold tracking-widest text-[#6fe3a0]">
                  1:1
                </p>
              </div>
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-sm bg-black/60 px-3 py-2 font-mono text-[11px] text-white/80">
                <span>00:00</span>
                <span className="h-1 flex-1 rounded bg-white/20">
                  <span className="block h-full w-1/3 rounded bg-[#2cbd6d]" />
                </span>
                <span>00:45</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Reading & Listening Card */}
      <div className="mx-auto max-w-6xl px-5 pt-8 md:px-8 space-y-6">
        <ContinueCard />
        <DailyAyahCard />
      </div>

      {/* New "Read" Section */}
      <section id="read" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <h2 className="mx-auto max-w-lg text-center text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          A calm place to read and listen
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {readFeatures.map((f) => (
            <div
              key={f.title}
              data-tour={f.title === "Listen" ? "feature-listen" : undefined}
              className="rounded-md border border-border bg-card p-6 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <span className="grid size-12 place-items-center rounded-full bg-linear-to-b from-[#2cbd6d] to-[#178f4a] text-white mb-5">
                  <f.icon size={20} />
                </span>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/quran" className={btnGreen}>
            Browse the surahs <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Existing "Three steps" section */}
      <section id="how" className="scroll-mt-20 bg-muted/40 py-16 md:py-24 border-y border-border">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
              Then turn verses into captions
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Pick the verses you just read and export timed captions in minutes.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-md border border-border bg-card p-7 shadow-xs transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-full bg-linear-to-b from-[#2cbd6d] to-[#178f4a] text-white">
                    <s.icon size={20} />
                  </span>
                  <span className="text-4xl font-bold text-foreground/10">0{i + 1}</span>
                </div>
                <h3 className="mt-5 mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Editors Section */}
      <section id="editors" className="scroll-mt-20 bg-navy text-white">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl leading-tight font-bold sm:text-3xl">
            Works with any editor that imports subtitles.
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {editors.map((e) => (
              <li
                key={e}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-4 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                {e}
              </li>
            ))}
          </ul>
          <button onClick={onStart} className={`${btnGreen} mt-10`}>
            Open the editor
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-20 mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-24">
        <h2 className="text-center text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          Free to begin, Pro when you grow
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            {
              name: "Free",
              amount: "$0",
              conversion: null,
              items: [
                "Up to 3 saved projects",
                "SRT and VTT export",
                "Up to 20 verses per export",
                "Preview, style and sync tools",
              ],
              pro: false,
            },
            {
              name: "Pro",
              amount: `$${FLUTTERWAVE_PRICE_USD}`,
              conversion: `₦${Math.round(PRO_PRICE_NGN).toLocaleString()}`,
              items: [
                "Unlimited projects and verses",
                "SRT and VTT export",
                "Custom style presets",
                "Priority support",
              ],
              pro: true,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-md bg-card p-5 sm:p-7 transition-shadow hover:shadow-lg ${
                p.pro ? "border-2 border-accent" : "border border-border"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{p.name}</h3>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">
                    {p.amount}
                  </span>
                  {p.conversion && (
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      ({p.conversion})
                    </span>
                  )}
                  <span className="text-xs sm:text-sm text-muted-foreground"> /month</span>
                </div>
              </div>
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2.5 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    <Check size={17} className="mt-0.5 shrink-0 text-gold" />
                    {i}
                  </li>
                ))}
              </ul>
              <button
                onClick={p.pro ? onPricing : onStart}
                className={`${p.pro ? btnGreen : btnOutline} mt-6 sm:mt-8 w-full min-h-11`}
              >
                {p.pro ? "Go Pro" : "Start free"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-3 md:px-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-3">
              <picture className="size-9 block shrink-0">
                <source srcSet="/brand/ayah-badge-dark-48.webp" type="image/webp" />
                <img
                  src="/brand/ayah-badge-dark-48.png"
                  alt="Aayah Studio"
                  width={36}
                  height={36}
                  loading="lazy"
                  decoding="async"
                  className="size-9 object-contain"
                />
              </picture>
              <span className="font-display text-lg font-bold tracking-tight">
                <span className="text-gold">Aayah</span> Studio
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Read the Quran with translation, tafsir and recitation, and create caption files for your recitation videos.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Attribution</h4>
            <p className="text-sm leading-relaxed">
              Quran data, translations and recitation audio are provided by{" "}
              <a
                className="underline hover:text-[#6fe3a0]"
                href="https://ummahapi.com/api/docs"
                target="_blank"
                rel="noreferrer"
              >
                UmmahAPI
              </a>{" "}
              (Quran text from Tanzil.net, CC BY 3.0; translations via quran.com) and are shown exactly as published. The author of each translation and the reciter are credited in the editor and in every export screen.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Contact</h4>
            <a
              className="block text-sm hover:text-[#6fe3a0]"
              href="mailto:aayahstudiomail@gmail.com"
            >
              Aayah Studio support (aayahstudiomail@gmail.com)
            </a>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <a className="hover:text-[#6fe3a0]" href="/">
                Home
              </a>
              <a className="hover:text-[#6fe3a0]" href="/quran">
                Quran
              </a>
              <a className="hover:text-[#6fe3a0]" href="/listen">
                Listen
              </a>
              <a className="hover:text-[#6fe3a0]" href="/sources">
                Sources
              </a>
              <a
                suppressHydrationWarning
                className="hover:text-[#6fe3a0]"
                href={buildMistakeReportMailto()}
              >
                Report a mistake
              </a>
              <a className="hover:text-[#6fe3a0]" href="/guide">
                Guide
              </a>
              <a className="hover:text-[#6fe3a0]" href="/editors">
                Editors
              </a>
              <a className="hover:text-[#6fe3a0]" href="/terms">
                Terms of use
              </a>
              <a className="hover:text-[#6fe3a0]" href="/privacy">
                Privacy policy
              </a>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("cookie_consent_choice");
                  } catch {}
                  window.dispatchEvent(new CustomEvent("cookie-consent:reset"));
                }}
                className="hover:text-[#6fe3a0] text-left cursor-pointer"
              >
                Cookie settings
              </button>
              <a className="hover:text-[#6fe3a0]" href="/refunds">
                Refunds
              </a>
              <a className="hover:text-[#6fe3a0]" href="/contact">
                Contact
              </a>
              {hasDonateUrl && (
                <a className="hover:text-[#6fe3a0]" href="/donate">
                  Donate
                </a>
              )}
              <span data-tour="install-app-footer" className="inline-flex items-center">
                <InstallAppButton />
              </span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs">
          © Aayah Studio
        </div>
      </footer>
    </div>
  );
}
