"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, Check, X, Utensils, Dumbbell, Search,
} from "lucide-react";
import Link from "next/link";
import {
  getMealsByDate, saveMeal, deleteMeal, getDailyTargets,
} from "@/lib/db";
import type { MealEntry, DailyTargets } from "@/lib/types";
import foodsData from "@/data/foods.json";

interface FoodItem {
  id: number;
  name: string;
  abbr: string;
  category: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  commonServing: { amount: number; unit: string; description: string };
}

const FOODS = foodsData as FoodItem[];

function matchFood(food: FoodItem, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  if (food.name.includes(q)) return true;
  if (food.abbr.toLowerCase().startsWith(q)) return true;
  return false;
}

const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐"] as const;
type MealType = typeof MEAL_TYPES[number];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

interface Props { date: string }

export default function NutritionEditor({ date }: Props) {
  const router = useRouter();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targets, setTargets] = useState<DailyTargets>({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [collapsed, setCollapsed] = useState<Set<MealType>>(new Set());
  const [adding, setAdding] = useState<MealType | null>(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    setPageReady(false);
    Promise.all([getMealsByDate(date), getDailyTargets()]).then(([ms, t]) => {
      setMeals(ms);
      setTargets(t);
      setPageReady(true);
    });
  }, [date]);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  // Totals
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + (m.protein ?? 0),
      carbs: acc.carbs + (m.carbs ?? 0),
      fat: acc.fat + (m.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function toggleSection(type: MealType) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleAdd(entry: Omit<MealEntry, "id">) {
    const meal: MealEntry = { ...entry, id: crypto.randomUUID() };
    setMeals((prev) => [...prev, meal]);
    setAdding(null);
    await saveMeal(meal);
  }

  async function handleDelete(id: string) {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    await deleteMeal(id);
  }

  if (!pageReady) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="h-8 w-40 rounded-lg bg-[#1a1d24] animate-pulse mb-5" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#111318] border border-[#252830] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6 pb-64">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1d24] text-[#6b7280]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6b7280]">{formatDate(date)}</p>
          <h1 className="text-xl font-bold text-[#f0f2f5] leading-tight">饮食记录</h1>
        </div>
        <Link
          href={`/workout/${date}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d24] text-[#6b7280] text-xs hover:text-[#f0f2f5] hover:bg-[#252830] transition-colors border border-[#252830]"
        >
          <Dumbbell size={13} />
          训练记录
        </Link>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-5 px-1">
        <button
          onClick={() => router.push(`/nutrition/${shiftDate(date, -1)}`)}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#f0f2f5] transition-colors py-1"
        >
          <ArrowLeft size={14} /> 前一天
        </button>
        {!isToday && (
          <button
            onClick={() => router.push(`/nutrition/${today}`)}
            className="text-xs text-[#f97316] hover:underline"
          >
            今天
          </button>
        )}
        <button
          onClick={() => router.push(`/nutrition/${shiftDate(date, 1)}`)}
          disabled={date >= today}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#f0f2f5] disabled:opacity-30 disabled:cursor-default transition-colors py-1"
        >
          后一天 <ArrowLeft size={14} className="rotate-180" />
        </button>
      </div>

      {/* Meal sections */}
      <div className="space-y-3">
        {MEAL_TYPES.map((type) => {
          const typeMeals = meals.filter((m) => m.mealType === type);
          const typeCal = typeMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
          const isCollapsed = collapsed.has(type);
          const isAddingThis = adding === type;

          return (
            <div key={type} className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1d24] transition-colors"
              >
                <Utensils size={15} className="text-purple-400 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-[#f0f2f5] text-left">{type}</span>
                {typeCal > 0 && (
                  <span className="text-xs text-[#6b7280] mr-2">{Math.round(typeCal)} kcal</span>
                )}
                {isCollapsed ? (
                  <ChevronDown size={15} className="text-[#3f4350] shrink-0" />
                ) : (
                  <ChevronUp size={15} className="text-[#3f4350] shrink-0" />
                )}
              </button>

              {!isCollapsed && (
                <div className="border-t border-[#1a1d24]">
                  {/* Food rows */}
                  {typeMeals.length > 0 && (
                    <div className="divide-y divide-[#1a1d24]">
                      {typeMeals.map((m) => (
                        <FoodRow key={m.id} meal={m} onDelete={() => handleDelete(m.id)} />
                      ))}
                    </div>
                  )}

                  {/* Add form */}
                  {isAddingThis ? (
                    <AddFoodForm
                      mealType={type}
                      date={date}
                      onConfirm={handleAdd}
                      onCancel={() => setAdding(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAdding(type)}
                      className="flex items-center gap-2 w-full px-4 py-3 text-xs text-[#6b7280] hover:text-[#f97316] hover:bg-[#1a1d24] transition-colors"
                    >
                      <Plus size={14} />
                      添加食物
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily summary — sticky bottom */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pb-3 pointer-events-auto">
          <div className="rounded-xl bg-[#111318]/96 backdrop-blur border border-[#252830] shadow-2xl">
            {/* Header row — always visible */}
            <button
              onClick={() => setSummaryCollapsed((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-3"
            >
              <h3 className="text-sm font-semibold text-[#f0f2f5]">今日汇总</h3>
              <span className="text-xs text-[#f97316] font-semibold">{Math.round(totals.calories)} kcal</span>
              <span className="text-xs text-[#3f4350]">/ {targets.calories}</span>
              <span className="ml-auto text-xs text-[#6b7280]">{meals.length} 条</span>
              {summaryCollapsed ? (
                <ChevronUp size={14} className="text-[#3f4350] shrink-0" />
              ) : (
                <ChevronDown size={14} className="text-[#3f4350] shrink-0" />
              )}
            </button>
            {/* Expandable macro bars */}
            {!summaryCollapsed && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-[#1a1d24]">
                <div className="pt-3 space-y-2.5">
                  <MacroBar label="热量" value={totals.calories} target={targets.calories} unit="kcal" color="#f97316" />
                  <MacroBar label="蛋白质" value={totals.protein} target={targets.protein} unit="g" color="#a78bfa" />
                  <MacroBar label="碳水" value={totals.carbs} target={targets.carbs} unit="g" color="#22d3ee" />
                  <MacroBar label="脂肪" value={totals.fat} target={targets.fat} unit="g" color="#4ade80" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FoodRow ── */
function FoodRow({ meal, onDelete }: { meal: MealEntry; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#f0f2f5] font-medium truncate">{meal.foodName}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {meal.amountG != null && (
            <span className="text-xs text-[#6b7280]">{meal.amountG}g</span>
          )}
          {meal.calories != null && (
            <span className="text-xs text-[#f97316]">{meal.calories} kcal</span>
          )}
          {meal.protein != null && (
            <span className="text-xs text-[#a78bfa]">蛋白 {meal.protein}g</span>
          )}
          {meal.carbs != null && (
            <span className="text-xs text-[#22d3ee]">碳水 {meal.carbs}g</span>
          )}
          {meal.fat != null && (
            <span className="text-xs text-[#4ade80]">脂肪 {meal.fat}g</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[#3f4350] hover:text-red-400 transition-colors shrink-0 mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ── AddFoodForm ── */
interface AddFoodFormProps {
  mealType: MealType;
  date: string;
  onConfirm: (entry: Omit<MealEntry, "id">) => void;
  onCancel: () => void;
}

function calcMacros(food: FoodItem, amount: number) {
  const r = amount / 100;
  return {
    calories: String(Math.round(food.per100g.calories * r * 10) / 10),
    protein: String(Math.round(food.per100g.protein * r * 10) / 10),
    carbs: String(Math.round(food.per100g.carbs * r * 10) / 10),
    fat: String(Math.round(food.per100g.fat * r * 10) / 10),
  };
}

function AddFoodForm({ mealType, date, onConfirm, onCancel }: AddFoodFormProps) {
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amountG, setAmountG] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? FOODS.filter((f) => matchFood(f, query)).slice(0, 8)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Recalculate macros when amount changes (if a food is selected)
  useEffect(() => {
    if (selectedFood && amountG) {
      const m = calcMacros(selectedFood, Number(amountG));
      setCalories(m.calories);
      setProtein(m.protein);
      setCarbs(m.carbs);
      setFat(m.fat);
    }
  }, [amountG, selectedFood]);

  function handleSelectFood(food: FoodItem) {
    setSelectedFood(food);
    setQuery(food.name);
    setShowDropdown(false);
    const amt = String(food.commonServing.amount);
    setAmountG(amt);
    const m = calcMacros(food, food.commonServing.amount);
    setCalories(m.calories);
    setProtein(m.protein);
    setCarbs(m.carbs);
    setFat(m.fat);
  }

  function handleQueryChange(v: string) {
    setQuery(v);
    setSelectedFood(null); // manual mode — clear selection
    setShowDropdown(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onConfirm({
      date,
      mealType,
      foodName: query.trim(),
      amountG: amountG ? Number(amountG) : null,
      calories: calories ? Number(calories) : null,
      protein: protein ? Number(protein) : null,
      carbs: carbs ? Number(carbs) : null,
      fat: fat ? Number(fat) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 space-y-2.5 bg-[#1a1d24]">
      {/* Food search combobox */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4350] pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && setShowDropdown(true)}
            placeholder="搜索食物或手动输入名称…"
            required
            className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-[#111318] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
          />
          {selectedFood && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#f97316] bg-[#f97316]/10 px-1.5 py-0.5 rounded">
              {selectedFood.category}
            </span>
          )}
        </div>
        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg bg-[#111318] border border-[#252830] shadow-xl max-h-[300px] overflow-y-auto">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectFood(food); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1d24] text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#f0f2f5]">{food.name}</span>
                    <span className="ml-2 text-[10px] text-[#3f4350]">{food.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-[#f97316]">{food.per100g.calories}</span>
                    <span className="text-[10px] text-[#3f4350]"> kcal/100g</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hint about selected serving */}
      {selectedFood && (
        <p className="text-[10px] text-[#6b7280] -mt-1 px-0.5">
          常用份量：{selectedFood.commonServing.description}
        </p>
      )}

      {/* Amount + Calories */}
      <div className="grid grid-cols-2 gap-2">
        <NumField label={`分量(${selectedFood?.commonServing.unit ?? "g"})`} value={amountG} onChange={setAmountG} />
        <NumField label="热量(kcal)" value={calories} onChange={(v) => { setCalories(v); if (selectedFood) setSelectedFood(null); }} />
      </div>
      {/* Macros */}
      <div className="grid grid-cols-3 gap-2">
        <NumField label="蛋白质(g)" value={protein} onChange={(v) => { setProtein(v); if (selectedFood) setSelectedFood(null); }} />
        <NumField label="碳水(g)" value={carbs} onChange={(v) => { setCarbs(v); if (selectedFood) setSelectedFood(null); }} />
        <NumField label="脂肪(g)" value={fat} onChange={(v) => { setFat(v); if (selectedFood) setSelectedFood(null); }} />
      </div>
      {/* Buttons */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] transition-colors"
        >
          <Check size={14} strokeWidth={2.5} /> 确认
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#252830] text-[#6b7280] text-sm hover:text-[#f0f2f5] transition-colors"
        >
          <X size={14} /> 取消
        </button>
      </div>
    </form>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-[#6b7280] mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-full px-2 py-2 rounded-lg bg-[#111318] border border-[#252830] text-[#f0f2f5] text-sm text-center placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
      />
    </div>
  );
}

/* ── MacroBar ── */
function MacroBar({
  label, value, target, unit, color,
}: {
  label: string; value: number; target: number; unit: string; color: string;
}) {
  const pct = Math.round((value / target) * 100);
  const over = pct > 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#6b7280]">{label}</span>
        <span className="text-xs">
          <span className="text-[#f0f2f5]">{Math.round(value)}</span>
          <span className="text-[#3f4350]"> / {target} {unit}</span>
          <span className="ml-1.5 font-semibold" style={{ color: over ? "#f87171" : color }}>
            {pct}%
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#252830] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: over ? "#f87171" : color }}
        />
      </div>
    </div>
  );
}
