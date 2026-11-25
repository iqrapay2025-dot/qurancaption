import type { TourDefinition } from "../types";

export const welcomeTour: TourDefinition = {
  id: "welcome",
  name: "Welcome Tour",
  description: "An overview of Aayah Studio, from reading to creating video captions.",
  route: "/",
  steps: [
    {
      id: "welcome-intro",
      title: "Welcome to Aayah Studio",
      body: "A calm, beautiful place to read the Quran, listen to world-class reciters, reflect on daily adhkar, and create timed captions for your videos.",
    },
    {
      id: "welcome-quran",
      target: '[data-tour="hero-read-quran"]',
      title: "Read Quran & Mushaf",
      body: "Explore all 114 surahs in Uthmani script and authentic page-by-page Madani Mushaf view with Tajweed colors, translations, word-by-word audio, and tafsir.",
      side: "bottom",
      align: "start",
    },
    {
      id: "welcome-adhkar",
      target: '[data-tour="nav-adhkar"]',
      title: "Daily Adhkar & Prayer Times",
      body: "Recite authentic morning, evening, and post-prayer supplications with digital repetition counters, verified hadith evidence, and live prayer countdowns.",
      side: "bottom",
      align: "center",
    },
    {
      id: "welcome-editor",
      target: '[data-tour="hero-create-captions"]',
      title: "Make Video Captions",
      body: "Select any ayah range, format typography and safe areas, and export timed SRT, VTT, or video overlays for CapCut and Premiere.",
      side: "bottom",
      align: "center",
    },
    {
      id: "welcome-daily-ayah",
      target: '[data-tour="daily-ayah-card"]',
      title: "Daily Ayah & Card Export",
      body: "Read today's verse, share rich cards to WhatsApp and Telegram, or download high-resolution poster images.",
      side: "top",
      align: "center",
    },
    {
      id: "welcome-listen",
      target: '[data-tour="feature-listen"]',
      title: "Listen to Quran",
      body: "Stream full surahs from renowned reciters with offline caching. Playback continues seamlessly across pages using the built-in mini player.",
      side: "top",
      align: "center",
    },
    {
      id: "welcome-install",
      target: '[data-tour="install-app-footer"]',
      title: "Install as a Mobile or Desktop App",
      body: "Aayah Studio works offline! Click 'Install app' right here in the footer to install on your phone or computer. On iPhone Safari tap Share > Add to Home Screen; on Android or Chrome click Install.",
      side: "top",
      align: "center",
    },
  ],
};
