"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Copy, Save, Lock, Globe,
  ChevronDown, ChevronUp, Flame, Pencil, Check, X, Utensils, Timer,
} from "lucide-react";
import ExercisePicker from "@/components/ExercisePicker";
import RestTimer from "@/components/RestTimer";
import {
  getWorkout, saveWorkout, newEmptyWorkout,
  getLastWorkoutBefore,
} from "@/lib/workoutStore";
import { estimateCalories, estimateSetCalories, formatPace } from "@/lib/calories";
import { getMyProfile, getAllWorkouts } from "@/lib/db";
import { epley1RM } from "@/lib/utils";
import type { WorkoutRecord, WorkoutExercise, SetData } from "@/lib/types";

const PR_KEYWORDS = ["卧推", "深蹲", "硬拉", "引体", "肩推", "腿举", "划船"];

interface PRResult { name: string; rm: number; prev: number | null }

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

interface Props { date: string }

export default function WorkoutEditor({ date }: Props) {
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutRecord | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [saved, setSaved] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [hasLastWorkout, setHasLastWorkout] = useState(false);
  const [bodyWeightKg, setBodyWeightKg] = useState(70);
  const [showTimer, setShowTimer] = useState(false);
  const [newPRs, setNewPRs] = useState<PRResult[]>([]);

  useEffect(() => {
    getWorkout(date).then((existing) => {
      setWorkout(existing ?? newEmptyWorkout(date));
    });
    getLastWorkoutBefore(date).then((w) => setHasLastWorkout(!!w));
    getMyProfile().then((p) => { if (p?.weightKg) setBodyWeightKg(p.weightKg); });
  }, [date]);

  const calories = workout ? estimateCalories(workout, bodyWeightKg) : 0;

  function updateWorkout(updater: (w: WorkoutRecord) => WorkoutRecord) {
    setWorkout((prev) => prev ? updater(prev) : prev);
    setSaved(false);
  }

  async function handleSave() {
    if (!workout) return;
    void saveWorkout(workout); // saves to localStorage immediately; Supabase async in background
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // PR check: only for exercises matching PR keywords
    const prExercises = workout.exercises.filter((ex) =>
      PR_KEYWORDS.some((kw) => ex.exerciseName.includes(kw))
    );
    if (!prExercises.length) return;

    const allWorkouts = await getAllWorkouts();
    const prs: PRResult[] = [];

    for (const ex of prExercises) {
      const currentRM = ex.sets.reduce((mx, s) => {
        if (!s.weight || !s.reps) return mx;
        return Math.max(mx, epley1RM(s.weight, s.reps));
      }, 0);
      if (currentRM === 0) continue;

      const prevRM = allWorkouts
        .filter((w) => w.date !== date)
        .reduce((mx, w) => {
          const histEx = w.exercises.find((e) => e.exerciseName === ex.exerciseName);
          if (!histEx) return mx;
          return histEx.sets.reduce((mx2, s) => {
            if (!s.weight || !s.reps) return mx2;
            return Math.max(mx2, epley1RM(s.weight, s.reps));
          }, mx);
        }, 0);

      if (currentRM > prevRM) {
        prs.push({
          name: ex.exerciseName,
          rm: Math.round(currentRM * 10) / 10,
          prev: prevRM > 0 ? Math.round(prevRM * 10) / 10 : null,
        });
      }
    }

    if (prs.length > 0) {
      setNewPRs(prs);
      setTimeout(() => setNewPRs([]), 10000);
    }
  }

  async function handleCopyLast() {
    const last = await getLastWorkoutBefore(date);
    if (!last || !workout) return;
    updateWorkout((w) => ({
      ...w,
      name: w.name || last.name,
      exercises: last.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s })),
      })),
    }));
  }

  function addExercises(newExes: WorkoutExercise[]) {
    updateWorkout((w) => ({
      ...w,
      exercises: [...w.exercises, ...newExes],
    }));
  }

  function removeExercise(exIdx: number) {
    updateWorkout((w) => ({
      ...w,
      exercises: w.exercises.filter((_, i) => i !== exIdx),
    }));
  }

  function addSet(exIdx: number) {
    updateWorkout((w) => {
      const exercises = [...w.exercises];
      const ex = exercises[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      exercises[exIdx] = {
        ...ex,
        sets: [...ex.sets, { ...lastSet }],
      };
      return { ...w, exercises };
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    updateWorkout((w) => {
      const exercises = [...w.exercises];
      const ex = exercises[exIdx];
      if (ex.sets.length <= 1) return w;
      exercises[exIdx] = { ...ex, sets: ex.sets.filter((_, i) => i !== setIdx) };
      return { ...w, exercises };
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetData, raw: string) {
    const val = raw === "" ? null : Number(raw);
    updateWorkout((w) => {
      const exercises = w.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const sets = ex.sets.map((s, si) =>
          si === setIdx ? { ...s, [field]: val } : s
        );
        return { ...ex, sets };
      });
      return { ...w, exercises };
    });
  }

  function toggleCollapse(exIdx: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exIdx)) next.delete(exIdx);
      else next.add(exIdx);
      return next;
    });
  }

  if (!workout) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1a1d24] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#1a1d24] animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-48 rounded-lg bg-[#1a1d24] animate-pulse mb-5" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[#111318] border border-[#252830] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // hasLastWorkout is loaded async in useEffect above

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6 pb-24">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1d24] text-[#6b7280]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6b7280]">{formatDate(date)}</p>
        </div>
        {/* Nutrition link */}
        <Link
          href={`/nutrition/${date}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d24] text-[#6b7280] text-xs hover:text-purple-400 hover:bg-[#252830] transition-colors border border-[#252830]"
        >
          <Utensils size={13} />
          今日饮食
        </Link>
        {/* Public toggle */}
        <button
          onClick={() => updateWorkout((w) => ({ ...w, isPublic: !w.isPublic }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            workout.isPublic
              ? "bg-[#22d3ee]/10 text-[#22d3ee]"
              : "bg-[#1a1d24] text-[#6b7280]"
          }`}
        >
          {workout.isPublic ? <Globe size={13} /> : <Lock size={13} />}
          {workout.isPublic ? "公开" : "私密"}
        </button>
      </div>

      {/* Workout name */}
      <div className="mb-5">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateWorkout((w) => ({ ...w, name: tempName }));
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              placeholder="训练名称（如：推日）"
              className="flex-1 text-2xl font-bold bg-transparent text-[#f0f2f5] outline-none border-b border-[#f97316] pb-0.5 placeholder:text-[#3f4350]"
            />
            <button
              onClick={() => {
                updateWorkout((w) => ({ ...w, name: tempName }));
                setEditingName(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f97316] text-white"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1d24] text-[#6b7280]"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setTempName(workout.name); setEditingName(true); }}
            className="flex items-center gap-2 group"
          >
            <h1 className="text-2xl font-bold text-[#f0f2f5]">
              {workout.name || <span className="text-[#3f4350]">未命名训练</span>}
            </h1>
            <Pencil size={14} className="text-[#3f4350] group-hover:text-[#6b7280] transition-colors" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          添加动作
        </button>
        {hasLastWorkout && workout.exercises.length === 0 && (
          <button
            onClick={handleCopyLast}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1d24] text-[#94a3b8] text-sm hover:text-[#f0f2f5] hover:bg-[#252830] transition-colors border border-[#252830]"
          >
            <Copy size={14} />
            复制上次训练
          </button>
        )}
        <button
          onClick={() => setShowTimer((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
            showTimer
              ? "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30"
              : "bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] border-[#252830]"
          }`}
        >
          <Timer size={14} />
          计时器
        </button>
      </div>

      {/* Rest timer */}
      {showTimer && (
        <div className="mb-4">
          <RestTimer onClose={() => setShowTimer(false)} />
        </div>
      )}

      {/* PR banner */}
      {newPRs.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <span className="text-sm font-bold text-amber-400">新个人记录！</span>
            </div>
            <button onClick={() => setNewPRs([])} className="text-[#3f4350] hover:text-[#6b7280]">
              <X size={13} />
            </button>
          </div>
          <div className="space-y-1">
            {newPRs.map((pr) => (
              <div key={pr.name} className="flex items-center gap-2 text-xs">
                <span className="text-[#f0f2f5] font-medium">{pr.name}</span>
                <span className="font-bold text-amber-400">{pr.rm} kg 1RM</span>
                {pr.prev !== null && (
                  <span className="text-[#6b7280]">（超越 {pr.prev} kg）</span>
                )}
                {pr.prev === null && (
                  <span className="text-[#6b7280]">（首次记录）</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercises */}
      {workout.exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b7280] border border-dashed border-[#252830] rounded-xl">
          <p className="text-sm mb-1">还没有添加动作</p>
          <p className="text-xs text-[#3f4350]">点击&ldquo;添加动作&rdquo;开始记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workout.exercises.map((ex, exIdx) => (
            <ExerciseBlock
              key={exIdx}
              exercise={ex}
              exIdx={exIdx}
              collapsed={collapsedIds.has(exIdx)}
              bodyWeightKg={bodyWeightKg}
              onToggleCollapse={() => toggleCollapse(exIdx)}
              onRemove={() => removeExercise(exIdx)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(si) => removeSet(exIdx, si)}
              onUpdateSet={(si, field, val) => updateSet(exIdx, si, field, val)}
            />
          ))}
        </div>
      )}

      {/* Calorie estimate */}
      {workout.exercises.length > 0 && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[#1a1d24] border border-[#252830]">
          <Flame size={16} className="text-[#f97316]" />
          <span className="text-sm text-[#6b7280]">预估热量消耗</span>
          <span className="ml-auto text-base font-bold text-[#f97316]">{calories} kcal</span>
          <span className="text-xs text-[#3f4350]">（体重 70kg）</span>
        </div>
      )}

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-xs text-[#6b7280] mb-2">备注</label>
        <textarea
          value={workout.notes}
          onChange={(e) => updateWorkout((w) => ({ ...w, notes: e.target.value }))}
          placeholder="身体状态、心情、关键进步..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[#111318] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors resize-none"
        />
      </div>

      {/* Save button — sticky on mobile */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 p-4 md:relative md:p-0 md:mt-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-lg ${
              saved
                ? "bg-[#4ade80] text-[#052e16]"
                : "bg-[#f97316] text-white hover:bg-[#ea6c0a]"
            }`}
          >
            {saved ? (
              <><Check size={16} strokeWidth={3} />已保存！</>
            ) : (
              <><Save size={16} />保存训练记录</>
            )}
          </button>
        </div>
      </div>

      {/* Exercise picker */}
      {showPicker && (
        <ExercisePicker onAdd={addExercises} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

/* ── ExerciseBlock ── */
interface ExerciseBlockProps {
  exercise: WorkoutExercise;
  exIdx: number;
  collapsed: boolean;
  bodyWeightKg: number;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onUpdateSet: (setIdx: number, field: keyof SetData, val: string) => void;
}

function ExerciseBlock({
  exercise: ex, collapsed, bodyWeightKg, onToggleCollapse,
  onRemove, onAddSet, onRemoveSet, onUpdateSet,
}: ExerciseBlockProps) {
  const isCardio = ex.type === "有氧";
  // strength: # | weight | reps | kcal | ✕
  // cardio:   # | duration(s) | distance(km) | info
  const gridStrength = "grid-cols-[1.5rem_1fr_1fr_2.5rem_1.5rem]";
  const gridCardio   = "grid-cols-[1.5rem_1fr_1fr_3.5rem]";

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
      {/* Exercise header */}
      <div className="flex items-center gap-3 px-3.5 py-3 border-b border-[#1a1d24]">
        <button onClick={onToggleCollapse} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f2f5] truncate">{ex.exerciseName}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{ex.primaryMuscles.slice(0, 2).join(" · ")}</p>
          </div>
          {collapsed ? (
            <ChevronDown size={14} className="text-[#3f4350] shrink-0 ml-auto" />
          ) : (
            <ChevronUp size={14} className="text-[#3f4350] shrink-0 ml-auto" />
          )}
        </button>
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[#3f4350] hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="p-3.5">
          {/* Column headers */}
          <div className={`grid gap-2 mb-2 text-[10px] text-[#6b7280] font-medium px-1 ${isCardio ? gridCardio : gridStrength}`}>
            <span>#</span>
            {isCardio ? (
              <>
                <span>时长（秒）</span>
                <span>距离（km）</span>
                <span className="text-right">配速/热量</span>
              </>
            ) : (
              <>
                <span>{ex.equipment === "自重" ? "附加重量" : "重量（kg）"}</span>
                <span>次数</span>
                <span className="text-right">kcal</span>
                <span />
              </>
            )}
          </div>

          {/* Sets */}
          <div className="space-y-2">
            {ex.sets.map((set, si) => (
              <SetRow
                key={si}
                setNum={si + 1}
                set={set}
                exercise={ex}
                isCardio={isCardio}
                bodyWeightKg={bodyWeightKg}
                canDelete={ex.sets.length > 1}
                onUpdate={(field, val) => onUpdateSet(si, field, val)}
                onDelete={() => onRemoveSet(si)}
              />
            ))}
          </div>

          {/* Add set */}
          <button
            onClick={onAddSet}
            className="flex items-center gap-1.5 mt-3 w-full py-2 rounded-lg border border-dashed border-[#252830] text-xs text-[#6b7280] hover:text-[#f97316] hover:border-[#f97316]/40 transition-colors justify-center"
          >
            <Plus size={13} />
            添加一组
          </button>
        </div>
      )}
    </div>
  );
}

