import type { Exercise } from "../model/schema";
import { ExerciseView } from "./ExerciseView";
import { useBackHandler } from "./back";
import { Icon } from "./Icons";

/** Pop-up exercise card. Closes with the X, tapping outside, or the phone's back button. */
export function ExerciseSheet({ ex, reps, onClose }: { ex: Exercise; reps?: string; onClose: () => void }) {
  useBackHandler(true, onClose, 2);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={ex.name} onClick={onClose}>
      <div className="modalcard sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheetclose" onClick={onClose} aria-label="Close" autoFocus><Icon.close /></button>
        <ExerciseView ex={ex} reps={reps} large />
      </div>
    </div>
  );
}
