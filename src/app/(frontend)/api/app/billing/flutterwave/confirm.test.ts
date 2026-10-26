import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DAY } from "@/lib/app/billing";
import { MONTHLY_PERIOD_DAYS } from "@/lib/app/plans";
import { POST as confirm } from "./confirm/route";

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

const baseData = {
  id: 1,
  tx_ref: "foo_123",
  flw_ref: "flw_987",
  amount: 6,
  currency: "USD",
  status: "successful",
  customer: { id: 1, email: "alice@example.com" },
  meta: { userId: "u1" },
};

let fetchMock: ReturnType<typeof vi.spyOn>;
let origKey: string | undefined;

function verify(payload: Record<string, any> = {}): Response {
  return new Response(JSON.stringify({ status: "success", message: "Transaction fetched successfully", data: { ...baseData, ...payload } }));
}

beforeEach(() => {
  origKey = process.env.FLUTTERWAVE_SECRET_KEY;
  process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-sandbox_xyz";
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
  fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(verify());
});

afterEach(() => {
  fetchMock.mockRestore();
  if (origKey === undefined) delete process.env.FLUTTERWAVE_SECRET_KEY;
  else process.env.FLUTTERWAVE_SECRET_KEY = origKey;
});

function post(ref: string, txRef: string = ref) {
  return confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ provider: "flutterwave", ref, transaction_id: txRef }),
  }));
}

describe("flutterwave confirm", () => {
  it("grants Pro and returns the new proUntil on a successful payment", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    const res = await post("foo_123");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.alreadyApplied).toBe(false);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.provider).toBe("flutterwave");
    expect(updates[0].data.billingStatus).toBe("active");
    const until = new Date(updates[0].data.proUntil!).getTime();
    expect(until).toBeGreaterThan(Date.now());
    expect(until).toBeLessThan(Date.now() + MONTHLY_PERIOD_DAYS * DAY * 2);
  });

  it("rejects a payment for the wrong amount", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 5, currency: "USD" }));
    const res = await post("foo_123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("rejects a payment in the wrong currency", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 6, currency: "EUR" }));
    const res = await post("foo_123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("rejects a non-successful status", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 6, currency: "USD", status: "pending" }));
    const res = await post("foo_123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("rejects a tx_ref mismatch", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "other-123", amount: 6, currency: "USD" }));
    const res = await post("foo_123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("rejects a payment not belonging to the logged-in user", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u2" } }));
    const res = await post("foo_123");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("does not belong to your account");
    expect(updates).toHaveLength(0);
  });

  it("rejects the same reference confirmed twice without granting again", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    await post("foo_123");
    const first = updates.length;
    fetchMock.mockResolvedValueOnce(verify());
    const res = await post("foo_123");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.alreadyApplied).toBe(true);
    expect(updates).toHaveLength(first);
  });

  it("pays early by extending the existing proUntil", async () => {
    const future = new Date(Date.now() + 20 * DAY).toISOString();
    users.set("u1", { ...users.get("u1"), proUntil: future });
    fetchMock.mockResolvedValueOnce(verify());
    await post("foo_123");
    const expected = new Date(new Date(future).getTime() + MONTHLY_PERIOD_DAYS * DAY).toISOString();
    expect(updates).toHaveLength(1);
    expect(updates[0].data.proUntil).toBe(expected);
  });
});
