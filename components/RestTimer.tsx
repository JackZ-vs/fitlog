"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";

const PRESETS = [60, 90, 120, 180];

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    // Short second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1040;
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Browser may block AudioContext without user gesture — ignore
  }
}

export default function RestTimer({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((seconds?: number) => {
    const s = seconds ?? preset;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(s);
  }, [preset]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          beep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function selectPreset(s: number) {
    setPreset(s);
    reset(s);
  }

  const pct = preset > 0 ? remaining / preset : 0;
  const R = 26;
  const circumference = 2 * Math.PI * R;
  const dash = pct * circumference;
  const done = remaining === 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#0d0f13] border border-[#252830]">
      {/* Preset selector */}
      <div className="flex gap-1 shrink-0">
        {PRESETS.map((s) => (
          <button
            key={s}
            onClick={() => selectPreset(s)}
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
              preset === s
                ? "bg-[#f97316] text-white"
                : "bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5]"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>

      {/* Ring + countdown */}
      <div className="flex items-center gap-2.5 flex-1">
        <svg width="60" height="60" className="shrink-0 -rotate-90">
          <circle cx="30" cy="30" r={R} fill="none" stroke="#1a1d24" strokeWidth="4" />
          <circle
            cx="30" cy="30" r={R}
            fill="none"
            stroke={done ? "#4ade80" : running ? "#f97316" : "#3f4350"}
            strokeWidth="4"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }}
          />
        </svg>
        <div>
          <p className={`text-xl font-bold font-mono tabular-nums leading-none ${done ? "text-[#4ade80]" : "text-[#f0f2f5]"}`}>
            {done ? "完成!" : timeStr}
          </p>
          <p className="text-[10px] text-[#3f4350] mt-0.5">
            {running ? "休息中…" : done ? "开始下一组" : "准备好了？"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => done ? reset() : setRunning((r) => !r)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-colors ${
            done
              ? "bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30"
              : "bg-[#f97316] text-white hover:bg-[#ea6c0a]"
          }`}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => reset()}
          title="重置"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] transition-colors"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={onClose}
          title="关闭"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1d24] text-[#6b7280] hover:text-[#f0f2f5] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
