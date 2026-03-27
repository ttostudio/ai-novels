"use client";

import Link from "next/link";

interface Props {
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpenSettings: () => void;
  onOpenToc: () => void;
}

export default function ReaderHeader({
  novelSlug,
  novelTitle,
  chapterNumber,
  chapterTitle,
  isBookmarked,
  onToggleBookmark,
  onOpenSettings,
  onOpenToc,
}: Props) {
  return (
    <header
      className="sticky top-14 z-40 flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: "var(--panel)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenToc}
          className="text-lg hover:opacity-80 transition-opacity"
          aria-label="目次を開く"
        >
          &#9776;
        </button>
        <Link
          href={`/novel/${novelSlug}`}
          className="text-sm hover:opacity-80 flex items-center gap-1"
          style={{ color: "var(--accent)" }}
          aria-label="作品詳細に戻る"
        >
          ← {novelTitle}
        </Link>
      </div>
      <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--text)" }}>
        第{chapterNumber}話「{chapterTitle}」
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleBookmark}
          className="text-lg hover:opacity-80 transition-opacity"
          aria-label={isBookmarked ? "しおりを削除" : "しおりを追加"}
          aria-pressed={isBookmarked}
        >
          {isBookmarked ? "🔖" : "📄"}
        </button>
        <button
          onClick={onOpenSettings}
          className="text-lg hover:opacity-80 transition-opacity"
          aria-label="リーダー設定"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
