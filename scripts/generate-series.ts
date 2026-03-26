import * as fs from 'fs';
import * as path from 'path';
import { generateChapter, buildPreviousSummary, type NovelConfig } from './generate-chapter';
import { generateIllustration } from './generate-illustration';

interface Novel {
  id: string;
  slug: string;
  title: string;
  genre: string;
  synopsis: string;
  characters: { name: string; role: string; description?: string }[];
  totalChapters: number;
  latestChapter: number;
  updateSchedule: string;
  status: string;
  updatedAt: string;
}

async function generateNextEpisode(novelSlug: string): Promise<void> {
  const novelsPath = path.resolve(__dirname, '../frontend/data/novels.json');
  const novels: Novel[] = JSON.parse(fs.readFileSync(novelsPath, 'utf-8'));
  const novel = novels.find((n) => n.slug === novelSlug);

  if (!novel) {
    throw new Error(`Novel not found: ${novelSlug}`);
  }

  if (novel.status === 'paused') {
    console.log(`Novel "${novel.title}" is paused. Skipping.`);
    return;
  }

  const chaptersPath = path.resolve(
    __dirname,
    `../frontend/data/chapters/${novelSlug}.json`
  );
  const existingChapters = fs.existsSync(chaptersPath)
    ? JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'))
    : [];

  const nextChapterNumber = existingChapters.length + 1;
  console.log(`\n=== Generating chapter ${nextChapterNumber} for "${novel.title}" ===\n`);

  // Build config
  const novelConfig: NovelConfig = {
    genre: novel.genre,
    title: novel.title,
    characters: novel.characters.map((c) => `${c.name}（${c.role}）`),
    synopsis: novel.synopsis,
  };

  const previousSummary =
    existingChapters.length > 0 ? buildPreviousSummary(existingChapters) : undefined;

  // Generate chapter text
  const content = await generateChapter(novelConfig, nextChapterNumber, previousSummary);

  // Extract title
  const titleMatch = content.match(/^#\s+第\d+話[　\s]+(.+)/m);
  const chapterTitle = titleMatch ? titleMatch[1].trim() : `第${nextChapterNumber}話`;

  // Build novel index for ID
  const novelIndex = novels.findIndex((n) => n.slug === novelSlug) + 1;
  const novelIdStr = String(novelIndex).padStart(3, '0');
  const chapterIdStr = String(nextChapterNumber).padStart(3, '0');

  const newChapter = {
    id: `ch-${novelIdStr}-${chapterIdStr}`,
    novelSlug,
    number: nextChapterNumber,
    title: chapterTitle,
    content,
    illustrations: [
      {
        id: `illust-${novelIdStr}-${chapterIdStr}`,
        url: `/illustrations/${novelSlug}/ch${nextChapterNumber}-scene.jpg`,
        caption: `第${nextChapterNumber}話の一場面`,
        insertAfterParagraph: 2,
      },
    ],
    publishedAt: new Date().toISOString(),
  };

  // Save chapter
  existingChapters.push(newChapter);
  fs.writeFileSync(chaptersPath, JSON.stringify(existingChapters, null, 2), 'utf-8');
  console.log(`Chapter saved: ${chapterTitle} (${content.length} chars)`);

  // Generate illustration
  try {
    await generateIllustration(novelSlug, nextChapterNumber, content, novel.genre);
  } catch (err) {
    console.warn(`Illustration generation failed (non-fatal): ${err}`);
    // Continue without illustration — placeholder URL is already set
  }

  // Update novels.json metadata
  const novelIdx = novels.findIndex((n) => n.slug === novelSlug);
  novels[novelIdx] = {
    ...novel,
    totalChapters: nextChapterNumber,
    latestChapter: nextChapterNumber,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(novelsPath, JSON.stringify(novels, null, 2), 'utf-8');
  console.log(`novels.json updated: totalChapters=${nextChapterNumber}`);

  console.log(`\n✓ Episode ${nextChapterNumber} of "${novel.title}" generated successfully.\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/generate-series.ts <novel-slug> [novel-slug2 ...]');
    console.error('       tsx scripts/generate-series.ts stellar-drift magic-academy');
    process.exit(1);
  }

  for (const slug of args) {
    await generateNextEpisode(slug);
  }

  console.log('\nAll episodes generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { generateNextEpisode };
