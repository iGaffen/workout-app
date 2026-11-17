import type { BodyLog, Exercise, Routine, Settings, WorkoutLog } from "./schema";

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

/** A gym workout is a session with at least one exercise; text-only sessions (cardio days) are not. */
export function isGym(l: WorkoutLog, routines: Routine[]): boolean {
  const s = routines.find((r) => r.id === l.routineId)?.sessions.find((x) => x.id === l.sessionId);
  return s ? s.blocks.some((b) => b.type === "exercise") : true;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const trainingDaysOf = (s: Settings) => [...(s.trainingDays ?? [1, 3])].sort((a, b) => a - b);

/** This week's gym and cardio counts plus which planned days are done. */
export function weekSummary(logs: WorkoutLog[], routines: Routine[], s: Settings, now = new Date()) {
  const ws = weekStart(now);
  const week = logs.filter((l) => weekStart(new Date(l.date)) === ws);
  const gym = week.filter((l) => isGym(l, routines));
  const gymDays = new Set(gym.map((l) => new Date(l.date).getDay()));
  const plan = trainingDaysOf(s);
  return {
    gym: gym.length,
    cardio: week.length - gym.length,
    goal: plan.length,
    days: plan.map((d) => ({ day: d, name: DAY_NAMES[d], done: gymDays.has(d) })),
    extraDays: [...gymDays].filter((d) => !plan.includes(d)).sort().map((d) => DAY_NAMES[d]),
  };
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

/** Approximate total actually lifted: plates plus the empty bar or sled; otherwise the entered number. */
export function totalKg(ex: Pick<Exercise, "weightKind" | "baseKg">, entered: number): number {
  return ex.weightKind === "plates" ? entered + (ex.baseKg ?? 0) : entered;
}

/** Short text for the list row, e.g. "40 kg plates ≈ 60 kg", "stack 35", "12 kg dumbbell". */
export function weightText(ex: Pick<Exercise, "weightKind" | "baseKg">, w: number): string {
  switch (ex.weightKind) {
    case "plates": return ex.baseKg ? `${w} kg plates ≈ ${totalKg(ex, w)} kg` : `${w} kg plates`;
    case "stack": return `stack ${w}`;
    case "dumbbell": return `${w} kg dumbbell`;
    default: return `${w} kg`;
  }
}

/** Complete weeks in a row (gym workouts ≥ goal), counting back from last week, plus this week once it's complete. */
export function weekStreak(logs: WorkoutLog[], routines: Routine[], s: Settings, now = new Date()): number {
  const goal = trainingDaysOf(s).length;
  const perWeek = new Map<string, number>();
  for (const l of logs) if (isGym(l, routines)) { const w = weekStart(new Date(l.date)); perWeek.set(w, (perWeek.get(w) ?? 0) + 1); }
  const thisWeek = weekStart(now);
  let streak = (perWeek.get(thisWeek) ?? 0) >= goal ? 1 : 0;
  const d = new Date(now);
  for (;;) {
    d.setDate(d.getDate() - 7);
    if ((perWeek.get(weekStart(d)) ?? 0) >= goal) streak++; else break;
  }
  return streak;
}

/** Heaviest weight ever logged for an exercise, optionally only before a date. */
export function bestWeight(logs: WorkoutLog[], exerciseId: string, before?: string): number | undefined {
  let best: number | undefined;
  for (const l of logs) {
    if (before && l.date >= before) continue;
    for (const s of l.sets ?? []) if (s.exerciseId === exerciseId && s.weightKg !== undefined && (best === undefined || s.weightKg > best)) best = s.weightKg;
  }
  return best;
}

/** A new best needs an earlier record to beat. */
export const isNewBest = (w: number | undefined, prev: number | undefined) => w !== undefined && prev !== undefined && w > prev;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
/** "Two for two this week." / "One for two this week." / "Three this week." */
export function weekPhrase(done: number, goal: number): string {
  const w = (n: number) => WORDS[n] ?? String(n);
  return done > goal ? `${w(done)} this week.` : `${w(done)} for ${w(goal).toLowerCase()} this week.`;
}

/** "WED · 17 NOV" */
export function dateLabel(d = new Date()): string {
  const day = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
  const mon = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  return `${day} · ${d.getDate()} ${mon}`;
}
export const weekdayName = (d = new Date()) => d.toLocaleDateString("en-GB", { weekday: "long" });
