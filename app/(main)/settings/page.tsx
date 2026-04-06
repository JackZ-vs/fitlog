"use client";

import { useState, useEffect } from "react";
import { Check, Download, Eye, EyeOff, LogOut } from "lucide-react";
import {
  getMyProfile, updateMyProfile,
  getDailyTargets, saveDailyTargets,
  getAllWorkouts, getMealsInRange,
  getWeeklyGoal, setWeeklyGoal,
  getDefaultIsPublic, setDefaultIsPublic,
  isSupabaseConfigured,
} from "@/lib/db";
import type { Profile } from "@/lib/db";
import type { DailyTargets } from "@/lib/types";
import { DEFAULT_TARGETS } from "@/lib/types";

// ── CSV helpers ───────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#111318] border border-[#252830] p-4 mb-4">
      <h2 className="text-sm font-semibold text-[#f0f2f5] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-[#6b7280] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-[#1a1d24] border border-[#252830] text-[#f0f2f5] text-sm placeholder:text-[#3f4350] focus:outline-none focus:border-[#f97316] transition-colors";
const btnCls = "px-4 py-2 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6c0a] disabled:opacity-50 transition-colors";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);
  const [weeklyGoal, setWeeklyGoalState] = useState(4);
  const [defaultPublic, setDefaultPublicState] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getMyProfile().then(setProfile);
    getDailyTargets().then(setTargets);
    setWeeklyGoalState(getWeeklyGoal());
    setDefaultPublicState(getDefaultIsPublic());
  }, []);

  function flash(key: string) {
    setSaved((p) => ({ ...p, [key]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
  }

  // Profile section state
  const [displayName, setDisplayName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setWeightKg(profile.weightKg !== null ? String(profile.weightKg) : "");
    }
  }, [profile]);

  async function saveProfile() {
    await updateMyProfile({
      displayName: displayName.trim() || undefined,
      weightKg: weightKg ? Number(weightKg) : null,
    });
    flash("profile");
  }

  // Targets
  async function saveTargets() {
    await saveDailyTargets(targets);
    flash("targets");
  }

  // Training goal
  function saveTrainingGoal() {
    setWeeklyGoal(weeklyGoal);
    flash("goal");
  }

  // Privacy
  function savePrivacy() {
    setDefaultIsPublic(defaultPublic);
    flash("privacy");
  }

  // Export workouts CSV
  async function exportWorkouts() {
    const workouts = await getAllWorkouts();
    const rows: string[][] = [["日期", "训练名称", "动作", "组数", "重量(kg)", "次数", "时长(s)"]];
    for (const w of workouts) {
      for (const ex of w.exercises) {
        ex.sets.forEach((s, i) => {
          rows.push([w.date, w.name, ex.exerciseName, String(i + 1), String(s.weight ?? ""), String(s.reps ?? ""), String(s.duration ?? "")]);
        });
      }
    }
    downloadCSV("fitlog_workouts.csv", rows);
  }

  // Export meals CSV
  async function exportMeals() {
    const today = new Date().toISOString().slice(0, 10);
    const past = new Date(); past.setFullYear(past.getFullYear() - 2);
    const meals = await getMealsInRange(past.toISOString().slice(0, 10), today);
    const rows: string[][] = [["日期", "餐次", "食物名称", "分量(g)", "热量(kcal)", "蛋白质(g)", "碳水(g)", "脂肪(g)"]];
    for (const m of meals) {
      rows.push([m.date, m.mealType, m.foodName, String(m.amountG ?? ""), String(m.calories ?? ""), String(m.protein ?? ""), String(m.carbs ?? ""), String(m.fat ?? "")]);
    }
    downloadCSV("fitlog_meals.csv", rows);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-20">
      <h1 className="text-2xl font-bold text-[#f0f2f5] mb-6">设置</h1>

      {/* ── 个人资料 ── */}
      <Section title="个人资料">
        <Field label="用户名">
          <input className={inputCls} value={profile?.username ?? "—"} disabled />
        </Field>
        <Field label="显示名">
          <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="你的显示名" />
        </Field>
        <Field label="体重 (kg)">
          <input type="number" inputMode="decimal" className={inputCls} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="用于热量计算" min={30} max={300} step={0.1} />
        </Field>
        <SaveButton onClick={saveProfile} saved={!!saved.profile} disabled={!isSupabaseConfigured} tooltip={!isSupabaseConfigured ? "需要连接 Supabase" : undefined} />
      </Section>

      {/* ── 每日营养目标 ── */}
      <Section title="每日营养目标">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
            <Field key={key} label={{ calories: "热量 (kcal)", protein: "蛋白质 (g)", carbs: "碳水 (g)", fat: "脂肪 (g)" }[key]}>
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={targets[key]}
                onChange={(e) => setTargets((t) => ({ ...t, [key]: Number(e.target.value) }))}
                min={0}
              />
            </Field>
          ))}
        </div>
        <SaveButton onClick={saveTargets} saved={!!saved.targets} />
      </Section>

      {/* ── 训练目标 ── */}
      <Section title="训练目标">
        <Field label="每周目标训练次数">
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoalState(Number(e.target.value))}
              min={1} max={14}
            />
            <span className="text-sm text-[#6b7280] shrink-0">次 / 周</span>
          </div>
        </Field>
        <SaveButton onClick={saveTrainingGoal} saved={!!saved.goal} />
      </Section>

      {/* ── 数据隐私 ── */}
      <Section title="数据隐私">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm text-[#f0f2f5]">新训练默认公开</p>
            <p className="text-xs text-[#6b7280] mt-0.5">公开训练将出现在动态流中</p>
          </div>
          <button
            onClick={() => setDefaultPublicState((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${defaultPublic ? "bg-[#f97316]" : "bg-[#252830]"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${defaultPublic ? "left-6" : "left-1"}`} />
          </button>
        </div>
        <div className="mt-3">
          <SaveButton onClick={savePrivacy} saved={!!saved.privacy} />
        </div>
      </Section>

      {/* ── 数据导出 ── */}
      <Section title="数据导出">
        <div className="flex flex-col gap-2">
          <button
            onClick={exportWorkouts}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#252830] text-sm text-[#f0f2f5] hover:bg-[#1a1d24] transition-colors"
          >
            <Download size={14} className="text-[#6b7280]" />
            导出训练记录 CSV
          </button>
          <button
            onClick={exportMeals}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#252830] text-sm text-[#f0f2f5] hover:bg-[#1a1d24] transition-colors"
          >
            <Download size={14} className="text-[#6b7280]" />
            导出饮食记录 CSV
          </button>
        </div>
      </Section>

      {/* ── 修改密码 ── */}
      {isSupabaseConfigured && <ChangePasswordSection />}

      {/* ── 退出登录 ── */}
      <div className="mt-4">
        <button
          onClick={async () => {
            if (typeof window === "undefined") return;
            const { createClient } = await import("@/lib/supabase/client");
            await createClient().auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={15} />
          退出登录
        </button>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function SaveButton({
  onClick, saved, disabled, tooltip,
}: {
  onClick: () => void; saved: boolean; disabled?: boolean; tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${btnCls} flex items-center gap-1.5 ${saved ? "bg-[#4ade80] hover:bg-[#4ade80]" : ""}`}
    >
      {saved ? <><Check size={14} strokeWidth={3} />已保存</> : "保存"}
    </button>
  );
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!next || next.length < 6) { setStatus("err"); setErrMsg("新密码至少6位"); return; }
    setStatus("saving");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      // Verify current password by re-authenticating
      const { data: { user } } = await sb.auth.getUser();
      if (user?.email) {
        const { error: signInErr } = await sb.auth.signInWithPassword({ email: user.email, password: current });
        if (signInErr) { setStatus("err"); setErrMsg("当前密码不正确"); return; }
      }
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) { setStatus("err"); setErrMsg(error.message); return; }
      setStatus("ok");
      setCurrent(""); setNext("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("err"); setErrMsg("修改失败，请重试");
    }
  }

  return (
    <Section title="修改密码">
      <form onSubmit={handleChange} className="space-y-3">
        <Field label="当前密码">
          <div className="relative">
            <input type={show ? "text" : "password"} className={inputCls + " pr-10"} value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
        <Field label="新密码">
          <input type={show ? "text" : "password"} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} placeholder="至少6位" />
        </Field>
        {status === "err" && <p className="text-xs text-red-400">{errMsg}</p>}
        {status === "ok" && <p className="text-xs text-green-400">密码修改成功</p>}
        <button type="submit" disabled={status === "saving"} className={btnCls}>
          {status === "saving" ? "修改中…" : "修改密码"}
        </button>
      </form>
    </Section>
  );
}
