import { csrf, fail, ok, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { getAccount, paystackCancel, paystackDisable, setBilling } from "@/lib/app/billing";

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "");

const CANCEL_FAILED = "We couldn't cancel your Paystack subscription. Please contact support so we can do it for you.";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const uid = String(user.id);

  const rl = rateLimit(`app:cancel:${uid}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const acc = await getAccount(uid);
  if (acc.plan !== "pro" || !acc.billing.provider) return fail("You don't have an active Pro subscription.", 400);
  if (acc.billing.cancelAtPeriodEnd) return ok();

  const provider = acc.billing.provider;
  const isManual =
    provider === "flutterwave" ||
    (provider === "paystack" && !acc.customerRef && !acc.subscriptionRef);
  if (isManual) {
    return fail(`This payment doesn't renew automatically, so there is nothing to cancel. Your Pro access ends on ${fmtDate(acc.billing.proUntil)}.`, 400);
  }
  if (provider !== "paystack") {
    return fail("We can't cancel this subscription automatically. Please contact support so we can do it for you.", 400);
  }

  try {
    if (acc.subscriptionRef && acc.emailToken) {
      await paystackDisable(acc.subscriptionRef, acc.emailToken);
    } else {
      // Looks the subscription up from the stored code or customer reference.
      await paystackCancel(acc);
    }
  } catch (e) {
    console.error("[billing] paystack cancel failed:", e instanceof Error ? e.message : e);
    return fail(CANCEL_FAILED, 502);
  }

  try {
    await setBilling(uid, { cancelAtPeriodEnd: true });
  } catch (e) {
    // Paystack already cancelled; the webhook will also record it.
    console.error("[billing] cancel saved at Paystack but local update failed:", e instanceof Error ? e.message : e);
  }
  return ok();
}