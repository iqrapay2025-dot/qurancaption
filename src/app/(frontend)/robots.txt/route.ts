import { SITE } from "@/lib/site"

export const dynamic = "force-static"

export function GET() {
  if (process.env.ALLOW_INDEXING !== "true") {
    const body = "User-agent: *\nDisallow: /\n";
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
