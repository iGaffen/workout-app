import type { MuscleId } from "../model/schema";

/** Left-half shapes (x < 50) in a 100 x 210 box; the right half is mirrored. */
export const FRONT: Partial<Record<MuscleId, string>> = {
  traps: "M46,25 L39,33 L48,32 Z",
  front_delts: "M33,34 C27,34 24,38 25,45 C28,44 31,43 33,42 Z",
  side_delts: "M27,34 C22,35 20,40 21,47 L25,45 C24,40 25,37 27,34 Z",
  chest: "M49,37 C42,35 35,36 32,42 C32,50 37,55 49,55 Z",
  biceps: "M22,48 C19,54 20,62 23,68 L28,67 C29,60 28,52 26,47 Z",
  forearms: "M20,72 C16,80 15,92 17,102 L21,102 C24,92 26,82 26,73 Z",
  abs: "M43.5,58 L49,58 L49,95 L44,95 C43,82 43,70 43.5,58 Z",
  obliques: "M41,58 C36,64 35,80 37,93 L42.5,95 C42,82 42,70 42.5,58 Z",
  hip_flexors: "M37,97 L45,98 L46,108 L41,108 Z",
  quads: "M33,106 C30,124 32,140 37,151 L46,151 C48,138 48,124 45,111 Z",
  adductors: "M46,110 L49.5,112 L49,138 L47,140 C47.5,128 47.5,118 46,110 Z",
  tibialis: "M35,158 C34,168 35,182 37,192 L40,192 C39,180 39,168 38.5,158 Z",
  calves: "M43,160 C46,166 46,176 44,186 L41.5,186 C42,176 42,166 43,160 Z",
};

export const BACK: Partial<Record<MuscleId, string>> = {
  traps: "M50,22 L44,26 L36,34 L44,37 L50,44 Z",
  rear_delts: "M35,35 C29,34 25,38 25,44 C29,44 32,42 35,40 Z",
  side_delts: "M27,34 C22,35 20,40 21,47 L25,45 C24,40 25,37 27,34 Z",
  upper_back: "M49.5,45 L43,38 L36,41 L37,52 L49.5,60 Z",
  triceps: "M22,48 C19,54 20,62 23,68 L28,67 C29,60 28,52 26,47 Z",
  forearms: "M20,72 C16,80 15,92 17,102 L21,102 C24,92 26,82 26,73 Z",
  lats: "M36,54 C33,66 35,80 41,90 L48,84 L48,63 Z",
  lower_back: "M43.5,85 L49.5,80 L49.5,99 L43.5,99 Z",
  glutes: "M34,101 C32,112 36,121 44,121 C49,121 49.5,114 49.5,103 Z",
  hamstrings: "M34,124 C32,136 34,146 37,152 L45,152 C47,142 47,132 45,124 Z",
  adductors: "M46,124 L49.5,124 L49,140 L47,141 C47.5,134 47,128 46,124 Z",
  calves: "M35,158 C32,166 33,178 37,186 L44,186 C46,178 46,166 43,158 Z",
};

/** Neutral silhouette, shared by front and back. */
export const SILHOUETTE =
  "M50,4 C55.5,4 59,8.5 59,14 C59,19 56.5,22.5 54,23.5 L54,27 C62,29 72,31 75,36 C79,42 79,48 78,52 " +
  "C80,60 81,66 81,70 C84,80 85,92 84,104 L84,114 L79,114 L78,104 C76,94 74,84 74,74 C73,68 72,60 72,54 " +
  "L69,60 C67,74 67,86 68,96 C70,104 71,110 70,116 C70,130 68,142 66,152 C67,160 67,170 65,180 C64,188 63,194 63,198 " +
  "L66,204 L54,204 L55,196 C54,186 54,176 54,166 C54,160 53,156 53,152 C52,140 52,126 51,114 L50,112 L49,114 " +
  "C48,126 48,140 47,152 C47,156 46,160 46,166 C46,176 46,186 45,196 L46,204 L34,204 L37,198 C37,194 36,188 35,180 " +
  "C33,170 33,160 34,152 C32,142 30,130 30,116 C29,110 30,104 32,96 C33,86 33,74 31,60 L28,54 C28,60 27,68 26,74 " +
  "C26,84 24,94 22,104 L21,114 L16,114 L16,104 C15,92 16,80 19,70 C19,66 20,60 22,52 C21,48 21,42 25,36 " +
  "C28,31 38,29 46,27 L46,23.5 C43.5,22.5 41,19 41,14 C41,8.5 44.5,4 50,4 Z";

export const FRONT_ONLY: MuscleId[] = ["chest", "front_delts", "biceps", "abs", "obliques", "hip_flexors", "quads", "tibialis"];
export const BACK_ONLY: MuscleId[] = ["rear_delts", "triceps", "upper_back", "lats", "lower_back", "glutes", "hamstrings"];

/** Which views to show for a set of highlighted muscles. */
export function pickViews(primary: MuscleId[], secondary: MuscleId[]): ("front" | "back")[] {
  const all = [...primary, ...secondary];
  const f = all.some((m) => FRONT_ONLY.includes(m));
  const b = all.some((m) => BACK_ONLY.includes(m));
  if (f && b) return ["front", "back"];
  if (b) return ["back"];
  if (f) return ["front"];
  // Shared muscles only (calves, traps, forearms...): pick where they show best.
  return all.some((m) => m === "calves" || m === "traps") ? ["back"] : ["front"];
}
