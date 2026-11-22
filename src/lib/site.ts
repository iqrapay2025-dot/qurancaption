import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "./brand";

export const siteUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl && (envUrl.includes("aayahstudio") || envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
    return envUrl;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  return "https://aayahstudio.vercel.app";
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
