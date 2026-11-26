import fs from "fs";
import path from "path";

// Normalization according to Milestone 1 instructions:
// (remove tashkeel, tatweel, punctuation and extra spaces; unify alef and yeh variants)
export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    // 1. Remove tashkeel / harakat & Quranic annotation marks
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    // 2. Remove tatweel / kashida
    .replace(/\u0640/g, "")
    // 3. Remove punctuation
    .replace(/[،؛؟.«»"'\(\)\[\]\{\}*-_/:!—–]/g, " ")
    .replace(/[\u0660-\u06690-9\u06DD]/g, " ") // digits
    // 4. Unify alef variants: إ, أ, آ, ٱ -> ا
    .replace(/[إأآٱ]/g, "ا")
    // 5. Unify yeh variants: ى, ئ -> ي
    .replace(/[ىئ]/g, "ي")
    // 6. Whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export function wordSimilarity(s1: string, s2: string): number {
  const w1 = new Set(s1.split(" ").filter((w) => w.length > 2));
  const w2 = new Set(s2.split(" ").filter((w) => w.length > 2));
  if (w1.size === 0 || w2.size === 0) return 0;
  let inter = 0;
  for (const w of w1) if (w2.has(w)) inter++;
  return (2 * inter) / (w1.size + w2.size);
}

// Known Quranic adhkar mappings
export const QURANIC_ADHKAR: Record<
  string,
  { verses: string[]; surahName: string; label: string }
> = {
  "morning-1": {
    verses: ["2:255"],
    surahName: "Al-Baqarah: 255 (Ayat al-Kursi)",
    label: "Quran audio",
  },
  "morning-2": {
    verses: ["112:1", "112:2", "112:3", "112:4"],
    surahName: "Surah Al-Ikhlas (112:1–4)",
    label: "Quran audio",
  },
  "morning-3": {
    verses: ["113:1", "113:2", "113:3", "113:4", "113:5"],
    surahName: "Surah Al-Falaq (113:1–5)",
    label: "Quran audio",
  },
  "morning-4": {
    verses: ["114:1", "114:2", "114:3", "114:4", "114:5", "114:6"],
    surahName: "Surah An-Nas (114:1–6)",
    label: "Quran audio",
  },
  "evening-1": {
    verses: ["2:255"],
    surahName: "Al-Baqarah: 255 (Ayat al-Kursi)",
    label: "Quran audio",
  },
  "evening-2": {
    verses: ["112:1", "112:2", "112:3", "112:4"],
    surahName: "Surah Al-Ikhlas (112:1–4)",
    label: "Quran audio",
  },
  "evening-3": {
    verses: ["113:1", "113:2", "113:3", "113:4", "113:5"],
    surahName: "Surah Al-Falaq (113:1–5)",
    label: "Quran audio",
  },
  "evening-4": {
    verses: ["114:1", "114:2", "114:3", "114:4", "114:5", "114:6"],
    surahName: "Surah An-Nas (114:1–6)",
    label: "Quran audio",
  },
  "evening-6": {
    verses: ["2:285", "2:286"],
    surahName: "Al-Baqarah: 285–286",
    label: "Quran audio",
  },
  "sleep-1": {
    verses: ["2:255"],
    surahName: "Al-Baqarah: 255 (Ayat al-Kursi)",
    label: "Quran audio",
  },
  "sleep-2": {
    verses: ["2:285", "2:286"],
    surahName: "Al-Baqarah: 285–286",
    label: "Quran audio",
  },
  "sleep-3": {
    verses: [
      "112:1", "112:2", "112:3", "112:4",
      "113:1", "113:2", "113:3", "113:4", "113:5",
      "114:1", "114:2", "114:3", "114:4", "114:5", "114:6",
    ],
    surahName: "Al-Mu'awwidhat (Surah 112, 113, 114)",
    label: "Quran audio",
  },
  "after-salah-6": {
    verses: ["2:255"],
    surahName: "Al-Baqarah: 255 (Ayat al-Kursi)",
    label: "Quran audio",
  },
  "after-salah-7": {
    verses: [
      "112:1", "112:2", "112:3", "112:4",
      "113:1", "113:2", "113:3", "113:4", "113:5",
      "114:1", "114:2", "114:3", "114:4", "114:5", "114:6",
    ],
    surahName: "Al-Mu'awwidhat (Surah 112, 113, 114)",
    label: "Quran audio",
  },
};

// Custom items not in Hisn al-Muslim
export const CUSTOM_ITEMS_NO_HISN: Record<string, string> = {
  "general-40": "Daily Du'a from Quran / General traditional supplication",
  "general-41": "Daily Du'a from Quran / General traditional supplication",
  "general-44": "Du'a for Parents (Quran 17:24)",
};

interface OpenDuaCatalogueEntry {
  entryId: string;
  variationId: string;
  duaId: string;
  slug: string;
  title: string;
  chapterId: string;
  sourceReference: string;
  arabic: string;
  normArabic: string;
  audioUrl: string | null;
  audioDuration: number | null;
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  if (fs.existsSync(destPath)) {
    return true; // Already downloaded
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err);
    return false;
  }
}

