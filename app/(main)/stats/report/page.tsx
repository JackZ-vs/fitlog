"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { getAllWorkouts, getMealsInRange, getDailyTargets } from "@/lib/db";
import { workoutVolume, epley1RM, weekMonday } from "@/lib/utils";
import type { WorkoutRecord, MealEntry, DailyTargets } from "@/lib/types";
import { DEFAULT_TARGETS } from "@/lib/types";

const PR_KEYWORDS = ["卧推", "深蹲", "硬拉", "引体", "肩推", "划船"];

function getMonthRange(year: number, month: number): [string, string] {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return [start, end];
}

function fmtMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
}

function ReportContent() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(Number(searchParams.get("year") ?? now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") ?? now.getMonth() + 1));

  const [allWorkouts, setAllWorkouts] = useState<WorkoutRecord[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const [start, end] = getMonthRange(year, month);
    Promise.all([getAllWorkouts(), getMealsInRange(start, end), getDailyTargets()]).then(
      ([ws, ms, t]) => {
        setAllWorkouts(ws);
        setMeals(ms);
        setTargets(t);
        setLoading(false);
      }
    );
  }, [year, month]);

  const [start, end] = getMonthRange(year, month);
  const workouts = allWorkouts.filter((w) => w.date >= start && w.date <= end);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalVolume = Math.round(workouts.reduce((s, w) => s + workoutVolume(w.exercises), 0));
  const totalSets = workouts.reduce((s, w) => s + w.exercises.reduce((s2, e) => s2 + e.sets.length, 0), 0);

  // Weekly volume
  const weekMap = new Map<string, number>();
  for (const w of workouts) {
    const mon = weekMonday(w.date);
    weekMap.set(mon, (weekMap.get(mon) ?? 0) + workoutVolume(w.exercises));
  }
  const weeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxVol = Math.max(...weeks.map(([, v]) => v), 1);

  // Top exercises
  const exMap = new Map<string, number>();
  for (const w of workouts) for (const ex of w.exercises)
    exMap.set(ex.exerciseName, (exMap.get(ex.exerciseName) ?? 0) + ex.sets.length);
  const topExercises = [...exMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // PRs this month
  const monthPRs: { name: string; rm: number; date: string }[] = [];
  for (const kw of PR_KEYWORDS) {
    let best = { rm: 0, date: "", name: "" };
    // historical best (before this month)
    const histBest = allWorkouts
      .filter((w) => w.date < start)
      .reduce((mx, w) => {
        const ex = w.exercises.find((e) => e.exerciseName.includes(kw));
        if (!ex) return mx;
        return ex.sets.reduce((mx2, s) => {
          if (!s.weight || !s.reps) return mx2;
          return Math.max(mx2, epley1RM(s.weight, s.reps));
        }, mx);
      }, 0);

    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.exerciseName.includes(kw));
      if (!ex) continue;
      for (const s of ex.sets) {
        if (!s.weight || !s.reps) continue;
        const rm = epley1RM(s.weight, s.reps);
        if (rm > best.rm) best = { rm, date: w.date, name: ex.exerciseName };
      }
    }
    if (best.rm > histBest && best.name) {
      monthPRs.push({ name: best.name, rm: Math.round(best.rm * 10) / 10, date: best.date });
    }
  }

  // Nutrition
  const mealByDate = new Map<string, { cal: number; prot: number }>();
  for (const m of meals) {
    const p = mealByDate.get(m.date) ?? { cal: 0, prot: 0 };
    mealByDate.set(m.date, { cal: p.cal + (m.calories ?? 0), prot: p.prot + (m.protein ?? 0) });
  }
  const avgCal = mealByDate.size > 0
    ? Math.round([...mealByDate.values()].reduce((s, v) => s + v.cal, 0) / mealByDate.size)
    : 0;
  const avgProt = mealByDate.size > 0
    ? Math.round([...mealByDate.values()].reduce((s, v) => s + v.prot, 0) / mealByDate.size)
    : 0;

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
    if (isCurrentOrFuture) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="min-h-screen bg-[#0d0f13]">
      {/* Print controls — hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#111318] border-b border-[#252830]">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1d24] text-[#6b7280]">
          <ChevronLeft size={18} />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-[#f0f2f5]">
          {fmtMonth(year, month)} 训练报告
        </span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1d24] text-[#6b7280]">
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] transition-colors"
        >
          <Printer size={14} />
          保存 / 打印
        </button>
      </div>

      {/* Report body — printed as-is */}
      <div ref={printRef} className="max-w-2xl mx-auto px-6 py-8 report-body">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#6b7280]">加载中…</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-8 pb-5 border-b border-[#252830] print-border">
              <div>
                <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-1">FitLog 月度报告</p>
                <h1 className="text-2xl font-bold text-[#f0f2f5]">{fmtMonth(year, month)}</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#3f4350]">生成于 {new Date().toLocaleDateString("zh-CN")}</p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { label: "训练次数", value: `${workouts.length}`, unit: "次" },
                { label: "总训练组数", value: `${totalSets}`, unit: "组" },
                { label: "总训练容量", value: totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) : `${totalVolume}`, unit: totalVolume >= 1000 ? "t" : "kg" },
                { label: "日均热量", value: avgCal > 0 ? `${avgCal}` : "—", unit: avgCal > 0 ? "kcal" : "" },
              ].map(({ label, value, unit }) => (
                <div key={label} className="rounded-xl bg-[#111318] border border-[#252830] p-3 print-card">
                  <p className="text-[10px] text-[#6b7280] mb-1">{label}</p>
                  <p className="text-xl font-bold text-[#f97316]">{value}<span className="text-xs text-[#6b7280] ml-0.5">{unit}</span></p>
                </div>
              ))}
            </div>

            {/* Weekly volume bars */}
            {weeks.length > 0 && (
              <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-6 print-card">
                <p className="text-sm font-semibold text-[#f0f2f5] mb-4">每周训练容量</p>
                <div className="space-y-2.5">
                  {weeks.map(([mon, vol]) => (
                    <div key={mon} className="flex items-center gap-3">
                      <span className="text-[10px] text-[#6b7280] w-14 shrink-0">
                        {new Date(mon + "T00:00:00").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })} 周
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-[#1a1d24] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#22d3ee]"
                          style={{ width: `${Math.round((vol / maxVol) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#f0f2f5] w-16 text-right shrink-0">
                        {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Top exercises */}
              {topExercises.length > 0 && (
                <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 print-card">
                  <p className="text-sm font-semibold text-[#f0f2f5] mb-3">主力动作</p>
                  <div className="space-y-2">
                    {topExercises.map(([name, sets], i) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#3f4350] w-4">{i + 1}</span>
                        <span className="text-xs text-[#f0f2f5] flex-1 truncate">{name}</span>
                        <span className="text-xs text-[#6b7280]">{sets} 组</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRs this month */}
              <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 print-card">
                <p className="text-sm font-semibold text-[#f0f2f5] mb-3">🏆 本月新纪录</p>
                {monthPRs.length === 0 ? (
                  <p className="text-xs text-[#3f4350] mt-4 text-center">本月暂无新 PR</p>
                ) : (
                  <div className="space-y-2">
                    {monthPRs.map((pr) => (
                      <div key={pr.name} className="flex items-center gap-2">
                        <span className="text-xs text-[#f0f2f5] flex-1 truncate">{pr.name}</span>
                        <span className="text-xs font-bold text-amber-400">{pr.rm} kg</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition summary */}
            {(avgCal > 0 || avgProt > 0) && (
              <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-6 print-card">
                <p className="text-sm font-semibold text-[#f0f2f5] mb-3">营养摘要</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#6b7280]">日均热量摄入</p>
                    <p className="text-lg font-bold text-[#f97316]">{avgCal} <span className="text-xs text-[#6b7280]">kcal</span></p>
                    <p className="text-[10px] text-[#3f4350]">目标 {targets.calories} kcal（达成率 {Math.round(avgCal / targets.calories * 100)}%）</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280]">日均蛋白质</p>
                    <p className="text-lg font-bold text-[#a78bfa]">{avgProt} <span className="text-xs text-[#6b7280]">g</span></p>
                    <p className="text-[10px] text-[#3f4350]">目标 {targets.protein}g（达成率 {Math.round(avgProt / targets.protein * 100)}%）</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-[#252830] print-border text-center">
              <p className="text-[10px] text-[#3f4350]">FitLog — 记录即进步</p>
            </div>
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .report-body { max-width: 100% !important; }
          .print-card {
            background: #f9fafb !important;
            border-color: #e5e7eb !important;
            break-inside: avoid;
          }
          .print-border { border-color: #e5e7eb !important; }
          h1, p { color: inherit !important; }
          [style*="color: #f97316"] { color: #ea580c !important; }
          [style*="color: #f0f2f5"] { color: #111 !important; }
          [style*="color: #6b7280"] { color: #555 !important; }
          [style*="color: #3f4350"] { color: #777 !important; }
        }
      `}</style>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-[#6b7280]">加载中…</div>}>
      <ReportContent />
    </Suspense>
  );
}
