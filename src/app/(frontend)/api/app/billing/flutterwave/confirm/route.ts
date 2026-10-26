import "server-only";

import { csrf, fail, ok, readJson, rateLimited } from "@/lib/app/http";
import { currentUser } from "@/lib/app/session";
import { rateLimit } from "@/lib/app/rate-limit";
import { FLUTTERWAVE_CURRENCY, FLUTTERWAVE_PRICE_USD } from "@/lib/app/plans";
import { flutterwaveVerify, grantProPeriod, parseFlutterwaveTxRef } from "@/lib/app/billing";

const REF_RE = /^[A-Za-z0-9_\-.]{6,120}$/;

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
  if (!payload?.provider || payload.provider !== "flutterwave" || !payload.ref || !REF_RE.test(payload.ref)) {
    return fail("Invalid payment reference.", 400);
  }

  const uid = String(user.id);
  const rl = rateLimit(`app:confirm:${uid}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  try {
    const tx = await flutterwaveVerify(payload.transaction_id ?? payload.ref);
    const data = tx.data ?? {};

    const amount = Number(data.amount ?? 0);
    const currency = String(data.currency ?? "").toUpperCase();
    const status = data.status ?? "";

    if (status !== "successful" || currency !== FLUTTERWAVE_CURRENCY || amount < FLUTTERWAVE_PRICE_USD) {
      return fail("We couldn't confirm this payment.", 400);
    }
    if (String(data.tx_ref ?? "") !== String(payload.ref)) {
      return fail("We couldn't confirm this payment.", 400);
    }

    const metaUser = typeof data.meta === "object" && data.meta ? String((data.meta as Record<string, unknown>).userId ?? "") : "";
    const txRefUser = parseFlutterwaveTxRef(String(data.tx_ref ?? ""));
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
    console.error("[billing] flutterwave confirm failed:", e instanceof Error ? e.message : e);
    return fail("We couldn't confirm the payment yet. It may take a minute to appear.", 502);
  }
}
