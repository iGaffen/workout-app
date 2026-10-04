import type { AnimationSpec, Pose } from "../model/schema";

/** Fixed limb lengths in SVG units (canvas 240 x 170, floor at y = 152). */
export const LEN = {
  torso: 44, neck: 9, headR: 9,
  upperArm: 25, forearm: 23,
  thigh: 32, shin: 31, foot: 15, heel: 5,
} as const;

export const FLOOR_Y = 152;

export type Pt = [number, number];
export interface Side { shoulder: Pt; elbow: Pt; hand: Pt; hip: Pt; knee: Pt; ankle: Pt; heel: Pt; toe: Pt; armDepth: [number, number] }
export interface Skeleton { hip: Pt; shoulder: Pt; neck: Pt; head: Pt; torsoAngle: number; near: Side; far: Side }

const rad = (d: number) => (d * Math.PI) / 180;
/** Direction for an absolute angle `a`: 0 = straight down, 90 = forward (+x), 180 = up. */
export const dir = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Pt, d: Pt, l: number, sx = 1): Pt => [p[0] + d[0] * l * sx, p[1] + d[1] * l];

type Limb = NonNullable<Pose["far"]>;
const full = (l: Limb | undefined, base: Limb): Required<Limb> => ({
  shoulder: l?.shoulder ?? base.shoulder ?? 0,
  armYaw: l?.armYaw ?? base.armYaw ?? 0,
  elbow: l?.elbow ?? base.elbow ?? 0,
  hip: l?.hip ?? base.hip ?? 0,
  knee: l?.knee ?? base.knee ?? 0,
  ankle: l?.ankle ?? base.ankle ?? 0,
});

function solveSide(hip: Pt, shoulder: Pt, torso: number, l: Required<Limb>): Side {
  // Arm: angles in the sagittal plane, then optional yaw (horizontal abduction) foreshortens the forward component.
  const ua = -torso + l.shoulder;
  const fa = ua + l.elbow;
  const yaw = Math.cos(rad(l.armYaw));
  const depthK = Math.sin(rad(l.armYaw));
  const d1 = dir(ua), d2 = dir(fa);
  const elbow = add(shoulder, d1, LEN.upperArm, yaw);
  const hand = add(elbow, d2, LEN.forearm, yaw);
  // Leg
  const th = -torso + l.hip;
  const sh = th - l.knee;
  const ft = sh + 90 - l.ankle;
  const knee = add(hip, dir(th), LEN.thigh);
  const ankle = add(knee, dir(sh), LEN.shin);
  const toe = add(ankle, dir(ft), LEN.foot);
  const heel = add(ankle, dir(ft), -LEN.heel);
  return { shoulder, elbow, hand, hip, knee, ankle, heel, toe, armDepth: [d1[0] * depthK * LEN.upperArm, d2[0] * depthK * LEN.forearm] };
}

/** Forward kinematics: joint angles -> joint positions. Limb lengths never change. */
export function solve(p: Pose, rootOverride?: Pt): Skeleton {
  const near = full(p.near, {});
  const far = full(p.far, p.near);
  const build = (hip: Pt): Skeleton => {
    const up = dir(180 - p.torso);
    const shoulder = add(hip, up, LEN.torso);
    const headDir = dir(180 - p.torso - (p.neck ?? 0));
    const neck = add(shoulder, headDir, LEN.neck * 0.4);
    const head = add(shoulder, headDir, LEN.neck + LEN.headR * 0.55);
    return { hip, shoulder, neck, head, torsoAngle: p.torso, near: solveSide(hip, shoulder, p.torso, near), far: solveSide(hip, shoulder, p.torso, far) };
  };
  if (rootOverride) return build(rootOverride);
  if (p.anchor) {
    const probe = build([0, 0]);
    const j = jointOf(probe, p.anchor.joint, p.anchor.side ?? "near");
    return build([p.anchor.at[0] - j[0], p.anchor.at[1] - j[1]]);
  }
  return build(p.root ?? [120, 88]);
}

