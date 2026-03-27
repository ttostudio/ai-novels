import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// data モジュールのモック
vi.mock("@/lib/data", () => ({
  getAllNovels: () => [
    { slug: "stellar-drift", title: "星間漂流", totalChapters: 5 },
    { slug: "magic-academy", title: "魔法学園クロニクル", totalChapters: 4 },
    { slug: "daily-life", title: "日常茶飯事", totalChapters: 4 },
  ],
  getChaptersBySlug: (slug: string) => {
    const chapters: Record<string, Array<{ number: number; title: string }>> = {
      "stellar-drift": [
        { number: 1, title: "目覚め" },
        { number: 2, title: "漂流" },
      ],
      "magic-academy": [
        { number: 1, title: "入学" },
      ],
      "daily-life": [],
    };
    return chapters[slug] ?? [];
  },
}));

import { useAnalyticsTracker, useAnalyticsDashboard } from "@/hooks/useAnalytics";

describe("useAnalyticsTracker", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("マウント時にPVをインクリメントする", () => {
    renderHook(() => useAnalyticsTracker("stellar-drift", 1));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "ai-novels:pv",
      expect.any(String)
    );

    const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(stored["stellar-drift"]["1"].views).toBe(1);
    expect(stored["stellar-drift"]["1"].lastViewed).toBeTruthy();
  });

  it("既存データがある場合はインクリメントする", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 3, lastViewed: "2026-03-26T00:00:00.000Z" },
        },
      })
    );
    vi.clearAllMocks();

    renderHook(() => useAnalyticsTracker("stellar-drift", 1));

    const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(stored["stellar-drift"]["1"].views).toBe(4);
  });

  it("不正な slug では保存しない", () => {
    renderHook(() => useAnalyticsTracker("../evil", 1));
    // setItem は呼ばれない（getItem のみ）
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      "ai-novels:pv",
      expect.any(String)
    );
  });

  it("不正な chapterNumber では保存しない", () => {
    renderHook(() => useAnalyticsTracker("stellar-drift", -1));
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      "ai-novels:pv",
      expect.any(String)
    );
  });
});

describe("useAnalyticsDashboard", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("データなしの場合 hasData が false", () => {
    const { result } = renderHook(() => useAnalyticsDashboard());
    expect(result.current.hasData).toBe(false);
  });

  it("PVデータがある場合 hasData が true", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 5, lastViewed: "2026-03-27T10:00:00.000Z" },
        },
      })
    );

    const { result } = renderHook(() => useAnalyticsDashboard());
    expect(result.current.hasData).toBe(true);
  });

  it("getNovelSummaries がPV降順で返る", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 3, lastViewed: "2026-03-27T10:00:00.000Z" },
          "2": { views: 2, lastViewed: "2026-03-26T10:00:00.000Z" },
        },
        "magic-academy": {
          "1": { views: 10, lastViewed: "2026-03-27T12:00:00.000Z" },
        },
      })
    );

    const { result } = renderHook(() => useAnalyticsDashboard());
    const summaries = result.current.getNovelSummaries();

    expect(summaries[0].novelSlug).toBe("magic-academy");
    expect(summaries[0].totalViews).toBe(10);
    expect(summaries[1].novelSlug).toBe("stellar-drift");
    expect(summaries[1].totalViews).toBe(5);
  });

  it("getChapterDetails が章ごとの詳細を返す", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 5, lastViewed: "2026-03-27T10:00:00.000Z" },
        },
      })
    );
    localStorageMock.setItem(
      "ai-novels:reading-progress",
      JSON.stringify({
        "stellar-drift": {
          "1": { readPercent: 100, completed: true },
        },
      })
    );

    const { result } = renderHook(() => useAnalyticsDashboard());
    const details = result.current.getChapterDetails("stellar-drift");

    expect(details).toHaveLength(2);
    expect(details[0].views).toBe(5);
    expect(details[0].completed).toBe(true);
    expect(details[1].views).toBe(0);
    expect(details[1].completed).toBe(false);
  });

  it("getDailyPVTrend が日別集計を返す", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 5, lastViewed: "2026-03-27T10:00:00.000Z" },
          "2": { views: 3, lastViewed: "2026-03-26T10:00:00.000Z" },
        },
      })
    );

    const { result } = renderHook(() => useAnalyticsDashboard());
    const trend = result.current.getDailyPVTrend();

    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe("2026-03-26");
    expect(trend[1].date).toBe("2026-03-27");
  });
});
