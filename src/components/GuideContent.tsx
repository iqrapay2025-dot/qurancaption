"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  BookOpen,
  Headphones,
  Calendar,
  Video,
  Bookmark,
  Zap,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  List,
} from "lucide-react";
import {
  GUIDE_SECTIONS,
  GUIDE_STEPS,
  GUIDE_FREE_LIMITS,
  GUIDE_PRO_FEATURES,
  GUIDE_TROUBLESHOOTING,
  GUIDE_FAQ,
  type GuideSection,
  type GuideSectionId,
} from "@/lib/guide";
import { useTour } from "./tour/TourProvider";
import type { TourId } from "@/lib/tours/types";
import { DuaHandsIcon } from "./icons/DuaHandsIcon";

function getSectionIcon(id: GuideSectionId) {
  switch (id) {
    case "welcome":
      return <Compass className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "read":
      return <BookOpen className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "mushaf":
      return <BookOpen className="size-5 text-primary shrink-0" aria-hidden="true" />;
    case "planner":
      return <Calendar className="size-5 text-primary shrink-0" aria-hidden="true" />;
    case "listen":
      return <Headphones className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "adhkar":
      return <DuaHandsIcon size={18} className="text-gold shrink-0" />;
    case "daily-ayah":
      return <Calendar className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "editor":
      return <Video className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "account":
      return <Bookmark className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "plans":
      return <Zap className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "troubleshooting":
      return <AlertCircle className="size-5 text-gold shrink-0" aria-hidden="true" />;
    case "faq":
      return <HelpCircle className="size-5 text-gold shrink-0" aria-hidden="true" />;
  }
}

