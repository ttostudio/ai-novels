"use client";

import Link from "next/link";
import { useState } from "react";
import { GENRES } from "@/lib/types";

export default function Header() {
  const [genreOpen, setGenreOpen] = useState(false);

  return (
    <header
      style={{ borderBottomColor: "var(--border)", backgroundColor: "var(--panel)" }}
      className="border-b sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-content mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold"
          style={{ color: "var(--accent)", fontFamily: "var(--font-reading)" }}
        >
          📖 AI Novels
        </Link>

        <nav className="flex items-center gap-4">
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
                style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
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
    </header>
  );
}
