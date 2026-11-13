import { describe, expect, it } from "vitest";
import routines from "../src/data/routines.json";
import exercises from "../src/data/exercises.json";
import { estimateMinutes, setsFor } from "../src/model/plan";
import type { Exercise, Routine } from "../src/model/schema";

const R = routines[0] as Routine;
const S = R.sessions[0];
const exMap = new Map((exercises as Exercise[]).map((e) => [e.id, e]));

describe("gym day list", () => {
  it("is one routine with one session", () => {
    expect(routines).toHaveLength(1);
    expect(R.sessions).toHaveLength(1);
  });
  it("has your 7 slots in order, shoulders as either/or", () => {
    const blocks = S.blocks.filter((b) => b.type === "exercise");
    expect(blocks.map((b) => b.exerciseId)).toEqual(["lat-pulldown", "ez-bar-preacher-curl", "triceps-rope-pushdown", "leg-press",
      "barbell-bench-press", "goblet-squat", "cable-lateral-raise"]);
    const sh = blocks[6];
    expect(sh.title).toBe("Shoulders");
    expect(sh.alternatives).toEqual(["shoulder-press-machine"]);
  });
  it("every slot is 3 sets of 10-12", () => {
    for (const b of S.blocks.filter((x) => x.type === "exercise")) {
      expect(setsFor(b, { phaseSets: 2 })).toBe(3);
      expect(b.reps).toMatch(/^10–12/);
    }
  });
  it("fits 45 minutes, with no finisher", () => {
    expect(S.blocks.some((b) => /finisher/i.test(b.title ?? ""))).toBe(false);
    expect(estimateMinutes(S, { phaseSets: 2 }, exMap)).toBeLessThanOrEqual(45);
  });
  it("every slot and alternative points to a real exercise", () => {
    for (const b of S.blocks.filter((x) => x.type === "exercise"))
      for (const id of [b.exerciseId!, ...(b.alternatives ?? [])]) expect(exMap.has(id), id).toBe(true);
  });
});
