import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getCallerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getCallerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "admin") return NextResponse.json({ error: "权限不足" }, { status: 403 });

    const { userId, role } = await request.json() as { userId: string; role: "admin" | "user" };
    if (!userId || !["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
