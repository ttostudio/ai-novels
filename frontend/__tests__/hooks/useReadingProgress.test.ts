import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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

import { useReadingProgress } from "@/hooks/useReadingProgress";

describe("useReadingProgress", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態は readPercent=0, completed=false", () => {
    const { result } = renderHook(() => useReadingProgress("stellar-drift", 1));

    expect(result.current.readPercent).toBe(0);
    expect(result.current.completed).toBe(false);
  });

  it("既存データがあれば初期値として読み込む", () => {
    localStorageMock.setItem(
      "ai-novels:reading-progress",
      JSON.stringify({
        "stellar-drift": {
          "1": { readPercent: 75, completed: false },
        },
      })
    );

    const { result } = renderHook(() => useReadingProgress("stellar-drift", 1));

    expect(result.current.readPercent).toBe(75);
    expect(result.current.completed).toBe(false);
  });

  it("endRef が返される", () => {
    const { result } = renderHook(() => useReadingProgress("stellar-drift", 1));
    expect(result.current.endRef).toBeDefined();
    expect(result.current.endRef.current).toBeNull();
  });

  it("localStorage が壊れている場合は空データで初期化", () => {
    localStorageMock.setItem("ai-novels:reading-progress", "invalid json");

    const { result } = renderHook(() => useReadingProgress("stellar-drift", 1));

    expect(result.current.readPercent).toBe(0);
    expect(result.current.completed).toBe(false);
  });

  it("localStorage が無い場合もエラーなく動作", () => {
    const { result } = renderHook(() => useReadingProgress("stellar-drift", 1));

    expect(result.current.readPercent).toBe(0);
    expect(result.current.completed).toBe(false);
  });
});
