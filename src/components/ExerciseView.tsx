import { Figure } from "../anim/Figure";
import { MuscleMap } from "../muscles/MuscleMap";
import type { Exercise } from "../model/schema";
import { useTimer } from "./Timer";

const ROMAN_LOWER = ["i", "ii", "iii", "iv", "v"];

/** Shared exercise parts (build pack §2.10): animation frame, title and reps pill, a weight slot, muscles, cues and caution. */
export function ExerciseView({ ex, reps, hold, weight }: { ex: Exercise; reps?: string; hold?: number; weight?: React.ReactNode }) {
  const timer = useTimer();
  return (
    <>
      <Figure spec={ex.animation} name={ex.name} />
      <div className="titlerow">
        <h2>{ex.name}</h2>
        {reps && <span className="repspill">{reps}</span>}
      </div>
      {weight}
      {hold && <button className="btn btn-secondary btn-sm hold-btn" onClick={() => timer.start(hold, `${ex.name} hold`)}>Start {hold} sec hold</button>}
      <MuscleMap primary={ex.muscles.primary} secondary={ex.muscles.secondary} name={ex.name} />
      <ol className="cues">
        {ex.cues.slice(0, 3).map((c, i) => <li key={c}><span className="n" aria-hidden="true">{ROMAN_LOWER[i]}</span><span>{c}</span></li>)}
      </ol>
      {ex.notes && (
        <p className="caution">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 22 20.5H2z" /><path d="M12 10v4.5M12 17.5v.5" /></svg>
          <span>{ex.notes}</span>
        </p>
      )}
    </>
  );
}
