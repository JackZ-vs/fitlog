/**
 * Data access layer.
 * When NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set → uses Supabase.
 * Otherwise → falls back to localStorage (client) or mock JSON (server).
 */

import type { WorkoutRecord, WorkoutExercise, SetData, MealEntry, DailyTargets } from "./types";
import { DEFAULT_TARGETS } from "./types";
import { estimateCalories as calcCalories } from "./calories";
import exercisesJson from "@/data/exercises.json";
import mockWorkoutsJson from "@/data/mockWorkouts.json";

// ─── Config ──────────────────────────────────────────────────────────────────

export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getBrowserClient() {
  const { createClient } = await import("./supabase/client");
  return createClient();
}

// ─── Calorie helper (re-exported from calories.ts) ───────────────────────────

export { estimateCalories } from "./calories";

// ─── Local helpers (localStorage + mock) ─────────────────────────────────────

const STORAGE_KEY = "fitlog_workouts";
const mockWorkouts = mockWorkoutsJson as WorkoutRecord[];

function readLocal(): WorkoutRecord[] {
  if (typeof window === "undefined") return mockWorkouts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const local: WorkoutRecord[] = raw ? JSON.parse(raw) : [];
    const localDates = new Set(local.map((w) => w.date));
    return [
      ...local,
      ...mockWorkouts.filter((w) => !localDates.has(w.date)),
    ].sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return mockWorkouts;
  }
}

function writeLocal(workout: WorkoutRecord): void {
  if (typeof window === "undefined") return;
  const all = readLocal();
  const idx = all.findIndex((w) => w.date === workout.date);
  const updated =
    idx >= 0 ? all.map((w, i) => (i === idx ? workout : w)) : [...all, workout];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ─── DB → frontend shape ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToWorkout(row: any): WorkoutRecord {
  // Group sets by exercise_id, preserving insertion order
  const byExercise = new Map<
    number,
    { ex: WorkoutExercise; sets: (SetData & { set_number: number })[] }
  >();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (row.workout_sets ?? []) as any[]) {
    const ex = s.exercise;
    if (!ex) continue;
    if (!byExercise.has(ex.id)) {
      byExercise.set(ex.id, {
        ex: {
          exerciseId: ex.id,
          exerciseName: ex.name,
          primaryMuscles: ex.primary_muscles ?? [],
          type: ex.type ?? "",
          met: ex.met ?? 0,
          sets: [],
        },
        sets: [],
      });
    }
    byExercise.get(ex.id)!.sets.push({
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      duration: s.duration,
      distanceKm: s.distance_km ?? null,
    });
  }

  const exercises: WorkoutExercise[] = [...byExercise.values()].map(({ ex, sets }) => ({
    ...ex,
    sets: sets
      .sort((a, b) => a.set_number - b.set_number)
      .map(({ weight, reps, duration, distanceKm }) => ({ weight, reps, duration, distanceKm })),
  }));

  return {
    id: row.id,
    date: row.date,
    name: row.name ?? "",
    isPublic: row.is_public ?? false,
    notes: row.notes ?? "",
    exercises,
  };
}

const SETS_QUERY = `
  id, date, name, notes, is_public,
  workout_sets (
    set_number, weight, reps, duration, distance_km,
    exercise:exercises ( id, name, type, primary_muscles, met )
  )
`;

// ─── Exercises ────────────────────────────────────────────────────────────────

export type ExerciseRow = typeof exercisesJson[number];

export async function getExercises(): Promise<ExerciseRow[]> {
  if (!isSupabaseConfigured) return exercisesJson;

  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("exercises")
      .select("id, name, name_en, type, primary_muscles, secondary_muscles, equipment, difficulty, met, description")
      .order("id");
    if (error || !data?.length) return exercisesJson;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((e: any) => ({
      id: e.id,
      name: e.name,
      nameEn: e.name_en ?? "",
      type: e.type,
      primaryMuscles: e.primary_muscles ?? [],
      secondaryMuscles: e.secondary_muscles ?? [],
      equipment: e.equipment ?? "",
      difficulty: e.difficulty ?? "",
      met: e.met ?? 0,
      description: e.description ?? "",
    })) as unknown as ExerciseRow[];
  } catch {
    return exercisesJson;
  }
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = await getBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function getAllWorkouts(): Promise<WorkoutRecord[]> {
  if (!isSupabaseConfigured) return readLocal();

  const userId = await getCurrentUserId();
  if (!userId) return readLocal();

  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("workouts")
      .select(SETS_QUERY)
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error || !data) return readLocal();
    return data.map(dbRowToWorkout);
  } catch {
    return readLocal();
  }
}

