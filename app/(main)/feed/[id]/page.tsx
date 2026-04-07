"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flame, User, Dumbbell } from "lucide-react";
import { getPublicWorkoutById } from "@/lib/db";
import { estimateCalories } from "@/lib/db";
import type { FeedItem } from "@/lib/db";
import type { SetData } from "@/lib/types";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
}

function formatSet(set: SetData, type: string): string {
  if (type === "cardio" || set.duration) {
    const parts = [];
    if (set.duration) {
      const m = Math.floor(set.duration / 60);
      const s = set.duration % 60;
      parts.push(m > 0 ? `${m}分${s > 0 ? s + "秒" : ""}` : `${s}秒`);
    }
    if (set.distanceKm) parts.push(`${set.distanceKm}km`);
    return parts.join(" · ") || "—";
  }
  if (set.weight && set.reps) return `${set.weight}kg × ${set.reps}`;
  if (set.reps) return `${set.reps} 次`;
  return "—";
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicWorkoutById(id).then((data) => {
      setItem(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-8 w-32 rounded bg-[#1a1d24] animate-pulse mb-6" />
        <div className="rounded-xl bg-[#111318] border border-[#252830] h-64 animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center py-20">
        <p className="text-[#6b7280] text-sm">训练不存在或已设为私密</p>
        <button onClick={() => router.back()} className="mt-4 text-[#f97316] text-sm hover:underline">
          返回
        </button>
      </div>
    );
  }

  const cal = item.estimatedCalories ?? (item.exercises.length
    ? estimateCalories({ ...item, id: item.id, isPublic: true, notes: "" })
    : null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-24">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#f0f2f5] mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        动态
      </button>

      {/* User header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#252830] shrink-0">
          <User size={16} className="text-[#6b7280]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f0f2f5]">{item.displayName}</p>
          <p className="text-xs text-[#6b7280]">{formatDate(item.date)}</p>
        </div>
        {cal !== null && cal > 0 && (
          <div className="ml-auto flex items-center gap-1 text-sm text-[#f97316]">
            <Flame size={14} />
            <span>{cal} kcal</span>
          </div>
        )}
      </div>

      {/* Workout name */}
      <h1 className="text-xl font-bold text-[#f0f2f5] mb-1">{item.name || "无名训练"}</h1>
      <p className="text-xs text-[#6b7280] mb-5">
        {item.exercises.length} 个动作 · {item.exercises.reduce((s, ex) => s + ex.sets.length, 0)} 组
      </p>

      {/* Exercises */}
      <div className="space-y-3">
        {item.exercises.map((ex, i) => (
          <div key={i} className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1d24]">
              <Dumbbell size={14} className="text-[#f97316] shrink-0" />
              <span className="text-sm font-semibold text-[#f0f2f5]">{ex.exerciseName}</span>
              <span className="ml-auto text-xs text-[#3f4350]">{ex.sets.length} 组</span>
            </div>
            <div className="px-4 py-2 space-y-1.5">
              {ex.sets.map((set, j) => (
                <div key={j} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-xs text-[#3f4350] shrink-0">{j + 1}</span>
                  <span className="text-[#f0f2f5]">{formatSet(set, ex.type)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
