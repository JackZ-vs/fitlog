"use client";

import { useState, useMemo } from "react";
import { Search, ArrowDownUp } from "lucide-react";
import foodsData from "@/data/foods.json";

interface FoodItem {
  id: number;
  name: string;
  nameEn: string;
  abbr: string;
  category: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  commonServing: { amount: number; unit: string; description: string };
  source: string;
}

const FOODS = foodsData as FoodItem[];

const CATEGORIES = [
  { label: "全部", value: null },
  { label: "主食/谷物", value: "主食/谷物" },
  { label: "肉类/禽蛋", value: "肉类/禽蛋" },
  { label: "海鲜水产", value: "海鲜水产" },
  { label: "蔬菜", value: "蔬菜" },
  { label: "水果", value: "水果" },
  { label: "豆制品/奶制品", value: "豆制品/奶制品" },
  { label: "坚果零食", value: "坚果零食" },
  { label: "饮品", value: "饮品" },
  { label: "外食/快餐", value: "外食/快餐" },
  { label: "调味/油脂", value: "调味/油脂" },
];

type SortKey = "protein" | "calories" | "carbs" | "fat";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "protein", label: "蛋白质" },
  { key: "calories", label: "热量" },
  { key: "carbs", label: "碳水" },
  { key: "fat", label: "脂肪" },
];

export default function FoodsPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("protein");

  const filtered = useMemo(() => {
    let items = FOODS;
    if (activeCategory) {
      items = items.filter((f) => f.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter((f) => f.name.includes(q) || f.abbr.toLowerCase().startsWith(q));
    }
    return [...items].sort((a, b) => b.per100g[sortBy] - a.per100g[sortBy]);
  }, [query, activeCategory, sortBy]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#f0f2f5]">食物库</h1>
        <p className="text-xs text-[#6b7280] mt-0.5">共 {FOODS.length} 种食物，数据基于每100g</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4350] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索食物名称…"
          className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-[#111318] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveCategory(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === value
                ? "bg-[#f97316] text-white"
                : "bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] border border-[#252830]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort + count */}
      <div className="flex items-center gap-2 mb-4">
        <ArrowDownUp size={13} className="text-[#3f4350] shrink-0" />
        <span className="text-xs text-[#6b7280]">排序</span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                sortBy === key
                  ? "bg-[#252830] text-[#f0f2f5] font-medium"
                  : "text-[#6b7280] hover:text-[#f0f2f5]"
              }`}
            >
              {label}↓
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[#3f4350]">{filtered.length} 项</span>
      </div>

      {/* Food cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6b7280] text-sm">没有找到匹配的食物</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((food) => (
            <FoodCard key={food.id} food={food} highlightKey={sortBy} />
          ))}
        </div>
      )}

      {/* Data source attribution */}
      <div className="mt-8 pt-6 border-t border-[#1a1d24]">
        <p className="text-[10px] text-[#3f4350] text-center leading-relaxed">
          营养数据主要参考{" "}
          <span className="text-[#6b7280]">USDA FoodData Central (fdc.nal.usda.gov)</span>
          {" "}· SR Legacy 数据库（公有领域 CC0）<br />
          日本食品参考{" "}
          <span className="text-[#6b7280]">日本食品標準成分表 八訂（文部科学省）</span>
          {" "}· 中式食品参考{" "}
          <span className="text-[#6b7280]">中国食物成分表第6版</span>
        </p>
      </div>
    </div>
  );
}

function FoodCard({ food, highlightKey }: { food: FoodItem; highlightKey: SortKey }) {
  const { calories, protein, carbs, fat } = food.per100g;
  // Macro energy ratio (protein/carbs = 4kcal/g, fat = 9kcal/g)
  const totalEnergy = protein * 4 + carbs * 4 + fat * 9;
  const proteinPct = totalEnergy > 0 ? (protein * 4 / totalEnergy) * 100 : 0;
  const carbsPct = totalEnergy > 0 ? (carbs * 4 / totalEnergy) * 100 : 0;
  const fatPct = totalEnergy > 0 ? (fat * 9 / totalEnergy) * 100 : 0;

  const macros: { key: SortKey; label: string; value: number; unit: string; color: string }[] = [
    { key: "protein", label: "蛋白", value: protein, unit: "g", color: "#a78bfa" },
    { key: "carbs", label: "碳水", value: carbs, unit: "g", color: "#22d3ee" },
    { key: "fat", label: "脂肪", value: fat, unit: "g", color: "#4ade80" },
  ];

  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 flex flex-col gap-3">
      {/* Name + calories */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#f0f2f5] leading-tight">{food.name}</p>
          <p className="text-[10px] text-[#3f4350] mt-0.5 truncate">{food.nameEn}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-base font-bold ${highlightKey === "calories" ? "text-[#f97316]" : "text-[#f0f2f5]"}`}>
            {calories}
          </span>
          <span className="text-[10px] text-[#3f4350] ml-0.5">kcal</span>
        </div>
      </div>

      {/* Macro chips */}
      <div className="grid grid-cols-3 gap-1">
        {macros.map(({ key, label, value, unit, color }) => (
          <div
            key={key}
            className={`rounded-lg py-1.5 px-2 text-center transition-colors ${
              highlightKey === key ? "bg-[#252830]" : "bg-[#1a1d24]"
            }`}
          >
            <p className="text-xs font-semibold" style={{ color }}>{value}{unit}</p>
            <p className="text-[9px] text-[#3f4350]">{label}</p>
          </div>
        ))}
      </div>

      {/* Macro ratio bar */}
      <div className="h-1.5 rounded-full overflow-hidden flex">
        <div style={{ width: `${proteinPct}%`, background: "#a78bfa" }} />
        <div style={{ width: `${carbsPct}%`, background: "#22d3ee" }} />
        <div style={{ width: `${fatPct}%`, background: "#4ade80" }} />
      </div>

      {/* Common serving */}
      <p className="text-[10px] text-[#3f4350] -mt-1">常用：{food.commonServing.description}</p>
    </div>
  );
}
