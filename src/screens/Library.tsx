import { useState } from "react";
import { ExerciseRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { MUSCLE_GROUPS, MUSCLE_LABEL } from "../muscles/labels";
import { ExerciseView } from "../components/ExerciseView";
import { Glyph, type GlyphName } from "../components/Glyph";
import { useBackHandler } from "../components/back";
import type { Exercise } from "../model/schema";

// Chip filters (build pack §3.3). "Core" isn't in the design's chip row, so it's left out.
const MUSCLE_CHIPS = ["All", "Back", "Chest", "Legs", "Shoulders", "Arms"];
const EQUIP_CHIPS = ["Any", "Cable", "Plates", "Dumbbell"];

/** Equipment word for the row meta: CABLE / STACK / PLATES / DUMBBELL. */
export function equipWord(e: Exercise): string {
  if (e.weightKind === "plates") return "Plates";
  if (e.weightKind === "dumbbell") return "Dumbbell";
  if (e.equipment.includes("cable")) return "Cable";
  if (e.weightKind === "stack") return "Stack";
  return e.equipment[0] ?? "";
}
const badgeOf = (e: Exercise): GlyphName => `move-${e.badge ?? "press"}` as GlyphName;

export function Library() {
  const all = useData(() => ExerciseRepo.all(true));
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [equip, setEquip] = useState("Any");
  const [showHidden, setShowHidden] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  if (!all) return null;
  if (open) return <Detail id={open} onBack={() => setOpen(null)} />;

  const g = MUSCLE_GROUPS.find((x) => x.label === group);
  const list = all
    .filter((e) => (showHidden ? e.hidden : !e.hidden) &&
      e.name.toLowerCase().includes(q.trim().toLowerCase()) &&
      (!g || e.muscles.primary.some((m) => g.ids.includes(m))) &&
      (equip === "Any" || (equip === "Cable" ? ["Cable", "Stack"].includes(equipWord(e)) : equipWord(e) === equip)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const visible = all.filter((e) => !e.hidden).length;
  const hiddenCount = all.filter((e) => e.hidden).length;

  return (
    <>
      <p className="label">{visible} exercises</p>
      <h1 className="title">Library</h1>
      <label className="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input type="search" placeholder="Search exercises" aria-label="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="chips" style={{ marginTop: 16 }} role="group" aria-label="Muscle group">
        {MUSCLE_CHIPS.map((c) => <button key={c} className="chip" aria-pressed={group === c} onClick={() => setGroup(c)}>{c}</button>)}
      </div>
      <div className="chips" style={{ marginTop: 10 }} role="group" aria-label="Equipment">
        {EQUIP_CHIPS.map((c) => <button key={c} className="chip" aria-pressed={equip === c} onClick={() => setEquip(c)}>{c}</button>)}
      </div>
      <ul className="liblist">
        {list.map((e) => (
          <li key={e.id}>
            <button className="librow" onClick={() => { setOpen(e.id); scrollTo(0, 0); }}>
              <span className="badge"><Glyph name={badgeOf(e)} active size={20} /></span>
              <span className="grow">
                <span className="lname" style={{ display: "block" }}>{e.name}{e.hidden && <span className="tag">Hidden</span>}</span>
                <span className="lmeta" style={{ display: "block" }}>{equipWord(e)} · {MUSCLE_LABEL[e.muscles.primary[0]]}</span>
              </span>
              <Glyph name="chevron" size={18} />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="meta" style={{ padding: "18px 0" }}>Nothing matches. Try another word.</li>}
      </ul>
      <button className="hiddenbtn" aria-pressed={showHidden} onClick={() => setShowHidden((x) => !x)}>
        {showHidden ? "Back to all exercises" : `Hidden exercises (${hiddenCount})`}
      </button>
    </>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const ex = useData(() => ExerciseRepo.get(id), [id]);
  useBackHandler(true, onBack, 1);
  if (!ex) return null;
  const bundled = ExerciseRepo.isBundled(ex.id);
  return (
    <div className="stack">
      <button className="backlink" onClick={onBack}><span style={{ transform: "scaleX(-1)", display: "inline-flex" }}><Glyph name="chevron" size={16} /></span>Library</button>
      <ExerciseView ex={ex} reps={`3 × ${ex.defaultReps}`} />
      <p className="meta">Equipment: {ex.equipment.join(", ")}</p>
      <button className="btn btn-secondary btn-sm" onClick={() => ExerciseRepo.setHidden(ex.id, !ex.hidden)}>{ex.hidden ? "Restore" : "Hide"}</button>
      {!bundled && <button className="btn btn-danger" onClick={async () => { if (confirm(`Delete ${ex.name}? This cannot be undone.`)) { await ExerciseRepo.remove(ex.id); onBack(); } }}>Delete</button>}
    </div>
  );
}
