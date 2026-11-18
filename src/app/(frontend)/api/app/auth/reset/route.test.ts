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
  new Request("http://localhost:3001/api/app/auth/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/app/auth/reset", () => {
  const mockPayload = {
    resetPassword: vi.fn(),
    update: vi.fn(),
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
        emailVerified: true,
      })
    );
  });

  it("fails when CSRF origin is invalid", async () => {
    const res = await POST(
      makeReq({ token: "token123", password: "newpassword123" }, { origin: "http://malicious.com" })
    );
    expect(res.status).toBe(403);
  });

  it("fails when rate limited", async () => {
    (rateLimit as any).mockResolvedValue({ ok: false, retryAfter: 30 });
    const res = await POST(makeReq({ token: "token123", password: "newpassword123" }));
    expect(res.status).toBe(429);
  });

  it("fails when token is missing", async () => {
    const res = await POST(makeReq({ password: "newpassword123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/reset link is not valid/i);
  });

  it("fails when password is too short", async () => {
    const res = await POST(makeReq({ token: "token123", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/at least 8 characters/i);
  });

  it("fails when token is rejected by payload", async () => {
    mockPayload.resetPassword.mockRejectedValue(new Error("Invalid token"));
    const res = await POST(makeReq({ token: "bad_token", password: "newpassword123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid or has expired/i);
  });

  it("resets password, marks user verified, sets session, and returns user", async () => {
    const userDoc = { id: "u_reset", email: "user@example.com", name: "User Reset" };
    mockPayload.resetPassword.mockResolvedValue({
      token: "new_jwt_token",
      user: userDoc,
    });
    mockPayload.update.mockResolvedValue(userDoc);

    const res = await POST(makeReq({ token: "valid_token", password: "newpassword123" }));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(mockPayload.resetPassword).toHaveBeenCalledWith({
      collection: "users",
      data: { token: "valid_token", password: "newpassword123" },
      overrideAccess: true,
    });

    expect(setSession).toHaveBeenCalledWith("new_jwt_token");

    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: "users",
      id: "u_reset",
      data: {
        emailVerified: true,
        emailVerifiedAt: expect.any(String),
        emailVerificationSource: "password_reset",
        emailToken: null,
        emailTokenExpires: null,
      },
      overrideAccess: true,
      depth: 0,
    });

    expect(json.user).toEqual({
      id: "u_reset",
      email: "user@example.com",
      name: "User Reset",
      plan: "free",
      billing: { status: "none", provider: null, proUntil: null, cancelAtPeriodEnd: false },
      emailVerified: true,
    });
  });
});
