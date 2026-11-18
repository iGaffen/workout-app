import { useState } from "react";
import { BodyRepo, LogRepo, RemindersRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { TrendChart } from "../components/TrendChart";
import { Glyph } from "../components/Glyph";
import { backupNow } from "../components/backup";
import { bestWeight, daysUntilDue, isGym, isNewBest, localDate, trainingWeek, weekSummary, weeklyAverages } from "../model/progress";
import type { BodyLog, WorkoutLog } from "../model/schema";

const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : undefined; };

/** New bests set in one log: exercises whose top weight beats everything logged before it. */
function bestsIn(log: WorkoutLog, logs: WorkoutLog[]): number {
  const ids = [...new Set((log.sets ?? []).map((s) => s.exerciseId))];
  return ids.filter((id) => {
    const ws = (log.sets ?? []).filter((s) => s.exerciseId === id && s.weightKg !== undefined).map((s) => s.weightKg!);
    return ws.length > 0 && isNewBest(Math.max(...ws), bestWeight(logs, id, log.date));
  }).length;
}

/** Waist change this month: latest entry minus the last entry before the month (or the month's first). */
function waistChange(body: BodyLog[], monthStart: string): number | undefined {
  const w = body.filter((b) => b.waistCm !== undefined);
  const inMonth = w.filter((b) => b.date >= monthStart);
  if (!inMonth.length) return undefined;
  const before = w.filter((b) => b.date < monthStart).pop() ?? inMonth[0];
  return Math.round((inMonth[inMonth.length - 1].waistCm! - before.waistCm!) * 10) / 10;
}

