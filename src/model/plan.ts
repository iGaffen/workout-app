import type { Block, Exercise, Routine, Session, Settings, WorkoutLog } from "./schema";

export const DEFAULT_SETTINGS: Settings = { schemaVersion: 1, phaseSets: 2, phaseAuto: true, trainingDays: [1, 3], defaultRest: 45, theme: "system", activeRoutineId: "gym-day" };

/** Number of sets for a block: a fixed number, or the Settings phase value. */
export function setsFor(block: Block, settings: Pick<Settings, "phaseSets">): number {
  if (block.type !== "exercise") return 0;
  if (typeof block.sets === "number") return block.sets;
  return settings.phaseSets;
}

export const restFor = (block: Block, settings: Pick<Settings, "defaultRest">) => block.restSeconds ?? settings.defaultRest;

export const repsFor = (block: Block, ex?: Exercise) => block.reps ?? ex?.defaultReps ?? "";

/** Hold seconds if the reps text or exercise says it is a hold. */
export function holdFor(block: Block, ex?: Exercise): number | undefined {
  const m = /(\d+)\s*sec(?:ond)?s?\s*hold/i.exec(block.reps ?? "");
  if (m) return Number(m[1]);
  return ex?.holdSeconds;
}

/** Session after the last completed one for this routine; first session if none. */
export function nextSessionId(routine: Routine, logs: WorkoutLog[]): string {
  const mine = logs.filter((l) => l.routineId === routine.id).sort((a, b) => b.date.localeCompare(a.date));
  const last = mine[0];
  if (!last) return routine.sessions[0].id;
  const i = routine.sessions.findIndex((s) => s.id === last.sessionId);
  if (i < 0) return routine.sessions[0].id;
  return routine.sessions[(i + 1) % routine.sessions.length].id;
}

/**
 * Rough gym time in minutes: a main lift at 3 sets is ~6 min (45 s sets, 60-90 s rest, setting up);
 * quick moves (holds and slow calf/shin raises) ~4 min; the finisher ~9 min. Warm-up is the ride to the gym.
 */
export function estimateMinutes(session: Session, settings: Pick<Settings, "phaseSets">, exercises: Map<string, Exercise> = new Map()): number {
  let min = 0;
  for (const b of session.blocks) {
    if (b.type === "text") { if (/finisher/i.test(b.title ?? "")) min += 9; continue; }
    const ex = b.exerciseId ? exercises.get(b.exerciseId) : undefined;
    const quick = !!holdFor(b, ex) || /slow/i.test(repsFor(b, ex));
    min += (quick ? 4 : 6) * (setsFor(b, settings) / 3);
  }
  return Math.round(min);
}

export const exerciseBlocks = (s: Session) => s.blocks.filter((b) => b.type === "exercise");
