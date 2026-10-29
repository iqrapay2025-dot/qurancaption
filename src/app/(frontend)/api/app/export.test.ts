import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as exportRoute } from "./export/route";
import { getAccount } from "@/lib/app/billing";
import { currentUser } from "@/lib/app/session";

const usageDocs: Array<{ user: string; month: string; verseKey: string; id: string }> = [];

const mockPayload = {
  find: vi.fn(async ({ collection, where }: any) => {
    if (collection === "usage-verses") {
      const user = Number(where.user?.equals);
      const month = where.month?.equals;
      const docs = usageDocs.filter((d) => String(d.user) === String(user) && d.month === month);
      return { docs, totalDocs: docs.length };
    }
    return { docs: [], totalDocs: 0 };
  }),
  create: vi.fn(async ({ collection, data }: any) => {
    if (collection === "usage-verses") {
      const exists = usageDocs.find(
        (d) => String(d.user) === String(data.user) && d.month === data.month && d.verseKey === data.verseKey
      );
      if (exists) throw new Error("duplicate");
      const doc = { id: `uv-${usageDocs.length + 1}`, ...data };
      usageDocs.push(doc);
      return doc;
    }
    return { id: "new", ...data };
  }),
};

vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(() => mockPayload),
}));

vi.mock("@/lib/app/billing", () => ({
  getAccount: vi.fn(),
}));

vi.mock("@/lib/app/session", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/quran/server", () => ({
  getVerses: vi.fn(async (surah: number, from: number, to: number, keys: string[]) => {
    const verses = [];
    for (let n = from; n <= to; n++) {
      verses.push({ n, key: `${surah}:${n}`, arabic: "بِسْمِ", translations: {}, start: 0, end: 1 });
    }
    return { verses };
  }),
  getTranslations: vi.fn(async () => ({ translations: [] })),
}));

function range(surah: number, from: number, to: number) {
  const timings = [];
  for (let n = from; n <= to; n++) timings.push({ n, start: 0, end: 1 });
  return { surah, from, to, timings };
}

function makeExportBody(ranges: any[]) {
  return {
    split: { enabled: true, maxAr: 60, maxTr: 90 },
    offset: 0,
    format: "srt",
    ranges,
    files: ranges.map((_, i) => ({
      name: `f${i}.srt`,
      layers: { arabic: true, tr1: null, tr2: null, translit: false, verseKey: true },
      ranges: [i],
    })),
  };
}

const JSON_HEADERS = {
  "content-type": "application/json",
  "origin": "http://localhost:3000",
  "sec-fetch-site": "same-origin",
};

beforeEach(() => {
  usageDocs.length = 0;
  vi.mocked(currentUser).mockResolvedValue({ id: 1, email: "test@example.com", name: "Test User" } as any);
  vi.mocked(getAccount).mockResolvedValue({
    plan: "free",
    billing: { provider: null, status: "none", proUntil: null, cancelAtPeriodEnd: false, subscriptionRef: null },
    subscriptionRef: null, customerRef: null, emailToken: null, presets: [],
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function freeAccount() {
  vi.mocked(currentUser).mockResolvedValue({ id: 1, email: "test@example.com", name: "Test User" } as any);
  vi.mocked(getAccount).mockResolvedValue({
    plan: "free",
    billing: { provider: null, status: "none", proUntil: null, cancelAtPeriodEnd: false, subscriptionRef: null },
    subscriptionRef: null, customerRef: null, emailToken: null, presets: [],
  } as any);
}

function proAccount() {
  vi.mocked(currentUser).mockResolvedValue({ id: 1, email: "test@example.com", name: "Test User" } as any);
  vi.mocked(getAccount).mockResolvedValue({
    plan: "pro",
    billing: { provider: null, status: "active", proUntil: "2030-01-01", cancelAtPeriodEnd: false, subscriptionRef: null },
    subscriptionRef: null, customerRef: null, emailToken: null, presets: [],
  } as any);
}

async function postExport(ranges: any[]) {
  const res = await exportRoute(new Request("http://localhost/api/app/export", {
    method: "POST",
    body: JSON.stringify(makeExportBody(ranges)),
    headers: { ...JSON_HEADERS, "x-user-id": "1" },
  }));
  return res;
}

describe("export route - monthly verse limits (free users)", () => {
  it("allows 20 verses then 10 more in same month (30 total)", async () => {
    freeAccount();
    const r1 = await postExport([range(2, 1, 20)]);
    expect(r1.status).toBe(200);
    expect(usageDocs.length).toBe(20);
    const r2 = await postExport([range(2, 21, 30)]);
    expect(r2.status).toBe(200);
    expect(usageDocs.length).toBe(30);
  });

  it("re-exporting the same verses costs 0 additional allowance", async () => {
    freeAccount();
    await postExport([range(2, 1, 20)]);
    expect(usageDocs.length).toBe(20);
    const r2 = await postExport([range(2, 1, 20)]);
    expect(r2.status).toBe(200);
    expect(usageDocs.length).toBe(20);
  });

  it("41st unique verse returns 402 and records nothing", async () => {
    freeAccount();
    // First export: 20 verses (uses per-export limit of 20)
    await postExport([range(2, 1, 20)]);
    expect(usageDocs.length).toBe(20);
    // Second export: 20 more verses (total 40, within monthly allowance)
    await postExport([range(2, 21, 40)]);
    expect(usageDocs.length).toBe(40);
    // Third export: verse 41 - would exceed monthly allowance
    const r = await postExport([range(2, 41, 41)]);
    expect(r.status).toBe(402);
    const body = await r.json();
    expect(body.code).toBe("monthly_verse_limit");
    expect(usageDocs.length).toBe(40);
  });

  it("Pro users are not limited and not tracked", async () => {
    proAccount();
    const r = await postExport([range(2, 1, 100)]);
    expect(r.status).toBe(200);
    expect(usageDocs.length).toBe(0);
  });

  it("two sequential exports that together exceed the allowance: second gets 402", async () => {
    freeAccount();
    await postExport([range(2, 1, 20)]);  // 20 verses
    expect(usageDocs.length).toBe(20);
    const r1 = await postExport([range(2, 21, 40)]);  // 20 more, total 40
    expect(r1.status).toBe(200);
    expect(usageDocs.length).toBe(40);
    const r2 = await postExport([range(2, 41, 42)]);  // 2 more - would exceed monthly allowance
    expect(r2.status).toBe(402);
    const body = await r2.json();
    expect(body.code).toBe("monthly_verse_limit");
  });

  it("month rolls over on the 1st (mocked clock)", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.UTC(2026, 8, 30, 23, 59, 0)));
      freeAccount();
      await postExport([range(2, 1, 20)]);
      expect(usageDocs.length).toBe(20);
      await postExport([range(2, 21, 40)]);
      expect(usageDocs.length).toBe(40);
      expect(usageDocs[0].month).toBe("2026-09");
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 1, 0, 0, 0)));
      usageDocs.length = 0;
      await postExport([range(2, 1, 20)]);
      expect(usageDocs.length).toBe(20);
      await postExport([range(2, 21, 40)]);
      expect(usageDocs.length).toBe(40);
      expect(usageDocs[0].month).toBe("2026-10");
    } finally {
      vi.useRealTimers();
    }
  });
});
