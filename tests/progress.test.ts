import { describe, expect, it } from "vitest";
import { daysUntilDue, effectiveSettings, lastWeight, trainingWeek, weekStart, weeklyAverages, workoutsThisWeek, takesWeight } from "../src/model/progress";
import { DEFAULT_SETTINGS } from "../src/model/plan";
import exercises from "../src/data/exercises.json";
import type { Exercise, WorkoutLog } from "../src/model/schema";

const log = (date: string, sets?: WorkoutLog["sets"]): WorkoutLog => ({ id: date, date, routineId: "r", sessionId: "a", sets });

describe("auto phase", () => {
  it("2 sets in weeks 1-3, 3 from week 4", () => {
    const logs = [log("2026-01-01T10:00:00Z")];
    expect(trainingWeek([], new Date("2026-05-01"))).toBe(1);
    expect(effectiveSettings(DEFAULT_SETTINGS, logs, new Date("2026-01-21T10:00:00Z")).phaseSets).toBe(2);
    expect(trainingWeek(logs, new Date("2026-01-22T10:00:00Z"))).toBe(4);
    expect(effectiveSettings(DEFAULT_SETTINGS, logs, new Date("2026-01-22T10:00:00Z")).phaseSets).toBe(3);
  });
  it("manual setting wins when auto is off", () => {
    const s = { ...DEFAULT_SETTINGS, phaseAuto: false, phaseSets: 2 };
    expect(effectiveSettings(s, [log("2025-01-01T10:00:00Z")]).phaseSets).toBe(2);
  });
});

describe("weekly count", () => {
  it("weeks start on Sunday", () => {
    expect(weekStart(new Date(2026, 9, 4))).toBe("2026-10-04"); // Sunday
    expect(weekStart(new Date(2026, 9, 10))).toBe("2026-10-04"); // Saturday
  });
  it("counts workouts this week only", () => {
    const now = new Date(2026, 9, 8, 12);
    const logs = [log(new Date(2026, 9, 4, 9).toISOString()), log(new Date(2026, 9, 6, 9).toISOString()), log(new Date(2026, 9, 2, 9).toISOString())];
    expect(workoutsThisWeek(logs, now)).toBe(2);
  });
});

describe("last weight", () => {
  it("uses the most recent log for that exercise", () => {
    const logs = [
      log("2026-01-01T10:00:00Z", [{ exerciseId: "leg-press", setIndex: 1, weightKg: 40 }]),
      log("2026-01-05T10:00:00Z", [{ exerciseId: "leg-press", setIndex: 1, weightKg: 45 }, { exerciseId: "leg-press", setIndex: 2, weightKg: 45 }]),
      log("2026-01-08T10:00:00Z", [{ exerciseId: "pec-deck", setIndex: 1, weightKg: 20 }]),
    ];
    expect(lastWeight(logs, "leg-press")).toMatchObject({ weightKg: 45, sets: 2 });
    expect(lastWeight(logs, "plank")).toBeUndefined();
  });
  it("bodyweight moves take no weight", () => {
    const by = (id: string) => exercises.find((e) => e.id === id) as Exercise;
    expect(takesWeight(by("plank"))).toBe(false);
    expect(takesWeight(by("tibialis-raise"))).toBe(false);
    expect(takesWeight(by("leg-press"))).toBe(true);
    expect(takesWeight(by("standing-calf-raise"))).toBe(true);
  });
});

describe("body trends", () => {
  it("averages per week, skipping missing values", () => {
    const body = [
      { id: "1", date: "2026-10-04", weightKg: 90 },
      { id: "2", date: "2026-10-06", weightKg: 89, waistCm: 100 },
      { id: "3", date: "2026-10-12", weightKg: 88.5 },
    ];
    expect(weeklyAverages(body, "weightKg")).toEqual([{ week: "2026-10-04", avg: 89.5, n: 2 }, { week: "2026-10-11", avg: 88.5, n: 1 }]);
    expect(weeklyAverages(body, "waistCm")).toEqual([{ week: "2026-10-04", avg: 100, n: 1 }]);
  });
  it("reminders come due", () => {
    expect(daysUntilDue(null, 30)).toBe(0);
    expect(daysUntilDue("2026-01-01T00:00:00Z", 28, new Date("2026-01-10T00:00:00Z"))).toBe(19);
    expect(daysUntilDue("2026-01-01T00:00:00Z", 28, new Date("2026-02-10T00:00:00Z"))).toBeLessThanOrEqual(0);
  });
});
