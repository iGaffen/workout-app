import { useState } from "react";
import { createPortal } from "react-dom";
import type { MuscleId } from "../model/schema";
import { BACK, FRONT, SILHOUETTE } from "./shapes";
import { MUSCLE_LABEL } from "./labels";
import { useBackHandler } from "../components/back";

interface Props { primary: MuscleId[]; secondary: MuscleId[]; name: string }

function Body({ view, primary, secondary }: { view: "front" | "back"; primary: MuscleId[]; secondary: MuscleId[] }) {
  const shapes = view === "front" ? FRONT : BACK;
  const cls = (m: MuscleId) => (primary.includes(m) ? "m-primary" : secondary.includes(m) ? "m-secondary" : "m-off");
  return (
    <svg viewBox="0 0 100 210" aria-hidden="true">
      <path className="silhouette" d={SILHOUETTE} />
      {(Object.keys(shapes) as MuscleId[]).map((m) => (
        <g key={m} className={cls(m)}>
          <path d={shapes[m]} />
          <path d={shapes[m]} transform="translate(100 0) scale(-1 1)" />
        </g>
      ))}
    </svg>
  );
}

const names = (ids: MuscleId[]) => ids.map((m) => MUSCLE_LABEL[m]).join(", ");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Muscle panel (build pack §2.10): front and back silhouettes, names always written out. Tap to enlarge. */
export function MuscleMap({ primary, secondary, name }: Props) {
  const [big, setBig] = useState(false);
  useBackHandler(big, () => setBig(false), 3);
  const legend = (
    <div className="musclelegend">
      <span className="label"><span className="swatch p" aria-hidden="true" />Primary</span>
      <span className="pname">{cap(names(primary))}</span>
      {secondary.length > 0 && <>
        <span className="label" style={{ marginTop: 4 }}><span className="swatch s" aria-hidden="true" />Also</span>
        <span className="sname">{cap(names(secondary))}</span>
      </>}
    </div>
  );
  return (
    <>
      <button className="panel musclepanel" onClick={() => setBig(true)} aria-label={`${name} muscles: primary ${names(primary)}${secondary.length ? `; also ${names(secondary)}` : ""}. Tap to enlarge`}>
        <span className="musclebodies"><Body view="front" primary={primary} secondary={secondary} /><Body view="back" primary={primary} secondary={secondary} /></span>
        {legend}
      </button>
      {big && createPortal(
        <div className="modal" role="dialog" aria-modal="true" aria-label={`${name} muscles`} onClick={() => setBig(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="bigbodies"><Body view="front" primary={primary} secondary={secondary} /><Body view="back" primary={primary} secondary={secondary} /></div>
            {legend}
            <button className="btn btn-secondary btn-sm" onClick={() => setBig(false)} autoFocus>Close</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
