import { describe, expect, it } from "vitest";
import exercises from "../src/data/exercises.json";
import { FLOOR_Y, LEN, dist, sample, solve, timeline, cycleLength, type Skeleton } from "../src/anim/solver";
import type { AnimationSpec } from "../src/model/schema";

function check(s: Skeleton, yawFree: boolean) {
  for (const side of [s.near, s.far]) {
    expect(dist(s.hip, s.shoulder)).toBeCloseTo(LEN.torso, 5);
    expect(dist(side.hip, side.knee)).toBeCloseTo(LEN.thigh, 5);
    expect(dist(side.knee, side.ankle)).toBeCloseTo(LEN.shin, 5);
    expect(dist(side.heel, side.toe)).toBeCloseTo(LEN.foot + LEN.heel, 5);
    // Arms: true 3D length is constant (2D length plus depth from arm yaw).
    const ua = Math.hypot(dist(side.shoulder, side.elbow), side.armDepth[0]);
    const fa = Math.hypot(dist(side.elbow, side.hand), side.armDepth[1]);
    if (yawFree) expect(dist(side.shoulder, side.elbow)).toBeCloseTo(LEN.upperArm, 5);
    expect(ua).toBeCloseTo(LEN.upperArm, 1);
    expect(fa).toBeCloseTo(LEN.forearm, 1);
  }
}

describe("pose solver", () => {
  it("standing pose is upright", () => {
    const s = solve({ root: [120, 88], torso: 0, near: {} });
    expect(s.shoulder[0]).toBeCloseTo(120);
    expect(s.shoulder[1]).toBeCloseTo(88 - LEN.torso);
    expect(s.near.ankle[1]).toBeCloseTo(88 + LEN.thigh + LEN.shin);
    expect(s.near.toe[0]).toBeGreaterThan(s.near.ankle[0]); // faces right
  });
  it("anchor pins a joint", () => {
    const s = solve({ torso: 30, near: { hip: 60, knee: 80, ankle: -20 }, anchor: { joint: "toe", at: [140, 149] } });
    expect(s.near.toe[0]).toBeCloseTo(140);
    expect(s.near.toe[1]).toBeCloseTo(149);
  });
  for (const e of exercises) {
    it(`${e.id}: constant limb lengths, stays on canvas, loops`, () => {
      const spec = e.animation as AnimationSpec;
      const segs = timeline(spec);
      const total = cycleLength(segs);
      const yawFree = !JSON.stringify(spec).includes("armYaw");
      let first = "";
      for (let t = 0; t <= total * 2; t += 37) {
        const { skel } = sample(spec, segs, t);
        check(skel, yawFree);
        for (const p of [skel.head, skel.near.toe, skel.near.hand, skel.far.toe])
          { expect(p[0]).toBeGreaterThan(-2); expect(p[0]).toBeLessThan(242); expect(p[1]).toBeLessThan(FLOOR_Y + 3); expect(p[1]).toBeGreaterThan(-2); }
        if (t === 0) first = JSON.stringify(skel);
      }
      // Seamless loop: end of a cycle equals the start (ignoring side swap).
      if (!spec.alternateSides) expect(JSON.stringify(sample(spec, segs, total * 3).skel)).toBe(first);
    });
  }
});