export async function getWorkout(date: string): Promise<WorkoutRecord | null> {
  if (!isSupabaseConfigured) {
    return readLocal().find((w) => w.date === date) ?? null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return readLocal().find((w) => w.date === date) ?? null;
  }

  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("workouts")
      .select(SETS_QUERY)
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (error) return readLocal().find((w) => w.date === date) ?? null;
    return data ? dbRowToWorkout(data) : null;
  } catch {
    return readLocal().find((w) => w.date === date) ?? null;
  }
}

export async function getLastWorkoutBefore(date: string): Promise<WorkoutRecord | null> {
  if (!isSupabaseConfigured) {
    const all = readLocal().filter((w) => w.date < date);
    return all[0] ?? null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const all = readLocal().filter((w) => w.date < date);
    return all[0] ?? null;
  }

  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("workouts")
      .select(SETS_QUERY)
      .eq("user_id", userId)
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      const all = readLocal().filter((w) => w.date < date);
      return all[0] ?? null;
    }
    return dbRowToWorkout(data);
  } catch {
    const all = readLocal().filter((w) => w.date < date);
    return all[0] ?? null;
  }
}

export async function saveWorkout(workout: WorkoutRecord): Promise<void> {
  // Always keep localStorage in sync (instant, offline-capable)
  writeLocal(workout);

  if (!isSupabaseConfigured) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const sb = await getBrowserClient();

    const { data: w, error: upsertErr } = await sb
      .from("workouts")
      .upsert(
        {
          user_id: userId,
          date: workout.date,
          name: workout.name,
          notes: workout.notes,
          is_public: workout.isPublic,
          estimated_calories: calcCalories(workout),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      )
      .select("id")
      .single();

    if (upsertErr || !w) return;

    // Replace sets atomically
    await sb.from("workout_sets").delete().eq("workout_id", w.id);

    const rows = workout.exercises.flatMap((ex) =>
      ex.sets.map((set, si) => ({
        workout_id: w.id,
        exercise_id: ex.exerciseId,
        set_number: si + 1,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance_km: set.distanceKm ?? null,
      }))
    );

    if (rows.length) await sb.from("workout_sets").insert(rows);
  } catch {
    // Supabase error — localStorage already saved, silently ignore
  }
}

export function newEmptyWorkout(date: string): WorkoutRecord {
  return {
    id: `workout-${date}-${Date.now()}`,
    date,
    name: "",
    isPublic: false,
    notes: "",
    exercises: [],
  };
}

// ─── Meals ────────────────────────────────────────────────────────────────────

const MEALS_KEY = "fitlog_meals";
const TARGETS_KEY = "fitlog_targets";

function readLocalMeals(): MealEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalMeals(meals: MealEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToMeal(row: any): MealEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type,
    foodName: row.food_name,
    amountG: row.amount_g ?? null,
    calories: row.calories ?? null,
    protein: row.protein ?? null,
    carbs: row.carbs ?? null,
    fat: row.fat ?? null,
  };
}

export async function getMealsByDate(date: string): Promise<MealEntry[]> {
  if (!isSupabaseConfigured) {
    return readLocalMeals().filter((m) => m.date === date);
  }
  const userId = await getCurrentUserId();
  if (!userId) return readLocalMeals().filter((m) => m.date === date);
  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at");
    if (error || !data) return readLocalMeals().filter((m) => m.date === date);
    return data.map(dbRowToMeal);
  } catch {
    return readLocalMeals().filter((m) => m.date === date);
  }
}

export async function getMealsInRange(start: string, end: string): Promise<MealEntry[]> {
  if (!isSupabaseConfigured) {
    return readLocalMeals().filter((m) => m.date >= start && m.date <= end);
  }
  const userId = await getCurrentUserId();
  if (!userId) return readLocalMeals().filter((m) => m.date >= start && m.date <= end);
  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .gte("date", start)
      .lte("date", end)
      .order("date");
    if (error || !data) return readLocalMeals().filter((m) => m.date >= start && m.date <= end);
    return data.map(dbRowToMeal);
  } catch {
    return readLocalMeals().filter((m) => m.date >= start && m.date <= end);
  }
}

export async function getAllMealDates(): Promise<Set<string>> {
  if (!isSupabaseConfigured) {
    return new Set(readLocalMeals().map((m) => m.date));
  }
  const userId = await getCurrentUserId();
  if (!userId) return new Set(readLocalMeals().map((m) => m.date));
  try {
    const sb = await getBrowserClient();
    const { data, error } = await sb
      .from("meals")
      .select("date")
      .eq("user_id", userId);
    if (error || !data) return new Set(readLocalMeals().map((m) => m.date));
    return new Set((data as { date: string }[]).map((r) => r.date));
  } catch {
    return new Set(readLocalMeals().map((m) => m.date));
  }
}

