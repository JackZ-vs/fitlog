"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Dumbbell, BookOpen, BarChart2,
  Rss, Settings, Zap, User, LogOut, Shield, Salad, History,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "今日概览" },
  { href: "/calendar", icon: CalendarDays, label: "日历" },
  { href: "/history", icon: History, label: "训练历史" },
  { href: "/exercises", icon: BookOpen, label: "动作库" },
  { href: "/foods", icon: Salad, label: "食物库" },
  { href: "/stats", icon: BarChart2, label: "统计" },
  { href: "/feed", icon: Rss, label: "动态" },
  { href: "/settings", icon: Settings, label: "设置" },
];

const ADMIN_ITEM = { href: "/admin/users", icon: Shield, label: "用户管理" };

interface UserInfo { username: string; displayName: string; role: "admin" | "user" }

export default function Sidebar({ user }: { user?: UserInfo | null }) {
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#252830] bg-[#111318] min-h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6 border-b border-[#252830]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f97316]">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight text-[#f0f2f5]">FitLog</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#f97316] text-white"
                  : "text-[#6b7280] hover:text-[#f0f2f5] hover:bg-[#1a1d24]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Quick record */}
      <div className="p-3 border-t border-[#252830] space-y-2">
        <Link
          href={`/workout/${new Date().toISOString().slice(0, 10)}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#f97316]/10 text-[#f97316] text-sm font-semibold hover:bg-[#f97316]/20 transition-colors"
        >
          <Dumbbell size={16} strokeWidth={2.5} />
          开始训练
        </Link>

        {/* User row */}
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#252830] shrink-0">
              <User size={12} className="text-[#6b7280]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#f0f2f5] truncate leading-tight">{user.displayName}</p>
              {isAdmin && (
                <span className="text-[9px] text-[#f97316] font-semibold">管理员</span>
              )}
            </div>
            <LogoutButton />
          </div>
        )}
      </div>
    </aside>
  );
}

function LogoutButton() {
  async function handleLogout() {
    if (typeof window === "undefined") return;
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    window.location.href = "/login";
  }
  return (
    <button
      onClick={handleLogout}
      title="退出登录"
      className="text-[#3f4350] hover:text-red-400 transition-colors"
    >
      <LogOut size={13} />
    </button>
  );
}
