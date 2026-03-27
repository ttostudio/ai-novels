"use client";

import { useState } from "react";

interface Props {
  title: string;
  chapterTitle: string;
}

export default function ShareButtons({ title, chapterTitle }: Props) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const shareText = `${title}「${chapterTitle}」を読んでいます`;

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(getUrl())}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={shareToTwitter}
        className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
        aria-label="Xでシェア"
      >
        X
      </button>
      <button
        onClick={shareToLine}
        className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
        aria-label="LINEでシェア"
      >
        LINE
      </button>
      <button
        onClick={copyLink}
        className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: copied ? "var(--accent)" : "var(--text)" }}
        aria-label="リンクをコピー"
      >
        {copied ? "Copied!" : "Link"}
      </button>
    </div>
  );
}