export async function saveMeal(meal: MealEntry): Promise<void> {
  const all = readLocalMeals();
  const idx = all.findIndex((m) => m.id === meal.id);
  writeLocalMeals(
    idx >= 0 ? all.map((m, i) => (i === idx ? meal : m)) : [...all, meal]
  );

  if (!isSupabaseConfigured) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    const sb = await getBrowserClient();
    await sb.from("meals").upsert({
      id: meal.id,
      user_id: userId,
      date: meal.date,
      meal_type: meal.mealType,
      food_name: meal.foodName,
      amount_g: meal.amountG,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    });
  } catch {
    // localStorage already saved
  }
}

export async function deleteMeal(id: string): Promise<void> {
  writeLocalMeals(readLocalMeals().filter((m) => m.id !== id));

  if (!isSupabaseConfigured) return;
  try {
    const sb = await getBrowserClient();
    await sb.from("meals").delete().eq("id", id);
  } catch {
    // localStorage already updated
  }
}

export async function getDailyTargets(): Promise<DailyTargets> {
  if (!isSupabaseConfigured) {
    try {
      if (typeof window === "undefined") return DEFAULT_TARGETS;
      const raw = localStorage.getItem(TARGETS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_TARGETS;
    } catch {
      return DEFAULT_TARGETS;
    }
  }
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_TARGETS;
  try {
    const sb = await getBrowserClient();
    const { data } = await sb
      .from("daily_targets")
      .select("calories, protein, carbs, fat")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return DEFAULT_TARGETS;
    return {
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    };
  } catch {
    return DEFAULT_TARGETS;
  }
}

const TARGETS_SAVED_KEY = "fitlog_targets_saved";
export function markTargetsSaved(): void {
  if (typeof window !== "undefined") localStorage.setItem(TARGETS_SAVED_KEY, "1");
}
export function hasTargetsBeenSaved(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(TARGETS_SAVED_KEY);
}

export async function saveDailyTargets(targets: DailyTargets): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    markTargetsSaved();
  }
  if (!isSupabaseConfigured) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    const sb = await getBrowserClient();
    await sb
      .from("daily_targets")
      .upsert({ user_id: userId, ...targets, updated_at: new Date().toISOString() });
  } catch {
    // localStorage already saved
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  weightKg: number | null;
  age: number | null;
  heightCm: number | null;
  gender: "male" | "female" | "other" | null;
  restingHeartRate: number | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToProfile(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    role: row.role ?? "user",
    weightKg: row.weight_kg ?? null,
    age: row.age ?? null,
    heightCm: row.height_cm ?? null,
    gender: row.gender ?? null,
    restingHeartRate: row.resting_heart_rate ?? null,
    createdAt: row.created_at ?? "",
  };
}

export async function getMyProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const sb = await getBrowserClient();
    const { data } = await sb
      .from("profiles")
      .select("id, username, display_name, role, weight_kg, age, height_cm, gender, resting_heart_rate, created_at")
      .eq("id", userId)
      .maybeSingle();
    return data ? dbRowToProfile(data) : null;
  } catch {
    return null;
  }
}

export async function updateMyProfile(
  data: {
    displayName?: string;
    weightKg?: number | null;
    age?: number | null;
    heightCm?: number | null;
    gender?: "male" | "female" | "other" | null;
    restingHeartRate?: number | null;
  }
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    const sb = await getBrowserClient();
    const update: Record<string, unknown> = {};
    if (data.displayName !== undefined) update.display_name = data.displayName;
    if (data.weightKg !== undefined) update.weight_kg = data.weightKg;
    // New body fields — only include when non-null so the query stays valid
    // before migration 001_add_body_fields.sql is run
    if (data.age != null) update.age = data.age;
    if (data.heightCm != null) update.height_cm = data.heightCm;
    if (data.gender != null) update.gender = data.gender;
    if (data.restingHeartRate != null) update.resting_heart_rate = data.restingHeartRate;
    await sb.from("profiles").update(update).eq("id", userId);
  } catch {
    // ignore
  }
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = await getBrowserClient();
    const { data } = await sb
      .from("profiles")
      .select("id, username, display_name, role, weight_kg, age, height_cm, gender, resting_heart_rate, created_at")
      .order("created_at");
    return (data ?? []).map(dbRowToProfile);
  } catch {
    return [];
  }
}

