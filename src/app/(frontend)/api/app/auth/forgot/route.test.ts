import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/mail", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));

import { getPayloadClient } from "@/lib/payload";
import { sendMail } from "@/lib/app/mail";
import { rateLimit } from "@/lib/app/rate-limit";

const makeReq = (body: any, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3001/api/app/auth/forgot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/app/auth/forgot", () => {
  const mockPayload = {
    forgotPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (rateLimit as any).mockResolvedValue({ ok: true, retryAfter: 0 });
    (sendMail as any).mockResolvedValue(true);
  });

  it("fails when CSRF origin is invalid", async () => {
    const res = await POST(makeReq({ email: "test@example.com" }, { origin: "http://malicious.com" }));
    expect(res.status).toBe(403);
  });

  it("fails when rate limited", async () => {
    (rateLimit as any).mockResolvedValue({ ok: false, retryAfter: 300 });
    const res = await POST(makeReq({ email: "test@example.com" }));
    expect(res.status).toBe(429);
  });

  it("fails when email is invalid", async () => {
    const res = await POST(makeReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("calls forgotPassword and sends reset email when user exists", async () => {
    mockPayload.forgotPassword.mockResolvedValue("reset_token_xyz");

    const res = await POST(makeReq({ email: "Test@Example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(mockPayload.forgotPassword).toHaveBeenCalledWith({
      collection: "users",
      data: { email: "test@example.com" },
      disableEmail: true,
    });
    expect(sendMail).toHaveBeenCalledWith(
      "test@example.com",
      expect.stringContaining("Reset your Quran Caption Studio password"),
      expect.stringContaining("reset?token=reset_token_xyz")
    );
  });

  it("returns ok without sending email when forgotPassword returns null", async () => {
    mockPayload.forgotPassword.mockResolvedValue(null);

    const res = await POST(makeReq({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
