/** Epley formula: estimate 1-rep max from a weight × reps set */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Total volume (weight × reps) for a single workout */
export function workoutVolume(
  exercises: Array<{ sets: Array<{ weight: number | null; reps: number | null }> }>
): number {
  return exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0
  );
}

/** ISO week label "YYYY-Www" */
export function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = Math.floor((d.getTime() - startOfWeek1.getTime()) / 86400000);
  const week = Math.floor(diff / 7) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday of the week containing dateStr */
export function weekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Returns [start, end] YYYY-MM-DD for the week `weeksAgo` weeks ago (Mon–Sun) */
export function weekRange(weeksAgo = 0): [string, string] {
  const today = new Date();
  const dow = today.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - offset - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

/** Broad muscle group mapping */
export function toMuscleGroup(muscle: string): string {
  const map: Record<string, string> = {
    胸: "胸", "胸(上部)": "胸", "胸(下部)": "胸",
    背: "背", 背阔肌: "背", "背(中部)": "背", 上背: "背", 下背: "背",
    斜方肌: "背", "斜方肌(上)": "背", "斜方肌(中)": "背",
    股四: "腿", 腿: "腿", 腿后侧: "腿", 小腿: "腿",
    "小腿(腓肠肌)": "腿", "小腿(比目鱼肌)": "腿",
    肩: "肩", 肩前束: "肩", 肩中束: "肩", 肩后束: "肩", 后肩: "肩",
    臂: "臂", 二头: "臂", "二头(长头)": "臂", 三头: "臂", "三头(长头)": "臂",
    核心: "核心", 腹直肌: "核心", 腹横肌: "核心", 腹斜肌: "核心",
    "核心(上腹)": "核心", "核心(下腹)": "核心",
    臀: "臀", "臀(中)": "臀", "臀(小)": "臀",
    全身: "有氧", 心肺: "有氧",
  };
  return map[muscle] ?? "其他";
}
