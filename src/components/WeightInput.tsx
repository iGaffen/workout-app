import { useState } from "react";

/** kg stepper with "last time" hint. Empty means not logged. */
export function WeightInput({ value, onChange, last }: { value?: number; onChange: (v?: number) => void; last?: { weightKg: number; sets: number } }) {
  const [text, setText] = useState<string | null>(null);
  const step = (d: number) => { const v = Math.max(0, Math.round(((value ?? last?.weightKg ?? 0) + d) * 10) / 10); onChange(v); setText(null); };
  return (
    <div className="weight">
      <div className="weightrow">
        <button onClick={() => step(-2.5)} aria-label="Minus 2.5 kilograms">−</button>
        <label className="weightfield">
          <input inputMode="decimal" aria-label="Weight in kilograms" placeholder={last ? String(last.weightKg) : "kg"}
            value={text ?? (value === undefined ? "" : String(value))}
            onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value.replace(",", ".")); onChange(Number.isFinite(n) && n >= 0 ? n : undefined); }}
            onBlur={() => setText(null)} />
          <span aria-hidden="true">kg</span>
        </label>
        <button onClick={() => step(2.5)} aria-label="Plus 2.5 kilograms">+</button>
      </div>
      <p className="sub">{last ? `Last time: ${last.weightKg} kg` : "First time: pick a weight that leaves 2–3 reps in reserve"}</p>
    </div>
  );
}
