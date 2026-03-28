import type { Novel, Chapter, Bookmark, Genre } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

// --- セッション ID 管理 ---

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ai-novels-session-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ai-novels-session-id", id);
  }
  return id;
}

// --- fetch ラッパー ---

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  withSession = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (withSession) {
    const sid = getSessionId();
    if (sid) headers["X-Session-ID"] = sid;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? "API Error");
  }
  return res.json() as Promise<T>;
}

// --- API レスポンス型（Python snake_case） ---

interface NovelApiResponse {
  id: number;
  slug: string;
  title: string;
  author: string;
  genre: string;
  tags: string[];
  synopsis: string;
  characters: Array<{ name: string; role: string; description?: string }>;
  cover_image: string | null;
  rating: number;
  total_chapters: number;
  latest_chapter: number;
  update_schedule: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ChapterSummaryApiResponse {
  id: number;
  number: number;
  title: string;
  published_at: string;
}

interface NovelDetailApiResponse extends NovelApiResponse {
  chapters: ChapterSummaryApiResponse[];
}

interface NovelListApiResponse {
  total: number;
  items: NovelApiResponse[];
}

interface IllustrationApiResponse {
  id: number;
  image_path: string;
  alt_text: string | null;
  position: number;
}

interface ChapterApiResponse {
  id: number;
  novel_slug: string;
  number: number;
  title: string;
  content: string;
  illustrations: IllustrationApiResponse[];
  published_at: string;
}

interface BookmarkApiResponse {
  id: number;
  novel_slug: string;
  chapter_number: number;
  created_at: string;
}

export interface AnalyticsDashboard {
  total_pv: number;
  novel_summaries: Array<{
    novel_slug: string;
    novel_title: string;
    total_views: number;
    completed_chapters: number;
    total_chapters: number;
    completion_rate: number;
    last_viewed_at: string | null;
  }>;
  chapter_details: Array<{
    novel_slug: string;
    chapter_number: number;
    chapter_title: string;
    views: number;
    read_percent: number;
  }>;
  daily_trend: Array<{ date: string; views: number }>;
}

// --- マッパー ---

function mapNovel(api: NovelApiResponse): Novel {
  return {
    id: String(api.id),
    slug: api.slug,
    title: api.title,
    genre: api.genre as Genre,
    tags: api.tags,
    synopsis: api.synopsis,
    characters: api.characters,
    coverImage: api.cover_image ?? "",
    rating: Number(api.rating),
    totalChapters: api.total_chapters,
    latestChapter: api.latest_chapter,
    updateSchedule: api.update_schedule ?? "",
    status: api.status as Novel["status"],
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function mapChapterSummary(
  api: ChapterSummaryApiResponse,
  novelSlug: string
): Chapter {
  return {
    id: String(api.id),
    novelSlug,
    number: api.number,
    title: api.title,
    content: "",
    illustrations: [],
    publishedAt: api.published_at,
  };
}

function mapChapter(api: ChapterApiResponse): Chapter {
  return {
    id: String(api.id),
    novelSlug: api.novel_slug,
    number: api.number,
    title: api.title,
    content: api.content,
    illustrations: api.illustrations.map((ill) => ({
      id: String(ill.id),
      url: ill.image_path,
      caption: ill.alt_text ?? undefined,
      insertAfterParagraph: ill.position,
    })),
    publishedAt: api.published_at,
  };
}

function mapBookmark(api: BookmarkApiResponse): Bookmark {
  return {
    novelSlug: api.novel_slug,
    chapterNumber: api.chapter_number,
    updatedAt: api.created_at,
  };
}

// --- 公開 API 関数 ---

export async function fetchNovels(genre?: string, sort?: string): Promise<Novel[]> {
  const params = new URLSearchParams();
  if (genre) params.set("genre", genre);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  const data = await apiFetch<NovelListApiResponse>(`/novels${qs ? `?${qs}` : ""}`);
  return data.items.map(mapNovel);
}

export async function fetchNovel(
  slug: string
): Promise<{ novel: Novel; chapters: Chapter[] }> {
  const data = await apiFetch<NovelDetailApiResponse>(`/novels/${slug}`);
  return {
    novel: mapNovel(data),
    chapters: data.chapters.map((c) => mapChapterSummary(c, slug)),
  };
}

export async function fetchChapter(slug: string, number: number): Promise<Chapter> {
  const data = await apiFetch<ChapterApiResponse>(`/novels/${slug}/chapters/${number}`);
  return mapChapter(data);
}

export async function searchNovels(q: string): Promise<Novel[]> {
  const data = await apiFetch<NovelListApiResponse>(
    `/novels/search?q=${encodeURIComponent(q)}`
  );
  return data.items.map(mapNovel);
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  const data = await apiFetch<BookmarkApiResponse[]>("/bookmarks", {}, true);
  return data.map(mapBookmark);
}

export async function upsertBookmark(
  novelSlug: string,
  chapterNumber: number
): Promise<Bookmark> {
  const data = await apiFetch<BookmarkApiResponse>(
    "/bookmarks",
    {
      method: "POST",
      body: JSON.stringify({ novel_slug: novelSlug, chapter_number: chapterNumber }),
    },
    true
  );
  return mapBookmark(data);
}

export async function deleteBookmark(novelSlug: string): Promise<void> {
  await apiFetch(
    `/bookmarks/${encodeURIComponent(novelSlug)}`,
    { method: "DELETE" },
    true
  );
}

export async function recordPageview(
  novelSlug: string,
  chapterNumber?: number
): Promise<void> {
  await apiFetch(
    "/analytics/pageview",
    {
      method: "POST",
      body: JSON.stringify({
        novel_slug: novelSlug,
        chapter_number: chapterNumber,
        session_id: getSessionId(),
      }),
    },
    true
  );
}

export async function fetchAnalytics(): Promise<AnalyticsDashboard> {
  return apiFetch<AnalyticsDashboard>("/analytics/dashboard", {}, true);
}
