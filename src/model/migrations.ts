/** Numbered migrations. Each takes a record at version N-1 and returns version N. Run on startup and on import. */
type Rec = { schemaVersion?: number } & Record<string, unknown>;
export const MIGRATIONS: Record<number, (r: Rec) => Rec> = {
  // 1: initial version. Records without a version are treated as version 0 and simply stamped.
  1: (r) => r,
};
export const LATEST = Math.max(...Object.keys(MIGRATIONS).map(Number));

export function migrate<T extends Rec>(r: T): T {
  let v = r.schemaVersion ?? 0;
  let out: Rec = r;
  while (v < LATEST) { v++; out = { ...MIGRATIONS[v](out), schemaVersion: v }; }
  return out as T;
}