function TourAction({
  tourId,
  route,
  label = "Take this tour",
}: {
  tourId: TourId;
  route: string;
  label?: string;
}) {
  const { startTour } = useTour();
  const pathname = usePathname();

  const isCurrentRoute =
    pathname === route ||
    (route === "/#/editor" && pathname === "/") ||
    (route === "/" && pathname === "/");

  const targetHref = route.includes("#")
    ? `${route}?tour=${tourId}`
    : `${route}?tour=${tourId}`;

  return (
    <Link
      href={targetHref}
      onClick={(e) => {
        if (isCurrentRoute) {
          e.preventDefault();
          startTour(tourId);
        }
      }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Compass size={15} className="text-gold shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function GuideContent({ compact = false }: { compact?: boolean }) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("welcome");

  // Track active section for desktop sticky TOC highlighting
  useEffect(() => {
    if (compact || typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible && visible.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    GUIDE_SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [compact]);

  // If rendered in compact mode inside the Editor help modal
  if (compact) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-gold/40 bg-gold/10 p-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              Prefer a live walkthrough?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Take an interactive spotlight tour inside the caption editor.
            </p>
          </div>
          <TourAction
            tourId="editor"
            route="/#/editor"
            label="Start interactive tour"
          />
        </div>

        <section aria-labelledby="editor-compact-steps">
          <h2 id="editor-compact-steps" className="text-lg font-bold">
            Caption editor: 8 steps
          </h2>
          <ol className="mt-3 space-y-3">
            {GUIDE_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-sm border border-border bg-card p-3.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.link && (
                    <Link
                      className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-2"
                      href={step.link.href}
                    >
                      {step.link.label}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="editor-compact-limits" className="space-y-3">
          <h2 id="editor-compact-limits" className="text-lg font-bold">
            Free plan and Pro
          </h2>
          <p className="rounded-sm border border-border bg-card p-3.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground block mb-1">Free plan:</strong>
            {GUIDE_FREE_LIMITS}
          </p>
          <p className="rounded-sm border border-border bg-card p-3.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground block mb-1">Pro features:</strong>
            {GUIDE_PRO_FEATURES}
          </p>
        </section>

        <section aria-labelledby="editor-compact-troubleshooting">
          <h2 id="editor-compact-troubleshooting" className="text-lg font-bold">
            Troubleshooting
          </h2>
          <ul className="mt-3 space-y-3">
            {GUIDE_TROUBLESHOOTING.filter(
              (i) => !i.category || i.category === "editor"
            ).map(({ problem, solution }) => (
              <li
                key={problem}
                className="rounded-sm border border-border bg-card p-3.5 text-xs sm:text-sm leading-relaxed"
              >
                <h3 className="font-semibold text-foreground">{problem}</h3>
                <p className="mt-1 text-muted-foreground">{solution}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-sm border border-border bg-muted/40 p-4 text-xs sm:text-sm flex items-center justify-between gap-3">
          <span>Need help with Quran reading, audio recitations, or account storage?</span>
          <Link
            href="/guide"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 shrink-0"
          >
            Full site guide <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  // Full site guide layout
  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] xl:grid-cols-[260px_1fr] lg:gap-10">
      {/* Mobile Table of Contents Accordion */}
      <nav
        aria-label="Table of contents"
        className="lg:hidden mb-8 rounded-sm border border-border bg-card sticky top-16 z-20 shadow-sm"
      >
        <button
          type="button"
          onClick={() => setMobileTocOpen((prev) => !prev)}
          aria-expanded={mobileTocOpen}
          aria-controls="mobile-toc-list"
          className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="flex items-center gap-2">
            <List size={16} className="text-gold" aria-hidden="true" />
            <span>Table of contents</span>
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-muted-foreground ${
              mobileTocOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {mobileTocOpen && (
          <ul
            id="mobile-toc-list"
            className="border-t border-border px-2 py-2 space-y-1 max-h-[60vh] overflow-y-auto"
          >
            {GUIDE_SECTIONS.map((section) => {
              const isCurrent = activeSection === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => setMobileTocOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-sm min-h-[44px] text-sm transition-colors ${
                      isCurrent
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {getSectionIcon(section.id)}
                    <span>{section.navTitle}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Desktop Sticky Table of Contents Sidebar */}
      <aside className="hidden lg:block">
        <nav
          aria-label="Table of contents"
          className="sticky top-20 rounded-sm border border-border bg-card p-4 space-y-1"
        >
          <div className="flex items-center gap-2 px-2 pb-2 mb-1 border-b border-border/60 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            <List size={14} className="text-gold" aria-hidden="true" />
            <span>Table of contents</span>
          </div>
          <ul className="space-y-0.5">
            {GUIDE_SECTIONS.map((section) => {
              const isCurrent = activeSection === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-sm text-xs xl:text-sm transition-colors ${
                      isCurrent
                        ? "bg-primary/10 font-semibold text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {getSectionIcon(section.id)}
                    <span className="truncate">{section.navTitle}</span>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 mt-3 border-t border-border/60">
            <TourAction
              tourId="welcome"
              route="/"
              label="Interactive tour"
            />
          </div>
        </nav>
      </aside>

      {/* Main Guide Content Sections */}
      <div className="space-y-14 min-w-0">
        {/* Top Hero Walkthrough Banner */}
        <div className="rounded-sm border border-gold/40 bg-gold/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-gold" aria-hidden="true" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Interactive Guided Tours
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Prefer seeing the interface in action? Launch interactive spotlight tours that guide you through every part of Aayah Studio.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <TourAction
              tourId="welcome"
              route="/"
              label="Start Welcome tour"
            />
          </div>
        </div>

        {/* Section 1: Welcome */}
        <section id="welcome" aria-labelledby="heading-welcome" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#welcome"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-welcome" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome to Aayah Studio
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Aayah Studio is a modern web application dedicated to reading, listening to, memorizing, and creating beautiful social video captions for the Holy Quran.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Who Aayah Studio is for
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Built for readers, students of knowledge, content creators, and anyone seeking to connect with the Quran. Whether studying at home, listening on your daily commute, memorizing verses, or crafting video reels for social media, Aayah Studio brings all your tools together.
              </p>
            </div>
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Core capabilities
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Read all 114 surahs in authentic Uthmani script with translations and tafsirs; stream recitations from world-renowned Qaris in a background player; practice with repetition tools; reflect on the Daily Ayah; and design precisely timed video captions for TikTok, Reels, and YouTube.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="welcome"
              route="/"
              label="Start Welcome tour"
            />
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Visit Home page</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 2: Read Quran */}
        <section id="read" aria-labelledby="heading-read" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#read"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-read" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Read the Quran
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Read all 114 surahs in authentic Uthmani script with translations, tajweed coloring, classical tafsir commentaries, ayah audio, bookmarks, and memorization practice.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Opening a surah & searching
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Browse the surah index by revelation order or number, or use the quick search bar to find any surah by Arabic name, English transliteration, meaning, or surah number (1–114).
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Translations & reading settings
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Personalize your reading experience in Settings. Choose your preferred Arabic font script (Amiri Quran, Scheherazade New, Amiri), adjust font sizes, and toggle English transliteration.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Tajweed colors
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Turn on Tajweed coloring in reading settings to highlight recitation rules (ghunnah, idgham, ikhfa, qalqalah, madd) directly inside the Arabic text.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Tafsir commentaries
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click the Tafsir button on any verse to view verified classical commentaries, including Tafsir Ibn Kathir, Ma&apos;arif-ul-Quran (by Mufti Muhammad Shafi), and Tafsir Al-Muyassar.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Ayah audio playback
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click Play on any verse to listen to its recitation. Follow along with automatic active verse highlighting and choose between reciters like Mishari Rashid Al-Afasy and Mahmoud Khalil Al-Husary.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Bookmarks
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click the bookmark icon on any ayah to save it for quick reference. Access all your saved verses anytime from Quran → Bookmarks.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Practice & memorization mode (Muraja&apos;a)
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click Practice on any verse to open the repetition drawer. Set custom repetition counts (1 to 50 times), interval delays between repetitions, auto-scroll, and text blur/reveal to test your memory without looking.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Offline reading
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Download surahs for offline reading with one click. Aayah Studio stores the Arabic text and translations securely in your browser&apos;s local IndexedDB so you can read anytime without internet.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="quran-reader"
              route="/quran/1"
              label="Take Reader tour"
            />
            <Link
              href="/quran"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Quran reader</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section: Mushaf View */}
        <section id="mushaf" aria-labelledby="heading-mushaf" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#mushaf"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-mushaf" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Madani Mushaf Page View
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Read the Holy Quran page-by-page in authentic 604-page Madani Mushaf layout with colored Tajweed rules, word-by-word audio, dynamic Basmala font scaling, and dark mode.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Authentic 604-page Madani layout
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Browse the Quran exactly as printed in the classical Madani Mushaf (15 lines per page). Jump directly to any page (1–604), Juz (1–30), or Surah (1–114) with instant search.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Word-by-word interactive audio playback
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click on any individual word on the page to hear its authentic pronunciation, or trigger full ayah playback. The active word and verse are highlighted in real time.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Tajweed rule color coding
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Enable Tajweed colors in the font settings to visually distinguish recitation rules (ghunnah, ikhfa, idgham, qalqalah, madd) directly on the Arabic text.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Dynamic proportional Basmala scaling
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                When you increase or decrease font size in Mushaf settings, the decorative surah header banners and Bismillah dynamically scale in harmony with the verse text.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4 sm:col-span-2">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Dedicated dark mode & reciter switching
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Toggle between Light and Dark mode seamlessly from within the Mushaf header for comfortable night reading, and select your preferred reciter for audio playback.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="mushaf"
              route="/mushaf/1"
              label="Take Mushaf tour"
            />
            <Link
              href="/mushaf"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Mushaf View</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 3: Listen Quran */}
        <section id="listen" aria-labelledby="heading-listen" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#listen"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-listen" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Listen to the Quran
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Stream full surah recitations by world-renowned reciters with playback speed control, repeat modes, sleep timer, and persistent background playback.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Choosing a surah and reciter
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Select from all 114 surahs and world-class reciters, including Mishari Rashid Al-Afasy, Mahmoud Khalil Al-Husary, AbdulBaset AbdulSamad, Muhammad Siddiq Al-Minshawi, Abu Bakr Al-Shatri, and more.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Playback speed & volume
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Adjust recitation speed between 0.75x, 1x, 1.25x, and 1.5x to suit your listening or revision pace. Control audio volume with mute support.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Repeat modes & sleep timer
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Loop the current surah or autoplay the entire Quran continuously. Set a sleep timer (15, 30, 45, or 60 minutes) to automatically pause playback as you fall asleep.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Persistent background mini-player
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Audio keeps playing seamlessly in the global bottom mini-player as you navigate across the site—reading other surahs, creating captions, or browsing.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4 sm:col-span-2">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Saved position & auto-resume
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Aayah Studio remembers your exact timestamp and surah so you can pick up right where you left off when you return to the Listen page.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="listen"
              route="/listen"
              label="Take Listen tour"
            />
            <Link
              href="/listen"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Listen page</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section: Daily Adhkar */}
        <section id="adhkar" aria-labelledby="heading-adhkar" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#adhkar"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-adhkar" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Adhkar, Du'as & Daily Remembrance
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Recite authentic morning & evening supplications, after-salah adhkar, sleep protection, track daily streaks, view hadith evidence, and stay punctual with prayer times.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Authentic categories & daily schedule
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Explore 6 core categories from Hisn al-Muslim: Morning Adhkar (Fajr to sunrise), Evening Adhkar (Asr to sunset), After Salah, Before Sleep, Waking Up, and General Du'as.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Digital tap counter & haptic feedback
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Each dhikr card features a tap counter counting down from the Sunnah repeat goal (e.g. 1x, 3x, 33x, 100x) with subtle haptic vibration on mobile and an automated 'Done ✓' celebration state.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Verified hadith references & Sunnah.com links
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Every supplication includes its authentic source (Sahih al-Bukhari, Sahih Muslim, Abu Dawud, At-Tirmidhi), grading, narrator, virtue, and a direct link to Sunnah.com.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Daily streak tracking & today dashboard
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Keep consistent with your daily remembrance using the automated streak counter and the Today dashboard tracking your 5 post-salah supplication windows.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Accurate prayer times & smart reminders
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                View calculated prayer times (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) with live countdowns, customizable calculation methods, Asr school, and after-salah reminder offsets.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Bilingual search & 100% offline access
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Search adhkar in Arabic or English with spelling tolerance, and click 'Save Offline' to download all supplications and prayer schedules to your device.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="adhkar"
              route="/adhkar"
              label="Take Adhkar tour"
            />
            <Link
              href="/adhkar"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Daily Adhkar</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 4: Daily Ayah */}
        <section id="daily-ayah" aria-labelledby="heading-daily-ayah" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#daily-ayah"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-daily-ayah" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Daily Ayah
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Reflect on a handpicked verse every day on the homepage, listen to its recitation, share with rich link preview cards, or download as an image card.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Daily inspiration
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Discover a daily verse on the homepage complete with authentic Arabic text, English translation, surah reference, and one-click recitation audio.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Rich link preview sharing
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click Share to generate a dedicated URL with rich OpenGraph preview cards when pasted into WhatsApp, Telegram, X, Facebook, and iMessage.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Download as card image
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Click Download image to render an elegant 1080x1350 (4:5) card right on your device. Choose Light or Dark theme, PNG or JPG format, with gold borders and branding.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/#daily-ayah"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>View Daily Ayah on Home</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 5: Caption Editor */}
        <section id="editor" aria-labelledby="heading-editor" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#editor"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-editor" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Make Captions & Videos
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Create beautifully styled, precisely timed Quran captions for TikTok, Instagram Reels, YouTube Shorts, and full-screen videos in 8 simple steps.
            </p>
          </div>

          <ol className="space-y-3.5">
            {GUIDE_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3.5 rounded-sm border border-border bg-card p-4 transition-colors hover:border-gold/40"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs sm:text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.link && (
                    <Link
                      className="mt-2 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary underline underline-offset-2"
                      href={step.link.href}
                    >
                      {step.link.label} <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="editor"
              route="/#/editor"
              label="Take Editor tour"
            />
            <Link
              href="/#/editor"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Caption Editor</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 6: Account & Bookmarks */}
        <section id="account" aria-labelledby="heading-account" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#account"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-account" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Account, Bookmarks & Projects
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Understand what works freely as a guest and how signing up enhances your experience.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Guest access (no account)
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                You can read the full Quran, listen to all recitations, use repetition practice, download daily ayah image cards, and export subtitles without signing up. Up to 3 projects and all your bookmarks are stored locally in your browser.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Free account benefits
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Create a free account to sync your saved projects to the cloud, access your drafts across different devices, and ensure your work is never lost when clearing browser cookies.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-card p-4">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Where bookmarks are saved
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Ayah bookmarks are saved in your browser&apos;s persistent local storage. They remain available whenever you visit Aayah Studio on that browser and device.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <TourAction
              tourId="bookmarks"
              route="/quran/bookmarks"
              label="Take Bookmarks tour"
            />
            <Link
              href="/quran/bookmarks"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Open Bookmarks</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 7: Free Plan and Pro */}
        <section id="plans" aria-labelledby="heading-plans" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#plans"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-plans" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Free Plan and Pro
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Aayah Studio provides generous free tools for all Muslims and students of knowledge, alongside powerful Pro capabilities for content creators.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Free Plan</h3>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Default
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {GUIDE_FREE_LIMITS}
              </p>
              <ul className="space-y-1.5 pt-2 border-t border-border/60 text-xs sm:text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Up to 3 saved projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Up to 20 verses per export</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>40 unique verses exported per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>SRT and VTT subtitle exports</span>
                </li>
              </ul>
            </div>

            <div className="rounded-sm border border-gold/40 bg-gold/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Pro Plan</h3>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  For creators
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {GUIDE_PRO_FEATURES}
              </p>
              <ul className="space-y-1.5 pt-2 border-t border-border/60 text-xs sm:text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Unlimited projects & verses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Upload custom recitation audio</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Save custom style presets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-gold shrink-0" />
                  <span>Export transparent video overlays</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/pricing"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>View Pricing Plans</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Section 8: Troubleshooting */}
        <section id="troubleshooting" aria-labelledby="heading-troubleshooting" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#troubleshooting"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-troubleshooting" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Troubleshooting
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Quick answers and solutions for audio streaming, reciters, tafsir loading, video editor subtitle imports, and Arabic fonts.
            </p>
          </div>

          <ul className="space-y-3">
            {GUIDE_TROUBLESHOOTING.map(({ problem, solution, category }) => (
              <li
                key={problem}
                className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-gold/40"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-gold shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">
                      {problem}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {solution}
                    </p>
                    {category && (
                      <span className="mt-2.5 inline-block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-sm">
                        {category}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 9: Frequently Asked Questions */}
        <section id="faq" aria-labelledby="heading-faq" className="scroll-mt-32 sm:scroll-mt-24 space-y-4">
          <div className="border-b border-border pb-3">
            <a
              href="#faq"
              className="group inline-flex items-center gap-2 text-foreground hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              <h2 id="heading-faq" className="text-2xl sm:text-3xl font-bold tracking-tight">
                Frequently Asked Questions
              </h2>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg font-normal" aria-hidden="true">
                #
              </span>
            </a>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Common questions about offline reading, installing the app, audio streaming, bookmarks, and caption exports.
            </p>
          </div>

          <dl className="space-y-3">
            {GUIDE_FAQ.map(({ question, answer }) => (
              <div
                key={question}
                className="rounded-sm border border-border bg-card p-4"
              >
                <dt className="font-semibold text-sm sm:text-base text-foreground flex items-start gap-2">
                  <HelpCircle size={17} className="text-gold shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{question}</span>
                </dt>
                <dd className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground pl-6">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bottom CTA Card */}
        <div className="rounded-sm border border-border bg-card p-6 text-center space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Ready to explore Aayah Studio?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Choose whether to read the Quran with tafsir, listen to world-class reciters, or create timed video captions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/quran"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <span>Read Quran</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/listen"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span>Listen</span>
            </Link>
            <Link
              href="/#/editor"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span>Caption Editor</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
