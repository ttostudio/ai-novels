import type { Novel, Chapter } from "./types";
import novelsData from "../data/novels.json";
import stellarDriftData from "../data/chapters/stellar-drift.json";
import magicAcademyData from "../data/chapters/magic-academy.json";
import dailyLifeData from "../data/chapters/daily-life.json";

const novels: Novel[] = novelsData as Novel[];

const chaptersMap: Record<string, Chapter[]> = {
  "stellar-drift": stellarDriftData as Chapter[],
  "magic-academy": magicAcademyData as Chapter[],
  "daily-life": dailyLifeData as Chapter[],
};

export function getAllNovels(): Novel[] {
  return novels;
}

export function getNovelBySlug(slug: string): Novel | undefined {
  return novels.find((n) => n.slug === slug);
}

export function getNovelsByGenre(genre: string): Novel[] {
  return novels.filter((n) => n.genre === genre);
}

export function getChaptersBySlug(novelSlug: string): Chapter[] {
  return chaptersMap[novelSlug] ?? [];
}

export function getChapterByNumber(
  novelSlug: string,
  chapterNumber: number
): Chapter | undefined {
  const chapters = getChaptersBySlug(novelSlug);
  return chapters.find((c) => c.number === chapterNumber);
}
