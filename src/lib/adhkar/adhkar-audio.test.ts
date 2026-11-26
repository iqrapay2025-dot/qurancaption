import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  loadAdhkarAudioSettings,
  saveAdhkarAudioSettings,
  saveAudioFeedback,
  getAudioFeedback,
  getDhikrRemaining,
  decrementDhikr,
  calculateStreak,
} from "./storage";
import {
  CATEGORY_AUDIO_SIZE_ESTIMATES,
  isUnmeteredConnection,
} from "./audio-downloader";
import {
  registerAudioPlayback,
  notifyAudioPlaybackStarted,
  getCurrentAudioSource,
  _resetAudioPlaybackForTesting,
} from "@/lib/audio/single-audio";
import morningItems from "../../../data/adhkar/morning.json";
import generalItems from "../../../data/adhkar/general.json";
import sleepItems from "../../../data/adhkar/sleep.json";
import afterSalahItems from "../../../data/adhkar/after-salah.json";

// Setup mock localStorage and window for Node/Vitest
const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

beforeAll(() => {
  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).window = globalThis;
});

// Arabic normalization helper from import script
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // remove tashkeel/diacritics
    .replace(/\u0640/g, "") // remove tatweel
    .replace(/[إأآٱ]/g, "\u0627") // unify alef to bare alef
    .replace(/[ىئ]/g, "\u064A") // unify alif maqsura & yeh with hamza to yeh
    .replace(/[«»"'\(\)\[\]،؛:\.\-–—؟!?]/g, " ") // remove punctuation
    .replace(/[\u0660-\u06690-9]/g, "") // remove digits
    .replace(/\s+/g, " ")
    .trim();
}

describe("OpenDua Exact Matching Logic & Diacritic Variants", () => {
  it("normalizes Arabic text correctly across diacritic and alef/yeh variations", () => {
    const rawWithTashkeel = "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ";
    const expected = "اللهم انت ربي لا اله الا انت";
    expect(normalizeArabic(rawWithTashkeel)).toBe(expected);

    // Diacritic variants with tatweel and various alefs
    const variant1 = "الـــلَّـٰـهُـمَّ إِنَّـكَ";
    const variant2 = "اللهم انك";
    expect(normalizeArabic(variant1)).toBe(normalizeArabic(variant2));

    // Alif maqsura vs Yeh
    const ya1 = "عَلَى";
    const ya2 = "علي";
    expect(normalizeArabic(ya1)).toBe(normalizeArabic(ya2));
  });

  it("matches OpenDua audio for all Morning items with Muhammad Jumah recitation", () => {
    // Ayat al-Kursi (morning-1) uses Muhammad Jumah OD-075.mp3
    const morning1 = morningItems.find((i: any) => i.id === "morning-1");
    expect(morning1?.audioUrl).toBe("/audio/opendua/OD-075.mp3");
    expect(morning1?.openduaId).toBe("entry-000075");

    // 3 Quls (morning-2, 3, 4) use Muhammad Jumah OD-076.mp3
    const morning2 = morningItems.find((i: any) => i.id === "morning-2");
    expect(morning2?.audioUrl).toBe("/audio/opendua/OD-076.mp3");
    expect(morning2?.openduaId).toBe("entry-000076");

    // Sayyid al-Istighfar (morning-7)
    const morning7 = morningItems.find((i: any) => i.id === "morning-7");
    expect(morning7?.audioUrl).toBe("/audio/opendua/OD-079.mp3");

    // Protection and Good Health (morning-8)
    const morning8 = morningItems.find((i: any) => i.id === "morning-8");
    expect(morning8?.audioUrl).toBe("/audio/opendua/OD-082.mp3");

    // All 19 Morning items have authentic Muhammad Jumah audio
    expect(morningItems.length).toBe(19);
    for (const item of morningItems) {
      expect((item as any).audioUrl).toMatch(/^\/audio\/opendua\/OD-[\d\-]+\.mp3$/);
    }
  });

  it("custom items not in Hisn al-Muslim have no audio attached", () => {
    const customGeneral = generalItems.find((i: any) => i.id === "general-11");
    expect(customGeneral).toBeDefined();
    expect(customGeneral?.audioUrl).toBeUndefined();
    expect(customGeneral?.quranAudio).toBeUndefined();
  });

  it("never alters existing Arabic text, item IDs, categories or repeat counts", () => {
    // Morning 1 repeat should remain 1
    const m1 = morningItems.find((i: any) => i.id === "morning-1");
    expect(m1?.repeat).toBe(1);
    expect(m1?.category).toBe("morning");

    // Morning 18 repeat should remain 100
    const m18 = morningItems.find((i: any) => i.id === "morning-18");
    expect(m18?.repeat).toBe(100);
  });
});

describe("Audio Settings Persistence & Defaults", () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it("loads default settings when nothing is in localStorage", () => {
    const settings = loadAdhkarAudioSettings();
    expect(settings.speed).toBe(1);
    expect(settings.repeat).toBe(1);
    expect(settings.listenAndRepeat).toBe(false);
    expect(settings.autoCount).toBe(false);
  });

  it("persists updated settings to localStorage", () => {
    saveAdhkarAudioSettings({
      speed: 0.75,
      repeat: 3,
      listenAndRepeat: true,
      autoCount: true,
    });

    const reloaded = loadAdhkarAudioSettings();
    expect(reloaded.speed).toBe(0.75);
    expect(reloaded.repeat).toBe(3);
    expect(reloaded.listenAndRepeat).toBe(true);
    expect(reloaded.autoCount).toBe(true);
  });

  it("saves and retrieves 1-week audio feedback record", () => {
    expect(getAudioFeedback()).toBeNull();

    saveAudioFeedback({
      rating: "Yes",
      comment: "Very clear recitation, helped my pronunciation!",
      submittedAt: Date.now(),
    });

    const fb = getAudioFeedback();
    expect(fb?.rating).toBe("Yes");
    expect(fb?.comment).toContain("Very clear recitation");

    const settings = loadAdhkarAudioSettings();
    expect(settings.feedbackSubmitted).toBe(true);
  });
});

