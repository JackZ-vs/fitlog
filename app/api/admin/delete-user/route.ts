import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getCallerRole(): Promise<"admin" | "user" | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return (data?.role as "admin" | "user") ?? "user";
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const callerRole = await getCallerRole();
  if (callerRole !== "admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "未配置 SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const { userId } = await request.json() as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
