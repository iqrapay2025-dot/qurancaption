import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DAY } from "@/lib/app/billing";
import { MONTHLY_PERIOD_DAYS, PRO_PRICE_NGN_KOBO } from "@/lib/app/plans";
import { POST as confirm } from "./confirm/route";
import { POST as webhook } from "./webhook/paystack/route";

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
vi.mock("@/lib/app/session", () => ({
  currentUser: vi.fn(async () => ({ id: "u1", email: "alice@example.com", name: "Alice" } as any)),
}));

const tx = {
  status: "success",
  reference: "ref-01",
  amount: PRO_PRICE_NGN_KOBO,
  currency: "NGN",
  metadata: { userId: "u1" },
  customer: { customer_code: "cus_1", email: "alice@example.com" },
};

let fetchMock: ReturnType<typeof vi.spyOn>;
let origSecret: string | undefined;
let origPlan: string | undefined;

beforeEach(() => {
  origSecret = process.env.PAYSTACK_SECRET_KEY;
  origPlan = process.env.PAYSTACK_PLAN_CODE;
  process.env.PAYSTACK_SECRET_KEY = "sk_test_live_1234567890abcdef";
  process.env.PAYSTACK_PLAN_CODE = "premium";
  events = new Map();
  users = new Map();
  updates = [];
  users.set("u1", { id: "u1", email: "alice@example.com", proUntil: null, billingStatus: "none", provider: null, customerRef: null, subscriptionRef: null, cancelAtPeriodEnd: false, presets: [] });
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
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ status: true, data: tx }))));
});

afterEach(() => {
  fetchMock.mockRestore();
  process.env.PAYSTACK_SECRET_KEY = origSecret;
  process.env.PAYSTACK_PLAN_CODE = origPlan;
});

function post(ref: string) {
  return confirm(new Request("http://localhost/api/app/billing/confirm", {
    method: "POST",
    body: JSON.stringify({ provider: "paystack", ref }),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  }));
}

function postWebhook(event: string, data: Record<string, any>) {
  const raw = JSON.stringify({ event, data });
  const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
  return webhook(new Request("http://x/api/app/billing/webhook/paystack", {
    method: "POST",
    body: raw,
    headers: { "content-type": "application/json", "x-paystack-signature": sig },
  }));
}

// build a fresh Response per call so the body is never exhausted between requests
function jsonResp(data: any) {
  return new Response(JSON.stringify({ status: true, data }));
}

describe("paystack confirm idempotency", () => {
  it("applies a successful verified payment once", async () => {
    const res = await post("ref-01");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.alreadyApplied).toBe(false);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.billingStatus).toBe("active");
    expect(new Date(updates[0].data.proUntil!).getTime()).toBeGreaterThan(Date.now());
    expect(updates[0].data.customerRef).toBe("cus_1");
  });

  it("returns alreadyApplied and does not extend proUntil when the same reference is confirmed twice", async () => {
    await post("ref-01");
    const first = updates.length;
    await post("ref-01");
    const res = await post("ref-01");
    const json = await res.json();
    expect(json.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(first);
    expect(events.size).toBeGreaterThanOrEqual(1);
  });

  it("the same reference applied via confirm then webhook extends pro only once", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp({ ...tx, reference: "shared-ref" })));
    await post("shared-ref");
    const first = updates.length;
    const res = await postWebhook("charge.success", {
      reference: "shared-ref",
      metadata: { userId: "u1" },
      customer: { customer_code: "cus_1", email: "alice@example.com" },
    });
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(first);
  });

  it("rejects a payment that does not belong to the logged-in user", async () => {
    const wrong = { ...tx, metadata: { userId: "u2" }, customer: { email: "bob@example.com" }, reference: "ref-02" };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(wrong)));
    const res = await post("ref-02");
    expect(res.status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("rejects a payment that is not successful", async () => {
    const failed = { ...tx, status: "failed", reference: "ref-03" };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(failed)));
    const res = await post("ref-03");
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects a payment with wrong amount or currency", async () => {
    const wrong = { ...tx, amount: 100, currency: "USD", reference: "ref-04" };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(wrong)));
    const res = await post("ref-04");
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

describe("paystack manual monthly confirm", () => {
  const manualTx = {
    status: "success",
    reference: "manual-ref-01",
    amount: PRO_PRICE_NGN_KOBO,
    currency: "NGN",
    plan: null,
    metadata: { userId: "u1", kind: "manual_monthly" },
    customer: { customer_code: "cus_1", email: "alice@example.com" },
  };

  it("manual confirm grants one period and does not set subscriptionRef", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(manualTx)));
    const res = await post("manual-ref-01");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.alreadyApplied).toBe(false);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.billingStatus).toBe("active");
    expect(updates[0].data.subscriptionRef).toBeUndefined();
    expect(new Date(updates[0].data.proUntil!).getTime()).toBeGreaterThan(Date.now());
  });

  it("manual confirm twice extends proUntil only once", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(manualTx)));
    await post("manual-ref-01");
    const first = updates.length;
    const res = await post("manual-ref-01");
    const json = await res.json();
    expect(json.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(first);
  });

  it("paying early adds the period to the existing proUntil", async () => {
    const future = new Date(Date.now() + 20 * DAY).toISOString();
    users.set("u1", { ...users.get("u1"), proUntil: future });
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(manualTx)));
    await post("manual-ref-01");
    const last = updates[updates.length - 1];
    const expected = new Date(new Date(future).getTime() + MONTHLY_PERIOD_DAYS * DAY).toISOString();
    expect(last.data.proUntil).toBe(expected);
  });

  it("manual charge with a plan attached is rejected", async () => {
    const withPlan = { ...manualTx, reference: "manual-with-plan", plan: { plan_code: "premium" } };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(withPlan)));
    const res = await post("manual-with-plan");
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("wrong amount is rejected for manual charge", async () => {
    const wrong = { ...manualTx, reference: "manual-wrong-amount", amount: 100 };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(wrong)));
    const res = await post("manual-wrong-amount");
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});

describe("paystack subscription plan check", () => {
  const subTx = {
    status: "success",
    reference: "sub-ref-01",
    amount: PRO_PRICE_NGN_KOBO,
    currency: "NGN",
    plan: { plan_code: "premium" },
    metadata: { userId: "u1" },
    customer: { customer_code: "cus_1", email: "alice@example.com" },
  };

  it("subscription charge with correct plan code is accepted", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(subTx)));
    const res = await post("sub-ref-01");
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.customerRef).toBe("cus_1");
  });

  it("subscription charge with wrong plan code is rejected", async () => {
    const wrong = { ...subTx, reference: "sub-wrong-plan", plan: { plan_code: "other-plan" } };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResp(wrong)));
    const res = await post("sub-wrong-plan");
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});


});
