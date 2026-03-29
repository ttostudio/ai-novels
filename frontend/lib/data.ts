import type { Novel, Chapter } from "./types";
import novelsData from "../data/novels.json";
import stellarDriftData from "../data/chapters/stellar-drift.json";
import magicAcademyData from "../data/chapters/magic-academy.json";
import dailyLifeData from "../data/chapters/daily-life.json";
import quantumDivergenceData from "../data/chapters/quantum-divergence.json";
import detectiveCafeData from "../data/chapters/detective-cafe.json";
import ghostApartmentData from "../data/chapters/ghost-apartment.json";
import summerRomanceData from "../data/chapters/summer-romance.json";
import edoShadowData from "../data/chapters/edo-shadow.json";
import officeComedyData from "../data/chapters/office-comedy.json";
import dragonApothecaryData from "../data/chapters/dragon-apothecary.json";
import neonHackerData from "../data/chapters/neon-hacker.json";
import highschoolBandData from "../data/chapters/highschool-band.json";
import timeChefData from "../data/chapters/time-chef.json";
import yokaiOfficeData from "../data/chapters/yokai-office.json";
import galacticDiplomatData from "../data/chapters/galactic-diplomat.json";

const novels: Novel[] = novelsData as Novel[];

const chaptersMap: Record<string, Chapter[]> = {
  "stellar-drift": stellarDriftData as Chapter[],
  "magic-academy": magicAcademyData as Chapter[],
  "daily-life": dailyLifeData as Chapter[],
  "quantum-divergence": quantumDivergenceData as Chapter[],
  "detective-cafe": detectiveCafeData as Chapter[],
  "ghost-apartment": ghostApartmentData as Chapter[],
  "summer-romance": summerRomanceData as Chapter[],
  "edo-shadow": edoShadowData as Chapter[],
  "office-comedy": officeComedyData as Chapter[],
  "dragon-apothecary": dragonApothecaryData as Chapter[],
  "neon-hacker": neonHackerData as Chapter[],
  "highschool-band": highschoolBandData as Chapter[],
  "time-chef": timeChefData as Chapter[],
  "yokai-office": yokaiOfficeData as Chapter[],
  "galactic-diplomat": galacticDiplomatData as Chapter[],
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
