"use client";

import { useState, useEffect } from "react";
import type { Bookmark } from "../types";

const STORAGE_KEY = "ai-novels-bookmarks";

export function useBookmark() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  function isBookmarked(novelSlug: string): boolean {
    return bookmarks.some((b) => b.novelSlug === novelSlug);
  }

  function addBookmark(novelSlug: string, chapterNumber: number) {
    const next = bookmarks.filter((b) => b.novelSlug !== novelSlug);
    next.push({ novelSlug, chapterNumber, updatedAt: new Date().toISOString() });
    setBookmarks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function removeBookmark(novelSlug: string) {
    const next = bookmarks.filter((b) => b.novelSlug !== novelSlug);
    setBookmarks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function toggleBookmark(novelSlug: string, chapterNumber = 1) {
    if (isBookmarked(novelSlug)) {
      removeBookmark(novelSlug);
    } else {
      addBookmark(novelSlug, chapterNumber);
    }
  }

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark };
}
