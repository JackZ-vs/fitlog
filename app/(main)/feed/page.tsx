"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, Dumbbell, ChevronDown, ChevronUp, User } from "lucide-react";
import { getPublicFeed } from "@/lib/db";
import type { FeedItem } from "@/lib/db";
import { estimateCalories } from "@/lib/db";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("zh-CN", {
    month: "long", day: "numeric", weekday: "short",
  });
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const cal = item.estimatedCalories ?? (item.exercises.length
    ? estimateCalories({ ...item, id: "", isPublic: true, notes: "" })
    : null);

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1d24]">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#252830] shrink-0">
          <User size={14} className="text-[#6b7280]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#f0f2f5] truncate">{item.displayName}</p>
          <p className="text-xs text-[#6b7280]">{formatDate(item.date)}</p>
        </div>
        {cal !== null && cal > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#f97316]">
            <Flame size={12} />
            <span>{cal} kcal</span>
          </div>
        )}
      </div>

      {/* Workout name */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-[#f0f2f5]">
          {item.name || "无名训练"}
        </p>
        <p className="text-xs text-[#6b7280] mt-0.5">
          {item.exercises.length} 个动作 · {item.exercises.reduce((s, ex) => s + ex.sets.length, 0)} 组
        </p>
      </div>

      {/* Exercises (collapsible) */}
      {item.exercises.length > 0 && (
        <div className="px-4 pb-3">
          <div className={`space-y-1 overflow-hidden transition-all ${expanded ? "" : "max-h-16"}`}>
            {item.exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#6b7280]">
                <Dumbbell size={11} className="text-[#3f4350] shrink-0" />
                <span className="truncate">{ex.exerciseName}</span>
                <span className="text-[#3f4350] shrink-0">{ex.sets.length}组</span>
              </div>
            ))}
          </div>
          {item.exercises.length > 2 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-[#3f4350] hover:text-[#6b7280] mt-1.5 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? "收起" : `还有 ${item.exercises.length - 2} 个动作`}
            </button>
          )}
        </div>
      )}

      {/* Footer link */}
      <div className="px-4 py-2 border-t border-[#1a1d24]">
        <Link
          href={`/workout/${item.date}`}
          className="text-xs text-[#f97316] hover:underline"
        >
          查看训练详情 →
        </Link>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicFeed().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-bold text-[#f0f2f5] mb-6">动态</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-[#111318] border border-[#252830] h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-5 opacity-30">
            {/* Two overlapping speech bubbles */}
            <rect x="8" y="14" width="42" height="28" rx="8" stroke="#22d3ee" strokeWidth="2.5" />
            <path d="M14 42 L10 52 L24 42" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinejoin="round" />
            <rect x="30" y="34" width="42" height="24" rx="8" stroke="#f97316" strokeWidth="2.5" />
            <path d="M66 58 L70 66 L56 58" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="22" cy="28" r="2.5" fill="#22d3ee" />
            <circle cx="29" cy="28" r="2.5" fill="#22d3ee" />
            <circle cx="36" cy="28" r="2.5" fill="#22d3ee" />
          </svg>
          <p className="text-sm font-medium text-[#f0f2f5] mb-1">还没有公开训练</p>
          <p className="text-xs text-[#6b7280] mb-6">完成训练后设为公开，和大家一起分享进步</p>
          <Link
            href={`/workout/${new Date().toISOString().slice(0, 10)}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-bold hover:bg-[#ea6c0a] transition-colors"
          >
            <Dumbbell size={15} strokeWidth={2.5} />
            开始训练
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
