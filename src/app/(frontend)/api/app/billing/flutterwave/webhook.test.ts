import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as flutterwaveWebhook } from "./webhook/route";
import { POST as confirm } from "./confirm/route";

let fetchMock: ReturnType<typeof vi.spyOn>;
let origWebhookHash: string | undefined;
let origSecretKey: string | undefined;

const baseData = {
  id: 999,
  tx_ref: "fw_u1_1700000000_abc123",
  flw_ref: "flw_987",
  amount: 6,
  currency: "USD",
  status: "successful",
  payment_type: "card",
  meta: { userId: "u1" },
  customer: { id: 1, name: "Alice", email: "alice@example.com" },
};

const referralRef = "fw_u1_1700000000_abc123";

function verify(payload: Record<string, any> = {}): Response {
  return new Response(JSON.stringify({ status: "success", message: "Transaction fetched successfully", data: { ...baseData, ...payload } }));
}

async function postWebhook(overrides: Record<string, any> = {}): Promise<Response> {
  const headers = new Headers({ origin: "http://localhost", "verif-hash": process.env.FLUTTERWAVE_WEBHOOK_HASH ?? "" });
  if (overrides.headers) for (const [k, v] of Object.entries(overrides.headers) as [string, string][]) headers.set(k, v);
  return flutterwaveWebhook(new Request("http://localhost/api/app/billing/flutterwave/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify({ event: "charge.completed", data: { tx_ref: overrides.ref ?? referralRef } }),
  }));
}

async function postConfirm(ref: string, transactionId: string | number): Promise<Response> {
  return await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ provider: "flutterwave", ref, transaction_id: transactionId }),
  }));
}

let events = new Map<string, any>();
let users = new Map<string, any>();
let updates: Array<{ id: string; data: any }> = [];
let client: any;

vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(() => client),
}));

vi.mock("@/lib/app/session", () => ({
  currentUser: vi.fn(async () => ({ id: "u1", email: "alice@example.com", name: "Alice" } as any)),
}));

function match(doc: any, where: any): boolean {
  for (const [field, op] of Object.entries(where)) {
    const val = op && typeof op === "object" && "equals" in op ? (op as any).equals : undefined;
    if (doc[field] !== val) return false;
  }
  return true;
}

function createPayloadClient() {
  return {
    create: vi.fn(async ({ collection, data }: any) => {
      if (collection === "billing-events") {
        if (events.has(data.eventId)) throw new Error("duplicate eventId");
        events.set(data.eventId, data);
        return { id: "evt-1", ...data };
      }
      return { id: "new", ...data };
    }),
    find: vi.fn(async ({ collection, where }: any) => {
      if (collection === "billing-events") return { docs: [...events.values()].filter((e: any) => match(e, where)) };
      if (collection === "users") return { docs: [...users.values()].filter((u: any) => match(u, where)) };
      return { docs: [] };
    }),
    findByID: vi.fn(async ({ collection, id }: any) => users.get(id) ?? null),
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
}

beforeEach(() => {
  origWebhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  origSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  process.env.FLUTTERWAVE_WEBHOOK_HASH = "webhook-hash-secret";
  process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-sandbox_xyz";
  events = new Map();
  users = new Map();
  updates = [];
  users.set("u1", { id: "u1", email: "alice@example.com", proUntil: null, billingStatus: "none", provider: null, customerRef: null, subscriptionRef: null, cancelAtPeriodEnd: false, presets: [] });
  users.set("u2", { id: "u2", email: "bob@example.com", proUntil: null, billingStatus: "none", provider: null, customerRef: null, subscriptionRef: null, cancelAtPeriodEnd: false, presets: [] });
  client = createPayloadClient();
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(verify()));
});

