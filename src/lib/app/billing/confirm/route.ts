import { ok } from "@/lib/app/http";
import { grantProPeriod } from "@/lib/app/billing";
import { PAYSTACK_MANUAL_KIND } from "@/lib/app/billing";
import { PRO_PRICE_NGN } from "@/lib/app/plans";
import { flutterwavePlanIdForCurrency } from "@/lib/app/flutterwave-plan";

export async function POST(req: Request) {
  const d = await req.json();
  const { uid, tx, kind } = d;
  
  const { applied } = await grantProPeriod({
    userId: uid,
    provider: "paystack",
    reference: tx.reference,
    customerRef: kind !== PAYSTACK_MANUAL_KIND ? tx.customer?.customer_code : null,
    validate: () => {
      const currency = String(d.currency ?? "").toUpperCase();
      const amount = Number(d.amount ?? 0);
      const planCode = d.plan?.plan_code ?? null;
      const reasons: string[] = [];
      if (d.status !== "success") reasons.push("status is not success");
      if (currency !== "NGN") reasons.push(`currency is not NGN (received "${d.currency ?? ""}")`);
      if (amount !== PRO_PRICE_NGN * 100) reasons.push(`amount is ${amount}, expected ${PRO_PRICE_NGN * 100} kobo`);
      if (kind === PAYSTACK_MANUAL_KIND) {
        if (planCode) reasons.push("manual charge must not have a plan");
      } else if (planCode && planCode !== process.env.PAYSTACK_PLAN_CODE) {
        reasons.push(`plan is ${planCode ?? "(none)"}, expected ${process.env.PAYSTACK_PLAN_CODE ?? "(none)"}`);
      }
      // Flutterwave plan ID validation
      if (d.provider === "flutterwave") {
        const expectedPlan = flutterwavePlanIdForCurrency(d.currency ?? "USD");
        if (d.plan?.plan_id !== expectedPlan) {
          reasons.push(`flutterwave plan_id is ${d.plan?.plan_id ?? "null"}, expected ${expectedPlan}`);
        }
      }
      return reasons;
    },
  });
  return ok({ applied, alreadyApplied: !applied });
}
