import { CalendarDays } from "lucide-react";
import CalendarView from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays size={18} className="text-[#f97316]" />
        <h1 className="text-xl font-bold text-[#f0f2f5]">训练日历</h1>
      </div>
      <CalendarView />
    </div>
  );
}
