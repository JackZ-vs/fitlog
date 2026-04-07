"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Plus, BarChart2, User, Users } from "lucide-react";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "今日" },
  { href: "/history", icon: History, label: "历史" },
  { href: null, icon: Plus, label: "记录", action: true },
  { href: "/feed", icon: Users, label: "动态" },
  { href: "/stats", icon: BarChart2, label: "统计" },
  { href: "/settings", icon: User, label: "我的" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);
  const onWorkout = pathname.startsWith("/workout");

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#252830] bg-[#111318]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, icon: Icon, label, action }) => {
          if (action) {
            const actionActive = onWorkout;
            return (
              <Link
                key="action"
                href={`/workout/${today}`}
                className="flex flex-col items-center justify-center"
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-full -mt-5 shadow-lg transition-colors ${
                  actionActive
                    ? "bg-[#ea6c0a] shadow-orange-900/60"
                    : "bg-[#f97316] shadow-orange-900/40"
                }`}>
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] mt-0.5 ${actionActive ? "text-[#f97316]" : "text-[#6b7280]"}`}>{label}</span>
              </Link>
            );
          }

          const active =
            href === "/"
              ? pathname === "/" || (onWorkout && false) // "/" only active on exact match
              : href !== null && pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href!}
              className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 pt-1 relative"
            >
              {/* Active indicator bar at top */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
                  active ? "w-6 bg-[#f97316]" : "w-0 bg-transparent"
                }`}
              />
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-[#f97316]" : "text-[#6b7280]"}
              />
              <span className={`text-[10px] ${active ? "text-[#f97316] font-medium" : "text-[#6b7280]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
