import { clampSpeed, type PlaybackSpeed, type RepeatMode } from "@/lib/listen/player";

export interface SavedGlobalAudioState {
  surah: number;
  reciterId: number;
  currentTime: number;
  speed: PlaybackSpeed;
  repeatMode: RepeatMode;
  volume: number;
}

export const GLOBAL_AUDIO_STORAGE_KEY = "qcs-global-audio-state";

export const DEFAULT_GLOBAL_AUDIO_STATE: SavedGlobalAudioState = {
  surah: 1,
  reciterId: 1,
  currentTime: 0,
  speed: 1,
  repeatMode: "off",
  volume: 1,
};

export function serializeAudioState(state: Partial<SavedGlobalAudioState>): string {
  const safeSurah =
    typeof state.surah === "number" && Number.isInteger(state.surah) && state.surah >= 1 && state.surah <= 114
      ? state.surah
      : 1;

  const safeReciter =
    typeof state.reciterId === "number" && Number.isInteger(state.reciterId) && state.reciterId > 0
      ? state.reciterId
      : 1;

  const safeTime =
    typeof state.currentTime === "number" && Number.isFinite(state.currentTime) && state.currentTime >= 0
      ? Math.round(state.currentTime * 10) / 10
      : 0;

  const safeSpeed = clampSpeed(state.speed);

  const safeRepeat: RepeatMode =
    state.repeatMode === "surah" || state.repeatMode === "all" || state.repeatMode === "off"
      ? state.repeatMode
      : "off";

  const safeVolume =
    typeof state.volume === "number" && Number.isFinite(state.volume)
      ? Math.min(1, Math.max(0, state.volume))
      : 1;

  return JSON.stringify({
    surah: safeSurah,
    reciterId: safeReciter,
    currentTime: safeTime,
    speed: safeSpeed,
    repeatMode: safeRepeat,
    volume: safeVolume,
  });
}

export function parseSavedAudioState(
  raw: string | null | undefined,
  validReciterIds?: Set<number> | number[]
): SavedGlobalAudioState {
  if (!raw || typeof raw !== "string") {
    return { ...DEFAULT_GLOBAL_AUDIO_STATE };
  }

  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return { ...DEFAULT_GLOBAL_AUDIO_STATE };
    }

    const surahNum = Number(data.surah);
    const surah =
      Number.isInteger(surahNum) && surahNum >= 1 && surahNum <= 114
        ? surahNum
        : DEFAULT_GLOBAL_AUDIO_STATE.surah;

    const reciterNum = Number(data.reciterId);
    let reciterId =
      Number.isInteger(reciterNum) && reciterNum > 0
        ? reciterNum
        : DEFAULT_GLOBAL_AUDIO_STATE.reciterId;

    if (validReciterIds) {
      const validSet = validReciterIds instanceof Set ? validReciterIds : new Set(validReciterIds);
      if (!validSet.has(reciterId)) {
        reciterId = DEFAULT_GLOBAL_AUDIO_STATE.reciterId;
      }
    }

    const timeNum = Number(data.currentTime);
    const currentTime =
      Number.isFinite(timeNum) && timeNum >= 0 ? timeNum : 0;

    const speed = clampSpeed(data.speed);

    const repeatMode: RepeatMode =
      data.repeatMode === "surah" || data.repeatMode === "all" || data.repeatMode === "off"
        ? data.repeatMode
        : "off";

    const volNum = Number(data.volume);
    const volume =
      Number.isFinite(volNum) ? Math.min(1, Math.max(0, volNum)) : 1;

    return {
      surah,
      reciterId,
      currentTime,
      speed,
      repeatMode,
      volume,
    };
  } catch {
    return { ...DEFAULT_GLOBAL_AUDIO_STATE };
  }
}
