import "server-only";

import { fail, ok, rateLimited } from "@/lib/app/http";
import { rateLimit } from "@/lib/app/rate-limit";
import { safeEqual } from "@/lib/app/billing";
import { findUserId, flutterwaveVerify, flutterwaveExtractOwner, flutterwaveValidateTransaction, parseFlutterwaveTxRef, recordBillingEvent, grantProPeriod } from "@/lib/app/billing";

// One-time Pro upgrade from a Flutterwave `charge.completed` webhook.
// Verifies the signature, re-verifies the transaction, enforces ownership, and
// grants the Pro period exactly once per (provider, reference).
export async function POST(req: Request) {
  const provided = req.headers.get("verif-hash");
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!provided || !secret || !safeEqual(provided, secret)) {
    return fail("Invalid signature.", 401);
  }

  const rl = rateLimit("flutterwave:webhook", 1000, 60 * 60 * 1000);
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const raw = await req.text().catch(() => "");
  if (!raw) return fail("Bad payload.", 400);

  let event: { event?: string; data?: unknown };
  try {
    event = JSON.parse(raw) as { event?: string; data?: unknown };
  } catch {
    return fail("Bad payload.", 400);
  }

  const type = String(event.event ?? "").toLowerCase();
  const data = event.data ?? {};
  const ref = String((data as Record<string, unknown>).tx_ref ?? "");

  if (type !== "charge.completed") {
    await recordBillingEvent({
      eventId: String((data as Record<string, unknown>).id ?? "unknown:" + ref),
      type: "charge.completed",
      reference: ref,
      user: null,
      outcome: "ignored",
      reason: `unsupported event type "${type}"`,
    });
    return ok();
  }

  if (!ref) {
    await recordBillingEvent({
      eventId: "charge.completed:none",
      type: "charge.completed",
      reference: ref,
      user: null,
      outcome: "ignored",
      reason: "missing tx_ref",
    });
    return ok();
  }

  let verified: any;
  try {
    verified = await flutterwaveVerify(ref);
  } catch (e) {
    console.error("[billing] flutterwave webhook verify failed:", e instanceof Error ? e.message : e);
    return fail("Could not verify the payment.", 500);
  }

  const verifiedData = verified.data ?? {};
  const status = String(verifiedData.status ?? "");

  // Still settling: tell the caller to try again later.
  if (status === "pending") {
    return fail("Payment is still being processed. Try again later.", 409);
  }

  const metaUser =
    typeof verifiedData.meta === "object" && verifiedData.meta
      ? String((verifiedData.meta as Record<string, unknown>).userId ?? "")
      : "";
  const txRefUser = parseFlutterwaveTxRef(String(verifiedData.tx_ref ?? ""));

  // If both owner sources are present but disagree, ignore the event.
  if (metaUser && txRefUser && metaUser !== txRefUser) {
    await recordBillingEvent({
      eventId: ref,
      type: "charge.completed",
      reference: ref,
      user: null,
      outcome: "ignored",
      reason: "owner mismatch between meta.userId and tx_ref",
    });
    return ok();
  }

  const owner = flutterwaveExtractOwner(verified);

  const reasons = flutterwaveValidateTransaction(verified, ref);

  if (reasons.length > 0 || !owner.ownerId) {
    await recordBillingEvent({
      eventId: ref,
      type: "charge.completed",
      reference: ref,
      user: owner.ownerId,
      outcome: "ignored",
      reason: reasons.join("; "),
    });
    return ok();
  }

  const uid = await findUserId({ userId: owner.ownerId });
  if (!uid) {
    await recordBillingEvent({
      eventId: ref,
      type: "charge.completed",
      reference: ref,
      user: null,
      outcome: "ignored",
      reason: "no user for owner",
    });
    return ok();
  }

  const { applied } = await grantProPeriod({
    userId: uid,
    provider: "flutterwave",
    reference: ref,
    customerRef: null,
  });

  if (applied) {
    await recordBillingEvent({
      eventId: ref,
      type: "charge.completed",
      reference: ref,
      user: uid,
      outcome: "granted",
    });
    return ok({ ok: true, alreadyApplied: false });
  }

  await recordBillingEvent({
    eventId: ref,
    type: "charge.completed",
    reference: ref,
    user: uid,
    outcome: "ignored",
    reason: "already applied",
  });
  return ok({ ok: true, alreadyApplied: true });
}

