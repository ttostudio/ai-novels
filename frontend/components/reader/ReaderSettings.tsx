"use client";

import type { FontSize, ReaderBg, LineHeight, ReaderSettings } from "@/lib/hooks/useReaderSettings";

interface Props {
  settings: ReaderSettings;
  onUpdate: (partial: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

export default function ReaderSettings({ settings, onUpdate, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="リーダー設定"
    >
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            リーダー設定
          </h2>
          <button onClick={onClose} className="text-xl hover:opacity-60" aria-label="閉じる">✕</button>
        </div>

        {/* Font size */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>文字サイズ</p>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as FontSize[]).map((s) => (
              <button
                key={s}
                onClick={() => onUpdate({ fontSize: s })}
                className="flex-1 py-2 rounded text-sm"
                style={{
                  backgroundColor: settings.fontSize === s ? "var(--accent)" : "var(--bg)",
                  color: settings.fontSize === s ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
                aria-pressed={settings.fontSize === s}
              >
                {s === "small" ? "小" : s === "medium" ? "中" : "大"}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>背景色</p>
          <div className="flex gap-2">
            {([
              { key: "white" as ReaderBg, label: "白", bg: "#ffffff", text: "#2d2a26" },
              { key: "sepia" as ReaderBg, label: "セピア", bg: "#f8f1e3", text: "#2d2a26" },
              { key: "dark" as ReaderBg, label: "ダーク", bg: "#1a1a2e", text: "#e0ddd5" },
            ]).map(({ key, label, bg, text }) => (
              <button
                key={key}
                onClick={() => onUpdate({ bg: key })}
                className="flex-1 py-2 rounded text-sm font-medium"
                style={{
                  backgroundColor: bg,
                  color: text,
                  border: settings.bg === key ? "2px solid var(--accent)" : "1px solid var(--border)",
                }}
                aria-pressed={settings.bg === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Line height */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>行間</p>
          <div className="flex gap-2">
            {(["normal", "relaxed"] as LineHeight[]).map((lh) => (
              <button
                key={lh}
                onClick={() => onUpdate({ lineHeight: lh })}
                className="flex-1 py-2 rounded text-sm"
                style={{
                  backgroundColor: settings.lineHeight === lh ? "var(--accent)" : "var(--bg)",
                  color: settings.lineHeight === lh ? "#fff" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
                aria-pressed={settings.lineHeight === lh}
              >
                {lh === "normal" ? "標準" : "ゆったり"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
