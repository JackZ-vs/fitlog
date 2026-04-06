"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check, User } from "lucide-react";
import { getAllProfiles } from "@/lib/db";
import type { Profile } from "@/lib/db";

export default function AdminUsersClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadProfiles() {
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  }

  useEffect(() => { loadProfiles(); }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#f0f2f5]">用户管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          创建新用户
        </button>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-[#111318] border border-[#252830] animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-[#6b7280] text-sm">暂无用户数据</div>
      ) : (
        <div className="rounded-xl bg-[#111318] border border-[#252830] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_80px_120px] gap-3 px-4 py-2.5 border-b border-[#252830] text-[10px] font-semibold text-[#6b7280] uppercase">
            <span>用户名 / 显示名</span>
            <span>创建时间</span>
            <span>角色</span>
            <span>操作</span>
          </div>
          {/* Rows */}
          {profiles.map((p) => (
            <UserRow key={p.id} profile={p} onRefresh={loadProfiles} />
          ))}
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadProfiles(); }} />
      )}
    </div>
  );
}

function UserRow({ profile, onRefresh }: { profile: Profile; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleRoleToggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, role: profile.role === "admin" ? "user" : "admin" }),
      });
      if (res.ok) onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_80px_120px] gap-3 px-4 py-3 border-b border-[#1a1d24] last:border-0 items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#252830] flex items-center justify-center shrink-0">
            <User size={11} className="text-[#6b7280]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#f0f2f5] truncate">{profile.username}</p>
            {profile.displayName !== profile.username && (
              <p className="text-[10px] text-[#6b7280] truncate">{profile.displayName}</p>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs text-[#6b7280]">
        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("zh-CN") : "—"}
      </span>
      <span className={`text-xs font-medium ${profile.role === "admin" ? "text-[#f97316]" : "text-[#6b7280]"}`}>
        {profile.role === "admin" ? "管理员" : "用户"}
      </span>
      <button
        onClick={handleRoleToggle}
        disabled={busy}
        className="text-xs text-[#6b7280] hover:text-[#f0f2f5] border border-[#252830] rounded-lg px-2 py-1 hover:bg-[#1a1d24] transition-colors disabled:opacity-50"
      >
        {profile.role === "admin" ? "降级为用户" : "提升为管理员"}
      </button>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("err"); setErrMsg(data.error ?? "创建失败"); return; }
      setStatus("ok");
      setTimeout(onCreated, 800);
    } catch {
      setStatus("err"); setErrMsg("网络错误，请重试");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#111318] border border-[#252830] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#f0f2f5]">创建新用户</h2>
          <button onClick={onClose} className="text-[#3f4350] hover:text-[#6b7280]"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5">用户名</label>
            <div className="flex items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                placeholder="只允许字母数字下划线"
                required
                className="flex-1 px-3 py-2.5 rounded-l-lg bg-[#1a1d24] border border-r-0 border-[#252830] text-[#f0f2f5] text-sm focus:outline-none focus:border-[#f97316] transition-colors"
              />
              <span className="px-3 py-2.5 rounded-r-lg bg-[#252830] border border-[#252830] text-xs text-[#6b7280] whitespace-nowrap">@fitlog.app</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5">初始密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少8位"
              required
              minLength={8}
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>
          {status === "err" && <p className="text-xs text-red-400">{errMsg}</p>}
          {status === "ok" && (
            <p className="text-xs text-green-400 flex items-center gap-1"><Check size={12} /> 用户创建成功</p>
          )}
          <button
            type="submit"
            disabled={status === "loading" || status === "ok"}
            className="w-full py-2.5 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] disabled:opacity-60 transition-colors"
          >
            {status === "loading" ? "创建中…" : "创建用户"}
          </button>
        </form>
        <p className="text-[10px] text-[#3f4350] mt-3">
          需要在 .env.local 中配置 SUPABASE_SERVICE_ROLE_KEY 才能创建用户
        </p>
      </div>
    </div>
  );
}
