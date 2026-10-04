import { useState } from "react";
import type { MuscleId } from "../model/schema";
import { BACK, FRONT, SILHOUETTE, pickViews } from "./shapes";
import { MUSCLE_LABEL } from "./labels";

interface Props { primary: MuscleId[]; secondary: MuscleId[]; name: string; compact?: boolean }

function Body({ view, primary, secondary }: { view: "front" | "back"; primary: MuscleId[]; secondary: MuscleId[] }) {
  const shapes = view === "front" ? FRONT : BACK;
  const cls = (m: MuscleId) => (primary.includes(m) ? "m-primary" : secondary.includes(m) ? "m-secondary" : "m-off");
  return (
    <g>
      <path className="silhouette" d={SILHOUETTE} />
      {(Object.keys(shapes) as MuscleId[]).map((m) => (
        <g key={m} className={cls(m)}>
          <path d={shapes[m]} />
          <path d={shapes[m]} transform="translate(100 0) scale(-1 1)" />
        </g>
      ))}
    </g>
  );
}

function Diagram({ primary, secondary, name }: Props) {
  const views = pickViews(primary, secondary);
  const w = views.length * 100 + (views.length - 1) * 10;
  return (
    <svg className="musclesvg" viewBox={`0 -4 ${w} 222`} role="img"
      aria-label={`${name} muscle diagram, ${views.join(" and ")} view`}>
      {views.map((v, i) => (
        <g key={v} transform={`translate(${i * 110} 0)`}>
          <Body view={v} primary={primary} secondary={secondary} />
          <text x="50" y="216" textAnchor="middle" className="viewlbl">{v === "front" ? "Front" : "Back"}</text>
        </g>
      ))}
    </svg>
  );
}

export function MuscleChips({ primary, secondary }: { primary: MuscleId[]; secondary: MuscleId[] }) {
  return (
    <div className="mchips">
      <span className="mchip primary"><span className="sw" aria-hidden="true" />Primary: {primary.map((m) => MUSCLE_LABEL[m]).join(", ")}</span>
      {secondary.length > 0 && <span className="mchip secondary"><span className="sw" aria-hidden="true" />Also: {secondary.map((m) => MUSCLE_LABEL[m]).join(", ")}</span>}
    </div>
  );
}

export function MuscleMap(props: Props) {
  const [big, setBig] = useState(false);
  return (
    <div className={`musclemap ${props.compact ? "compact" : ""}`}>
      <button className="mapbtn" onClick={() => setBig(true)} aria-label={`Enlarge ${props.name} muscle diagram`}>
        <Diagram {...props} />
      </button>
      <MuscleChips primary={props.primary} secondary={props.secondary} />
      {big && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`${props.name} muscles`} onClick={() => setBig(false)}>
          <div className="modalcard" onClick={(e) => e.stopPropagation()}>
            <h2>{props.name}</h2>
            <Diagram {...props} />
            <MuscleChips primary={props.primary} secondary={props.secondary} />
            <button className="cta" onClick={() => setBig(false)} autoFocus>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
