import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { paystackSignatureOk, claimEvent, grantProPeriod, extend } from "./billing";
import { getPayloadClient } from "@/lib/payload";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));

let origSecret: string | undefined;

beforeEach(() => {
  origSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "sk_test_live_1234567890abcdef";
});

afterEach(() => {
  process.env.PAYSTACK_SECRET_KEY = origSecret;
});

describe("paystackSignatureOk", () => {
  it("returns true for a valid signature", () => {
    const raw = '{"event":"charge.success","data":{"reference":"ref_1"}}';
    const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
    expect(paystackSignatureOk(raw, sig)).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    expect(paystackSignatureOk("body", "deadbeef")).toBe(false);
  });

  it("returns false when the secret is missing", () => {
    process.env.PAYSTACK_SECRET_KEY = undefined as unknown as string;
    expect(paystackSignatureOk("body", "whatever")).toBe(false);
  });
});

describe("claimEvent fails closed", () => {
  const mockClient = (o: { create?: () => Promise<unknown>; find?: () => Promise<unknown> }) => {
    const client = {
      create: vi.fn(o.create ?? (async () => ({ id: "e1" }))),
      find: vi.fn(o.find ?? (async () => ({ docs: [] }))),
      findByID: vi.fn(async () => ({ id: "u1", proUntil: null })),
      update: vi.fn(async () => ({ id: "u1" })),
      delete: vi.fn(async () => ({})),
    };
    (getPayloadClient as any).mockResolvedValue(client);
    return client;
  };

  it("returns true when the claim row is created", async () => {
    mockClient({});
    expect(await claimEvent("paystack:charge:r1", "paystack.charge")).toBe(true);
  });

  it("returns false when the row already exists", async () => {
    mockClient({
      create: async () => { throw new Error("duplicate"); },
      find: async () => ({ docs: [{ id: "e1" }] }),
    });
    expect(await claimEvent("paystack:charge:r1", "paystack.charge")).toBe(false);
  });

  it("throws when create fails and no row exists (database error)", async () => {
    mockClient({
      create: async () => { throw new Error("column does not exist"); },
      find: async () => ({ docs: [] }),
    });
    await expect(claimEvent("paystack:charge:r1", "paystack.charge")).rejects.toThrow("column does not exist");
  });

  it("throws when the lookup itself fails", async () => {
    mockClient({
      create: async () => { throw new Error("boom"); },
      find: async () => { throw new Error("db down"); },
    });
    await expect(claimEvent("paystack:charge:r1", "paystack.charge")).rejects.toThrow();
  });

  it("grantProPeriod grants nothing when the claim hits a database error", async () => {
    const client = mockClient({
      create: async () => { throw new Error("column does not exist"); },
      find: async () => ({ docs: [] }),
    });
    await expect(grantProPeriod({ userId: "u1", provider: "paystack", reference: "r1" })).rejects.toThrow();
    expect(client.update).not.toHaveBeenCalled();
  });

  it("grantProPeriod returns applied:false for an already-claimed reference", async () => {
    const client = mockClient({
      create: async () => { throw new Error("duplicate"); },
      find: async () => ({ docs: [{ id: "e1" }] }),
    });
    const r = await grantProPeriod({ userId: "u1", provider: "paystack", reference: "r1" });
    expect(r).toEqual({ applied: false });
    expect(client.update).not.toHaveBeenCalled();
  });
});

describe("extend adds calendar months", () => {
  afterEach(() => vi.useRealTimers());
  const at = (iso: string) => { vi.useFakeTimers(); vi.setSystemTime(new Date(iso)); };

  it("Nov 1 gives Dec 1", () => {
    at("2026-11-01T10:00:00.000Z");
    expect(extend(null)).toBe("2026-12-01T10:00:00.000Z");
  });
  it("extends from an existing future proUntil", () => {
    at("2026-11-01T10:00:00.000Z");
    expect(extend("2026-12-01T10:00:00.000Z")).toBe("2027-01-01T10:00:00.000Z");
  });
  it("clamps Jan 31 to the end of February", () => {
    at("2027-01-31T10:00:00.000Z");
    expect(extend(null)).toBe("2027-02-28T10:00:00.000Z");
  });
  it("ignores a past proUntil", () => {
    at("2026-11-01T10:00:00.000Z");
    expect(extend("2026-01-05T00:00:00.000Z")).toBe("2026-12-01T10:00:00.000Z");
  });
});