async function run() {
  console.log("=== STEP 1: Fetch OpenDua Catalogue (Pinned v0.0.4) ===");
  fs.mkdirSync("data/opendua", { recursive: true });
  fs.mkdirSync("public/audio/opendua", { recursive: true });

  const cataloguePath = "data/opendua/catalogue-v0.0.4.json";
  let catalogue: any;
  if (fs.existsSync(cataloguePath)) {
    catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
  } else {
    console.log("Downloading catalogue from https://opendua.org/v0.0.4/catalogue.json ...");
    const res = await fetch("https://opendua.org/v0.0.4/catalogue.json");
    catalogue = await res.json();
    fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2));
  }

  // Parse OpenDua items
  const openduaItems: OpenDuaCatalogueEntry[] = [];
  for (const entry of catalogue.entries) {
    for (const v of entry.variations || []) {
      for (const step of v.steps || []) {
        const recording = step.recordings?.[0];
        for (const item of step.items || []) {
          if (item.dua) {
            openduaItems.push({
              entryId: entry.id,
              variationId: v.id,
              duaId: item.dua.id,
              slug: entry.slug,
              title: entry.title,
              chapterId: entry.chapterId,
              sourceReference: entry.sourceReference,
              arabic: item.dua.arabic,
              normArabic: normalizeArabic(item.dua.arabic),
              audioUrl: recording?.url || null,
              audioDuration: recording?.durationSeconds || null,
            });
          }
        }
      }
    }
  }

  console.log(`Parsed ${openduaItems.length} OpenDua text items.`);
  console.log(
    `Items with audio: ${openduaItems.filter((i) => i.audioUrl).length}`
  );

  console.log("\n=== STEP 2: Match Existing Adhkar Dataset (106 Items) ===");
  const allAdhkar = JSON.parse(fs.readFileSync("data/adhkar/adhkar.json", "utf8"));

  const matchedItems: any[] = [];
  const unmatchedReportItems: any[] = [];
  const quranAudioItems: any[] = [];
  const customItems: any[] = [];

  const categoryStats: Record<
    string,
    {
      total: number;
      matchedAudio: number;
      quranAudio: number;
      unmatched: number;
      customNoAudio: number;
    }
  > = {
    morning: { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
    evening: { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
    "after-salah": { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
    sleep: { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
    waking: { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
    general: { total: 0, matchedAudio: 0, quranAudio: 0, unmatched: 0, customNoAudio: 0 },
  };

  const updatedAdhkar = [];

  for (const item of allAdhkar) {
    categoryStats[item.category].total++;
    const updated = { ...item };

    // 1. Check if Quranic
    if (QURANIC_ADHKAR[item.id]) {
      const qMeta = QURANIC_ADHKAR[item.id];
      updated.quranAudio = {
        verses: qMeta.verses,
        label: "Quran audio",
      };
      // Keep audioUrl empty as per instructions: Quran audio is handled by Quran reciter audio
      delete updated.audioUrl;
      delete updated.audioDuration;
      delete updated.openduaId;

      categoryStats[item.category].quranAudio++;
      quranAudioItems.push({ item, qMeta });
      updatedAdhkar.push(updated);
      continue;
    }

    // 2. Exact match check
    const norm = normalizeArabic(item.arabic);
    const exact = openduaItems.find((od) => od.normArabic === norm);

    if (exact && exact.audioUrl) {
      // Matched with OpenDua audio
      const filename = path.basename(exact.audioUrl);
      const localPath = path.join("public/audio/opendua", filename);
      const publicUrl = `/audio/opendua/${filename}`;

      console.log(`Downloading audio for [${item.id}] ${filename}...`);
      await downloadFile(exact.audioUrl, localPath);

      updated.audioUrl = publicUrl;
      updated.audioDuration = exact.audioDuration || 0;
      updated.openduaId = exact.entryId;
      delete updated.quranAudio;

      categoryStats[item.category].matchedAudio++;
      matchedItems.push({ item, od: exact, publicUrl });
      updatedAdhkar.push(updated);
      continue;
    }

    // 3. Custom item check
    if (CUSTOM_ITEMS_NO_HISN[item.id]) {
      delete updated.audioUrl;
      delete updated.audioDuration;
      delete updated.openduaId;
      delete updated.quranAudio;

      categoryStats[item.category].customNoAudio++;
      customItems.push({
        item,
        reason: CUSTOM_ITEMS_NO_HISN[item.id],
      });
      updatedAdhkar.push(updated);
      continue;
    }

    // 4. Unmatched item: Leave audio empty & find closest candidate
    delete updated.audioUrl;
    delete updated.audioDuration;
    delete updated.openduaId;
    delete updated.quranAudio;

    let bestCandidate: OpenDuaCatalogueEntry | null = null;
    let maxSim = 0;
    for (const od of openduaItems) {
      const sim = wordSimilarity(norm, od.normArabic);
      if (sim > maxSim) {
        maxSim = sim;
        bestCandidate = od;
      }
    }

    if (maxSim < 0.25) {
      categoryStats[item.category].customNoAudio++;
      customItems.push({
        item,
        reason: "Supplication not in Hisn al-Muslim / OpenDua collection",
      });
    } else {
      categoryStats[item.category].unmatched++;
      unmatchedReportItems.push({
        item,
        candidate: bestCandidate,
        similarity: maxSim,
      });
    }
    updatedAdhkar.push(updated);
  }

  console.log("\n=== STEP 3: Write Updated JSON Files ===");
  // Write combined adhkar.json
  fs.writeFileSync(
    "data/adhkar/adhkar.json",
    JSON.stringify(updatedAdhkar, null, 2)
  );

  // Write category JSON files
  const categories = [
    "morning",
    "evening",
    "after-salah",
    "sleep",
    "waking",
    "general",
  ];
  for (const cat of categories) {
    const catItems = updatedAdhkar.filter((a) => a.category === cat);
    fs.writeFileSync(
      `data/adhkar/${cat}.json`,
      JSON.stringify(catItems, null, 2)
    );
  }
  console.log("Successfully wrote all data/adhkar/*.json category files.");

  console.log("\n=== STEP 4: Generate audio-match-report.md ===");
  generateReport(
    categoryStats,
    matchedItems,
    quranAudioItems,
    unmatchedReportItems,
    customItems
  );

  console.log("=== DONE ===");
}

function generateReport(
  stats: Record<string, any>,
  matched: any[],
  quran: any[],
  unmatched: any[],
  custom: any[]
) {
  let md = `# OpenDua Audio Matching & Coverage Report

**Generated:** ${new Date().toISOString()}  
**Dataset Version:** OpenDua v0.0.4 (\`https://opendua.org/v0.0.4/catalogue.json\`)  
**Audio Release:** OpenDua Audio v0.0.2 (\`https://audio.opendua.org/hisn/v0.0.2/\`)  
**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**Reciter:** Muhammad Jumah for OpenDua  

---

## 1. Executive Summary & Category Coverage

| Category | Total Items | OpenDua Audio (Exact Match) | Quran Ayah Audio | Playable Coverage | Unmatched (Candidate Reviewed) | Custom Items (No Audio) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  let totalAll = 0;
  let totalMatched = 0;
  let totalQuran = 0;
  let totalUnmatched = 0;
  let totalCustom = 0;

  for (const [cat, s] of Object.entries(stats)) {
    const playable = s.matchedAudio + s.quranAudio;
    const pct = ((playable / s.total) * 100).toFixed(1);
    totalAll += s.total;
    totalMatched += s.matchedAudio;
    totalQuran += s.quranAudio;
    totalUnmatched += s.unmatched;
    totalCustom += s.customNoAudio;

    md += `| **${cat}** | ${s.total} | ${s.matchedAudio} | ${s.quranAudio} | **${playable} / ${s.total} (${pct}%)** | ${s.unmatched} | ${s.customNoAudio} |\n`;
  }

  const totalPlayable = totalMatched + totalQuran;
  const totalPct = ((totalPlayable / totalAll) * 100).toFixed(1);
  md += `| **Total** | **${totalAll}** | **${totalMatched}** | **${totalQuran}** | **${totalPlayable} / ${totalAll} (${totalPct}%)** | **${totalUnmatched}** | **${totalCustom}** |\n\n`;

  md += `> [!IMPORTANT]
> - **Zero Runtime Calls:** All matched audio MP3 files are hosted locally on our static server under \`/public/audio/opendua/\`.
> - **Strict Exact-Match Guarantee:** Audio was attached **strictly on exact normalized match** (removing tashkeel, tatweel, punctuation, extra spaces; unifying alef and yeh variants). **No audio was guessed or attached to near-matches.**
> - **Quranic Adhkar:** Ayat al-Kursi, Al-Ikhlas, Al-Falaq, An-Nas, and the closing verses of Al-Baqarah are voiced via the user's selected Quran reciter and clearly labeled **"Quran audio"**.

---

## 2. Morning & Evening Unmatched Items (Highest Priority Review)

The following items from the **Morning** and **Evening** categories were not exact normalized matches against OpenDua catalogue entries. In strict compliance with instructions, their audio has been left **empty** for your review.

`;

  const morningEveningUnmatched = unmatched.filter(
    (u) => u.item.category === "morning" || u.item.category === "evening"
  );

  for (const u of morningEveningUnmatched) {
    const item = u.item;
    const cand = u.candidate;
    md += `### [${item.id}] ${item.title} (${item.category.toUpperCase()})
- **Our Arabic Text:**
  > ${item.arabic}
- **Closest OpenDua Entry:** [${cand.entryId}] *${cand.title}* (Similarity: ${(u.similarity * 100).toFixed(1)}%)
- **OpenDua Arabic Text:**
  > ${cand.arabic}
- **Comparison & Analysis:**
`;
    const w1 = normalizeArabic(item.arabic).split(" ");
    const w2 = normalizeArabic(cand.arabic).split(" ");
    const diff1 = w1.filter((w) => !w2.includes(w));
    const diff2 = w2.filter((w) => !w1.includes(w));

    md += `  - *Unique to Our Text:* \`${diff1.join("`, `") || "None"}\`\n`;
    md += `  - *Unique to OpenDua Text:* \`${diff2.join("`, `") || "None"}\`\n`;
    md += `  - *Status:* **Audio left empty (pending user review)**\n\n`;
  }

  md += `---

## 3. Other Categories Unmatched Items (After Salah, Sleep, General)

`;

  const otherUnmatched = unmatched.filter(
    (u) => u.item.category !== "morning" && u.item.category !== "evening"
  );

  for (const u of otherUnmatched) {
    const item = u.item;
    const cand = u.candidate;
    md += `### [${item.id}] ${item.title} (${item.category})
- **Our Arabic:** ${item.arabic.slice(0, 100)}...
- **Closest OD Candidate:** [${cand.entryId}] *${cand.title}* (${(u.similarity * 100).toFixed(1)}% match)
- **OD Arabic:** ${cand.arabic.slice(0, 100)}...
- **Status:** Audio left empty (pending user review)\n\n`;
  }

  md += `---

## 4. Quranic Adhkar (Ayah Recitation Audio Fallback)

The following ${quran.length} items are direct Quranic passages and use the site's existing Quran ayah recitation audio with the user's selected reciter, labeled **"Quran audio"**:

| ID | Category | Title | Quran Surah & Verses | Audio Source |
| :--- | :--- | :--- | :--- | :--- |
`;

  for (const q of quran) {
    md += `| \`${q.item.id}\` | ${q.item.category} | ${q.item.title} | ${q.qMeta.surahName} | **Quran audio** (${q.qMeta.verses.join(", ")}) |\n`;
  }

  md += `\n---

## 5. Custom Items (Not in Hisn al-Muslim)

The following items in our database are standalone Quranic supplications or custom daily prayers not found in *Hisn al-Muslim*:

| ID | Category | Title | Source / Note |
| :--- | :--- | :--- | :--- |
`;

  for (const c of custom) {
    md += `| \`${c.item.id}\` | ${c.item.category} | ${c.item.title} | ${c.reason} |\n`;
  }

  md += `\n---

## 6. OpenDua License & Attribution

- **Recitation:** Muhammad Jumah for OpenDua  
- **Dataset License:** Creative Commons Attribution 4.0 International ([CC BY 4.0](https://opendua.hdfund.org/licence/data))  
- **Audio License:** Creative Commons Attribution 4.0 International ([CC BY 4.0](https://opendua.hdfund.org/licence/audio))  
- **Attribution Note:** "Recitation by Muhammad Jumah for OpenDua, CC BY 4.0. Audio is matched to text only where the Arabic text is identical. Where Quran ayah audio is used, recitation is by the user's selected reciter."  
- **No Endorsement:** This implementation does not imply endorsement by OpenDua, Ihsan Labs, or the Human Development Fund.
`;

  fs.writeFileSync("audio-match-report.md", md);
  console.log("Successfully generated audio-match-report.md");
}

run();
