import { useMemo, useState } from "react";
import { ExerciseRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { MUSCLE_GROUPS } from "../muscles/labels";
import { Figure } from "../anim/Figure";
import { MuscleMap } from "../muscles/MuscleMap";
import { Icon } from "../components/Icons";
import { useReducedMotion } from "../components/hooks";
import { useBackHandler } from "../components/back";

export function Library() {
  const all = useData(() => ExerciseRepo.all(true));
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [equip, setEquip] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const equipment = useMemo(() => [...new Set((all ?? []).flatMap((e) => e.equipment))].sort(), [all]);

  if (!all) return <p className="sub">Loading…</p>;
  const sel = open ? all.find((e) => e.id === open) : undefined;
  if (sel) return <Detail id={sel.id} onBack={() => setOpen(null)} />;

  const g = MUSCLE_GROUPS.find((x) => x.label === group);
  const list = all.filter((e) =>
    (showHidden || !e.hidden) &&
    e.name.toLowerCase().includes(q.trim().toLowerCase()) &&
    (!g || [...e.muscles.primary, ...e.muscles.secondary].some((m) => g.ids.includes(m))) &&
    (!equip || e.equipment.includes(equip)));
  const hiddenCount = all.filter((e) => e.hidden).length;

  return (
    <>
      <div className="top"><h1>Library</h1></div>
      <input className="search" type="search" placeholder="Search exercises" aria-label="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row flexwrap gap">
        <select aria-label="Muscle group" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All muscles</option>
          {MUSCLE_GROUPS.map((m) => <option key={m.label}>{m.label}</option>)}
        </select>
        <select aria-label="Equipment" value={equip} onChange={(e) => setEquip(e.target.value)}>
          <option value="">All equipment</option>
          {equipment.map((x) => <option key={x}>{x}</option>)}
        </select>
        {hiddenCount > 0 && <label className="check"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden ({hiddenCount})</label>}
      </div>
      <ul className="liblist">
        {list.map((e) => (
          <li key={e.id}>
            <button className="libitem" onClick={() => { setOpen(e.id); scrollTo(0, 0); }}>
              <span className="libname">{e.name}{e.hidden && <span className="tag">Hidden</span>}</span>
              <span className="sub">{e.equipment.join(", ")} · {e.defaultReps}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="sub">No exercises match.</li>}
      </ul>
    </>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const ex = useData(() => ExerciseRepo.get(id), [id]);
  useBackHandler(true, onBack, 1);
  useReducedMotion();
  if (!ex) return null;
  const bundled = ExerciseRepo.isBundled(ex.id);
  return (
    <>
      <div className="top"><button className="linkbtn withicon" onClick={onBack}><Icon.back /> Library</button></div>
      <div className="card">
        <Figure spec={ex.animation} name={ex.name} large />
        <h2>{ex.name}</h2>
        <div className="row flexwrap gap"><span className="reps">{ex.defaultReps}</span><span className="sub">Equipment: {ex.equipment.join(", ")}</span></div>
        <MuscleMap primary={ex.muscles.primary} secondary={ex.muscles.secondary} name={ex.name} />
        <h3 className="small">Form cues</h3>
        <ul className="cues">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
        {ex.notes && <p className="note">{ex.notes}</p>}
        <div className="nav">
          {ex.hidden
            ? <button onClick={() => ExerciseRepo.setHidden(ex.id, false)}>Restore</button>
            : <button onClick={() => ExerciseRepo.setHidden(ex.id, true)}>Hide</button>}
          {!bundled && <button className="danger" onClick={async () => { if (confirm(`Delete ${ex.name}? This cannot be undone.`)) { await ExerciseRepo.remove(ex.id); onBack(); } }}>Delete</button>}
        </div>
        {bundled && <p className="sub">Built-in exercises can be hidden and restored, not deleted.</p>}
      </div>
    </>
  );
}
