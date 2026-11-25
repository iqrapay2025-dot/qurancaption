import { describe, it, expect } from "vitest";
import { generateToday, togglePausePlan, skipDay, moveLesson } from "./scheduler";
import { applyRevisionRating, applySabaqResult, addDays } from "./spaced-repetition";
import { generateMushafUnits } from "./mushaf-grid";
import { PlannerPlan, UnitRecord } from "./types";
import { getPaceEstimate } from "./pace";

function createMockPlan(overrides: Partial<PlannerPlan> = {}): PlannerPlan {
  return {
    id: "plan-1",
    name: "My Hifz Plan",
    startPoint: { page: 1 },
    direction: "forward",
    dailyLessonSize: 7,
    studyDays: [0, 1, 2, 3, 4, 5, 6], // everyday
    sabqiDays: 5,
    manzilCycleDays: 30,
    reminderTimes: {
      sabaq: "07:00",
      murajaah: "19:00",
    },
    createdAt: "2026-01-01",
    paused: false,
    skippedDates: [],
    ...overrides,
  };
}

describe("Planner Scheduler & Spaced Repetition", () => {
  const units = generateMushafUnits(7, "forward");

  it("Day 1: generates first Sabaq with empty history and no sabqi or manzil", () => {
    const plan = createMockPlan();
    const records: Record<string, UnitRecord> = {};

    const schedule = generateToday(plan, units, "2026-01-01", records);

    expect(schedule.isStudyDay).toBe(true);
    expect(schedule.isPaused).toBe(false);
    expect(schedule.sabaq).not.toBeNull();
    expect(schedule.sabaq?.startPage).toBe(1);
    expect(schedule.sabaq?.startLine).toBe(1);
    expect(schedule.sabqi).toHaveLength(0);
    expect(schedule.manzil).toHaveLength(0);
    expect(schedule.backlog).toHaveLength(0);
  });

  it("Normal day: generates Sabaq, Sabqi (from past 5 days), and Manzil slice", () => {
    const plan = createMockPlan();
    const records: Record<string, UnitRecord> = {};

    // Simulate 5 days of previously learned units (Page 1-3)
    const u0 = units[0]; // Day 1
    const u1 = units[1]; // Day 2
    const u2 = units[2]; // Day 3
    const u3 = units[3]; // Day 4
    const u4 = units[4]; // Day 5

    records[u0.id] = {
      id: u0.id,
      status: "learning",
      learnedOn: "2026-01-01",
      lastRevised: "2026-01-05",
      nextDue: "2026-01-06",
      interval: 1,
      strength: "okay",
      history: [{ date: "2026-01-01", type: "sabaq", rating: "yes" }],
    };

    records[u1.id] = {
      id: u1.id,
      status: "learning",
      learnedOn: "2026-01-02",
      lastRevised: "2026-01-05",
      nextDue: "2026-01-06",
      interval: 1,
      strength: "okay",
      history: [{ date: "2026-01-02", type: "sabaq", rating: "yes" }],
    };

    // Simulate 10 older memorized units
    for (let i = 10; i < 20; i++) {
      const u = units[i];
      records[u.id] = {
        id: u.id,
        status: "memorized",
        learnedOn: "2025-12-01",
        lastRevised: "2025-12-20",
        nextDue: "2026-01-15",
        interval: 10,
        strength: "strong",
        history: [],
      };
    }

    const schedule = generateToday(plan, units, "2026-01-06", records);

    // Next sabaq should be unit 2 (since u0 and u1 are learning, u2 is untouched new)
    expect(schedule.sabaq?.id).toBe(u2.id);
    // Sabqi should include recently learned units u0 and u1
    expect(schedule.sabqi.map((u) => u.id)).toContain(u0.id);
    expect(schedule.sabqi.map((u) => u.id)).toContain(u1.id);
    // Manzil should have the slice from memorized units
    expect(schedule.manzil.length).toBeGreaterThan(0);
  });

  it("Spaced Repetition: Weak resets to 1 day; Okay x 1.5; Strong x 2.5", () => {
    const baseRecord: UnitRecord = {
      id: "p2-l1-7",
      status: "memorized",
      lastRevised: "2026-01-01",
      nextDue: "2026-01-05",
      interval: 4,
      strength: "okay",
      history: [],
    };

    // Weak
    const weakResult = applyRevisionRating(baseRecord, "weak", "2026-01-05", "manzil");
    expect(weakResult.interval).toBe(1);
    expect(weakResult.nextDue).toBe("2026-01-06");
    expect(weakResult.status).toBe("weak");
    expect(weakResult.strength).toBe("weak");

    // Okay (4 * 1.5 = 6)
    const okayResult = applyRevisionRating(baseRecord, "okay", "2026-01-05", "manzil");
    expect(okayResult.interval).toBe(6);
    expect(okayResult.nextDue).toBe("2026-01-11");
    expect(okayResult.strength).toBe("okay");

    // Strong (4 * 2.5 = 10)
    const strongResult = applyRevisionRating(baseRecord, "strong", "2026-01-05", "manzil");
    expect(strongResult.interval).toBe(10);
    expect(strongResult.nextDue).toBe("2026-01-15");
    expect(strongResult.strength).toBe("strong");
  });

  it("Sabaq outcomes: Partly repeats lesson tomorrow; Yes graduates to learning", () => {
    const baseRecord: UnitRecord = {
      id: "p1-l1-7",
      status: "new",
      interval: 1,
      strength: "okay",
      history: [],
    };

    const partlyResult = applySabaqResult(baseRecord, "partly", "2026-01-01");
    expect(partlyResult.status).toBe("new");
    expect(partlyResult.nextDue).toBe("2026-01-02");
    expect(partlyResult.history[0].rating).toBe("partly");

    const yesResult = applySabaqResult(baseRecord, "yes", "2026-01-01");
    expect(yesResult.status).toBe("learning");
    expect(yesResult.learnedOn).toBe("2026-01-01");
    expect(yesResult.nextDue).toBe("2026-01-02");
    expect(yesResult.history[0].rating).toBe("yes");
  });

  it("Missed week: tasks become backlog and weak items are prioritized", () => {
    const plan = createMockPlan();
    const records: Record<string, UnitRecord> = {};

    // 3 units that were due on 2026-01-01
    const u0 = units[0];
    const u1 = units[1];
    const u2 = units[2];

    records[u0.id] = {
      id: u0.id,
      status: "weak",
      learnedOn: "2025-12-01",
      lastRevised: "2025-12-25",
      nextDue: "2026-01-01", // 7 days overdue by 2026-01-08
      interval: 1,
      strength: "weak",
      history: [],
    };

    records[u1.id] = {
      id: u1.id,
      status: "memorized",
      learnedOn: "2025-12-01",
      lastRevised: "2025-12-25",
      nextDue: "2026-01-01",
      interval: 5,
      strength: "okay",
      history: [],
    };

    records[u2.id] = {
      id: u2.id,
      status: "memorized",
      learnedOn: "2025-12-01",
      lastRevised: "2025-12-25",
      nextDue: "2026-01-01",
      interval: 5,
      strength: "strong",
      history: [],
    };

    const schedule = generateToday(plan, units, "2026-01-08", records);

    // Backlog should detect all 3 overdue units
    expect(schedule.backlog).toHaveLength(3);
    // Overdue units are included in Manzil, with weak units prioritized first
    expect(schedule.manzil[0].id).toBe(u0.id);
  });

  it("Full 30-day Manzil cycle: every memorized unit is scheduled at least once", () => {
    const plan = createMockPlan({ manzilCycleDays: 30 });
    const records: Record<string, UnitRecord> = {};

    // Create 60 memorized units
    const memorizedSlice = units.slice(0, 60);
    for (const u of memorizedSlice) {
      records[u.id] = {
        id: u.id,
        status: "memorized",
        learnedOn: "2025-01-01",
        lastRevised: "2025-12-01",
        nextDue: "2027-01-01", // not overdue, purely tested on cycle slicing
        interval: 30,
        strength: "strong",
        history: [],
      };
    }

    const visitedUnitIds = new Set<string>();

    for (let day = 0; day < 30; day++) {
      const date = addDays("2026-01-01", day);
      const schedule = generateToday(plan, units, date, records);
      for (const m of schedule.manzil) {
        visitedUnitIds.add(m.id);
      }
    }

    // All 60 units must have been reviewed across the 30 days
    for (const u of memorizedSlice) {
      expect(visitedUnitIds.has(u.id)).toBe(true);
    }
  });

  it("Pause, Resume, Skip Day, and Move Lesson functions work correctly", () => {
    let plan = createMockPlan();
    expect(plan.paused).toBe(false);

    plan = togglePausePlan(plan);
    expect(plan.paused).toBe(true);

    plan = togglePausePlan(plan);
    expect(plan.paused).toBe(false);

    plan = skipDay(plan, "2026-01-05");
    expect(plan.skippedDates).toContain("2026-01-05");

    const record: UnitRecord = {
      id: "p1-l1-7",
      status: "learning",
      interval: 1,
      strength: "okay",
      history: [],
    };
    const moved = moveLesson(record, "2026-01-10");
    expect(moved.nextDue).toBe("2026-01-10");
    expect(moved.pausedUntil).toBe("2026-01-10");
  });

  describe("Custom Lesson Size and Pace Estimator", () => {
    it("dynamically generates correct estimated time and suggested pace names for any custom line count", () => {
      // 1-2 lines -> Gentle Starter Pace
      const p1 = getPaceEstimate(1);
      expect(p1.defaultPaceName).toBe("Gentle Starter Pace");
      expect(p1.timeEstimate).toBe("~3–5 mins");

      // 3 lines -> Gentle Pace
      const p3 = getPaceEstimate(3);
      expect(p3.defaultPaceName).toBe("Gentle Pace");
      expect(p3.timeEstimate).toBe("~7–10 mins");

      // 5 lines -> Balanced Pace
      const p5 = getPaceEstimate(5);
      expect(p5.defaultPaceName).toBe("Balanced Pace");
      expect(p5.timeEstimate).toBe("~11–17 mins");

      // 8 lines -> Standard Pace (Half Page)
      const p8 = getPaceEstimate(8);
      expect(p8.defaultPaceName).toBe("Standard Pace (Half Page)");
      expect(p8.timeEstimate).toBe("~18–27 mins");

      // 12 lines -> Intensive Pace
      const p12 = getPaceEstimate(12);
      expect(p12.defaultPaceName).toBe("Intensive Pace");
      expect(p12.timeEstimate).toBe("~26–41 mins");

      // 15 lines -> Full Page Daily
      const p15 = getPaceEstimate(15);
      expect(p15.defaultPaceName).toBe("Full Page Daily");
      expect(p15.timeEstimate).toBe("~33–51 mins");

      // 20 lines -> Accelerated Pace
      const p20 = getPaceEstimate(20);
      expect(p20.defaultPaceName).toBe("Accelerated Pace");
      expect(p20.timeEstimate).toBe("~44–68 mins");
    });

    it("generates mushaf units and runs scheduler with custom line sizes (e.g. 4 lines and 8 lines)", () => {
      const customUnits4 = generateMushafUnits(4, "forward");
      expect(customUnits4.length).toBeGreaterThan(0);
      expect(customUnits4[0].startLine).toBe(1);
      expect(customUnits4[0].endLine).toBe(4);

      const customPlan = createMockPlan({
        dailyLessonSize: 4,
        paceName: "My Custom Pace",
      });
      const schedule = generateToday(customPlan, customUnits4, "2026-01-01", {});
      expect(schedule.sabaq).not.toBeNull();
      expect(schedule.sabaq?.endLine).toBe(4);
    });
  });
});
