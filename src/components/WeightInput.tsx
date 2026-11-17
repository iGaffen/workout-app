import { useEffect, useRef, useState } from "react";
import type { Exercise } from "../model/schema";
import { isNewBest, totalKg } from "../model/progress";
import { ExerciseRepo } from "../db/repos";

const LABEL: Record<string, string> = {
  plates: "Plates you added · both sides",
  stack: "Number on the weight stack",
  dumbbell: "Dumbbell weight",
};
const STEP = 2.5;

/** The weight window (build pack §2.10): − / rolling value / +, last time, new-best gold, and the base + total box. */
export function WeightInput({ ex, value, onChange, last, best }: {
  ex: Exercise; value?: number; onChange: (v?: number) => void; last?: { weightKg: number }; best?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  const [dir, setDir] = useState<"up" | "down">("up");
  const [rollKey, setRollKey] = useState(0);
  const [dip, setDip] = useState(false);
  const [editBase, setEditBase] = useState(false);
  const hold = useRef<{ t?: number; delay: number }>({ delay: 300 });
  const valRef = useRef(value);
  valRef.current = value;
  useEffect(() => () => clearTimeout(hold.current.t), []);

  const shown = value ?? last?.weightKg;
  const plates = ex.weightKind === "plates";
  const newBest = isNewBest(value, best);

  const bump = (d: number) => {
    const base = valRef.current ?? last?.weightKg ?? 0;
    const v = Math.max(0, Math.round((base + d) * 10) / 10);
    valRef.current = v;
    onChange(v);
    setText(null);
    setDir(d > 0 ? "up" : "down");
    setRollKey((k) => k + 1);
    setDip(true); setTimeout(() => setDip(false), 100);
  };
  // Hold to repeat: starts at 300 ms, each step 0.75× faster, down to 80 ms.
  const startHold = (d: number) => {
    bump(d);
    hold.current.delay = 300;
    const tick = () => { bump(d); hold.current.delay = Math.max(80, hold.current.delay * 0.75); hold.current.t = window.setTimeout(tick, hold.current.delay); };
    hold.current.t = window.setTimeout(tick, 300);
  };
  const stopHold = () => clearTimeout(hold.current.t);
  const stepProps = (d: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); startHold(d); },
    onPointerUp: stopHold, onPointerLeave: stopHold, onPointerCancel: stopHold,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bump(d); } },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="panel weightpanel">
      <span className="label">{LABEL[ex.weightKind ?? ""] ?? "Weight"}</span>
      <div className="controlrow">
        <button className="step minus" aria-label="Less weight" {...stepProps(-STEP)}><svg viewBox="0 0 24 24"><path d="M6 12h12" /></svg></button>
        <label className={`window ${newBest ? "best" : ""} ${String(text ?? value ?? "").length > 3 ? "long" : ""}`}>
          <span key={rollKey} className={`rollval ${rollKey ? dir : ""}`} style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <input inputMode="decimal" aria-label={LABEL[ex.weightKind ?? ""] ?? "Weight in kilograms"} placeholder={last ? String(last.weightKg) : "—"}
              value={text ?? (value === undefined ? "" : String(value))}
              onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value.replace(",", ".")); onChange(Number.isFinite(n) && n >= 0 ? n : undefined); }}
              onBlur={() => setText(null)} />
            {newBest && <span className="pb">PB</span>}
          </span>
          {ex.weightKind !== "stack" && <span className="unit">KG</span>}
        </label>
        <button className="step plus" aria-label="More weight" {...stepProps(STEP)}><svg viewBox="0 0 24 24"><path d="M6 12h12M12 6v12" /></svg></button>
      </div>
      <span className="lasttime">{last ? `Last time · ${last.weightKg}` : "First time · leave 2–3 reps in reserve"}</span>
      {plates && (
        <div className="basebox">
          <div>
            <p className="basetext">{ex.baseLabel ?? "Bar"}: {ex.baseKg ?? 0} kg{ex.baseEstimate ? " (estimate)" : ""}</p>
            {editBase ? (
              <span className="baseedit">
                <input inputMode="decimal" aria-label={`${ex.baseLabel ?? "Bar"} weight in kilograms`} defaultValue={ex.baseKg ?? 0} autoFocus onBlur={async (e) => {
                  const n = parseFloat(e.target.value.replace(",", "."));
                  if (Number.isFinite(n) && n >= 0) await ExerciseRepo.put({ ...ex, baseKg: n, baseEstimate: false });
                  setEditBase(false);
                }} />
                <span className="meta">kg</span>
              </span>
            ) : (
              <button className="link" onClick={() => setEditBase(true)}>Change {ex.baseLabel ?? "bar"} weight</button>
            )}
          </div>
          {shown !== undefined && <span className={`total ${dip ? "dip" : ""}`}>≈ {totalKg(ex, shown)} KG</span>}
        </div>
      )}
    </div>
  );
}
