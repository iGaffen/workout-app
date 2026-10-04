import type { BodyLog, Exercise, Settings, WorkoutLog } from "./schema";

const DAY = 86400000;

/** Training week number (1-based) since the first logged workout, or 1 if none. */
export function trainingWeek(logs: WorkoutLog[], now = new Date()): number {
  if (!logs.length) return 1;
  const first = Math.min(...logs.map((l) => Date.parse(l.date)));
  return Math.floor((now.getTime() - first) / (7 * DAY)) + 1;
}

/** Sets for "phase" blocks: automatic (2 sets weeks 1-3, then 3) or the manual setting. */
export function effectiveSettings(s: Settings, logs: WorkoutLog[], now = new Date()): Settings {
  if (!s.phaseAuto) return s;
  return { ...s, phaseSets: trainingWeek(logs, now) >= 4 ? 3 : 2 };
}

/** Weeks start on Sunday (Israel). Returns yyyy-mm-dd of that Sunday in local time. */
export function weekStart(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  return localDate(x);
}
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function workoutsThisWeek(logs: WorkoutLog[], now = new Date()): number {
  const ws = weekStart(now);
  return logs.filter((l) => weekStart(new Date(l.date)) === ws).length;
}

/** Most recent weight used for an exercise, from logged sets. */
export function lastWeight(logs: WorkoutLog[], exerciseId: string): { weightKg: number; sets: number; date: string } | undefined {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const l of sorted) {
    const sets = (l.sets ?? []).filter((s) => s.exerciseId === exerciseId && s.weightKg !== undefined);
    if (sets.length) return { weightKg: Math.max(...sets.map((s) => s.weightKg!)), sets: sets.length, date: l.date };
  }
  return undefined;
}

/** Exercises where a weight makes sense (not pure bodyweight moves). */
export const takesWeight = (e: Exercise) => e.equipment.some((x) => x !== "bodyweight" && x !== "wall");

/** Weekly averages for a body measure, oldest first. */
export function weeklyAverages(body: BodyLog[], key: "weightKg" | "waistCm"): { week: string; avg: number; n: number }[] {
  const m = new Map<string, number[]>();
  for (const b of body) {
    const v = b[key];
    if (v === undefined) continue;
    const w = weekStart(new Date(b.date + "T12:00:00"));
    m.set(w, [...(m.get(w) ?? []), v]);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, avg: v.reduce((s, x) => s + x, 0) / v.length, n: v.length }));
}

/** Days until something repeating every `every` days is due again (<= 0 means due). */
export function daysUntilDue(last: string | null | undefined, every: number, now = new Date()): number {
  if (!last) return 0;
  return Math.ceil((Date.parse(last) + every * DAY - now.getTime()) / DAY);
}
