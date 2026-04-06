import { BookOpen, Plus } from "lucide-react";
import { getExercises } from "@/lib/db";
import ExerciseBrowser from "@/components/ExerciseBrowser";
import type { Exercise } from "@/components/ExerciseBrowser";

export default async function ExercisesPage() {
  const exercises = (await getExercises()) as unknown as Exercise[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BookOpen size={18} className="text-[#f97316]" />
            <h1 className="text-xl font-bold text-[#f0f2f5]">动作库</h1>
          </div>
          <p className="text-xs text-[#6b7280]">共 {exercises.length} 个动作，支持多维度筛选</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f97316]/10 text-[#f97316] text-sm font-medium hover:bg-[#f97316]/20 transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          新增
        </button>
      </div>

      <ExerciseBrowser exercises={exercises} />

      {/* Data source attribution */}
      <div className="mt-8 pt-6 border-t border-[#1a1d24]">
        <p className="text-[10px] text-[#3f4350] text-center leading-relaxed">
          动作参考{" "}
          <span className="text-[#6b7280]">ACSM Guidelines for Exercise Testing and Prescription</span>
          {" "}·{" "}
          <span className="text-[#6b7280]">ExRx.net</span>
          {" "}·{" "}
          <span className="text-[#6b7280]">NSCA Essentials of Strength Training</span>
        </p>
      </div>
    </div>
  );
}
