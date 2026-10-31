import "server-only";
import crypto from "node:crypto";
import { getPayloadClient } from "@/lib/payload";
import type { Billing, Plan } from "./plans";
import { PRO_PRICE_NGN, PRO_PRICE_NGN_KOBO } from "./plans";
import { FLUTTERWAVE_PRICE_USD, FLUTTERWAVE_PRICE_GHS } from "./plans";
import { flutterwavePlan, flutterwavePlanIdForCurrency } from "./flutterwave-plan";

export const DAY = 86_400_000;
// After an invoice.payment_failed webhook, stop extending Pro and let it lapse
// after this many days unless a successful payment arrives first.
export const INVOICE_GRACE_DAYS = 7;
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`.replace(/\/$/, "") : "http://localhost:3001");

export type Account = { plan: Plan; billing: Billing; subscriptionRef: string | null; customerRef: string | null; emailToken: string | null; presets: Preset[] };
export type Preset = { id: string; name: string; style: Record<string, string | number | boolean> };

export async function getAccount(userId: string): Promise<Account> {
  const payload = await getPayloadClient();
  const u = (await payload.findByID({ collection: "users", id: userId, depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>;
  const proUntil = (u.proUntil as string | null) ?? null;
  const pro = !!proUntil && new Date(proUntil).getTime() > Date.now();
  return {
    plan: pro ? "pro" : "free",
    billing: {
      provider: (u.provider as Billing["provider"]) ?? null,
      status: (u.billingStatus as Billing["status"]) ?? "none",
      proUntil,
      cancelAtPeriodEnd: !!u.cancelAtPeriodEnd,
      subscriptionRef: (u.subscriptionRef as string) ?? null,
    },
    subscriptionRef: (u.subscriptionRef as string) ?? null,
    customerRef: (u.customerRef as string) ?? null,
    emailToken: (u.emailToken as string) ?? null,
    presets: Array.isArray(u.presets) ? (u.presets as Preset[]) : [],
  };
}

type Patch = Partial<{ provider: "paystack" | "stripe" | "flutterwave"; customerRef: string; subscriptionRef: string; emailToken: string; billingStatus: Billing["status"]; proUntil: string; cancelAtPeriodEnd: boolean; presets: Preset[] }>;

// Server-owned workflow fields: written only from verified webhooks and authenticated billing routes.
export async function setBilling(userId: string, data: Patch) {
  const payload = await getPayloadClient();
  await payload.update({ collection: "users", id: userId, data: data as never, overrideAccess: true, depth: 0 });
}

export async function findUserId(by: { userId?: string | null; customerRef?: string | null; email?: string | null }): Promise<string | null> {
  const payload = await getPayloadClient();
  if (by.userId) {
    const r = await payload.find({ collection: "users", where: { id: { equals: by.userId } }, limit: 1, depth: 0, overrideAccess: true }).catch(() => null);
    if (r?.docs[0]) return String(r.docs[0].id);
  }
  for (const where of ([by.customerRef ? { customerRef: { equals: by.customerRef } } : null, by.email ? { email: { equals: by.email.toLowerCase() } } : null] as (import("payload").Where | null)[])) {
    if (!where) continue;
    const r = await payload.find({ collection: "users", where, limit: 1, depth: 0, overrideAccess: true });
    if (r.docs[0]) return String(r.docs[0].id);
  }
  return null;
}

export const extend = (from?: string | null, days = 31) => new Date(Math.max(Date.now(), from ? new Date(from).getTime() : 0) + days * DAY).toISOString();

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* ---------- Paystack ---------- */
const PS = "https://api.paystack.co";
export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY && !!process.env.PAYSTACK_PLAN_CODE;
// Channels offered for the one-time "pay each month" option (no subscription).
export const PAYSTACK_MANUAL_CHANNELS = ["card", "bank", "bank_transfer", "ussd", "qr", "mobile_money"] as const;
export const PAYSTACK_MANUAL_KIND = "manual_monthly";
async function ps<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(PS + path, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return {}; } })() as { status?: boolean; message?: string; data?: T };
  if (!res.ok || json.status === false) throw new Error(`paystack ${res.status}: ${json.message ?? (text.replace(/\s+/g, " ").slice(0, 160) || "request failed")}`);
  return json.data as T;
}
export const paystackSignatureOk = (raw: string, sig: string | null) =>
  !!sig && !!process.env.PAYSTACK_SECRET_KEY && safeEqual(crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex"), sig);

export async function paystackCheckout(user: { id: string; email: string }) {
  const d = await ps<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: { email: user.email, plan: process.env.PAYSTACK_PLAN_CODE, callback_url: `${siteUrl()}/billing/return?provider=paystack`, metadata: { userId: user.id } },
  });
  return d.authorization_url;

}
export async function paystackCheckoutManual(user: { id: string; email: string }) {
  const d = await ps<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: user.email,
      amount: PRO_PRICE_NGN_KOBO,
      currency: "NGN",
      channels: PAYSTACK_MANUAL_CHANNELS,
      callback_url: `${siteUrl()}/billing/return?provider=paystack`,
      metadata: { userId: user.id, kind: PAYSTACK_MANUAL_KIND },
    },
  });
  return d.authorization_url;
}
export async function paystackVerify(reference: string) {
  return ps<{ status: string; reference: string; amount?: number; currency?: string; metadata?: { userId?: string; kind?: string } | string | null; plan?: { plan_code?: string } | null; customer?: { customer_code?: string; email?: string } }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}
export async function paystackDisable(code: string, token: string) {
  return ps("/subscription/disable", { method: "POST", body: { code, token } });
}

/* ---------- Flutterwave ---------- */
const FW = "https://api.flutterwave.com/v3";

async function fw<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(FW + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return {}; } })() as T & { message?: string };
  if (!res.ok) throw new Error(`flutterwave ${res.status}: ${json.message ?? (text.replace(/\s+/g, " ").slice(0, 160) || "request failed")}`);
  return json;
}

async function fwGet<T>(path: string): Promise<T> {
  const res = await fetch(FW + path, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    cache: "no-store",
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return {}; } })() as T & { message?: string };
  if (!res.ok) throw new Error(`flutterwave verify ${res.status}: ${json.message ?? (text.replace(/\s+/g, " ").slice(0, 160) || "request failed")}`);
  return json;
}

export type FlutterwaveTransaction = {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: "successful" | "pending" | "failed";
    payment_type?: string;
    meta?: Record<string, unknown> | null;
    customer?: { id: number; name?: string | null; email?: string | null };
  };
};

// Parse the user id encoded in a Flutterwave `tx_ref` of the form
// `fw_<userId>_<ms>_<hex>`. The checkout writes the logged-in user id into this
// prefix, and the verify response can also carry it under `meta.userId`.
export function parseFlutterwaveTxRef(txRef: string): string | null {
  const m = String(txRef || "").match(/^fw_([^_]+)_\d+_[A-Za-z0-9]+$/);
  return m?.[1] ?? null;
}

export async function flutterwaveCheckout(user: { id: string; email: string; name?: string | null }, country?: string | null) {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
  const plan = flutterwavePlan(country);
  const tx_ref = `fw_${String(user.id)}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const d = await fw<{ status: string; message: string; data: { link: string } }>("/payments", {
    tx_ref,
    amount: plan.amount,
    currency: plan.currency,
    payment_options: plan.payment_options,
    payment_plan: plan.plan_id,
    redirect_url: `${siteUrl()}/billing/return?provider=flutterwave`,
    customer: { email: user.email, name: user.name ?? undefined },
    meta: { userId: user.id, currency: plan.currency, amount: plan.amount, plan: plan.plan_id },
  });
  return d.data.link;
}

