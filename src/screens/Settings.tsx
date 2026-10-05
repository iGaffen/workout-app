import { useRef, useState } from "react";
import { ExerciseRepo, LogRepo, RemindersRepo, RoutineRepo, SettingsRepo, applyPack, exportAll, wipeAll } from "../db/repos";
import { DAY_NAMES, daysUntilDue, effectiveSettings, trainingDaysOf } from "../model/progress";
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

  return (
    <>
      <div className="top"><h1>Settings</h1></div>
      {backupDue && <div className="card"><p className="due">Backup due. Scroll down and tap Export all data.</p></div>}
      <div className="card">
        <h2>Phase</h2>
        <p className="sub">Sets for the main lifts. Calves and shins stay at 2. Auto switches to 3 sets in week 4 (now: {effectiveSettings(s, d.logs).phaseSets} sets).</p>
        <div className="seg" role="group" aria-label="Phase">
          <button aria-pressed={!!s.phaseAuto} onClick={() => put({ phaseAuto: true })}>Auto</button>
          <button aria-pressed={!s.phaseAuto && s.phaseSets === 2} onClick={() => put({ phaseAuto: false, phaseSets: 2 })}>2 sets</button>
          <button aria-pressed={!s.phaseAuto && s.phaseSets === 3} onClick={() => put({ phaseAuto: false, phaseSets: 3 })}>3 sets</button>
        </div>
        <h2>Gym days</h2>
        <p className="sub">Your weekly goal is the number of days picked ({trainingDaysOf(s).length}).</p>
        <div className="seg days7" role="group" aria-label="Gym days">
          {DAY_NAMES.map((n, i) => {
            const on = trainingDaysOf(s).includes(i);
            return <button key={n} aria-pressed={on} onClick={() => {
              const next = on ? trainingDaysOf(s).filter((d) => d !== i) : [...trainingDaysOf(s), i];
              if (next.length) put({ trainingDays: next });
            }}>{n}</button>;
          })}
        </div>
        <h2>Default rest</h2>
        <div className="seg" role="group" aria-label="Default rest">
          {[30, 45, 60].map((n) => <button key={n} aria-pressed={s.defaultRest === n} onClick={() => put({ defaultRest: n })}>{n} sec</button>)}
        </div>
        <h2>Theme</h2>
        <div className="seg" role="group" aria-label="Theme">
          {(["system", "light", "dark"] as const).map((t) => <button key={t} aria-pressed={s.theme === t} onClick={() => put({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
      </div>

      <div className="card">
        <h2>Import</h2>
        <p className="sub">Paste a pack from Claude, or choose a backup file. You will see a preview before anything changes.</p>
        <textarea className="paste" rows={6} aria-label="Pack JSON" placeholder='{"exercises": [...]}' value={text} onChange={(e) => setText(e.target.value)} />
        <div className="nav">
          <button onClick={() => check(text)} disabled={!text.trim()}>Check pack</button>
          <button onClick={() => file.current?.click()}>Choose file</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return; const t = await f.text(); setText(t); check(t); e.target.value = "";
          }} />
        </div>
        {err && <pre className="error" role="alert">{err}</pre>}
        {msg && <p className="ok" role="status">{msg}</p>}
        {pending && (
          <div className="preview" role="status">
            <strong>{summary(pending.pv)}</strong>
            <ul>
              {pending.pv.add.length > 0 && <li>New: {pending.pv.add.join(", ")}</li>}
              {pending.pv.update.length > 0 && <li>Updated: {pending.pv.update.join(", ")}</li>}
              {pending.pv.addRoutines.length + pending.pv.updateRoutines.length > 0 && <li>Routines: {[...pending.pv.addRoutines, ...pending.pv.updateRoutines].join(", ")}</li>}
              {pending.pv.remove.length > 0 && <li>Remove: {pending.pv.remove.join(", ")}</li>}
              {pending.pack.settings && <li>Settings and history from a backup</li>}
              {pending.pv.missingRefs.length > 0 && <li className="warn">Warning: routines use unknown exercises: {pending.pv.missingRefs.join(", ")}</li>}
            </ul>
            <div className="nav"><button onClick={() => setPending(null)}>Cancel</button><button className="primary" onClick={apply}>Apply</button></div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Backup</h2>
        {backupDue && <p className="due" role="status">{d.lastExport ? "Backup due: last one was over 30 days ago." : "You have not backed up yet."}</p>}
        {d.lastExport && !backupDue && <p className="sub">Last backup: {new Date(d.lastExport).toLocaleDateString()}</p>}
        <p className="sub">Your data lives only on this phone. Clearing Chrome's site data deletes it, so export a backup now and then.</p>
        <button className="cta" onClick={async () => { const r = await backupNow(); if (r !== "cancelled") setMsg(r === "shared" ? "Backup shared." : "Backup saved to Downloads."); }}>Export all data</button>
        <p className="sub">Choose Google Drive in the share menu to keep the backup in the cloud.</p>
        <button className="secondary danger" onClick={async () => {
          if (confirm("Reset everything to defaults? Your routines, imported exercises, settings and history will be deleted. Export first if unsure.")) { await wipeAll(); setMsg("Reset to defaults."); }
        }}>Reset to defaults</button>
      </div>
      <p className="sub center">Gym plan · works offline · no data leaves this phone<br />Version {__BUILD__}</p>
    </>
  );
}
