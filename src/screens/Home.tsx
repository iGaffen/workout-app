import { useEffect, useState } from "react";
import { ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { repsFor, setsFor } from "../model/plan";
import { lastWeight, localDate, takesWeight, weekSummary } from "../model/progress";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { WeightInput } from "../components/WeightInput";
import { BackupButton } from "../components/BackupButton";
import { Icon } from "../components/Icons";
import { useBackHandler } from "../components/back";
import type { Block, Exercise, WorkoutLog } from "../model/schema";

/** Today's ticks and weights survive closing the app, until the day changes or you finish. */
interface DayState { date: string; done: string[]; weights: Record<string, number> }
const KEY = "gym-today";
function loadDay(): DayState {
  const empty = { date: localDate(new Date()), done: [], weights: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as DayState | null;
    return s && s.date === empty.date ? s : empty;
  } catch { return empty; }
}
const saveDay = (s: DayState) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

export function Home() {
  const data = useData(async () => {
    const settings = await SettingsRepo.get();
    const routines = await RoutineRepo.all();
    const routine = routines.find((r) => r.id === settings.activeRoutineId) ?? routines[0];
    return { settings, routines, routine, exercises: await ExerciseRepo.all(true), logs: await LogRepo.all() };
  });
  const [day, setDay] = useState<DayState>(loadDay);
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => saveDay(day), [day]);
  useBackHandler(saved, () => setSaved(false), 1);

  if (!data) return <p className="sub">Loading…</p>;
  const { settings, routines, routine, exercises, logs } = data;
  if (!routine) return <div className="card"><h2>No routine</h2><p className="sub">Create one in the Routines tab.</p></div>;
  const session = routine.sessions[0];
  const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));
  const wk = weekSummary(logs, routines, settings);

  const firstEx = session.blocks.findIndex((b) => b.type === "exercise");
  const lastEx = session.blocks.length - 1 - [...session.blocks].reverse().findIndex((b) => b.type === "exercise");
  const before = session.blocks.filter((b, i) => b.type === "text" && i < firstEx);
  const after = session.blocks.filter((b, i) => b.type === "text" && i > lastEx);
  const items = session.blocks.filter((b): b is Block & { exerciseId: string } => b.type === "exercise" && !!b.exerciseId);
  const isDone = (id: string) => day.done.includes(id);
  const todo = items.filter((b) => !isDone(b.exerciseId));
  const done = items.filter((b) => isDone(b.exerciseId));

  const toggle = (id: string) => setDay((d) => ({ ...d, done: d.done.includes(id) ? d.done.filter((x) => x !== id) : [...d.done, id] }));
  const setWeight = (id: string, v?: number) => setDay((d) => {
    const weights = { ...d.weights };
    if (v === undefined) delete weights[id]; else weights[id] = v;
    return { ...d, weights };
  });
  const weightFor = (id: string) => day.weights[id] ?? lastWeight(logs, id)?.weightKg;

  const finish = async () => {
    if (!done.length && !confirm("Nothing is ticked yet. Save the workout anyway?")) return;
    const sets: NonNullable<WorkoutLog["sets"]> = done.flatMap((b) => {
      const ex = exMap.get(b.exerciseId);
      const w = ex && takesWeight(ex) ? weightFor(b.exerciseId) : undefined;
      return Array.from({ length: setsFor(b, settings) }, (_, i) => ({ exerciseId: b.exerciseId, setIndex: i + 1, ...(w !== undefined ? { weightKg: w } : {}) }));
    });
    await LogRepo.add({ date: new Date().toISOString(), routineId: routine.id, sessionId: session.id, ...(sets.length ? { sets } : {}) });
    setDay({ date: localDate(new Date()), done: [], weights: {} });
    setSaved(true);
    scrollTo(0, 0);
  };

  const row = (b: Block & { exerciseId: string }) => {
    const ex = exMap.get(b.exerciseId);
    const d = isDone(b.exerciseId);
    const w = ex && takesWeight(ex) ? weightFor(b.exerciseId) : undefined;
    return (
      <li key={b.exerciseId} className={`checkrow ${d ? "isdone" : ""}`}>
        <button className="check" aria-pressed={d} onClick={() => toggle(b.exerciseId)} aria-label={`${d ? "Undo" : "Mark done"}: ${ex?.name ?? b.exerciseId}`}>
          {d && <Icon.tick />}
        </button>
        <button className="exrow" disabled={!ex} onClick={() => setOpen(b.exerciseId)} aria-label={`${ex?.name ?? b.exerciseId}. Show exercise`}>
          <span className="exrowmain">
            <span className="exrowname">{ex?.name ?? `Missing: ${b.exerciseId}`}</span>
            <span className="sub">{setsFor(b, settings)} × {repsFor(b, ex)}{w !== undefined ? ` · ${w} kg` : ""}</span>
          </span>
          {ex && <span className="chev" aria-hidden="true"><Icon.next /></span>}
        </button>
      </li>
    );
  };

  const openBlock = open ? items.find((b) => b.exerciseId === open) : undefined;
  const openEx = open ? exMap.get(open) : undefined;

  return (
    <>
      <div className="top">
        <h1>Home</h1>
        {routines.length > 1 && (
          <select aria-label="Routine" value={routine.id} onChange={(e) => SettingsRepo.put({ ...settings, activeRoutineId: e.target.value })}>
            {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      <div className="card weekcard">
        <div className="blockhead"><h2>This week</h2><span className="sub">{wk.gym} of {wk.goal} gym workouts</span></div>
        <div className="days">
          {wk.days.map((d) => <span key={d.day} className={`daychip ${d.done ? "done" : ""}`}>{d.name}{d.done ? " ✓" : ""}</span>)}
          {wk.extraDays.map((n) => <span key={n} className="daychip done extra">{n} ✓</span>)}
        </div>
      </div>

      {saved && (
        <div className="card done">
          <h2>Workout saved</h2>
          <BackupButton />
          <button className="linkbtn" onClick={() => setSaved(false)}>Close</button>
        </div>
      )}

      <div className="card">
        <div className="blockhead"><h2>{routine.name}</h2><span className="sub">{done.length} of {items.length} done</span></div>
        {before.map((b, i) => <p key={i} className="noteline"><strong>{b.title}:</strong> {(b.lines ?? []).join(" · ")}</p>)}
        <ul className="checklist">{todo.map(row)}</ul>
        {todo.length === 0 && items.length > 0 && <p className="ok">All done. Nice work.</p>}
        {done.length > 0 && <><h3 className="small donehead">Done</h3><ul className="checklist">{done.map(row)}</ul></>}
        {after.map((b, i) => <p key={i} className="noteline"><strong>{b.title}:</strong> {(b.lines ?? []).join(" · ")}</p>)}
        <button className="cta" onClick={finish}>Finish workout</button>
        <p className="sub center">Tap the circle when an exercise is done. Tap the name to see how it's done.</p>
      </div>

      {openEx && openBlock && (
        <ExerciseSheet ex={openEx} reps={repsFor(openBlock, openEx)} onClose={() => setOpen(null)}>
          {takesWeight(openEx) && <WeightInput key={openEx.id} value={day.weights[openEx.id]} last={lastWeight(logs, openEx.id)} onChange={(v) => setWeight(openEx.id, v)} />}
          <button className={isDone(openEx.id) ? "secondary" : "cta"} onClick={() => { toggle(openEx.id); setOpen(null); }}>
            {isDone(openEx.id) ? "Mark as not done" : "Mark as done"}
          </button>
        </ExerciseSheet>
      )}
    </>
  );
}
