"use client";

import { ArrowRight, Check, Download, ListChecks, Palette } from "lucide-react";
import Link from "next/link";
import { PRO_PRICE_NGN } from "../lib/app/plans";
import type { AppUser } from "../lib/app/client";
import AccountMenu from "./AccountMenu";
import { Logo, ThemeToggle } from "./shared";

type Props = { onStart: () => void; user: AppUser | null; onLogin: () => void; onSignup: () => void; onProjects: () => void; onPricing: () => void; onSettings: () => void; onSignOut: () => void; dark: boolean; toggleTheme: () => void };

const steps = [
  { icon: ListChecks, title: "Pick verses", body: "Choose a surah and ayah range, then layer Arabic, translation and transliteration exactly as published." },
  { icon: Palette, title: "Style", body: "Set the script, size, colour and position. Preview it live over the recitation in 9:16, 16:9 or square." },
  { icon: Download, title: "Export", body: "Download SRT or VTT, already timed to the audio, and drop it straight onto your timeline." },
];

const editors = ["CapCut", "Premiere Pro", "DaVinci Resolve", "Filmora"];
const btnGreen = "inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-b from-[#2cbd6d] to-[#178f4a] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-[#178f4a]/25 transition hover:brightness-95";
const btnOutline = "inline-flex items-center justify-center rounded-sm border border-foreground/80 bg-card px-7 py-3 text-sm font-semibold transition hover:bg-foreground hover:text-background";

function Mosque() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true" className="absolute right-0 bottom-0 h-full max-h-[420px] w-auto text-foreground opacity-[0.06]" fill="currentColor">
      <path d="M40 360V150l20-40 20 40v210zM520 360V150l20-40 20 40v210zM140 360V220c0-60 40-100 100-130 10-40 30-60 60-90 30 30 50 50 60 90 60 30 100 70 100 130v140z" />
      <circle cx="430" cy="70" r="34" />
    </svg>
  );
}

