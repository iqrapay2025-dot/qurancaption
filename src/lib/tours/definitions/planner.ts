import type { TourDefinition } from "../types";

export const plannerTour: TourDefinition = {
  id: "planner",
  name: "Memorization Planner Tour",
  description: "Master daily Sabaq, recent Sabqi revision, cumulative Manzil cycles, and your 604-page progress grid.",
  route: "/planner",
  steps: [
    {
      id: "planner-intro",
      title: "Hifz & Muraja'ah Planner",
      body: "Welcome to your personal Quran memorization companion. Organize your daily journey through the traditional three tasks: Sabaq (new lesson), Sabqi (recent revision), and Manzil (cycle revision).",
    },
    {
      id: "planner-sabaq",
      target: '[data-tour="planner-sabaq"]',
      title: "1. Sabaq (New Lesson)",
      body: "Your daily portion to memorize. Adjust your pace from 3 to 15 lines (or write any custom lines) in Settings. Use Practice mode to repeat verses 3–20x with audio and hide Arabic text for self-testing.",
      side: "bottom",
      align: "center",
    },
    {
      id: "planner-sabqi",
      target: '[data-tour="planner-sabqi"]',
      title: "2. Sabqi (Recent Revision)",
      body: "Revisit lessons learned over the last 3 to 7 days to solidify them into intermediate memory. Rate each portion as Strong, Okay, or Weak to adapt your spaced repetition schedule.",
      side: "top",
      align: "center",
    },
    {
      id: "planner-manzil",
      target: '[data-tour="planner-manzil"]',
      title: "3. Manzil (Cumulative Cycle)",
      body: "A daily slice rotating through everything you have ever memorized across 15, 30, or 60 days so no portion of the Quran is ever forgotten.",
      side: "top",
      align: "center",
    },
    {
      id: "planner-progress",
      target: '[data-tour="planner-progress-link"]',
      title: "604-Page Progress Grid",
      body: "Tap the chart icon to inspect all 604 Madani Mushaf pages color-coded by status (New, Learning, Memorized, Weak), filter by Juz, and check your pace statistics.",
      side: "bottom",
      align: "end",
    },
    {
      id: "planner-settings",
      target: '[data-tour="planner-settings-link"]',
      title: "Settings, Pace & Backups",
      body: "Configure custom daily lines, custom pace names, morning & evening reminder times, and export/import JSON backups to keep your data safe.",
      side: "bottom",
      align: "end",
    },
  ],
};
