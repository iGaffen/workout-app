import { useEffect, useState } from "react";
import { ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { estimateMinutes, nextSessionId, repsFor, setsFor, restFor, holdFor } from "../model/plan";
import { Runner } from "./Runner";
import { ExerciseView } from "../components/ExerciseView";
import { BlockIcon } from "../components/Icons";
import { useWakeLock } from "../components/Timer";
import type { Block, Exercise, WorkoutLog } from "../model/schema";
import { effectiveSettings, lastWeight, takesWeight, trainingWeek } from "../model/progress";
import { WeightInput } from "../components/WeightInput";
import { BackupButton } from "../components/BackupButton";

export function TextBlock({ b, children }: { b: Block; children?: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="withicon"><BlockIcon name={b.icon} />{b.title}</h2>
      <ul className="lines">{(b.lines ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
      {children}
    </div>
  );
}

export function Today({ onRunning }: { onRunning: (r: boolean) => void }) {
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
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
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
  const start = () => { setJustFinished(false); setStartedAt(Date.now()); setRunning(true); scrollTo(0, 0); };

  if (running && mode === "walk") {
    return <Runner session={session} settings={settings} exMap={exMap} logs={logs} onFinish={finish} onExit={() => setRunning(false)} />;
  }

  return (
    <>
      <div className="top">
        <h1>Today</h1>
        {routines.length > 1 && (
          <select aria-label="Routine" value={routine.id} onChange={(e) => SettingsRepo.put({ ...settings, activeRoutineId: e.target.value })}>
            {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>
      <div className="seg" role="group" aria-label="Session">
        {routine.sessions.map((s) => (
          <button key={s.id} aria-pressed={s.id === sid} onClick={() => { setSessionId(s.id); setRunning(false); }}>{s.name}</button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="View">
        <button aria-pressed={mode === "walk"} onClick={() => setMode("walk")}>Walk through</button>
        <button aria-pressed={mode === "full"} onClick={() => setMode("full")}>Full workout</button>
      </div>

      {justFinished && !running && (
        <div className="card done">
          <h2>Workout saved</h2>
          <BackupButton />
          <button className="linkbtn" onClick={() => setJustFinished(false)}>Close</button>
        </div>
      )}
      {mode === "walk" || !running ? (
        <div className="card">
          <div className="blockhead"><h2>{session.name}</h2>{hasExercises && <span className="sub">About {estimateMinutes(session, settings)} min · {settings.phaseSets} sets on main lifts{data.settings.phaseAuto ? ` (week ${trainingWeek(logs)})` : ""}</span>}</div>
          <ol className="plainlist">
            {session.blocks.map((b, i) => {
              const ex = b.exerciseId ? exMap.get(b.exerciseId) : undefined;
              return (
                <li key={i}>
                  {b.type === "text" ? <span className="muted">{b.title}</span> : (
                    <><span>{ex?.name ?? `Missing: ${b.exerciseId}`}</span><span className="sub">{setsFor(b, settings)} × {repsFor(b, ex)}</span></>
                  )}
                </li>
              );
            })}
          </ol>
          <button className="cta" onClick={start}>{mode === "walk" ? "Start walk through" : "Start full workout"}</button>
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
