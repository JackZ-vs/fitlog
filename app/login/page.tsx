"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Eye, EyeOff, AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/db";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured) {
      // Dev / mock mode — skip auth
      await new Promise((r) => setTimeout(r, 400));
      router.push(next);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = `${username.trim().toLowerCase()}@fitlog.app`;
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("用户名或密码错误，请重试");
      } else {
        router.push(next);
        router.refresh();
      }
    } catch {
      setError("登录失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#080b0f]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#f97316]">
            <Zap size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold text-[#f0f2f5]">FitLog</span>
        </div>

        <div className="rounded-2xl bg-[#111318] border border-[#252830] p-6">
          <h1 className="text-lg font-semibold text-[#f0f2f5] mb-1">欢迎回来</h1>
          <p className="text-xs text-[#6b7280] mb-6">
            {isSupabaseConfigured ? "用你的账号登录继续记录" : "开发模式 — 直接点击登录"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                autoComplete="username"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#f0f2f5]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#6b7280] mt-4">
          账号由管理员创建，如需开通请联系管理员
        </p>
      </div>
    </div>
  );
}
