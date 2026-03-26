import { getAllNovels, getChaptersBySlug } from "@/lib/data";
import { GENRE_LABELS } from "@/lib/types";
import HeroCarousel from "@/components/novel/HeroCarousel";
import GenreChips from "@/components/novel/GenreChips";
import NovelCard from "@/components/novel/NovelCard";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Novels — AI が生み出す物語",
};

export default function HomePage() {
  const novels = getAllNovels();

  // Build recent updates list
  const recentUpdates = novels
    .map((novel) => {
      const chapters = getChaptersBySlug(novel.slug);
      const latest = chapters.find((c) => c.number === novel.latestChapter);
      return { novel, chapter: latest };
    })
    .filter((item) => item.chapter != null)
    .sort((a, b) => new Date(b.novel.updatedAt).getTime() - new Date(a.novel.updatedAt).getTime());

  return (
    <div className="max-w-content mx-auto px-4 py-8 space-y-12">
      <HeroCarousel novels={novels} />
      <GenreChips />

      {/* Recent updates */}
      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
          📖 新着更新
        </h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", backgroundColor: "var(--panel)" }}>
          {recentUpdates.map(({ novel, chapter }, i) => (
            <Link
              key={novel.id}
              href={`/novel/${novel.slug}/${novel.latestChapter}`}
              className="flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
              style={{ borderBottom: i < recentUpdates.length - 1 ? "1px solid var(--border)" : "none", color: "var(--text)" }}
            >
              <span className="text-sm">
                <span className="font-medium">{novel.title}</span>
                {chapter && ` 第${chapter.number}話「${chapter.title}」`}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full ml-4 flex-shrink-0"
                style={{ backgroundColor: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}
              >
                {GENRE_LABELS[novel.genre]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* All novels grid */}
      <section aria-labelledby="all-novels-heading">
        <h2 id="all-novels-heading" className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
          📚 全作品
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      </section>
    </div>
  );
}
