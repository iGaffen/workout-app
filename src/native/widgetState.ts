/**
 * The snapshot the Android widgets draw from (docs/android-app.md). Built from the app's real data;
 * widget actions update a copy natively and queue events that the app applies on next open.
 */
import { BodyRepo, ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { chosenId, loadDay, optionsOf, slotsOf, weightOf } from "../model/day";
import { localDate, takesWeight, weekStart, weekStreak, weekSummary } from "../model/progress";
import type { Exercise } from "../model/schema";

export interface WidgetItem {
  key: string; id: string; name: string; reps: string;
  kind: "stack" | "plates" | "dumbbell" | "none"; weight?: number; base?: number; baseLabel?: string;
  done: boolean; options: { id: string; name: string }[];
}
export interface WidgetState {
  version: 1; date: string; updatedAt: number;
  workout: {
    title: string; logged: boolean; startedAt?: number; items: WidgetItem[]; step: number;
    /** Card details per exercise id (chosen and alternatives): first cues and main muscles. */
    info: Record<string, { cues: string[]; muscles: string }>;
  };
  week: { start: string; goal: number; gym: number; streak: number; days: { day: number; name: string; done: boolean }[] };
  body: { entries: { date: string; w?: number; c?: number }[] };
  lifts: { id: string; name: string; unit: string; sessions: { date: string; value: number }[] }[];
}

export async function buildWidgetState(): Promise<WidgetState | null> {
  const settings = await SettingsRepo.get();
  const routines = await RoutineRepo.all();
  const routine = routines.find((r) => r.id === settings.activeRoutineId) ?? routines[0];
  if (!routine) return null;
  const exercises = await ExerciseRepo.all(true);
  const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));
  const logs = await LogRepo.all();
  const body = await BodyRepo.all();
  const day = loadDay();
  const today = localDate(new Date());
  const loggedToday = logs.some((l) => l.routineId === routine.id && localDate(new Date(l.date)) === today) && !day.editing && day.done.length === 0;

  const items: WidgetItem[] = slotsOf(routine).map((b) => {
    const id = chosenId(b, day, logs, exMap);
    const ex = exMap.get(id);
    const weighted = !!ex && takesWeight(ex);
    return {
      key: b.exerciseId, id, name: ex?.name ?? id,
      reps: `3 × ${b.exerciseId === id ? b.reps ?? ex?.defaultReps ?? "" : ex?.defaultReps ?? ""}`,
      kind: weighted ? ex!.weightKind ?? "dumbbell" : "none",
      weight: weighted ? weightOf(id, day, logs) : undefined,
      base: ex?.weightKind === "plates" ? ex.baseKg : undefined,
      baseLabel: ex?.baseLabel,
      done: day.done.includes(b.exerciseId),
      options: optionsOf(b, exMap).map((o) => ({ id: o, name: exMap.get(o)!.name })),
    };
  });

  const wk = weekSummary(logs, routines, settings);
  const liftIds = [...new Set(slotsOf(routine).flatMap((b) => optionsOf(b, exMap)))].filter((id) => takesWeight(exMap.get(id)!));
  const lifts = liftIds.map((id) => {
    const ex = exMap.get(id)!;
    const sessions = logs
      .map((l) => ({ date: l.date, ws: (l.sets ?? []).filter((s) => s.exerciseId === id && s.weightKg !== undefined).map((s) => s.weightKg!) }))
      .filter((x) => x.ws.length)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
      .map((x) => ({ date: x.date.slice(0, 10), value: Math.max(...x.ws) }));
    return { id, name: ex.name, unit: ex.weightKind === "stack" ? "" : "kg", sessions };
  });

  const info: WidgetState["workout"]["info"] = {};
  for (const it of items) {
    for (const id of new Set([it.id, ...it.options.map((o) => o.id)])) {
      const ex = exMap.get(id);
      if (ex) info[id] = { cues: ex.cues.slice(0, 3), muscles: ex.muscles.primary.slice(0, 3).map((m) => m.replace(/-/g, " ")).join(", ") };
    }
  }

  return {
    version: 1, date: today, updatedAt: Date.now(),
    workout: { title: routine.name, logged: loggedToday, startedAt: day.startedAt, items, step: 2.5, info },
    week: { start: weekStart(new Date()), goal: wk.goal, gym: wk.gym, streak: weekStreak(logs, routines, settings), days: wk.days.map((d) => ({ day: d.day, name: d.name, done: d.done })) },
    body: { entries: body.slice(-120).map((b) => ({ date: b.date, ...(b.weightKg !== undefined ? { w: b.weightKg } : {}), ...(b.waistCm !== undefined ? { c: b.waistCm } : {}) })) },
    lifts,
  };
}
