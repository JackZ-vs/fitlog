import type { WorkoutRecord, MealEntry, DailyTargets } from "./types";
import { epley1RM, toMuscleGroup } from "./utils";

export interface Insight {
  type: "training" | "progress" | "rest" | "nutrition";
  message: string;
}

const ICON: Record<Insight["type"], string> = {
  training: "💪",
  progress: "📈",
  rest: "😴",
  nutrition: "🥗",
};
export { ICON as InsightIcon };

export function computeInsights(
  workouts: WorkoutRecord[],
  meals: MealEntry[],
  targets: DailyTargets
): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

  // ── 1. Rest reminder: 4+ consecutive days trained ─────────────────────────
  {
    const workoutDates = new Set(sorted.map((w) => w.date));
    let streak = 0;
    const d = new Date(today + "T00:00:00");
    // Count today only if it has a workout
    for (let i = 0; i < 14; i++) {
      if (workoutDates.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    if (streak >= 4) {
      insights.push({ type: "rest", message: `已连续训练 ${streak} 天，建议安排一天恢复` });
    }
  }

  // ── 2. Training reminder: muscle group idle 3–7 days ──────────────────────
  {
    const muscleLastDate: Record<string, string> = {};
    for (const w of sorted.filter((w) => w.date < today)) {
      for (const ex of w.exercises) {
        for (const m of ex.primaryMuscles) {
          const g = toMuscleGroup(m);
          if (!muscleLastDate[g]) muscleLastDate[g] = w.date;
        }
      }
    }
    let bestGroup = "";
    let bestDays = 0;
    for (const [group, lastDate] of Object.entries(muscleLastDate)) {
      if (["有氧", "其他"].includes(group)) continue;
      const days = Math.floor(
        (new Date(today).getTime() - new Date(lastDate + "T00:00:00").getTime()) / 86400000
      );
      if (days >= 3 && days <= 7 && days > bestDays) {
        bestGroup = group;
        bestDays = days;
      }
    }
    if (bestGroup) {
      insights.push({
        type: "training",
        message: `${bestGroup} 已 ${bestDays} 天未训练，今天可以安排${bestGroup}日`,
      });
    }
  }

  // ── 3. Progress reminder: exercise 1RM improving in last 3 sessions ───────
  {
    const exHistory: Record<string, { date: string; rm: number }[]> = {};
    for (const w of sorted) {
      for (const ex of w.exercises) {
        const maxRM = ex.sets.reduce((mx, s) => {
          if (!s.weight || !s.reps) return mx;
          return Math.max(mx, epley1RM(s.weight, s.reps));
        }, 0);
        if (!maxRM) continue;
        if (!exHistory[ex.exerciseName]) exHistory[ex.exerciseName] = [];
        exHistory[ex.exerciseName].push({ date: w.date, rm: maxRM });
      }
    }
    let found = false;
    for (const [name, history] of Object.entries(exHistory)) {
      if (found) break;
      const asc = [...history].sort((a, b) => a.date.localeCompare(b.date));
      if (asc.length < 3) continue;
      const last3 = asc.slice(-3);
      if (last3[2].rm > last3[1].rm && last3[1].rm > last3[0].rm) {
        insights.push({
          type: "progress",
          message: `${name} 持续进步中，估算1RM ${Math.round(last3[2].rm)} kg`,
        });
        found = true;
      }
    }
  }

  // ── 4. Nutrition reminder: avg protein < 80% of target over last 3 days ──
  {
    const past3 = [1, 2, 3].map((i) => {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    const dayProteins = past3
      .map((date) => {
        const dayMeals = meals.filter((m) => m.date === date);
        if (!dayMeals.length) return null;
        return dayMeals.reduce((s, m) => s + (m.protein ?? 0), 0);
      })
      .filter((p): p is number => p !== null);

    if (dayProteins.length >= 2) {
      const avg = dayProteins.reduce((s, p) => s + p, 0) / dayProteins.length;
      if (avg < targets.protein * 0.8) {
        insights.push({
          type: "nutrition",
          message: `近3天日均蛋白质 ${Math.round(avg)}g，未达目标 ${targets.protein}g 的80%`,
        });
      }
    }
  }

  return insights;
}
