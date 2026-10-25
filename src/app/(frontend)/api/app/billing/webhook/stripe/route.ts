import { ok, fail } from "@/lib/app/http";
import { applyStripeSub, claimEvent, releaseEvent, revokeStripeAccess, stripeCharge, extend, findUserId, getAccount, setBilling, stripeEventOk, stripeSubscription, type StripeSub } from "@/lib/app/billing";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!stripeEventOk(raw, req.headers.get("stripe-signature"))) return fail("Invalid signature.", 401);
  let ev: { id: string; type: string; data: { object: any } };
  try { ev = JSON.parse(raw); } catch { return fail("Bad payload.", 400); }
  const o = ev.data?.object ?? {};
  if (ev.id && !(await claimEvent(ev.id, ev.type))) return ok({ ok: true, duplicate: true });
  try {
    switch (ev.type) {
      case "checkout.session.completed":
        if (o.subscription) await applyStripeSub(await stripeSubscription(o.subscription), o.client_reference_id);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applyStripeSub(o as StripeSub);
        break;
      case "invoice.payment_failed": {
        const uid = await findUserId({ customerRef: o.customer });
        if (uid) await setBilling(uid, { billingStatus: "past_due" });
        break;
      }
      case "invoice.paid": {
        const uid = await findUserId({ customerRef: o.customer });
        if (uid && o.subscription) await applyStripeSub(await stripeSubscription(o.subscription), uid);
        else if (uid) await setBilling(uid, { billingStatus: "active", proUntil: extend((await getAccount(uid)).billing.proUntil) });
        break;
      }
      case "charge.refunded":
        if (o.refunded === true) await revokeStripeAccess(o.customer, "full refund");
        break;
      case "charge.dispute.created": {
        const c = o.charge ? await stripeCharge(o.charge) : null;
        await revokeStripeAccess(c?.customer, "dispute opened");
        break;
      }
      case "radar.early_fraud_warning.created": {
        const c = o.charge ? await stripeCharge(o.charge) : null;
        console.warn(`[billing] early fraud warning for customer ${c?.customer ?? "unknown"}: review the charge in the Stripe Dashboard`);
        break;
      }
    }
  } catch (e) {
    if (ev.id) await releaseEvent(ev.id);
    console.error("[billing] stripe webhook failed:", e instanceof Error ? e.message : e);
    return fail("Processing failed.", 500);
  }
  return ok();
}
