/**
 * 3D mannequin stage. The movement comes from the same joint-angle solver as the 2D figure:
 * each frame's side-view skeleton is lifted into 3D (near limbs toward the camera, far limbs away),
 * then capsules, joints and equipment are placed on it. Limb lengths stay fixed in 3D.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { AnimationSpec, EquipmentSpec } from "../../model/schema";
import { FLOOR_Y, LEN, solve, type Pt, type Skeleton } from "../solver";

// ---------- Units: 40 solver units = 1 scene unit; x forward, y up, z toward the viewer's right ----------
const U = 40;
const v3 = (p: Pt, z = 0) => new THREE.Vector3((p[0] - 120) / U, (FLOOR_Y - p[1]) / U, z);
const HIP_Z = 0.19, SHOULDER_Z = 0.38;
const L = { upper: LEN.upperArm / U, fore: LEN.forearm / U, thigh: LEN.thigh / U, shin: LEN.shin / U };

/** Per-exercise 3D setup: grip width, which side a low pulley sits on, single-column frames. */
/** camYaw: viewing angle (radians from the side view toward the front); zoom > 1 frames tighter. */
interface Setup { spread: number; pulleyZ?: number; cableTo?: "near" | "center"; centerFrames?: number[]; camYaw?: number; zoom?: number }
const SETUP: Record<string, Setup> = {
  "lat-pulldown": { spread: 1.75, cableTo: "center", zoom: 1.2, camYaw: 0.75 },
  "seated-cable-row": { spread: 0.42, cableTo: "center" },
  "ez-bar-preacher-curl": { spread: 0.8, centerFrames: [0] },
  "triceps-rope-pushdown": { spread: 0.35, cableTo: "center", zoom: 1.15 },
  "leg-press": { spread: 1.1, centerFrames: [0, 1] },
  "barbell-bench-press": { spread: 1.5 },
  "goblet-squat": { spread: 0.22 },
  "cable-lateral-raise": { spread: 1, pulleyZ: -0.95, cableTo: "near", camYaw: 1.3, zoom: 1.1 },
  "shoulder-press-machine": { spread: 1.3, camYaw: 0.85 },
};

// ---------- Materials (brand: obsidian satin body, lume working limbs, champagne-gold joints) ----------
function materials() {
  return {
    body: new THREE.MeshPhysicalMaterial({ color: 0x2c2833, roughness: 0.4, metalness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.2, sheen: 0.12, sheenColor: new THREE.Color(0xc9b4ff) }),
    work: new THREE.MeshPhysicalMaterial({ color: 0xb9a4ff, emissive: 0x8b6cff, emissiveIntensity: 1.15, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe3c98f, metalness: 1, roughness: 0.26, emissive: 0x3a2a10, emissiveIntensity: 0.25 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5a5368, metalness: 0.85, roughness: 0.32 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2a2533, metalness: 0.7, roughness: 0.42 }),
    pad: new THREE.MeshPhysicalMaterial({ color: 0x1c1824, roughness: 0.62, metalness: 0.05, sheen: 0.6, sheenColor: new THREE.Color(0x4e4760) }),
    plate: new THREE.MeshStandardMaterial({ color: 0x141118, metalness: 0.55, roughness: 0.38 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x8c8499, metalness: 0.9, roughness: 0.3 }),
  };
}
type Mats = ReturnType<typeof materials>;

// ---------- Geometry helpers ----------
const UP = new THREE.Vector3(0, 1, 0);
/** Place a unit-height mesh (along +y, centred) between two points. */
function between(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, scaleLen = false) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length() || 1e-4;
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
  if (scaleLen) m.scale.y = len;
}
const capsule = (r: number, len: number, mat: THREE.Material) => new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.001), 6, 18), mat);
const sphere = (r: number, mat: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
const box = (x: number, y: number, z: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat);
const rod = (r: number, mat: THREE.Material) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16), mat);
function plateDisc(r: number, t: number, m: Mats) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 40), m.plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.012, 0.014, 8, 48), m.gold);
  rim.rotation.x = Math.PI / 2; rim.position.y = t / 2;
  const rim2 = rim.clone(); rim2.position.y = -t / 2;
  g.add(disc, rim, rim2);
  return g; // axis along local y
}

