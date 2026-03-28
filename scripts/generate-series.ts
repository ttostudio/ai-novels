/**
 * generate-series.ts — AI Novels 連載自動生成
 *
 * 6時間毎に実行（0, 6, 12, 18時 JST）:
 * 1. 全アクティブ作品の新章を生成（Claude Agent SDK）
 * 2. ComfyUI 稼働時は挿絵も同時生成（停止時はスキップ）
 * 3. 10% の確率で新規作品の連載開始（ジャンル・タイトル・あらすじを AI 生成）
 *
 * Usage:
 *   npx tsx scripts/generate-series.ts              # 全アクティブ作品
 *   npx tsx scripts/generate-series.ts stellar-drift # 指定作品のみ
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { generateChapter, buildPreviousSummary, type NovelConfig } from './generate-chapter';
import { generateIllustration } from './generate-illustration';
import { execSync } from 'child_process';

interface Novel {
  id: string;
  slug: string;
  title: string;
  genre: string;
  synopsis: string;
  characters: { name: string; role: string; description?: string }[];
  coverImage: string;
  rating: number;
  totalChapters: number;
  latestChapter: number;
  updateSchedule: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const NOVELS_PATH = path.resolve(__dirname, '../frontend/data/novels.json');
const CHAPTERS_DIR = path.resolve(__dirname, '../frontend/data/chapters');
const NEW_NOVEL_PROBABILITY = 0.1; // 10%
const GENRES = ['sf', 'fantasy', 'slice-of-life', 'mystery', 'romance', 'horror'];

// ─── ComfyUI ヘルスチェック ───

async function isComfyUIAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8188/system_stats', { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// ─── 新規作品生成 ───

async function generateNewNovel(): Promise<Novel | null> {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)];

  const prompt = `あなたは新しい連載小説の企画者です。以下のジャンルで新しい小説を企画してください。

ジャンル: ${genre}

以下のJSON形式で出力してください。JSON以外は出力しないでください:
{
  "title": "小説タイトル（日本語、魅力的なもの）",
  "synopsis": "あらすじ（200文字程度、読者を引き込む内容）",
  "characters": [
    {"name": "キャラ名", "role": "主人公", "description": "外見・性格の説明"},
    {"name": "キャラ名", "role": "ヒロイン/相棒", "description": "外見・性格の説明"}
  ]
}`;

  try {
    const text = execSync(
      `claude --print --model claude-haiku-4-5-20251001 --max-turns 1 -p ${JSON.stringify(prompt)}`,
      { encoding: 'utf-8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const data = JSON.parse(jsonMatch[0]);
    const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));

    const slug = 'novel-' + Date.now().toString(36);
    const id = 'n-' + String(novels.length + 1).padStart(3, '0');

    const newNovel: Novel = {
      id,
      slug,
      title: data.title,
      genre,
      synopsis: data.synopsis,
      characters: data.characters || [],
      coverImage: `/images/novels/${slug}/cover.jpg`,
      rating: 0,
      totalChapters: 0,
      latestChapter: 0,
      updateSchedule: '6時間毎',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    novels.push(newNovel);
    fs.writeFileSync(NOVELS_PATH, JSON.stringify(novels, null, 2), 'utf-8');

    // 空の章ファイル作成
    fs.mkdirSync(CHAPTERS_DIR, { recursive: true });
    fs.writeFileSync(path.join(CHAPTERS_DIR, `${slug}.json`), '[]', 'utf-8');

    console.log(`  ✨ 新規作品: "${data.title}" (${genre})`);
    return newNovel;
  } catch (err) {
    console.error('  ❌ 新規作品生成失敗:', err);
    return null;
  }
}

// ─── 1作品の新章生成 ───

async function generateNextEpisode(
  novelSlug: string,
  comfyAvailable: boolean
): Promise<void> {
  const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));
  const novel = novels.find((n) => n.slug === novelSlug);

  if (!novel) {
    throw new Error(`Novel not found: ${novelSlug}`);
  }

  if (novel.status === 'paused' || novel.status === 'completed') {
    console.log(`  ⏸️  "${novel.title}" は ${novel.status}。スキップ。`);
    return;
  }

  const chaptersPath = path.resolve(CHAPTERS_DIR, `${novelSlug}.json`);
  const existingChapters = fs.existsSync(chaptersPath)
    ? JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'))
    : [];

  const nextChapterNumber = existingChapters.length + 1;
  console.log(`  📝 第${nextChapterNumber}話 生成中...`);

  const novelConfig: NovelConfig = {
    genre: novel.genre,
    title: novel.title,
    characters: novel.characters.map((c) => `${c.name}（${c.role}）`),
    synopsis: novel.synopsis,
  };

  const previousSummary =
    existingChapters.length > 0 ? buildPreviousSummary(existingChapters) : undefined;

  const content = await generateChapter(novelConfig, nextChapterNumber, previousSummary);

  const titleMatch = content.match(/^#\s+第\d+話[　\s]+(.+)/m);
  const chapterTitle = titleMatch ? titleMatch[1].trim() : `第${nextChapterNumber}話`;

  const novelIndex = novels.findIndex((n) => n.slug === novelSlug) + 1;
  const novelIdStr = String(novelIndex).padStart(3, '0');
  const chapterIdStr = String(nextChapterNumber).padStart(3, '0');

  // 挿絵生成（ComfyUI 稼働時のみ）
  let illustrationUrl = '';
  if (comfyAvailable) {
    try {
      console.log(`  🎨 挿絵生成中...`);
      await generateIllustration(novelSlug, nextChapterNumber, content, novel.genre);
      illustrationUrl = `/illustrations/${novelSlug}/ch${nextChapterNumber}-scene.jpg`;
      console.log(`  🎨 挿絵完了`);
    } catch (err) {
      console.warn(`  ⚠️ 挿絵生成失敗（章は保存）: ${err}`);
    }
  }

  const newChapter = {
    id: `ch-${novelIdStr}-${chapterIdStr}`,
    novelSlug,
    number: nextChapterNumber,
    title: chapterTitle,
    content,
    illustrations: illustrationUrl
      ? [
          {
            id: `illust-${novelIdStr}-${chapterIdStr}`,
            url: illustrationUrl,
            caption: `第${nextChapterNumber}話の一場面`,
            insertAfterParagraph: 2,
          },
        ]
      : [],
    publishedAt: new Date().toISOString(),
  };

  existingChapters.push(newChapter);
  fs.writeFileSync(chaptersPath, JSON.stringify(existingChapters, null, 2), 'utf-8');

  // novels.json 更新
  const novelIdx = novels.findIndex((n) => n.slug === novelSlug);
  novels[novelIdx] = {
    ...novel,
    totalChapters: nextChapterNumber,
    latestChapter: nextChapterNumber,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(NOVELS_PATH, JSON.stringify(novels, null, 2), 'utf-8');

  console.log(`  ✅ "${chapterTitle}" (${content.length}文字)${illustrationUrl ? ' + 🎨' : ''}`);
}

// ─── メイン ───

async function main() {
  const args = process.argv.slice(2);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📖 AI Novels 連載生成 — ${new Date().toLocaleString('ja-JP')}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ComfyUI チェック
  const comfyAvailable = await isComfyUIAvailable();
  console.log(`🎨 ComfyUI: ${comfyAvailable ? '✅ 稼働中' : '⚠️ 停止中（挿絵スキップ）'}\n`);

  const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));

  // 指定作品 or 全アクティブ作品
  const targetSlugs =
    args.length > 0
      ? args
      : novels.filter((n) => n.status === 'active').map((n) => n.slug);

  console.log(`📚 対象作品: ${targetSlugs.length}件\n`);

  for (const slug of targetSlugs) {
    const novel = novels.find((n) => n.slug === slug);
    console.log(`── ${novel?.title || slug} ──`);
    try {
      await generateNextEpisode(slug, comfyAvailable);
    } catch (err) {
      console.error(`  ❌ 失敗: ${err}\n`);
    }
    console.log('');
  }

  // 新規作品開始（10% の確率、引数なし実行時のみ）
  if (args.length === 0) {
    if (Math.random() < NEW_NOVEL_PROBABILITY) {
      console.log('🎲 新規作品判定: 当選！');
      const newNovel = await generateNewNovel();
      if (newNovel) {
        console.log(`  📝 "${newNovel.title}" 第1話 生成中...`);
        try {
          await generateNextEpisode(newNovel.slug, comfyAvailable);
        } catch (err) {
          console.error(`  ❌ 第1話生成失敗: ${err}`);
        }
      }
    } else {
      console.log('🎲 新規作品判定: 見送り');
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ 完了');
  console.log(`${'═'.repeat(60)}\n`);

  // 自動デプロイフック
  try {
    console.log('📦 自動デプロイ実行中...');
    execSync('bash scripts/post-generate-hook.sh', { stdio: 'inherit', timeout: 60_000 });
  } catch {
    console.warn('⚠ 自動デプロイフック失敗（手動でデプロイしてください）');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export { generateNextEpisode, generateNewNovel, isComfyUIAvailable };
