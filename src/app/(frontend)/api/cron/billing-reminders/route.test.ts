import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn() }));
vi.mock("@/lib/app/mail", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/app/billing", () => ({ claimEvent: vi.fn(), releaseEvent: vi.fn() }));

const URL_ = "http://x/api/cron/billing-reminders";
const req = (auth?: string) => new Request(URL_, { headers: auth ? { authorization: auth } : {} });

let origSecret: string | undefined;
let origResend: string | undefined;

beforeEach(() => {
  origSecret = process.env.CRON_SECRET;
  origResend = process.env.RESEND_API_KEY;
  process.env.CRON_SECRET = "cron_secret_value";
  // Unset so an authorized request stops at "Email not configured" without touching Payload.
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  if (origSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = origSecret;
  if (origResend === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = origResend;
});

describe("billing-reminders cron auth", () => {
  it("returns 401 when no secret is configured, even with a matching empty/undefined token", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
    expect((await GET(req("Bearer "))).status).toBe(401);
    process.env.CRON_SECRET = "";
    expect((await GET(req("Bearer "))).status).toBe(401);
  });

  it("returns 401 when the authorization header is missing", async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 401 for a wrong token", async () => {
    expect((await GET(req("Bearer nope"))).status).toBe(401);
  });

  it("passes auth with the correct token", async () => {
    const res = await GET(req("Bearer cron_secret_value"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Email not configured");
  });
});
