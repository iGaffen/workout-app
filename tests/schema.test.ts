import { describe, expect, it } from "vitest";
import exercises from "../src/data/exercises.json";
import routines from "../src/data/routines.json";
import { ExerciseSchema, RoutineSchema } from "../src/model/schema";
import { parsePack, previewPack, summary } from "../src/model/pack";

describe("seed data", () => {
  it("has 16 valid exercises", () => {
    expect(exercises).toHaveLength(16);
    for (const e of exercises) expect(ExerciseSchema.safeParse(e).success, e.id).toBe(true);
  });
  it("routine is valid and references real exercises", () => {
    const ids = new Set(exercises.map((e) => e.id));
    for (const r of routines) {
      expect(RoutineSchema.safeParse(r).success).toBe(true);
      for (const s of r.sessions) for (const b of s.blocks) if (b.type === "exercise") expect(ids.has(b.exerciseId!), b.exerciseId).toBe(true);
    }
  });
});

describe("pack import", () => {
  const ex = exercises[0];
  it("rejects broken JSON", () => {
    const r = parsePack("{nope");
    expect(r.ok).toBe(false);
  });
  it("names the wrong field", () => {
    const bad = { exercises: [{ ...ex, muscles: { primary: ["quadz"], secondary: [] } }] };
    const r = parsePack(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("exercises[0].muscles.primary[0]");
  });
  it("rejects non kebab-case ids and unknown top-level keys", () => {
    expect(parsePack(JSON.stringify({ exercises: [{ ...ex, id: "Leg Press" }] })).ok).toBe(false);
    expect(parsePack(JSON.stringify({ exercizes: [] })).ok).toBe(false);
  });
  it("rejects duplicate ids", () => {
    expect(parsePack(JSON.stringify({ exercises: [ex, ex] })).ok).toBe(false);
  });
  it("accepts a bare exercise or array", () => {
    expect(parsePack(JSON.stringify(ex)).ok).toBe(true);
    expect(parsePack(JSON.stringify([ex])).ok).toBe(true);
  });
  it("previews adds vs updates", () => {
    const r = parsePack(JSON.stringify({ exercises: [ex, { ...ex, id: "new-one", name: "New one" }], remove: ["plank"] }));
    if (!r.ok) throw new Error(r.error);
    const pv = previewPack(r.pack, exercises.map((e) => e.id), []);
    expect(pv.add).toEqual(["New one"]);
    expect(pv.update).toEqual([ex.name]);
    expect(summary(pv)).toBe("Adds 1 exercise, updates 1 exercise, removes 1 item");
  });
  it("flags routines that use unknown exercises", () => {
    const r = parsePack(JSON.stringify({ routines: [{ id: "x", name: "X", sessions: [{ id: "a", name: "A", blocks: [{ type: "exercise", exerciseId: "ghost" }] }] }] }));
    if (!r.ok) throw new Error(r.error);
    expect(previewPack(r.pack, [], []).missingRefs).toEqual(["ghost"]);
  });
});