// ---------- Lifting a side-view skeleton into 3D ----------
export interface Body3 {
  hip: THREE.Vector3; chest: THREE.Vector3; neck: THREE.Vector3; head: THREE.Vector3;
  sides: { s: THREE.Vector3; e: THREE.Vector3; h: THREE.Vector3; hip: THREE.Vector3; k: THREE.Vector3; a: THREE.Vector3; heel: THREE.Vector3; toe: THREE.Vector3 }[];
}
function lift(k: Skeleton, spread: number): Body3 {
  const sides = ([["near", 1], ["far", -1]] as const).map(([name, sign]) => {
    const sd = k[name];
    const s = v3(sd.shoulder, sign * SHOULDER_Z);
    // Arm: side-view direction, plus sideways reach from the grip width and from arm yaw (flyes, lateral raise).
    const zE = sign * (SHOULDER_Z * (1 + (spread - 1) * 0.55)) + sign * sd.armDepth[0] / U;
    const zH = sign * (SHOULDER_Z * spread) + sign * (sd.armDepth[0] + sd.armDepth[1]) / U;
    const eRaw = v3(sd.elbow, zE), hRaw = v3(sd.hand, zH);
    const e = s.clone().add(eRaw.sub(s).normalize().multiplyScalar(L.upper));
    const h = e.clone().add(hRaw.sub(e).normalize().multiplyScalar(L.fore));
    const z = sign * HIP_Z;
    return { s, e, h, hip: v3(sd.hip, z), k: v3(sd.knee, z), a: v3(sd.ankle, z), heel: v3(sd.heel, z), toe: v3(sd.toe, z) };
  });
  const hip = v3(k.hip), sh = v3(k.shoulder);
  return { hip, chest: hip.clone().lerp(sh, 0.72), neck: v3(k.neck), head: v3(k.head), sides };
}

/** Limb segments that move more than 20° across the keyframes glow as "working" (build pack: lume limbs). */
function workingSegments(spec: AnimationSpec, spread: number): Set<string> {
  const bodies = spec.keyframes.map((kf) => lift(solve(kf.pose), spread));
  const seg = (b: Body3, i: number, name: string) => {
    const s = b.sides[i];
    const [p, q] = name === "upper" ? [s.s, s.e] : name === "fore" ? [s.e, s.h] : name === "thigh" ? [s.hip, s.k] : [s.k, s.a];
    return q.clone().sub(p).normalize();
  };
  const out = new Set<string>();
  for (const i of [0, 1]) for (const name of ["upper", "fore", "thigh", "shin"]) {
    const ref = seg(bodies[0], i, name);
    const max = Math.max(...bodies.map((b) => ref.angleTo(seg(b, i, name))));
    if (max > (20 * Math.PI) / 180) out.add(`${i}:${name}`);
  }
  return out;
}

