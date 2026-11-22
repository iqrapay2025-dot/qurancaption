import type { TourId } from "./tours/types";
export { GUIDE_HINT_DISMISSED_KEY, shouldShowGuideHint } from "./guideHint";

export type GuideSectionId =
  | "welcome"
  | "read"
  | "listen"
  | "daily-ayah"
  | "editor"
  | "account"
  | "plans"
  | "troubleshooting"
  | "faq";

export type GuideStep = {
  title: string;
  body: string;
  short?: string;
  tourTarget?: string;
  link?: { href: string; label: string };
};

export type GuideIssue = {
  problem: string;
  solution: string;
  category?: "reader" | "audio" | "editor" | "general";
};

export type GuideFaqItem = {
  question: string;
  answer: string;
  category?: "reading" | "audio" | "editor" | "account" | "general";
};

export type GuideSubsection = {
  title: string;
  body: string;
};

export type GuideSection = {
  id: GuideSectionId;
  title: string;
  navTitle: string;
  summary: string;
  subsections?: GuideSubsection[];
  tourId?: TourId;
  tourRoute?: string;
  tourLabel?: string;
  pageHref?: string;
  pageLabel?: string;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Choose your verses",
    body: "Pick the surah, Start ayah and End ayah. On the Free plan, a single export can include up to 20 verses. You can also select multiple ranges if you need a longer passage.",
    short: "Pick the surah and ayah range. You can also select multiple ranges for longer passages.",
    tourTarget: '[data-tour="editor-verses-section"]',
  },
  {
    title: "Choose a reciter",
    body: "Pick a reciter in the Recitation section and press Play to preview the audio. If you have Pro, you can also upload your own recitation and time it to each verse.",
    short: "Select a reciter and press Play to preview the audio. Pro users can upload custom audio.",
    tourTarget: '[data-tour="editor-recitation-section"]',
  },
  {
    title: "Choose what appears",
    body: "Keep Arabic text on, then add a Translation, Transliteration, and verse number layer. You can also turn on Tajweed colors and word highlighting (estimated), which shows emphasis while the timing is not exact word-by-word.",
    short: "Toggle Arabic, Translation, Transliteration, verse numbers, Tajweed colors, and word highlights.",
    tourTarget: '[data-tour="editor-layers-section"]',
  },
  {
    title: "Choose a video shape",
    body: "In Canvas size, pick a platform preset such as TikTok, Instagram Reels, YouTube Shorts, YouTube (16:9) or Instagram Square. Turn on Show safe area guide to keep captions clear of on-screen controls.",
    short: "Select a platform preset (Reels, TikTok, YouTube) and toggle the safe area guide.",
    tourTarget: '[data-tour="editor-canvas-section"]',
  },
  {
    title: "Style your captions",
    body: "In Style, choose the Arabic font, Arabic size, Translation size, text colour, background, shadow or outline, alignment, and position. If you have Pro, save your favorite settings as a preset for reuse later.",
    short: "Customize fonts, sizing, colors, shadows, alignment, and position to fit your video look.",
    tourTarget: '[data-tour="editor-style-section"]',
  },
  {
    title: "Export captions, audio or overlay",
    body: "Choose SRT (recommended) or VTT. You can export captions separately or as one combined file, add a timing offset, and download the recitation as a WAV. Pro users can also render a transparent video overlay for use above their own footage.",
    short: "Export SRT, VTT, combined subtitles, recitation WAV, or transparent video overlay.",
    tourTarget: '[data-tour="editor-export-button"]',
  },
  {
    title: "Import into your video editor",
    body: "Follow the import steps for your editor. If you are using an app like CapCut, Premiere, DaVinci or KineMaster, the export format you choose will depend on the editor's subtitle support.",
    short: "Drop your exported captions into CapCut, Premiere, DaVinci, or your favorite video editor.",
    tourTarget: '[data-tour="editor-preview-canvas"]',
    link: { href: "/editors", label: "See editor instructions" },
  },
  {
    title: "Save projects and revisit them",
    body: "You can make your first export without signing up. Create a free account to save projects, return to a draft later, and keep your favorite caption setups without losing progress.",
    short: "Create a free account to save projects automatically and return to your drafts anytime.",
    tourTarget: '[data-tour="editor-save-indicator"]',
  },
];

