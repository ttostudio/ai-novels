import { notFound } from "next/navigation";
import { getAllNovels, getNovelBySlug, getChaptersBySlug, getChapterByNumber } from "@/lib/data";
import ChapterPageClient from "./ChapterPageClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string; chapter: string }>;
}

export async function generateStaticParams() {
  const novels = getAllNovels();
  return novels.flatMap((n) => {
    const chapters = getChaptersBySlug(n.slug);
    return chapters.map((c) => ({ slug: n.slug, chapter: String(c.number) }));
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapter } = await params;
  const novel = getNovelBySlug(slug);
  const chapterData = getChapterByNumber(slug, parseInt(chapter, 10));
  if (!novel || !chapterData) return { title: "章が見つかりません" };
  return { title: `${novel.title} 第${chapterData.number}話「${chapterData.title}」` };
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter: chapterParam } = await params;
  const chapterNumber = parseInt(chapterParam, 10);

  const novel = getNovelBySlug(slug);
  if (!novel) notFound();

  const chapters = getChaptersBySlug(slug);
  const chapter = getChapterByNumber(slug, chapterNumber);
  if (!chapter) notFound();

  const prevChapter = chapters.find((c) => c.number === chapterNumber - 1);
  const nextChapter = chapters.find((c) => c.number === chapterNumber + 1);

  return (
    <ChapterPageClient
      novel={novel}
      chapter={chapter}
      chapters={chapters}
      prevChapter={prevChapter ?? null}
      nextChapter={nextChapter ?? null}
    />
  );
}
