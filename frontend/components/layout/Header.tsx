"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { GENRES } from "@/lib/types";

export default function Header() {
  const [genreOpen, setGenreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // デバウンス（300ms）でナビゲーション
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!value.trim()) return;
    debounceTimer.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }, 300);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  // モバイルで検索アイコンをタップした時にフォーカス
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  return (
    <header
      style={{
        borderBottomColor: "var(--border)",
        backgroundColor: "var(--panel)",
      }}
      className="border-b sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-content mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-xl font-bold flex-shrink-0"
          style={{ color: "var(--accent)", fontFamily: "var(--font-reading)" }}
        >
          📖 AI Novels
        </Link>

        {/* 検索バー（デスクトップ: 常時表示、モバイル: アイコンで展開） */}
        <form
          onSubmit={handleSearchSubmit}
          className={`flex-1 max-w-sm transition-all ${
            searchOpen ? "flex" : "hidden sm:flex"
          }`}
          role="search"
          aria-label="小説を検索"
        >
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="小説を検索..."
            className="w-full px-3 py-1.5 text-sm rounded-lg outline-none"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            aria-label="検索キーワード"
          />
        </form>

        <nav className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* モバイル検索アイコン */}
          <button
            className="sm:hidden p-1.5 rounded hover:opacity-80 transition-opacity"
            style={{ color: "var(--text)" }}
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="検索"
            aria-expanded={searchOpen}
          >
            🔍
          </button>

          {/* Genre Dropdown */}
          <div className="relative">
            <button
              onClick={() => setGenreOpen(!genreOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm hover:opacity-80 transition-opacity"
              style={{ color: "var(--text)" }}
              aria-expanded={genreOpen}
              aria-haspopup="true"
            >
              ジャンル ▾
            </button>
            {genreOpen && (
              <div
                className="absolute right-0 mt-1 w-40 rounded shadow-lg py-1 z-10"
                style={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                }}
                role="menu"
              >
                {GENRES.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/genre/${g.slug}`}
                    className="block px-4 py-2 text-sm hover:opacity-80"
                    style={{ color: "var(--text)" }}
                    onClick={() => setGenreOpen(false)}
                    role="menuitem"
                  >
                    {g.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/analytics"
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--text)" }}
            aria-label="読者分析"
          >
            分析
          </Link>

          <Link
            href="/bookmarks"
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--text)" }}
            aria-label="ブックマーク"
          >
            🔖 ブックマーク
          </Link>
        </nav>
      </div>

      {/* モバイル検索展開時の追加行 */}
      {searchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <form onSubmit={handleSearchSubmit} role="search" aria-label="小説を検索（モバイル）">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="小説を検索..."
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              aria-label="検索キーワード（モバイル）"
              autoFocus
            />
          </form>
        </div>
      )}
    </header>
  );
}
