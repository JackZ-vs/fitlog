"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Dumbbell, Flame, Activity, Beef } from "lucide-react";
import { getAllWorkouts, getMealsInRange, getDailyTargets } from "@/lib/db";
import { DEFAULT_TARGETS } from "@/lib/types";
import type { WorkoutRecord, MealEntry, DailyTargets } from "@/lib/types";
import { epley1RM, workoutVolume, weekRange, weekMonday, toMuscleGroup } from "@/lib/utils";

// ── Theme ─────────────────────────────────────────────────────────────────────
const GRID = "#1e2128";
const AXIS_COLOR = "#4b5563";
const MUSCLE_COLORS: Record<string, string> = {
  胸: "#f97316", 背: "#22d3ee", 腿: "#4ade80", 肩: "#a78bfa",
  臂: "#fb923c", 核心: "#facc15", 臀: "#f472b6", 有氧: "#6b7280", 其他: "#374151",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return d.slice(5); // "MM-DD"
}

function fmtWeek(d: string) {
  return d.slice(5, 10); // "MM-DD"
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TimeRange = "1w" | "1m" | "3m" | "all";
type TrendTab = 0 | 1 | 2 | 3;

const TABS = ["力量趋势", "训练容量", "营养趋势", "体重趋势"];
const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "近1周", value: "1w" },
  { label: "近1月", value: "1m" },
  { label: "近3月", value: "3m" },
  { label: "全部", value: "all" },
];

// ── Mock nutrition seed (shown when no real meals exist) ──────────────────────
function buildMockNutrition(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - i));
    const cal = 1550 + Math.round(Math.sin(i * 0.7) * 300 + Math.random() * 200);
    const prot = 110 + Math.round(Math.sin(i * 0.5) * 30 + Math.random() * 20);
    return { date: d.toISOString().slice(0, 10), calories: cal, protein: prot };
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TrendTab>(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const [selectedExercise, setSelectedExercise] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const [start90] = weekRange(13);
    Promise.all([
      getAllWorkouts(),
      getMealsInRange(start90, today),
      getDailyTargets(),
    ]).then(([ws, ms, t]) => {
      setWorkouts(ws);
      setMeals(ms);
      setTargets(t);
      setLoading(false);
      // Auto-select most frequent exercise
      const freq = new Map<string, number>();
      for (const w of ws) for (const ex of w.exercises)
        freq.set(ex.exerciseName, (freq.get(ex.exerciseName) ?? 0) + 1);
      const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) setSelectedExercise(top[0]);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6b7280] text-sm">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-20">
      <h1 className="text-2xl font-bold text-[#f0f2f5] mb-6">数据统计</h1>
      <KpiSection workouts={workouts} meals={meals} targets={targets} />
      <MuscleSection workouts={workouts} />
      <TrendSection
        workouts={workouts}
        meals={meals}
        targets={targets}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        selectedExercise={selectedExercise}
        setSelectedExercise={setSelectedExercise}
      />
    </div>
  );
}

