import { RemindersRepo, exportAll } from "../db/repos";
import { isNative } from "../native/platform";

/** Share the backup file (Android share sheet: Google Drive, WhatsApp, email...), or download it where sharing files is not supported. */
export async function backupNow(): Promise<"shared" | "downloaded" | "cancelled"> {
  const name = `gym-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(await exportAll(), null, 1);
  if (isNative()) {
    // Android app: write the file, then open the system share sheet (Drive, WhatsApp, email…).
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: "Gym plan backup", files: [uri] });
      await RemindersRepo.markExported();
      return "shared";
    } catch { return "cancelled"; }
  }
  const blob = new Blob([json], { type: "application/json" });
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
