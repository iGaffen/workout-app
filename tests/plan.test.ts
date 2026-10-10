import { describe, expect, it } from "vitest";
import routines from "../src/data/routines.json";
import exercises from "../src/data/exercises.json";
import { estimateMinutes, holdFor, nextSessionId, setsFor } from "../src/model/plan";
import type { Exercise, Routine } from "../src/model/schema";

const R = routines[0] as Routine;
const exMap = new Map((exercises as Exercise[]).map((e) => [e.id, e]));
const ids = (i: number) => R.sessions[i].blocks.filter((b) => b.type === "exercise").map((b) => b.exerciseId);

describe("gym day lists", () => {
  it("is one routine with two alternating workouts", () => {
    expect(routines).toHaveLength(1);
    expect(R.sessions.map((s) => s.name)).toEqual(["Workout 1", "Workout 2"]);
  });
  it("splits the 11 chosen exercises between the two", () => {
    expect(ids(0)).toEqual(["leg-press", "seated-leg-curl", "lat-pulldown", "pec-deck", "standing-calf-raise"]);
    expect(ids(1)).toEqual(["goblet-squat", "seated-cable-row", "one-arm-dumbbell-row", "cable-chest-fly", "plank", "tibialis-raise"]);
  });
  it("each workout fits 45 minutes including the finisher", () => {
    for (const s of R.sessions) {
      const m = estimateMinutes(s, { phaseSets: 2 }, exMap);
      expect(m).toBeLessThanOrEqual(45);
      expect(m).toBeGreaterThanOrEqual(30);
    }
  });
  it("every exercise is 3 sets", () => {
    for (const s of R.sessions) for (const b of s.blocks.filter((x) => x.type === "exercise")) expect(setsFor(b, { phaseSets: 2 })).toBe(3);
  });
  it("alternates 1, 2, 1", () => {
    expect(nextSessionId(R, [])).toBe("w1");
    expect(nextSessionId(R, [{ id: "1", date: "2026-10-12", routineId: R.id, sessionId: "w1" }])).toBe("w2");
    expect(nextSessionId(R, [{ id: "1", date: "2026-10-12", routineId: R.id, sessionId: "w1" }, { id: "2", date: "2026-10-14", routineId: R.id, sessionId: "w2" }])).toBe("w1");
  });
  it("plank gets a 30 sec hold", () => {
    expect(holdFor(R.sessions[1].blocks.find((b) => b.exerciseId === "plank")!)).toBe(30);
  });
});
