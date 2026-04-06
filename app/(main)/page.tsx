"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, Utensils, Flame, TrendingUp, ChevronRight, Target, X } from "lucide-react";
import { getMealsByDate, getDailyTargets, getAllWorkouts, getMealsInRange, getMyProfile, getCurrentUserId } from "@/lib/db";
import type { DailyTargets, MealEntry, WorkoutRecord } from "@/lib/types";
import { computeInsights, InsightIcon } from "@/lib/insights";
import { getOnboardingTips, getDismissedTips, dismissTip, type OnboardingTip } from "@/lib/onboarding";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function TodayPage() {
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<DailyTargets>({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [tips, setTips] = useState<OnboardingTip[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  function loadData() {
    getMealsByDate(todayDate).then(setMeals);
    getDailyTargets().then((t) => {
      setTargets(t);
      getMyProfile().then((p) => {
        getAllWorkouts().then((ws) => {
          setWorkouts(ws);
          setTips(getOnboardingTips(p, ws.length, t));
        });
      });
    });
    const past7 = new Date();
    past7.setDate(past7.getDate() - 7);
    getMealsInRange(past7.toISOString().slice(0, 10), todayDate).then(setAllMeals);
    setDismissed(getDismissedTips());
  }

  useEffect(() => {
    loadData();
    getCurrentUserId().then(setUserId);
  }, [todayDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime sync: refresh when workouts or meals change on another device
  useRealtimeSync(userId, ["workouts", "meals"], loadData, 60_000);

  const insights = computeInsights(workouts, allMeals, targets);

  function handleDismiss(id: string) {
    dismissTip(id);
    setDismissed((prev) => new Set([...prev, id]));
  }

  const visibleTips = tips.filter((t) => !dismissed.has(t.id)).slice(0, 2);

  const calories = Math.round(meals.reduce((s, m) => s + (m.calories ?? 0), 0));
  const protein = Math.round(meals.reduce((s, m) => s + (m.protein ?? 0), 0));
  const calPct = Math.round((calories / targets.calories) * 100);
  const proteinPct = Math.round((protein / targets.protein) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#6b7280] text-sm">{todayLabel}</p>
        <h1 className="text-2xl font-bold text-[#f0f2f5] mt-0.5">今日概览</h1>
      </div>

      {/* Onboarding tips */}
      {visibleTips.length > 0 && (
        <div className="space-y-2 mb-5">
          {visibleTips.map((tip) => (
            <div
              key={tip.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                background: "linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(250,204,21,0.08) 100%)",
                borderColor: "rgba(251,146,60,0.25)",
              }}
            >
              <span className="text-sm text-[#f0f2f5] flex-1">{tip.message}</span>
              <Link
                href={tip.href}
                className="shrink-0 text-xs font-semibold text-[#f97316] hover:text-[#ea6c0a] transition-colors"
              >
                {tip.action}
              </Link>
              <button
                onClick={() => handleDismiss(tip.id)}
                className="shrink-0 text-[#6b7280] hover:text-[#f0f2f5] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Streak banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 mb-5">
        <Flame size={20} className="text-[#f97316]" />
        <span className="text-sm text-[#f0f2f5]">
          每日记录，坚持就是胜利
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href={`/workout/${todayDate}`}
          className="flex flex-col gap-3 p-4 rounded-xl bg-[#111318] border border-[#252830] hover:border-[#f97316]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f97316]/10">
              <Dumbbell size={18} className="text-[#f97316]" />
            </div>
            <ChevronRight size={16} className="text-[#6b7280] group-hover:text-[#f97316] transition-colors" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">今日训练</p>
            <p className="text-sm font-semibold text-[#f0f2f5] mt-0.5">点击记录</p>
          </div>
        </Link>

        <Link
          href={`/nutrition/${todayDate}`}
          className="flex flex-col gap-3 p-4 rounded-xl bg-[#111318] border border-[#252830] hover:border-purple-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10">
              <Utensils size={18} className="text-purple-400" />
            </div>
            <ChevronRight size={16} className="text-[#6b7280] group-hover:text-purple-400 transition-colors" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">饮食记录</p>
            <p className="text-sm font-semibold text-[#f0f2f5] mt-0.5">
              {calories > 0 ? `${calories} kcal` : "点击记录"}
            </p>
          </div>
        </Link>
      </div>

      {/* Nutrition progress */}
      <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#f0f2f5]">今日营养</h2>
          <span className="text-xs text-[#6b7280]">目标 {targets.calories} kcal</span>
        </div>
        <div className="space-y-3">
          <NutritionBar label="热量" value={calories} target={targets.calories} unit="kcal" pct={calPct} color="#f97316" />
          <NutritionBar label="蛋白质" value={protein} target={targets.protein} unit="g" pct={proteinPct} color="#a78bfa" />
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-4">
          <h2 className="text-sm font-semibold text-[#f0f2f5] mb-3">智能提醒</h2>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[#94a3b8]">
                <span className="text-base leading-none mt-0.5">{InsightIcon[ins.type]}</span>
                <span>{ins.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: "本周训练", value: "—", color: "#22d3ee" },
          { icon: Target, label: "营养达成", value: calPct > 0 ? `${calPct}%` : "—", color: "#4ade80" },
          { icon: Flame, label: "今日热量", value: calories > 0 ? `${calories}` : "—", color: "#f97316" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex flex-col gap-2 p-3 rounded-xl bg-[#111318] border border-[#252830]">
            <Icon size={16} style={{ color }} />
            <div>
              <p className="text-[10px] text-[#6b7280]">{label}</p>
              <p className="text-base font-bold text-[#f0f2f5]">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionBar({
  label, value, target, unit, pct, color,
}: {
  label: string; value: number; target: number; unit: string; pct: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[#6b7280]">{label}</span>
        <span className="text-xs text-[#f0f2f5]">
          {value} / {target} {unit}
          <span className="ml-1.5 font-semibold" style={{ color }}>{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a1d24] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
