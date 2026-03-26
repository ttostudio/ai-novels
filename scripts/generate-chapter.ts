import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Character {
  name: string;
  role: string;
  description?: string;
}

interface Novel {
  id: string;
  slug: string;
  title: string;
  genre: string;
  synopsis: string;
  characters: Character[];
  totalChapters: number;
  latestChapter: number;
  updateSchedule: string;
  status: string;
}

interface NovelConfig {
  genre: string;
  title: string;
  characters: string[];
  synopsis: string;
}

async function generateChapter(
  novelConfig: NovelConfig,
  chapterNumber: number,
  previousSummary?: string
): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `あなたは日本語の小説家です。以下の設定で第${chapterNumber}話を執筆してください。

ジャンル: ${novelConfig.genre}
タイトル: ${novelConfig.title}
登場人物: ${novelConfig.characters.join(', ')}
あらすじ: ${novelConfig.synopsis}
前章までのまとめ: ${previousSummary || 'なし（第1話）'}

要件:
- 3000〜5000文字
- 章タイトルを含む（例: # 第${chapterNumber}話　タイトル名）
- 会話と描写のバランスを取る
- 読者を引き込む展開
- 次章への伏線を含む`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }
  return block.text;
}

function buildPreviousSummary(chapters: { title: string; content: string }[]): string {
  return chapters
    .map((ch) => {
      // Extract first non-heading paragraph as summary
      const lines = ch.content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      const snippet = lines.slice(0, 2).join(' ').slice(0, 200);
      return `「${ch.title}」: ${snippet}…`;
    })
    .join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const novelSlug = args[0];
  const chapterNumberArg = args[1] ? parseInt(args[1], 10) : undefined;

  if (!novelSlug) {
    console.error('Usage: tsx scripts/generate-chapter.ts <novel-slug> [chapter-number]');
    process.exit(1);
  }

  const novelsPath = path.resolve(__dirname, '../frontend/data/novels.json');
  const novels: Novel[] = JSON.parse(fs.readFileSync(novelsPath, 'utf-8'));
  const novel = novels.find((n) => n.slug === novelSlug);

  if (!novel) {
    console.error(`Novel not found: ${novelSlug}`);
    process.exit(1);
  }

  const chaptersPath = path.resolve(__dirname, `../frontend/data/chapters/${novelSlug}.json`);
  const existingChapters = fs.existsSync(chaptersPath)
    ? JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'))
    : [];

  const chapterNumber = chapterNumberArg ?? existingChapters.length + 1;

  const novelConfig: NovelConfig = {
    genre: novel.genre,
    title: novel.title,
    characters: novel.characters.map((c) => `${c.name}（${c.role}）`),
    synopsis: novel.synopsis,
  };

  const previousSummary =
    existingChapters.length > 0 ? buildPreviousSummary(existingChapters) : undefined;

  console.log(`Generating chapter ${chapterNumber} for "${novel.title}"...`);
  const content = await generateChapter(novelConfig, chapterNumber, previousSummary);

  // Extract chapter title from first heading
  const titleMatch = content.match(/^#\s+第\d+話[　\s]+(.+)/m);
  const chapterTitle = titleMatch ? titleMatch[1].trim() : `第${chapterNumber}話`;

  // Determine novel index for ID generation
  const novelIndex = novels.findIndex((n) => n.slug === novelSlug) + 1;
  const novelIdStr = String(novelIndex).padStart(3, '0');
  const chapterIdStr = String(chapterNumber).padStart(3, '0');

  const newChapter = {
    id: `ch-${novelIdStr}-${chapterIdStr}`,
    novelSlug,
    number: chapterNumber,
    title: chapterTitle,
    content,
    illustrations: [
      {
        id: `illust-${novelIdStr}-${chapterIdStr}`,
        url: `/illustrations/${novelSlug}/ch${chapterNumber}-scene.jpg`,
        caption: `第${chapterNumber}話の一場面`,
        insertAfterParagraph: 2,
      },
    ],
    publishedAt: new Date().toISOString(),
  };

  // Update or append chapter
  const chapterIdx = existingChapters.findIndex(
    (c: { number: number }) => c.number === chapterNumber
  );
  if (chapterIdx >= 0) {
    existingChapters[chapterIdx] = newChapter;
  } else {
    existingChapters.push(newChapter);
  }

  fs.writeFileSync(chaptersPath, JSON.stringify(existingChapters, null, 2), 'utf-8');
  console.log(`Chapter ${chapterNumber} saved to ${chaptersPath}`);
  console.log(`Title: ${chapterTitle}`);
  console.log(`Length: ${content.length} characters`);

  return newChapter;
}

const isMain =
  typeof import.meta !== 'undefined' && import.meta.url
    ? fileURLToPath(import.meta.url) === process.argv[1]
    : require.main === module;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { generateChapter, buildPreviousSummary, type NovelConfig };