// ---------- The mannequin ----------
function buildBody(m: Mats, working: Set<string>) {
  const g = new THREE.Group();
  // Glow is per side, so a one-arm exercise lights only the working arm.
  const sides = [0, 1].map((i) => ({
    upper: capsule(0.085, L.upper, working.has(`${i}:upper`) ? m.work : m.body), fore: capsule(0.07, L.fore, working.has(`${i}:fore`) ? m.work : m.body),
    thigh: capsule(0.12, L.thigh, working.has(`${i}:thigh`) ? m.work : m.body), shin: capsule(0.09, L.shin, working.has(`${i}:shin`) ? m.work : m.body),
    foot: capsule(0.06, 20 / U, m.body),
    shoulderJ: sphere(0.1, m.gold), elbowJ: sphere(0.072, m.gold), hand: sphere(0.07, m.gold),
    hipJ: sphere(0.11, m.gold), kneeJ: sphere(0.09, m.gold), ankleJ: sphere(0.065, m.gold),
  }));
  // Torso: pelvis, waist, ribcage and shoulder yoke, all ellipsoids for a sculpted mannequin.
  const pelvis = sphere(1, m.body), waist = sphere(1, m.body), chest = sphere(1, m.body), yoke = capsule(0.11, SHOULDER_Z * 2 + 0.1, m.body);
  const neck = capsule(0.07, 0.22, m.body), head = sphere(1, m.body);
  g.add(pelvis, waist, chest, yoke, neck, head);
  sides.forEach((s) => g.add(...Object.values(s)));
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    group: g,
    update(b: Body3) {
      const spine = new THREE.Vector3().subVectors(b.chest, b.hip).normalize();
      const orient = (o: THREE.Object3D) => o.quaternion.setFromUnitVectors(UP, spine);
      pelvis.position.copy(b.hip).addScaledVector(spine, 0.05); orient(pelvis); pelvis.scale.set(0.24, 0.2, 0.3);
      waist.position.copy(b.hip).lerp(b.chest, 0.45); orient(waist); waist.scale.set(0.2, 0.3, 0.25);
      chest.position.copy(b.chest); orient(chest); chest.scale.set(0.26, 0.3, 0.36);
      const sL = b.sides[0].s, sR = b.sides[1].s;
      between(yoke, sR, sL);
      const neckBase = sL.clone().lerp(sR, 0.5);
      const headDir = new THREE.Vector3().subVectors(b.head, neckBase).normalize();
      between(neck, neckBase, neckBase.clone().addScaledVector(headDir, 0.26));
      head.position.copy(b.head).addScaledVector(headDir, 0.04);
      head.quaternion.setFromUnitVectors(UP, headDir); head.scale.set(0.16, 0.2, 0.15);
      b.sides.forEach((p, i) => {
        const s = sides[i];
        between(s.upper, p.s, p.e); between(s.fore, p.e, p.h);
        between(s.thigh, p.hip, p.k); between(s.shin, p.k, p.a);
        between(s.foot, p.heel, p.toe);
        s.shoulderJ.position.copy(p.s); s.elbowJ.position.copy(p.e); s.hand.position.copy(p.h);
        s.hipJ.position.copy(p.hip); s.kneeJ.position.copy(p.k); s.ankleJ.position.copy(p.a);
      });
    },
  };
}

