"use client";

import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import StatsSummaryBar from "@/components/analytics/StatsSummaryBar";
import NovelRankingCard from "@/components/analytics/NovelRankingCard";
import ReadingProgressList from "@/components/analytics/ReadingProgressList";
import AccessTrendChart from "@/components/analytics/AccessTrendChart";

export default function AnalyticsDashboardClient() {
  const { hasData, getNovelSummaries, getChapterDetails, getDailyPVTrend } = useAnalyticsDashboard();

  if (!hasData) {
    return (
      <div
        className="rounded-lg p-12 text-center"
        style={{
          backgroundColor: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        <p className="text-lg mb-2">まだデータがありません</p>
        <p className="text-sm">小説を読み始めると、ここに分析データが表示されます。</p>
      </div>
    );
  }

  const summaries = getNovelSummaries();
  const trend = getDailyPVTrend();

  const totalPV = summaries.reduce((sum, s) => sum + s.totalViews, 0);
  const avgRate =
    summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.completionRate, 0) / summaries.length
      : 0;

  // 最もPVが多い作品の読了率詳細を表示
  const topNovel = summaries[0];

  return (
    <div className="space-y-6">
      <StatsSummaryBar totalPV={totalPV} averageCompletionRate={avgRate} />

      {trend.length > 0 && <AccessTrendChart data={trend} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NovelRankingCard summaries={summaries} />
        {topNovel && (
          <ReadingProgressList
            details={getChapterDetails(topNovel.novelSlug)}
            novelTitle={topNovel.novelTitle}
          />
        )}
      </div>

      {/* 2番目以降の作品の読了率 */}
      {summaries.slice(1).map((novel) => {
        const details = getChapterDetails(novel.novelSlug);
        if (details.length === 0) return null;
        return (
          <ReadingProgressList
            key={novel.novelSlug}
            details={details}
            novelTitle={novel.novelTitle}
          />
        );
      })}
    </div>
  );
}
