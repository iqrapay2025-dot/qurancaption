import { describe, it, expect } from "vitest";
import { formatBytes, estimateJsonSize, STORES, DB_VERSION } from "./db";

describe("Offline DB & Storage Helpers", () => {
  it("formats byte values accurately into B, KB, MB, GB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(4.5 * 1024 * 1024)).toBe("4.5 MB");
    expect(formatBytes(45 * 1024 * 1024)).toBe("45 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("estimates JSON size accurately", () => {
    const data = { hello: "world", count: 42 };
    const size = estimateJsonSize(data);
    expect(size).toBeGreaterThan(10);
    expect(size).toBeLessThan(100);
  });

  it("defines expected stores and database version", () => {
    expect(DB_VERSION).toBe(2);
    expect(STORES.CONTENT).toBe("surah_content");
    expect(STORES.AUDIO).toBe("surah_audio");
    expect(STORES.MUSHAF).toBe("mushaf_pages");
    expect(STORES.FULL_AUDIO).toBe("listen_audio");
  });
});
