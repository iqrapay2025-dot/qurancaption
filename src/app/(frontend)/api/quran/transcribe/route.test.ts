import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("API /api/quran/transcribe", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 400 when no audio is sent", async () => {
    const fd = new FormData();
    const req = new NextRequest("http://localhost:3000/api/quran/transcribe", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("NO_AUDIO");
  });

  it("returns 503 MISSING_API_KEY when neither HF_TOKEN nor OPENAI_API_KEY is configured", async () => {
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const fd = new FormData();
    const dummyBlob = new Blob(["test-audio-data"], { type: "audio/webm" });
    fd.append("audio", dummyBlob, "recitation.webm");

    const req = new NextRequest("http://localhost:3000/api/quran/transcribe", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("MISSING_API_KEY");
    expect(data.message).toContain("HF_TOKEN");
  });
});
