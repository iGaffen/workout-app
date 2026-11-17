import { useRef, useState } from "react";
import { ExerciseRepo, LogRepo, RemindersRepo, RoutineRepo, SettingsRepo, applyPack, exportAll, wipeAll } from "../db/repos";
import { daysUntilDue, trainingDaysOf } from "../model/progress";
import { Monogram } from "../components/Glyph";

const FULL_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
import { backupNow } from "../components/backup";
import { useData } from "../components/hooks";
import { parsePack, previewPack, summary, type PackPreview } from "../model/pack";
import type { Pack, Settings as S } from "../model/schema";

export function Settings() {
  const d = useData(async () => ({ s: await SettingsRepo.get(), logs: await LogRepo.all(), lastExport: await RemindersRepo.lastExport() }));
  const s = d?.s;
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<{ pack: Pack; pv: PackPreview } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  if (!d || !s) return <p className="sub">Loading…</p>;
  const backupDue = daysUntilDue(d.lastExport, 30) <= 0 && d.logs.length > 0;
  const put = (p: Partial<S>) => SettingsRepo.put({ ...s, ...p });

  const check = async (t: string) => {
    setErr(""); setMsg(""); setPending(null);
    const r = parsePack(t);
    if (!r.ok) { setErr(r.error); return; }
    const pv = previewPack(r.pack, (await ExerciseRepo.all(true)).map((e) => e.id), (await RoutineRepo.all()).map((x) => x.id));
    setPending({ pack: r.pack, pv });
  };
  const apply = async () => {
    if (!pending) return;
    try { await applyPack(pending.pack); setMsg(`Done. ${summary(pending.pv)}.`); setPending(null); setText(""); }
    catch (e) { setErr(`Nothing was changed. ${(e as Error).message}`); }
  };

  const days = trainingDaysOf(s);
  const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first, as drawn
  const LETTER = ["S", "M", "T", "W", "T", "F", "S"];
  const dayNames = days.map((d) => FULL_DAY[d]);
  const changes = pending ? pending.pv.add.length + pending.pv.update.length + pending.pv.addRoutines.length + pending.pv.updateRoutines.length + pending.pv.remove.length + pending.pv.other.length : 0;

  return (
    <div className="stack">
      <div>
        <p className="label">Version {__BUILD__.slice(0, 10)}</p>
        <h1 className="title" style={{ marginBottom: 0 }}>Settings</h1>
      </div>
      <hr className="rule-gold" style={{ margin: 0 }} />
      {backupDue && <p className="due" role="status">{d.lastExport ? "Keep a copy safe. Your last backup was over 30 days ago." : "Keep a copy safe. You haven't backed up yet."}</p>}

      <section className="stack" style={{ gap: 12 }}>
        <span className="label">Gym days</span>
        <div className="days" role="group" aria-label="Gym days">
          {ORDER.map((i) => {
            const on = days.includes(i);
            return <button key={i} className="daybtn" aria-pressed={on} aria-label={FULL_DAY[i]} onClick={() => {
              const next = on ? days.filter((x) => x !== i) : [...days, i];
              if (next.length) put({ trainingDays: next });
            }}>{LETTER[i]}</button>;
          })}
        </div>
        <p className="meta" style={{ fontSize: 15 }}>{dayNames.length === 2 ? dayNames.join(" and ") : dayNames.join(", ")}</p>
      </section>
      <hr className="rule" style={{ margin: 0 }} />

      <section className="stack" style={{ gap: 12 }}>
        <span className="label">Theme</span>
        <div className="seg" role="group" aria-label="Theme">
          <button aria-pressed={s.theme === "system"} onClick={() => put({ theme: "system" })}>System</button>
          <button disabled aria-label="Light (coming later)">Light</button>
          <button aria-pressed={s.theme !== "system"} onClick={() => put({ theme: "dark" })}>Dark</button>
        </div>
        <p className="meta">The light theme comes later. System follows dark for now.</p>
      </section>

      <section className="panel">
        <span className="label">Import</span>
        <textarea className="window-input" aria-label="Pack JSON" placeholder="Paste a routine pack here" value={text} onChange={(e) => { setText(e.target.value); setPending(null); setErr(""); }} />
        <div className="row-btns">
          <button className="btn btn-secondary btn-sm" onClick={() => check(text)} disabled={!text.trim()}>Check pack</button>
          <button className="btn btn-secondary btn-sm" onClick={() => file.current?.click()}>Choose file</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const t = await f.text(); setText(t); check(t); } catch { setErr("That file didn't read. Try another."); }
            e.target.value = "";
          }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={apply} disabled={!pending}>Apply</button>
        {err && <div role="alert"><p className="error">That pack didn't read. Check it and try again.</p><p className="meta" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{err}</p></div>}
        {msg && <p className="ok" role="status">{msg}</p>}
        {pending ? (
          <div className="preview" role="status">
            <strong>Pack looks good. {changes} change{changes === 1 ? "" : "s"}.</strong>
            <ul>
              {pending.pv.add.length > 0 && <li>New: {pending.pv.add.join(", ")}</li>}
              {pending.pv.update.length > 0 && <li>Updated: {pending.pv.update.join(", ")}</li>}
              {pending.pv.addRoutines.length + pending.pv.updateRoutines.length > 0 && <li>Routines: {[...pending.pv.addRoutines, ...pending.pv.updateRoutines].join(", ")}</li>}
              {pending.pv.remove.length > 0 && <li>Remove: {pending.pv.remove.join(", ")}</li>}
              {pending.pv.other.length > 0 && <li>Restores {pending.pv.other.join(", ")}</li>}
              {pending.pv.missingRefs.length > 0 && <li className="warn">Routines use unknown exercises: {pending.pv.missingRefs.join(", ")}</li>}
            </ul>
          </div>
        ) : !err && !msg && <p className="meta">A preview of what will change appears here before you apply.</p>}
      </section>

      <section className="panel">
        <span className="label">Backup</span>
        <button className="btn btn-primary" onClick={async () => { const r = await backupNow(); if (r !== "cancelled") setMsg(r === "shared" ? "Saved." : "Saved to Downloads."); }}>Export all data</button>
        <p className="meta">Opens your phone's share menu, for example to save to Google Drive.{d.lastExport ? ` Last backup ${new Date(d.lastExport).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.` : ""}</p>
        <button className="btn btn-danger" onClick={async () => {
          if (confirm("Reset everything to defaults? Your logged history will be cleared. Back up first if you want to keep it.")) { await wipeAll(); setMsg("Reset to defaults."); }
        }}>Reset to defaults</button>
      </section>

      <div className="footmark">
        <Monogram size={56} />
        <span className="label">Version {__BUILD__.slice(0, 10)}</span>
      </div>
    </div>
  );
}