// ── KPI Section ───────────────────────────────────────────────────────────────
function KpiSection({
  workouts, meals, targets,
}: {
  workouts: WorkoutRecord[]; meals: MealEntry[]; targets: DailyTargets;
}) {
  const [thisStart, thisEnd] = weekRange(0);
  const [lastStart, lastEnd] = weekRange(1);

  const thisWeek = workouts.filter((w) => w.date >= thisStart && w.date <= thisEnd);
  const lastWeek = workouts.filter((w) => w.date >= lastStart && w.date <= lastEnd);

  const thisVol = Math.round(thisWeek.reduce((s, w) => s + workoutVolume(w.exercises), 0));
  const lastVol = Math.round(lastWeek.reduce((s, w) => s + workoutVolume(w.exercises), 0));

  const thisMeals = meals.filter((m) => m.date >= thisStart && m.date <= thisEnd);
  const lastMeals = meals.filter((m) => m.date >= lastStart && m.date <= lastEnd);

  function avgMacro(ms: MealEntry[], key: "calories" | "protein") {
    const byDate = new Map<string, number>();
    for (const m of ms) byDate.set(m.date, (byDate.get(m.date) ?? 0) + (m[key] ?? 0));
    const vals = [...byDate.values()];
    if (!vals.length) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  const thisCalAvg = avgMacro(thisMeals, "calories");
  const lastCalAvg = avgMacro(lastMeals, "calories");
  const thisPrAvg = avgMacro(thisMeals, "protein");
  const lastPrAvg = avgMacro(lastMeals, "protein");

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Dumbbell size={16} className="text-[#f97316]" />}
          label="本周训练"
          value={`${thisWeek.length} 次`}
          prev={lastWeek.length}
          curr={thisWeek.length}
          accent="#f97316"
        />
        <KpiCard
          icon={<Activity size={16} className="text-[#22d3ee]" />}
          label="本周训练容量"
          value={thisVol >= 1000 ? `${(thisVol / 1000).toFixed(1)}t` : `${thisVol} kg`}
          prev={lastVol}
          curr={thisVol}
          accent="#22d3ee"
        />
        <KpiCard
          icon={<Flame size={16} className="text-[#facc15]" />}
          label="本周日均热量"
          value={thisCalAvg !== null ? `${thisCalAvg} kcal` : "暂无数据"}
          prev={lastCalAvg}
          curr={thisCalAvg}
          accent="#facc15"
        />
        <KpiCard
          icon={<Beef size={16} className="text-[#a78bfa]" />}
          label="本周日均蛋白质"
          value={thisPrAvg !== null ? `${thisPrAvg} g` : "暂无数据"}
          prev={lastPrAvg}
          curr={thisPrAvg}
          accent="#a78bfa"
          target={targets.protein}
        />
      </div>

      {/* vs last week comparison */}
      <div className="rounded-xl bg-[#111318] border border-[#252830] p-4">
        <p className="text-xs font-semibold text-[#6b7280] mb-3">本周 vs 上周</p>
        <div className="space-y-2.5">
          <CompRow label="训练次数" curr={thisWeek.length} prev={lastWeek.length} unit="次" />
          <CompRow label="训练容量" curr={thisVol} prev={lastVol} unit="kg" />
          <CompRow label="日均热量" curr={thisCalAvg} prev={lastCalAvg} unit="kcal" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, prev, curr, accent, target,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  prev: number | null;
  curr: number | null;
  accent: string;
  target?: number;
}) {
  const delta = prev !== null && curr !== null && prev > 0
    ? Math.round(((curr - prev) / prev) * 100)
    : null;
  const targetPct = target !== null && target !== undefined && curr !== null
    ? Math.round((curr / target) * 100)
    : null;

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1a1d24]">
          {icon}
        </div>
        {delta !== null && (
          <span
            className="text-[10px] font-semibold flex items-center gap-0.5"
            style={{ color: delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#6b7280" }}
          >
            {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-[#6b7280]">{label}</p>
      <p className="text-lg font-bold text-[#f0f2f5] mt-0.5">{value}</p>
      {targetPct !== null && (
        <div className="mt-1.5">
          <div className="h-1 rounded-full bg-[#1a1d24] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(targetPct, 100)}%`, background: accent }}
            />
          </div>
          <p className="text-[9px] text-[#3f4350] mt-0.5">目标达成 {targetPct}%</p>
        </div>
      )}
    </div>
  );
}

function CompRow({
  label, curr, prev, unit,
}: {
  label: string; curr: number | null; prev: number | null; unit: string;
}) {
  const delta = prev !== null && curr !== null && prev > 0
    ? Math.round(((curr - prev) / prev) * 100)
    : null;
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#6b7280]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[#3f4350]">{prev !== null ? `${prev}${unit}` : "—"}</span>
        <span className="text-[#3f4350]">→</span>
        <span className="text-[#f0f2f5] font-medium">{curr !== null ? `${curr}${unit}` : "—"}</span>
        {delta !== null && (
          <span
            className="w-14 text-right font-semibold"
            style={{ color: up ? "#4ade80" : down ? "#f87171" : "#6b7280" }}
          >
            {up ? "▲" : down ? "▼" : "—"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Muscle Distribution ───────────────────────────────────────────────────────
function MuscleSection({ workouts }: { workouts: WorkoutRecord[] }) {
  const [thisStart, thisEnd] = weekRange(0);
  const thisWeek = workouts.filter((w) => w.date >= thisStart && w.date <= thisEnd);

  const groupCounts = new Map<string, number>();
  for (const w of thisWeek) {
    for (const ex of w.exercises) {
      const seen = new Set<string>();
      for (const m of ex.primaryMuscles) {
        const g = toMuscleGroup(m);
        if (!seen.has(g)) {
          groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
          seen.add(g);
        }
      }
    }
  }

  const data = [...groupCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) {
    return (
      <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-6 flex flex-col items-center justify-center h-32 text-[#6b7280] text-sm">
        本周暂无训练数据
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-6">
      <p className="text-sm font-semibold text-[#f0f2f5] mb-4">本周肌群分布</p>
      <div className="flex items-center gap-4">
        <div className="shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={MUSCLE_COLORS[entry.name] ?? "#374151"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1d24", border: "1px solid #252830", borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) => [`${v} 组`, String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: MUSCLE_COLORS[d.name] ?? "#374151" }}
              />
              <span className="text-xs text-[#6b7280] flex-1">{d.name}</span>
              <span className="text-xs font-medium text-[#f0f2f5]">{d.value}</span>
              <span className="text-[10px] text-[#3f4350] w-8 text-right">
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trend Section ─────────────────────────────────────────────────────────────
function TrendSection({
  workouts, meals, targets,
  activeTab, setActiveTab,
  timeRange, setTimeRange,
  selectedExercise, setSelectedExercise,
}: {
  workouts: WorkoutRecord[]; meals: MealEntry[]; targets: DailyTargets;
  activeTab: TrendTab; setActiveTab: (t: TrendTab) => void;
  timeRange: TimeRange; setTimeRange: (t: TimeRange) => void;
  selectedExercise: string; setSelectedExercise: (e: string) => void;
}) {
  // Compute cutoff date for time range filter
  function cutoff() {
    const d = new Date();
    if (timeRange === "1w") d.setDate(d.getDate() - 7);
    else if (timeRange === "1m") d.setDate(d.getDate() - 30);
    else if (timeRange === "3m") d.setDate(d.getDate() - 90);
    else return "0000-00-00";
    return d.toISOString().slice(0, 10);
  }
  const cut = cutoff();

  // ─── Tab 0: Strength trend ────────────────────────────────────────────────
  const allExercises = [...new Set(
    workouts.flatMap((w) => w.exercises.map((ex) => ex.exerciseName))
  )].sort();

  const strengthData = workouts
    .filter((w) => w.date >= cut)
    .filter((w) => w.exercises.some((ex) => ex.exerciseName === selectedExercise))
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === selectedExercise)!;
      const maxRM = ex.sets.reduce((mx, s) => {
        if (!s.weight || !s.reps) return mx;
        return Math.max(mx, epley1RM(s.weight, s.reps));
      }, 0);
      return { date: fmtDate(w.date), rm: Math.round(maxRM * 10) / 10 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─── Tab 1: Weekly volume ─────────────────────────────────────────────────
  const weekVolMap = new Map<string, number>();
  for (const w of workouts.filter((w) => w.date >= cut)) {
    const mon = weekMonday(w.date);
    weekVolMap.set(mon, (weekVolMap.get(mon) ?? 0) + workoutVolume(w.exercises));
  }
  const volumeData = [...weekVolMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([week, vol]) => ({ week: fmtWeek(week), volume: Math.round(vol) }));

  // ─── Tab 2: Nutrition trend ───────────────────────────────────────────────
  const mealsByDate = new Map<string, { calories: number; protein: number }>();
  for (const m of meals.filter((m) => m.date >= cut)) {
    const prev = mealsByDate.get(m.date) ?? { calories: 0, protein: 0 };
    mealsByDate.set(m.date, {
      calories: prev.calories + (m.calories ?? 0),
      protein: prev.protein + (m.protein ?? 0),
    });
  }
  const hasMeals = mealsByDate.size > 0;
  const nutritionData = hasMeals
    ? [...mealsByDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date: fmtDate(date), calories: Math.round(v.calories), protein: Math.round(v.protein) }))
    : buildMockNutrition(timeRange === "1w" ? 7 : timeRange === "1m" ? 30 : 14).map((d) => ({
        date: fmtDate(d.date), calories: d.calories, protein: d.protein,
      }));

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#252830] overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i as TrendTab)}
            className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === i
                ? "text-[#f97316] border-b-2 border-[#f97316]"
                : "text-[#6b7280] hover:text-[#f0f2f5]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Time range selector (not shown for body weight placeholder) */}
        {activeTab !== 3 && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  timeRange === value
                    ? "bg-[#f97316] text-white"
                    : "bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab 0: Strength ── */}
        {activeTab === 0 && (
          <div>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm focus:outline-none focus:border-[#f97316]"
            >
              {allExercises.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {strengthData.length < 2 ? (
              <EmptyChart label="该动作暂无足够数据" />
            ) : (
              <>
                <p className="text-[10px] text-[#6b7280] mb-2">估算1RM（Epley公式）kg</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={strengthData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1a1d24", border: "1px solid #252830", borderRadius: 8, fontSize: 12 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`${v} kg`, "估算1RM"]}
                    />
                    <Line type="monotone" dataKey="rm" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Tab 1: Weekly volume ── */}
        {activeTab === 1 && (
          <div>
            {!volumeData.length ? (
              <EmptyChart label="暂无训练数据" />
            ) : (
              <>
                <p className="text-[10px] text-[#6b7280] mb-2">每周总训练容量（重量×次数）kg</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={volumeData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1a1d24", border: "1px solid #252830", borderRadius: 8, fontSize: 12 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`${v} kg`, "训练容量"]}
                    />
                    <Bar dataKey="volume" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Tab 2: Nutrition ── */}
        {activeTab === 2 && (
          <div>
            {!hasMeals && (
              <p className="text-[10px] text-[#f97316]/70 mb-2">暂无真实数据，显示示例趋势</p>
            )}
            <p className="text-[10px] text-[#6b7280] mb-2">每日热量（kcal）与蛋白质（g）</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={nutritionData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="cal" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="pr" orientation="right" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1d24", border: "1px solid #252830", borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) =>
                    name === "calories" ? [`${v} kcal`, "热量"] : [`${v} g`, "蛋白质"]
                  }
                />
                <ReferenceLine yAxisId="cal" y={targets.calories} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine yAxisId="pr" y={targets.protein} stroke="#a78bfa" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line yAxisId="cal" type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="pr" type="monotone" dataKey="protein" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-end">
              <LegendDot color="#f97316" label="热量" dashed />
              <LegendDot color="#a78bfa" label="蛋白质" dashed />
            </div>
          </div>
        )}

        {/* ── Tab 3: Body weight placeholder ── */}
        {activeTab === 3 && (
          <div className="flex flex-col items-center justify-center h-48 text-[#6b7280]">
            <p className="text-2xl mb-2">⚖️</p>
            <p className="text-sm font-medium text-[#f0f2f5]">体重趋势</p>
            <p className="text-xs mt-1">敬请期待</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-[#6b7280] text-sm border border-dashed border-[#252830] rounded-xl">
      {label}
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="16" height="8">
        <line
          x1="0" y1="4" x2="16" y2="4"
          stroke={color} strokeWidth="2"
          strokeDasharray={dashed ? "4 2" : undefined}
        />
      </svg>
      <span className="text-[10px] text-[#6b7280]">{label}</span>
    </div>
  );
}
