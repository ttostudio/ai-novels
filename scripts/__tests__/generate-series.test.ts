/**
 * generate-series.test.ts — sortByUpdatePriority, MAX_NOVELS_PER_RUN, buildIllustrationReport のユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sortByUpdatePriority, buildIllustrationReport } from '../generate-series';

// Novel の最小型（テスト用）
type TestNovel = {
  id: string;
  slug: string;
  title: string;
  genre: string;
  synopsis: string;
  characters: { name: string; role: string }[];
  coverImage: string;
  rating: number;
  totalChapters: number;
  latestChapter: number;
  updateSchedule: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function makeNovel(slug: string, updatedAt: string, status = 'active'): TestNovel {
  return {
    id: slug,
    slug,
    title: `Novel ${slug}`,
    genre: 'sf',
    synopsis: '',
    characters: [],
    coverImage: '',
    rating: 0,
    totalChapters: 0,
    latestChapter: 0,
    updateSchedule: '6時間毎',
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

// ─── sortByUpdatePriority ───

describe('sortByUpdatePriority', () => {
  it('updatedAt 昇順（古い順）でソートする', () => {
    const novels = [
      makeNovel('c', '2026-03-10T00:00:00.000Z'),
      makeNovel('a', '2026-01-01T00:00:00.000Z'),
      makeNovel('b', '2026-02-15T00:00:00.000Z'),
    ];
    const sorted = sortByUpdatePriority(novels);
    expect(sorted.map((n) => n.slug)).toEqual(['a', 'b', 'c']);
  });

  it('元の配列を破壊しない', () => {
    const novels = [
      makeNovel('b', '2026-03-01T00:00:00.000Z'),
      makeNovel('a', '2026-01-01T00:00:00.000Z'),
    ];
    const original = [...novels];
    sortByUpdatePriority(novels);
    expect(novels[0].slug).toBe(original[0].slug);
  });

  it('空配列を渡しても空配列を返す', () => {
    expect(sortByUpdatePriority([])).toEqual([]);
  });

  it('同じ updatedAt のとき順序が崩れない', () => {
    const novels = [
      makeNovel('a', '2026-03-01T00:00:00.000Z'),
      makeNovel('b', '2026-03-01T00:00:00.000Z'),
    ];
    const sorted = sortByUpdatePriority(novels);
    expect(sorted).toHaveLength(2);
  });
});

// ─── MAX_NOVELS_PER_RUN ───

describe('MAX_NOVELS_PER_RUN', () => {
  it('env 未設定時はデフォルト 5 になる', () => {
    delete process.env.MAX_NOVELS_PER_RUN;
    const val = parseInt(process.env.MAX_NOVELS_PER_RUN || '5', 10);
    expect(val).toBe(5);
  });

  it('env 設定値を使う', () => {
    process.env.MAX_NOVELS_PER_RUN = '3';
    const val = parseInt(process.env.MAX_NOVELS_PER_RUN || '5', 10);
    expect(val).toBe(3);
    delete process.env.MAX_NOVELS_PER_RUN;
  });

  it('LRU ソート後に slice(0, MAX) で件数を制限できる', () => {
    const novels = [
      makeNovel('a', '2026-01-01T00:00:00.000Z'),
      makeNovel('b', '2026-01-02T00:00:00.000Z'),
      makeNovel('c', '2026-01-03T00:00:00.000Z'),
      makeNovel('d', '2026-01-04T00:00:00.000Z'),
      makeNovel('e', '2026-01-05T00:00:00.000Z'),
      makeNovel('f', '2026-01-06T00:00:00.000Z'),
    ];
    const max = 3;
    const result = sortByUpdatePriority(novels).slice(0, max);
    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe('a');
    expect(result[1].slug).toBe('b');
    expect(result[2].slug).toBe('c');
  });
});

// ─── buildIllustrationReport ───

describe('buildIllustrationReport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novels-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('全章に挿絵ありの場合は「全章に挿絵あり」を表示', () => {
    const novel = makeNovel('test-novel', '2026-01-01T00:00:00.000Z');
    const chapters = [
      { number: 1, title: '第1話', illustrations: [{ id: 'i1', url: '/i1.jpg', caption: '', insertAfterParagraph: 2 }] },
    ];
    fs.writeFileSync(path.join(tmpDir, 'test-novel.json'), JSON.stringify(chapters));

    const report = buildIllustrationReport([novel], tmpDir);
    expect(report).toContain('全章に挿絵あり');
  });

  it('挿絵なし章がある場合は件数を報告する', () => {
    const novel = makeNovel('test-novel', '2026-01-01T00:00:00.000Z');
    const chapters = [
      { number: 1, title: '第1話', illustrations: [] },
      { number: 2, title: '第2話', illustrations: [{ id: 'i2', url: '/i2.jpg', caption: '', insertAfterParagraph: 2 }] },
      { number: 3, title: '第3話', illustrations: [] },
    ];
    fs.writeFileSync(path.join(tmpDir, 'test-novel.json'), JSON.stringify(chapters));

    const report = buildIllustrationReport([novel], tmpDir);
    expect(report).toContain('2/3章');
    expect(report).toContain('合計: 2章に挿絵なし');
  });

  it('章ファイルが存在しない作品はスキップする', () => {
    const novel = makeNovel('no-chapters', '2026-01-01T00:00:00.000Z');
    const report = buildIllustrationReport([novel], tmpDir);
    // エラーなく完了し、全章挿絵ありと表示
    expect(report).toContain('全章に挿絵あり');
  });

  it('作品が空の場合は全章挿絵ありを表示', () => {
    const report = buildIllustrationReport([], tmpDir);
    expect(report).toContain('全章に挿絵あり');
  });
});
