import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";
import { getAccount } from "@/lib/app/billing";
import { currentUser } from "@/lib/app/session";
import { getPayloadClient } from "@/lib/payload";
import { transcribeWords, AutoTimeNotConfiguredError } from "@/lib/app/auto-time/provider";
import { align } from "@/lib/app/auto-time/align";

const usageDocs: Array<{ id: string; user: string; month: string; count: number }> = [];

const mockPayload = {
  find: vi.fn(async ({ collection, where }: any) => {
    if (collection === "usage-auto-time") {
      const user = String(where.user?.equals);
      const month = where.month?.equals;
      const docs = usageDocs.filter((d) => d.user === user && d.month === month);
      return { docs, totalDocs: docs.length };
    }
    return { docs: [], totalDocs: 0 };
  }),
  update: vi.fn(async ({ collection, id, data }: any) => {
    if (collection === "usage-auto-time") {
      const doc = usageDocs.find((d) => d.id === id);
      if (doc) doc.count = data.count;
      return { id, ...data };
    }
    return { id, ...data };
  }),
  create: vi.fn(async ({ collection, data }: any) => {
    if (collection === "usage-auto-time") {
      const doc = { id: `u-${usageDocs.length + 1}`, ...data };
      usageDocs.push(doc);
      return doc;
    }
    return { id: "new", ...data };
  }),
} as any;

vi.mock("@/lib/payload", () => ({ getPayloadClient: vi.fn(() => mockPayload) }));
vi.mock("@/lib/app/billing", () => ({ getAccount: vi.fn() }));
vi.mock("@/lib/app/session", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/app/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }) }));
// Provider is exercised for real (key missing throws before any network call),
// but transcribeWords is mocked per test so no real API is hit.
vi.mock("@/lib/app/auto-time/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/app/auto-time/provider")>();
  return { ...actual, transcribeWords: vi.fn(actual.transcribeWords) };
});

const JSON_HEADERS = { origin: "http://localhost:3000" };

function fileInput(name: string, bytes: number | ArrayBuffer, type = "audio/mpeg"): File {
  const bits = typeof bytes === "number" ? new ArrayBuffer(bytes) : bytes;
  return new File([bits], name, { type });
}

function formBody(file: File, verses: unknown) {
  const form = new FormData();
  form.append("file", file);
  form.append("verses", typeof verses === "string" ? verses : JSON.stringify(verses));
  return new Request("http://localhost/api/app/auto-time", {
    method: "POST",
    body: form,
    headers: JSON_HEADERS,
  });
}

function signIn(plan: "free" | "pro" = "free") {
  vi.mocked(currentUser).mockResolvedValue({
    id: "1",
    email: "test@example.com",
    name: "Test User",
    plan,
  } as any);
  vi.mocked(getAccount).mockResolvedValue({
    plan,
    billing: { provider: null, status: plan === "pro" ? "active" : "none", proUntil: null, cancelAtPeriodEnd: false, subscriptionRef: null },
    subscriptionRef: null, customerRef: null, emailToken: null, presets: [],
  } as any);
}

beforeEach(() => {
  usageDocs.length = 0;
  vi.mocked(transcribeWords).mockReset();
  signIn("free");
  const orig = process.env.AUTO_TIME_API_KEY;
  delete process.env.AUTO_TIME_API_KEY;
  vi.mocked(transcribeWords).mockRejectedValue(new AutoTimeNotConfiguredError());
  process.env.AUTO_TIME_API_KEY = orig;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const verses = [
  { verseKey: "2:1", text: "ٱللَّهُ أَحَدٌ" },
  { verseKey: "2:2", text: "ٱللَّهُ ٱلصَّمَدُ" },
];

describe("POST /api/app/auto-time validation", () => {
  it("returns 401 when not signed in", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r.status).toBe(401);
  });

  it("returns 400 when no audio file is uploaded", async () => {
    const form = new FormData();
    form.append("verses", JSON.stringify(verses));
    const r = await POST(new Request("http://localhost/api/app/auto-time", { method: "POST", body: form, headers: JSON_HEADERS }));
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toContain("audio file");
  });

  it("returns 400 for an unsupported file type", async () => {
    const r = await POST(formBody(fileInput("notes.txt", 1000), verses));
    expect(r.status).toBe(400);
  });

  it("returns 400 for a file larger than 25 MB", async () => {
    const r = await POST(formBody(fileInput("big.mp3", 26 * 1024 * 1024), verses));
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toContain("25 MB");
  });

  it("returns 400 when verses are missing", async () => {
    const r = await POST(formBody(fileInput("a.mp3", 1000), undefined));
    expect(r.status).toBe(400);
  });

  it("returns 400 for invalid verse payloads", async () => {
    const r = await POST(formBody(fileInput("a.mp3", 1000), [{ verseKey: "", text: "" }]));
    expect(r.status).toBe(400);
  });
});