export async function flutterwaveVerify(transactionId: string | number): Promise<FlutterwaveTransaction> {
  return fwGet<FlutterwaveTransaction>(`/transactions/${encodeURIComponent(String(transactionId))}/verify`);
}

// Verify a transaction by its merchant reference (tx_ref) instead of its numeric ID.
// Flutterwave v3: GET /transactions/verify_by_reference?tx_ref=xxx
export async function flutterwaveVerifyByReference(txRef: string): Promise<FlutterwaveTransaction> {
  return fwGet<FlutterwaveTransaction>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
}

export async function paystackCancel(acc: Account) {
  let code = acc.subscriptionRef;
  if (!code && acc.customerRef) {
    const list = await ps<{ subscription_code: string; status: string }[]>(`/subscription?customer=${encodeURIComponent(acc.customerRef)}`);
    code = list.find((s) => s.status === "active")?.subscription_code ?? null;
  }
  if (!code) throw new Error("no subscription found yet");
  const sub = await ps<{ email_token: string }>(`/subscription/${encodeURIComponent(code)}`);
  await ps("/subscription/disable", { method: "POST", body: { code, token: sub.email_token } });
  return code;
}

/* ---------- Stripe ---------- */
const ST = "https://api.stripe.com/v1";
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;
const ST_VERSION = "2026-09-30.endive";
async function st<T>(path: string, form?: Record<string, string>, method?: "DELETE"): Promise<T> {
  const res = await fetch(ST + path, {
    method: method ?? (form ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Stripe-Version": ST_VERSION, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return {}; } })() as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`stripe ${res.status}: ${json.error?.message ?? (text.replace(/\s+/g, " ").slice(0, 160) || "request failed")}`);
  return json;
}
export function stripeEventOk(raw: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  return safeEqual(crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex"), parts.v1 ?? "");
}
export async function stripeCheckout(user: { id: string; email: string }) {
  const s = await st<{ url: string }>("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": process.env.STRIPE_PRICE_ID!,
    "line_items[0][quantity]": "1",
    customer_email: user.email,
    client_reference_id: user.id,
    integration_identifier: `qcs_${Array.from(crypto.randomBytes(8), (b) => String.fromCharCode(97 + (b % 26))).join("")}`,
    "subscription_data[metadata][userId]": user.id,
    success_url: `${siteUrl()}/billing/return?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/billing/return?provider=stripe&canceled=1`,
  });
  return s.url;
}
export type StripeSub = { id: string; customer: string; status: string; cancel_at_period_end: boolean; current_period_end?: number; items?: { data: { current_period_end?: number }[] }; metadata?: { userId?: string } };
export const stripeSession = (id: string) => st<{ client_reference_id: string | null; status: string; customer: string | null; subscription: string | null }>(`/checkout/sessions/${encodeURIComponent(id)}`);
export const stripeSubscription = (id: string) => st<StripeSub>(`/subscriptions/${encodeURIComponent(id)}`);
export const stripePortal = (customer: string) => st<{ url: string }>("/billing_portal/sessions", { customer, return_url: `${siteUrl()}/#/settings` });
export const stripeCharge = (id: string) => st<{ customer: string | null; refunded?: boolean }>(`/charges/${encodeURIComponent(id)}`);
export const stripeEndNow = (id: string) => st<StripeSub>(`/subscriptions/${encodeURIComponent(id)}`, {}, "DELETE");

// Revokes Pro and stops further charges after a dispute or full refund.
export async function revokeStripeAccess(customer: string | null | undefined, reason: string) {
  const uid = await findUserId({ customerRef: customer });
  if (!uid) { console.warn(`[billing] ${reason}: no user for customer`); return; }
  const acc = await getAccount(uid);
  if (acc.subscriptionRef && acc.billing.provider === "stripe") await stripeEndNow(acc.subscriptionRef).catch((e) => console.error("[billing] end subscription failed:", e instanceof Error ? e.message : e));
  await setBilling(uid, { billingStatus: "canceled", cancelAtPeriodEnd: true, proUntil: new Date().toISOString() });
  console.warn(`[billing] ${reason}: Pro revoked for user ${uid}`);
}

// Returns false when this event was already processed.
export async function claimEvent(eventId: string, type: string) {
  const payload = await getPayloadClient();
  try { await payload.create({ collection: "billing-events", data: { eventId, type }, overrideAccess: true, depth: 0 }); return true; }
  catch { return !(await payload.find({ collection: "billing-events", where: { eventId: { equals: eventId } }, limit: 1, depth: 0, overrideAccess: true }).then((r) => r.docs.length > 0).catch(() => false)); }
}
export async function releaseEvent(eventId: string) {
  const payload = await getPayloadClient();
  await payload.delete({ collection: "billing-events", where: { eventId: { equals: eventId } }, overrideAccess: true }).catch(() => null);
}
// Provider-agnostic: extends proUntil by one period, once per (provider, reference).
// Claim key is prefixed per provider, e.g. "paystack:charge:<ref>".
// `validate` runs after the claim; returning reasons records the event as ignored and grants nothing.
export async function grantProPeriod(opts: {
  userId: string;
  provider: "paystack" | "stripe" | "flutterwave";
  reference: string;
  customerRef?: string | null;
  validate?: () => string[];
}): Promise<{ applied: boolean }> {
  const { userId, provider, reference, customerRef, validate } = opts;
  const key = `${provider}:charge:${reference}`;
  if (!(await claimEvent(key, `${provider}.charge`))) return { applied: false };
  try {
    const reasons = validate?.() ?? [];
    if (reasons.length > 0) {
      const payload = await getPayloadClient();
      await payload.update({
        collection: "billing-events",
        where: { eventId: { equals: key } },
        data: { type: `${provider}:charge:ignored`, reason: reasons.join("; ") },
        overrideAccess: true,
        depth: 0,
      });
      return { applied: false };
    }
    const acc = await getAccount(userId);
    const patch: Patch = {
      provider,
      billingStatus: "active",
      cancelAtPeriodEnd: false,
      proUntil: extend(acc.billing.proUntil),
    };
    if (customerRef) patch.customerRef = customerRef;
    await setBilling(userId, patch);
    return { applied: true };
  } catch (e) {
    await releaseEvent(key);
    throw e;
  }
}
// Provider-agnostic: extends proUntil by one period, once per (provider, reference).

// Flutterwave helpers shared by the confirm route and the webhook route.

export interface FlutterwaveOwner {
  ownerId: string | null;
  ownerSource: "meta" | "tx_ref" | null;
}

// Extracts the owner id from the verified transaction's meta.userId or the tx_ref
// prefix, and where it came from. Returns null owner when neither yields one.
export function flutterwaveExtractOwner(tx: FlutterwaveTransaction): FlutterwaveOwner {
  const metaUser = typeof tx.data.meta === "object" && tx.data.meta ? String((tx.data.meta as Record<string, unknown>).userId ?? "") : "";
  const txRefUser = parseFlutterwaveTxRef(String(tx.data.tx_ref ?? ""));
  const ownerId = metaUser || txRefUser;
  const source: "meta" | "tx_ref" | null = metaUser ? "meta" : (txRefUser ? "tx_ref" : null);
  return { ownerId: ownerId || null, ownerSource: source };
}

// Returns the reasons the verified transaction is not a valid Pro payment
// (empty array => all checks pass). Mirrors the confirm route checks.
export function flutterwaveValidateTransaction(tx: FlutterwaveTransaction, expectedRef: string): string[] {
  const reasons: string[] = [];
  const amount = Number(tx.data.amount ?? 0);
  const currency = String(tx.data.currency ?? "").toUpperCase();
  const status = tx.data.status ?? "";
  const meta = (typeof tx.data.meta === "object" && tx.data.meta) ? (tx.data.meta as Record<string, unknown>) : {};
  const expectedCurrency = String(meta.currency ?? "").toUpperCase();
  const serverPrice = currency === "NGN" ? PRO_PRICE_NGN : currency === "GHS" ? FLUTTERWAVE_PRICE_GHS : FLUTTERWAVE_PRICE_USD;
  if (status !== "successful") reasons.push(`status is ${status ?? "(none)"}, expected successful`);
  if (expectedCurrency && currency !== expectedCurrency) reasons.push(`currency is ${currency}, expected ${expectedCurrency}`);
  if (Math.round(amount * 100) !== Math.round(serverPrice * 100)) reasons.push(`amount is ${amount}, expected ${serverPrice}`);
  const metaAmount = Number(meta.amount ?? 0);
  if (metaAmount && Math.round(amount * 100) !== Math.round(metaAmount * 100)) reasons.push(`amount is ${amount}, expected ${metaAmount}`);
  if (String(tx.data.tx_ref ?? "") !== expectedRef) reasons.push(`tx_ref is ${String(tx.data.tx_ref ?? "(none)")}, expected ${expectedRef}`);
  const metaPlan = String(meta.plan ?? "");
  if (metaPlan && metaPlan !== flutterwavePlanIdForCurrency(currency)) reasons.push(`plan mismatch`);
  return reasons;
}

export interface RecordBillingEventInput {
  eventId: string;
  type: string;
  reference: string;
  user: string | null;
  outcome: "granted" | "ignored";
  reason?: string;
}

// Records a processed billing event idempotently. Duplicate deliveries are safe:
// the unique eventId prevents duplicate documents, and the error is swallowed.
export async function recordBillingEvent(input: RecordBillingEventInput): Promise<void> {
  const payload = await getPayloadClient();
  try {
    await payload.create({
      collection: "billing-events",
      data: {
        eventId: input.eventId,
        type: input.type,
        reference: input.reference,
        user: input.user,
        outcome: input.outcome,
        reason: input.reason,
      },
      overrideAccess: true,
      depth: 0,
    });
  } catch {
    // Already recorded (idempotent duplicate).
  }
}

export const stripeCancel = (id: string) => st<StripeSub>(`/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: "true" });

export async function applyStripeSub(sub: StripeSub, userIdHint?: string | null) {
  const id = await findUserId({ userId: sub.metadata?.userId ?? userIdHint, customerRef: sub.customer });
  if (!id) return;
  const end = sub.current_period_end ?? sub.items?.data[0]?.current_period_end;
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "canceled" ? "canceled" : "past_due";
  await setBilling(id, {
    provider: "stripe", customerRef: sub.customer, subscriptionRef: sub.id, billingStatus: status,
    cancelAtPeriodEnd: sub.cancel_at_period_end || status === "canceled",
    ...(end ? { proUntil: new Date(end * 1000).toISOString() } : {}),
  });
}
