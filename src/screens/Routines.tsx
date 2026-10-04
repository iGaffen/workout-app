import { useState } from "react";
import { ExerciseRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { Icon } from "../components/Icons";
import type { Block, Routine } from "../model/schema";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "routine";
const uniqueId = (base: string, taken: string[]) => { let id = slug(base), n = 2; while (taken.includes(id)) id = `${slug(base)}-${n++}`; return id; };

export function Routines() {
  const data = useData(async () => ({ routines: await RoutineRepo.all(), settings: await SettingsRepo.get() }));
  const [edit, setEdit] = useState<string | null>(null);
  if (!data) return <p className="sub">Loading…</p>;
  const { routines, settings } = data;
  const r = edit ? routines.find((x) => x.id === edit) : undefined;
  if (r) return <Editor routine={r} onBack={() => setEdit(null)} />;
  const ids = routines.map((x) => x.id);

  const create = async () => {
    const id = uniqueId("My routine", ids);
    await RoutineRepo.put({ schemaVersion: 1, id, name: "My routine", sessions: [{ id: "a", name: "Session A", blocks: [] }] });
    setEdit(id);
  };
  const duplicate = async (x: Routine) => {
    const name = `${x.name} (copy)`;
    await RoutineRepo.put({ ...structuredClone(x), id: uniqueId(name, ids), name });
  };

  return (
    <>
      <div className="top"><h1>Routines</h1></div>
      {routines.map((x) => (
        <div className="card" key={x.id}>
          <div className="blockhead">
            <h2>{x.name}</h2>
            {x.id === settings.activeRoutineId ? <span className="tag">Active</span> :
              <button className="linkbtn" onClick={() => SettingsRepo.put({ ...settings, activeRoutineId: x.id })}>Make active</button>}
          </div>
          <p className="sub">{x.sessions.map((s) => `${s.name}: ${s.blocks.filter((b) => b.type === "exercise").length} exercises`).join(" · ")}</p>
          <div className="nav">
            <button onClick={() => setEdit(x.id)}>Edit</button>
            <button onClick={() => duplicate(x)}>Duplicate</button>
            <button className="danger" onClick={async () => { if (confirm(`Delete routine “${x.name}”?`)) await RoutineRepo.remove(x.id); }}>Delete</button>
          </div>
        </div>
      ))}
      <button className="cta" onClick={create}>Create routine</button>
    </>
  );
}

function Editor({ routine, onBack }: { routine: Routine; onBack: () => void }) {
  const exercises = useData(() => ExerciseRepo.all());
  const [sid, setSid] = useState(routine.sessions[0]?.id);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const session = routine.sessions.find((s) => s.id === sid) ?? routine.sessions[0];
  const name = (id?: string) => exercises?.find((e) => e.id === id)?.name ?? id;

  const save = (r: Routine) => RoutineRepo.put(r);
  const setBlocks = (blocks: Block[]) => save({ ...routine, sessions: routine.sessions.map((s) => (s.id === session.id ? { ...s, blocks } : s)) });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= session.blocks.length || from === to) return;
    const b = [...session.blocks]; const [x] = b.splice(from, 1); b.splice(to, 0, x); setBlocks(b);
  };
  const patch = (i: number, p: Partial<Block>) => setBlocks(session.blocks.map((b, j) => (j === i ? { ...b, ...p } : b)));

  return (
    <>
      <div className="top"><button className="linkbtn withicon" onClick={onBack}><Icon.back /> Routines</button></div>
      <label className="field">Routine name
        <input value={routine.name} onChange={(e) => save({ ...routine, name: e.target.value })} />
      </label>
      <div className="seg" role="group" aria-label="Session">
        {routine.sessions.map((s) => <button key={s.id} aria-pressed={s.id === session.id} onClick={() => setSid(s.id)}>{s.name}</button>)}
        <button aria-label="Add session" onClick={() => {
          const letter = String.fromCharCode(65 + routine.sessions.length);
          const id = uniqueId(letter, routine.sessions.map((s) => s.id));
          save({ ...routine, sessions: [...routine.sessions, { id, name: `Session ${letter}`, blocks: [] }] }); setSid(id);
        }}>+</button>
      </div>
      {routine.sessions.length > 1 && (
        <button className="linkbtn danger" onClick={() => { if (confirm(`Remove ${session.name}?`)) { save({ ...routine, sessions: routine.sessions.filter((s) => s.id !== session.id) }); setSid(routine.sessions[0].id); } }}>Remove {session.name}</button>
      )}

      <ol className="blocks">
        {session.blocks.map((b, i) => (
          <li key={i} data-idx={i} className={`blockrow ${drag === i ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); }} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}>
            <span className="handle" draggable aria-hidden="true"
              onDragStart={() => setDrag(i)}
              onTouchStart={() => setDrag(i)}
              onTouchEnd={(e) => {
                const t = e.changedTouches[0];
                const el = document.elementFromPoint(t.clientX, t.clientY)?.closest("[data-idx]") as HTMLElement | null;
                if (drag !== null && el) move(drag, Number(el.dataset.idx));
                setDrag(null);
              }}><Icon.grip /></span>
            <div className="blockmain">
              {b.type === "text" ? (
                <>
                  <input aria-label="Text block title" value={b.title ?? ""} onChange={(e) => patch(i, { title: e.target.value })} />
                  <textarea aria-label="Lines, one per line" rows={3} value={(b.lines ?? []).join("\n")} onChange={(e) => patch(i, { lines: e.target.value.split("\n") })} />
                </>
              ) : (
                <>
                  <strong>{name(b.exerciseId)}</strong>
                  <div className="row gap wrap">
                    <label className="mini">Reps<input value={b.reps ?? ""} placeholder="default" onChange={(e) => patch(i, { reps: e.target.value || undefined })} /></label>
                    <label className="mini">Sets
                      <select value={String(b.sets ?? "phase")} onChange={(e) => patch(i, { sets: e.target.value === "phase" ? "phase" : Number(e.target.value) })}>
                        <option value="phase">Phase</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="blockbtns">
              <button aria-label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}><Icon.up /></button>
              <button aria-label="Move down" onClick={() => move(i, i + 1)} disabled={i === session.blocks.length - 1}><Icon.down /></button>
              <button aria-label="Remove" onClick={() => setBlocks(session.blocks.filter((_, j) => j !== i))}><Icon.close /></button>
            </div>
          </li>
        ))}
      </ol>
      {session.blocks.length === 0 && <p className="sub">No blocks yet.</p>}

      {adding ? (
        <div className="card">
          <div className="blockhead"><h2>Add exercise</h2><button className="linkbtn" onClick={() => setAdding(false)}>Done</button></div>
          <ul className="liblist">
            {(exercises ?? []).map((e) => (
              <li key={e.id}><button className="libitem" onClick={() => setBlocks([...session.blocks, { type: "exercise", exerciseId: e.id, sets: "phase" }])}>
                <span className="libname">{e.name}</span><span className="sub">Tap to add</span></button></li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="nav">
          <button onClick={() => setAdding(true)}>Add from library</button>
          <button onClick={() => setBlocks([...session.blocks, { type: "text", title: "Note", lines: ["…"] }])}>Add text block</button>
        </div>
      )}
    </>
  );
}
