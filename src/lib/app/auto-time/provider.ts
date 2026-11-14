import "server-only";

// OpenAI Whisper adapter for auto-timing. All OpenAI-specific code lives here
// so the provider can be swapped out later.

export type WordTiming = { word: string; start: number; end: number };

export type TranscribeOptions = {
  // Optional biasing text (e.g. the first verse's Arabic), kept short.
  prompt?: string;
};

const ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
// Whisper-1 only supports word timestamps; keep the timeout below the
// route's maxDuration (120 s) so the function can return a clean error.
export const TRANSCRIBE_TIMEOUT_MS = 120_000;

export class AutoTimeProviderError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AutoTimeProviderError";
    this.status = status;
  }
}

export class AutoTimeNotConfiguredError extends AutoTimeProviderError {
  constructor(message = "Auto-timing is not configured") {
    super(503, message);
    this.name = "AutoTimeNotConfiguredError";
  }
}

function friendlyOpenAIError(status: number, body: string): { status: number; message: string } {
  let message = "The transcription service returned an error.";
  let statusCode = status >= 500 ? 502 : 400;
  try {
    const json = JSON.parse(body);
    const msg = json?.error?.message;
    if (typeof msg === "string" && msg) message = msg;
  } catch {}
  if (status === 401 || status === 403) {
    return { status: 503, message: "Auto-timing is not configured correctly." };
  }
  if (status === 429) {
    return { status: 429, message: "The transcription service is rate-limited. Please try again shortly." };
  }
  if (status === 413 || status === 422) {
    return { status: 400, message: "That audio file could not be transcribed. Try a shorter mp3, m4a or wav file." };
  }
  return { status: statusCode, message };
}

/**
 * Transcribes an audio file with OpenAI Whisper and returns word timings in seconds.
 * Throws AutoTimeProviderError (or AutoTimeNotConfiguredError) on failure; the
 * caller is responsible for turning those into HTTP responses. The API key is
 * never returned to the client.
 */
export async function transcribeWords(file: File, options: TranscribeOptions = {}): Promise<WordTiming[]> {
  const apiKey = process.env.AUTO_TIME_API_KEY;
  if (!apiKey) {
    throw new AutoTimeNotConfiguredError("Auto-timing is not configured");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("language", "ar");
  if (options.prompt) form.append("prompt", options.prompt.slice(0, 300));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const fe = friendlyOpenAIError(res.status, text);
      throw new AutoTimeProviderError(fe.status, fe.message);
    }
    let json: { words?: unknown };
    try {
      json = JSON.parse(text);
    } catch {
      throw new AutoTimeProviderError(502, "The transcription service returned an invalid response.");
    }
    const words = Array.isArray(json.words) ? json.words : [];
    return words.map((w) => {
      const r = w as Record<string, unknown> | null;
      return {
        word: r && typeof r.word === "string" ? r.word : "",
        start: Number(r?.start) || 0,
        end: Number(r?.end) || 0,
      };
    });
  } catch (e) {
    if (e instanceof AutoTimeProviderError) throw e;
    if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) {
      throw new AutoTimeProviderError(504, "The transcription timed out. Please try a shorter recording.");
    }
    throw new AutoTimeProviderError(502, "The transcription service is unavailable right now.");
  } finally {
    clearTimeout(timer);
  }
}
