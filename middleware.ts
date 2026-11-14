import { NextResponse } from "next/server";
import { clientIp } from "./src/lib/app/http";
import { rateLimit } from "./src/lib/app/rate-limit";

// Rate-limit Payload's built-in app-user auth endpoints (login / forgot-password)
// and the app rate endpoint in front of the route handlers. Uses Upstash Redis when
// configured, with an in-memory fallback otherwise (see rate-limit.ts).
export const config = {
  matcher: ["/api/users/login", "/api/users/forgot-password", "/api/app/rate"],
};

function tooManyRequests(retryAfter: number) {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfter),
        "cache-control": "no-store",
      },
    },
  );
}

export async function middleware(req: Request) {
  const ip = clientIp(req);
  const pathname = new URL(req.url).pathname;

  if (pathname === "/api/app/rate") {
    const rl = await rateLimit(`app:rate:${ip}`, 60, 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);
    return NextResponse.next();
  }

  // Auth endpoints: block in production if Redis is missing or failing.
  const rl = await rateLimit(`payload:${pathname}:${ip}`, 5, 15 * 60 * 1000, {
    failClosed: true,
  });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  return NextResponse.next();
}