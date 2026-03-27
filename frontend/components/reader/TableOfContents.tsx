"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/types";

interface Props {
  novelSlug: string;
  novelTitle: string;
  chapters: Chapter[];
  currentChapter: number;
  open: boolean;
  onClose: () => void;
}

export default function TableOfContents({
  novelSlug,
  novelTitle,
  chapters,
  currentChapter,
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <aside
        className="fixed top-0 left-0 z-50 h-full w-72 overflow-y-auto shadow-lg"
        style={{ backgroundColor: "var(--panel)", borderRight: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {novelTitle}
          </h2>
          <button onClick={onClose} className="text-lg" aria-label="閉じる">
            &times;
          </button>
        </div>
        <nav className="py-2">
          {chapters.map((ch) => {
            const isCurrent = ch.number === currentChapter;
            return (
              <Link
                key={ch.number}
                href={`/novel/${novelSlug}/${ch.number}`}
                onClick={onClose}
                className="block px-4 py-3 text-sm transition-opacity hover:opacity-80"
                style={{
                  color: isCurrent ? "var(--accent)" : "var(--text)",
                  backgroundColor: isCurrent ? "var(--bg)" : "transparent",
                  borderLeft: isCurrent ? "3px solid var(--accent)" : "3px solid transparent",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                第{ch.number}話「{ch.title}」
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
