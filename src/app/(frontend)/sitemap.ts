import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes = [
    { path: "", priority: 1.0 },
    { path: "/quran", priority: 0.8 },
    { path: "/listen", priority: 0.8 },
    { path: "/sources", priority: 0.5 },
    { path: "/donate", priority: 0.5 },
    { path: "/guide", priority: 0.5 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
    { path: "/refunds", priority: 0.3 },
    { path: "/contact", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = baseRoutes.map(({ path, priority }) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "monthly",
    priority,
  }));

  const surahEntries: MetadataRoute.Sitemap = Array.from({ length: 114 }, (_, i) => ({
    url: `${SITE.url}/quran/${i + 1}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...surahEntries];
}
