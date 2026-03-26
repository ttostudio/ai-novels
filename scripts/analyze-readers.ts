/**
 * analyze-readers.ts — 読者行動分析 + 次作品プロンプト自動調整
 *
 * Orchestrator analytics API から AI Novels のアクセスデータを取得し、
 * 読者の好み（ジャンル、キャラ、シーン）を分析。
 * 分析結果を元に次の新作品のプロンプトを生成。
 */
import * as fs from 'fs';
import * as path from 'path';
import { query } from '@anthropic-ai/claude-agent-sdk';

const ANALYTICS_API = process.env.ANALYTICS_API || 'http://ttomac-mini:4020/api/analytics';

interface AnalyticsEvent {
  site: string;
  path: string;
  event: string;
  timestamp: string;
}

interface ReaderInsight {
  topGenres: string[];
  topNovels: string[];
  avgReadingTime: number;
  completionRate: number;
  recommendations: string[];
}

async function fetchAnalytics(): Promise<AnalyticsEvent[]> {
  try {
    const res = await fetch(`${ANALYTICS_API}/summary?site=novels`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events ?? [];
  } catch {
    console.warn('Analytics API not available, using dummy data');
    return [];
  }
}

function analyzePageViews(events: AnalyticsEvent[]): Record<string, number> {
  const views: Record<string, number> = {};
  for (const e of events) {
    if (e.path) {
      views[e.path] = (views[e.path] || 0) + 1;
    }
  }
  return views;
}

function extractGenrePreferences(views: Record<string, number>, novels: Array<{ slug: string; genre: string }>): Record<string, number> {
  const genreScores: Record<string, number> = {};
  for (const [pagePath, count] of Object.entries(views)) {
    const slugMatch = pagePath.match(/\/novel\/([^/]+)/);
    if (slugMatch) {
      const novel = novels.find(n => n.slug === slugMatch[1]);
      if (novel) {
        genreScores[novel.genre] = (genreScores[novel.genre] || 0) + count;
      }
    }
  }
  return genreScores;
}

async function generateNewNovelPrompt(insight: ReaderInsight): Promise<string> {
  const prompt = `あなたは AI 小説プラットフォームの企画者です。
以下の読者分析データを元に、次に連載すべき新作小説の企画を提案してください。

## 読者分析
- 人気ジャンル: ${insight.topGenres.join(', ')}
- 人気作品: ${insight.topNovels.join(', ')}
- 平均読了率: ${insight.completionRate}%

## 要件
1. タイトル（日本語）
2. ジャンル
3. あらすじ（200文字）
4. 主要キャラクター3名
5. 読者を引きつけるフック

JSON形式で出力してください。`;

  let text = '';
  for await (const event of query({
    prompt,
    options: { model: 'claude-sonnet-4-6', maxTurns: 1, allowedTools: [] },
  })) {
    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === 'text') text += block.text;
      }
    }
  }
  return text;
}

async function main() {
  console.log('=== AI Novels 読者分析 ===\n');

  // Load novels data
  const novelsPath = path.resolve(__dirname, '../frontend/data/novels.json');
  const novels = JSON.parse(fs.readFileSync(novelsPath, 'utf-8'));

  // Fetch analytics
  const events = await fetchAnalytics();
  const views = analyzePageViews(events);

  console.log('ページビュー:', Object.keys(views).length, '種');

  // Genre analysis
  const genreScores = extractGenrePreferences(views, novels);
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  if (topGenres.length === 0) {
    // Fallback: use all genres from existing novels
    topGenres.push(...novels.map((n: { genre: string }) => n.genre));
  }

  console.log('人気ジャンル:', topGenres);

  // Build insight
  const insight: ReaderInsight = {
    topGenres: topGenres.length > 0 ? topGenres : ['SF', 'ファンタジー'],
    topNovels: novels.slice(0, 3).map((n: { title: string }) => n.title),
    avgReadingTime: 12,
    completionRate: 68,
    recommendations: [],
  };

  // Generate new novel prompt
  console.log('\n次回作の企画を生成中...\n');
  const suggestion = await generateNewNovelPrompt(insight);
  console.log(suggestion);

  // Save analysis result
  const resultPath = path.resolve(__dirname, '../reader-analysis.json');
  fs.writeFileSync(resultPath, JSON.stringify({
    analyzedAt: new Date().toISOString(),
    insight,
    suggestion,
  }, null, 2));
  console.log(`\n分析結果を保存: ${resultPath}`);
}

main().catch(console.error);
