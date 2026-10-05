import { useState } from "react";
import type { Exercise, Session, Settings, WorkoutLog } from "../model/schema";
import { lastWeight, takesWeight } from "../model/progress";
import { WeightInput } from "../components/WeightInput";
import { holdFor, repsFor, restFor, setsFor, step, type RunState } from "../model/plan";
import { ExerciseView } from "../components/ExerciseView";
import { useTimer } from "../components/Timer";
import { TextBlock } from "./Today";
import { BackupButton } from "../components/BackupButton";
import { useBackHandler } from "../components/back";

interface Props { session: Session; settings: Settings; exMap: Map<string, Exercise>; logs: WorkoutLog[]; visible: boolean; onFinish: (sets: NonNullable<WorkoutLog["sets"]>) => Promise<void>; onExit: () => void }

export function Runner({ session, settings, exMap, logs, visible, onFinish, onExit }: Props) {
  const [weights, setWeights] = useState<Record<string, number | undefined>>({});
  const [sets, setSets] = useState<NonNullable<WorkoutLog["sets"]>>([]);
  const [st, setSt] = useState<RunState>({ idx: 0, set: 1 });
  const [done, setDone] = useState(false);
  const timer = useTimer();
  const blocks = session.blocks;
  // Phone back: previous exercise; on the first one (or the done screen) ask before leaving.
  useBackHandler(visible, () => {
    if (done) { onExit(); return; }
    if (st.idx > 0) { act("back"); return; }
    if (confirm("End this workout? It will not be saved.")) { timer.stop(); onExit(); }
  }, 1);
  const exBlocks = blocks.filter((b) => b.type === "exercise");

  const act = (a: "setDone" | "next" | "back" | "skip") => {
    const b = blocks[st.idx];
    const r = step(session, settings, st, a);
    let logged = sets;
    if (a === "setDone" && b.exerciseId) {
      const ex = exMap.get(b.exerciseId);
      const w = weights[b.exerciseId] ?? (ex && takesWeight(ex) ? lastWeight(logs, b.exerciseId)?.weightKg : undefined);
      logged = [...sets.filter((x) => !(x.exerciseId === b.exerciseId && x.setIndex === st.set)), { exerciseId: b.exerciseId, setIndex: st.set, ...(w !== undefined ? { weightKg: w } : {}) }];
      setSets(logged);
    }
    setSt(r.state);
    if (r.state.idx !== st.idx) scrollTo(0, 0);
    if (r.rest === "set") timer.start(restFor(b, settings), `Rest, then set ${r.state.set}`);
    if (r.rest === "exercise") timer.start(restFor(b, settings), "Rest, move to the next exercise");
    if (r.finished) { setDone(true); timer.stop(); onFinish(logged); }
  };

  const dots = (
    <div className="dots" aria-label={`Step ${Math.min(st.idx + 1, blocks.length)} of ${blocks.length}`}>
      {blocks.map((_, i) => <i key={i} className={i < st.idx || done ? "done" : i === st.idx ? "now" : ""} />)}
    </div>
  );

  const header = (
    <div className="top">
      <h1>{session.name}</h1>
      <button className="linkbtn" onClick={() => { timer.stop(); onExit(); }}>End workout</button>
    </div>
  );

  if (done) {
    return (
      <>{header}{dots}
        <div className="card done">
          <h2>Workout done</h2>
          <p className="sub">Nice work. Saved to your history. An easy walk on a non-gym day helps too.</p>
          <BackupButton />
          <button className="cta" onClick={onExit}>Back to Today</button>
        </div>
      </>
    );
  }

  const b = blocks[st.idx];
  const nav = (
    <div className="nav">
      <button onClick={() => act("back")} disabled={st.idx === 0}>Back</button>
      <button onClick={() => act("skip")}>Skip ahead</button>
    </div>
  );

  if (b.type === "text") {
    return <>{header}{dots}<TextBlock b={b}><button className="cta" onClick={() => act("next")}>Next</button></TextBlock>{nav}</>;
  }
  const ex = exMap.get(b.exerciseId!);
  const total = setsFor(b, settings);
  const n = exBlocks.indexOf(b) + 1;
  return (
    <>{header}{dots}
      <div className="card">
        <div className="blockhead"><h2>Exercise {n} of {exBlocks.length}</h2><span className="sub">{total} sets, rest {restFor(b, settings)} sec between</span></div>
        {ex ? <ExerciseView ex={ex} reps={repsFor(b, ex)} hold={holdFor(b, ex)} large
          weight={takesWeight(ex) ? <WeightInput key={ex.id} value={weights[ex.id]} last={lastWeight(logs, ex.id)} onChange={(v) => setWeights((w) => ({ ...w, [ex.id]: v }))} /> : undefined} /> : <p>Exercise “{b.exerciseId}” is missing. Skip ahead.</p>}
        <div className="rounds">
          <span className="big">Set {st.set} of {total}</span>
          <span className="rdots">{Array.from({ length: total }, (_, i) => <i key={i} className={i < st.set - 1 ? "done" : ""} />)}</span>
        </div>
        <button className="cta" onClick={() => act("setDone")}>{st.set < total ? "Set done, start rest" : st.idx === blocks.length - 1 ? "Last set done, finish" : "Last set done, next exercise"}</button>
      </div>
      {nav}
    </>
  );
}
