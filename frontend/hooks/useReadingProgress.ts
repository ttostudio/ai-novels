"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const PROGRESS_KEY = "ai-novels:reading-progress";

interface ProgressEntry {
  readPercent: number;
  completed: boolean;
}
type ProgressStore = Record<string, Record<string, ProgressEntry>>;

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // サイレントに無視
  }
}

export function useReadingProgress(novelSlug: string, chapterNumber: number) {
  const [readPercent, setReadPercent] = useState(0);
  const [completed, setCompleted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期値読み込み
  useEffect(() => {
    const store = readStore();
    const entry = store[novelSlug]?.[String(chapterNumber)];
    if (entry) {
      setReadPercent(entry.readPercent);
      setCompleted(entry.completed);
    }
  }, [novelSlug, chapterNumber]);

  // localStorage への永続化（デバウンス付き）
  const persist = useCallback(
    (percent: number, done: boolean) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const store = readStore();
        if (!store[novelSlug]) store[novelSlug] = {};
        store[novelSlug][String(chapterNumber)] = {
          readPercent: percent,
          completed: done,
        };
        writeStore(store);
      }, 500);
    },
    [novelSlug, chapterNumber]
  );

  // スクロール率計測
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const percent = Math.min(100, Math.round((scrollTop / docHeight) * 100));

      setReadPercent((prev) => {
        const next = Math.max(prev, percent);
        if (next !== prev) {
          const done = next >= 90;
          if (done) setCompleted(true);
          persist(next, done || completed);
        }
        return next;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [persist, completed]);

  // IntersectionObserver で章末尾を検知
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCompleted(true);
          setReadPercent((prev) => {
            const next = Math.max(prev, 90);
            persist(next, true);
            return next;
          });
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [persist]);

  return { readPercent, completed, endRef };
}
