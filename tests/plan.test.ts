import { describe, expect, it } from "vitest";
import routines from "../src/data/routines.json";
import { estimateMinutes, holdFor, nextSessionId, setsFor, step, type RunState } from "../src/model/plan";
import type { Routine } from "../src/model/schema";

const R = routines[0] as Routine;
const A = R.sessions[0];

describe("sets and phase", () => {
  it("main lifts follow phase, calves fixed at 2", () => {
    const leg = A.blocks.find((b) => b.exerciseId === "leg-press")!;
    const calf = A.blocks.find((b) => b.exerciseId === "standing-calf-raise")!;
    expect(setsFor(leg, { phaseSets: 2 })).toBe(2);
    expect(setsFor(leg, { phaseSets: 3 })).toBe(3);
    expect(setsFor(calf, { phaseSets: 3 })).toBe(2);
    expect(setsFor({ type: "text", title: "x" }, { phaseSets: 3 })).toBe(0);
  });
  it("plank gets a 30 sec hold", () => {
    expect(holdFor(A.blocks.find((b) => b.exerciseId === "plank")!)).toBe(30);
  });
  it("estimate grows with phase", () => {
    expect(estimateMinutes(A, { phaseSets: 3, defaultRest: 45 })).toBeGreaterThan(estimateMinutes(A, { phaseSets: 2, defaultRest: 45 }));
  });
});

describe("next session", () => {
  it("starts with A, then alternates", () => {
    expect(nextSessionId(R, [])).toBe("a");
    expect(nextSessionId(R, [{ id: "1", date: "2026-01-01", routineId: R.id, sessionId: "a" }])).toBe("b");
    expect(nextSessionId(R, [
      { id: "1", date: "2026-01-01", routineId: R.id, sessionId: "a" },
      { id: "2", date: "2026-01-03", routineId: R.id, sessionId: "b" },
    ])).toBe("a");
  });
});

describe("walk-through steps", () => {
  it("completes a whole session with taps only", () => {
    let st: RunState = { idx: 0, set: 1 };
    let finished = false, rests = 0, taps = 0;
    while (!finished && taps < 200) {
      const b = A.blocks[st.idx];
      const r = step(A, { phaseSets: 2 }, st, b.type === "text" ? "next" : "setDone");
      st = r.state; finished = r.finished; if (r.rest) rests++; taps++;
    }
    expect(finished).toBe(true);
    // 8 exercises x 2 sets: 8 between-set rests + 7 between-exercise rests (none after the last exercise before the finisher? there is one).
    expect(rests).toBe(16);
  });
  it("back and skip reset the set counter and clamp", () => {
    expect(step(A, { phaseSets: 2 }, { idx: 0, set: 1 }, "back").state).toEqual({ idx: 0, set: 1 });
    expect(step(A, { phaseSets: 2 }, { idx: 2, set: 2 }, "skip").state).toEqual({ idx: 3, set: 1 });
  });
});
