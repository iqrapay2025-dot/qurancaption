export type RepeatCount = number | "infinite";
export type PauseOption = "none" | 1 | 2 | 3 | "same";
export type PracticeSpeed = 0.5 | 0.75 | 1;

export interface PracticeConfig {
  fromAyah: number;
  toAyah: number;
  repeatEach: RepeatCount; // 1, 3, 5, 10, 20, 50, "infinite", or 1-999
  repeatRange: RepeatCount; // 1, 3, 5, 10, "infinite"
  pauseBetween: PauseOption; // "none", 1, 2, 3, "same"
  speed: PracticeSpeed; // 0.5, 0.75, 1
  hideText: boolean;
}

export interface PracticeState {
  currentAyah: number;
  repeatCount: number; // 1-based
  roundCount: number; // 1-based
  done: boolean;
}

export const DEFAULT_CONFIG: PracticeConfig = {
  fromAyah: 1,
  toAyah: 1,
  repeatEach: 3,
  repeatRange: 1,
  pauseBetween: "none",
  speed: 1,
  hideText: false,
};

/**
 * Validates and sanitizes config with safe fallbacks and max 20 ayahs range limit.
 */
export function validateConfig(raw?: Partial<PracticeConfig> | null, totalAyahs = 286): PracticeConfig {
  const safeTotal = Math.max(1, totalAyahs);
  let from = Number(raw?.fromAyah);
  if (!Number.isInteger(from) || from < 1) from = 1;
  if (from > safeTotal) from = safeTotal;

  let to = Number(raw?.toAyah);
  if (!Number.isInteger(to) || to < from) to = from;
  if (to > from + 19) to = from + 19; // max 20 ayahs
  if (to > safeTotal) to = safeTotal;

  let repeatEach: RepeatCount = 3;
  if (raw?.repeatEach === "infinite") {
    repeatEach = "infinite";
  } else if (raw?.repeatEach !== undefined) {
    const num = Number(raw.repeatEach);
    if (Number.isInteger(num) && num >= 1 && num <= 999) {
      repeatEach = num;
    }
  }

  let repeatRange: RepeatCount = 1;
  if (raw?.repeatRange === "infinite") {
    repeatRange = "infinite";
  } else if (raw?.repeatRange !== undefined) {
    const num = Number(raw.repeatRange);
    if (Number.isInteger(num) && num >= 1 && num <= 999) {
      repeatRange = num;
    }
  }

  let pauseBetween: PauseOption = "none";
  if (raw?.pauseBetween === "same" || raw?.pauseBetween === 1 || raw?.pauseBetween === 2 || raw?.pauseBetween === 3) {
    pauseBetween = raw.pauseBetween;
  }

  let speed: PracticeSpeed = 1;
  if (raw?.speed === 0.5 || raw?.speed === 0.75) {
    speed = raw.speed;
  }

  const hideText = Boolean(raw?.hideText);

  return {
    fromAyah: from,
    toAyah: to,
    repeatEach,
    repeatRange,
    pauseBetween,
    speed,
    hideText,
  };
}

/**
 * Creates initial practice state starting at fromAyah.
 */
export function createInitialState(config: PracticeConfig): PracticeState {
  return {
    currentAyah: config.fromAyah,
    repeatCount: 1,
    roundCount: 1,
    done: false,
  };
}

/**
 * Pure state machine: Advances practice state after an audio item finishes.
 */
export function nextStep(state: PracticeState, config: PracticeConfig): PracticeState {
  if (state.done) return state;

  // 1. Check if more repeats for current ayah
  if (config.repeatEach === "infinite") {
    return {
      ...state,
      repeatCount: state.repeatCount + 1,
      done: false,
    };
  }

  if (state.repeatCount < config.repeatEach) {
    return {
      ...state,
      repeatCount: state.repeatCount + 1,
      done: false,
    };
  }

  // 2. Current ayah completed its repeats for this round. Check next ayah in range.
  if (state.currentAyah < config.toAyah) {
    return {
      currentAyah: state.currentAyah + 1,
      repeatCount: 1,
      roundCount: state.roundCount,
      done: false,
    };
  }

  // 3. Current round finished. Check if more rounds in range.
  if (config.repeatRange === "infinite") {
    return {
      currentAyah: config.fromAyah,
      repeatCount: 1,
      roundCount: state.roundCount + 1,
      done: false,
    };
  }

  if (state.roundCount < config.repeatRange) {
    return {
      currentAyah: config.fromAyah,
      repeatCount: 1,
      roundCount: state.roundCount + 1,
      done: false,
    };
  }

  // 4. Completed all repeats and rounds
  return {
    ...state,
    done: true,
  };
}

/**
 * Calculates pause duration in milliseconds.
 * 'same' returns audioDuration in ms.
 */
export function calculatePauseMs(pauseBetween: PauseOption, audioDurationSec: number): number {
  if (pauseBetween === "none") return 0;
  if (pauseBetween === 1) return 1000;
  if (pauseBetween === 2) return 2000;
  if (pauseBetween === 3) return 3000;
  if (pauseBetween === "same") {
    return Math.max(0, Math.round(audioDurationSec * 1000));
  }
  return 0;
}
