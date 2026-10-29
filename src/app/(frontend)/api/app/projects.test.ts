import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as projectsPost } from "./projects/route";
import { getAccount } from "@/lib/app/billing";
import { currentUser } from "@/lib/app/session";

const usageDocs: Array<{ user: string; month: string; count: number; id: string }> = [];
let projectDocCount = 0;

const mockPayload = {
  find: vi.fn(async ({ collection, where }: any) => {
    if (collection === "usage-projects") {
      const user = Number(where.user?.equals);
      const month = where.month?.equals;
      const docs = usageDocs.filter((d: any) => String(d.user) === String(user) && d.month === month);
      return { docs, totalDocs: docs.length };
    }
    return { docs: [], totalDocs: 0 };
  }),
  count: vi.fn(async ({ collection }: any) => {
    if (collection === "projects") return { totalDocs: projectDocCount };
    return { totalDocs: 0 };
  }),
  create: vi.fn(async ({ collection, data }: any) => {
    if (collection === "projects") {
      projectDocCount++;
      return { id: `p-${projectDocCount}`, ...data };
    }
    if (collection === "usage-projects") {
      const exists = usageDocs.find((d: any) => String(d.user) === String(data.user) && d.month === data.month);
      if (exists) throw new Error("duplicate");
      const doc = { id: `up-${usageDocs.length + 1}`, ...data };
      usageDocs.push(doc);
      return doc;
    }
    return { id: "new", ...data };
  }),
  update: vi.fn(async ({ collection, id, data }: any) => {
    if (collection === "usage-projects") {
      const doc = usageDocs.find((d: any) => d.id === id);
      if (doc) {
        doc.count = data.count;
      }
      return { id, ...data };
    }
    return { id, ...data };
  }),
  findByID: vi.fn(async ({ collection, id }: any) => {
    if (collection === "projects") {
      return { id, name: "Test", surah: 2, fromAyah: 1, toAyah: 5, layers: {}, translations: {}, style: {}, ratio: "9:16" };
    }
    return null;
  }),
  delete: vi.fn(async () => ({})),
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

const JSON_HEADERS = { "content-type": "application/json", "origin": "http://localhost:3000", "sec-fetch-site": "same-origin" };

function projectBody(overrides: any = {}) {
  return {
    name: "Test Project",
    surah: 2,
    fromAyah: 1,
    toAyah: 5,
    layers: { arabic: true, tr1: false, tr2: false, translit: false, verseKey: true },
    translations: { tr1: null, tr2: null },
    reciterId: null,
    style: { font: "quran", arSize: 76, trSize: 38, color: "#ffffff", shadow: true, bg: "transparent", solid: "#1a2547", align: "center", pos: "middle", leading: 1.9, platform: "", guide: false, hlColor: "#fcd34d", tajweed: false, wordHl: true },
    ratio: "9:16",
    ...overrides,
  };
}

beforeEach(() => {
  usageDocs.length = 0;
  projectDocCount = 0;
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

describe("projects route - monthly creation limits (free users)", () => {
  it("allows creating projects up to monthly limit of 10", async () => {
    freeAccount();
    for (let i = 0; i < 10; i++) {
      const r = await projectsPost(new Request("http://localhost/api/app/projects", {
        method: "POST",
        body: JSON.stringify(projectBody()),
        headers: { ...JSON_HEADERS, "x-user-id": "1" },
      }));
      expect(r.status).toBe(201);
      // Reset saved-project count to simulate deletion (only monthly counter matters)
      projectDocCount = 0;
    }
  });

  it("11th project creation returns 402 monthly_project_limit", async () => {
    freeAccount();
    for (let i = 0; i < 10; i++) {
      const r = await projectsPost(new Request("http://localhost/api/app/projects", {
        method: "POST",
        body: JSON.stringify(projectBody()),
        headers: { ...JSON_HEADERS, "x-user-id": "1" },
      }));
      expect(r.status).toBe(201);
      projectDocCount = 0;
    }
    const r = await projectsPost(new Request("http://localhost/api/app/projects", {
      method: "POST",
      body: JSON.stringify(projectBody()),
      headers: { ...JSON_HEADERS, "x-user-id": "1" },
    }));
    expect(r.status).toBe(402);
    const body = await r.json();
    expect(body.code).toBe("monthly_project_limit");
  });

  it("Pro users are not limited by monthly project creations", async () => {
    proAccount();
    for (let i = 0; i < 15; i++) {
      const r = await projectsPost(new Request("http://localhost/api/app/projects", {
        method: "POST",
        body: JSON.stringify(projectBody()),
        headers: { ...JSON_HEADERS, "x-user-id": "1" },
      }));
      expect(r.status).toBe(201);
    }
  });

  it("deleting a project does not reset monthly creation count", async () => {
    freeAccount();
    for (let i = 0; i < 5; i++) {
      const r = await projectsPost(new Request("http://localhost/api/app/projects", {
        method: "POST",
        body: JSON.stringify(projectBody()),
        headers: { ...JSON_HEADERS, "x-user-id": "1" },
      }));
      expect(r.status).toBe(201);
      projectDocCount = 0;
    }
    expect(usageDocs.length).toBe(1);
    expect(usageDocs[0].count).toBe(5);
  });
});
