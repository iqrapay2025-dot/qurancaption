import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  serializeAudioState,
  parseSavedAudioState,
  DEFAULT_GLOBAL_AUDIO_STATE,
} from "./saved-state";
import {
  registerAudioPlayback,
  notifyAudioPlaybackStarted,
  getCurrentAudioSource,
  _resetAudioPlaybackForTesting,
} from "./single-audio";

describe("saved-state serialization and restoration", () => {
  it("serializes and parses clean audio state correctly", () => {
    const original = {
      surah: 36,
      reciterId: 5,
      currentTime: 125.4,
      speed: 1.25 as const,
      repeatMode: "all" as const,
      volume: 0.8,
    };

    const json = serializeAudioState(original);
    const restored = parseSavedAudioState(json);

    expect(restored.surah).toBe(36);
    expect(restored.reciterId).toBe(5);
    expect(restored.currentTime).toBe(125.4);
    expect(restored.speed).toBe(1.25);
    expect(restored.repeatMode).toBe("all");
    expect(restored.volume).toBe(0.8);
  });

  it("safely handles corrupted or invalid JSON", () => {
    expect(parseSavedAudioState("")).toEqual(DEFAULT_GLOBAL_AUDIO_STATE);
    expect(parseSavedAudioState(null)).toEqual(DEFAULT_GLOBAL_AUDIO_STATE);
    expect(parseSavedAudioState("not-json {[[}")).toEqual(DEFAULT_GLOBAL_AUDIO_STATE);
    expect(parseSavedAudioState("123")).toEqual(DEFAULT_GLOBAL_AUDIO_STATE);
    expect(parseSavedAudioState("{}")).toEqual(DEFAULT_GLOBAL_AUDIO_STATE);
  });

  it("corrects out-of-bounds surah, reciter, time, and speed values", () => {
    const corruptJson = JSON.stringify({
      surah: 999,
      reciterId: -5,
      currentTime: -100,
      speed: 9.5,
      repeatMode: "invalid-mode",
      volume: 4.5,
    });

    const restored = parseSavedAudioState(corruptJson);
    expect(restored.surah).toBe(1);
    expect(restored.reciterId).toBe(1);
    expect(restored.currentTime).toBe(0);
    expect(restored.speed).toBe(1.5); // clamped to max allowed speed
    expect(restored.repeatMode).toBe("off");
    expect(restored.volume).toBe(1); // clamped to 1
  });

  it("filters against validReciterIds list if provided", () => {
    const json = serializeAudioState({ surah: 1, reciterId: 12 }); // 12 is incomplete
    const restored = parseSavedAudioState(json, new Set([1, 2, 3]));
    expect(restored.reciterId).toBe(1); // fallen back to 1
  });
});

describe("single-audio coordination", () => {
  beforeEach(() => {
    _resetAudioPlaybackForTesting();
  });

  it("pauses other audio consumers when a new consumer starts playing", () => {
    const pauseGlobal = vi.fn();
    const pauseReader = vi.fn();
    const pauseDaily = vi.fn();

    registerAudioPlayback("global", pauseGlobal);
    registerAudioPlayback("reader", pauseReader);
    registerAudioPlayback("daily", pauseDaily);

    // Global starts playing
    notifyAudioPlaybackStarted("global");
    expect(getCurrentAudioSource()).toBe("global");
    expect(pauseGlobal).not.toHaveBeenCalled();
    expect(pauseReader).toHaveBeenCalledTimes(1);
    expect(pauseDaily).toHaveBeenCalledTimes(1);

    // Reader starts playing -> pauses global
    notifyAudioPlaybackStarted("reader");
    expect(getCurrentAudioSource()).toBe("reader");
    expect(pauseGlobal).toHaveBeenCalledTimes(1);
    expect(pauseDaily).toHaveBeenCalledTimes(2);

    // Daily starts playing -> pauses reader and global
    notifyAudioPlaybackStarted("daily");
    expect(getCurrentAudioSource()).toBe("daily");
    expect(pauseGlobal).toHaveBeenCalledTimes(2);
    expect(pauseReader).toHaveBeenCalledTimes(2);
  });

  it("cleans up listener on unregister", () => {
    const pauseGlobal = vi.fn();
    const unregister = registerAudioPlayback("global", pauseGlobal);

    unregister();
    notifyAudioPlaybackStarted("reader");

    expect(pauseGlobal).not.toHaveBeenCalled();
  });
});
