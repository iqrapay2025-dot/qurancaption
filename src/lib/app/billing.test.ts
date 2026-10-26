import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { paystackSignatureOk } from "./billing";

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
