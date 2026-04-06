/**
 * Improved calorie estimation.
 *
 * Strength: volume-based (ACSM formula)
 *   set_kcal = MET × weight × set_time_hrs  +  load_kg × reps × 0.0035  +  rest_kcal
 *
 * Cardio: activity-specific
 *   Running with distance  → weight × km × 1.036
 *   Cycling with distance  → MET derived from speed × weight × time
 *   Swimming               → MET 7 × weight × time
 *   Jump rope              → MET 10 × weight × time
 *   Other cardio           → exercise MET × weight × time
 */

import type { SetData, WorkoutExercise, WorkoutRecord } from "./types";

// ─── Cardio type detection ─────────────────────────────────────────────────────

function cardioKind(name: string): "running" | "cycling" | "swimming" | "jumprope" | "other" {
  const n = name;
  if (/跑步|慢跑|长跑|间歇跑|run/i.test(n)) return "running";
  if (/骑车|自行车|单车|cycling|bike/i.test(n)) return "cycling";
  if (/游泳|自由泳|swim/i.test(n)) return "swimming";
  if (/跳绳|jump.?rope/i.test(n)) return "jumprope";
  return "other";
}

// ─── Per-set calorie estimate ──────────────────────────────────────────────────

export function estimateSetCalories(
  set: SetData,
  ex: WorkoutExercise,
  bodyWeightKg: number,
): number {
  if (ex.type === "有氧") {
    return cardioSetKcal(set, ex, bodyWeightKg);
  }
  return strengthSetKcal(set, ex, bodyWeightKg);
}

function strengthSetKcal(set: SetData, ex: WorkoutExercise, bw: number): number {
  const reps = set.reps ?? 0;
  if (reps === 0) return 0;

  // Load: use set weight or estimate as 60% bodyweight for bodyweight moves
  const load = set.weight ?? bw * 0.6;

  // Active set time: reps × 3 s
  const setHrs = (reps * 3) / 3600;
  // Rest between sets: 90 s at MET 2.5
  const restHrs = 90 / 3600;

  const activeKcal = ex.met * bw * setHrs;
  const loadKcal   = load * reps * 0.0035;   // ACSM coefficient
  const restKcal   = 2.5 * bw * restHrs;

  return activeKcal + loadKcal + restKcal;
}

function cardioSetKcal(set: SetData, ex: WorkoutExercise, bw: number): number {
  const durHrs = (set.duration ?? 0) / 3600;
  const km = set.distanceKm ?? 0;
  const kind = cardioKind(ex.exerciseName);

  if (kind === "running") {
    if (km > 0) return bw * km * 1.036;
    if (durHrs > 0) return 8 * bw * durHrs; // default MET 8
    return 0;
  }

  if (kind === "cycling") {
    if (km > 0 && durHrs > 0) {
      const speedKmh = km / durHrs;
      const met = speedKmh < 16 ? 6 : speedKmh < 20 ? 8 : speedKmh < 25 ? 10 : 12;
      return met * bw * durHrs;
    }
    return 8 * bw * durHrs;
  }

  if (kind === "swimming") return 7 * bw * durHrs;
  if (kind === "jumprope") return 10 * bw * durHrs;

  // Other cardio — use exercise MET
  return ex.met * bw * durHrs;
}

// ─── Workout-level estimate ────────────────────────────────────────────────────

export function estimateCalories(workout: WorkoutRecord, bodyWeightKg = 70): number {
  let total = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      total += estimateSetCalories(set, ex, bodyWeightKg);
    }
  }
  return Math.round(total);
}

// ─── Pace formatter ───────────────────────────────────────────────────────────

/** Returns pace string like "5'30\"/km" given duration in seconds and km. */
export function formatPace(durationSec: number, km: number): string | null {
  if (!durationSec || !km || km <= 0) return null;
  const secPerKm = durationSec / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}'${String(secs).padStart(2, "0")}"`;
}
