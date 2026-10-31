import "server-only";

import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { PRO_PRICE_NGN, FLUTTERWAVE_PRICE_USD, FLUTTERWAVE_PRICE_GHS } from "@/lib/app/plans";
import { flutterwavePlanIdForCurrency } from "@/lib/app/flutterwave-plan";
import {
  flutterwaveVerify,
  flutterwaveVerifyByReference,
  grantProPeriod,
  parseFlutterwaveTxRef,
} from "@/lib/app/billing";

const REF_RE = /^[A-Za-z0-9_\-.]{1,120}$/;

export async function POST(req: Request) {
  const bad = csrf(req);
  if (bad) return bad;
  const user = await currentUser().catch(() => null);
  if (!user) return fail("Log in to confirm your payment.", 401);

  const payload = (await readJson(req)) as {
    provider?: string;
    ref?: string;
    transaction_id?: string | number;
  } | null;

  if (!payload?.provider) {
    console.error("[billing] flutterwave: missing provider in body", JSON.stringify(payload));
    return fail("Invalid payment reference.", 400);
  }
  if (payload.provider !== "flutterwave") {
    console.error(`[billing] flutterwave: unexpected provider: "${payload.provider}"`);
    return fail("Invalid payment reference.", 400);
  }
  if (!payload.ref) {
    console.error("[billing] flutterwave: missing ref in body", JSON.stringify(payload));
    return fail("Invalid payment reference.", 400);
  }
  if (!REF_RE.test(payload.ref)) {
    console.error(`[billing] flutterwave: invalid reference format: "${payload.ref}"`);
    return fail("Invalid payment reference.", 400);
  }

  const uid = String(user.id);
  const rl = rateLimit(`app:flw-confirm:${uid}`, 100, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  try {
    const idStr = String(payload.transaction_id ?? "");
    let tx;
    if (/^\d+$/.test(idStr)) {
      tx = await flutterwaveVerify(idStr);
    } else {
      tx = await flutterwaveVerifyByReference(payload.ref);
    }
    const data = tx.data ?? {};

    const status = data.status ?? "";

    // Still settling: tell the caller to keep polling.
    if (status === "pending") {
      return fail("Payment is still being processed. Try again later.", 409);
    }
    if (status === "failed") {
      return fail("The payment failed.", 400);
    }

    const amount = Number(data.amount ?? 0);
    const currency = String(data.currency ?? "").toUpperCase();
    const meta = (typeof data.meta === "object" && data.meta) ? (data.meta as Record<string, unknown>) : {};
    const expectedCurrency = String(meta.currency ?? "").toUpperCase();
    const expectedAmount = Number(meta.amount ?? 0);
    const expectedPlan = String(meta.plan ?? "");
    const serverPrice = currency === "NGN" ? PRO_PRICE_NGN : currency === "GHS" ? FLUTTERWAVE_PRICE_GHS : FLUTTERWAVE_PRICE_USD;

    if (status !== "successful") return fail("We couldn't confirm this payment.", 400);
    if (!expectedCurrency || currency !== expectedCurrency) return fail("We couldn't confirm this payment.", 400);
    if (Math.round(amount * 100) !== Math.round(serverPrice * 100)) return fail("We couldn't confirm this payment.", 400);
    if (expectedAmount && Math.round(amount * 100) !== Math.round(expectedAmount * 100)) return fail("We couldn't confirm this payment.", 400);
    if (expectedPlan && expectedPlan !== flutterwavePlanIdForCurrency(currency)) return fail("We couldn't confirm this payment.", 400);
    if (String(data.tx_ref ?? "") !== String(payload.ref)) return fail("We couldn't confirm this payment.", 400);

    const metaUser = typeof data.meta === "object" && data.meta ? String((data.meta as Record<string, unknown>).userId ?? "") : "";
    const txRefUser = parseFlutterwaveTxRef(String(data.tx_ref ?? ""));
    // If both owner sources are present but disagree, reject.
    if (metaUser && txRefUser && metaUser !== txRefUser) {
      return fail("We couldn't confirm this payment.", 400);
    }
    const owner = metaUser || txRefUser;
    if (owner !== uid) {
      return fail("This payment does not belong to your account.", 403);
    }

    const { applied } = await grantProPeriod({
      userId: uid,
      provider: "flutterwave",
      reference: String(data.tx_ref ?? payload.ref),
    });
    return ok({ ok: true, alreadyApplied: !applied });
  } catch (e) {
    // Flutterwave may return 404 when the transaction isn't recorded yet right after payment.
    const msg = e instanceof Error ? e.message : String(e);
    if (/404|not found/i.test(msg)) {
      return fail("The payment has not been recorded yet. Try again later.", 409);
    }
    console.error("[billing] flutterwave confirm failed:", msg);
    return fail("We couldn't confirm the payment yet. It may take a minute to appear.", 502);
  }
}
