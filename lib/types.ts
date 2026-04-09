export interface SetData {
  weight: number | null;
  reps: number | null;
  duration: number | null;   // seconds
  distanceKm?: number | null; // optional — cardio only
}

export interface WorkoutExercise {
  exerciseId: number;
  exerciseName: string;
  primaryMuscles: string[];
  type: string;
  equipment: string;
  met: number;
  sets: SetData[];
}

export interface WorkoutRecord {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isPublic: boolean;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: "早餐" | "午餐" | "晚餐" | "加餐";
  foodName: string;
  amountG: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DEFAULT_TARGETS: DailyTargets = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};
