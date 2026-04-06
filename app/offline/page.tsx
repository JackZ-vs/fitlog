"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0f13] text-center px-6">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-6 opacity-40">
        <circle cx="36" cy="36" r="32" stroke="#f97316" strokeWidth="3" />
        <path d="M24 36 Q36 20 48 36 Q36 52 24 36Z" stroke="#f97316" strokeWidth="2.5" fill="none" />
        <line x1="20" y1="20" x2="52" y2="52" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h1 className="text-xl font-bold text-[#f0f2f5] mb-2">暂时离线</h1>
      <p className="text-sm text-[#6b7280] mb-6">请检查网络连接后重试</p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-xl bg-[#f97316] text-white text-sm font-bold hover:bg-[#ea6c0a] transition-colors"
      >
        重新连接
      </button>
    </div>
  );
}