describe("flutterwave webhook", () => {
  it("returns 401 for a missing verif-hash header", async () => {
    const res = await postWebhook({ headers: { "verif-hash": "" } });
    expect(res.status).toBe(401);
  });

  it("returns 401 for a wrong verif-hash header value", async () => {
    const res = await postWebhook({ headers: { origin: "http://localhost", "verif-hash": "wrong" } });
    expect(res.status).toBe(401);
  });

  it("returns 401 when FLUTTERWAVE_WEBHOOK_HASH is unset", async () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const res = await postWebhook({ headers: { origin: "http://localhost", "verif-hash": "anything" } });
    expect(res.status).toBe(401);
  });

  it("returns 401 when FLUTTERWAVE_WEBHOOK_HASH is empty", async () => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = "";
    const res = await postWebhook({ headers: { origin: "http://localhost", "verif-hash": "anything" } });
    expect(res.status).toBe(401);
  });

  it("grants exactly one Pro period for a valid charge.completed", async () => {
    const res = await postWebhook();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.alreadyApplied).toBe(false);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.provider).toBe("flutterwave");
    expect(updates[0].data.billingStatus).toBe("active");
    const until = new Date(updates[0].data.proUntil!).getTime();
    expect(until).toBeGreaterThan(Date.now());
  });

  it("grants nothing and returns 200 when the amount is too low", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 5, currency: "USD" }));
    const res = await postWebhook();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updates).toHaveLength(0);
    expect(events.size).toBeGreaterThan(0);
  });

  it("grants nothing and returns 200 when the currency is wrong", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 6, currency: "EUR" }));
    const res = await postWebhook();
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("returns 409 and grants nothing for a pending status", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 6, currency: "USD", status: "pending" }));
    const res = await postWebhook();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: expect.stringContaining("still being processed") });
    expect(updates).toHaveLength(0);
  });

  it("grants nothing and returns 200 when the tx_ref mismatches", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "different-ref" }));
    const res = await postWebhook({ ref: "other-123" });
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("grants nothing and returns 200 when the owner maps to no real user", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u999" } }));
    const res = await postWebhook();
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("grants nothing and returns 200 when there is no owner", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: undefined, tx_ref: "fw_123_1700000000_abc123" }));
    const res = await postWebhook();
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("records an ignored event and returns 200 when meta.userId and tx_ref user disagree", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u1" }, tx_ref: "fw_u3_1700000000_abc123" }));
    const res = await postWebhook({ ref: "fw_u3_1700000000_abc123" });
    expect(res.status).toBe(200);
    const evt = events.get("fw_u3_1700000000_abc123");
    expect(evt).toBeDefined();
    expect(evt.outcome).toBe("ignored");
    expect(evt.reason).toContain("owner mismatch");
    expect(updates).toHaveLength(0);
  });

  it("records an ignored event for an unrecognised event type", async () => {
    const res = await postWebhook({ headers: { origin: "http://localhost", "verif-hash": "webhook-hash-secret" }, body: JSON.stringify({ event: "charge.failed", data: { tx_ref: "fw_123_1700000000_abc123" } }) });
    expect(res.status).toBe(200);
    expect(events.size).toBeGreaterThan(0);
  });

  it("the same event delivered twice grants once", async () => {
    const first = await postWebhook();
    expect(first.status).toBe(200);
    expect(updates).toHaveLength(1);
    const second = await postWebhook();
    const secondJson = await second.json();
    expect(second.status).toBe(200);
    expect(secondJson.ok).toBe(true);
    expect(secondJson.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(1);
  });

  it("confirm then webhook grants once, and webhook then confirm grants once", async () => {
    const confirmRes = await postConfirm(referralRef, baseData.id);
    expect(confirmRes.status).toBe(200);
    expect(updates).toHaveLength(1);

    const webhookRes = await postWebhook();
    expect(webhookRes.status).toBe(200);
    const webhookJson = await webhookRes.json();
    expect(webhookJson.ok).toBe(true);
    expect(webhookJson.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(verify());
    const webhookRes2 = await postWebhook();
    expect(webhookRes2.status).toBe(200);
    expect(updates).toHaveLength(1);

    const confirmRes2 = await postConfirm(referralRef, baseData.id);
    expect(confirmRes2.status).toBe(200);
    const confirmJson = await confirmRes2.json();
    expect(confirmJson.ok).toBe(true);
    expect(confirmJson.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(1);
  });

  it("grants a payment to the owner even if different from the session user", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u2" }, tx_ref: "fw_u2_1700000000_abc123" }));
    const res = await postWebhook({ ref: "fw_u2_1700000000_abc123" });
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(users.get("u2")!.billingStatus).toBe("active");
  });

  it("grants a payment whose owner is a real user", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    const res = await postWebhook();
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(users.get("u1")!.billingStatus).toBe("active");
  });
});
