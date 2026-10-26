import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { currentUser } from "@/lib/app/session";
import { POST as flutterwaveCheckout } from "./checkout/route";

let fetchMock: ReturnType<typeof vi.spyOn>;
let origKey: string | undefined;
let origSite: string | undefined;

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({
  currentUser: vi.fn(async () => ({ id: "u1", email: "alice@example.com", name: "Alice" } as any)),
}));

function post() {
  return flutterwaveCheckout(new Request("http://localhost/api/app/billing/flutterwave/checkout", {
    method: "POST",
    headers: { origin: "http://localhost" },
  }));
}

beforeEach(() => {
  origKey = process.env.FLUTTERWAVE_SECRET_KEY;
  origSite = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-sandbox_xyz";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  fetchMock = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchMock.mockRestore();
  if (origKey === undefined) delete process.env.FLUTTERWAVE_SECRET_KEY;
  else process.env.FLUTTERWAVE_SECRET_KEY = origKey;
  if (origSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = origSite;
});

describe("flutterwave checkout", () => {
  it("creates a USD Standard payment and returns the hosted link", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: "success",
      message: "Payment link created",
      data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/xyz789" },
    })));
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.flutterwave.com/v3/hosted/pay/xyz789" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe("https://api.flutterwave.com/v3/payments");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer FLWSECK_TEST-sandbox_xyz");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body);
    expect(body.tx_ref).toContain("u1");
    expect(body.amount).toBe(6);
    expect(body.currency).toBe("USD");
    expect(body.redirect_url).toBe("http://localhost:3000/billing/return?provider=flutterwave");
    expect(body.customer.email).toBe("alice@example.com");
    expect(body.customer.name).toBe("Alice");
    expect(body.meta.userId).toBe("u1");
  });

  it("returns a unique tx_ref per checkout", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      status: "success",
      data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/xyz" },
    }))));
    const refs = new Set<string>();
    const urls = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const res = await post();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toBe("https://checkout.flutterwave.com/v3/hosted/pay/xyz");
      urls.add(json.url);
      const body = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body);
      refs.add(body.tx_ref);
    }
    expect(refs.size).toBe(3);
    expect(urls.size).toBe(1);
  });

  it("fails with 500 when FLUTTERWAVE_SECRET_KEY is missing and does not call Flutterwave", async () => {
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    const res = await post();
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not logged in", async () => {
    vi.mocked(currentUser).mockResolvedValueOnce(null);
    const res = await post();
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
