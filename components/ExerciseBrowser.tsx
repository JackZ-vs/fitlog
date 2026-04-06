"use client";

import { useState, useMemo } from "react";
import { Search, X, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";

export interface Exercise {
  id: number;
  name: string;
  nameEn: string;
  type: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: string;
  met: number;
  description: string;
}

const TYPE_COLORS: Record<string, string> = {
  肌肥大: "#f97316",
  有氧: "#22d3ee",
  拉伸: "#4ade80",
  功能性: "#a78bfa",
  康复: "#fb7185",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  初级: "#4ade80",
  中级: "#f97316",
  高级: "#fb7185",
};

const EQUIPMENT_ICONS: Record<string, string> = {
  杠铃: "🏋️",
  哑铃: "💪",
  固定器械: "🔩",
  绳索: "🔗",
  自重: "🤸",
  无器械: "🤸",
  有氧器械: "🚴",
  单杠: "🏅",
  壶铃: "⚖️",
  弹力带: "🎀",
  药球: "🏀",
  跳箱: "📦",
  雪橇: "🛷",
  其他: "⚡",
};

// Group muscles for the filter UI
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

export default function ExerciseBrowser({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const types = useMemo(() => [...new Set(exercises.map((e) => e.type))].sort(), [exercises]);
  const equipments = useMemo(() => [...new Set(exercises.map((e) => e.equipment))].sort(), [exercises]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const q = search.toLowerCase();
      if (q && !ex.name.toLowerCase().includes(q) && !ex.nameEn.toLowerCase().includes(q)) return false;

      if (selectedTypes.length && !selectedTypes.includes(ex.type)) return false;

      if (selectedMuscleGroups.length) {
        const exMuscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
        const matched = selectedMuscleGroups.some((groupLabel) => {
          const group = MUSCLE_GROUPS.find((g) => g.label === groupLabel);
          return group ? group.muscles.some((m) => exMuscles.includes(m)) : false;
        });
        if (!matched) return false;
      }

      if (selectedEquipment.length && !selectedEquipment.includes(ex.equipment)) return false;

      return true;
    });
  }, [exercises, search, selectedTypes, selectedMuscleGroups, selectedEquipment]);

  const toggleType = (t: string) =>
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const toggleMuscleGroup = (g: string) =>
    setSelectedMuscleGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const toggleEquipment = (e: string) =>
    setSelectedEquipment((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  const clearAll = () => {
    setSearch("");
    setSelectedTypes([]);
    setSelectedMuscleGroups([]);
    setSelectedEquipment([]);
  };

  const hasFilters = search || selectedTypes.length || selectedMuscleGroups.length || selectedEquipment.length;

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索动作名称..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111318] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#f0f2f5]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="space-y-3 mb-5">
        {/* Training type */}
        <FilterRow label="训练类型">
          {types.map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={selectedTypes.includes(t)}
              color={TYPE_COLORS[t] ?? "#6b7280"}
              onClick={() => toggleType(t)}
            />
          ))}
        </FilterRow>

        {/* Muscle groups */}
        <FilterRow label="肌肉部位">
          {MUSCLE_GROUPS.map(({ label }) => (
            <FilterChip
              key={label}
              label={label}
              active={selectedMuscleGroups.includes(label)}
              color="#22d3ee"
              onClick={() => toggleMuscleGroup(label)}
            />
          ))}
        </FilterRow>

        {/* Equipment */}
        <FilterRow label="器械">
          {equipments.map((e) => (
            <FilterChip
              key={e}
              label={`${EQUIPMENT_ICONS[e] ?? "⚙️"} ${e}`}
              active={selectedEquipment.includes(e)}
              color="#a78bfa"
              onClick={() => toggleEquipment(e)}
            />
          ))}
        </FilterRow>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[#6b7280]">
          共 <span className="text-[#f0f2f5] font-semibold">{filtered.length}</span> 个动作
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-[#f97316] hover:text-[#ea6c0a] transition-colors"
          >
            <X size={12} />
            清除筛选
          </button>
        )}
      </div>

      {/* Exercise cards */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {filtered.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            expanded={expandedId === ex.id}
            onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-[#6b7280]">
            <Dumbbell size={32} className="mb-3 opacity-30" />
            <p className="text-sm">没有找到匹配的动作</p>
            <button onClick={clearAll} className="mt-2 text-xs text-[#f97316] hover:underline">清除筛选</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-xs text-[#6b7280] pt-1.5 w-14">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label, active, color, onClick,
}: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
      style={
        active
          ? { background: `${color}20`, color, borderColor: `${color}60` }
          : { background: "transparent", color: "#6b7280", borderColor: "#252830" }
      }
    >
      {label}
    </button>
  );
}

function ExerciseCard({
  exercise: ex, expanded, onToggle,
}: {
  exercise: Exercise; expanded: boolean; onToggle: () => void;
}) {
  const typeColor = TYPE_COLORS[ex.type] ?? "#6b7280";
  const diffColor = DIFFICULTY_COLORS[ex.difficulty] ?? "#6b7280";

  return (
    <div
      className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden hover:border-[#353840] transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#f0f2f5] truncate">{ex.name}</h3>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                style={{ background: `${typeColor}18`, color: typeColor }}
              >
                {ex.type}
              </span>
            </div>
            <p className="text-[11px] text-[#6b7280] mt-0.5">{ex.nameEn}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs">{EQUIPMENT_ICONS[ex.equipment] ?? "⚙️"}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: diffColor }}
            >
              {ex.difficulty}
            </span>
          </div>
        </div>

        {/* Primary muscles */}
        <div className="flex flex-wrap gap-1 mt-2">
          {ex.primaryMuscles.map((m) => (
            <span
              key={m}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1a1d24] text-[#94a3b8]"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && ex.description && (
        <div className="px-3.5 pb-3.5 border-t border-[#1a1d24] pt-2.5">
          <p className="text-xs text-[#94a3b8] leading-relaxed">{ex.description}</p>
          {ex.secondaryMuscles.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-[#6b7280]">协同:</span>
              <div className="flex flex-wrap gap-1">
                {ex.secondaryMuscles.map((m) => (
                  <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#252830] text-[#6b7280]">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#3f4350] mt-2">MET值: {ex.met}</p>
        </div>
      )}

      {/* Expand hint */}
      <div className="flex justify-center py-1 border-t border-[#1a1d24]">
        {expanded
          ? <ChevronUp size={12} className="text-[#3f4350]" />
          : <ChevronDown size={12} className="text-[#3f4350]" />}
      </div>
    </div>
  );
}
