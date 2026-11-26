# OpenDua Adhkar Audio Integration Guide

This guide explains how OpenDua audio is integrated into Aayah Studio, how strict exact-matching works, and how to re-run the match when OpenDua releases a new dataset or audio version.

---

## 1. Overview & Provenance

- **Data Source:** [OpenDua](https://opendua.org)
- **Pinned Dataset Version:** `v0.0.4` ([catalogue.json](https://opendua.org/v0.0.4/catalogue.json))
- **Pinned Audio Version:** `v0.0.2` ([Audio catalogue](https://audio.opendua.org/hisn/v0.0.2/))
- **Licence (Data):** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://opendua.hdfund.org/licence/data)
- **Licence (Audio):** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://opendua.hdfund.org/licence/audio)
- **Reciter:** Muhammad Jumah for OpenDua
- **Zero Runtime API Dependency:** All audio files are hosted locally as static MP3 files under `public/audio/opendua/` with long cache headers (`max-age=31536000, immutable`).

---

## 2. Strict Exact-Match Algorithm

To preserve 100% theological accuracy, audio is attached **only on an exact normalized match**. No audio is ever guessed or attached to near-matches.

### Normalization Pipeline:
1. Strips all Arabic diacritics/tashkeel (`[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]`).
2. Strips tatweel/kashida (`\u0640`).
3. Unifies alef forms (`[إأآٱ]` &rarr; `ا`).
4. Unifies Yeh variants (`[ىئ]` &rarr; `ي`).
5. Strips all punctuation marks and digits.
6. Collapses all multiple spaces into a single space and trims.

### Fallbacks & Safety:
- **Exact Match:** `audioUrl` (local static MP3), `audioDuration`, and `openduaId` are populated.
- **Quranic Adhkar:** Ayat al-Kursi (2:255), Al-Ikhlas (112), Al-Falaq (113), An-Nas (114), and Al-Baqarah (2:285–286) fallback to the user's selected Quran reciter and are clearly labeled `"Quran audio"`.
- **Near-Matches:** Unmatched items have their candidate matches and specific word/letter diffs logged to `audio-match-report.md`. Their audio remains empty until verified by a reviewer.
- **Custom Items:** Du'as not in *Hisn al-Muslim* are catalogued as custom items with no audio.
- **Existing User Data:** Arabic text, item IDs, categories, repeat counts, streaks, counters, and completions are never modified.

---

## 3. How to Re-Run the Match for Future OpenDua Releases

When OpenDua releases a new dataset version (e.g. `v0.0.5`) or new audio recordings:

### Step 1: Update the Version URLs
Open `scripts/import-opendua.ts` and update the pinned URLs:
```ts
const OPENDUA_CATALOGUE_URL = "https://opendua.org/v0.0.5/catalogue.json";
const OPENDUA_AUDIO_BASE_URL = "https://audio.opendua.org/hisn/v0.0.3/";
```

### Step 2: Run the One-Time Import Script
Run the automated script using `tsx`:
```bash
npx tsx scripts/import-opendua.ts
```

The script will:
1. Download the new catalogue to `data/opendua/catalogue-<version>.json`.
2. Normalize all Arabic entries in our adhkar and OpenDua.
3. Strict-match each item.
4. Download only the newly matched MP3 audio files into `public/audio/opendua/`.
5. Update `data/adhkar/*.json` with `audioUrl`, `audioDuration`, and `openduaId`.
6. Generate a comprehensive `audio-match-report.md` with category coverage tables and word diffs for review.

### Step 3: Inspect Coverage & Review Candidate Diffs
Open `audio-match-report.md`. Check that Morning and Evening coverage meets or exceeds current figures (78.9% and 73.7%).

### Step 4: Run Tests
Run the automated test suite to confirm data integrity and audio settings:
```bash
npm test -- --run src/lib/adhkar
```

---

## 4. Offline Storage (IndexedDB Architecture)

- **Database:** `ayah_studio_offline_v1` (Version 4)
- **Object Store:** `adhkar_audio` (keyed by `url`, indexed by `category`)
- **Download for Offline:** Available per category on `/adhkar/[category]` with clear download size estimates (e.g. Morning: 3.4 MB, Evening: 2.4 MB) and recommendation to use Wi-Fi.
- **Preloading:** The next item's audio is preloaded in the background **only** on unmetered/Wi-Fi connections, and respects `navigator.connection.saveData`.

---

## 5. Required Attribution (CC BY 4.0)

Per Creative Commons Attribution 4.0 International:
- **Audio Credit:** "Recitation by Muhammad Jumah for OpenDua, CC BY 4.0 ([License Details](https://opendua.hdfund.org/licence/audio))."
- **Text Match Note:** "Audio is matched to the text only where the Arabic is identical. Where Quran ayah audio is used, recitation is by the user's selected reciter."
- **Disclaimer:** "This integration does not imply endorsement by OpenDua, Ihsan Labs, or the Human Development Fund."