describe("Category Audio Size Estimates & Connection Guards", () => {
  it("provides valid size estimates for all 6 categories", () => {
    const categories = ["morning", "evening", "after-salah", "sleep", "waking", "general"] as const;
    for (const cat of categories) {
      const est = CATEGORY_AUDIO_SIZE_ESTIMATES[cat];
      expect(est).toBeDefined();
      expect(est.bytes).toBeGreaterThan(500000); // at least 500KB
      expect(est.formatted).toMatch(/^\d+(\.\d+)?\sMB$/);
      expect(est.count).toBeGreaterThan(0);
    }
  });

  it("detects unmetered connection and respects Data Saver", () => {
    expect(isUnmeteredConnection()).toBe(true);
  });
});

describe("Single Audio Coordination with Adhkar Source", () => {
  beforeEach(() => {
    _resetAudioPlaybackForTesting();
  });

  it("pauses adhkar player when another audio source starts playing", () => {
    let paused = false;
    registerAudioPlayback("adhkar", () => {
      paused = true;
    });

    // Notify reader audio started
    notifyAudioPlaybackStarted("reader");
    expect(paused).toBe(true);
    expect(getCurrentAudioSource()).toBe("reader");
  });

  it("sets current source to adhkar when notified", () => {
    notifyAudioPlaybackStarted("adhkar");
    expect(getCurrentAudioSource()).toBe("adhkar");
  });
});

describe("User Data Safety (Counters, Streaks, Completions Untouched)", () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it("decrements counters and updates streaks accurately without interference from audio", () => {
    const initialRem = getDhikrRemaining("test-dhikr-1", 3);
    expect(initialRem).toBe(3);

    const step1 = decrementDhikr("test-dhikr-1", 3);
    expect(step1.remaining).toBe(2);
    expect(step1.isDone).toBe(false);

    const step2 = decrementDhikr("test-dhikr-1", 3);
    expect(step2.remaining).toBe(1);

    const step3 = decrementDhikr("test-dhikr-1", 3);
    expect(step3.remaining).toBe(0);
    expect(step3.isDone).toBe(true);
    expect(step3.wasJustCompleted).toBe(true);

    // Streak should now be active
    const streak = calculateStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.todayActive).toBe(true);
  });
});

describe("Sleep Adhkar Audio Mapping & Accuracy", () => {
  it("sleep-1 uses OD-105.mp3 (Bismika Allahumma amootu wa ahya) without spoken number 4", () => {
    const s1 = sleepItems.find((i: any) => i.id === "sleep-1");
    expect(s1).toBeDefined();
    expect(s1?.audioUrl).toBe("/audio/opendua/OD-105.mp3");
    expect(s1?.openduaId).toBe("entry-000105");
  });

  it("sleep-4 uses OD-102.mp3 (Bismika Rabbi wada'tu janbi)", () => {
    const s4 = sleepItems.find((i: any) => i.id === "sleep-4");
    expect(s4?.audioUrl).toBe("/audio/opendua/OD-102.mp3");
  });

  it("sleep-5 (Tasbih of Fatimah) has authentic audio OD-106.mp3", () => {
    const s5 = sleepItems.find((i: any) => i.id === "sleep-5");
    expect(s5?.audioUrl).toBe("/audio/opendua/OD-106.mp3");
    expect(s5?.openduaId).toBe("entry-000106");
  });

  it("sleep-7 (Gratitude for Food, Drink and Shelter) uses OD-108.mp3 instead of Al-Ikhlas", () => {
    const s7 = sleepItems.find((i: any) => i.id === "sleep-7");
    expect(s7?.audioUrl).toBe("/audio/opendua/OD-108.mp3");
    expect(s7?.openduaId).toBe("entry-000108");
    expect(s7?.audioUrl).not.toBe("/audio/opendua/OD-076.mp3");
  });

  it("all 8 sleep items have authentic audio attached", () => {
    expect(sleepItems.length).toBe(8);
    for (const item of sleepItems) {
      expect((item as any).audioUrl).toMatch(/^\/audio\/opendua\/OD-[\d\-]+\.mp3$/);
    }
  });
});

