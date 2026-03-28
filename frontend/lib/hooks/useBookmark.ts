"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bookmark } from "../types";
import {
  fetchBookmarks,
  upsertBookmark,
  deleteBookmark,
} from "../api";

export function useBookmark() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    fetchBookmarks()
      .then(setBookmarks)
      .catch(() => {
        // API 未起動時は localStorage にフォールバック
        try {
          const stored = localStorage.getItem("ai-novels-bookmarks");
          if (stored) setBookmarks(JSON.parse(stored) as Bookmark[]);
        } catch {
          // ignore
        }
      });
  }, []);

  const isBookmarked = useCallback(
    (novelSlug: string): boolean =>
      bookmarks.some((b) => b.novelSlug === novelSlug),
    [bookmarks]
  );

  const addBookmark = useCallback(
    async (novelSlug: string, chapterNumber: number) => {
      // 楽観的更新
      const next = bookmarks.filter((b) => b.novelSlug !== novelSlug);
      next.push({
        novelSlug,
        chapterNumber,
        updatedAt: new Date().toISOString(),
      });
      setBookmarks(next);
      try {
        await upsertBookmark(novelSlug, chapterNumber);
      } catch {
        // ロールバック
        setBookmarks(bookmarks);
      }
    },
    [bookmarks]
  );

  const removeBookmark = useCallback(
    async (novelSlug: string) => {
      // 楽観的更新
      const next = bookmarks.filter((b) => b.novelSlug !== novelSlug);
      setBookmarks(next);
      try {
        await deleteBookmark(novelSlug);
      } catch {
        // ロールバック
        setBookmarks(bookmarks);
      }
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (novelSlug: string, chapterNumber = 1) => {
      if (isBookmarked(novelSlug)) {
        await removeBookmark(novelSlug);
      } else {
        await addBookmark(novelSlug, chapterNumber);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark };
}
