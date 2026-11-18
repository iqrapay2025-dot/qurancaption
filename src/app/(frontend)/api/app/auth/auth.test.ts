import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as signupPOST } from "./signup/route";
import { POST as loginPOST } from "./login/route";
import { POST as forgotPOST } from "./forgot/route";
import { POST as resetPOST } from "./reset/route";
import { GET as verifyGET } from "../../verify/route";
import { POST as resendPOST } from "../../resend-verification/route";
import { issueVerificationEmail } from "@/lib/app/verification";
import { setSession } from "@/lib/app/session";
import { sendMail } from "@/lib/app/mail";

const mockUsers: any[] = [];
const mockPayload = {
  count: vi.fn(async ({ where }: any) => {
    const email = where?.email?.equals;
    const totalDocs = mockUsers.filter((u) => u.email === email).length;
    return { totalDocs };
  }),
  create: vi.fn(async ({ data }: any) => {
    const user = { id: `u-${mockUsers.length + 1}`, ...data, emailVerified: false };
    mockUsers.push(user);
    return user;
  }),
  login: vi.fn(),
  find: vi.fn(async ({ where }: any) => {
    if (where?.and) {
      const docs = mockUsers.filter((u) => {
        for (const cond of where.and) {
          if (cond.email?.equals && u.email !== cond.email.equals) return false;
          if (cond.emailToken?.equals && u.emailToken !== cond.emailToken.equals) return false;
          if (cond.emailVerified?.equals !== undefined && u.emailVerified !== cond.emailVerified.equals) return false;
        }
        return true;
      });
      return { docs, totalDocs: docs.length };
    }
    return { docs: [], totalDocs: 0 };
  }),
  update: vi.fn(async ({ id, data }: any) => {
    const u = mockUsers.find((x) => String(x.id) === String(id));
    if (u) Object.assign(u, data);
    return u;
  }),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
};

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn(async () => mockPayload) }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ ok: true, retryAfter: 0 })) }));
vi.mock("@/lib/app/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/app/session")>();
  return { ...actual, setSession: vi.fn(async () => {}) };
});
vi.mock("@/lib/app/verification", () => ({
  issueVerificationEmail: vi.fn(async () => true),
}));
vi.mock("@/lib/app/mail", () => ({
  sendMail: vi.fn(async () => true),
}));

const req = (url: string, body?: unknown) =>
  new Request(url, {
    method: body !== undefined ? "POST" : "GET",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

describe("Auth routes (signup, login, verify, resend, forgot, reset)", () => {
  beforeEach(() => {
    mockUsers.length = 0;
    vi.clearAllMocks();
  });

  it("signup creates user with overrideAccess: true, issues verification email, and sets session", async () => {
    mockPayload.login.mockResolvedValueOnce({
      token: "jwt-123",
      exp: 9999999999,
      user: { id: "u-1", email: "new@example.com", name: "New", emailVerified: false },
    });
    const res = await signupPOST(
      req("http://localhost/api/app/auth/signup", {
        email: "New@Example.com",
        password: "Password123!",
        name: "New",
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user).toEqual({ id: "u-1", email: "new@example.com", name: "New", emailVerified: false });
    expect(data.requiresVerification).toBe(true);
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", overrideAccess: true }),
    );
    expect(issueVerificationEmail).toHaveBeenCalledWith("u-1", "new@example.com");
    expect(setSession).toHaveBeenCalledWith("jwt-123", 9999999999);
  });

  it("signup rejects duplicate email with 409 and invalid password with 400", async () => {
    mockUsers.push({ id: "u-1", email: "dup@example.com" });
    const r1 = await signupPOST(req("http://localhost/api/app/auth/signup", { email: "dup@example.com", password: "Password123!" }));
    expect(r1.status).toBe(409);
    const r2 = await signupPOST(req("http://localhost/api/app/auth/signup", { email: "ok@example.com", password: "short" }));
    expect(r2.status).toBe(400);
  });

  it("login returns emailVerified in user payload and distinguishes 401 vs 500 errors", async () => {
    mockPayload.login.mockResolvedValueOnce({
      token: "jwt-123",
      exp: 9999999999,
      user: { id: "u-1", email: "a@example.com", name: "A", emailVerified: false },
    });
    const okRes = await loginPOST(req("http://localhost/api/app/auth/login", { email: "a@example.com", password: "Password123!" }));
    expect(okRes.status).toBe(200);
    const okData = await okRes.json();
    expect(okData.user.emailVerified).toBe(false);

    const authErr = Object.assign(new Error("The email or password provided is incorrect."), { status: 401 });
    mockPayload.login.mockRejectedValueOnce(authErr);
    const badRes = await loginPOST(req("http://localhost/api/app/auth/login", { email: "a@example.com", password: "wrong" }));
    expect(badRes.status).toBe(401);

    mockPayload.login.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const errRes = await loginPOST(req("http://localhost/api/app/auth/login", { email: "a@example.com", password: "Password123!" }));
    expect(errRes.status).toBe(500);
  });

  it("resend-verification calls issueVerificationEmail only for unverified users", async () => {
    mockUsers.push({ id: "u-1", email: "unv@example.com", emailVerified: false });
    mockUsers.push({ id: "u-2", email: "ver@example.com", emailVerified: true });

    const r1 = await resendPOST(req("http://localhost/api/resend-verification", { email: "unv@example.com" }));
    expect(r1.status).toBe(200);
    expect(issueVerificationEmail).toHaveBeenCalledWith("u-1", "unv@example.com");

    vi.mocked(issueVerificationEmail).mockClear();
    const r2 = await resendPOST(req("http://localhost/api/resend-verification", { email: "ver@example.com" }));
    expect(r2.status).toBe(200);
    expect(issueVerificationEmail).not.toHaveBeenCalled();
  });

  it("verify marks user emailVerified: true and redirects to /?verified=1", async () => {
    const crypto = await import("node:crypto");
    const rawToken = "valid-token-123";
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    mockUsers.push({ id: "u-1", email: "u@example.com", emailVerified: false, emailToken: hash });

    const res = await verifyGET(req(`http://localhost/api/verify?token=${rawToken}`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/?verified=1");
    expect(mockUsers[0].emailVerified).toBe(true);
    expect(mockUsers[0].emailToken).toBeNull();
  });

  it("forgot sends reset email and reset marks emailVerified: true", async () => {
    mockPayload.forgotPassword.mockResolvedValueOnce("reset-tok");
    const fRes = await forgotPOST(req("http://localhost/api/app/auth/forgot", { email: "u@example.com" }));
    expect(fRes.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);

    mockPayload.resetPassword.mockResolvedValueOnce({
      token: "new-jwt",
      user: { id: "u-1", email: "u@example.com", name: "U", emailVerified: false },
    });
    const rRes = await resetPOST(req("http://localhost/api/app/auth/reset", { token: "reset-tok", password: "NewPassword123!" }));
    expect(rRes.status).toBe(200);
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", id: "u-1", data: { emailVerified: true }, overrideAccess: true }),
    );
  });
});
