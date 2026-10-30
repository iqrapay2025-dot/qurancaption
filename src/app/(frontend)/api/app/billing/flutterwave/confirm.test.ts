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

function post(ref: string, transaction_id: string | number = ref) {
  return confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ provider: "flutterwave", ref, transaction_id }),
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

  it("returns 409 for a pending status and grants nothing", async () => {
    fetchMock.mockResolvedValueOnce(verify({ amount: 6, currency: "USD", status: "pending" }));
    const res = await post("foo_123");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Payment is still being processed. Try again later." });
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

  it("verifies by reference when transaction_id is empty", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    const res = await post("foo_123", "");
    expect(res.status).toBe(200);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/verify_by_reference");
    expect(url).toContain("tx_ref=foo_123");
    expect(updates).toHaveLength(1);
    expect(updates[0].data.provider).toBe("flutterwave");
  });

  it("verifies by ID when transaction_id is numeric", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    const res = await post("foo_123", "42");
    expect(res.status).toBe(200);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/transactions/42/verify");
    expect(updates).toHaveLength(1);
    expect(updates[0].data.provider).toBe("flutterwave");
  });

  it("returns 400 for a failed status and grants nothing", async () => {
    fetchMock.mockResolvedValueOnce(verify({ status: "failed" }));
    const res = await post("foo_123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "The payment failed." });
    expect(updates).toHaveLength(0);
  });

  it("returns 400 when meta.userId and tx_ref user both present but disagree", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u2" }, tx_ref: "fw_u3_1700000000_abc123" }));
    const res = await post("fw_u3_1700000000_abc123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("returns 400 when meta.userId matches logged-in user but tx_ref user differs", async () => {
    fetchMock.mockResolvedValueOnce(verify({ meta: { userId: "u1" }, tx_ref: "fw_u3_1700000000_abc123" }));
    const res = await post("fw_u3_1700000000_abc123");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "We couldn't confirm this payment." });
    expect(updates).toHaveLength(0);
  });

  it("verifies by ID when transaction_id is a JSON number", async () => {
    fetchMock.mockResolvedValueOnce(verify());
    const res = await post("foo_123", 42);
    expect(res.status).toBe(200);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/transactions/42/verify");
    expect(updates).toHaveLength(1);
    expect(updates[0].data.provider).toBe("flutterwave");
  });

  it("allows up to 60 confirm calls in a short window", async () => {
    for (let i = 0; i < 60; i++) {
      fetchMock.mockResolvedValueOnce(verify());
      const res = await post("foo_123");
      expect(res.status).not.toBe(429);
    }
  });

  it("the Paystack confirm key is unchanged (still app:confirm:)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("../confirm/route.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("app:confirm:");
  });
});

describe("reference format validation", () => {
  it("accepts a standard Flutterwave tx_ref (fw_ prefix format)", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "fw_u1_12345_abc123", meta: { userId: "u1" } }));
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "fw_u1_12345_abc123", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(200);
  });

  it("accepts a Flutterwave tx_ref with letters in hex part", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "fw_u1_12345_abcd1234", meta: { userId: "u1" } }));
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "fw_u1_12345_abcd1234", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(200);
  });

  it("accepts a plain reference without fw_ prefix", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "simple_ref", meta: { userId: "u1" } }));
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "simple_ref", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(200);
  });

  it("accepts a reference with dots and hyphens", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "ref_with-dots.com", meta: { userId: "u1" } }));
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "ref_with-dots.com", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(200);
  });

  it("accepts a reference with underscore", async () => {
    fetchMock.mockResolvedValueOnce(verify({ tx_ref: "ref_with_underscore", meta: { userId: "u1" } }));
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "ref_with_underscore", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(200);
  });

  it("rejects a reference with unsafe characters (space)", async () => {
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "unsafe space", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(400);
  });

  it("rejects a reference with emoji", async () => {
    const res = await confirm(new Request("http://localhost/api/app/billing/flutterwave/confirm", {
      method: "POST",
      body: JSON.stringify({ provider: "flutterwave", ref: "emoji🔥", transaction_id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }));
    expect(res.status).toBe(400);
  });
});
