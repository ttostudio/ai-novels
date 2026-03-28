import { notFound } from "next/navigation";
import { fetchNovel, fetchChapter } from "@/lib/api";
import ChapterPageClient from "./ChapterPageClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; chapter: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapter } = await params;
  const chapterNumber = parseInt(chapter, 10);
  try {
    const [{ novel }, chapterData] = await Promise.all([
      fetchNovel(slug),
      fetchChapter(slug, chapterNumber),
    ]);
    return {
      title: `${novel.title} 第${chapterData.number}話「${chapterData.title}」`,
    };
  } catch {
    return { title: "章が見つかりません" };
  }
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter: chapterParam } = await params;
  const chapterNumber = parseInt(chapterParam, 10);

  let novel, chapters, chapter;
  try {
    [{ novel, chapters }, chapter] = await Promise.all([
      fetchNovel(slug),
      fetchChapter(slug, chapterNumber),
    ]);
  } catch {
    notFound();
  }

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
