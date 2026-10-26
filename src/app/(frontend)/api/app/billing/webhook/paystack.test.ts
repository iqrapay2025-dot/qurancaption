import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as webhook } from "./paystack/route";
import { POST as confirm } from "../confirm/route";
import { extend, DAY, PAYSTACK_MANUAL_KIND } from "@/lib/app/billing";

let events = new Map<string, any>();
let users = new Map<string, any>();
let updates: Array<{ id: string; data: any }> = [];
let client: any;

function match(doc: any, where: any): boolean {
  for (const [field, op] of Object.entries(where)) {
    const val = op && typeof op === "object" && "equals" in op ? (op as any).equals : undefined;
    if (doc[field] !== val) return false;
  }
  return true;
}

vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(() => client),
}));

let origSecret: string | undefined;
let origPlan: string | undefined;

function sign(raw: string) {
  return crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
}

function post(event: string, data: Record<string, any>) {
  const raw = JSON.stringify({ event, data });
  return webhook(new Request("http://x/api/app/billing/webhook/paystack", {
    method: "POST",
    body: raw,
    headers: { "content-type": "application/json", "x-paystack-signature": sign(raw) },
  }));
}

function chargeRef(reference: string, planCode = "premium"): Record<string, any> {
  return {
    amount: 837000,
    currency: "NGN",
    status: "success",
    reference,
    plan: { plan_code: planCode },
    metadata: { userId: "u1" },
    customer: { customer_code: "cus_1", email: "alice@example.com" },
  };
}

beforeEach(() => {
  origSecret = process.env.PAYSTACK_SECRET_KEY;
  origPlan = process.env.PAYSTACK_PLAN_CODE;
  process.env.PAYSTACK_SECRET_KEY = "sk_test_live_1234567890abcdef";
  process.env.PAYSTACK_PLAN_CODE = "premium";
  events = new Map();
  users = new Map();
  updates = [];
  users.set("u1", { id: "u1", email: "alice@example.com", proUntil: "2030-01-01T00:00:00.000Z", billingStatus: "none", provider: null, customerRef: null, subscriptionRef: null, emailToken: null, cancelAtPeriodEnd: false, presets: [] });
  client = {
    create: vi.fn(async ({ collection, data }: any) => {
      if (collection === "billing-events") {
        if (events.has(data.eventId)) throw new Error("duplicate eventId");
        events.set(data.eventId, data);
        return { id: "evt-1", ...data };
      }
      return { id: "new", ...data };
    }),
    find: vi.fn(async ({ collection, where }: any) => {
      if (collection === "billing-events") {
        return { docs: [...events.values()].filter((e: any) => match(e, where)) };
      }
      if (collection === "users") {
        return { docs: [...users.values()].filter((u: any) => match(u, where)) };
      }
      return { docs: [] };
    }),
    findByID: vi.fn(async ({ collection, id }: any) => {
      if (collection === "users") return users.get(id) ?? null;
      return null;
    }),
    update: vi.fn(async ({ collection, where, data, id }: any) => {
      if (collection === "users") {
      const uid = id ?? where?.eventId ?? where?.id;
      updates.push({ id: uid, data });
      const u = users.get(uid) ?? {};
      users.set(uid, { ...u, ...data });
      }
      if (collection === "billing-events" && where?.eventId?.equals) {
        const ev = events.get(where.eventId.equals);
        if (ev) events.set(where.eventId.equals, { ...ev, ...data });
        return { id: where.eventId.equals };
      }
      return { id: String(Date.now()) };
    }),
  };
});

afterEach(() => {
  process.env.PAYSTACK_SECRET_KEY = origSecret;
  process.env.PAYSTACK_PLAN_CODE = origPlan;
});