// ---------- Equipment ----------
interface Eq { group: THREE.Group; update(b: Body3, k: Skeleton): void }
function buildEquipment(list: EquipmentSpec[], m: Mats, setup: Setup, start: Body3): Eq {
  const g = new THREE.Group();
  const updates: ((b: Body3, k: Skeleton) => void)[] = [];
  let frameIdx = -1;
  const torsoMid = start.hip.clone().lerp(start.chest, 0.5);
  const handsMid = (b: Body3) => b.sides[0].h.clone().lerp(b.sides[1].h, 0.5);

  for (const e of list) {
    const at = e.at ? v3(e.at) : new THREE.Vector3();
    const to = e.to ? v3(e.to) : at.clone();
    switch (e.kind) {
      case "bench": {
        const len = Math.abs(to.x - at.x);
        const top = box(len, 0.16, 0.62, m.pad); top.position.set((at.x + to.x) / 2, at.y - 0.06, 0);
        const frame = box(len * 0.92, 0.06, 0.4, m.frame); frame.position.set(top.position.x, at.y - 0.17, 0);
        g.add(top, frame);
        for (const fx of [at.x + 0.25, to.x - 0.25]) { const leg = rod(0.04, m.frame); between(leg, new THREE.Vector3(fx, at.y - 0.17, 0), new THREE.Vector3(fx, 0, 0), true); g.add(leg); const foot = box(0.08, 0.04, 0.6, m.frame); foot.position.set(fx, 0.02, 0); g.add(foot); }
        break;
      }
      case "seat": {
        const sz = e.size ?? 1;
        const top = box(0.75 * sz, 0.16, 0.7, m.pad); top.position.set(at.x, at.y - 0.06, 0);
        const post = rod(0.05, m.frame); between(post, new THREE.Vector3(at.x, at.y - 0.14, 0), new THREE.Vector3(at.x, 0, 0), true);
        const base = box(0.7, 0.05, 0.6, m.frame); base.position.set(at.x, 0.025, 0);
        g.add(top, post, base);
        break;
      }
      case "backpad": {
        // The pad sits on the side of the line away from the body it supports.
        const d = new THREE.Vector3().subVectors(to, at); const len = d.length();
        const mid = at.clone().lerp(to, 0.5);
        const n = new THREE.Vector3(-d.y, d.x, 0).normalize();
        const body = torsoMid.distanceTo(mid) < start.sides[0].e.clone().setZ(0).distanceTo(mid) ? torsoMid : start.sides[0].s.clone().lerp(start.sides[0].e, 0.5).setZ(0);
        if (n.dot(new THREE.Vector3().subVectors(body, mid)) > 0) n.negate();
        const pad = box(0.16, len + 0.1, 0.62, m.pad);
        pad.position.copy(mid).addScaledVector(n, 0.04);
        pad.quaternion.setFromUnitVectors(UP, d.clone().normalize());
        const shell = box(0.05, len, 0.5, m.frame); shell.position.copy(mid).addScaledVector(n, 0.15); shell.quaternion.copy(pad.quaternion);
        g.add(pad, shell);
        break;
      }
      case "pad": {
        if ((e.angle ?? 0) === 0 && !e.attach) {
          const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 24), m.pad);
          roller.rotation.x = Math.PI / 2; roller.position.copy(at); g.add(roller);
          const arm = rod(0.035, m.frame); between(arm, at, new THREE.Vector3(at.x + 0.45, at.y, 0), true); g.add(arm);
        } else {
          const plate = box(0.08, 0.55, 0.7, m.frame);
          plate.position.copy(at); plate.rotation.z = -(((e.angle ?? 0) - 90) * Math.PI) / 180; g.add(plate);
          const base = rod(0.04, m.frame); between(base, at, new THREE.Vector3(at.x, 0, 0), true); g.add(base);
        }
        break;
      }
      case "frame": {
        frameIdx++;
        const zs = setup.centerFrames?.includes(frameIdx) ? [0] : [-0.62, 0.62];
        for (const z of zs) { const beam = box(0.09, 1, 0.09, m.frame); between(beam, at.clone().setZ(z), to.clone().setZ(z), true); g.add(beam); }
        if (zs.length === 2 && Math.abs(to.y - at.y) > Math.abs(to.x - at.x)) {
          const cap = box(0.09, 1.24, 0.09, m.frame); cap.position.copy(at.y > to.y ? at : to); cap.rotation.x = Math.PI / 2; g.add(cap);
        }
        break;
      }
      case "pulley": {
        const z = setup.pulleyZ ?? 0;
        const p = at.clone().setZ(z);
        const top = Math.max(p.y + 0.35, 1.2);
        const col = box(0.2, top, 0.2, m.frame); col.position.set(p.x + 0.16, top / 2, z); g.add(col);
        const stack = box(0.16, Math.min(top * 0.4, 1), 0.14, m.plate); stack.position.set(p.x + 0.16, 0.06 + Math.min(top * 0.4, 1) / 2, z + (z === 0 ? 0.18 : -0.18 * Math.sign(z))); g.add(stack);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 10, 28), m.steel); wheel.position.copy(p); g.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12), m.gold); hub.rotation.x = Math.PI / 2; hub.position.copy(p); g.add(hub);
        break;
      }
      case "cable": {
        const from = v3(e.from ?? [230, 90], setup.pulleyZ ?? 0);
        const c = rod(0.012, m.cable); g.add(c);
        updates.push((b) => between(c, from, setup.cableTo === "near" ? b.sides[0].h : handsMid(b), true));
        break;
      }
      case "handle": {
        const h = rod(0.03, m.steel); g.add(h);
        const knobs = [sphere(0.04, m.gold), sphere(0.04, m.gold)]; g.add(...knobs);
        updates.push((b) => {
          const a = b.sides[0].h, c = b.sides[1].h;
          if (setup.cableTo === "near") { between(h, a.clone().add(new THREE.Vector3(0, 0.07, 0)), a.clone().add(new THREE.Vector3(0, -0.07, 0)), true); knobs.forEach((k) => k.position.copy(a)); return; }
          const dir = new THREE.Vector3().subVectors(c, a).normalize();
          between(h, a.clone().addScaledVector(dir, -0.06), c.clone().addScaledVector(dir, 0.06), true);
          knobs[0].position.copy(a).addScaledVector(dir, -0.07); knobs[1].position.copy(c).addScaledVector(dir, 0.07);
        });
        break;
      }
      case "bar": {
        const lenBar = (e.size ?? 1) < 0.8 ? 1.25 : 2.1;
        const bar = rod(0.026, m.steel); g.add(bar);
        const plates = (e.size ?? 1) < 0.8 ? [plateDisc(0.17, 0.04, m), plateDisc(0.17, 0.04, m)] : [];
        if (plates.length) g.add(...plates);
        updates.push((b) => {
          const c = handsMid(b);
          between(bar, c.clone().setZ(-lenBar / 2), c.clone().setZ(lenBar / 2), true);
          plates.forEach((p, i) => { p.position.copy(c).setZ((i ? 1 : -1) * (lenBar / 2 - 0.12)); p.rotation.x = Math.PI / 2; });
        });
        break;
      }
      case "dumbbell": {
        if ((e.size ?? 1) >= 1.4) {
          // Olympic barbell with plates and collars.
          const bar = rod(0.028, m.steel); g.add(bar);
          const plates = [-1, 1].flatMap((s) => [plateDisc(0.45, 0.07, m), plateDisc(0.36, 0.05, m)].map((p, j) => ({ p, s, off: 0.98 + j * 0.07 })));
          plates.forEach(({ p }) => g.add(p));
          const collars = [sphere(0.05, m.gold), sphere(0.05, m.gold)]; g.add(...collars);
          updates.push((b) => {
            const c = handsMid(b);
            between(bar, c.clone().setZ(-1.4), c.clone().setZ(1.4), true);
            plates.forEach(({ p, s, off }) => { p.position.copy(c).setZ(s * off); p.rotation.x = Math.PI / 2; });
            collars.forEach((k, i) => k.position.copy(c).setZ((i ? 1 : -1) * 0.9));
          });
        } else {
          // Dumbbell held upright at the chest (goblet).
          const dg = new THREE.Group();
          const handle = rod(0.03, m.steel); handle.scale.y = 0.3;
          const heads = [-1, 1].map((s) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 6), m.plate); h.position.y = s * 0.2; return h; });
          const rims = heads.map((h) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 6), m.gold); r.rotation.x = Math.PI / 2; r.position.copy(h.position).setY(h.position.y + Math.sign(h.position.y) * 0.06); return r; });
          dg.add(handle, ...heads, ...rims); g.add(dg);
          const off = e.at ? new THREE.Vector3(e.at[0] / U, -e.at[1] / U, 0) : new THREE.Vector3();
          updates.push((b) => dg.position.copy(handsMid(b)).add(off).add(new THREE.Vector3(0.05, 0.02, 0)));
        }
        break;
      }
      case "legpress": {
        const r0 = v3(e.from ?? [150, 140]), r1 = v3(e.to ?? [210, 40]);
        const dir = new THREE.Vector3().subVectors(r1, r0).normalize();
        for (const z of [-0.5, 0.5]) { const rail = rod(0.045, m.frame); between(rail, r0.clone().setZ(z), r1.clone().setZ(z), true); g.add(rail);
          const leg = box(0.08, 1, 0.08, m.frame); between(leg, r1.clone().setZ(z), new THREE.Vector3(r1.x, 0, z), true); g.add(leg); }
        const sled = new THREE.Group();
        const footplate = box(0.09, 0.95, 1.05, m.steel); sled.add(footplate);
        const carriage = box(0.3, 0.5, 0.9, m.frame); carriage.position.x = 0.2; sled.add(carriage);
        const horns = [-1, 1].map((s) => { const hrn = rod(0.035, m.steel); hrn.rotation.x = Math.PI / 2; hrn.scale.y = 0.5; hrn.position.set(0.25, 0, s * 0.7); return hrn; });
        const plates = [-1, 1].flatMap((s) => [0, 1].map((j) => { const p = plateDisc(0.32 - j * 0.07, 0.05, m); p.rotation.x = Math.PI / 2; p.position.set(0.25, 0, s * (0.62 + j * 0.07)); return p; }));
        sled.add(...horns, ...plates); g.add(sled);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        const off = e.at ? new THREE.Vector3(e.at[0] / U, -e.at[1] / U, 0) : new THREE.Vector3();
        updates.push((b) => {
          const sole = b.sides[0].heel.clone().lerp(b.sides[0].toe, 0.5).setZ(0);
          sled.position.copy(sole).add(off).addScaledVector(dir, 0.06);
          sled.quaternion.copy(q);
        });
        break;
      }
      case "mat": { const mat = box(Math.abs(to.x - at.x) || 4, 0.03, 1.2, m.pad); mat.position.set((at.x + to.x) / 2, 0.015, 0); g.add(mat); break; }
      default: break; // wall, step and weight stack aren't used by the current exercises
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, update: (b, k) => updates.forEach((u) => u(b, k)) };
}

