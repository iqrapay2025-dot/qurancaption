import type { TourDefinition } from "../types";

export const adhkarTour: TourDefinition = {
  id: "adhkar",
  name: "Daily Adhkar & Prayer Times Tour",
  description: "Learn how to use authentic supplications, repetition counters, hadith evidence, and prayer times.",
  route: "/adhkar",
  steps: [
    {
      id: "adhkar-intro",
      title: "Daily Adhkar & Supplications",
      body: "Connect with authentic morning, evening, and post-prayer adhkar from Hisn al-Muslim with verified references and digital repetition counters.",
    },
    {
      id: "adhkar-prayer-times",
      target: '[data-tour="adhkar-prayer-times"]',
      title: "Accurate Prayer Times & Countdown",
      body: "View today's prayer schedule with live countdowns to the next prayer. Customize your calculation method, Asr school, or manual minute adjustments.",
      side: "bottom",
      align: "center",
    },
    {
      id: "adhkar-today-dashboard",
      target: '[data-tour="adhkar-today-dashboard"]',
      title: "Today's Adhkar Dashboard",
      body: "Track your 5 post-salah supplication windows, morning, and evening adhkar milestones in real time with intuitive pending, done, and missed states.",
      side: "top",
      align: "center",
    },
    {
      id: "adhkar-categories",
      target: '[data-tour="adhkar-categories"]',
      title: "Explore 6 Adhkar Categories",
      body: "Choose from Morning, Evening, After Salah, Before Sleep, Waking Up, or General Du'as, each with total item counts and completion progress bars.",
      side: "top",
      align: "center",
    },
    {
      id: "adhkar-streak",
      target: '[data-tour="adhkar-streak"]',
      title: "Daily Streak & 100% Offline Access",
      body: "Maintain your daily dhikr consistency with automated streaks, and click 'Save Offline' to store all 106+ supplications on your device without internet.",
      side: "bottom",
      align: "end",
    },
  ],
};
