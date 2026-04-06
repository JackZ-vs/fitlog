import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/db";
import AdminUsersClient from "./AdminUsersClient";

async function getAdminUser() {
  if (!isSupabaseConfigured) return { role: "admin" as const, displayName: "开发模式" };
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    return profile ? { role: profile.role as "admin" | "user", displayName: profile.display_name ?? "" } : null;
  } catch {
    return null;
  }
}

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser();
  if (!adminUser || adminUser.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-[#080b0f]">
      {/* Inline minimal nav since this is outside (main) group */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#252830] bg-[#111318] min-h-screen sticky top-0">
        <div className="flex items-center gap-2.5 px-5 py-6 border-b border-[#252830]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f97316]">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="text-lg font-bold text-[#f0f2f5]">FitLog</span>
        </div>
        <nav className="p-3 flex-1">
          {[
            { href: "/", label: "今日概览" },
            { href: "/stats", label: "统计" },
            { href: "/settings", label: "设置" },
            { href: "/admin/users", label: "用户管理", active: true },
          ].map(({ href, label, active }) => (
            <a
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                active ? "bg-[#f97316] text-white" : "text-[#6b7280] hover:text-[#f0f2f5] hover:bg-[#1a1d24]"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-[#252830]">
          <p className="text-xs text-[#6b7280] px-2">{adminUser.displayName}</p>
          <span className="text-[10px] text-[#f97316] px-2 font-semibold">管理员</span>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <AdminUsersClient />
      </main>
    </div>
  );
}
