import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import { issueVerificationEmail, VERIFICATION_EXPIRY_HOURS } from "./verification";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/mail", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/site", () => ({ siteUrl: vi.fn(() => "http://localhost:3001") }));

import { getPayloadClient } from "@/lib/payload";
import { sendMail } from "@/lib/app/mail";

describe("issueVerificationEmail", () => {
  const mockPayload = {
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (sendMail as any).mockResolvedValue(true);
    mockPayload.update.mockResolvedValue({});
  });

  it("hashes token, updates user with 24h expiration, and sends email", async () => {
    const before = Date.now();
    const result = await issueVerificationEmail("user_42", "tester@example.com");

    expect(result).toBe(true);
    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: "users",
      id: "user_42",
      data: {
        emailToken: expect.stringMatching(/^[a-f0-9]{64}$/), // sha256 hex
        emailTokenExpires: expect.any(String),
      },
      overrideAccess: true,
      depth: 0,
    });

    const updateCall = mockPayload.update.mock.calls[0][0];
    const expiryTime = new Date(updateCall.data.emailTokenExpires).getTime();
    const expectedExpiry = before + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;
    // Allow 5 second margin
    expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(5000);

    expect(sendMail).toHaveBeenCalledWith(
      "tester@example.com",
      "Verify your email address",
      expect.stringContaining("http://localhost:3001/api/verify?token=")
    );
  });

  it("returns false if email sending fails", async () => {
    (sendMail as any).mockResolvedValue(false);
    const result = await issueVerificationEmail("user_42", "tester@example.com");
    expect(result).toBe(false);
  });
});
