import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { applyStripeSub, grantProPeriod, PAYSTACK_MANUAL_KIND, paystackVerify, stripeSession, stripeSubscription } from "@/lib/app/billing";
import { PRO_PRICE_NGN } from "@/lib/app/plans";

const REF = /^[\w.\-]{6,120}$/;

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in to confirm your payment.", 401);
  const b = (await readJson(req)) as { provider?: string; ref?: string } | null;
  if (!b?.ref) {
    console.error("[billing] confirm: missing ref in body", JSON.stringify(b));
    return fail("Invalid payment reference.", 400);
  }
  if (!REF.test(b.ref)) {
    console.error(`[billing] confirm: invalid reference format: "${b.ref}"`);
    return fail("Invalid payment reference.", 400);
  }
  const uid = String(user.id);
  const rl = rateLimit(`app:confirm:${uid}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  try {
    if (b.provider === "paystack") {
      const tx = await paystackVerify(b.ref);
      const meta = typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {};
      const kind = typeof meta.kind === "string" ? meta.kind : null;
      const amount = Number(tx.amount ?? 0);
      const currency = String(tx.currency ?? "").toUpperCase();
      const planCode = tx.plan?.plan_code ?? null;
      if (tx.status !== "success" || currency !== "NGN" || amount !== PRO_PRICE_NGN * 100) return fail("We couldn't confirm this payment.", 400);
      if (kind === PAYSTACK_MANUAL_KIND) {
        if (planCode) return fail("We couldn't confirm this payment.", 400);
      } else if (planCode && planCode !== process.env.PAYSTACK_PLAN_CODE) {
        return fail("We couldn't confirm this payment.", 400);
      }
      if (meta.userId !== uid && String(tx.customer?.email ?? "").toLowerCase() !== String(user.email ?? "").toLowerCase()) {
        return fail("This payment does not belong to your account.", 403);
      }
      const { applied } = await grantProPeriod({
        userId: uid,
        provider: "paystack",
        reference: tx.reference,
        customerRef: kind !== PAYSTACK_MANUAL_KIND ? tx.customer?.customer_code : null,
      });
      return ok({ ok: true, alreadyApplied: !applied });
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
