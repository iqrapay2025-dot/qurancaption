import type { TourDefinition } from "../types";

export const mushafTour: TourDefinition = {
  id: "mushaf",
  name: "Mushaf View Tour",
  description: "Read page-by-page Madani Mushaf with Tajweed colors, word-by-word audio, and font scaling.",
  route: "/mushaf/1",
  steps: [
    {
      id: "mushaf-intro",
      title: "Madani Mushaf Page View",
      body: "Experience reading the Holy Quran in authentic page-by-page Madani Mushaf format, matching the printed 604-page Quran with beautiful Arabic typography.",
    },
    {
      id: "mushaf-nav",
      target: '[data-tour="mushaf-nav"]',
      title: "Jump to Surah, Juz, or Page",
      body: "Easily navigate through all 604 pages, 30 Juz, or 114 Surahs with fast search and instant jump controls.",
      side: "bottom",
      align: "center",
    },
    {
      id: "mushaf-page",
      target: '[data-tour="mushaf-page"]',
      title: "Interactive Mushaf Page",
      body: "Each line preserves the exact layout of the physical Mushaf. Tap any word to play its audio pronunciation or listen to the full ayah recitation.",
      side: "top",
      align: "center",
    },
    {
      id: "mushaf-settings",
      target: '[data-tour="mushaf-display-settings"]',
      title: "Font Sizing, Tajweed & Dark Mode",
      body: "Customize your view in the settings drawer: enable colored Tajweed rules, switch between Light and Dark display mode, and scale font size with proportional Basmala scaling.",
      side: "bottom",
      align: "end",
    },
    {
      id: "mushaf-reciter",
      target: '[data-tour="mushaf-reciter"]',
      title: "Reciter Selection",
      body: "Choose your favorite reciter from world-renowned Qaris to accompany your page-by-page reading with ayah recitation.",
      side: "bottom",
      align: "end",
    },
  ],
};
