import { notFound } from "next/navigation";
import { fetchNovels } from "@/lib/api";
import { GENRES, GENRE_LABELS, type Genre } from "@/lib/types";
import NovelCard from "@/components/novel/NovelCard";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ genre: string }>;
}

export function generateStaticParams() {
  return GENRES.map((g) => ({ genre: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { genre } = await params;
  const label = GENRE_LABELS[genre as Genre];
  return { title: label ? `${label}の作品一覧` : "ジャンル" };
}

export default async function GenrePage({ params }: Props) {
  const { genre } = await params;
  const genreKey = genre as Genre;
  if (!GENRE_LABELS[genreKey]) notFound();

  const novels = await fetchNovels(genreKey);

  return (
    <div className="max-w-content mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80"
        style={{ color: "var(--accent)" }}
      >
        ← ホームへ戻る
      </Link>

      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}
      >
        {GENRE_LABELS[genreKey]}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        {novels.length}作品
      </p>

      {novels.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📚</p>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            このジャンルの作品はまだありません
          </p>
        </div>
      )}
    </div>
  );
}
