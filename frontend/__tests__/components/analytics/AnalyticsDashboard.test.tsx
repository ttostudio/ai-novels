import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import AnalyticsDashboardClient from "@/app/analytics/AnalyticsDashboardClient";

describe("AnalyticsDashboardClient", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("データなしの場合「まだデータがありません」を表示", () => {
    render(<AnalyticsDashboardClient />);

    expect(screen.getByText("まだデータがありません")).toBeInTheDocument();
    expect(
      screen.getByText("小説を読み始めると、ここに分析データが表示されます。")
    ).toBeInTheDocument();
  });

  it("PVデータがある場合、概要カードとグラフが表示される", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 5, lastViewed: "2026-03-27T10:00:00.000Z" },
          "2": { views: 3, lastViewed: "2026-03-26T10:00:00.000Z" },
        },
        "magic-academy": {
          "1": { views: 2, lastViewed: "2026-03-27T12:00:00.000Z" },
        },
      })
    );

    render(<AnalyticsDashboardClient />);

    // 総PV = 10
    expect(screen.getByText("10")).toBeInTheDocument();
    // 「総PV」ラベル
    expect(screen.getByText("総PV")).toBeInTheDocument();
    // 「平均読了率」ラベル
    expect(screen.getByText("平均読了率")).toBeInTheDocument();
    // PVランキングの見出し
    expect(screen.getByText("PVランキング（作品別）")).toBeInTheDocument();
  });

  it("読了データがある場合、読了率が表示される", () => {
    localStorageMock.setItem(
      "ai-novels:pv",
      JSON.stringify({
        "stellar-drift": {
          "1": { views: 4, lastViewed: "2026-03-27T10:00:00.000Z" },
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

    render(<AnalyticsDashboardClient />);

    // 読了率セクションの見出し（複数マッチするため getAllByText を使用）
    const elements = screen.getAllByText(/読了率/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
