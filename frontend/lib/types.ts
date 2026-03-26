export interface Novel {
  id: string;
  slug: string;
  title: string;
  genre: Genre;
  tags: string[];
  synopsis: string;
  characters: Character[];
  coverImage: string;
  rating: number;
  totalChapters: number;
  latestChapter: number;
  updateSchedule: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  content: string;
  illustrations: Illustration[];
  publishedAt: string;
}

export interface Character {
  name: string;
  role: string;
  description?: string;
}

export interface Illustration {
  id: string;
  url: string;
  caption?: string;
  insertAfterParagraph?: number;
}

export type Genre =
  | "sf"
  | "fantasy"
  | "mystery"
  | "slice-of-life"
  | "horror"
  | "romance";

export const GENRE_LABELS: Record<Genre, string> = {
  sf: "SF",
  fantasy: "ファンタジー",
  mystery: "ミステリー",
  "slice-of-life": "日常系",
  horror: "ホラー",
  romance: "恋愛",
};

export const GENRES: Array<{ slug: Genre; label: string }> = Object.entries(
  GENRE_LABELS
).map(([slug, label]) => ({ slug: slug as Genre, label }));

export interface Bookmark {
  novelSlug: string;
  chapterNumber: number;
  updatedAt: string;
}
