import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, paystackCheckout, paystackCheckoutManual, paystackConfigured, flutterwaveCheckout } from "@/lib/app/billing";
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
  if (provider !== "paystack" && provider !== "flutterwave") return fail("Choose Paystack or Flutterwave.");
  if (mode !== "auto" && mode !== "manual") return fail("Invalid checkout mode.");
  if (mode === "manual" && provider !== "paystack") return fail("Pay monthly is only available with Paystack.");
  const acc = await getAccount(String(user.id));
  if (acc.plan === "pro" && !acc.billing.cancelAtPeriodEnd) return fail("You're already on Pro.", 409);
  if (provider === "paystack" ? !paystackConfigured() : !process.env.FLUTTERWAVE_SECRET_KEY)
    return fail(`Payments with ${provider === "paystack" ? "Paystack" : "Flutterwave"} aren't set up yet. Please try the other option or check back soon.`, 503);
  try {
    let url: string;
    if (provider === "paystack") {
      url = mode === "manual" ? await paystackCheckoutManual({ id: String(user.id), email: user.email }) : await paystackCheckout({ id: String(user.id), email: user.email });
    } else {
      url = await flutterwaveCheckout({ id: String(user.id), email: user.email });
    }
    return ok({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing] checkout failed:", msg);
    return fail(`We couldn't start the checkout. ${msg}`.slice(0, 200), 502);
  }
}
