import type { TourDefinition } from "../types";

export const listenTour: TourDefinition = {
  id: "listen",
  name: "Listen Page Tour",
  description: "Discover uninterrupted Quran recitations, audio controls, and the background mini-player.",
  route: "/listen",
  steps: [
    {
      id: "listen-reciter",
      target: '[data-tour="listen-reciter-select"]',
      title: "Choose Reciter",
      body: "Select from full recordings by world-renowned reciters including Mishari al-Afasy, Al-Husary, AbdulBasit, and Minshawi.",
      side: "bottom",
      align: "start",
    },
    {
      id: "listen-surahs",
      target: '[data-tour="listen-surah-list"]',
      title: "Browse & Play Surahs",
      body: "Tap any surah to start instant streaming. Your playback position is automatically remembered for next time.",
      side: "top",
      align: "center",
    },
    {
      id: "listen-playback",
      target: '[data-tour="listen-playback-controls"]',
      title: "Playback & Seeking",
      body: "Play, pause, skip forward or back, and jump directly to any timestamp along the waveform progress bar.",
      side: "top",
      align: "center",
    },
    {
      id: "listen-extra",
      target: '[data-tour="listen-extra-controls"]',
      title: "Speed, Repeat & Sleep Timer",
      body: "Fine-tune playback speed, loop surahs for revision, and set a sleep timer to pause audio automatically.",
      side: "top",
      align: "end",
    },
    {
      id: "listen-continuous",
      target: '[data-tour="listen-player-bar"]',
      title: "Continuous Background Audio",
      body: "Your recitation keeps playing uninterrupted as you browse the Quran reader, editor, or other pages via the mini-player bar.",
      side: "top",
      align: "center",
    },
  ],
};
