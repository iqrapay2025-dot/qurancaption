import { csrf, fail, ok } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { getAccount, paystackCancel, paystackDisable, setBilling, stripeCancel, applyStripeSub } from "@/lib/app/billing";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in first.", 401);
  const uid = String(user.id);
  const acc = await getAccount(uid);
  if (acc.plan !== "pro" || !acc.billing.provider) return fail("You don't have an active Pro subscription.", 400);
  if (acc.billing.cancelAtPeriodEnd) return ok();
  try {
    if (acc.billing.provider === "stripe") {
      if (!acc.subscriptionRef) throw new Error("no subscription ref");
      await applyStripeSub(await stripeCancel(acc.subscriptionRef), uid);
    } else {
      if (!acc.subscriptionRef || !acc.emailToken) {
        return fail("Cannot cancel: your Paystack subscription details are missing on this account. Contact support so we can cancel it for you.", 400);
      }
      try {
        await paystackDisable(acc.subscriptionRef, acc.emailToken);
      } catch (e) {
        console.error("[billing] paystack cancel failed:", e instanceof Error ? e.message : e);
        return fail("We couldn't cancel your Paystack subscription. Please contact support so we can do it for you.", 502);
      }
      await setBilling(uid, { cancelAtPeriodEnd: true });
    }
  } catch (e) {
    console.error("[billing] cancel failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't cancel right now. Please try again, or contact support so we can do it for you.", 502);
  }
  return ok();
}
