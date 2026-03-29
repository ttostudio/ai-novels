/**
 * backfill-illustrations.ts — 挿絵なしの章に後から挿絵を追加
 *
 * ComfyUI が稼働していることが前提。停止中はエラーで終了。
 * 1章ずつ順次処理（ComfyUI 負荷対策）。
 *
 * Usage: npx tsx scripts/backfill-illustrations.ts [novel-slug]
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { generateIllustration } from './generate-illustration';

interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  content: string;
  illustrations: { id: string; url: string; caption: string; insertAfterParagraph: number }[];
  publishedAt: string;
}

interface Novel {
  slug: string;
  title: string;
  genre: string;
  status: string;
}

const NOVELS_PATH = path.resolve(__dirname, '../frontend/data/novels.json');
const CHAPTERS_DIR = path.resolve(__dirname, '../frontend/data/chapters');

async function isComfyUIAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8188/system_stats', { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);

  console.log('\n🎨 AI Novels 挿絵バックフィル\n');

  // ComfyUI 稼働チェック
  const available = await isComfyUIAvailable();
  if (!available) {
    // ComfyUI 停止はエラーではなく正常終了（cron/サブプロセス呼出時にエラー扱いにしない）
    console.log('⚠️ ComfyUI (localhost:8188) が停止しています。挿絵バックフィルをスキップします。');
    process.exit(0);
  }
  console.log('✅ ComfyUI 稼働確認\n');

  const novels: Novel[] = JSON.parse(fs.readFileSync(NOVELS_PATH, 'utf-8'));
  const targetNovels = args.length > 0
    ? novels.filter((n) => args.includes(n.slug))
    : novels.filter((n) => n.status === 'active');

  let totalMissing = 0;
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const novel of targetNovels) {
    const chaptersPath = path.join(CHAPTERS_DIR, `${novel.slug}.json`);
    if (!fs.existsSync(chaptersPath)) {
      console.log(`⚠️ ${novel.title}: 章ファイルなし、スキップ`);
      continue;
    }

    const chapters: Chapter[] = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));
    const missing = chapters.filter(
      (ch) => !ch.illustrations || ch.illustrations.length === 0
    );

    if (missing.length === 0) {
      console.log(`✅ ${novel.title}: 全${chapters.length}章に挿絵あり`);
      continue;
    }

    console.log(`📖 ${novel.title}: ${missing.length}/${chapters.length}章に挿絵なし\n`);
    totalMissing += missing.length;

    for (const chapter of missing) {
      console.log(`  🎨 第${chapter.number}話「${chapter.title}」生成中...`);

      try {
        await generateIllustration(
          novel.slug,
          chapter.number,
          chapter.content,
          novel.genre
        );

        // 章データ更新
        const novelIndex = novels.findIndex((n) => n.slug === novel.slug) + 1;
        const novelIdStr = String(novelIndex).padStart(3, '0');
        const chapterIdStr = String(chapter.number).padStart(3, '0');

        chapter.illustrations = [
          {
            id: `illust-${novelIdStr}-${chapterIdStr}`,
            url: `/illustrations/${novel.slug}/ch${chapter.number}-scene.jpg`,
            caption: `第${chapter.number}話の一場面`,
            insertAfterParagraph: 2,
          },
        ];

        totalGenerated++;
        console.log(`  ✅ 完了\n`);

        // ComfyUI 負荷対策: 5秒待機
        await sleep(5000);
      } catch (err) {
        totalFailed++;
        console.error(`  ❌ 失敗: ${err}\n`);
      }
    }

    // 更新を保存
    fs.writeFileSync(chaptersPath, JSON.stringify(chapters, null, 2), 'utf-8');
    console.log(`  💾 ${novel.slug}.json 保存\n`);
  }

  console.log('─'.repeat(40));
  console.log(`📊 結果: 対象 ${totalMissing}章, 生成 ${totalGenerated}章, 失敗 ${totalFailed}章`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
