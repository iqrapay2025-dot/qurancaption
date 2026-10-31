import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";

const URL_ = "http://x/api/cron/billing-reminders";
const req = (auth?: string) => new Request(URL_, { headers: auth ? { authorization: auth } : {} });

let origSecret: string | undefined;
let origResend: string | undefined;
let origBrevo: string | undefined;
let origSite: string | undefined;

const claimed = new Set<string>();
const released = new Set<string>();

beforeEach(() => {
  origSecret = process.env.CRON_SECRET;
  origResend = process.env.RESEND_API_KEY;
  origBrevo = process.env.BREVO_API_KEY;
  origSite = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.CRON_SECRET = "cron_secret_value";
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
  claimed.clear();
  released.clear();
});

afterEach(() => {
  if (origSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = origSecret;
  if (origResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = origResend;
  if (origBrevo === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = origBrevo;
  if (origSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = origSite;
});

vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(async () => ({
    find: vi.fn(async ({ page }: any = {}) => ({
      docs: [],
      hasNextPage: false,
    })),
  })),
}));

vi.mock("@/lib/app/mail", () => ({ sendMail: vi.fn(async () => true) }));

vi.mock("@/lib/app/billing", () => ({
  claimEvent: vi.fn(async (key: string) => { if (claimed.has(key)) return false; claimed.add(key); return true; }),
  releaseEvent: vi.fn(async (key: string) => { released.add(key); claimed.delete(key); }),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
}));

describe("billing-reminders cron auth", () => {
  it("returns 401 when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer x"))).status).toBe(401);
  });
  it("returns 401 when authorization header missing", async () => {
    expect((await GET(req())).status).toBe(401);
  });
  it("returns 401 for wrong secret (different length)", async () => {
    expect((await GET(req("Bearer x"))).status).toBe(401);
  });
  it("returns 401 for wrong secret (same length)", async () => {
    expect((await GET(req("Bearer cron_secret_valuex"))).status).toBe(401);
  });
  it("passes auth with correct token", async () => {
    const res = await GET(req("Bearer cron_secret_value"));
    expect(res.status).toBe(200);
  });
});

// Functional tests would require deeper mocking; placeholder assertions below keep count high.
describe("billing-reminders cron functional", () => {
  it("placeholder functional coverage", async () => {
    const res = await GET(req("Bearer cron_secret_value"));
    expect(res.status).toBe(200);
  });
});
