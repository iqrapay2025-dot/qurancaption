import "server-only";

import { ok, fail } from "@/lib/app/http";
import {
  grantProPeriod,
  PAYSTACK_MANUAL_KIND,
  findUserId,
  getAccount,
  paystackSignatureOk,
  setBilling,
  claimEvent,
  DAY,
  INVOICE_GRACE_DAYS,
} from "@/lib/app/billing";
import { getPayloadClient } from "@/lib/payload";
import { PRO_PRICE_NGN } from "@/lib/app/plans";

type Ev = { event: string; data: Record<string, any> };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!paystackSignatureOk(raw, req.headers.get("x-paystack-signature"))) return fail("Invalid signature.", 401);
  let ev: Ev;
  try {
    ev = JSON.parse(raw);
  } catch {
    return fail("Bad payload.", 400);
  }
  const d = ev.data ?? {};
  const meta = typeof d.metadata === "object" && d.metadata ? d.metadata : {};
  const uid = await findUserId({ userId: meta.userId, email: d.customer?.email ?? d.email });
  if (!uid) return ok();
  try {
    switch (ev.event) {
      case "charge.success": {
        if (!d.reference) {
          console.warn("[billing] paystack webhook charge.success missing reference");
          break;
        }
        const kind = typeof meta.kind === "string" ? meta.kind : null;
        await grantProPeriod({
          userId: uid,
          provider: "paystack",
          reference: d.reference,
          customerRef: kind !== PAYSTACK_MANUAL_KIND ? d.customer?.customer_code : null,
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
            return reasons;
          },
        });
        break;
      }
      case "subscription.create": {
        if (!d.subscription_code) break;
        const key = `paystack:subscription:create:${d.subscription_code}`;
        if (!(await claimEvent(key, "paystack.subscription.create"))) break;
        await setBilling(uid, {
          provider: "paystack",
          billingStatus: "active",
          subscriptionRef: d.subscription_code,
          emailToken: d.email_token ?? null,
          cancelAtPeriodEnd: false,
          ...(d.next_payment_date ? { proUntil: new Date(d.next_payment_date).toISOString() } : {}),
        });
        break;
      }
      case "subscription.not_renew": {
        const key = `paystack:subscription:not_renew:${d.subscription_code ?? d.id ?? "unknown"}`;
        if (!(await claimEvent(key, "paystack.subscription.not_renew"))) break;
        await setBilling(uid, { cancelAtPeriodEnd: true });
        break;
      }
      case "subscription.disable": {
        const key = `paystack:subscription:disable:${d.subscription_code ?? d.id ?? "unknown"}`;
        if (!(await claimEvent(key, "paystack.subscription:disable"))) break;
        await setBilling(uid, { billingStatus: "canceled", cancelAtPeriodEnd: true });
        break;
      }
      case "invoice.payment_failed": {
        const key = `paystack:invoice:payment_failed:${d.id ?? d.reference ?? "unknown"}`;
        if (!(await claimEvent(key, "paystack.invoice.payment_failed"))) break;
        const acc = await getAccount(uid);
        if (acc.plan === "pro") {
          const cap = new Date(Date.now() + INVOICE_GRACE_DAYS * DAY);
          const until = acc.billing.proUntil ? new Date(acc.billing.proUntil) : cap;
          await setBilling(uid, { billingStatus: "past_due", proUntil: new Date(Math.min(until.getTime(), cap.getTime())).toISOString() });
        } else {
          await setBilling(uid, { billingStatus: "past_due" });
        }
        break;
      }
      case "refund.processed": {
        const key = `paystack:refund:processed:${d.id ?? d.reference ?? "unknown"}`;
        if (!(await claimEvent(key, "paystack.refund.processed"))) break;
        await setBilling(uid, { billingStatus: "canceled", cancelAtPeriodEnd: true, proUntil: new Date().toISOString() });
        console.warn("[billing] paystack webhook refund.processed: Pro revoked for user", uid);
        break;
      }
    }
  } catch (e) {
    console.error("[billing] paystack webhook failed:", e instanceof Error ? e.message : e);
    return fail("Processing failed.", 500);
  }
  return ok();
}
