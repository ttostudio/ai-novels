"use client";

import { useState, useEffect } from "react";

export type FontSize = "small" | "medium" | "large";
export type ReaderBg = "white" | "sepia" | "dark";
export type LineHeight = "normal" | "relaxed";

export interface ReaderSettings {
  fontSize: FontSize;
  bg: ReaderBg;
  lineHeight: LineHeight;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: "medium",
  bg: "sepia",
  lineHeight: "relaxed",
};

const STORAGE_KEY = "ai-novels-reader-settings";

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  }, []);

  function updateSettings(partial: Partial<ReaderSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const fontSizeClass = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  }[settings.fontSize];

  const bgStyle = {
    white: { background: "var(--reader-bg-white)", color: "var(--text)" },
    sepia: { background: "var(--reader-bg-sepia)", color: "var(--text)" },
    dark: { background: "var(--reader-bg-dark)", color: "var(--reader-text-dark)" },
  }[settings.bg];

  const lineHeightClass = settings.lineHeight === "relaxed" ? "leading-loose" : "leading-relaxed";

  return { settings, updateSettings, fontSizeClass, bgStyle, lineHeightClass };
}
