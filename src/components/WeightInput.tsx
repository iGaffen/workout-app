import { useState } from "react";
import type { Exercise } from "../model/schema";
import { totalKg } from "../model/progress";
import { ExerciseRepo } from "../db/repos";

const LABEL: Record<string, string> = {
  plates: "Plates you added (both sides together)",
  stack: "Number on the weight stack",
  dumbbell: "Dumbbell weight",
};

/** kg stepper with "last time" hint, and for plate-loaded kit the empty bar/sled plus an approximate total. */
export function WeightInput({ ex, value, onChange, last }: { ex: Exercise; value?: number; onChange: (v?: number) => void; last?: { weightKg: number; sets: number } }) {
  const [text, setText] = useState<string | null>(null);
  const [editBase, setEditBase] = useState(false);
  const shown = value ?? last?.weightKg;
  const step = (d: number) => { const v = Math.max(0, Math.round(((value ?? last?.weightKg ?? 0) + d) * 10) / 10); onChange(v); setText(null); };
  const plates = ex.weightKind === "plates";
  return (
    <div className="weight">
      <p className="weightlabel">{LABEL[ex.weightKind ?? ""] ?? "Weight"}</p>
      <div className="weightrow">
        <button onClick={() => step(-2.5)} aria-label="Minus 2.5 kilograms">−</button>
        <label className="weightfield">
          <input inputMode="decimal" aria-label={LABEL[ex.weightKind ?? ""] ?? "Weight in kilograms"} placeholder={last ? String(last.weightKg) : "kg"}
            value={text ?? (value === undefined ? "" : String(value))}
            onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value.replace(",", ".")); onChange(Number.isFinite(n) && n >= 0 ? n : undefined); }}
            onBlur={() => setText(null)} />
          <span aria-hidden="true">{ex.weightKind === "stack" ? "" : "kg"}</span>
        </label>
        <button onClick={() => step(2.5)} aria-label="Plus 2.5 kilograms">+</button>
      </div>
      <p className="sub">{last ? `Last time: ${last.weightKg}` : "First time: pick a weight that leaves 2–3 reps in reserve"}</p>
      {plates && (
        <div className="basebox">
          <p>
            {ex.baseLabel ?? "Bar"}: <strong>{ex.baseKg ?? 0} kg</strong>{ex.baseEstimate ? " (estimate)" : ""}
            {shown !== undefined && <> · Total ≈ <strong>{totalKg(ex, shown)} kg</strong></>}
          </p>
          {editBase ? (
            <label className="mini">{ex.baseLabel ?? "Bar"} weight (kg)
              <input inputMode="decimal" defaultValue={ex.baseKg ?? 0} autoFocus onBlur={async (e) => {
                const n = parseFloat(e.target.value.replace(",", "."));
                if (Number.isFinite(n) && n >= 0) await ExerciseRepo.put({ ...ex, baseKg: n, baseEstimate: false });
                setEditBase(false);
              }} />
            </label>
          ) : (
            <button className="linkbtn" onClick={() => setEditBase(true)}>Change {ex.baseLabel ?? "bar"} weight</button>
          )}
        </div>
      )}
    </div>
  );
}
