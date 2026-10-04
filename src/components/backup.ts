import { RemindersRepo, exportAll } from "../db/repos";

/** Share the backup file (Android share sheet: Google Drive, WhatsApp, email...), or download it where sharing files is not supported. */
export async function backupNow(): Promise<"shared" | "downloaded" | "cancelled"> {
  const name = `gym-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(await exportAll(), null, 1)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Gym plan backup" });
      await RemindersRepo.markExported();
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await RemindersRepo.markExported();
  return "downloaded";
}

export const backedUpToday = (last: string | null) => !!last && new Date(last).toDateString() === new Date().toDateString();