describe("paystack webhook", () => {
  it("extends Pro on charge.success and skips a duplicate charge.success", async () => {
    const data = chargeRef("ref-1");
    const a = await post("charge.success", data);
    expect(a.status).toBe(200);
    const b = await post("charge.success", data);
    expect(b.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.billingStatus).toBe("active");
    expect(new Date(updates[0].data.proUntil!).getTime()).toBeGreaterThan(Date.now());
  });

  it("does not extend again when the same reference arrives via webhook after confirm (shared claim key)", async () => {
    await post("charge.success", chargeRef("shared-ref"));
    const first = updates.length;
    await post("charge.success", chargeRef("shared-ref"));
    expect(updates).toHaveLength(first);
    expect(events.has("paystack:charge:shared-ref")).toBe(true);
  });

  it("revokes Pro on refund.processed", async () => {
    await post("charge.success", chargeRef("ref-refund"));
    const res = await post("refund.processed", { id: "rf-1", customer: { customer_code: "cus_1", email: "alice@example.com" } });
    expect(res.status).toBe(200);
    const last = updates[updates.length - 1];
    expect(last.data.billingStatus).toBe("canceled");
    expect(new Date(last.data.proUntil!).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(last.data.cancelAtPeriodEnd).toBe(true);
    expect(events.has("paystack:refund:processed:rf-1")).toBe(true);
  });

  it("caps proUntil at the grace period on invoice.payment_failed instead of extending", async () => {
    const res = await post("invoice.payment_failed", { id: "inv-1", customer: { email: "alice@example.com" } });
    expect(res.status).toBe(200);
    const last = updates[updates.length - 1];
    expect(last.data.billingStatus).toBe("past_due");
    const until = new Date(last.data.proUntil!).getTime();
    expect(until).toBeGreaterThan(Date.now());
    expect(until).toBeLessThan(Date.now() + 8 * 86_400_000);
    expect(until).toBeLessThan(new Date("2030-01-01").getTime());
  });

  it("stores subscription_code and email_token on subscription.create", async () => {
    const res = await post("subscription.create", {
      subscription_code: "sub_123",
      email_token: "tok_xyz",
      next_payment_date: "2030-02-01T00:00:00.000Z",
      metadata: { userId: "u1" },
    });
    expect(res.status).toBe(200);
    const last = updates[updates.length - 1];
    expect(last.data.subscriptionRef).toBe("sub_123");
    expect(last.data.emailToken).toBe("tok_xyz");
    expect(last.data.billingStatus).toBe("active");
  });

  it("rejects an invalid signature", async () => {
    const res = await webhook(new Request("http://x/api/app/billing/webhook/paystack", {
      method: "POST",
      body: JSON.stringify({ event: "charge.success", data: {} }),
      headers: { "content-type": "application/json", "x-paystack-signature": "bad" },
    }));
    expect(res.status).toBe(401);
  });

  it("does not grant Pro on charge.success with a wrong amount", async () => {
    const data = chargeRef("wrong-amount");
    data.amount = 100;
    await post("charge.success", data);
    expect(updates).toHaveLength(0);
    const ev = events.get("paystack:charge:wrong-amount");
    expect(ev).toMatchObject({ type: "paystack:charge:ignored" });
    expect(ev.reason).toContain("837000");
  });

  it("does not grant Pro on charge.success with a wrong currency", async () => {
    const data = chargeRef("wrong-currency");
    data.currency = "usd";
    data.amount = 837000;
    await post("charge.success", data);
    expect(updates).toHaveLength(0);
    const ev = events.get("paystack:charge:wrong-currency");
    expect(ev).toMatchObject({ type: "paystack:charge:ignored" });
    expect(ev.reason).toContain("NGN");
  });

  it("does not grant Pro on charge.success with a wrong plan", async () => {
    const data = chargeRef("wrong-plan", "pro");
    data.currency = "NGN";
    data.amount = 837000;
    await post("charge.success", data);
    expect(updates).toHaveLength(0);
    const ev = events.get("paystack:charge:wrong-plan");
    expect(ev).toMatchObject({ type: "paystack:charge:ignored" });
    expect(ev.reason).toContain("plan");
  });

  it("grants Pro on a correct charge.success with exactly one period", async () => {
    const res = await post("charge.success", chargeRef("ok-ref"));
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.billingStatus).toBe("active");
    expect(updates[0].data.cancelAtPeriodEnd).toBe(false);
    expect(updates[0].data.proUntil).toBe(extend("2030-01-01T00:00:00.000Z"));
  });
it("stores manual payment event on charge.success for manual kind", async () => {
    const res = await post("charge.success", { ...chargeRef("ok-ref-manual"), kind: PAYSTACK_MANUAL_KIND });
    expect(res.status).toBe(200);
    expect(events.has("paystack:charge:ok-ref-manual")).toBe(true);
    const evt = events.get("paystack:charge:ok-ref-manual");
    expect(evt).toMatchObject({ kind: PAYSTACK_MANUAL_KIND, status: "success" });
    expect(evt.data.metadata?.userId).toBe("u1");
  });

  it("does not grant Pro on charge.success when kind=manual", async () => {
    const res = await post("charge.success", { ...chargeRef("ok-ref-manual"), kind: PAYSTACK_MANUAL_KIND });
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
    const ev = events.get("paystack:charge:ok-ref-manual");
    expect(ev).toMatchObject({ type: "paystack:charge:ignored" });
    expect(ev.reason).toContain("manual");
  });

  it("can confirm a manual payment and grant Pro with correct reference", async () => {
    await post("charge.success", { ...chargeRef("ok-ref-manual"), kind: PAYSTACK_MANUAL_KIND });
    const res = await confirm(new Request("http://x/api/app/billing/webhook/paystack/manual/ok-ref", {
      method: "POST",
      body: JSON.stringify({ reference: "ok-ref" }),
      headers: { "content-type": "application/json" }
    }));
    expect(res.status).toBe(200);
    const last = updates[updates.length - 1];
    expect(last?.data?.billingStatus).toBe("active");
    expect(last?.data?.proUntil).toBeGreaterThan(Date.now());
    expect(last?.data?.cancelAtPeriodEnd).toBe(false);
  });

  it("rejects manual payment with wrong reference", async () => {
    await post("charge.success", { ...chargeRef("ok-ref-manual"), kind: PAYSTACK_MANUAL_KIND });
    const res = await confirm(new Request("http://x/api/app/billing/webhook/paystack/manual/bad-ref", {
      method: "POST",
      body: JSON.stringify({ reference: "wrong-ref" }),
      headers: { "content-type": "application/json" }
    }));
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});
