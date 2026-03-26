import { notFound } from "next/navigation";
import { getAllNovels, getNovelBySlug, getChaptersBySlug } from "@/lib/data";
import { GENRE_LABELS } from "@/lib/types";
import Link from "next/link";
import ChapterList from "@/components/novel/ChapterList";
import IllustrationGallery from "@/components/novel/IllustrationGallery";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const novels = getAllNovels();
  return novels.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  if (!novel) return { title: "作品が見つかりません" };
  return { title: novel.title };
}

export default async function NovelDetailPage({ params }: Props) {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  if (!novel) notFound();

  const chapters = getChaptersBySlug(slug);
  const allIllustrations = chapters.flatMap((c) => c.illustrations);

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80" style={{ color: "var(--accent)" }}>
        ← ホームへ戻る
      </Link>

      {/* 2-column layout on desktop */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Left: cover + meta */}
        <aside className="md:w-64 flex-shrink-0">
          <div className="illust-placeholder w-full aspect-[3/4] rounded-lg mb-4" role="img" aria-label={`${novel.title} カバー画像`}>
            <span className="text-6xl">📖</span>
          </div>
          <dl className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
            <div className="flex gap-2">
              <dt style={{ color: "var(--muted)" }}>ジャンル</dt>
              <dd>{GENRE_LABELS[novel.genre]}</dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: "var(--muted)" }}>話数</dt>
              <dd>{novel.totalChapters}話</dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: "var(--muted)" }}>評価</dt>
              <dd>★{novel.rating.toFixed(1)}</dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: "var(--muted)" }}>更新</dt>
              <dd>{novel.updateSchedule}</dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: "var(--muted)" }}>状態</dt>
              <dd>{novel.status === "active" ? "連載中" : novel.status === "paused" ? "休止中" : "完結"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/novel/${novel.slug}/1`}
              className="block text-center px-4 py-2 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              📖 読み始める
            </Link>
          </div>
        </aside>

        {/* Right: synopsis + characters + tags */}
        <div className="flex-1 space-y-6">
          <section aria-labelledby="synopsis-heading">
            <h1 id="synopsis-heading" className="text-2xl font-bold mb-4" style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}>
              {novel.title}
            </h1>
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--muted)" }}>📖 あらすじ</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{novel.synopsis}</p>
          </section>

          <section aria-labelledby="characters-heading">
            <h2 id="characters-heading" className="text-base font-semibold mb-3" style={{ color: "var(--muted)" }}>👥 登場人物</h2>
            <ul className="space-y-2">
              {novel.characters.map((char) => (
                <li key={char.name} className="text-sm" style={{ color: "var(--text)" }}>
                  <span className="font-medium">・{char.name}</span>
                  <span style={{ color: "var(--muted)" }}> — {char.role}</span>
                  {char.description && (
                    <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{char.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="tags-heading">
            <h2 id="tags-heading" className="text-base font-semibold mb-2" style={{ color: "var(--muted)" }}>🏷️ タグ</h2>
            <div className="flex flex-wrap gap-2">
              {novel.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="space-y-8">
        <ChapterList novelSlug={slug} chapters={chapters} latestChapter={novel.latestChapter} />
        <IllustrationGallery illustrations={allIllustrations} />
      </div>
    </div>
  );
}
