"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useBookmark } from "@/lib/hooks/useBookmark";
import { fetchNovels } from "@/lib/api";
import { GENRE_LABELS } from "@/lib/types";
import type { Novel } from "@/lib/types";

export default function BookmarksPageClient() {
  const { bookmarks, removeBookmark } = useBookmark();
  const [novelMap, setNovelMap] = useState<Record<string, Novel>>({});

  useEffect(() => {
    fetchNovels()
      .then((novels) => {
        const map: Record<string, Novel> = {};
        for (const novel of novels) {
          map[novel.slug] = novel;
        }
        setNovelMap(map);
      })
      .catch(() => {
        // API 未起動時は無視（slug のみ表示）
      });
  }, []);

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}
      >
        🔖 ブックマーク
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        {bookmarks.length}件
      </p>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-base mb-6" style={{ color: "var(--muted)" }}>
            ブックマークがまだありません
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            作品を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => {
            const novel = novelMap[bookmark.novelSlug];
            return (
              <div
                key={bookmark.novelSlug}
                className="flex items-center justify-between px-4 py-4 rounded-lg"
                style={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <h2
                    className="font-medium text-base"
                    style={{ color: "var(--text)" }}
                  >
                    {novel?.title ?? bookmark.novelSlug}
                  </h2>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    {novel ? `${GENRE_LABELS[novel.genre]} · ` : ""}第
                    {bookmark.chapterNumber}話まで
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/novel/${bookmark.novelSlug}/${bookmark.chapterNumber}`}
                    className="text-sm px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    続きを読む
                  </Link>
                  <button
                    onClick={() => removeBookmark(bookmark.novelSlug)}
                    className="text-sm px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                    aria-label={`${novel?.title ?? bookmark.novelSlug}のブックマークを削除`}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
