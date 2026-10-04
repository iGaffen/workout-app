import type { MuscleId } from "../model/schema";

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: "Chest", front_delts: "Front shoulders", side_delts: "Side shoulders", rear_delts: "Rear shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  upper_back: "Upper back", lats: "Lats", traps: "Traps", lower_back: "Lower back",
  abs: "Abs", obliques: "Obliques",
  glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", adductors: "Inner thighs",
  calves: "Calves", tibialis: "Shins", hip_flexors: "Hip flexors",
};

export const MUSCLE_GROUPS: { label: string; ids: MuscleId[] }[] = [
  { label: "Chest", ids: ["chest"] },
  { label: "Back", ids: ["upper_back", "lats", "traps", "lower_back"] },
  { label: "Shoulders", ids: ["front_delts", "side_delts", "rear_delts"] },
  { label: "Arms", ids: ["biceps", "triceps", "forearms"] },
  { label: "Core", ids: ["abs", "obliques", "hip_flexors"] },
  { label: "Legs", ids: ["glutes", "quads", "hamstrings", "adductors", "calves", "tibialis"] },
];
