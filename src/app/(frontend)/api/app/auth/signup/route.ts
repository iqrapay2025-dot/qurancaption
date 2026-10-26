import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson, rateLimited, clientIp } from "@/lib/app/http";
import { publicUser, setSession } from "@/lib/app/session";
import { validEmail, validPassword } from "@/lib/app/validate";
import { rateLimit } from "@/lib/app/rate-limit";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 80) : "";
  const ip = clientIp(req);
  const rl = rateLimit(`app:signup:${email || "unknown"}:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  if (!validEmail(email)) return fail("Enter a valid email address.");
  if (!validPassword(b?.password)) return fail("Use a password of at least 8 characters.");
  const payload = await getPayloadClient();
  const existing = await payload.count({ collection: "users", where: { email: { equals: email } }, overrideAccess: true });
  if (existing.totalDocs > 0) return fail("An account with this email already exists. Try logging in instead.", 409);
  try {
    await payload.create({ collection: "users", data: { email, password: b.password as string, name }, overrideAccess: false });
    const { token, exp, user } = await payload.login({ collection: "users", data: { email, password: b.password as string } });
    if (!token) return fail("Account created, but sign-in failed. Please log in.", 500);
    await setSession(token, exp);
    return ok({ user: user ? publicUser(user) : null }, 201);
  } catch {
    return fail("We couldn't create your account. Please try again.", 500);
  }
}
