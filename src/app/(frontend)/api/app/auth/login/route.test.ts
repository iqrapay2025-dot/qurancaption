import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/app/accountInfo", () => ({ userWithPlan: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));

import { getPayloadClient } from "@/lib/payload";
import { setSession } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";
import { rateLimit } from "@/lib/app/rate-limit";

const makeReq = (body: any, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3001/api/app/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/app/auth/login", () => {
  const mockPayload = {
    login: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (rateLimit as any).mockResolvedValue({ ok: true, retryAfter: 0 });
    (setSession as any).mockResolvedValue(undefined);
    (userWithPlan as any).mockImplementation((u: any) =>
      Promise.resolve({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        plan: "free",
        billing: { status: "none", provider: null, proUntil: null, cancelAtPeriodEnd: false },
        emailVerified: false,
      })
    );
  });

  it("fails when CSRF origin is invalid", async () => {
    const res = await POST(
      makeReq({ email: "test@example.com", password: "password123" }, { origin: "http://malicious.com" })
    );
    expect(res.status).toBe(403);
  });

  it("fails when rate limited", async () => {
    (rateLimit as any).mockResolvedValue({ ok: false, retryAfter: 30 });
    const res = await POST(makeReq({ email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(429);
  });

  it("fails when missing email or password", async () => {
    const res = await POST(makeReq({ email: "", password: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email and password/i);
  });

  it("fails with 401 on incorrect credentials", async () => {
    mockPayload.login.mockRejectedValue(new Error("Invalid credentials"));
    const res = await POST(makeReq({ email: "test@example.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/incorrect email or password/i);
  });

  it("fails with 429 when account is locked", async () => {
    mockPayload.login.mockRejectedValue(new Error("Account is locked"));
    const res = await POST(makeReq({ email: "test@example.com", password: "wrong" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many attempts/i);
  });

  it("logs in successfully and returns user with plan, billing, and emailVerified", async () => {
    const userDoc = { id: "u_456", email: "test@example.com", name: "User 456", emailVerified: false };
    mockPayload.login.mockResolvedValue({
      token: "jwt_token_456",
      exp: 99999999,
      user: userDoc,
    });

    const res = await POST(makeReq({ email: "Test@Example.com ", password: "password123" }));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(mockPayload.login).toHaveBeenCalledWith({
      collection: "users",
      data: { email: "test@example.com", password: "password123" },
    });
    expect(setSession).toHaveBeenCalledWith("jwt_token_456", 99999999);
    expect(userWithPlan).toHaveBeenCalledWith(userDoc);
    expect(json.user).toEqual({
      id: "u_456",
      email: "test@example.com",
      name: "User 456",
      plan: "free",
      billing: { status: "none", provider: null, proUntil: null, cancelAtPeriodEnd: false },
      emailVerified: false,
    });
  });
});