describe("POST /api/app/auto-time provider errors", () => {
  it("returns 503 when AUTO_TIME_API_KEY is missing, without a stack trace", async () => {
    const orig = process.env.AUTO_TIME_API_KEY;
    delete process.env.AUTO_TIME_API_KEY;
    try {
      vi.mocked(transcribeWords).mockReset();
      vi.mocked(transcribeWords).mockImplementation(async () => {
        throw new AutoTimeNotConfiguredError("Auto-timing is not configured");
      });
      const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
      expect(r.status).toBe(503);
      const body = await r.json();
      expect(body.error).toBe("Auto-timing is not configured");
      expect(String(body.error)).not.toContain("sk-");
    } finally {
      process.env.AUTO_TIME_API_KEY = orig;
    }
  });

  it("does not consume the allowance when the provider fails", async () => {
    vi.mocked(transcribeWords).mockRejectedValue(new Error("upstream down"));
    const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r.status).toBe(500);
    expect(mockPayload.create).not.toHaveBeenCalled();
    expect(mockPayload.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/app/auto-time success path", () => {
  const words = [
    { word: "الله", start: 0, end: 0.7 },
    { word: "احد", start: 0.7, end: 1.5 },
    { word: "الصمد", start: 1.5, end: 2.4 },
  ];

  it("transcribes, aligns, returns timings and counts the run (free user)", async () => {
    vi.mocked(transcribeWords).mockResolvedValue(words);
    const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.timings).toHaveLength(2);
    expect(body.timings[0].verseKey).toBe("2:1");
    expect(typeof body.timings[0].start).toBe("number");
    expect(typeof body.timings[0].end).toBe("number");
    expect(typeof body.timings[0].confidence).toBe("number");
    expect(mockPayload.create).toHaveBeenCalledTimes(1);
    expect(mockPayload.update).not.toHaveBeenCalled();
  });

  it("increments the existing usage doc on repeat runs", async () => {
    vi.mocked(transcribeWords).mockResolvedValue(words);
    const r1 = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r1.status).toBe(200);
    const r2 = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r2.status).toBe(200);
    expect(mockPayload.create).toHaveBeenCalledTimes(1);
    expect(mockPayload.update).toHaveBeenCalledTimes(1);
    expect(usageDocs[0].count).toBe(2);
  });

  it("blocks free users at the monthly limit with 402", async () => {
    usageDocs.push({ id: "u-1", user: "1", month: "2026-11", count: 3 });
    vi.mocked(transcribeWords).mockResolvedValue(words);
    const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
    expect(r.status).toBe(402);
    const body = await r.json();
    expect(body.code).toBe("auto_time_limit");
    expect(mockPayload.create).not.toHaveBeenCalled();
  });

  it("allows pro users up to 100 runs", async () => {
    signIn("pro");
    vi.mocked(transcribeWords).mockResolvedValue(words);
    for (let i = 0; i < 2; i++) {
      const r = await POST(formBody(fileInput("a.mp3", 1000), verses));
      expect(r.status).toBe(200);
    }
  });
});

describe("align() output shape on provider words", () => {
  it("maps provider-style words to per-verse timings via align()", () => {
    const result = align(
      [{ verseKey: "2:1", text: "ٱللَّهُ أَحَدٌ" }],
      [
        { word: "الله", start: 0, end: 0.7 },
        { word: "احد", start: 0.7, end: 1.5 },
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0].verseKey).toBe("2:1");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(1.5);
    expect(result[0].confidence).toBeGreaterThan(0);
  });
});
