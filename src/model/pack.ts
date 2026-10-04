import { z } from "zod";
import { PackSchema, SCHEMA_VERSION, type Exercise, type Pack, type Routine } from "./schema";

export type ParseResult = { ok: true; pack: Pack } | { ok: false; error: string };

/** Human-readable path, e.g. exercises[2].animation.keyframes[0].pose.torso */
function pathStr(path: PropertyKey[]): string {
  return path.reduce<string>((s, p) => (typeof p === "number" ? `${s}[${p}]` : s ? `${s}.${String(p)}` : String(p)), "");
}

export function parsePack(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: `Not valid JSON: ${(e as Error).message}` }; }
  // Accept a bare exercise array or a single exercise for convenience.
  if (Array.isArray(raw)) raw = { exercises: raw };
  else if (raw && typeof raw === "object" && "animation" in raw) raw = { exercises: [raw] };
  else if (raw && typeof raw === "object" && "sessions" in raw && !("routines" in raw)) raw = { routines: [raw] };
  const r = PackSchema.safeParse(raw);
  if (!r.success) {
    const msgs = r.error.issues.slice(0, 5).map((i: z.core.$ZodIssue) => `${pathStr(i.path) || "(top level)"}: ${i.message}`);
    return { ok: false, error: msgs.join("\n") };
  }
  const p = r.data;
  const ids = new Set<string>();
  for (const [i, e] of (p.exercises ?? []).entries()) {
    if (ids.has(e.id)) return { ok: false, error: `exercises[${i}].id: duplicate id "${e.id}"` };
    ids.add(e.id);
  }
  return { ok: true, pack: p };
}

export interface PackPreview { add: string[]; update: string[]; addRoutines: string[]; updateRoutines: string[]; remove: string[]; missingRefs: string[] }

/** Compare a pack with current data: what will be added/updated/removed. */
export function previewPack(p: Pack, existingExercises: string[], existingRoutines: string[]): PackPreview {
  const ex = new Set(existingExercises), ro = new Set(existingRoutines);
  const known = new Set([...existingExercises, ...(p.exercises ?? []).map((e) => e.id)]);
  (p.remove ?? []).forEach((id) => known.delete(id));
  const missing = new Set<string>();
  for (const r of p.routines ?? []) for (const s of r.sessions) for (const b of s.blocks)
    if (b.type === "exercise" && b.exerciseId && !known.has(b.exerciseId)) missing.add(b.exerciseId);
  return {
    add: (p.exercises ?? []).filter((e) => !ex.has(e.id)).map((e) => e.name),
    update: (p.exercises ?? []).filter((e) => ex.has(e.id)).map((e) => e.name),
    addRoutines: (p.routines ?? []).filter((r) => !ro.has(r.id)).map((r) => r.name),
    updateRoutines: (p.routines ?? []).filter((r) => ro.has(r.id)).map((r) => r.name),
    remove: p.remove ?? [],
    missingRefs: [...missing],
  };
}

export function summary(pv: PackPreview): string {
  const parts: string[] = [];
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  if (pv.add.length) parts.push(`Adds ${n(pv.add.length, "exercise")}`);
  if (pv.update.length) parts.push(`updates ${n(pv.update.length, "exercise")}`);
  if (pv.addRoutines.length) parts.push(`adds ${n(pv.addRoutines.length, "routine")}`);
  if (pv.updateRoutines.length) parts.push(`updates ${n(pv.updateRoutines.length, "routine")}`);
  if (pv.remove.length) parts.push(`removes ${n(pv.remove.length, "item")}`);
  const s = parts.join(", ");
  return s ? s[0].toUpperCase() + s.slice(1) : "Nothing to change";
}

export const stamp = <T extends object>(x: T) => ({ ...x, schemaVersion: SCHEMA_VERSION }) as T & { schemaVersion: number };
export type { Exercise, Routine };
