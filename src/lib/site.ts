export const siteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3001";
};
export const SITE = {
  name: "Quran Caption Studio",
  tagline: "Synced Quran captions for your videos",
  description: "Create timed Arabic and translation captions for Quran recitation videos. Pick a surah and ayah range, style the preview, and export SRT or VTT for CapCut, Premiere Pro, DaVinci Resolve and more.",
  url: siteUrl(),
  email: "qurancaptionstudio@gmail.com",
  updated: "25 October 2026",
  api: { name: "UmmahAPI", url: "https://ummahapi.com/api/docs" },
};
