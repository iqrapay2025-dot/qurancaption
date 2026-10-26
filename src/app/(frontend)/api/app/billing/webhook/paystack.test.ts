import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as webhook } from "./paystack/route";

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

beforeEach(() => {
  origSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "sk_test_live_1234567890abcdef";
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
    update: vi.fn(async ({ collection, id, data }: any) => {
      if (collection === "users") {
        updates.push({ id, data });
        const u = users.get(id) ?? {};
        users.set(id, { ...u, ...data });
        return { id, ...u, ...data };
      }
      return { id };
    }),
  };
});

afterEach(() => {
  process.env.PAYSTACK_SECRET_KEY = origSecret;
});

describe("paystack webhook", () => {
  it("extends Pro on charge.success and skips a duplicate charge.success", async () => {
    const data = { reference: "ref-1", metadata: { userId: "u1" }, customer: { customer_code: "cus_1", email: "alice@example.com" } };
    const a = await post("charge.success", data);
    expect(a.status).toBe(200);
    const b = await post("charge.success", data);
    expect(b.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.billingStatus).toBe("active");
    expect(new Date(updates[0].data.proUntil!).getTime()).toBeGreaterThan(Date.now());
  });

  it("does not extend again when the same reference arrives via webhook after confirm (shared claim key)", async () => {
    await post("charge.success", {
      reference: "shared-ref",
      metadata: { userId: "u1" },
      customer: { customer_code: "cus_1", email: "alice@example.com" },
    });
    const first = updates.length;
    await post("charge.success", {
      reference: "shared-ref",
      metadata: { userId: "u1" },
      customer: { customer_code: "cus_1", email: "alice@example.com" },
    });
    expect(updates).toHaveLength(first);
    expect(events.has("paystack:charge:shared-ref")).toBe(true);
  });

  it("revokes Pro on refund.processed", async () => {
    await post("charge.success", {
      reference: "ref-refund",
      metadata: { userId: "u1" },
      customer: { customer_code: "cus_1", email: "alice@example.com" },
    });
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
});
