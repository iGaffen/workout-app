import type { EquipmentSpec } from "../model/schema";
import { FLOOR_Y, LEN, jointOf, type Pt, type Side, type Skeleton } from "./solver";

const f = (n: number) => n.toFixed(1);

/** Tapered capsule from a (radius ra) to b (radius rb). */
export function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / L, ny = dx / L;
  const p1: Pt = [a[0] + nx * ra, a[1] + ny * ra];
  const p2: Pt = [b[0] + nx * rb, b[1] + ny * rb];
  const p3: Pt = [b[0] - nx * rb, b[1] - ny * rb];
  const p4: Pt = [a[0] - nx * ra, a[1] - ny * ra];
  return `M${f(p1[0])},${f(p1[1])}L${f(p2[0])},${f(p2[1])}A${rb},${rb} 0 0 0 ${f(p3[0])},${f(p3[1])}L${f(p4[0])},${f(p4[1])}A${ra},${ra} 0 0 0 ${f(p1[0])},${f(p1[1])}Z`;
}

function limbs(s: Side, cls: string): string {
  const parts = [
    capsule(s.hip, s.knee, 5.6, 4.4),
    capsule(s.knee, s.ankle, 4.2, 3),
    capsule(s.heel, s.toe, 2.6, 2),
    capsule(s.shoulder, s.elbow, 3.9, 3.1),
    capsule(s.elbow, s.hand, 3, 2.3),
  ];
  return `<path class="${cls}" d="${parts.join("")}"/><circle class="${cls}" cx="${f(s.hand[0])}" cy="${f(s.hand[1])}" r="3"/>`;
}

function torso(k: Skeleton): string {
  return `<path class="body" d="${capsule(k.hip, k.shoulder, 6.5, 7.5)}"/>` +
    `<path class="body" d="${capsule(k.shoulder, k.neck, 3, 3)}"/>` +
    `<circle class="body" cx="${f(k.head[0])}" cy="${f(k.head[1])}" r="${LEN.headR}"/>`;
}

const ANG = (a: Pt, b: Pt) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

function eqPos(e: EquipmentSpec, k: Skeleton): Pt {
  const base: Pt = e.attach ? jointOf(k, e.attach === "foot" ? "ankle" : e.attach, e.side ?? "near") : [0, 0];
  if (e.attach === "foot") {
    const sd = k[e.side ?? "near"];
    // Middle of the sole.
    const mid: Pt = [(sd.heel[0] + sd.toe[0]) / 2, (sd.heel[1] + sd.toe[1]) / 2];
    return [mid[0] + (e.at?.[0] ?? 0), mid[1] + (e.at?.[1] ?? 0)];
  }
  if (e.attach) return [base[0] + (e.at?.[0] ?? 0), base[1] + (e.at?.[1] ?? 0)];
  return e.at ?? [0, 0];
}

