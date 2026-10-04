import type { Block, Exercise, Routine, Session, Settings, WorkoutLog } from "./schema";

export const DEFAULT_SETTINGS: Settings = { schemaVersion: 1, phaseSets: 2, defaultRest: 45, theme: "system", activeRoutineId: "full-body-ab" };

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

/** Rough estimate in minutes: ~45 s of work per set plus rest, plus ~1.5 min to switch machines; text blocks ~8 min. */
export function estimateMinutes(session: Session, settings: Pick<Settings, "phaseSets" | "defaultRest">): number {
  let sec = 0;
  for (const b of session.blocks) {
    if (b.type === "text") { sec += 8 * 60; continue; }
    const n = setsFor(b, settings);
    sec += n * 45 + Math.max(0, n - 1) * restFor(b, settings) + 90;
  }
  return Math.round(sec / 60);
}

export const exerciseBlocks = (s: Session) => s.blocks.filter((b) => b.type === "exercise");

/** Walk-through state machine (pure, unit tested). */
export interface RunState { idx: number; set: number }
export type RunAction = "setDone" | "next" | "back" | "skip";

export function step(session: Session, settings: Pick<Settings, "phaseSets">, st: RunState, a: RunAction): { state: RunState; rest: "set" | "exercise" | null; finished: boolean } {
  const n = session.blocks.length;
  const go = (idx: number) => ({ idx: Math.max(0, Math.min(n, idx)), set: 1 });
  if (a === "back") return { state: go(st.idx - 1), rest: null, finished: false };
  if (a === "skip" || a === "next") { const s = go(st.idx + 1); return { state: s, rest: null, finished: s.idx >= n }; }
  const b = session.blocks[st.idx];
  const total = setsFor(b, settings);
  if (st.set < total) return { state: { idx: st.idx, set: st.set + 1 }, rest: "set", finished: false };
  const s = go(st.idx + 1);
  return { state: s, rest: s.idx < n ? "exercise" : null, finished: s.idx >= n };
}
