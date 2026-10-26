import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, paystackCheckout, paystackConfigured, stripeCheckout, stripeConfigured } from "@/lib/app/billing";
import { rateLimit } from "@/lib/app/rate-limit";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in or create an account to upgrade.", 401);
  const rl = rateLimit(`app:checkout:${String(user.id)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  const b = (await readJson(req)) as { provider?: string } | null;
  const provider = b?.provider;
  if (provider !== "paystack" && provider !== "stripe") return fail("Choose Paystack or Stripe.");
  const acc = await getAccount(String(user.id));
  if (acc.plan === "pro" && !acc.billing.cancelAtPeriodEnd) return fail("You're already on Pro.", 409);
  if (provider === "paystack" ? !paystackConfigured() : !stripeConfigured())
    return fail(`Payments with ${provider === "paystack" ? "Paystack" : "Stripe"} aren't set up yet. Please try the other option or check back soon.`, 503);
  try {
    const url = provider === "paystack" ? await paystackCheckout({ id: String(user.id), email: user.email }) : await stripeCheckout({ id: String(user.id), email: user.email });
    return ok({ url });
  } catch (e) {
    console.error("[billing] checkout failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't start the checkout. Please try again in a moment.", 502);
  }
}
