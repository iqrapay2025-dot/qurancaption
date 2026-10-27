import "server-only";
import { csrf, fail, ok, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { flutterwaveCheckout } from "@/lib/app/billing";
import { rateLimit } from "@/lib/app/rate-limit";

// One-time Pro upgrade via Flutterwave Standard checkout ($6, USD).
// Returns the hosted checkout link the client redirects to.
export async function POST(req: Request) {
  const bad = csrf(req);
  if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in or create an account to upgrade.", 401);
  const rl = rateLimit(`app:checkout:${String(user.id)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return fail("Flutterwave isn't set up yet. Please check back soon.", 500);
  }
  try {
    const country = req.headers.get("x-vercel-ip-country");
    const url = await flutterwaveCheckout({ id: String(user.id), email: user.email, name: user.name }, country);
    return ok({ url });
  } catch (e) {
    console.error("[billing] flutterwave checkout failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't start the checkout. Please try again in a moment.", 502);
  }
}
