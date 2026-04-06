"use client";

import { useState, useMemo } from "react";
import { X, Search, Check, Plus } from "lucide-react";
import exercisesData from "@/data/exercises.json";
import type { Exercise } from "@/components/ExerciseBrowser";
import type { WorkoutExercise } from "@/lib/types";

const exercises = exercisesData as Exercise[];

const TYPE_COLORS: Record<string, string> = {
  肌肥大: "#f97316",
  有氧: "#22d3ee",
  拉伸: "#4ade80",
  功能性: "#a78bfa",
  康复: "#fb7185",
};

const MUSCLE_GROUPS = [
  { label: "胸", muscles: ["胸", "胸(上部)", "胸(下部)"] },
  { label: "背", muscles: ["背", "背(中部)", "背阔肌", "上背", "下背", "斜方肌", "斜方肌(上)", "斜方肌(中)"] },
  { label: "腿", muscles: ["股四", "腿", "腿后侧", "小腿", "小腿(腓肠肌)", "小腿(比目鱼肌)", "内收肌"] },
  { label: "肩", muscles: ["肩", "肩中束", "肩前束", "肩后束", "后肩"] },
  { label: "臂", muscles: ["臂", "二头", "二头(长头)", "三头", "三头(长头)", "前臂", "前臂(屈肌)", "前臂(伸肌)", "肱桡肌"] },
  { label: "核心", muscles: ["核心", "核心(上腹)", "核心(下腹)", "腹直肌", "腹横肌", "腹斜肌", "腹部", "多裂肌"] },
  { label: "臀", muscles: ["臀", "臀(中)", "臀(小)", "梨状肌", "盆底肌", "髋屈肌"] },
  { label: "全身", muscles: ["全身", "心肺"] },
];

interface ExercisePickerProps {
  onAdd: (exercises: WorkoutExercise[]) => void;
  onClose: () => void;
}

export default function ExercisePicker({ onAdd, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const types = useMemo(() => [...new Set(exercises.map((e) => e.type))].sort(), []);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (search) {
        const q = search.toLowerCase();
        if (!ex.name.toLowerCase().includes(q) && !ex.nameEn.toLowerCase().includes(q)) return false;
      }
      if (selectedType && ex.type !== selectedType) return false;
      if (selectedMuscle) {
        const group = MUSCLE_GROUPS.find((g) => g.label === selectedMuscle);
        if (group) {
          const allMuscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
          if (!group.muscles.some((m) => allMuscles.includes(m))) return false;
        }
      }
      return true;
    });
  }, [search, selectedType, selectedMuscle]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const toAdd: WorkoutExercise[] = exercises
      .filter((e) => selected.has(e.id))
      .map((e) => ({
        exerciseId: e.id,
        exerciseName: e.name,
        primaryMuscles: e.primaryMuscles,
        type: e.type,
        met: e.met,
        sets: [{ weight: null, reps: null, duration: null }],
      }));
    onAdd(toAdd);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet / modal */}
      <div className="w-full max-w-lg md:rounded-2xl rounded-t-2xl bg-[#111318] border border-[#252830] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#252830] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#f0f2f5]">选择动作</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">已选 {selected.size} 个</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-sm font-semibold"
              >
                <Plus size={14} strokeWidth={2.5} />
                添加 {selected.size} 个
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1d24] text-[#6b7280]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索动作名称或英文…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>
        </div>

        {/* Filter: type */}
        <div className="px-4 pt-2 pb-1 shrink-0">
          <p className="text-[10px] text-[#3f4350] mb-1.5 font-medium uppercase tracking-wide">类型</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <FilterTab label="全部" active={!selectedType} onClick={() => setSelectedType(null)} />
            {types.map((t) => (
              <FilterTab
                key={t}
                label={t}
                active={selectedType === t}
                color={TYPE_COLORS[t]}
                onClick={() => setSelectedType(selectedType === t ? null : t)}
              />
            ))}
          </div>
        </div>

        {/* Filter: muscle group */}
        <div className="px-4 pt-1 pb-2.5 shrink-0">
          <p className="text-[10px] text-[#3f4350] mb-1.5 font-medium uppercase tracking-wide">部位</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <FilterTab label="所有" active={!selectedMuscle} onClick={() => setSelectedMuscle(null)} />
            {MUSCLE_GROUPS.map(({ label }) => (
              <FilterTab
                key={label}
                label={label}
                active={selectedMuscle === label}
                onClick={() => setSelectedMuscle(selectedMuscle === label ? null : label)}
              />
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1.5">
          <p className="text-xs text-[#6b7280] py-1">{filtered.length} 个动作</p>
          {filtered.map((ex) => {
            const isSelected = selected.has(ex.id);
            const typeColor = TYPE_COLORS[ex.type] ?? "#6b7280";
            return (
              <button
                key={ex.id}
                onClick={() => toggle(ex.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors border ${
                  isSelected
                    ? "bg-[#f97316]/10 border-[#f97316]/40"
                    : "bg-[#1a1d24] border-transparent hover:border-[#252830]"
                }`}
              >
                {/* Select indicator */}
                <div
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isSelected
                      ? "bg-[#f97316] border-[#f97316]"
                      : "border-[#3f4350]"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#f0f2f5] truncate">{ex.name}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${typeColor}18`, color: typeColor }}
                    >
                      {ex.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.primaryMuscles.slice(0, 3).map((m) => (
                      <span key={m} className="text-[10px] text-[#6b7280]">{m}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  label, active, color, onClick,
}: {
  label: string; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
      style={
        active && color
          ? { background: `${color}18`, color, borderColor: `${color}50` }
          : active
          ? { background: "#f97316", color: "#fff", borderColor: "#f97316" }
          : { background: "transparent", color: "#6b7280", borderColor: "#252830" }
      }
    >
      {label}
    </button>
  );
}
