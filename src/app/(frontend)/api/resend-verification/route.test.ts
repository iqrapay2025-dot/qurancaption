import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/verification", () => ({ issueVerificationEmail: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));

import { getPayloadClient } from "@/lib/payload";
import { issueVerificationEmail } from "@/lib/app/verification";
import { rateLimit } from "@/lib/app/rate-limit";

const makeReq = (body: any, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3001/api/resend-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/resend-verification", () => {
  const mockPayload = {
    find: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (rateLimit as any).mockResolvedValue({ ok: true, retryAfter: 0 });
    (issueVerificationEmail as any).mockResolvedValue(true);
  });

  it("fails when CSRF origin is invalid", async () => {
    const res = await POST(makeReq({ email: "test@example.com" }, { origin: "http://malicious.com" }));
    expect(res.status).toBe(403);
  });

  it("fails when rate limited", async () => {
    (rateLimit as any).mockResolvedValue({ ok: false, retryAfter: 120 });
    const res = await POST(makeReq({ email: "test@example.com" }));
    expect(res.status).toBe(429);
  });

  it("fails when email is invalid or missing", async () => {
    const res = await POST(makeReq({ email: "invalid-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  it("returns ok without sending if user is not found (anti-enumeration)", async () => {
    mockPayload.find.mockResolvedValue({ docs: [] });
    const res = await POST(makeReq({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(issueVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns ok without sending if user is already verified", async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: "u_verified", email: "user@example.com", emailVerified: true }],
    });
    const res = await POST(makeReq({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(issueVerificationEmail).not.toHaveBeenCalled();
  });

  it("issues verification email when user is unverified", async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: "u_unverified", email: "user@example.com", emailVerified: false }],
    });

    const res = await POST(makeReq({ email: "User@Example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: "users",
      where: { email: { equals: "user@example.com" } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    });
    expect(issueVerificationEmail).toHaveBeenCalledWith("u_unverified", "user@example.com");
  });

  it("returns 502 error if sending verification email fails", async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: "u_unverified", email: "user@example.com", emailVerified: false }],
    });
    (issueVerificationEmail as any).mockResolvedValue(false);

    const res = await POST(makeReq({ email: "user@example.com" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/could not send verification email/i);
  });
});
