import { describe, it, expect, beforeEach, vi } from "vitest";
import { PATCH } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ currentUser: vi.fn(), clearSession: vi.fn() }));
vi.mock("@/lib/app/accountInfo", () => ({ userWithPlan: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));
vi.mock("@/lib/app/billing", () => ({ getAccount: vi.fn(), paystackCancel: vi.fn(), paystackDisable: vi.fn() }));

import { getPayloadClient } from "@/lib/payload";
import { currentUser } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";

const makeReq = (body: any) =>
  new Request("http://localhost:3001/api/app/account", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });

describe("PATCH /api/app/account", () => {
  const mockPayload = {
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPayloadClient as any).mockResolvedValue(mockPayload);
  });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("updates name successfully", async () => {
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com", name: "Old" });
    mockPayload.update.mockResolvedValue({ id: "u1", email: "a@b.com", name: "New Name" });
    (userWithPlan as any).mockResolvedValue({ id: "u1", email: "a@b.com", name: "New Name", plan: "free" });

    const res = await PATCH(makeReq({ name: "New Name" }));
    expect(res.status).toBe(200);
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "u1",
        data: { name: "New Name" },
      })
    );
  });

  it("updates avatarUrl successfully with valid data URL", async () => {
    const avatar = "data:image/webp;base64,UklGRmYAAABXRUJQVlA4...";
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com" });
    mockPayload.update.mockResolvedValue({ id: "u1", email: "a@b.com", avatarUrl: avatar });
    (userWithPlan as any).mockResolvedValue({ id: "u1", email: "a@b.com", avatarUrl: avatar, plan: "free" });

    const res = await PATCH(makeReq({ avatarUrl: avatar }));
    expect(res.status).toBe(200);
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "u1",
        data: { avatarUrl: avatar },
      })
    );
  });

  it("allows removing avatar by passing null", async () => {
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com", avatarUrl: "old-url" });
    mockPayload.update.mockResolvedValue({ id: "u1", email: "a@b.com", avatarUrl: null });
    (userWithPlan as any).mockResolvedValue({ id: "u1", email: "a@b.com", avatarUrl: null, plan: "free" });

    const res = await PATCH(makeReq({ avatarUrl: null }));
    expect(res.status).toBe(200);
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "u1",
        data: { avatarUrl: null },
      })
    );
  });

  it("rejects invalid avatarUrl scheme", async () => {
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com" });
    const res = await PATCH(makeReq({ avatarUrl: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid image/i);
  });

  it("rejects oversized avatarUrl", async () => {
    (currentUser as any).mockResolvedValue({ id: "u1", email: "a@b.com" });
    const bigString = "data:image/png;base64," + "A".repeat(500_001);
    const res = await PATCH(makeReq({ avatarUrl: bigString }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too large/i);
  });
});
