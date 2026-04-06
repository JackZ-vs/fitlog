"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Plus, BarChart2, User } from "lucide-react";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "今日" },
  { href: "/calendar", icon: CalendarDays, label: "日历" },
  { href: null, icon: Plus, label: "记录", action: true },
  { href: "/stats", icon: BarChart2, label: "统计" },
  { href: "/settings", icon: User, label: "我的" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#252830] bg-[#111318]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, icon: Icon, label, action }) => {
          if (action) {
            return (
              <Link
                key="action"
                href={`/workout/${today}`}
                className="flex flex-col items-center justify-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#f97316] shadow-lg shadow-orange-900/40 -mt-5">
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-[#6b7280] mt-0.5">{label}</span>
              </Link>
            );
          }
          const active = pathname === href || (href !== "/" && href && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href!}
              className="flex flex-col items-center justify-center gap-1 min-w-0 flex-1"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-[#f97316]" : "text-[#6b7280]"}
              />
              <span className={`text-[10px] ${active ? "text-[#f97316]" : "text-[#6b7280]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
