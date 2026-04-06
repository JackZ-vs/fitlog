"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaPrompt: BeforeInstallPromptEvent | null;
  }
}

type Mode = "android" | "ios" | null;

export default function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !nav.standalone;

    if (isIOS) {
      // Only show on Safari (not Chrome on iOS, which can't install)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) setMode("ios");
      return;
    }

    // Pick up event captured before React hydrated
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      setMode("android");
      return;
    }

    // Fallback: listen in case it fires later
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setMode(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem("pwa-install-dismissed", "1");
    setMode(null);
    setDeferredPrompt(null);
  };

  if (!mode) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 px-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-2xl border border-[#252830] bg-[#1a1d24] shadow-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* App icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="FitLog"
              className="w-11 h-11 rounded-2xl flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">安装 FitLog</p>
              <p className="text-xs text-[#6b7280] mt-0.5">添加到桌面，像 App 一样使用</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-[#6b7280] hover:text-white flex-shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {mode === "android" && (
          <button
            onClick={install}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-sm font-medium py-2.5 transition-colors"
          >
            <Download size={16} />
            安装到桌面
          </button>
        )}

        {mode === "ios" && (
          <div className="mt-3 text-xs text-[#9ca3af] space-y-1.5">
            <p className="flex items-center gap-2">
              <span className="text-[#f97316]">1.</span>
              点击底部
              <Share size={14} className="inline text-[#f97316]" />
              分享按钮
            </p>
            <p className="flex items-center gap-2">
              <span className="text-[#f97316]">2.</span>
              选择
              <PlusSquare size={14} className="inline text-[#f97316]" />
              <span className="font-medium text-white">添加到主屏幕</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
