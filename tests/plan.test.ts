import { describe, expect, it } from "vitest";
import routines from "../src/data/routines.json";
import { holdFor, setsFor } from "../src/model/plan";
import type { Routine } from "../src/model/schema";

const R = routines[0] as Routine;
const S = R.sessions[0];

describe("gym day list", () => {
  it("is one routine with one session", () => {
    expect(routines).toHaveLength(1);
    expect(R.sessions).toHaveLength(1);
  });
  it("has the 11 chosen exercises, warm-up first and finisher last", () => {
    const ids = S.blocks.filter((b) => b.type === "exercise").map((b) => b.exerciseId);
    expect(ids).toEqual(["leg-press", "goblet-squat", "seated-leg-curl", "lat-pulldown", "seated-cable-row", "one-arm-dumbbell-row",
      "pec-deck", "cable-chest-fly", "plank", "standing-calf-raise", "tibialis-raise"]);
    expect(S.blocks[0].title).toBe("Warm-up");
    expect(S.blocks[S.blocks.length - 1].title).toBe("Finisher");
  });
  it("every exercise is 3 sets, whatever the phase setting", () => {
    for (const b of S.blocks.filter((x) => x.type === "exercise")) expect(setsFor(b, { phaseSets: 2 })).toBe(3);
    expect(setsFor({ type: "exercise", exerciseId: "x", sets: "phase" }, { phaseSets: 2 })).toBe(2);
  });
  it("plank gets a 30 sec hold", () => {
    expect(holdFor(S.blocks.find((b) => b.exerciseId === "plank")!)).toBe(30);
  });
});
