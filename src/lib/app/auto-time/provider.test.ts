import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  transcribeWords,
  AutoTimeNotConfiguredError,
  AutoTimeProviderError,
  TRANSCRIBE_TIMEOUT_MS,
} from "./provider";
import { align } from "@/lib/app/auto-time/align";

const makeFile = (name = "recitation.mp3", bytes = new ArrayBuffer(1000)) =>
  new File([bytes], name, { type: "audio/mpeg" });

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.AUTO_TIME_API_KEY = "sk-test-key";
  fetchMock = vi.fn() as any;
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  delete process.env.AUTO_TIME_API_KEY;
  vi.restoreAllMocks();
});

describe("transcribeWords (OpenAI Whisper)", () => {
  const words = [
    { word: "بسم", start: 0.0, end: 0.6, confidence: 0.99 },
    { word: "الله", start: 0.6, end: 1.2, confidence: 0.95 },
    { word: "احد", start: 1.2, end: 2.0 },
  ];

  it("maps OpenAI verbose_json words to { word, start, end } in seconds", async () => {
    fetchMock.mockResolvedValue(response(200, { task: "transcribe", language: "ar", duration: 5.0, words }));
    const result = await transcribeWords(makeFile());
    expect(result).toEqual([
      { word: "بسم", start: 0, end: 0.6 },
      { word: "الله", start: 0.6, end: 1.2 },
      { word: "احد", start: 1.2, end: 2.0 },
    ]);
  });

  it("sends Whisper-1 with word timestamps, Arabic language and an optional prompt as multipart", async () => {
    fetchMock.mockResolvedValue(response(200, { words: [] }));
    await transcribeWords(makeFile(), { prompt: "ٱللَّهُ أَحَدٌ" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect(init.headers?.Authorization).toBe("Bearer sk-test-key");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-1");
    expect(form.get("response_format")).toBe("verbose_json");
    expect(form.get("timestamp_granularities[]")).toBe("word");
    expect(form.get("language")).toBe("ar");
    expect(form.get("prompt")).toBe("ٱللَّهُ أَحَدٌ");
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
  });

  it("trims a long prompt", async () => {
    fetchMock.mockResolvedValue(response(200, { words: [] }));
    await transcribeWords(makeFile(), { prompt: "x".repeat(1000) });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect((form.get("prompt") as string).length).toBe(300);
  });

  it("returns 503 'Auto-timing is not configured' when AUTO_TIME_API_KEY is missing", async () => {
    delete process.env.AUTO_TIME_API_KEY;
    await expect(transcribeWords(makeFile())).rejects.toMatchObject({
      status: 503,
      name: "AutoTimeNotConfiguredError",
      message: "Auto-timing is not configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps OpenAI errors to friendly messages and never leaks the API key", async () => {
    fetchMock.mockResolvedValue(
      response(401, { error: { message: "Incorrect API key provided: sk-real-secret-value" } }),
    );
    try {
      await transcribeWords(makeFile());
    } catch (e) {
      expect(e).toBeInstanceOf(AutoTimeProviderError);
      console.log("[AUTO-TIME DEBUG] e.status:", (e as any)?.status, "e.name:", (e as any)?.name, "e.message:", (e as any)?.message);
      expect((e as AutoTimeProviderError).status).toBe(503);
      expect((e as AutoTimeProviderError).message).not.toContain("sk-");
      expect((e as AutoTimeProviderError).message).toContain("configured");
      return;
    }
    throw new Error("expected transcribeWords to throw");
  });

  it("maps service errors to 502 without raw provider text", async () => {
    fetchMock.mockResolvedValue(response(500, "internal server error"));
    try {
      await transcribeWords(makeFile());
    } catch (e) {
      expect((e as AutoTimeProviderError).status).toBe(502);
      expect((e as AutoTimeProviderError).message).not.toContain("internal server error");
      return;
    }
    throw new Error("expected transcribeWords to throw");
  });

  it("maps a timeout to a friendly 504", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const t = setTimeout(() => reject(new DOMException("Aborted", "AbortError")), TRANSCRIBE_TIMEOUT_MS);
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });
    });
    const promise = transcribeWords(makeFile());
    vi.advanceTimersByTime(TRANSCRIBE_TIMEOUT_MS);
    await expect(promise).rejects.toMatchObject({
      status: 504,
      message: "The transcription timed out. Please try a shorter recording.",
    });
    vi.useRealTimers();
  });

  it("treats an invalid JSON response as 502", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(transcribeWords(makeFile())).rejects.toMatchObject({ status: 502 });
  });
});

describe("align() mapping step", () => {
  it("maps provider words through align() to per-verse timings", () => {
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