export const GUIDE_FREE_LIMITS =
  "The Free plan includes up to 3 saved projects, up to 20 verses per export, 40 unique verses exported per month, and SRT/VTT subtitle exports. Own recitation uploads, custom style presets, and transparent video overlays are Pro features.";

export const GUIDE_PRO_FEATURES =
  "Pro adds unlimited projects and verses, custom style presets, uploading your own recitation audio, transparent video overlays, and priority support. It also removes the Free plan limits on saved projects and verse usage.";

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to Aayah Studio",
    navTitle: "Welcome",
    summary:
      "Aayah Studio is a complete web platform for reading, listening to, memorizing, and creating beautiful social video captions for the Holy Quran.",
    tourId: "welcome",
    tourRoute: "/",
    tourLabel: "Start Welcome tour",
    pageHref: "/",
    pageLabel: "Visit Home page",
    subsections: [
      {
        title: "Who Aayah Studio is for",
        body: "Aayah Studio is built for readers, students of knowledge, content creators, and anyone who wants to connect with the Holy Quran. Whether you are reading at home, listening on the go, memorizing verses, or crafting Quran video reels for social media, Aayah Studio provides all the tools you need in one place.",
      },
      {
        title: "Core capabilities",
        body: "Read all 114 surahs in authentic Uthmani script with translations and classical tafsirs; stream recitations from world-renowned Qaris in a persistent background player; practice with repetition tools and text blur; reflect on the Daily Ayah; and design precisely timed, typography-rich video captions for TikTok, Reels, and YouTube.",
      },
    ],
  },
  {
    id: "read",
    title: "Read the Quran",
    navTitle: "Read Quran",
    summary:
      "Read all 114 surahs in authentic Uthmani script with translations, tajweed coloring, classical tafsir commentaries, ayah audio, bookmarks, and memorization practice.",
    tourId: "quran-reader",
    tourRoute: "/quran/1",
    tourLabel: "Take Reader tour",
    pageHref: "/quran",
    pageLabel: "Open Quran reader",
    subsections: [
      {
        title: "Opening a surah & searching",
        body: "Browse the surah index by revelation order or number, or use the quick search bar to find any surah by its Arabic name, English transliteration, meaning, or surah number (1–114).",
      },
      {
        title: "Translations & reading settings",
        body: "Open the reading settings drawer to personalize your view. Choose your preferred Arabic font script (Amiri Quran, Scheherazade New, Amiri), adjust Arabic and translation text sizes, and toggle transliteration.",
      },
      {
        title: "Tajweed colors",
        body: "Turn on Tajweed coloring in reading settings to highlight recitation rules (ghunnah, idgham, ikhfa, qalqalah, madd) directly inside the Arabic text.",
      },
      {
        title: "Tafsir commentaries",
        body: "Click the Tafsir button on any verse to view verified classical commentaries, including Tafsir Ibn Kathir, Ma'arif-ul-Quran (by Mufti Muhammad Shafi), and Tafsir Al-Muyassar.",
      },
      {
        title: "Ayah audio playback",
        body: "Click the Play button on any ayah to listen to its recitation. Follow along with automatic active verse highlighting and choose between reciters like Mishari Rashid Al-Afasy and Mahmoud Khalil Al-Husary.",
      },
      {
        title: "Bookmarks",
        body: "Click the bookmark icon on any ayah to save it for quick reference. Access all your saved verses anytime from Quran → Bookmarks.",
      },
      {
        title: "Practice & memorization mode (Muraja'a)",
        body: "Click Practice on any verse to open the memorization drawer. Set custom repetition counts (1 to 50 times), interval delays between repetitions, auto-scroll, and text blur/reveal to test your memory without looking.",
      },
      {
        title: "Offline reading",
        body: "Download surahs for offline reading with one click. Aayah Studio stores the Arabic text and translations securely in your browser's local IndexedDB so you can read anytime without internet.",
      },
    ],
  },
  {
    id: "listen",
    title: "Listen to the Quran",
    navTitle: "Listen to Quran",
    summary:
      "Stream full surah recitations by world-renowned reciters with playback speed control, repeat modes, sleep timer, and persistent background playback.",
    tourId: "listen",
    tourRoute: "/listen",
    tourLabel: "Take Listen tour",
    pageHref: "/listen",
    pageLabel: "Open Listen page",
    subsections: [
      {
        title: "Choosing a surah and reciter",
        body: "Select from all 114 surahs and world-class reciters, including Mishari Rashid Al-Afasy, Mahmoud Khalil Al-Husary, AbdulBaset AbdulSamad, Muhammad Siddiq Al-Minshawi, Abu Bakr Al-Shatri, and more.",
      },
      {
        title: "Playback speed & volume",
        body: "Adjust recitation speed between 0.75x, 1x, 1.25x, and 1.5x to suit your listening or revision pace. Control audio volume with mute support.",
      },
      {
        title: "Repeat modes & sleep timer",
        body: "Loop the current surah or autoplay the entire Quran continuously. Set a sleep timer (15, 30, 45, or 60 minutes) to automatically pause playback as you fall asleep.",
      },
      {
        title: "Persistent background mini-player",
        body: "Audio keeps playing seamlessly in the global bottom mini-player as you navigate across the site—reading other surahs, creating captions, or browsing.",
      },
      {
        title: "Saved position & auto-resume",
        body: "Aayah Studio remembers your exact timestamp and surah so you can pick up right where you left off when you return to the Listen page.",
      },
    ],
  },
  {
    id: "daily-ayah",
    title: "Daily Ayah",
    navTitle: "Daily Ayah",
    summary:
      "Reflect on a handpicked verse every day on the homepage, listen to its recitation, share with rich link preview cards, or download as an image card.",
    pageHref: "/#daily-ayah",
    pageLabel: "View Daily Ayah on Home",
    subsections: [
      {
        title: "Daily inspiration & recitation",
        body: "Discover a daily verse on the homepage complete with authentic Arabic text, English translation, surah reference, and one-click recitation audio.",
      },
      {
        title: "Copying and rich link sharing",
        body: "Click Copy to copy the formatted verse and reference to your clipboard. Click Share to share a dedicated link that generates a rich OpenGraph preview card on WhatsApp, Telegram, X, Facebook, and iMessage.",
      },
      {
        title: "Download as an image card",
        body: "Click Download image to render an elegant 1080x1350 (4:5) card right in your browser. Choose between Light and Dark themes, PNG or JPG format, with gold borders, authentic Arabic typography, and official Aayah Studio branding.",
      },
    ],
  },
  {
    id: "editor",
    title: "Make Captions & Videos",
    navTitle: "Caption Editor",
    summary:
      "Create beautifully styled, precisely timed Quran captions for TikTok, Instagram Reels, YouTube Shorts, and full-screen videos in 8 simple steps.",
    tourId: "editor",
    tourRoute: "/#/editor",
    tourLabel: "Take Editor tour",
    pageHref: "/#/editor",
    pageLabel: "Open Caption Editor",
    subsections: [
      {
        title: "8-Step caption workflow",
        body: "Follow the numbered steps in the editor: choose verses, select a reciter, toggle layers (Arabic, translations, transliteration, tajweed), pick platform canvas presets, style typography and shadows, export subtitles (SRT/VTT) or transparent video overlays, and import into your video editor.",
      },
      {
        title: "Platform canvas presets & safe areas",
        body: "Switch between 9:16 (TikTok, Reels, Shorts), 16:9 (YouTube), and 1:1 (Instagram Feed). Turn on the Safe Area guide to ensure your captions are never hidden behind platform icons or comment bars.",
      },
      {
        title: "Transparent video overlay (Pro)",
        body: "Pro users can export transparent video overlays with alpha channel to drop directly on top of their own video footage in CapCut, Premiere Pro, or DaVinci Resolve without having to restyle subtitles.",
      },
    ],
  },
  {
    id: "account",
    title: "Account, Bookmarks & Projects",
    navTitle: "Account & Storage",
    summary:
      "Understand what works as a guest and how signing up enhances your experience.",
    tourId: "bookmarks",
    tourRoute: "/quran/bookmarks",
    tourLabel: "Take Bookmarks tour",
    pageHref: "/quran/bookmarks",
    pageLabel: "Open Bookmarks",
    subsections: [
      {
        title: "Guest access (no account required)",
        body: "You can read the entire Quran, listen to all recitations, use repetition practice, download daily ayah image cards, and export subtitle files without creating an account. Up to 3 projects and all your bookmarks are stored locally in your browser.",
      },
      {
        title: "Free account benefits",
        body: "Create a free account to sync your saved projects to the cloud, access your drafts across different devices, and ensure your work is never lost when clearing browser cookies.",
      },
      {
        title: "Where bookmarks are saved",
        body: "Ayah bookmarks are saved in your browser's persistent storage. They remain available whenever you visit Aayah Studio on that browser and device.",
      },
    ],
  },
  {
    id: "plans",
    title: "Free Plan and Pro",
    navTitle: "Free vs Pro",
    summary:
      "Aayah Studio provides generous free tools for all Muslims and students of knowledge, alongside powerful Pro capabilities for content creators.",
    pageHref: "/pricing",
    pageLabel: "View Pricing Plans",
    subsections: [
      {
        title: "Free plan limits",
        body: GUIDE_FREE_LIMITS,
      },
      {
        title: "Pro features",
        body: GUIDE_PRO_FEATURES,
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    navTitle: "Troubleshooting",
    summary:
      "Quick answers and solutions for audio streaming, reciters, tafsir loading, video editor subtitle imports, and Arabic fonts.",
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    navTitle: "FAQ",
    summary:
      "Common questions about offline reading, installing the app, audio streaming, bookmarks, and caption exports.",
  },
];

export const GUIDE_TROUBLESHOOTING: GuideIssue[] = [
  {
    category: "audio",
    problem: "Audio will not play or stops unexpectedly.",
    solution:
      "Ensure you have a stable internet connection or that the surah was downloaded for offline listening. Mobile browsers often restrict autoplay until user interaction; tap the Play button directly. If an individual audio stream is slow or unavailable, try switching to a different reciter.",
  },
  {
    category: "audio",
    problem: "A specific reciter is not playing or missing.",
    solution:
      "Audio streams are delivered via high-speed CDNs. Occasionally a reciter's remote server may experience temporary downtime. Switch to another reciter (e.g. Mishari Al-Afasy or Mahmoud Al-Husary) or refresh the page.",
  },
  {
    category: "reader",
    problem: "Tafsir will not load.",
    solution:
      "Tafsir commentaries (Ibn Kathir, Ma'arif-ul-Quran, Al-Muyassar) are fetched on demand. Make sure you are connected to the internet and click the Tafsir button again. If one tafsir does not load, try switching to another available commentary in the drawer.",
  },
  {
    category: "reader",
    problem: "How do I read the Quran offline?",
    solution:
      "Open the Quran reader and click the 'Save offline' button on any surah. The full Arabic text and translations are saved in your browser's local IndexedDB database, allowing you to read even with no internet connection.",
  },
  {
    category: "editor",
    problem: "Captions appear slightly early or late in my video editor.",
    solution:
      "Adjust the Timing offset slider in the editor's Export dialog before downloading, or refine individual verse timings when using your own recitation recording.",
  },
  {
    category: "editor",
    problem: "My own audio does not line up with the ayahs.",
    solution:
      "Use the waveform timing controls in Verses & timing to set or adjust each ayah start and end point, then preview playback before exporting.",
  },
  {
    category: "editor",
    problem: "Verses will not load in the caption editor.",
    solution:
      "Click 'Try again' or choose a smaller verse range to ensure the requested passage loads reliably across your network connection.",
  },
  {
    category: "editor",
    problem: "Arabic appears as boxes or is shaped differently in a video editor.",
    solution:
      "SRT and VTT subtitle files contain only plain text and timestamps, not embedded fonts. Video editors use their own Arabic font engine, which can vary by app. Set your editor's subtitle font to an Arabic-supporting font, or export a transparent video overlay (Pro) to preserve the exact website styling.",
  },
  {
    category: "editor",
    problem: "VTT will not import into my video editing app.",
    solution:
      "Export SRT instead, or use the combined caption file in editors that struggle with VTT timing or multiple subtitle tracks.",
  },
  {
    category: "editor",
    problem: "In CapCut, imported caption tracks move or style together.",
    solution:
      "Use the combined subtitle file, or convert captions to standard text layers if your CapCut version supports it. Preview the imported result before final video render.",
  },
];

export const GUIDE_FAQ: GuideFaqItem[] = [
  {
    category: "reading",
    question: "Can I read the Quran offline?",
    answer:
      "Yes! In the Quran reader, click the offline download button on any surah to cache the Arabic text and translations to your device via IndexedDB. You can read them anytime without an active internet connection.",
  },
  {
    category: "general",
    question: "Can I install Aayah Studio on my phone or computer?",
    answer:
      "Yes. Aayah Studio is a Progressive Web App (PWA). On mobile (Safari on iOS or Chrome on Android), tap 'Share' or the browser menu and select 'Add to Home Screen'. On desktop Chrome/Edge, click the install icon in the URL bar to run it as a standalone app.",
  },
  {
    category: "account",
    question: "Where are my bookmarks saved?",
    answer:
      "Bookmarks are saved in your browser's persistent local storage. They remain available whenever you visit Aayah Studio on that browser and device.",
  },
  {
    category: "editor",
    question: "Can I try the caption editor without an account?",
    answer:
      "Yes. You can choose verses, customize typography, preview recitation, and make your first export without signing up. A free account lets you save up to 3 projects and return to them later.",
  },
  {
    category: "editor",
    question: "Can I use my own recitation audio?",
    answer:
      "Yes, with Pro. Upload your own MP3, M4A, or WAV file, then time each ayah to your recording with waveform controls before exporting or previewing.",
  },
  {
    category: "editor",
    question: "Can I download the recitation audio too?",
    answer:
      "Yes. Choose Recitation audio in the Export dialog to download a high-quality WAV audio file for the selected range.",
  },
  {
    category: "editor",
    question: "Can I save my favourite caption styles?",
    answer:
      "Yes, with Pro. Custom style presets allow you to save your font, color, background, shadow, and alignment configuration for reuse across multiple projects.",
  },
  {
    category: "editor",
    question: "Are the caption colors included in SRT or VTT?",
    answer:
      "No. Standard SRT and VTT formats contain only plain text and timestamps. To preserve the exact fonts, colors, and shadows, Pro users can export transparent video overlays.",
  },
  {
    category: "audio",
    question: "Does audio keep playing when I browse to another page?",
    answer:
      "Yes. When you start listening on the Listen page, playback continues seamlessly in the persistent bottom mini-player as you browse other pages like the Quran reader, Guide, or Home.",
  },
  {
    category: "general",
    question: "How can I report a mistake or suggest a feature?",
    answer:
      "We take Quranic accuracy very seriously. Click 'Report a mistake' in the footer or email us at support@ayahstudio.app with the surah and ayah number.",
  },
];
