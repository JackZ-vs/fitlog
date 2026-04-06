"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAllWorkouts, getAllMealDates } from "@/lib/db";
import type { WorkoutRecord } from "@/lib/types";

// Map primary muscle → broad group color
const MUSCLE_COLOR: Record<string, string> = {
  胸: "#f97316",
  "胸(上部)": "#f97316",
  "胸(下部)": "#f97316",
  背: "#22d3ee",
  背阔肌: "#22d3ee",
  "背(中部)": "#22d3ee",
  上背: "#22d3ee",
  下背: "#22d3ee",
  斜方肌: "#22d3ee",
  "斜方肌(上)": "#22d3ee",
  "斜方肌(中)": "#22d3ee",
  股四: "#4ade80",
  腿: "#4ade80",
  腿后侧: "#4ade80",
  小腿: "#4ade80",
  "小腿(腓肠肌)": "#4ade80",
  "小腿(比目鱼肌)": "#4ade80",
  肩: "#a78bfa",
  肩中束: "#a78bfa",
  肩前束: "#a78bfa",
  肩后束: "#a78bfa",
  后肩: "#a78bfa",
  臂: "#fb923c",
  二头: "#fb923c",
  "二头(长头)": "#fb923c",
  三头: "#fb923c",
  "三头(长头)": "#fb923c",
  核心: "#facc15",
  腹直肌: "#facc15",
  腹横肌: "#facc15",
  腹斜肌: "#facc15",
  "核心(上腹)": "#facc15",
  "核心(下腹)": "#facc15",
  臀: "#f472b6",
  "臀(中)": "#f472b6",
  "臀(小)": "#f472b6",
  全身: "#6b7280",
  心肺: "#22d3ee",
};

function getDotsForWorkout(workout: WorkoutRecord): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const ex of workout.exercises) {
    for (const muscle of ex.primaryMuscles) {
      const color = MUSCLE_COLOR[muscle];
      if (color && !seen.has(color)) {
        seen.add(color);
        colors.push(color);
      }
    }
  }
  return colors.slice(0, 4);
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarView() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [mealDates, setMealDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAllWorkouts().then(setWorkouts);
    getAllMealDates().then(setMealDates);
  }, []);

  // Map date string → workout
  const workoutMap = new Map(workouts.map((w) => [w.date, w]));

  // Calendar math
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const todayStr = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/workout/${dateStr}`);
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-[#f0f2f5]">
          {year}年{month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs py-1.5 font-medium ${
              i === 0 || i === 6 ? "text-[#4b5563]" : "text-[#6b7280]"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
          if (!isCurrentMonth) {
            return <div key={i} className="aspect-square" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const workout = workoutMap.get(dateStr);
          const hasMeal = mealDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const dots = workout ? getDotsForWorkout(workout) : [];

          return (
            <button
              key={i}
              onClick={() => handleDayClick(dayNum)}
              disabled={isFuture}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative
                ${isToday
                  ? "bg-[#f97316] text-white font-bold"
                  : workout
                  ? "bg-[#1a1d24] hover:bg-[#252830] text-[#f0f2f5]"
                  : isFuture
                  ? "text-[#2a2d35] cursor-default"
                  : "hover:bg-[#1a1d24] text-[#94a3b8]"
                }`}
            >
              <span className="text-sm leading-none">{dayNum}</span>
              {(dots.length > 0 || hasMeal) && (
                <div className="flex gap-0.5 items-center">
                  {dots.map((color, ci) => (
                    <span
                      key={ci}
                      className="w-1 h-1 rounded-full"
                      style={{ background: isToday ? "rgba(255,255,255,0.8)" : color }}
                    />
                  ))}
                  {hasMeal && (
                    <span
                      className="w-1 h-1 rounded-sm"
                      style={{ background: isToday ? "rgba(255,255,255,0.6)" : "#c084fc" }}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-[#252830]">
        {[
          { label: "胸", color: "#f97316" },
          { label: "背", color: "#22d3ee" },
          { label: "腿", color: "#4ade80" },
          { label: "肩", color: "#a78bfa" },
          { label: "臂", color: "#fb923c" },
          { label: "核心", color: "#facc15" },
          { label: "臀", color: "#f472b6" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-xs text-[#6b7280]">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: "#c084fc" }} />
          <span className="text-xs text-[#6b7280]">饮食</span>
        </div>
      </div>

      {/* Empty state hint */}
      {workouts.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-[#252830] text-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-30">
            <rect x="8" y="12" width="32" height="28" rx="4" stroke="#f97316" strokeWidth="2" />
            <rect x="8" y="12" width="32" height="9" rx="4" stroke="#f97316" strokeWidth="2" />
            <circle cx="17" cy="16.5" r="2" fill="#f97316" />
            <circle cx="24" cy="16.5" r="2" fill="#f97316" />
            <circle cx="31" cy="16.5" r="2" fill="#f97316" />
            <line x1="15" y1="28" x2="33" y2="28" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="33" x2="27" y2="33" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-xs text-[#6b7280]">还没有训练记录</p>
          <p className="text-[10px] text-[#3f4350]">点击任意日期开始记录训练</p>
        </div>
      )}
    </div>
  );
}
