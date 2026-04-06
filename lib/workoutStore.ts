/**
 * Backward-compatible re-export shim.
 * All logic has moved to lib/db.ts.
 * Existing imports continue to work unchanged.
 */
export {
  getAllWorkouts,
  getWorkout,
  saveWorkout,
  getLastWorkoutBefore,
  newEmptyWorkout,
  estimateCalories,
} from "./db";