export default function Landing({ onStart, user, onLogin, onSignup, onProjects, onPricing, onSettings, onSignOut, dark, toggleTheme }: Props) {
  const v = { arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", text: "In the name of Allah, the Entirely Merciful, the Especially Merciful." };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center px-5 md:h-[72px] md:grid-cols-[1fr_auto_1fr] md:px-8">
          <div><Logo /></div>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/home" className="hover:text-gold">Home</Link>
            <Link href="/how-it-works" className="hover:text-gold">How it works</Link>
            <Link href="/editors" className="hover:text-gold">Editors</Link>
            <Link href="/pricing" className="hover:text-gold">Pricing</Link>
          </nav>
          <div className="flex items-center justify-end gap-3">
            <ThemeToggle dark={dark} toggle={toggleTheme} />
            {!user && <button onClick={onLogin} className="hidden text-sm font-semibold hover:text-gold sm:block">Log in</button>}
            <button onClick={user ? onStart : onSignup} className="rounded-sm border border-foreground/80 px-4 py-2 text-sm font-semibold hover:bg-foreground hover:text-background">{user ? "Open editor" : "Sign up"}</button>
            {user && <AccountMenu user={user} onLogin={onLogin} onProjects={onProjects} onSettings={onSettings} onSignOut={onSignOut} />}
          </div>
        </div>
      </header>

      <section id="top" className="scroll-mt-20 relative overflow-hidden bg-muted">
        <Mosque />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
          <div className="md:pr-6">
            <h1 className="text-4xl leading-[1.18] font-bold tracking-tight text-balance sm:text-5xl">
              Make Quran videos in minutes, not hours.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Stop copying one ayah at a time from Quran.com and timing each one by hand. Pick the verses once, and export captions that are already in sync with the recitation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onStart} className={btnGreen}>Start creating <ArrowRight size={16} /></button>
              <a href="#how" className={btnOutline}>How it works</a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No signup needed for your first export.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[22rem]">
            <div className="absolute inset-x-6 -bottom-4 h-8 rounded-[50%] bg-foreground/20 blur-xl" />
            <div className="checker relative aspect-[4/5] overflow-hidden rounded-md border-[6px] border-[#1a2547] shadow-2xl">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-7 text-center text-white">
                <p translate="no" dir="rtl" lang="ar" className="font-quran text-4xl leading-[1.9] [text-shadow:0_2px_12px_rgba(0,0,0,.7)] sm:text-5xl">{v.arabic}</p>
                <p className="mx-auto mt-3 max-w-xs text-[15px] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">{v.text}</p>
                <p className="mt-4 text-xs font-semibold tracking-widest text-[#6fe3a0]">1:1</p>
              </div>
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-sm bg-black/60 px-3 py-2 font-mono text-[11px] text-white/80">
                <span>00:00</span>
                <span className="h-1 flex-1 rounded bg-white/20"><span className="block h-full w-1/3 rounded bg-[#2cbd6d]" /></span>
                <span>00:45</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <h2 className="mx-auto max-w-lg text-center text-3xl leading-tight font-bold tracking-tight sm:text-4xl">Three steps to a timed caption file</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-md border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-full bg-gradient-to-b from-[#2cbd6d] to-[#178f4a] text-white"><s.icon size={20} /></span>
                <span className="text-4xl font-bold text-foreground/10">0{i + 1}</span>
              </div>
              <h3 className="mt-5 mb-2 text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="editors" className="scroll-mt-20 bg-navy text-white">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl leading-tight font-bold sm:text-3xl">Works with any editor that imports subtitles.</h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {editors.map((e) => (
              <li key={e} className="rounded-md border border-white/15 bg-white/5 px-4 py-4 text-sm font-semibold transition-colors hover:bg-white/10">{e}</li>
            ))}
          </ul>
          <button onClick={onStart} className={`${btnGreen} mt-10`}>Open the editor</button>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-24">
        <h2 className="text-center text-3xl leading-tight font-bold tracking-tight sm:text-4xl">Free to begin, Pro when you grow</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            { name: "Free", price: "$0", items: ["Up to 3 saved projects", "SRT and VTT export", "Up to 20 verses per export", "Preview, style and sync tools"], pro: false },
            { name: "Pro", price: "$6 (₦8,370)", items: ["Unlimited projects and verses", "SRT and VTT export", "Custom style presets", "Priority support"], pro: true },
          ].map((p) => (
            <div key={p.name} className={`rounded-md bg-card p-7 transition-shadow hover:shadow-lg ${p.pro ? "border-2 border-accent" : "border border-border"}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p><span className="text-4xl font-bold">{p.price}</span><span className="text-sm text-muted-foreground"> /month</span></p>
              </div>
              <ul className="mt-6 space-y-3">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground"><Check size={18} className="mt-0.5 shrink-0 text-gold" />{i}</li>
                ))}
              </ul>
              <button onClick={p.pro ? onPricing : onStart} className={`${p.pro ? btnGreen : btnOutline} mt-8 w-full`}>{p.pro ? "Go Pro" : "Start free"}</button>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-navy text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-3 md:px-8">
          <div className="text-white">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">Calm, accurate caption tooling for Quran recitation videos.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Attribution</h4>
            <p className="text-sm leading-relaxed">Quran data, translations and recitation audio are provided by <a className="underline hover:text-[#6fe3a0]" href="https://ummahapi.com/api/docs" target="_blank" rel="noreferrer">UmmahAPI</a> (Quran text from Tanzil.net, CC BY 3.0; translations via quran.com) and are shown exactly as published. The author of each translation and the reciter are credited in the editor and in every export screen.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-white">Contact</h4>
            <a className="block text-sm hover:text-[#6fe3a0]" href="mailto:hello@qurancaption.studio">hello@qurancaption.studio</a>
            <div className="mt-3 flex gap-4 text-sm"><a className="hover:text-[#6fe3a0]" href="/terms">Terms of use</a><a className="hover:text-[#6fe3a0]" href="/privacy">Privacy policy</a></div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs">© Quran Caption Studio</div>
      </footer>
    </div>
  );
}
