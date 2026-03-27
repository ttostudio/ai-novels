"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllNovels, getChaptersBySlug } from "@/lib/data";

// --- 型定義 ---
export interface ChapterPV {
  views: number;
  lastViewed: string;
}
export type NovelPVMap = Record<string, ChapterPV>;
export type PVStore = Record<string, NovelPVMap>;

export interface NovelAnalyticsSummary {
  novelSlug: string;
  novelTitle: string;
  totalViews: number;
  completedChapters: number;
  totalChapters: number;
  completionRate: number;
  lastViewedAt: string | null;
}

export interface ChapterAnalyticsDetail {
  novelSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  views: number;
  readPercent: number;
  completed: boolean;
  lastViewed: string | null;
}

export interface DailyPV {
  date: string;
  views: number;
}

// --- localStorage 読み書きヘルパー ---
const PV_KEY = "ai-novels:pv";
const PROGRESS_KEY = "ai-novels:reading-progress";

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

function isSafeChapterNumber(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n < 10000;
}

function readPVStore(): PVStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PV_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PVStore;
  } catch {
    return {};
  }
}

function writePVStore(store: PVStore): void {
  try {
    localStorage.setItem(PV_KEY, JSON.stringify(store));
  } catch {
    // QuotaExceededError 等 — サイレントに無視
  }
}

interface ReadingProgressEntry {
  readPercent: number;
  completed: boolean;
}
type ReadingProgressStore = Record<string, Record<string, ReadingProgressEntry>>;

function readProgressStore(): ReadingProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReadingProgressStore;
  } catch {
    return {};
  }
}

/**
 * 章ページ用: PV トラッキング
 */
export function useAnalyticsTracker(novelSlug: string, chapterNumber: number) {
  useEffect(() => {
    if (!isSafeSlug(novelSlug) || !isSafeChapterNumber(chapterNumber)) return;

    const store = readPVStore();
    if (!store[novelSlug]) store[novelSlug] = {};
    const chKey = String(chapterNumber);
    const entry = store[novelSlug][chKey] ?? { views: 0, lastViewed: "" };
    entry.views += 1;
    entry.lastViewed = new Date().toISOString();
    store[novelSlug][chKey] = entry;
    writePVStore(store);
  }, [novelSlug, chapterNumber]);
}

/**
 * ダッシュボード用: 集計データを提供
 */
export function useAnalyticsDashboard() {
  const [pvData, setPvData] = useState<PVStore>({});
  const [progressData, setProgressData] = useState<ReadingProgressStore>({});
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const pv = readPVStore();
    const progress = readProgressStore();
    setPvData(pv);
    setProgressData(progress);
    setHasData(Object.keys(pv).length > 0);
  }, []);

  const getNovelSummaries = useCallback((): NovelAnalyticsSummary[] => {
    const novels = getAllNovels();
    return novels.map((novel) => {
      const chapters = getChaptersBySlug(novel.slug);
      const pvMap = pvData[novel.slug] ?? {};
      const progressMap = progressData[novel.slug] ?? {};

      let totalViews = 0;
      let completedChapters = 0;
      let latestViewed: string | null = null;

      for (const ch of chapters) {
        const chKey = String(ch.number);
        const pv = pvMap[chKey];
        if (pv) {
          totalViews += pv.views;
          if (!latestViewed || pv.lastViewed > latestViewed) {
            latestViewed = pv.lastViewed;
          }
        }
        const prog = progressMap[chKey];
        if (prog?.completed) {
          completedChapters++;
        }
      }

      const totalChapters = chapters.length;
      const completionRate = totalChapters > 0
        ? Math.floor((completedChapters / totalChapters) * 100)
        : 0;

      return {
        novelSlug: novel.slug,
        novelTitle: novel.title,
        totalViews,
        completedChapters,
        totalChapters,
        completionRate,
        lastViewedAt: latestViewed,
      };
    }).sort((a, b) => b.totalViews - a.totalViews);
  }, [pvData, progressData]);

  const getChapterDetails = useCallback((slug: string): ChapterAnalyticsDetail[] => {
    const chapters = getChaptersBySlug(slug);
    const pvMap = pvData[slug] ?? {};
    const progressMap = progressData[slug] ?? {};

    return chapters.map((ch) => {
      const chKey = String(ch.number);
      const pv = pvMap[chKey];
      const prog = progressMap[chKey];
      return {
        novelSlug: slug,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        views: pv?.views ?? 0,
        readPercent: prog?.readPercent ?? 0,
        completed: prog?.completed ?? false,
        lastViewed: pv?.lastViewed ?? null,
      };
    });
  }, [pvData, progressData]);

  const getDailyPVTrend = useCallback((): DailyPV[] => {
    const dayMap: Record<string, number> = {};

    for (const novelSlug of Object.keys(pvData)) {
      const pvMap = pvData[novelSlug];
      for (const chKey of Object.keys(pvMap)) {
        const entry = pvMap[chKey];
        if (entry.lastViewed) {
          const date = entry.lastViewed.slice(0, 10);
          dayMap[date] = (dayMap[date] ?? 0) + entry.views;
        }
      }
    }

    return Object.entries(dayMap)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [pvData]);

  return {
    hasData,
    pvData,
    getNovelSummaries,
    getChapterDetails,
    getDailyPVTrend,
  };
}
