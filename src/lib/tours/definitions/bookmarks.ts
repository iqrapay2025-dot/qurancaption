import type { TourDefinition } from "../types";

export const bookmarksTour: TourDefinition = {
  id: "bookmarks",
  name: "Bookmarks & Downloads Tour",
  description: "Learn how to manage your bookmarked ayahs, personal notes, and offline surahs.",
  route: "/quran/bookmarks",
  steps: [
    {
      id: "bookmarks-list",
      target: '[data-tour="bookmarks-container"]',
      title: "Saved Ayahs & Notes",
      body: "All verses you bookmark while reading appear here, grouped by surah with your custom personal reflections.",
      side: "top",
      align: "center",
    },
    {
      id: "bookmarks-backup",
      target: '[data-tour="bookmarks-backup-buttons"]',
      title: "Import & Export",
      body: "Export your bookmarks as a JSON backup to keep your notes safe, or import them into another browser or device.",
      side: "bottom",
      align: "end",
    },
    {
      id: "bookmarks-downloads",
      target: '[data-tour="bookmarks-tabs"]',
      title: "Offline Downloads",
      body: "Switch to Offline Downloads to view, listen to, and manage downloaded surahs without an active internet connection.",
      side: "bottom",
      align: "start",
    },
  ],
};
