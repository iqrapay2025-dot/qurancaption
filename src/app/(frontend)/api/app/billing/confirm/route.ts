import { clientIp, csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { findUserId, grantProPeriod, PAYSTACK_MANUAL_KIND, paystackVerify } from "@/lib/app/billing";
import { PRO_PRICE_NGN_KOBO } from "@/lib/app/plans";

const REF = /^[\w.\-]{6,120}$/;

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  const b = (await readJson(req)) as { provider?: string; ref?: string } | null;
  if (!b?.ref) {
    return fail("Invalid payment reference.", 400);
  }
  if (!REF.test(b.ref)) return fail("Invalid payment reference.", 400);
  const rl = await rateLimit(`app:confirm:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);
  try {
    if (b.provider === "paystack") {
      const tx = await paystackVerify(b.ref);
      const meta = typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {};
      const kind = typeof meta.kind === "string" ? meta.kind : null;
      const amount = Number(tx.amount ?? 0);
      const currency = String(tx.currency ?? "").toUpperCase();
      const planCode = tx.plan?.plan_code ?? null;
      if (tx.reference !== b.ref || tx.status !== "success" || currency !== "NGN" || amount !== PRO_PRICE_NGN_KOBO) return fail("We couldn't confirm this payment.", 400);
      if (kind === PAYSTACK_MANUAL_KIND) {
        if (planCode) return fail("We couldn't confirm this payment.", 400);
      } else if (planCode && planCode !== process.env.PAYSTACK_PLAN_CODE) {
        return fail("We couldn't confirm this payment.", 400);
      }
      const userId = await findUserId({
        userId: typeof meta.userId === "string" ? meta.userId : null,
        email: tx.customer?.email,
      });
      if (!userId) return fail("We couldn't find the account associated with this payment. Contact support for help.", 404);
      const { applied } = await grantProPeriod({
        userId,
        provider: "paystack",
        reference: tx.reference,
        customerRef: kind !== PAYSTACK_MANUAL_KIND ? tx.customer?.customer_code : null,
      });
      return ok({ ok: true, alreadyApplied: !applied });
    } else return fail("Unknown payment provider.");
  } catch (e) {
    console.error("[billing] confirm failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't confirm the payment yet. It may take a minute to appear.", 502);
  }
}
