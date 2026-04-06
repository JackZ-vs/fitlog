import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { isSupabaseConfigured } from "@/lib/db";

interface UserInfo {
  username: string;
  displayName: string;
  role: "admin" | "user";
}

async function getCurrentUser(): Promise<UserInfo | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, role")
      .eq("id", user.id)
      .single();

    const username = profile?.username ?? user.email?.split("@")[0] ?? "用户";
    return {
      username,
      displayName: profile?.display_name ?? username,
      role: (profile?.role as "admin" | "user") ?? "user",
    };
  } catch {
    return null;
  }
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
