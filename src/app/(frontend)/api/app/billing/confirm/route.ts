import { csrf, fail, ok, readJson } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { applyStripeSub, claimEvent, extend, getAccount, paystackVerify, releaseEvent, setBilling, stripeSession, stripeSubscription } from "@/lib/app/billing";

const REF = /^[\w.\-]{6,120}$/;

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in to confirm your payment.", 401);
  const b = (await readJson(req)) as { provider?: string; ref?: string } | null;
  if (!b?.ref || !REF.test(b.ref)) return fail("Invalid payment reference.");
  const uid = String(user.id);
  try {
    if (b.provider === "paystack") {
      const tx = await paystackVerify(b.ref);
      const meta = typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {};
      if (tx.status !== "success" || meta.userId !== uid) return fail("We couldn't confirm this payment.", 400);
      const key = `paystack:charge:${tx.reference}`;
      if (await claimEvent(key, "paystack.charge")) {
        try {
          const acc = await getAccount(uid);
          await setBilling(uid, { provider: "paystack", billingStatus: "active", cancelAtPeriodEnd: false, proUntil: extend(acc.billing.proUntil), ...(tx.customer?.customer_code ? { customerRef: tx.customer.customer_code } : {}) });
        } catch (e) {
          await releaseEvent(key);
          throw e;
        }
      }
    } else if (b.provider === "stripe") {
      const s = await stripeSession(b.ref);
      if (s.client_reference_id !== uid || s.status !== "complete" || !s.subscription) return fail("We couldn't confirm this payment.", 400);
      await applyStripeSub(await stripeSubscription(s.subscription), uid);
    } else return fail("Unknown payment provider.");
  } catch (e) {
    console.error("[billing] confirm failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't confirm the payment yet. It may take a minute to appear.", 502);
  }
  return ok();
}
