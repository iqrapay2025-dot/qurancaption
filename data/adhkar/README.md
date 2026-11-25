# Aayah Studio - Authentic Adhkar & Du'as Pipeline

This directory contains the normalized authentic Adhkar and Du'as dataset powering the `/adhkar` section of Aayah Studio.

## Sourced Datasets & Authenticity Guarantee

All content is compiled exclusively from verified open Islamic repositories and hadith collections:
- **Primary Source**: [`fitrahive/dua-dhikr`](https://github.com/fitrahive/dua-dhikr) (MIT License) - contains complete Arabic tashkeel, transliterations, English translations, repeat counts, virtues, and authenticated hadith citations.
- **Hadith Evidence**: Hisn al-Muslim chapters (1, 25, 27, 28) mapped to canonical Sunnah.com references (`https://sunnah.com/hisn:{number}`).
- **Zero Runtime Dependencies**: All 106 items are stored locally in this folder. No third-party network requests occur at runtime for Adhkar text or translations.

## Dataset Structure

- `morning.json`: 19 authentic morning adhkar (recited from Fajr until sunrise).
- `evening.json`: 19 authentic evening adhkar (recited from Asr until Maghrib).
- `after-salah.json`: 13 post-prayer supplications (recited after obligatory prayers).
- `sleep.json`: 8 bedtime supplications & Ayat al-Kursi.
- `waking.json`: 3 awakenings & gratitude supplications.
- `general.json`: 44 daily supplications (entering mosque, home, travel, distress, forgiveness).
- `adhkar.json`: All 106 items combined.
- `LICENSES.md`: Explicit attribution, MIT & Open Data license text.
- `adhkar-review-report.md`: Complete audit and review log verifying 100% Arabic tashkeel, English meanings, repeat values, and source citations.

## How to Re-Run the Import Script

To re-fetch or re-normalize the dataset:

```bash
npx tsx scripts/import-adhkar.ts
```

The script will:
1. Fetch latest raw data from the upstream repository.
2. Normalize all records into the canonical `AdhkarItem` schema.
3. Validate every item for tashkeel, translation, repeat value, and hadith evidence.
4. Partition into category JSON files and write combined `adhkar.json`.
5. Update `adhkar-review-report.md`.

## Running the Verification Tests

```bash
# Run unit tests for Adhkar schema, search, scheduler, and prayer times
npx vitest run src/lib/adhkar/ src/lib/prayer-times/
```
