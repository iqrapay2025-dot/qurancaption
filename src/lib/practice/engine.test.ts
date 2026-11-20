import { describe, it, expect } from "vitest";
import {
  nextStep,
  calculatePauseMs,
  validateConfig,
  createInitialState,
  type PracticeConfig,
} from "./engine";

describe("practice engine", () => {
  it("handles a single ayah repeated 3 times and then reports done", () => {
    const config: PracticeConfig = {
      fromAyah: 1,
      toAyah: 1,
      repeatEach: 3,
      repeatRange: 1,
      pauseBetween: "none",
      speed: 1,
      hideText: false,
    };

    let state = createInitialState(config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 1, roundCount: 1, done: false });

    // Step 1: finishes repeat 1, advances to repeat 2
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 2, roundCount: 1, done: false });

    // Step 2: finishes repeat 2, advances to repeat 3
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 3, roundCount: 1, done: false });

    // Step 3: finishes repeat 3, done!
    state = nextStep(state, config);
    expect(state.done).toBe(true);
    expect(state.currentAyah).toBe(1);
    expect(state.repeatCount).toBe(3);
  });

  it("handles a 2-ayah range with 2 repeats each", () => {
    const config: PracticeConfig = {
      fromAyah: 1,
      toAyah: 2,
      repeatEach: 2,
      repeatRange: 1,
      pauseBetween: "none",
      speed: 1,
      hideText: false,
    };

    let state = createInitialState(config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 1, roundCount: 1, done: false });

    // 1:1 repeat 2
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 2, roundCount: 1, done: false });

    // advances to 1:2 repeat 1
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 2, repeatCount: 1, roundCount: 1, done: false });

    // 1:2 repeat 2
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 2, repeatCount: 2, roundCount: 1, done: false });

    // finishes range round 1 -> done
    state = nextStep(state, config);
    expect(state.done).toBe(true);
  });

  it("handles a range with 2 rounds", () => {
    const config: PracticeConfig = {
      fromAyah: 1,
      toAyah: 2,
      repeatEach: 1,
      repeatRange: 2,
      pauseBetween: "none",
      speed: 1,
      hideText: false,
    };

    let state = createInitialState(config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 1, roundCount: 1, done: false });

    // Round 1, Ayah 1 -> Ayah 2
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 2, repeatCount: 1, roundCount: 1, done: false });

    // Round 1 done -> Round 2, Ayah 1
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 1, repeatCount: 1, roundCount: 2, done: false });

    // Round 2, Ayah 1 -> Ayah 2
    state = nextStep(state, config);
    expect(state).toEqual({ currentAyah: 2, repeatCount: 1, roundCount: 2, done: false });

    // Round 2 done -> done
    state = nextStep(state, config);
    expect(state.done).toBe(true);
  });

  it("infinite repeatEach never reports done", () => {
    const config: PracticeConfig = {
      fromAyah: 1,
      toAyah: 1,
      repeatEach: "infinite",
      repeatRange: 1,
      pauseBetween: "none",
      speed: 1,
      hideText: false,
    };

    let state = createInitialState(config);
    for (let i = 1; i <= 25; i++) {
      expect(state.done).toBe(false);
      expect(state.repeatCount).toBe(i);
      state = nextStep(state, config);
    }
    expect(state.done).toBe(false);
  });

  it("infinite repeatRange never reports done", () => {
    const config: PracticeConfig = {
      fromAyah: 1,
      toAyah: 2,
      repeatEach: 1,
      repeatRange: "infinite",
      pauseBetween: "none",
      speed: 1,
      hideText: false,
    };

    let state = createInitialState(config);
    for (let round = 1; round <= 5; round++) {
      expect(state.roundCount).toBe(round);
      expect(state.currentAyah).toBe(1);
      state = nextStep(state, config);
      expect(state.currentAyah).toBe(2);
      state = nextStep(state, config);
    }
    expect(state.done).toBe(false);
  });

  it("'Same as the ayah' pause equals the audio duration in milliseconds", () => {
    expect(calculatePauseMs("same", 4.5)).toBe(4500);
    expect(calculatePauseMs("same", 12.34)).toBe(12340);
    expect(calculatePauseMs("none", 4.5)).toBe(0);
    expect(calculatePauseMs(1, 4.5)).toBe(1000);
    expect(calculatePauseMs(2, 4.5)).toBe(2000);
    expect(calculatePauseMs(3, 4.5)).toBe(3000);
  });

  it("invalid configs fall back to safe defaults", () => {
    const validated = validateConfig({
      fromAyah: -10,
      toAyah: 9999,
      repeatEach: -5,
      repeatRange: 0,
      pauseBetween: "invalid" as any,
      speed: 2 as any,
    }, 7);

    expect(validated.fromAyah).toBe(1);
    expect(validated.toAyah).toBe(7); // clamped to total verses
    expect(validated.repeatEach).toBe(3); // default 3
    expect(validated.repeatRange).toBe(1); // default 1
    expect(validated.pauseBetween).toBe("none");
    expect(validated.speed).toBe(1);
    expect(validated.hideText).toBe(false);
  });

  it("enforces maximum 20 ayahs range limit", () => {
    const validated = validateConfig({
      fromAyah: 10,
      toAyah: 80,
    }, 286);

    expect(validated.fromAyah).toBe(10);
    expect(validated.toAyah).toBe(29); // 10 + 19 = 20 ayahs total
  });
});
