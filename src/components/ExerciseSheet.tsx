import { useState } from "react";
import { createPortal } from "react-dom";
import type { Exercise } from "../model/schema";
import { ExerciseView } from "./ExerciseView";
import { WeightInput } from "./WeightInput";
import { useBackHandler } from "./back";
import { Glyph } from "./Glyph";
import { roman, takesWeight } from "../model/progress";

interface Props {
  ex: Exercise; index?: number; total?: number; reps?: string;
  options?: { id: string; name: string }[]; onChoose?: (id: string) => void;
  /** Without onWeight / onDone the sheet is a read-only preview (used by the routine editor). */
  weight?: number; last?: { weightKg: number }; best?: number; onWeight?: (v?: number) => void;
  done?: boolean; onDone?: () => void; onClose: () => void;
}

const short = (n: string) => n.replace(/^Cable /, "").replace(/ machine$/, "");

/** Bottom sheet for one exercise (build pack §2.10, §3.2). Closes with X, tapping outside, or the back button. */
export function ExerciseSheet(p: Props) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(p.onClose, matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 250);
  };
  useBackHandler(true, close, 2);
  // Rendered at the top of the page so it sits above the tab bar.
  return createPortal(
    <>
      <div className={`backdrop ${closing ? "closing" : ""}`} onClick={close} />
      <div className={`sheet ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-label={p.ex.name}>
        <div className="sheet-scroll">
          <div className="handle" aria-hidden="true" />
          <div className="sheet-head">
            <span className="label">{p.index && p.total ? `${roman(p.index)} of ${roman(p.total)}` : "Exercise"}</span>
            <button className="iconbtn" onClick={close} aria-label="Close"><Glyph name="close" size={20} /></button>
          </div>
          {p.options && p.options.length > 1 && (
            <div className="seg" role="group" aria-label="Pick one">
              {p.options.map((o) => <button key={o.id} aria-pressed={o.id === p.ex.id} onClick={() => p.onChoose?.(o.id)}>{short(o.name)}</button>)}
            </div>
          )}
          <ExerciseView key={p.ex.id} ex={p.ex} reps={p.reps ?? p.ex.defaultReps}
            weight={takesWeight(p.ex) && p.onWeight ? <WeightInput key={p.ex.id} ex={p.ex} value={p.weight} last={p.last} best={p.best} onChange={p.onWeight} /> : undefined} />
          <div style={{ height: 8 }} />
        </div>
        {p.onDone && (
          <div className="sheet-foot">
            <button className={`btn ${p.done ? "btn-secondary" : "btn-primary"}`} onClick={() => { p.onDone?.(); close(); }}>
              {p.done ? "Mark not done" : "Mark as done"}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
