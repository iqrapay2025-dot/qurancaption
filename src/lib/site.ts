import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "./brand";

export const siteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3001";
};
export const SITE = {
  name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  description: BRAND_DESCRIPTION,
  url: siteUrl(),
  email: "aayahstudiomail@gmail.com",
  updated: "11 November 2026",
  api: { name: "UmmahAPI", url: "https://ummahapi.com/api/docs" },
};
