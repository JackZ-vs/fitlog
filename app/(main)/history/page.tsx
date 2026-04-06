"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, ChevronRight, History } from "lucide-react";
import { getAllWorkouts } from "@/lib/db";
import { workoutVolume } from "@/lib/utils";
import type { WorkoutRecord } from "@/lib/types";

function WorkoutCard({ workout }: { workout: WorkoutRecord }) {
  const volume = Math.round(workoutVolume(workout.exercises));
  const totalSets = workout.exercises.reduce((s, ex) => s + ex.sets.length, 0);

  return (
    <Link
      href={`/workout/${workout.date}`}
      className="block rounded-xl bg-[#111318] border border-[#252830] hover:border-[#353840] transition-colors group"
    >
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Date badge */}
        <div className="shrink-0 w-12 text-center">
          <p className="text-lg font-bold text-[#f97316] leading-none">
            {workout.date.slice(8)}
          </p>
          <p className="text-[10px] text-[#6b7280] mt-0.5">
            {new Date(workout.date + "T00:00:00").toLocaleDateString("zh-CN", { month: "short" })}
          </p>
          <p className="text-[9px] text-[#3f4350]">
            {new Date(workout.date + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "short" })}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-[#252830] shrink-0" />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#f0f2f5] truncate">
            {workout.name || "未命名训练"}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-[#6b7280]">
              <Dumbbell size={11} className="text-[#3f4350]" />
              {workout.exercises.length} 个动作 · {totalSets} 组
            </span>
            {volume > 0 && (
              <span className="text-[11px] text-[#6b7280]">
                {volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg`}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={16} className="text-[#3f4350] group-hover:text-[#6b7280] shrink-0 transition-colors" />
      </div>

      {/* Exercise chips */}
      {workout.exercises.length > 0 && (
        <div className="flex gap-1.5 flex-wrap px-4 pb-3 -mt-1">
          {workout.exercises.slice(0, 4).map((ex, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1d24] text-[#6b7280] border border-[#252830]"
            >
              {ex.exerciseName}
            </span>
          ))}
          {workout.exercises.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1d24] text-[#3f4350] border border-[#252830]">
              +{workout.exercises.length - 4}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Inline SVG illustration */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-5 opacity-30">
        <rect x="14" y="20" width="52" height="40" rx="6" stroke="#f97316" strokeWidth="2.5" />
        <rect x="14" y="20" width="52" height="12" rx="6" stroke="#f97316" strokeWidth="2.5" />
        <circle cx="24" cy="26" r="3" fill="#f97316" />
        <circle cx="34" cy="26" r="3" fill="#f97316" />
        <line x1="24" y1="42" x2="56" y2="42" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="50" x2="48" y2="50" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-base font-semibold text-[#f0f2f5] mb-1">还没有训练记录</p>
      <p className="text-sm text-[#6b7280] mb-6">完成第一次训练后，历史记录将在这里展示</p>
      <Link
        href={`/workout/${new Date().toISOString().slice(0, 10)}`}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-bold hover:bg-[#ea6c0a] transition-colors"
      >
        <Dumbbell size={15} strokeWidth={2.5} />
        开始今日训练
      </Link>
    </div>
  );
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllWorkouts().then((ws) => {
      setWorkouts([...ws].sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    });
  }, []);

  // Group by year-month
  const groups = workouts.reduce<Record<string, WorkoutRecord[]>>((acc, w) => {
    const key = w.date.slice(0, 7); // "YYYY-MM"
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});

  const totalVolume = Math.round(workouts.reduce((s, w) => s + workoutVolume(w.exercises), 0));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <History size={18} className="text-[#f97316]" />
        <h1 className="text-xl font-bold text-[#f0f2f5]">训练历史</h1>
        {!loading && workouts.length > 0 && (
          <span className="ml-auto text-xs text-[#3f4350]">
            共 {workouts.length} 次 · {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[#111318] border border-[#252830] animate-pulse" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <EmptyHistory />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, ws]) => (
              <div key={month}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-[#6b7280]">
                    {new Date(month + "-01").toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
                  </p>
                  <div className="flex-1 h-px bg-[#1a1d24]" />
                  <p className="text-[10px] text-[#3f4350]">{ws.length} 次</p>
                </div>
                <div className="space-y-2">
                  {ws.map((w) => (
                    <WorkoutCard key={w.date} workout={w} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
