/**
 * batch-generate-new-novels.ts
 * 新規追加作品の第1話を一括生成する
 *
 * Usage:
 *   npx tsx scripts/batch-generate-new-novels.ts
 *   npx tsx scripts/batch-generate-new-novels.ts detective-cafe  # 指定作品のみ
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const NOVELS_PATH = path.resolve(__dirname, '../frontend/data/novels.json');
const CHAPTERS_DIR = path.resolve(__dirname, '../frontend/data/chapters');

interface Novel {
  id: string;
  slug: string;
  title: string;
  genre: string;
  synopsis: string;
  characters: { name: string; role: string; description?: string }[];
  totalChapters: number;
  latestChapter: number;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

function buildPrompt(novel: Novel, chapterNum: number, previousSummary?: string): string {
  const charDesc = novel.characters
    .map(c => `・${c.name}（${c.role}）: ${c.description || ''}`)
    .join('\n');

  const prevSection = previousSummary
    ? `\n【前話までのあらすじ】\n${previousSummary}\n`
    : '';

  return `あなたは日本語の小説家です。以下の設定で第${chapterNum}話を執筆してください。

【作品情報】
タイトル: ${novel.title}
ジャンル: ${novel.genre}
あらすじ: ${novel.synopsis}

【登場人物】
${charDesc}
${prevSection}
【執筆指示】
- 第${chapterNum}話として自然な導入を書いてください
- 3000〜4000文字程度
- 文体: 三人称視点、現代的な日本語
- 最初の行に「# 第${chapterNum}話　タイトル」の形式でタイトルを入れること
- 読者を引き込む書き出しにしてください
- JSON等のフォーマットは不要。本文のみ出力してください`;
}

async function generateChapterText(prompt: string): Promise<string> {
  const result = execSync(
    `claude --print --model claude-haiku-4-5-20251001 --max-turns 1 -p ${JSON.stringify(prompt)}`,
    { encoding: 'utf-8', timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }
  );
  return result.trim();
}

function extractTitle(content: string, chapterNum: number): string {
  const match = content.match(/^#\s*第\d+話[　\s]+(.+)/m);
  return match ? match[1].trim() : `第${chapterNum}話`;
}

async function generateChapter(novel: Novel, chapterNum: number, previousSummary?: string): Promise<void> {
  const chaptersPath = path.resolve(CHAPTERS_DIR, `${novel.slug}.json`);
  const existing: any[] = fs.existsSync(chaptersPath)
    ? JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'))
    : [];

  // 既に存在する場合はスキップ
  if (existing.some(c => c.number === chapterNum)) {
    console.log(`  ⏭  第${chapterNum}話は既に存在します`);
    return;
  }

  console.log(`  📝 第${chapterNum}話 生成中...`);
  const prompt = buildPrompt(novel, chapterNum, previousSummary);
  const content = await generateChapterText(prompt);
  const title = extractTitle(content, chapterNum);

  const chapterData = {
    id: `${novel.slug}-ch${String(chapterNum).padStart(3, '0')}`,
    novelSlug: novel.slug,
    number: chapterNum,
    title,
    content,
    publishedAt: new Date().toISOString(),
    illustrations: []
  };

  existing.push(chapterData);
  fs.writeFileSync(chaptersPath, JSON.stringify(existing, null, 2), 'utf-8');

  // novels.json を更新
  const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));
  const idx = novels.findIndex(n => n.slug === novel.slug);
  if (idx >= 0) {
    novels[idx].totalChapters = Math.max(novels[idx].totalChapters, chapterNum);
    novels[idx].latestChapter = Math.max(novels[idx].latestChapter, chapterNum);
    novels[idx].updatedAt = new Date().toISOString();
    fs.writeFileSync(NOVELS_PATH, JSON.stringify(novels, null, 2), 'utf-8');
  }

  console.log(`  ✅ "${title}" (${content.length}文字)`);
}

async function main() {
  const args = process.argv.slice(2);
  const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));

  // 対象: 指定slug or 第1話がない作品
  const targets = args.length > 0
    ? novels.filter(n => args.includes(n.slug))
    : novels.filter(n => n.totalChapters === 0 && n.status === 'active');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📚 バッチ生成 — ${targets.length}作品`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const novel of targets) {
    console.log(`── ${novel.title} (${novel.slug}) ──`);
    try {
      await generateChapter(novel, 1);
    } catch (err) {
      console.error(`  ❌ 失敗: ${err}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(60)}`);
  console.log('✅ 完了');
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
