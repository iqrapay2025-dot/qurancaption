import { getPayloadClient } from "@/lib/payload";
import { csrf, fail, ok, readJson } from "@/lib/app/http";
import { publicUser, setSession } from "@/lib/app/session";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (!email || !password) return fail("Enter your email and password.");
  const payload = await getPayloadClient();
  try {
    const { token, exp, user } = await payload.login({ collection: "users", data: { email, password } });
    if (!token) return fail("Incorrect email or password.", 401);
    await setSession(token, exp);
    return ok({ user: user ? publicUser(user) : null });
  } catch (e) {
    const locked = e instanceof Error && /locked/i.test(e.message);
    return fail(locked ? "Too many attempts. Try again in a few minutes." : "Incorrect email or password.", locked ? 429 : 401);
  }
}
