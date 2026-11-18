import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/app/session", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/app/accountInfo", () => ({ userWithPlan: vi.fn() }));

import { currentUser } from "@/lib/app/session";
import { userWithPlan } from "@/lib/app/accountInfo";

describe("GET /api/app/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null user when unauthenticated", async () => {
    (currentUser as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toBeNull();
  });

  it("returns user with plan and verification status when authenticated", async () => {
    const rawUser = { id: "u1", email: "a@b.com", name: "User 1" };
    (currentUser as any).mockResolvedValue(rawUser);
    (userWithPlan as any).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "User 1",
      plan: "free",
      billing: { status: "none", provider: null, proUntil: null, cancelAtPeriodEnd: false },
      emailVerified: true,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "User 1",
      plan: "free",
      billing: { status: "none", provider: null, proUntil: null, cancelAtPeriodEnd: false },
      emailVerified: true,
    });
  });
});
