import type { Profile } from "./db";
import { hasTargetsBeenSaved } from "./db";
import type { DailyTargets } from "./types";

export interface OnboardingTip {
  id: string;
  message: string;
  action: string;
  href: string;
}

/** Returns tips for incomplete profile / first use. Max 4 total; caller shows 2. */
export function getOnboardingTips(
  profile: Profile | null,
  workoutCount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _targets: DailyTargets,
): OnboardingTip[] {
  const tips: OnboardingTip[] = [];

  if (!profile?.weightKg) {
    tips.push({
      id: "set-weight",
      message: "设置体重以获得更准确的热量计算",
      action: "去设置",
      href: "/settings",
    });
  }

  if (!profile?.age) {
    tips.push({
      id: "set-age",
      message: "设置年龄以估算最大心率和训练区间",
      action: "去设置",
      href: "/settings",
    });
  }

  if (!hasTargetsBeenSaved()) {
    tips.push({
      id: "set-targets",
      message: "设置每日营养目标以追踪饮食达成率",
      action: "去设置",
      href: "/settings",
    });
  }

  if (workoutCount === 0) {
    const today = new Date().toISOString().slice(0, 10);
    tips.push({
      id: "first-workout",
      message: "记录你的第一次训练吧！",
      action: "开始记录",
      href: `/workout/${today}`,
    });
  }

  return tips;
}

// ─── Dismiss state (localStorage, 24-hour expiry) ────────────────────────────

const DISMISS_KEY = "fitlog_onboarding_dismissed";

export function getDismissedTips(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const record: Record<string, number> = JSON.parse(raw);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return new Set(Object.entries(record).filter(([, ts]) => ts > cutoff).map(([id]) => id));
  } catch {
    return new Set();
  }
}

export function dismissTip(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const record: Record<string, number> = raw ? JSON.parse(raw) : {};
    record[id] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}
