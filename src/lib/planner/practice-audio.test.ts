import { describe, it, expect } from "vitest";

describe("Practice Mode Recitation Logic", () => {
  it("extracts unique ordered verse keys across target lines", () => {
    const targetLines = [
      {
        line_number: 1,
        words: [],
      },
      {
        line_number: 2,
        words: [
          { text_uthmani: "بِسْمِ", verse_key: "1:1" },
          { text_uthmani: "اللَّهِ", verse_key: "1:1" },
          { text_uthmani: "الرَّحْمَٰنِ", verse_key: "1:1" },
          { text_uthmani: "الرَّحِيمِ", verse_key: "1:1" },
        ],
      },
      {
        line_number: 3,
        words: [
          { text_uthmani: "الْحَمْدُ", verse_key: "1:2" },
          { text_uthmani: "لِلَّهِ", verse_key: "1:2" },
          { text_uthmani: "رَبِّ", verse_key: "1:2" },
          { text_uthmani: "الْعَالَمِينَ", verse_key: "1:2" },
        ],
      },
      {
        line_number: 4,
        words: [
          { text_uthmani: "الرَّحْمَٰنِ", verse_key: "1:3" },
          { text_uthmani: "الرَّحِيمِ", verse_key: "1:3" },
          { text_uthmani: "مَالِكِ", verse_key: "1:4" },
          { text_uthmani: "يَوْمِ", verse_key: "1:4" },
          { text_uthmani: "الدِّينِ", verse_key: "1:4" },
        ],
      },
    ];

    const uniqueKeys: string[] = [];
    for (const line of targetLines) {
      if (Array.isArray(line.words)) {
        for (const w of line.words) {
          if (w.verse_key && !uniqueKeys.includes(w.verse_key)) {
            uniqueKeys.push(w.verse_key);
          }
        }
      }
    }

    expect(uniqueKeys).toEqual(["1:1", "1:2", "1:3", "1:4"]);
  });

  it("maps extracted verse keys to full ayah audio URLs", () => {
    const uniqueKeys = ["1:1", "1:2", "1:3"];
    const audioFiles = [
      { verseKey: "1:1", audioUrl: "https://everyayah.com/data/Mishary/001001.mp3" },
      { verseKey: "1:2", audioUrl: "https://everyayah.com/data/Mishary/001002.mp3" },
      { verseKey: "1:3", audioUrl: "https://everyayah.com/data/Mishary/001003.mp3" },
      { verseKey: "1:4", audioUrl: "https://everyayah.com/data/Mishary/001004.mp3" },
    ];

    const tracks = uniqueKeys
      .map((vk) => {
        const match = audioFiles.find((f) => f.verseKey === vk);
        return match ? { verseKey: vk, audioUrl: match.audioUrl } : null;
      })
      .filter(Boolean);

    expect(tracks).toHaveLength(3);
    expect(tracks[0]?.verseKey).toBe("1:1");
    expect(tracks[0]?.audioUrl).toContain("001001.mp3");
    expect(tracks[1]?.verseKey).toBe("1:2");
    expect(tracks[2]?.verseKey).toBe("1:3");
  });

  it("advances through tracks and repeats the entire portion until repeat target is reached", () => {
    const tracks = ["1:1", "1:2", "1:3"];
    const repeatTarget = 3;

    const playedOrder: string[] = [];
    let currentRepeat = 1;
    let trackIndex = 0;

    while (currentRepeat <= repeatTarget) {
      if (trackIndex < tracks.length) {
        playedOrder.push(`r${currentRepeat}:${tracks[trackIndex]}`);
        trackIndex++;
      } else {
        currentRepeat++;
        trackIndex = 0;
      }
    }

    expect(playedOrder).toEqual([
      "r1:1:1",
      "r1:1:2",
      "r1:1:3",
      "r2:1:1",
      "r2:1:2",
      "r2:1:3",
      "r3:1:1",
      "r3:1:2",
      "r3:1:3",
    ]);
  });
});