export function jointOf(s: Skeleton, joint: string, side: "near" | "far" = "near"): Pt {
  if (joint === "hip") return s.hip;
  if (joint === "shoulder") return s.shoulder;
  if (joint === "head") return s.head;
  if (joint === "chest") return [(s.shoulder[0] * 3 + s.hip[0]) / 4, (s.shoulder[1] * 3 + s.hip[1]) / 4];
  const sd = s[side] as unknown as Record<string, Pt>;
  return sd[joint] ?? s.hip;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpOpt = (a: number | undefined, b: number | undefined, u: number) =>
  a === undefined && b === undefined ? undefined : lerp(a ?? 0, b ?? 0, u);

function lerpLimb(a: Limb | undefined, b: Limb | undefined, base: [Limb, Limb], u: number): Limb {
  const A = full(a, base[0]), B = full(b, base[1]);
  return {
    shoulder: lerp(A.shoulder, B.shoulder, u), armYaw: lerp(A.armYaw, B.armYaw, u), elbow: lerp(A.elbow, B.elbow, u),
    hip: lerp(A.hip, B.hip, u), knee: lerp(A.knee, B.knee, u), ankle: lerp(A.ankle, B.ankle, u),
  };
}

/** Interpolate two poses in joint-angle space, then solve. */
export function blend(a: Pose, b: Pose, u: number): Skeleton {
  const pose: Pose = {
    torso: lerp(a.torso, b.torso, u),
    neck: lerpOpt(a.neck, b.neck, u),
    near: lerpLimb(a.near, b.near, [{}, {}], u),
    far: lerpLimb(a.far, b.far, [a.near, b.near], u),
  };
  if (a.anchor && b.anchor && a.anchor.joint === b.anchor.joint && (a.anchor.side ?? "near") === (b.anchor.side ?? "near")) {
    pose.anchor = { joint: a.anchor.joint, side: a.anchor.side, at: [lerp(a.anchor.at[0], b.anchor.at[0], u), lerp(a.anchor.at[1], b.anchor.at[1], u)] };
    return solve(pose);
  }
  const ra = solve(a).hip, rb = solve(b).hip;
  return solve(pose, [lerp(ra[0], rb[0], u), lerp(ra[1], rb[1], u)]);
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface Segment { from: Pose; to: Pose; dur: number; ease: "inOut" | "linear"; label: string }

/** Turn keyframes into a timeline of segments. See docs/pack-schema.md for timing rules. */
export function timeline(spec: AnimationSpec): Segment[] {
  const k = spec.keyframes;
  const segs: Segment[] = [];
  for (let i = 1; i < k.length; i++) segs.push({ from: k[i - 1].pose, to: k[i].pose, dur: k[i].durationMs, ease: k[i].ease ?? "inOut", label: k[i].name });
  if (spec.loop === "cycle") {
    segs.push({ from: k[k.length - 1].pose, to: k[0].pose, dur: k[0].durationMs, ease: k[0].ease ?? "inOut", label: k[0].name });
  } else {
    for (let i = k.length - 1; i > 0; i--) segs.push({ from: k[i].pose, to: k[i - 1].pose, dur: k[i].durationMs, ease: k[i].ease ?? "inOut", label: k[i - 1].name });
  }
  return segs;
}

export const cycleLength = (segs: Segment[]) => segs.reduce((s, x) => s + Math.max(x.dur, 1), 0);

const swapSides = (p: Pose): Pose => ({ ...p, near: { ...p.near, ...(p.far ?? {}) }, far: { ...p.near } });

/** Skeleton + phase label at time t (ms). */
export function sample(spec: AnimationSpec, segs: Segment[], t: number): { skel: Skeleton; label: string; cycle: number } {
  const total = cycleLength(segs);
  const cycle = Math.floor(t / total);
  let r = t - cycle * total;
  for (const s of segs) {
    const d = Math.max(s.dur, 1);
    if (r <= d) {
      const raw = r / d;
      const u = s.ease === "linear" ? raw : easeInOut(raw);
      let from = s.from, to = s.to;
      if (spec.alternateSides && cycle % 2 === 1) { from = swapSides(from); to = swapSides(to); }
      return { skel: blend(from, to, u), label: s.label, cycle };
    }
    r -= d;
  }
  const last = segs[segs.length - 1];
  return { skel: blend(last.to, last.to, 0), label: last.label, cycle };
}

/** Still frames for the start / end strip: first keyframe and the "furthest" one (last for pingpong, middle for cycle). */
export function endPoses(spec: AnimationSpec): [Pose, Pose] {
  const k = spec.keyframes;
  const endIdx = spec.loop === "pingpong" ? k.length - 1 : Math.max(1, Math.floor(k.length / 2));
  return [k[0].pose, k[endIdx].pose];
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
