import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as paystackConfirm } from "@/app/(frontend)/api/app/billing/confirm/route";
import { POST as flutterwaveConfirm } from "@/app/(frontend)/api/app/billing/flutterwave/confirm/route";
import { flutterwaveCheckout, parseFlutterwaveTxRef } from "@/lib/app/billing";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn(() => ({
  find: vi.fn(async () => ({ docs: [] })),
  findByID: vi.fn(async () => null),
  create: vi.fn(async () => ({ id: "x" })),
  update: vi.fn(async () => ({ id: "u1" })),
})) }));
vi.mock("@/lib/app/session", () => ({
  currentUser: vi.fn(async () => ({ id: "123", email: "alice@example.com", name: "Alice" })),
}));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })) }));

let fetchMock: ReturnType<typeof vi.spyOn>;
let origKey: string | undefined;

beforeEach(() => {
  origKey = process.env.FLUTTERWAVE_SECRET_KEY;
  process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-sandbox_xyz";
  // Any provider call fails harmlessly: no network, nothing granted.
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(JSON.stringify({ status: "error", message: "mock" }), { status: 500 })
  );
});
afterEach(() => {
  fetchMock.mockRestore();
  if (origKey === undefined) delete process.env.FLUTTERWAVE_SECRET_KEY;
  else process.env.FLUTTERWAVE_SECRET_KEY = origKey;
});

const post = (route: (r: Request) => Promise<Response>, body: Record<string, unknown>) =>
  route(new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  }));

const paystack = (ref: string) => post(paystackConfirm, { provider: "paystack", ref });
const flutterwave = (ref: string) => post(flutterwaveConfirm, { provider: "flutterwave", ref, transaction_id: "" });

async function rejectedAsInvalid(res: Response) {
  if (res.status !== 400) return false;
  const j = await res.json().catch(() => ({}));
  return j.error === "Invalid payment reference.";
}

// Take the tx_ref from the request the REAL flutterwaveCheckout sends.
async function realTxRef(userId: string): Promise<string> {
  fetchMock.mockImplementationOnce(async () =>
    new Response(JSON.stringify({ status: "success", message: "ok", data: { link: "https://example.com/pay" } }))
  );
  await flutterwaveCheckout({ id: userId, email: "alice@example.com", name: "Alice" }, "NG");
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(String(init.body)).tx_ref;
}

describe("Paystack confirm route: reference format", () => {
  it("accepts a real Paystack reference", async () => {
    expect(await rejectedAsInvalid(await paystack("T990790877940220"))).toBe(false);
  });
  for (const bad of ["unsafe space", "a/b", "a\\b", "../x", "a;b", "a'b", 'a"b', "abc"]) {
    it(`rejects ${JSON.stringify(bad)}`, async () => {
      expect(await rejectedAsInvalid(await paystack(bad))).toBe(true);
    });
  }
});

describe("Flutterwave confirm route: reference format", () => {
  it("accepts a tx_ref built by the real flutterwaveCheckout", async () => {
    const txRef = await realTxRef("123");
    expect(txRef).toMatch(/^fw_123_\d+_[0-9a-f]{12}$/);
    expect(parseFlutterwaveTxRef(txRef)).toBe("123");
    expect(await rejectedAsInvalid(await flutterwave(txRef))).toBe(false);
  });
  for (const bad of ["unsafe space", "a/b", "a\\b", "../x", "a;b", "a'b", 'a"b']) {
    it(`rejects ${JSON.stringify(bad)}`, async () => {
      expect(await rejectedAsInvalid(await flutterwave(bad))).toBe(true);
    });
  }
});