/* ── SetRow ── */
interface SetRowProps {
  setNum: number;
  set: SetData;
  exercise: WorkoutExercise;
  isCardio: boolean;
  bodyWeightKg: number;
  canDelete: boolean;
  onUpdate: (field: keyof SetData, val: string) => void;
  onDelete: () => void;
}

function SetRow({ setNum, set, exercise, isCardio, bodyWeightKg, canDelete, onUpdate, onDelete }: SetRowProps) {
  const kcal = estimateSetCalories(set, exercise, bodyWeightKg);
  const kcalLabel = kcal >= 0.5 ? `${Math.round(kcal)}` : "";

  // Cardio info: show pace if distance+duration, else kcal
  const pace = isCardio ? formatPace(set.duration ?? 0, set.distanceKm ?? 0) : null;
  const cardioInfo = pace ? `${pace}/km` : kcalLabel ? `${kcalLabel}kcal` : "";

  const gridStrength = "grid-cols-[1.5rem_1fr_1fr_2.5rem_1.5rem]";
  const gridCardio   = "grid-cols-[1.5rem_1fr_1fr_3.5rem]";

  return (
    <div className={`grid gap-2 items-center ${isCardio ? gridCardio : gridStrength}`}>
      <span className="text-xs text-[#6b7280] text-center">{setNum}</span>

      {isCardio ? (
        <>
          <NumInput value={set.duration} placeholder="时长" onChange={(v) => onUpdate("duration", v)} />
          <NumInput value={set.distanceKm ?? null} placeholder="距离" step={0.1} onChange={(v) => onUpdate("distanceKm", v)} />
          <span className="text-[10px] text-[#6b7280] text-right leading-tight">{cardioInfo}</span>
        </>
      ) : (
        <>
          <NumInput value={set.weight} placeholder={exercise.equipment === "自重" ? "+kg" : "重量"} step={2.5} onChange={(v) => onUpdate("weight", v)} />
          <NumInput value={set.reps} placeholder="次数" step={1} onChange={(v) => onUpdate("reps", v)} />
          <span className="text-[10px] text-[#6b7280] text-right leading-tight">{kcalLabel}</span>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className={`flex items-center justify-center h-8 w-6 rounded transition-colors ${
              canDelete ? "text-[#3f4350] hover:text-red-400" : "text-[#1a1d24] cursor-default"
            }`}
          >
            <X size={12} />
          </button>
        </>
      )}
    </div>
  );
}

function NumInput({
  value, placeholder, step, onChange,
}: {
  value: number | null; placeholder: string; step?: number; onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      placeholder={placeholder}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm text-center placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
    />
  );
}
