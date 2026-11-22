# Background & Persistent Audio in Aayah Studio

## Architecture Overview

Aayah Studio implements a **persistent single-source audio architecture** that keeps Quran recitations playing seamlessly as users navigate across the website.

```
                  ┌────────────────────────────────────────┐
                  │          GlobalAudioProvider           │
                  │   - Owns the single <audio> element    │
                  │   - Media Session API (lock screen)    │
                  │   - Autoplay next surah / repeat modes │
                  │   - Sleep timer & speed / volume       │
                  │   - Throttled localStorage persistence │
                  └───────────────────┬────────────────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            ▼                                                  ▼
┌───────────────────────┐                          ┌───────────────────────┐
│     /listen Page      │                          │  MiniPlayer (Bottom)  │
│ (Full Featured Player)│                          │ (Non-/listen routes)  │
└───────────────────────┘                          └───────────────────────┘
```

---

## 1. Persistent Audio Lifecycle

1. **Root-Level Mounting**:
   - `GlobalAudioProvider` is mounted at the top-level frontend layout (`src/app/(frontend)/layout.tsx`) wrapping `{children}`.
   - Because Next.js retains layout state across client-side page transitions, the underlying `<audio>` element is never unmounted or reloaded when the user navigates (e.g. from `/listen` to `/quran/1`, `/guide`, `/donate`, or `/`).

2. **MiniPlayer Dock**:
   - When the user navigates away from `/listen` while an audio track is active or paused, a sticky `MiniPlayer` appears at the bottom of the viewport.
   - The mini-player provides essential controls:
     - Track and reciter info (clicking navigates back to `/listen`).
     - Progress bar with click-to-seek and touch scrubbing.
     - Play / Pause toggle.
     - Previous & Next track buttons.
     - Mute / Unmute toggle.
     - Dismiss (`X`) button that stops playback and closes the mini-player.

3. **Single-Audio Playback Rule**:
   - Coordinated by `src/lib/audio/single-audio.ts`.
   - Five audio sources are recognized: `"global"` (Listen page & MiniPlayer), `"reader"` (Quran reading page), `"daily"` (Daily Ayah card), `"practice"` (Memorization drawer), and `"editor"` (Caption video maker).
   - When any component begins audio playback (`notifyAudioPlaybackStarted(source)`), all other active audio instances are immediately paused. This ensures that users never experience overlapping audio.

---

## 2. Operating System & Browser Autoplay Policies

Browsers enforce strict security and power-management policies around audio playback. Understanding these ensures smooth audio delivery:

### iOS (Safari & WebKit)
- **User Gesture Requirement**: Safari strictly blocks programmatic `.play()` unless it originates from a direct user gesture (e.g. `click` or `touchend`). Once initiated by user touch, sequential track playback (e.g. autoplaying the next Surah via the `ended` event) is permitted.
- **Background Execution**: When iOS Safari is sent to the background or the screen locks:
  - Audio continues playing if initiated during an active user session.
  - The iOS Control Center and Lock Screen display current track artwork, Surah name, reciter name, and transport controls powered by the **Media Session API**.
  - If Safari pauses audio due to heavy memory pressure or inactivity, tapping the lock-screen Play button sends a Media Session `play` action that revives playback.

### Android (Chrome & Chromium)
- **Media Notification**: Android displays a persistent media notification with album art and seek buttons.
- **Battery Optimization**: Standard Chrome tabs in the background may be deprioritized by aggressive OEM battery managers (e.g. Xiaomi, Samsung). Adding the site to the Home Screen (PWA) circumvents background throttling.

### Installed PWA (Progressive Web App)
- Running Aayah Studio as an **Installed PWA** (`Add to Home Screen` / `Install App`):
  - Provides a dedicated standalone process separate from general browser tabs.
  - Grants higher OS lifecycle priority for background audio decoding and streaming.
  - Eliminates browser UI chrome for an immersive listening experience.

---

## 3. Media Session API Integration

Aayah Studio connects to the standard `navigator.mediaSession` API whenever audio is loaded:

- **Metadata**:
  - `title`: Surah name (e.g. `Al-Fatihah (The Opening)`) and Surah number.
  - `artist`: Reciter name (e.g. `Mishari Rashid al-Afasy`).
  - `album`: `"Aayah Studio — Holy Quran"`.
  - `artwork`: Multi-resolution brand badges (`512x512` and `192x192` PNGs).
- **Transport Action Handlers**:
  - `play`: Resumes playback.
  - `pause`: Pauses playback.
  - `previoustrack`: Skips to previous Surah.
  - `nexttrack`: Advances to next Surah.
  - `seekto`: Seeks to the specified timestamp.
  - `seekforward` / `seekbackward`: Skips ahead or backward by 10 seconds.

---

## 4. State Persistence & Crash Recovery

- **LocalStorage Sync**:
  - Key: `ayah-global-audio-v1`
  - Playback position, active surah, reciter, volume, and playback speed are stored in `localStorage`.
  - To prevent unnecessary disk writes, the playback position is **throttled to update at most once every 3 seconds** and immediately upon pause.
- **Session Restoration**:
  - When a user refreshes or reopens the browser, the last played Surah, reciter, and playback position are restored in a paused state, allowing one-click resumption.
