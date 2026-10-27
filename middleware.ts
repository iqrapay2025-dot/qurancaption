import { NextResponse } from "next/server";
import { clientIp } from "./src/lib/app/http";
import { rateLimit } from "./src/lib/app/rate-limit";

// Rate-limit Payload's built-in app-user auth endpoints (login / forgot-password)
// in front of the Payload route handlers. In-memory store is per instance; in a
// multi-node deployment back this with Redis (Upstash etc.) via the same helper.
export const config = { matcher: ["/api/users/login", "/api/users/forgot-password", "/api/app/rate"] };

export function middleware(req: Request) {
  const ip = clientIp(req);
  const pathname = new URL(req.url).pathname;
  if (pathname === "/api/app/rate") {
    const rl = rateLimit(`app:rate:${ip}`, 60, 60 * 1000);
    if (!rl.ok) {
      return new NextResponse(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(rl.retryAfter), "cache-control": "no-store" },
      });
    }
    return NextResponse.next();
  }
  const rl = rateLimit(`payload:${pathname}:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(rl.retryAfter), "cache-control": "no-store" },
    });
  }
  return NextResponse.next();
}
