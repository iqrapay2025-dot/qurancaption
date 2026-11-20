import { describe, it, expect } from "vitest";
import { NAV_ITEMS, QURAN_CHILDREN, LEARN_CHILDREN, isActive } from "./nav";

describe("NAV_ITEMS", () => {
  it("has the expected link order: Home, Quran, Learn, Pricing", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(["Home", "Quran", "Learn", "Pricing"]);
  });

  it("Quran dropdown has the expected children: Read Quran, Listen to Quran, Bookmarks", () => {
    const quranItem = NAV_ITEMS.find((item) => item.label === "Quran");
    expect(quranItem).toBeDefined();
    expect(quranItem?.children).toBeDefined();
    expect(quranItem?.children?.length).toBe(3);

    expect(quranItem?.children?.[0]).toEqual({
      label: "Read Quran",
      description: "Surahs, translation and tafsir",
      href: "/quran",
      icon: "BookOpen",
    });

    expect(quranItem?.children?.[1]).toEqual({
      label: "Listen to Quran",
      description: "Full recitations by surah",
      href: "/listen",
      icon: "Headphones",
    });

    expect(quranItem?.children?.[2]).toEqual({
      label: "Bookmarks",
      description: "Your saved ayahs",
      href: "/quran/bookmarks",
      icon: "Bookmark",
    });

    expect(QURAN_CHILDREN).toEqual(quranItem?.children);
  });

  it("Learn dropdown has How it works and Guide", () => {
    const learnItem = NAV_ITEMS.find((item) => item.label === "Learn");
    expect(learnItem).toBeDefined();
    expect(learnItem?.children?.length).toBe(2);

    expect(learnItem?.children?.[0]).toEqual({
      label: "How it works",
      description: "Overview of Ayah Studio & the editor",
      href: "/how-it-works",
      icon: "Compass",
    });

    expect(learnItem?.children?.[1]).toEqual({
      label: "Guide",
      description: "Formatting tips, shortcuts and styling",
      href: "/guide",
      icon: "BookOpen",
    });

    expect(LEARN_CHILDREN).toEqual(learnItem?.children);
  });
});

describe("isActive", () => {
  it("Home matches only exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/home", "/")).toBe(true);
    expect(isActive("/quran", "/")).toBe(false);
    expect(isActive("/guide", "/")).toBe(false);
  });

  it("Quran parent matches /quran, /quran/[surah] and /listen", () => {
    expect(isActive("/quran", "/quran")).toBe(true);
    expect(isActive("/quran/2", "/quran")).toBe(true);
    expect(isActive("/quran/114", "/quran")).toBe(true);
    expect(isActive("/listen", "/quran")).toBe(true);
    expect(isActive("/guide", "/quran")).toBe(false);

    expect(isActive("/quran", "Quran")).toBe(true);
    expect(isActive("/quran/2", "Quran")).toBe(true);
    expect(isActive("/listen", "Quran")).toBe(true);
    expect(isActive("/guide", "Quran")).toBe(false);
  });

  it("Learn parent matches /how-it-works and /guide", () => {
    expect(isActive("/how-it-works", "Learn")).toBe(true);
    expect(isActive("/guide", "Learn")).toBe(true);
    expect(isActive("/quran", "Learn")).toBe(false);
    expect(isActive("/listen", "Learn")).toBe(false);
  });

  it("/listen matches /listen", () => {
    expect(isActive("/listen", "/listen")).toBe(true);
    expect(isActive("/quran", "/listen")).toBe(false);
    expect(isActive("/guide", "/listen")).toBe(false);
  });

  it("/how-it-works matches How it works", () => {
    expect(isActive("/how-it-works", "/how-it-works")).toBe(true);
    expect(isActive("/quran", "/how-it-works")).toBe(false);
  });

  it("/guide matches Guide", () => {
    expect(isActive("/guide", "/guide")).toBe(true);
    expect(isActive("/quran", "/guide")).toBe(false);
  });
});
