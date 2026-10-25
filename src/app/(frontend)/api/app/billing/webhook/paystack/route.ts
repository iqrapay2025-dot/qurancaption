import { ok, fail } from "@/lib/app/http";
import { extend, findUserId, getAccount, paystackSignatureOk, setBilling, claimEvent, releaseEvent } from "@/lib/app/billing";

type Ev = { event: string; data: Record<string, any> };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!paystackSignatureOk(raw, req.headers.get("x-paystack-signature"))) return fail("Invalid signature.", 401);
  let ev: Ev;
  try { ev = JSON.parse(raw); } catch { return fail("Bad payload.", 400); }
  const d = ev.data ?? {};
  const meta = typeof d.metadata === "object" && d.metadata ? d.metadata : {};
  const uid = await findUserId({ userId: meta.userId, customerRef: d.customer?.customer_code, email: d.customer?.email ?? d.email });
  if (!uid) return ok();
  try {
    switch (ev.event) {
      case "charge.success": {
        if (!d.reference) { console.warn("[billing] paystack webhook charge.success missing reference"); break; }
        const key = `paystack:charge:${d.reference}`;
        if (!(await claimEvent(key, "paystack.charge"))) break;
        try {
          const acc = await getAccount(uid);
          await setBilling(uid, { provider: "paystack", billingStatus: "active", cancelAtPeriodEnd: false, proUntil: extend(acc.billing.proUntil), ...(d.customer?.customer_code ? { customerRef: d.customer.customer_code } : {}) });
        } catch (e) {
          await releaseEvent(key);
          throw e;
        }
        break;
      }
      case "subscription.create":
        await setBilling(uid, { provider: "paystack", billingStatus: "active", subscriptionRef: d.subscription_code, cancelAtPeriodEnd: false, ...(d.next_payment_date ? { proUntil: new Date(d.next_payment_date).toISOString() } : {}) });
        break;
      case "subscription.not_renew":
        await setBilling(uid, { cancelAtPeriodEnd: true });
        break;
      case "subscription.disable":
        await setBilling(uid, { billingStatus: "canceled", cancelAtPeriodEnd: true });
        break;
      case "invoice.payment_failed":
        await setBilling(uid, { billingStatus: "past_due" });
        break;
    }
  } catch (e) {
    console.error("[billing] paystack webhook failed:", e instanceof Error ? e.message : e);
    return fail("Processing failed.", 500);
  }
  return ok();
}
