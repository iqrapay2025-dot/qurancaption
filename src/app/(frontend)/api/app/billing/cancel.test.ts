import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./cancel/route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/app/billing", () => ({
  getAccount: vi.fn(),
  paystackDisable: vi.fn(),
  paystackCancel: vi.fn(),
  setBilling: vi.fn(),
}));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })) }));

import { currentUser } from "@/lib/app/session";
import { getAccount, paystackDisable, paystackCancel, setBilling } from "@/lib/app/billing";
import { rateLimit } from "@/lib/app/rate-limit";

const call = () => POST(new Request("http://x", { method: "POST", headers: { origin: "http://localhost" } }));

// Account shape matches what cancel/route.ts reads: customerRef, subscriptionRef
// and emailToken are top-level; provider, cancelAtPeriodEnd and proUntil are under billing.
const account = (o: { provider?: string | null; plan?: string; cancelAtPeriodEnd?: boolean; customerRef?: string; subscriptionRef?: string; emailToken?: string } = {}) => ({
  plan: o.plan ?? "pro",
  billing: {
    provider: o.provider === undefined ? "paystack" : o.provider,
    cancelAtPeriodEnd: o.cancelAtPeriodEnd ?? false,
    proUntil: "2027-01-01T00:00:00.000Z",
  },
  customerRef: o.customerRef,
  subscriptionRef: o.subscriptionRef,
  emailToken: o.emailToken,
});

beforeEach(() => {
  vi.clearAllMocks();
  (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com" });
  (rateLimit as any).mockReturnValue({ ok: true, retryAfter: 0 });
  (paystackDisable as any).mockResolvedValue(undefined);
  (paystackCancel as any).mockResolvedValue(undefined);
  (setBilling as any).mockResolvedValue(undefined);
});

describe("cancel route", () => {
  it("logged out returns 401", async () => {
    (currentUser as any).mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(getAccount).not.toHaveBeenCalled();
  });

  it("rate limited returns 429", async () => {
    (rateLimit as any).mockReturnValue({ ok: false, retryAfter: 30 });
    const res = await call();
    expect(res.status).toBe(429);
    expect(getAccount).not.toHaveBeenCalled();
    expect(paystackCancel).not.toHaveBeenCalled();
  });

  it("no Pro returns 400", async () => {
    (getAccount as any).mockResolvedValue(account({ plan: "free", provider: null }));
    const res = await call();
    expect(res.status).toBe(400);
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("already set to cancel returns 200 and does nothing", async () => {
    (getAccount as any).mockResolvedValue(account({ cancelAtPeriodEnd: true, customerRef: "cust" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(paystackDisable).not.toHaveBeenCalled();
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("manual flutterwave returns 400 doesn't renew", async () => {
    (getAccount as any).mockResolvedValue(account({ provider: "flutterwave" }));
    const res = await call();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("doesn't renew automatically");
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("manual one-month paystack returns 400 doesn't renew", async () => {
    (getAccount as any).mockResolvedValue(account({ provider: "paystack" })); // no customerRef, no subscriptionRef
    const res = await call();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("doesn't renew automatically");
    expect(paystackDisable).not.toHaveBeenCalled();
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("unknown provider returns 400 and does not call Paystack", async () => {
    (getAccount as any).mockResolvedValue(account({ provider: "stripe", customerRef: "cust" }));
    const res = await call();
    expect(res.status).toBe(400);
    expect(paystackDisable).not.toHaveBeenCalled();
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("auto-renew with stored subscription code and email token uses paystackDisable and sets cancelAtPeriodEnd", async () => {
    (getAccount as any).mockResolvedValue(account({ customerRef: "cust", subscriptionRef: "SUB_1", emailToken: "tok" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(paystackDisable).toHaveBeenCalledWith("SUB_1", "tok");
    expect(paystackCancel).not.toHaveBeenCalled();
    expect(setBilling).toHaveBeenCalledWith("u1", { cancelAtPeriodEnd: true });
  });

  it("only a customer reference uses paystackCancel", async () => {
    (getAccount as any).mockResolvedValue(account({ customerRef: "cust" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(paystackCancel).toHaveBeenCalledTimes(1);
    expect(paystackDisable).not.toHaveBeenCalled();
    expect(setBilling).toHaveBeenCalledWith("u1", { cancelAtPeriodEnd: true });
  });

  it("subscription code without email token uses paystackCancel", async () => {
    (getAccount as any).mockResolvedValue(account({ subscriptionRef: "SUB_1" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(paystackCancel).toHaveBeenCalledTimes(1);
    expect(paystackDisable).not.toHaveBeenCalled();
    expect(setBilling).toHaveBeenCalledWith("u1", { cancelAtPeriodEnd: true });
  });

  it("paystackCancel failure returns 502 and does not set cancelAtPeriodEnd", async () => {
    (getAccount as any).mockResolvedValue(account({ customerRef: "cust" }));
    (paystackCancel as any).mockRejectedValue(new Error("boom"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(setBilling).not.toHaveBeenCalled();
  });

  it("paystackDisable failure returns 502 and does not set cancelAtPeriodEnd", async () => {
    (getAccount as any).mockResolvedValue(account({ customerRef: "cust", subscriptionRef: "SUB_1", emailToken: "tok" }));
    (paystackDisable as any).mockRejectedValue(new Error("boom"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(setBilling).not.toHaveBeenCalled();
  });
});