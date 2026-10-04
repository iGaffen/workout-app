import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const MUSCLE_IDS = [
  "chest", "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "forearms",
  "upper_back", "lats", "traps", "lower_back",
  "abs", "obliques",
  "glutes", "quads", "hamstrings", "adductors",
  "calves", "tibialis", "hip_flexors",
] as const;
export const MuscleIdSchema = z.enum(MUSCLE_IDS);
export type MuscleId = z.infer<typeof MuscleIdSchema>;

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case (lowercase letters, digits, dashes)");

/** Joint angles in degrees. See docs/pack-schema.md for the convention. */
const LimbSchema = z.object({
  shoulder: z.number(),
  armYaw: z.number(),
  elbow: z.number(),
  hip: z.number(),
  knee: z.number(),
  ankle: z.number(),
}).partial();

export const JOINTS = ["hip", "shoulder", "head", "elbow", "hand", "knee", "ankle", "heel", "toe"] as const;

export const PoseSchema = z.object({
  /** Hip position. Optional when `anchor` is given. */
  root: z.tuple([z.number(), z.number()]).optional(),
  /** Pin one joint to a point; the solver moves the whole body so that joint lands there. */
  anchor: z.object({ joint: z.enum(JOINTS), side: z.enum(["near", "far"]).optional(), at: z.tuple([z.number(), z.number()]) }).optional(),
  torso: z.number(),
  neck: z.number().optional(),
  near: LimbSchema,
  far: LimbSchema.optional(),
}).refine((p) => p.root || p.anchor, { message: "pose needs root or anchor", path: ["root"] });
export type Pose = z.infer<typeof PoseSchema>;

export const EQUIPMENT_KINDS = [
  "bench", "seat", "backpad", "pad", "legpress", "pulley", "cable", "dumbbell",
  "wall", "step", "mat", "handle", "bar", "plate", "frame",
] as const;

export const EquipmentSchema = z.object({
  kind: z.enum(EQUIPMENT_KINDS),
  /** Fixed position, or attach to a joint of the near (default) or far side. */
  at: z.tuple([z.number(), z.number()]).optional(),
  to: z.tuple([z.number(), z.number()]).optional(),
  attach: z.enum(["hand", "elbow", "foot", "toe", "knee", "hip", "chest", "shoulder"]).optional(),
  side: z.enum(["near", "far"]).optional(),
  angle: z.number().optional(),
  size: z.number().optional(),
  /** For cables: the fixed pulley point the cable runs from. */
  from: z.tuple([z.number(), z.number()]).optional(),
});
export type EquipmentSpec = z.infer<typeof EquipmentSchema>;

export const KeyframeSchema = z.object({
  name: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  ease: z.enum(["inOut", "linear"]).optional(),
  pose: PoseSchema,
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

export const AnimationSchema = z.object({
  view: z.literal("side"),
  equipment: z.array(EquipmentSchema),
  keyframes: z.array(KeyframeSchema).min(2, "needs at least 2 keyframes"),
  loop: z.enum(["pingpong", "cycle"]),
  alternateSides: z.boolean().optional(),
});
export type AnimationSpec = z.infer<typeof AnimationSchema>;

export const ExerciseSchema = z.object({
  schemaVersion: z.number().int().optional(),
  id,
  name: z.string().min(1),
  equipment: z.array(z.string()),
  muscles: z.object({ primary: z.array(MuscleIdSchema).min(1), secondary: z.array(MuscleIdSchema) }),
  cues: z.array(z.string()).min(1),
  notes: z.string().optional(),
  defaultReps: z.string().min(1),
  holdSeconds: z.number().int().positive().optional(),
  animation: AnimationSchema,
  hidden: z.boolean().optional(),
});
export type Exercise = z.infer<typeof ExerciseSchema> & { schemaVersion: number };

export const BlockSchema = z.object({
  type: z.enum(["exercise", "text"]),
  exerciseId: z.string().optional(),
  reps: z.string().optional(),
  sets: z.union([z.number().int().positive(), z.literal("phase")]).optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  title: z.string().optional(),
  icon: z.string().optional(),
  lines: z.array(z.string()).optional(),
}).superRefine((b, ctx) => {
  if (b.type === "exercise" && !b.exerciseId) ctx.addIssue({ code: "custom", message: "exercise block needs exerciseId", path: ["exerciseId"] });
  if (b.type === "text" && !b.title) ctx.addIssue({ code: "custom", message: "text block needs a title", path: ["title"] });
});
export type Block = z.infer<typeof BlockSchema>;

export const SessionSchema = z.object({ id: z.string().min(1), name: z.string().min(1), blocks: z.array(BlockSchema) });
export type Session = z.infer<typeof SessionSchema>;

export const RoutineSchema = z.object({
  schemaVersion: z.number().int().optional(),
  id,
  name: z.string().min(1),
  sessions: z.array(SessionSchema).min(1),
});
export type Routine = z.infer<typeof RoutineSchema> & { schemaVersion: number };

export const SettingsSchema = z.object({
  schemaVersion: z.number().int().optional(),
  phaseSets: z.number().int().positive(),
  /** Auto: 2 sets in weeks 1-3, 3 sets from week 4, counted from the first logged workout. */
  phaseAuto: z.boolean().optional(),
  /** Workouts per week the Progress tab counts toward (gym and cardio). */
  weeklyGoal: z.number().int().positive().optional(),
  /** Planned gym days, 0 = Sunday ... 6 = Saturday. The weekly goal is their count. */
  trainingDays: z.array(z.number().int().min(0).max(6)).optional(),
  defaultRest: z.number().int().nonnegative(),
  theme: z.enum(["system", "light", "dark"]),
  activeRoutineId: z.string(),
});
export type Settings = z.infer<typeof SettingsSchema> & { schemaVersion?: number };

export const WorkoutLogSchema = z.object({
  schemaVersion: z.number().int().optional(),
  id: z.string(),
  date: z.string(),
  routineId: z.string(),
  sessionId: z.string(),
  durationSeconds: z.number().optional(),
  sets: z.array(z.object({ exerciseId: z.string(), setIndex: z.number(), weightKg: z.number().optional(), reps: z.number().optional() })).optional(),
});
export type WorkoutLog = z.infer<typeof WorkoutLogSchema> & { schemaVersion?: number };

export const BodyLogSchema = z.object({
  schemaVersion: z.number().int().optional(),
  id: z.string(),
  date: z.string(),            // ISO date, yyyy-mm-dd
  weightKg: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
});
export type BodyLog = z.infer<typeof BodyLogSchema> & { schemaVersion?: number };

/** A pack: what Claude chat generates and what Export produces. */
export const PackSchema = z.object({
  schemaVersion: z.number().int().optional(),
  exercises: z.array(ExerciseSchema).optional(),
  routines: z.array(RoutineSchema).optional(),
  remove: z.array(z.string()).optional(),
  settings: SettingsSchema.optional(),
  logs: z.array(WorkoutLogSchema).optional(),
  body: z.array(BodyLogSchema).optional(),
  /** Only present in full backups: ids of bundled exercises the user deleted/hid. */
  hiddenBundled: z.array(z.string()).optional(),
}).strict();
export type Pack = z.infer<typeof PackSchema>;
