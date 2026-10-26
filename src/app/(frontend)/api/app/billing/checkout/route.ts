import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, paystackCheckout, paystackCheckoutManual, paystackConfigured, stripeCheckout, stripeConfigured } from "@/lib/app/billing";
import { rateLimit } from "@/lib/app/rate-limit";

type Mode = "auto" | "manual";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in or create an account to upgrade.", 401);
  const rl = rateLimit(`app:checkout:${String(user.id)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  const b = (await readJson(req)) as { provider?: string; mode?: Mode } | null;
  const provider = b?.provider;
  const mode = b?.mode ?? "auto";
  if (provider !== "paystack" && provider !== "stripe") return fail("Choose Paystack or Stripe.");
  if (mode !== "auto" && mode !== "manual") return fail("Invalid checkout mode.");
  if (mode === "manual" && provider !== "paystack") return fail("Pay monthly is only available with Paystack.");
  const acc = await getAccount(String(user.id));
  if (acc.plan === "pro" && !acc.billing.cancelAtPeriodEnd) return fail("You're already on Pro.", 409);
  if (provider === "paystack" ? !paystackConfigured() : !stripeConfigured())
    return fail(`Payments with ${provider === "paystack" ? "Paystack" : "Stripe"} aren't set up yet. Please try the other option or check back soon.`, 503);
  try {
    let url: string;
    if (provider === "paystack") {
      url = mode === "manual" ? await paystackCheckoutManual({ id: String(user.id), email: user.email }) : await paystackCheckout({ id: String(user.id), email: user.email });
    } else {
      url = await stripeCheckout({ id: String(user.id), email: user.email });
    }
    return ok({ url });
  } catch (e) {
    console.error("[billing] checkout failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't start the checkout. Please try again in a moment.", 502);
  }
}
