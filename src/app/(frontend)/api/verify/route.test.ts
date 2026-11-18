import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import { GET } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/site", () => ({ siteUrl: vi.fn(() => "http://localhost:3001") }));

import { getPayloadClient } from "@/lib/payload";
import { currentUser } from "@/lib/app/session";

describe("GET /api/verify", () => {
  const mockPayload = {
    find: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
    (currentUser as any).mockResolvedValue(null);
  });

  it("redirects to /?verify=invalid when token is missing", async () => {
    const req = new Request("http://localhost:3001/api/verify");
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verify=invalid");
  });

  it("redirects to /?verify=invalid when token is longer than 200 characters", async () => {
    const req = new Request(`http://localhost:3001/api/verify?token=${"a".repeat(201)}`);
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verify=invalid");
  });

  it("redirects to /?verify=invalid when token is not found in database", async () => {
    mockPayload.find.mockResolvedValue({ docs: [] });
    const req = new Request("http://localhost:3001/api/verify?token=unrecognized_token");
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verify=invalid");
  });

  it("redirects to /?verified=1 if token is not found but logged-in user is already verified", async () => {
    mockPayload.find.mockResolvedValue({ docs: [] });
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com", emailVerified: true });

    const req = new Request("http://localhost:3001/api/verify?token=already_used_token");
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verified=1");
  });

  it("redirects to /?verify=invalid if token has expired", async () => {
    const rawToken = "raw_test_token_123";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    mockPayload.find.mockResolvedValue({
      docs: [
        {
          id: "u_expired",
          email: "test@example.com",
          emailToken: hashed,
          emailTokenExpires: new Date(Date.now() - 1000 * 60).toISOString(), // expired 1 minute ago
        },
      ],
    });

    const req = new Request(`http://localhost:3001/api/verify?token=${rawToken}`);
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verify=invalid");
    expect(mockPayload.update).not.toHaveBeenCalled();
  });

  it("successfully marks user as verified, clears token, and redirects to /?verified=1", async () => {
    const rawToken = "valid_random_token_xyz";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    mockPayload.find.mockResolvedValue({
      docs: [
        {
          id: "u_valid",
          email: "user@example.com",
          emailToken: hashed,
          emailTokenExpires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
    });
    mockPayload.update.mockResolvedValue({});

    const req = new Request(`http://localhost:3001/api/verify?token=${rawToken}`);
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/?verified=1");

    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: "users",
      id: "u_valid",
      data: {
        emailVerified: true,
        emailVerifiedAt: expect.any(String),
        emailVerificationSource: "email_link",
        emailToken: null,
        emailTokenExpires: null,
      },
      overrideAccess: true,
      depth: 0,
    });
  });
});
