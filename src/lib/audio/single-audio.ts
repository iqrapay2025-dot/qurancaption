export type AudioPlaybackSource = "global" | "reader" | "daily" | "practice" | "editor";

type Listener = (newSource: AudioPlaybackSource) => void;

const listeners = new Set<Listener>();
let currentSource: AudioPlaybackSource | null = null;

/**
 * Register an audio consumer (reader, daily ayah, practice, editor, or global player).
 * Whenever another audio source begins playing, `onPauseNeeded` is invoked.
 * Returns an unregister cleanup function.
 */
export function registerAudioPlayback(
  source: AudioPlaybackSource,
  onPauseNeeded: () => void
): () => void {
  const handler: Listener = (newSource) => {
    if (newSource !== source) {
      try {
        onPauseNeeded();
      } catch {}
    }
  };

  listeners.add(handler);

  return () => {
    listeners.delete(handler);
    if (currentSource === source) {
      currentSource = null;
    }
  };
}

/**
 * Notify all registered audio consumers that a particular audio source has started playback.
 * All other audio players will immediately pause to uphold the single-audio rule.
 */
export function notifyAudioPlaybackStarted(source: AudioPlaybackSource) {
  currentSource = source;
  for (const listener of Array.from(listeners)) {
    try {
      listener(source);
    } catch {}
  }
}

/**
 * Get the currently active playback source, or null if idle.
 */
export function getCurrentAudioSource(): AudioPlaybackSource | null {
  return currentSource;
}

/**
 * Reset all active audio registrations (useful for test isolation).
 */
export function _resetAudioPlaybackForTesting() {
  listeners.clear();
  currentSource = null;
}
