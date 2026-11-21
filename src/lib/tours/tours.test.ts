import { describe, it, expect, beforeEach } from "vitest";
import { TOUR_LIST, TOURS, getTourById } from "./definitions";
import {
  isTourCompleted,
  markTourCompleted,
  resetTour,
  resetAllTours,
  hasSessionTourStarted,
  markSessionTourStarted,
  resetSessionTour,
  shouldAutoStartTour,
  getTourStorageKey,
} from "./storage";
import { filterAvailableSteps } from "./filter";
import type { TourStep } from "./types";

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe("Guided Tours - Tour Definitions", () => {
  it("defines all required tours with valid metadata", () => {
    expect(TOURS.welcome).toBeDefined();
    expect(TOURS["quran-reader"]).toBeDefined();
    expect(TOURS.listen).toBeDefined();
    expect(TOURS.editor).toBeDefined();
    expect(TOURS.bookmarks).toBeDefined();

    expect(TOUR_LIST.length).toBe(5);
  });

  it("ensures every tour step has a unique id, title, and body", () => {
    for (const tour of TOUR_LIST) {
      expect(tour.id).toBeTruthy();
      expect(tour.name).toBeTruthy();
      expect(tour.description).toBeTruthy();
      expect(tour.route).toBeTruthy();
      expect(tour.steps.length).toBeGreaterThan(0);

      const seenIds = new Set<string>();
      for (const step of tour.steps) {
        expect(step.id).toBeTruthy();
        expect(seenIds.has(step.id)).toBe(false);
        seenIds.add(step.id);

        expect(step.title.trim().length).toBeGreaterThan(0);
        expect(step.body.trim().length).toBeGreaterThan(0);

        // Step target is either undefined (centered popover) or a non-empty selector string
        if (step.target !== undefined) {
          expect(typeof step.target).toBe("string");
          expect(step.target.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("checks specific step counts for required tours", () => {
    // welcome: 5-7 steps
    expect(TOURS.welcome.steps.length).toBeGreaterThanOrEqual(5);
    expect(TOURS.welcome.steps.length).toBeLessThanOrEqual(7);

    // welcome has at least one centered step (no target)
    const centeredWelcomeSteps = TOURS.welcome.steps.filter((s) => !s.target);
    expect(centeredWelcomeSteps.length).toBeGreaterThanOrEqual(1);

    // quran-reader: 4-7 steps
    expect(TOURS["quran-reader"].steps.length).toBeGreaterThanOrEqual(4);
    expect(TOURS["quran-reader"].steps.length).toBeLessThanOrEqual(7);

    // listen: 4-5 steps
    expect(TOURS.listen.steps.length).toBeGreaterThanOrEqual(4);
    expect(TOURS.listen.steps.length).toBeLessThanOrEqual(5);

    // editor: exactly 8 steps matching GUIDE_STEPS
    expect(TOURS.editor.steps.length).toBe(8);
  });

  it("allows looking up tour by id", () => {
    expect(getTourById("welcome")?.id).toBe("welcome");
    expect(getTourById("listen")?.id).toBe("listen");
    expect(getTourById("non-existent")).toBeUndefined();
  });
});

describe("Guided Tours - Storage Helpers", () => {
  let mockLocal: MockStorage;
  let mockSession: MockStorage;

  beforeEach(() => {
    mockLocal = new MockStorage();
    mockSession = new MockStorage();
  });

  it("reads and marks tour completion correctly", () => {
    expect(isTourCompleted("welcome", mockLocal)).toBe(false);

    markTourCompleted("welcome", mockLocal);
    expect(isTourCompleted("welcome", mockLocal)).toBe(true);

    resetTour("welcome", mockLocal);
    expect(isTourCompleted("welcome", mockLocal)).toBe(false);
  });

  it("handles corrupted or alternate values gracefully", () => {
    mockLocal.setItem(getTourStorageKey("listen"), "true");
    expect(isTourCompleted("listen", mockLocal)).toBe(true);

    mockLocal.setItem(getTourStorageKey("listen"), " 1 ");
    expect(isTourCompleted("listen", mockLocal)).toBe(true);

    mockLocal.setItem(getTourStorageKey("listen"), "");
    expect(isTourCompleted("listen", mockLocal)).toBe(false);

    mockLocal.setItem(getTourStorageKey("listen"), "   ");
    expect(isTourCompleted("listen", mockLocal)).toBe(false);
  });

  it("handles missing localStorage without throwing", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("Quota exceeded / Access denied");
      },
      setItem: () => {
        throw new Error("Quota exceeded / Access denied");
      },
      removeItem: () => {
        throw new Error("Quota exceeded / Access denied");
      },
    } as unknown as Storage;

    expect(() => isTourCompleted("welcome", brokenStorage)).not.toThrow();
    expect(isTourCompleted("welcome", brokenStorage)).toBe(false);

    expect(() => markTourCompleted("welcome", brokenStorage)).not.toThrow();
    expect(() => resetTour("welcome", brokenStorage)).not.toThrow();
  });

  it("resets all tours at once", () => {
    markTourCompleted("welcome", mockLocal);
    markTourCompleted("listen", mockLocal);
    markTourCompleted("editor", mockLocal);

    expect(isTourCompleted("welcome", mockLocal)).toBe(true);
    expect(isTourCompleted("listen", mockLocal)).toBe(true);

    resetAllTours(mockLocal);

    expect(isTourCompleted("welcome", mockLocal)).toBe(false);
    expect(isTourCompleted("listen", mockLocal)).toBe(false);
    expect(isTourCompleted("editor", mockLocal)).toBe(false);
  });

  it("tracks session tour started state", () => {
    expect(hasSessionTourStarted(mockSession)).toBe(false);

    markSessionTourStarted(mockSession);
    expect(hasSessionTourStarted(mockSession)).toBe(true);

    resetSessionTour(mockSession);
    expect(hasSessionTourStarted(mockSession)).toBe(false);
  });
});

describe("Guided Tours - Missing Target Filtering", () => {
  it("keeps centered steps and elements present in the DOM", () => {
    const steps: TourStep[] = [
      { id: "step-1", title: "Intro", body: "Centered introduction" }, // No target
      { id: "step-2", target: "#existing", title: "Targeted", body: "Has target" },
      { id: "step-3", target: "#missing", title: "Missing", body: "Target not in DOM" },
    ];

    const mockDoc = {
      querySelector: (sel: string) => {
        if (sel === "#existing") return {} as Element;
        return null;
      },
    } as unknown as Document;

    const available = filterAvailableSteps(steps, mockDoc);
    expect(available.length).toBe(2);
    expect(available[0].id).toBe("step-1");
    expect(available[1].id).toBe("step-2");
  });

  it("returns all steps when document is unavailable", () => {
    const steps: TourStep[] = [
      { id: "s1", target: "#any", title: "S1", body: "B1" },
    ];
    const available = filterAvailableSteps(steps, {} as Document);
    expect(available).toEqual(steps);
  });
});

describe("Guided Tours - Auto-start Decision Helper", () => {
  it("auto-starts when fresh visit and no blockers exist", () => {
    const decision = shouldAutoStartTour({
      tourId: "welcome",
      isCompleted: false,
      sessionTourStarted: false,
      isCookieBannerOpen: false,
      isModalOpen: false,
      isDrawerOpen: false,
      isSplashActive: false,
    });
    expect(decision).toBe(true);
  });

  it("blocks auto-start if tour is already completed", () => {
    const decision = shouldAutoStartTour({
      tourId: "welcome",
      isCompleted: true,
      sessionTourStarted: false,
    });
    expect(decision).toBe(false);
  });

  it("blocks auto-start if another tour already ran this session", () => {
    const decision = shouldAutoStartTour({
      tourId: "quran-reader",
      isCompleted: false,
      sessionTourStarted: true,
    });
    expect(decision).toBe(false);
  });

  it("blocks auto-start when UI overlays are active", () => {
    expect(
      shouldAutoStartTour({
        tourId: "welcome",
        isCookieBannerOpen: true,
      })
    ).toBe(false);

    expect(
      shouldAutoStartTour({
        tourId: "welcome",
        isModalOpen: true,
      })
    ).toBe(false);

    expect(
      shouldAutoStartTour({
        tourId: "welcome",
        isSplashActive: true,
      })
    ).toBe(false);

    expect(
      shouldAutoStartTour({
        tourId: "welcome",
        isDrawerOpen: true,
      })
    ).toBe(false);
  });

  it("overrides all blockers when ?tour=<id> matches target tour", () => {
    const decision = shouldAutoStartTour({
      tourId: "editor",
      tourQueryParam: "editor",
      isCompleted: true, // Even if completed
      sessionTourStarted: true, // Even if session tour ran
      isCookieBannerOpen: false,
    });
    expect(decision).toBe(true);
  });

  it("blocks if ?tour=<other> specifies a different tour", () => {
    const decision = shouldAutoStartTour({
      tourId: "welcome",
      tourQueryParam: "editor",
    });
    expect(decision).toBe(false);
  });
});
