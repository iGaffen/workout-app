/**
 * Today's session state (ticks, weights, either/or picks, start time), shared by the Home screen
 * and the Android widgets' event sync, so both log a workout the same way.
 */
import { LogRepo } from "../db/repos";
import { setsFor } from "./plan";
import { lastWeight, localDate, takesWeight, totalKg } from "./progress";
import type { Block, Exercise, Routine, Settings, WorkoutLog } from "./schema";

export interface DayState {
  date: string; done: string[]; weights: Record<string, number>; choice?: Record<string, string>; startedAt?: number;
  /** Set while today's saved session is reopened for editing; finishing replaces that log. */
  editing?: string;
}
export type Slot = Block & { exerciseId: string };

const KEY = "gym-today";
/** Fired when today's state is saved (so the widgets refresh) or changed from outside the Home screen. */
export const DAY_SAVED = "gym-day-saved";
export const DAY_EXTERNAL = "gym-day-external";

export const freshDay = (): DayState => ({ date: localDate(new Date()), done: [], weights: {} });
export function loadDay(): DayState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as DayState | null;
    return s && s.date === localDate(new Date()) ? s : freshDay();
  } catch { return freshDay(); }
}
export function saveDay(s: DayState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
  window.dispatchEvent(new Event(DAY_SAVED));
}

export const slotsOf = (r: Routine): Slot[] => (r.sessions[0]?.blocks ?? []).filter((b): b is Slot => b.type === "exercise" && !!b.exerciseId);
export const optionsOf = (b: Slot, exMap: Map<string, Exercise>) => [b.exerciseId, ...(b.alternatives ?? [])].filter((id) => exMap.has(id));

/** Either/or slots: today's pick, else the one logged most recently, else the first. */
export function chosenId(b: Slot, day: DayState, logs: WorkoutLog[], exMap: Map<string, Exercise>): string {
  const opts = optionsOf(b, exMap);
  const c = day.choice?.[b.exerciseId];
  if (c && opts.includes(c)) return c;
  for (const l of [...logs].sort((a, x) => x.date.localeCompare(a.date))) {
    const hit = opts.find((id) => (l.sets ?? []).some((s) => s.exerciseId === id));
    if (hit) return hit;
  }
  return b.exerciseId;
}
export const weightOf = (id: string, day: DayState, logs: WorkoutLog[]) => day.weights[id] ?? lastWeight(logs, id)?.weightKg;

export interface DayContext { routine: Routine; settings: Settings; exMap: Map<string, Exercise>; logs: WorkoutLog[] }

/** The log entry for today's ticked exercises (3 sets each at the logged weight). */
export function buildEntry(day: DayState, ctx: DayContext, now = Date.now()) {
  const { routine, settings, exMap, logs } = ctx;
  const done = slotsOf(routine).filter((b) => day.done.includes(b.exerciseId));
  const sets: NonNullable<WorkoutLog["sets"]> = done.flatMap((b) => {
    const id = chosenId(b, day, logs, exMap);
    const ex = exMap.get(id);
    const w = ex && takesWeight(ex) ? weightOf(id, day, logs) : undefined;
    return Array.from({ length: setsFor(b, settings) }, (_, i) => ({ exerciseId: id, setIndex: i + 1, ...(w !== undefined && ex ? { weightKg: w, totalKg: totalKg(ex, w) } : {}) }));
  });
  const edited = day.editing ? logs.find((l) => l.id === day.editing) : undefined;
  const durationSeconds = edited ? edited.durationSeconds : day.startedAt ? Math.round((now - day.startedAt) / 1000) : undefined;
  const entry = { date: edited?.date ?? new Date(now).toISOString(), routineId: routine.id, sessionId: routine.sessions[0].id, ...(durationSeconds ? { durationSeconds } : {}), ...(sets.length ? { sets } : {}) };
  return { entry, editedId: edited?.id };
}

/** Save today's session (replacing the edited one if reopened). */
export async function finishDay(day: DayState, ctx: DayContext, now = Date.now()) {
  const { entry, editedId } = buildEntry(day, ctx, now);
  if (editedId) await LogRepo.replace(editedId, entry); else await LogRepo.add(entry);
}
