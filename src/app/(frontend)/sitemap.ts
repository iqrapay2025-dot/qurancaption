import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/terms", "/privacy"].map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "monthly", priority: p ? 0.3 : 1 }))
}