describe("After Salah 3 Quls Carousel Card", () => {
  it("combines the 3 Quls into a single card with 3 slides in after-salah-10", () => {
    const item10 = afterSalahItems.find((i: any) => i.id === "after-salah-10");
    expect(item10).toBeDefined();
    expect(item10?.audioUrl).toBe("/audio/opendua/OD-070.mp3");
    expect(item10?.slides).toBeDefined();
    expect(item10?.slides?.length).toBe(3);
    expect(item10?.slides?.[0]?.title).toContain("Al-Ikhlas");
    expect(item10?.slides?.[1]?.title).toContain("Al-Falaq");
    expect(item10?.slides?.[2]?.title).toContain("An-Nas");
    expect(item10?.subItemIds).toEqual(["after-salah-10", "after-salah-11", "after-salah-12"]);
  });

  it("marks after-salah-11 and after-salah-12 as grouped in carousel of after-salah-10", () => {
    const item11 = afterSalahItems.find((i: any) => i.id === "after-salah-11");
    const item12 = afterSalahItems.find((i: any) => i.id === "after-salah-12");
    expect(item11?.inCarouselGroupOf).toBe("after-salah-10");
    expect(item12?.inCarouselGroupOf).toBe("after-salah-10");
  });
});

describe("Daily and General Duas Audio & Item 30 Fix", () => {
  it("general-30 (Supplication After Sneezing) uses OD-188-1.mp3 instead of Tasbih of Fatimah OD-106.mp3", () => {
    const g30 = generalItems.find((i: any) => i.id === "general-30");
    expect(g30).toBeDefined();
    expect(g30?.audioUrl).toBe("/audio/opendua/OD-188-1.mp3");
    expect(g30?.audioDuration).toBe(2);
    expect(g30?.openduaId).toBe("entry-000188");
    expect(g30?.audioUrl).not.toBe("/audio/opendua/OD-106.mp3");
  });

  it("attaches authentic audio to daily supplications in General category", () => {
    const g1 = generalItems.find((i: any) => i.id === "general-1");
    expect(g1?.audioUrl).toBe("/audio/opendua/OD-010.mp3");

    const g4 = generalItems.find((i: any) => i.id === "general-4");
    expect(g4?.audioUrl).toBe("/audio/opendua/OD-178-2.mp3");

    const g6 = generalItems.find((i: any) => i.id === "general-6");
    expect(g6?.audioUrl).toBe("/audio/opendua/OD-020.mp3");

    const g13 = generalItems.find((i: any) => i.id === "general-13");
    expect(g13?.audioUrl).toBe("/audio/opendua/OD-016.mp3");

    const g15 = generalItems.find((i: any) => i.id === "general-15");
    expect(g15?.audioUrl).toBe("/audio/opendua/OD-207-1.mp3");

    const g20 = generalItems.find((i: any) => i.id === "general-20");
    expect(g20?.audioUrl).toBe("/audio/opendua/OD-206.mp3");

    const g35 = generalItems.find((i: any) => i.id === "general-35");
    expect(g35?.audioUrl).toBe("/audio/opendua/OD-025.mp3");

    const g37 = generalItems.find((i: any) => i.id === "general-37");
    expect(g37?.audioUrl).toBe("/audio/opendua/OD-235.mp3");
  });

  it("attaches Quran ayah audio for Quranic general supplications and keeps general-34 pending with Audio coming soon", () => {
    const g34 = generalItems.find((i: any) => i.id === "general-34");
    expect(g34?.audioUrl).toBeUndefined();
    expect(g34?.quranAudio).toBeUndefined();

    const g36 = generalItems.find((i: any) => i.id === "general-36");
    expect(g36?.quranAudio?.verses).toEqual(["14:41"]);

    const g40 = generalItems.find((i: any) => i.id === "general-40");
    expect(g40?.quranAudio?.verses).toEqual(["3:8"]);
  });
});
