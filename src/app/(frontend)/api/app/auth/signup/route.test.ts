import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/app/verification", () => ({ issueVerificationEmail: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));

import { getPayloadClient } from "@/lib/payload";
import { setSession } from "@/lib/app/session";
import { issueVerificationEmail } from "@/lib/app/verification";
import { rateLimit } from "@/lib/app/rate-limit";

const makeReq = (body: any, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3001/api/app/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/app/auth/signup", () => {
  const mockPayload = {
    count: vi.fn(),
    create: vi.fn(),
    login: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (rateLimit as any).mockResolvedValue({ ok: true, retryAfter: 0 });
    (setSession as any).mockResolvedValue(undefined);
    (issueVerificationEmail as any).mockResolvedValue(true);
    mockPayload.count.mockResolvedValue({ totalDocs: 0 });
    mockPayload.create.mockResolvedValue({ id: "user_123", email: "test@example.com", name: "Test User" });
    mockPayload.login.mockResolvedValue({ token: "jwt_token_123", exp: 1234567890 });
  });

  it("fails when CSRF origin is invalid", async () => {
    const req = makeReq(
      { email: "test@example.com", password: "password123" },
      { origin: "http://evil.com" }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("fails when rate limited", async () => {
    (rateLimit as any).mockResolvedValue({ ok: false, retryAfter: 60 });
    const res = await POST(makeReq({ email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(429);
  });

  it("rejects invalid email", async () => {
    const res = await POST(makeReq({ email: "not-an-email", password: "password123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  it("rejects short password", async () => {
    const res = await POST(makeReq({ email: "test@example.com", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/at least 8 characters/i);
  });

  it("returns 409 when user already exists", async () => {
    mockPayload.count.mockResolvedValue({ totalDocs: 1 });
    const res = await POST(makeReq({ email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it("returns 409 when payload.create throws duplicate error", async () => {
    mockPayload.create.mockRejectedValue(new Error("duplicate key value violates unique constraint"));
    const res = await POST(makeReq({ email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("creates user, issues verification email, logs in and returns user with id", async () => {
    const res = await POST(
      makeReq({ email: "Test@Example.com", password: "password123", name: "Test User" })
    );

    expect(res.status).toBe(201);
    const json = await res.json();

    // Checked user count with normalized email
    expect(mockPayload.count).toHaveBeenCalledWith({
      collection: "users",
      where: { email: { equals: "test@example.com" } },
      overrideAccess: true,
    });

    // Created user with overrideAccess: true
    expect(mockPayload.create).toHaveBeenCalledWith({
      collection: "users",
      data: { email: "test@example.com", password: "password123", name: "Test User" },
      overrideAccess: true,
    });

    // Verification email issued
    expect(issueVerificationEmail).toHaveBeenCalledWith("user_123", "test@example.com");

    // Logged in
    expect(mockPayload.login).toHaveBeenCalledWith({
      collection: "users",
      data: { email: "test@example.com", password: "password123" },
    });
    expect(setSession).toHaveBeenCalledWith("jwt_token_123", 1234567890);

    // Response structure
    expect(json.user).toEqual({
      id: "user_123",
      email: "test@example.com",
      name: "Test User",
      emailVerified: false,
      plan: "free",
      billing: {
        status: "none",
        provider: null,
        proUntil: null,
        cancelAtPeriodEnd: false,
      },
    });
    expect(json.requiresVerification).toBe(true);
  });

  it("completes signup even if verification email fails", async () => {
    (issueVerificationEmail as any).mockRejectedValue(new Error("SMTP down"));
    const res = await POST(makeReq({ email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user.id).toBe("user_123");
  });
});
