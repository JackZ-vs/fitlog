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
  // Verify caller is admin
  const callerRole = await getCallerRole();
  if (callerRole !== "admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "未配置 SUPABASE_SERVICE_ROLE_KEY，请在 .env.local 中添加" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { username, password } = body as { username?: string; password?: string };
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "缺少用户名或密码" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = `${username.trim().toLowerCase()}@fitlog.app`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: username },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: { id: data.user?.id, email } });
}
