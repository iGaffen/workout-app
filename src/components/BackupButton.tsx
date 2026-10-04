import { useState } from "react";
import { RemindersRepo } from "../db/repos";
import { useData } from "./hooks";
import { backedUpToday, backupNow } from "./backup";

/** Shown after a workout: one tap opens the share sheet so the backup can go to Google Drive. */
export function BackupButton() {
  const last = useData(() => RemindersRepo.lastExport());
  const [msg, setMsg] = useState("");
  if (last === undefined) return null;
  if (backedUpToday(last) && !msg) return <p className="ok">Backed up today ✓</p>;
  return (
    <div className="backupbox">
      <button className="secondary" onClick={async () => {
        const r = await backupNow();
        setMsg(r === "shared" ? "Backed up ✓" : r === "downloaded" ? "Saved to Downloads ✓" : "");
      }}>Back up now</button>
      {msg ? <p className="ok" role="status">{msg}</p> : <p className="sub">Tap, then choose Google Drive to keep a copy in the cloud.</p>}
    </div>
  );
}
