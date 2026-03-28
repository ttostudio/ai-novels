"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { searchNovels } from "@/lib/api";
import NovelCard from "@/components/novel/NovelCard";
import { NovelGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { Novel } from "@/lib/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(q: string) {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    searchNovels(q)
      .then((data) => {
        setResults(data);
        setSearched(true);
      })
      .catch(() => {
        setError("検索に失敗しました。しばらく後にもう一度お試しください。");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSearch(value);
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    runSearch(query);
  }

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}
      >
        🔍 検索
      </h1>

      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="小説を検索"
        className="mb-8"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="タイトル・あらすじ・内容で検索..."
          className="w-full px-4 py-3 text-base rounded-lg outline-none"
          style={{
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          aria-label="検索キーワード"
          autoFocus
        />
      </form>

      {error && <ErrorBanner message={error} />}

      {loading && <NovelGridSkeleton count={8} />}

      {!loading && searched && (
        <>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            {results.length > 0
              ? `「${query}」の検索結果: ${results.length}件`
              : `「${query}」に一致する作品は見つかりませんでした`}
          </p>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-base" style={{ color: "var(--muted)" }}>
                別のキーワードで検索してみてください
              </p>
            </div>
          )}
        </>
      )}

      {!loading && !searched && !query.trim() && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📖</p>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            検索キーワードを入力してください
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-content mx-auto px-4 py-8">
          <NovelGridSkeleton count={8} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
