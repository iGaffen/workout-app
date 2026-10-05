import { useEffect, useState } from "react";
import { ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { estimateMinutes, nextSessionId, repsFor, setsFor, restFor, holdFor } from "../model/plan";
import { Runner } from "./Runner";
import { ExerciseView } from "../components/ExerciseView";
import { BlockIcon } from "../components/Icons";
import { useWakeLock } from "../components/Timer";
import type { Block, Exercise, WorkoutLog } from "../model/schema";
import { effectiveSettings, lastWeight, takesWeight, trainingWeek, weekSummary } from "../model/progress";
import { Icon } from "../components/Icons";
import { WeightInput } from "../components/WeightInput";
import { BackupButton } from "../components/BackupButton";
import { useBackHandler } from "../components/back";
import { ExerciseSheet } from "../components/ExerciseSheet";

export function TextBlock({ b, children }: { b: Block; children?: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="withicon"><BlockIcon name={b.icon} />{b.title}</h2>
      <ul className="lines">{(b.lines ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
      {children}
    </div>
  );
}

export function Today({ onRunning, visible }: { onRunning: (r: boolean) => void; visible: boolean }) {
  const data = useData(async () => {
    const settings = await SettingsRepo.get();
    const routines = await RoutineRepo.all();
    const routine = routines.find((r) => r.id === settings.activeRoutineId) ?? routines[0];
    const exercises = await ExerciseRepo.all(true);
    const logs = await LogRepo.all();
    return { settings, routine, routines, exercises, logs };
  });
  const [sessionId, setSessionId] = useState<string>();
  const [mode, setMode] = useState<"walk" | "full">(() => (localStorage.getItem("mode") as "walk" | "full") ?? "walk");
  const [running, setRunningRaw] = useState(false);
  const [paused, setPaused] = useState(false);
  const setRunning = (r: boolean) => { setRunningRaw(r); setPaused(false); };
  const [startedAt, setStartedAt] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [peek, setPeek] = useState<{ ex: Exercise; reps: string } | null>(null);
  // Back during a workout steps out to Home and keeps your progress; "Resume workout" brings you back.
  useBackHandler(visible && running && !paused, () => { setPaused(true); scrollTo(0, 0); }, 1);
  useBackHandler(visible && justFinished && !running, () => setJustFinished(false), 1);
  const [fullWeights, setFullWeights] = useState<Record<string, number | undefined>>({});
  useWakeLock(running);
  useEffect(() => { onRunning(running); }, [running, onRunning]);
  useEffect(() => { try { localStorage.setItem("mode", mode); } catch { /* ignore */ } }, [mode]);

  if (!data) return <p className="sub">Loading…</p>;
  const { routine, routines, exercises, logs } = data;
  const settings = effectiveSettings(data.settings, logs);
  if (!routine) return <div className="card"><h2>No routine</h2><p className="sub">Create one in the Routines tab.</p></div>;
  const sid = sessionId && routine.sessions.some((s) => s.id === sessionId) ? sessionId : nextSessionId(routine, logs);
  const session = routine.sessions.find((s) => s.id === sid)!;
  const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

  const finish = async (sets: NonNullable<WorkoutLog["sets"]> = []) => {
    await LogRepo.add({ date: new Date().toISOString(), routineId: routine.id, sessionId: session.id, durationSeconds: Math.round((Date.now() - startedAt) / 1000), ...(sets.length ? { sets } : {}) });
  };
  const fullSets = () => session.blocks.flatMap((b) => {
    const w = b.exerciseId ? fullWeights[b.exerciseId] : undefined;
    return b.exerciseId && w !== undefined ? Array.from({ length: setsFor(b, settings) }, (_, i) => ({ exerciseId: b.exerciseId!, setIndex: i + 1, weightKg: w })) : [];
  });
  const hasExercises = session.blocks.some((b) => b.type === "exercise");
  const wk = weekSummary(logs, routines, data.settings);
  const start = () => { setJustFinished(false); setStartedAt(Date.now()); setRunning(true); scrollTo(0, 0); };

  const runner = running && mode === "walk" && (
    <div hidden={paused}><Runner session={session} settings={settings} exMap={exMap} logs={logs} onFinish={finish} onExit={() => setRunning(false)} /></div>
  );
  if (running && !paused && mode === "walk") return <>{runner}</>;

  return (
    <>
      {runner}
      <div className="top">
        <h1>Home</h1>
        {routines.length > 1 && (
          <select aria-label="Routine" value={routine.id} onChange={(e) => SettingsRepo.put({ ...settings, activeRoutineId: e.target.value })}>
            {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>
      <div className="card weekcard">
        <div className="blockhead"><h2>This week</h2><span className="sub">{wk.gym} of {wk.goal} gym workouts{wk.cardio ? ` · +${wk.cardio} cardio` : ""}</span></div>
        <div className="days">
          {wk.days.map((d) => <span key={d.day} className={`daychip ${d.done ? "done" : ""}`}>{d.name}{d.done ? " ✓" : ""}</span>)}
          {wk.extraDays.map((n) => <span key={n} className="daychip done extra">{n} ✓</span>)}
        </div>
      </div>
      {running && paused && (
        <div className="card resume">
          <h2>Workout in progress</h2>
          <p className="sub">{session.name}. Your sets so far are kept.</p>
          <button className="cta" onClick={() => setPaused(false)}>Resume workout</button>
          <button className="secondary" onClick={() => { if (confirm("End this workout? It will not be saved.")) setRunning(false); }}>End without saving</button>
        </div>
      )}
      <div className="seg" role="group" aria-label="Session">
        {routine.sessions.map((s) => (
          <button key={s.id} aria-pressed={s.id === sid} onClick={() => { setSessionId(s.id); setRunning(false); }}>{s.name}</button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="View">
        <button aria-pressed={mode === "walk"} onClick={() => setMode("walk")}>Walk through</button>
        <button aria-pressed={mode === "full"} onClick={() => setMode("full")}>Full workout</button>
      </div>

      {peek && <ExerciseSheet ex={peek.ex} reps={peek.reps} onClose={() => setPeek(null)} />}
      {justFinished && !running && (
        <div className="card done">
          <h2>Workout saved</h2>
          <BackupButton />
          <button className="linkbtn" onClick={() => setJustFinished(false)}>Close</button>
        </div>
      )}
      {mode === "walk" || !running || paused ? (
        <div className="card">
          <div className="blockhead"><h2>{session.name}</h2>{hasExercises && <span className="sub">About {estimateMinutes(session, settings)} min · {settings.phaseSets} sets on main lifts{data.settings.phaseAuto ? ` (week ${trainingWeek(logs)})` : ""}</span>}</div>
          <ol className="plainlist">
            {session.blocks.map((b, i) => {
              const ex = b.exerciseId ? exMap.get(b.exerciseId) : undefined;
              return (
                <li key={i}>
                  {b.type === "text" ? <span className="rowtext muted">{b.title}</span> : (
                    <button className="exrow" disabled={!ex} onClick={() => ex && setPeek({ ex, reps: repsFor(b, ex) })} aria-label={`${ex?.name ?? b.exerciseId}, ${setsFor(b, settings)} sets of ${repsFor(b, ex)}. Show exercise`}>
                      <span className="exrowname">{ex?.name ?? `Missing: ${b.exerciseId}`}</span>
                      <span className="sub">{setsFor(b, settings)} × {repsFor(b, ex)}</span>
                      {ex && <span className="chev" aria-hidden="true"><Icon.next /></span>}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {!(running && paused) && <button className="cta" onClick={start}>{mode === "walk" ? "Start walk through" : "Start full workout"}</button>}
        </div>
      ) : (
        <>
          {session.blocks.map((b, i) => {
            if (b.type === "text") return <TextBlock key={i} b={b} />;
            const ex = exMap.get(b.exerciseId!);
            if (!ex) return null;
            return (
              <div className="card" key={i}>
                <ExerciseView ex={ex} reps={repsFor(b, ex)} hold={holdFor(b, ex)} meta={`${setsFor(b, settings)} sets, ${restFor(b, settings)} sec rest`}
                  weight={takesWeight(ex) ? <WeightInput value={fullWeights[ex.id]} last={lastWeight(logs, ex.id)} onChange={(v) => setFullWeights((w) => ({ ...w, [ex.id]: v }))} /> : undefined} />
              </div>
            );
          })}
          <button className="cta" onClick={async () => { await finish(fullSets()); setFullWeights({}); setRunning(false); setJustFinished(true); scrollTo(0, 0); }}>Finish workout</button>
          <button className="secondary" onClick={() => setRunning(false)}>Close without saving</button>
        </>
      )}
    </>
  );
}
