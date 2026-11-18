import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/app/session", () => ({ clearSession: vi.fn() }));

import { clearSession } from "@/lib/app/session";

describe("POST /api/app/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when CSRF origin is invalid", async () => {
    const req = new Request("http://localhost:3001/api/app/auth/logout", {
      method: "POST",
      headers: { origin: "http://attacker.com" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("clears session and returns 200", async () => {
    const req = new Request("http://localhost:3001/api/app/auth/logout", {
      method: "POST",
      headers: { origin: "http://localhost" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(clearSession).toHaveBeenCalled();
  });
});