export function Progress() {
  const data = useData(async () => ({
    logs: await LogRepo.all(), body: await BodyRepo.all(), routines: await RoutineRepo.all(),
    settings: await SettingsRepo.get(), lastPhoto: await RemindersRepo.lastPhoto(), lastExport: await RemindersRepo.lastExport(),
  }));
  const today = localDate(new Date());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [saved, setSaved] = useState("");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [confirmLog, setConfirmLog] = useState<string | null>(null);
  if (!data) return null;
  const { logs, body, routines, settings, lastPhoto, lastExport } = data;
  const wk = weekSummary(logs, routines, settings);
  const photoDays = daysUntilDue(lastPhoto, 28);
  const backupDays = daysUntilDue(lastExport, 30);
  const todayEntry = body.find((b) => b.date === today);
  const toPoints = (k: "weightKg" | "waistCm") => weeklyAverages(body, k).slice(-12).map((w) => ({ label: w.week, value: w.avg, n: w.n }));
  const history = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  // Monthly recap.
  const now = new Date();
  const monthStart = localDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthLogs = logs.filter((l) => localDate(new Date(l.date)) >= monthStart && isGym(l, routines));
  const monthBests = monthLogs.reduce((n, l) => n + bestsIn(l, logs), 0);
  const waistDelta = waistChange(body, monthStart);
  const monthName = now.toLocaleDateString("en-GB", { month: "long" });

  const save = async () => {
    const w = num(weight), c = num(waist);
    if (w === undefined && c === undefined) return;
    await BodyRepo.put(today, { ...(w !== undefined ? { weightKg: w } : {}), ...(c !== undefined ? { waistCm: c } : {}) });
    setWeight(""); setWaist(""); setSaved("Saved.");
  };
  const weeksSinceBackup = lastExport ? Math.floor((Date.now() - Date.parse(lastExport)) / (7 * 86400000)) : null;

  return (
    <div className="stack">
      <div>
        <p className="label">Training week {String(trainingWeek(logs)).padStart(2, "0")}</p>
        <h1 className="title" style={{ marginBottom: 0 }}>Progress</h1>
      </div>

      <div className="weekline" style={{ marginBottom: 0 }}>
        <span className="label">This week</span>
        <span className="weekstrip" style={{ marginTop: 0 }}>
          {wk.days.map((d) => <span key={d.day} className={`day ${d.done ? "done" : ""}`}><span className="dot" aria-hidden="true" />{d.name}</span>)}
        </span>
      </div>

      <section className="panel recap" aria-label={`${monthName} recap`}>
        <span className="label gold">{monthName} recap</span>
        <div className="stats">
          <div className="stat"><b className="num">{monthLogs.length}</b><span>sessions</span></div>
          <div className="stat"><b className="num gold">{monthBests}</b><span>new bests</span></div>
          <div className="stat"><b className="num">{waistDelta === undefined ? "—" : `${waistDelta > 0 ? "+" : waistDelta < 0 ? "−" : ""}${Math.abs(waistDelta)}`}</b><span>cm waist</span></div>
        </div>
      </section>

      <section className="panel">
        <span className="label">Log today</span>
        <div className="twocol">
          <label><span className="field-label">Weight (kg)</span><input className="window-input" inputMode="decimal" value={weight} placeholder={todayEntry?.weightKg ? String(todayEntry.weightKg) : "—"} onChange={(e) => { setWeight(e.target.value); setSaved(""); }} /></label>
          <label><span className="field-label">Waist (cm)</span><input className="window-input" inputMode="decimal" value={waist} placeholder={todayEntry?.waistCm ? String(todayEntry.waistCm) : "—"} onChange={(e) => { setWaist(e.target.value); setSaved(""); }} /></label>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={num(weight) === undefined && num(waist) === undefined}>Save today's entry</button>
        {saved && <p className="ok" role="status">{saved}</p>}
      </section>

      <TrendChart points={toPoints("weightKg")} unit="kg" name="Body weight" />
      <TrendChart points={toPoints("waistCm")} unit="cm" name="Waist" />

      <div className="inline-row">
        <div>
          <h3>Progress photos</h3>
          <p className="meta">{!lastPhoto || photoDays <= 0 ? "Photos due today." : `Next photos in ${photoDays} days`}</p>
        </div>
        <button className="btn btn-secondary btn-xs" onClick={() => RemindersRepo.markPhoto()}>Took them today</button>
      </div>

      {backupDays <= 0 && logs.length > 0 && (
        <div className="panel backuprow">
          <Glyph name="backup" size={22} />
          <div className="grow">
            <h3 style={{ font: "600 16px/1.3 var(--f-read)" }}>Keep a copy safe.</h3>
            <p className="meta">{weeksSinceBackup === null ? "No backup yet" : `Last backup ${weeksSinceBackup} week${weeksSinceBackup === 1 ? "" : "s"} ago`}</p>
          </div>
          <button className="btn btn-primary btn-xs" onClick={() => backupNow()}>Back up</button>
        </div>
      )}

      <div>
        <p className="label" style={{ marginBottom: 6 }}>History</p>
        {history.length === 0 && <p className="meta">Your first session will appear here.</p>}
        <ul className="history">
          {history.slice(0, 60).map((l) => {
            const d = new Date(l.date);
            const withWeight = (l.sets ?? []).filter((s) => s.weightKg !== undefined).length;
            const exCount = new Set((l.sets ?? []).map((s) => s.exerciseId)).size;
            const r = routines.find((x) => x.id === l.routineId);
            return (
              <li key={l.id}>
                <button className="histrow" aria-expanded={openLog === l.id}
                  onClick={() => { setOpenLog(openLog === l.id ? null : l.id); setConfirmLog(null); }}>
                  <span className="d num">{d.getDate()}<small>{d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</small></span>
                  <span>
                    <span className="h1" style={{ display: "block" }}>{r?.name ?? "Gym day"}</span>
                    <span className="meta">{withWeight ? `${withWeight} sets with weight logged` : "No weights logged"}{exCount ? ` · ${exCount} exercises` : ""}</span>
                  </span>
                </button>
                {openLog === l.id && (
                  <div className="histactions">
                    {confirmLog === l.id ? (
                      <>
                        <span className="meta grow">Delete for good?</span>
                        <button className="btn btn-secondary btn-xs" onClick={() => setConfirmLog(null)}>Keep</button>
                        <button className="btn btn-danger btn-xs" onClick={async () => { await LogRepo.remove(l.id); setOpenLog(null); setConfirmLog(null); }}>Delete</button>
                      </>
                    ) : (
                      <button className="btn btn-danger btn-xs" onClick={() => setConfirmLog(l.id)}>Delete workout</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
