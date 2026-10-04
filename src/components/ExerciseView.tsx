import { Figure } from "../anim/Figure";
import { MuscleMap } from "../muscles/MuscleMap";
import type { Exercise } from "../model/schema";
import { useTimer } from "./Timer";

/** Animation, name, reps, muscles, cues. Used by the runner, full view and library. */
export function ExerciseView({ ex, reps, hold, meta, large, weight }: { ex: Exercise; reps?: string; hold?: number; meta?: string; large?: boolean; weight?: React.ReactNode }) {
  const timer = useTimer();
  return (
    <div className="exview">
      <Figure spec={ex.animation} name={ex.name} large={large} />
      <h3 className="name">{ex.name}</h3>
      <div className="row flexwrap">
        {reps && <span className="reps">{reps}</span>}
        {meta && <span className="sub">{meta}</span>}
      </div>
      {weight}
      <MuscleMap primary={ex.muscles.primary} secondary={ex.muscles.secondary} name={ex.name} />
      <ul className="cues">{ex.cues.slice(0, 3).map((c) => <li key={c}>{c}</li>)}</ul>
      {ex.notes && <p className="note">{ex.notes}</p>}
      {hold && <button className="hold" onClick={() => timer.start(hold, `${ex.name} hold`)}>Start {hold} sec hold</button>}
    </div>
  );
}
