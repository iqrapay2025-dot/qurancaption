import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as confirmPaystack } from "@/app/(frontend)/api/app/billing/confirm/route";
import { POST as confirmFlutterwave } from "@/app/(frontend)/api/app/billing/flutterwave/confirm/route";
import {
  findUserId,
  flutterwaveVerifyByReference,
  grantProPeriod,
  parseFlutterwaveTxRef,
  paystackVerify,
} from "./billing";
import { PRO_PRICE_NGN, PRO_PRICE_NGN_KOBO } from "./plans";

vi.mock("./billing", () => ({
  findUserId: vi.fn(),
  flutterwaveVerify: vi.fn(),
  flutterwaveVerifyByReference: vi.fn(),
  grantProPeriod: vi.fn(),
  parseFlutterwaveTxRef: vi.fn(),
  paystackVerify: vi.fn(),
  PAYSTACK_MANUAL_KIND: "manual_monthly",
}));

vi.mock("./rate-limit", () => ({
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
}));

const request = (body: Record<string, unknown>) => {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new Request(`${origin}/api/app/billing/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-forwarded-host": new URL(origin).host,
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findUserId).mockResolvedValue("user-123");
  vi.mocked(grantProPeriod).mockResolvedValue({ applied: true });
});

describe("payment return confirmation without a browser session", () => {
  it("grants Paystack Pro to the account in the verified transaction metadata", async () => {
    const ref = "T990790877940220";
    vi.mocked(paystackVerify).mockResolvedValue({
      reference: ref,
      status: "success",
      amount: PRO_PRICE_NGN_KOBO,
      currency: "NGN",
      metadata: { userId: "user-123", kind: "manual_monthly" },
      plan: null,
      customer: { email: "payer@example.com" },
    } as never);

    const response = await confirmPaystack(request({ provider: "paystack", ref }));

    expect(response.status).toBe(200);
    expect(findUserId).toHaveBeenCalledWith({ userId: "user-123", email: "payer@example.com" });
    expect(grantProPeriod).toHaveBeenCalledWith({
      userId: "user-123",
      provider: "paystack",
      reference: ref,
      customerRef: null,
    });
  });

  it("grants Flutterwave Pro to the owner encoded in the verified transaction", async () => {
    const ref = "fw_123_1730000000_abcdef123456";
    vi.mocked(parseFlutterwaveTxRef).mockReturnValue("user-123");
    vi.mocked(flutterwaveVerifyByReference).mockResolvedValue({
      data: {
        status: "successful",
        tx_ref: ref,
        amount: PRO_PRICE_NGN,
        currency: "NGN",
        meta: { userId: "user-123", currency: "NGN", amount: PRO_PRICE_NGN },
      },
    } as never);

    const response = await confirmFlutterwave(request({
      provider: "flutterwave",
      ref,
    }));

    expect(response.status).toBe(200);
    expect(findUserId).toHaveBeenCalledWith({ userId: "user-123" });
    expect(grantProPeriod).toHaveBeenCalledWith({
      userId: "user-123",
      provider: "flutterwave",
      reference: ref,
    });
  });

  it("does not grant Pro if the verified payment has no matching account", async () => {
    const ref = "T990790877940220";
    vi.mocked(paystackVerify).mockResolvedValue({
      reference: ref,
      status: "success",
      amount: PRO_PRICE_NGN_KOBO,
      currency: "NGN",
      metadata: { userId: "missing-user", kind: "manual_monthly" },
      plan: null,
      customer: { email: "payer@example.com" },
    } as never);
    vi.mocked(findUserId).mockResolvedValue(null);

    const response = await confirmPaystack(request({ provider: "paystack", ref }));

    expect(response.status).toBe(404);
    expect(grantProPeriod).not.toHaveBeenCalled();
  });
});