/** Equipment behind the body (benches, frames) vs in front (dumbbells, handles, cables). */
export function drawEquipment(list: EquipmentSpec[], k: Skeleton, layer: "back" | "front"): string {
  let out = "";
  for (const e of list) {
    const front = ["dumbbell", "handle", "bar", "cable", "legpress"].includes(e.kind);
    if ((layer === "front") !== front) continue;
    const p = eqPos(e, k);
    const to = e.to ?? p;
    const sz = e.size ?? 1;
    switch (e.kind) {
      case "bench":
        out += `<rect class="eq" x="${f(Math.min(p[0], to[0]))}" y="${f(p[1] - 3)}" width="${f(Math.abs(to[0] - p[0]))}" height="7" rx="3"/>`;
        out += `<line class="eqline" x1="${f(p[0] + 8)}" y1="${f(p[1] + 4)}" x2="${f(p[0] + 8)}" y2="${FLOOR_Y}"/><line class="eqline" x1="${f(to[0] - 8)}" y1="${f(p[1] + 4)}" x2="${f(to[0] - 8)}" y2="${FLOOR_Y}"/>`;
        break;
      case "seat":
        out += `<rect class="eq" x="${f(p[0] - 14 * sz)}" y="${f(p[1] - 3)}" width="${f(28 * sz)}" height="7" rx="3"/>`;
        out += `<line class="eqline" x1="${f(p[0])}" y1="${f(p[1] + 4)}" x2="${f(p[0])}" y2="${FLOOR_Y}"/><line class="eqline" x1="${f(p[0] - 12)}" y1="${FLOOR_Y}" x2="${f(p[0] + 12)}" y2="${FLOOR_Y}"/>`;
        break;
      case "backpad":
      case "frame": {
        const w = e.kind === "backpad" ? 4 : 2;
        out += `<path class="${e.kind === "backpad" ? "eq" : "eqframe"}" d="${capsule(p, to, w, w)}"/>`;
        break;
      }
      case "pad": {
        const a = e.angle ?? 0;
        out += `<rect class="eq" x="${f(p[0] - 9 * sz)}" y="${f(p[1] - 4)}" width="${f(18 * sz)}" height="8" rx="4" transform="rotate(${a} ${f(p[0])} ${f(p[1])})"/>`;
        break;
      }
      case "legpress": {
        // Sled rail (fixed) plus a footplate that travels with the feet.
        const rail0 = e.from ?? [150, 140];
        const rail1 = e.to ?? [210, 40];
        const ang = ANG(rail0, rail1);
        out += `<line class="eqline" x1="${f(rail0[0])}" y1="${f(rail0[1])}" x2="${f(rail1[0])}" y2="${f(rail1[1])}"/>`;
        out += `<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})">` +
          `<rect class="eq" x="1" y="-22" width="6" height="44" rx="2"/>` +
          `<rect class="eqline-fill" x="7" y="-6" width="16" height="12" rx="2"/>` +
          `<rect class="load" x="14" y="-17" width="7" height="34" rx="3"/></g>`;
        break;
      }
      case "pulley": {
        out += `<line class="eqframe-line" x1="${f(p[0])}" y1="${f(Math.min(p[1], FLOOR_Y))}" x2="${f(p[0])}" y2="${FLOOR_Y}"/>`;
        out += `<line class="eqframe-line" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(p[0])}" y2="${f(Math.max(4, p[1] - 30))}"/>`;
        out += `<circle class="eq" cx="${f(p[0])}" cy="${f(p[1])}" r="5"/><circle class="hub" cx="${f(p[0])}" cy="${f(p[1])}" r="1.6"/>`;
        break;
      }
      case "cable": {
        const from = e.from ?? [230, 90];
        out += `<line class="cable" x1="${f(from[0])}" y1="${f(from[1])}" x2="${f(p[0])}" y2="${f(p[1])}"/>`;
        break;
      }
      case "handle":
        out += `<rect class="load" x="${f(p[0] - 2.5)}" y="${f(p[1] - 5)}" width="5" height="10" rx="2.5"/>`;
        break;
      case "bar": {
        const a = e.angle ?? 0;
        out += `<rect class="load" x="${f(p[0] - 12 * sz)}" y="${f(p[1] - 2)}" width="${f(24 * sz)}" height="4" rx="2" transform="rotate(${a} ${f(p[0])} ${f(p[1])})"/>`;
        break;
      }
      case "dumbbell": {
        // Side view: handle runs across the body, so we see one plate end-on plus a sliver of handle.
        const r = 6.5 * sz;
        out += `<rect class="load-dark" x="${f(p[0] - r - 2)}" y="${f(p[1] - 2)}" width="${f(2 * r + 4)}" height="4" rx="2"/>`;
        out += `<rect class="load" x="${f(p[0] - r)}" y="${f(p[1] - r)}" width="${f(2 * r)}" height="${f(2 * r)}" rx="${f(r * 0.45)}"/>`;
        break;
      }
      case "wall":
        out += `<rect class="eq" x="${f(p[0] - 6)}" y="6" width="6" height="${FLOOR_Y - 6}"/>`;
        break;
      case "step": {
        const w = 30 * sz, h = 10;
        out += `<rect class="eq" x="${f(p[0] - w / 2)}" y="${FLOOR_Y - h}" width="${f(w)}" height="${h}" rx="2"/>`;
        break;
      }
      case "mat":
        out += `<rect class="eq" x="${f(p[0])}" y="${FLOOR_Y - 3}" width="${f(to[0] - p[0])}" height="3" rx="1.5"/>`;
        break;
      case "plate":
        out += `<rect class="eqline-fill" x="${f(p[0] - 7)}" y="${f(p[1])}" width="14" height="${f(FLOOR_Y - p[1])}" rx="2"/>`;
        for (let y = p[1] + 4; y < FLOOR_Y - 2; y += 6) out += `<line class="hubline" x1="${f(p[0] - 6)}" y1="${f(y)}" x2="${f(p[0] + 6)}" y2="${f(y)}"/>`;
        break;
    }
  }
  return out;
}

/** Full scene markup for one frame. */
export function scene(k: Skeleton, equipment: EquipmentSpec[]): string {
  return `<line class="floor" x1="0" y1="${FLOOR_Y}" x2="240" y2="${FLOOR_Y}"/>` +
    drawEquipment(equipment, k, "back") +
    `<g class="farside">${limbs(k.far, "far")}</g>` +
    torso(k) +
    limbs(k.near, "body") +
    drawEquipment(equipment, k, "front");
}