// ---------- Stage: floor with guilloché rings, contact shadow, lights ----------
function floorTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, "rgba(124,82,255,0.16)"); gr.addColorStop(0.55, "rgba(29,22,40,0.5)"); gr.addColorStop(1, "rgba(7,6,10,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = "rgba(227,201,143,0.10)"; x.lineWidth = 1;
  for (let r = 14; r < 250; r += 9) { x.globalAlpha = 1 - r / 260; x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke(); }
  x.globalAlpha = 1; x.strokeStyle = "rgba(227,201,143,0.35)"; x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 236, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export interface Stage {
  setSkeleton(k: Skeleton): void;
  render(): void;
  resize(w: number, h: number): void;
  orbit(dx: number): void;
  resetView(): void;
  dispose(): void;
}

/** Build the whole stage for one exercise into a canvas. */
export function createStage(canvas: HTMLCanvasElement, spec: AnimationSpec, exerciseId: string): Stage {
  const setup = SETUP[exerciseId] ?? { spread: 1 };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.45;

  const m = materials();
  const startK = solve(spec.keyframes[0].pose);
  const startB = lift(startK, setup.spread);
  const body = buildBody(m, workingSegments(spec, setup.spread));
  const eq = buildEquipment(spec.equipment, m, setup, startB);
  scene.add(body.group, eq.group);

  // Floor disc with rings, and a shadow-only plane.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.55, color: 0x000000 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.receiveShadow = true;
  scene.add(floor, shadow);

  // Lights: warm key with soft shadows, amethyst rim from behind, cool fill.
  scene.add(new THREE.HemisphereLight(0xa6a3b8, 0x07060a, 0.32));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  key.position.set(2.2, 4.2, 3.4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0008;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 12 });
  const rim = new THREE.DirectionalLight(0x8b6cff, 3.2); rim.position.set(-3, 2.5, -3.2);
  const rim2 = new THREE.PointLight(0xc9b4ff, 3.5, 6, 1.6); rim2.position.set(-1.2, 2.6, -1.8);
  const fill = new THREE.DirectionalLight(0x9db2ff, 0.5); fill.position.set(-2, 1, 3);
  scene.add(key, rim, rim2, fill);

  // Frame the whole movement: bounds of every keyframe pose plus the equipment.
  const bounds = new THREE.Box3();
  for (const kf of spec.keyframes) {
    const b = lift(solve(kf.pose), setup.spread);
    [b.hip, b.head, ...b.sides.flatMap((s) => [s.h, s.toe, s.k, s.s])].forEach((p) => bounds.expandByPoint(p));
  }
  bounds.expandByObject(eq.group);
  bounds.expandByPoint(new THREE.Vector3(bounds.min.x, 0, 0));
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  floor.position.x = shadow.position.x = center.x;

  const camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.1, 50);
  const DEFAULT_YAW = setup.camYaw ?? 0.62; // three-quarter view from the front-right
  let yaw = DEFAULT_YAW;
  const placeCamera = () => {
    const fit = Math.max(size.y * 1.15, (size.x * 1.05) / camera.aspect, 2.2) / (setup.zoom ?? 1);
    const dist = fit / (2 * Math.tan((camera.fov * Math.PI) / 360)) + size.z * 0.5;
    camera.position.set(center.x + Math.sin(yaw) * dist, center.y + dist * 0.28, center.z + Math.cos(yaw) * dist);
    camera.lookAt(center.x, center.y * 0.92, center.z);
  };

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const k0 = startK;
  const apply = (k: Skeleton) => { const b = lift(k, setup.spread); body.update(b); eq.update(b, k); };
  apply(k0);

  return {
    setSkeleton: apply,
    render: () => composer.render(),
    resize(w, h) {
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h; camera.updateProjectionMatrix(); placeCamera();
    },
    orbit(dx) { yaw += dx; placeCamera(); },
    resetView() { yaw = DEFAULT_YAW; placeCamera(); },
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) { mesh.geometry.dispose(); }
      });
      Object.values(m).forEach((x) => x.dispose());
      env.dispose(); pmrem.dispose(); composer.dispose(); renderer.dispose();
    },
  };
}