// ─── Preferences (localStorage) ───────────────────────────────────────────────

const PREFS_KEY = "fitlog_prefs";

interface Prefs {
  weeklyGoal: number;
  defaultIsPublic: boolean;
}

function readPrefs(): Prefs {
  if (typeof window === "undefined") return { weeklyGoal: 4, defaultIsPublic: false };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { weeklyGoal: 4, defaultIsPublic: false, ...JSON.parse(raw) } : { weeklyGoal: 4, defaultIsPublic: false };
  } catch {
    return { weeklyGoal: 4, defaultIsPublic: false };
  }
}

function writePrefs(p: Partial<Prefs>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...p }));
}

export function getWeeklyGoal(): number { return readPrefs().weeklyGoal; }
export function setWeeklyGoal(n: number): void { writePrefs({ weeklyGoal: n }); }
export function getDefaultIsPublic(): boolean { return readPrefs().defaultIsPublic; }
export function setDefaultIsPublic(v: boolean): void { writePrefs({ defaultIsPublic: v }); }

// ─── Public feed ──────────────────────────────────────────────────────────────

export interface FeedItem {
  id: string;
  date: string;
  name: string;
  estimatedCalories: number | null;
  exercises: WorkoutExercise[];
  userId: string;
  username: string;
  displayName: string;
}

export async function getPublicFeed(): Promise<FeedItem[]> {
  if (!isSupabaseConfigured) {
    // In mock mode return public mock workouts
    const mockWorkouts = (await import("@/data/mockWorkouts.json")).default as WorkoutRecord[];
    return mockWorkouts
      .filter((w) => w.isPublic)
      .map((w) => ({
        ...w,
        estimatedCalories: null,
        userId: "mock",
        username: "demo",
        displayName: "示例用户",
      }));
  }
  try {
    const sb = await getBrowserClient();

    // Step 1: fetch public workouts (workouts.user_id → auth.users, no direct FK to profiles)
    const { data: workoutRows, error: wErr } = await sb
      .from("workouts")
      .select(`
        id, date, name, estimated_calories, user_id,
        workout_sets(set_number, weight, reps, duration, distance_km,
          exercise:exercises(id, name, type, primary_muscles, met))
      `)
      .eq("is_public", true)
      .order("date", { ascending: false })
      .limit(50);

    if (wErr || !workoutRows?.length) return [];

    // Step 2: fetch profiles for the authors
    const userIds = [...new Set(workoutRows.map((r) => r.user_id as string))];
    const { data: profileRows } = await sb
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    const profileMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profileRows ?? []).map((p: any) => [p.id, p])
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return workoutRows.map((row: any) => {
      const profile = profileMap.get(row.user_id);
      return {
        ...dbRowToWorkout(row),
        estimatedCalories: row.estimated_calories ?? null,
        userId: row.user_id,
        username: profile?.username ?? "unknown",
        displayName: profile?.display_name ?? profile?.username ?? "用户",
      };
    });
  } catch {
    return [];
  }
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────

const WEIGHT_LOG_KEY = "fitlog_weight_logs";

export interface WeightLog {
  date: string;
  weightKg: number;
}

function readLocalWeightLogs(): WeightLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WEIGHT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalWeightLog(date: string, weightKg: number): void {
  if (typeof window === "undefined") return;
  const logs = readLocalWeightLogs();
  const idx = logs.findIndex((l) => l.date === date);
  if (idx >= 0) logs[idx].weightKg = weightKg;
  else logs.push({ date, weightKg });
  logs.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(logs));
}

export async function logWeight(date: string, weightKg: number): Promise<void> {
  writeLocalWeightLog(date, weightKg);
  if (!isSupabaseConfigured) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    const sb = await getBrowserClient();
    await sb.from("weight_logs").upsert({ user_id: userId, date, weight_kg: weightKg });
  } catch {
    // weight_logs table may not exist yet — localStorage fallback already saved
  }
}

export async function getWeightLogs(startDate: string, endDate: string): Promise<WeightLog[]> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentUserId();
    if (userId) {
      try {
        const sb = await getBrowserClient();
        const { data, error } = await sb
          .from("weight_logs")
          .select("date, weight_kg")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date");
        if (!error && data?.length) {
          return (data as {date: string; weight_kg: number}[]).map((r) => ({ date: r.date, weightKg: r.weight_kg }));
        }
      } catch {
        // fall through to localStorage
      }
    }
  }
  return readLocalWeightLogs().filter((l) => l.date >= startDate && l.date <= endDate);
}
