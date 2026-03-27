"use client";

import type { NovelAnalyticsSummary } from "@/hooks/useAnalytics";

interface Props {
  summaries: NovelAnalyticsSummary[];
}

export default function NovelRankingCard({ summaries }: Props) {
  const maxViews = Math.max(...summaries.map((s) => s.totalViews), 1);
  const barWidth = 160;
  const barGap = 8;
  const barAreaWidth = summaries.length * barWidth + (summaries.length - 1) * barGap;
  const chartHeight = 300;
  const labelHeight = 60;
  const topPadding = 30;
  const barMaxHeight = chartHeight - labelHeight - topPadding;
  const viewBoxWidth = Math.max(barAreaWidth + 40, 300);

  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold mb-4" style={{ color: "var(--text)", fontSize: "1rem" }}>
        PVランキング（作品別）
      </h3>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}
        width="100%"
        role="img"
        aria-label="作品別PVランキングの縦棒グラフ"
      >
        <title>作品別PVランキング</title>
        <desc>
          {summaries.map((s) => `${s.novelTitle}: ${s.totalViews}PV`).join("、")}
        </desc>

        {/* Y軸グリッド線 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = topPadding + barMaxHeight * (1 - ratio);
          const value = Math.round(maxViews * ratio);
          return (
            <g key={ratio}>
              <line
                x1="20"
                y1={y}
                x2={viewBoxWidth - 20}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4,4"
                opacity="0.3"
              />
              <text
                x="16"
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--muted)"
                fontFamily="var(--font-ui)"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* バー */}
        {summaries.map((summary, i) => {
          const barH = summary.totalViews > 0
            ? (summary.totalViews / maxViews) * barMaxHeight
            : 0;
          const x = 20 + i * (barWidth + barGap);
          const y = topPadding + barMaxHeight - barH;
          const labelX = x + barWidth / 2;
          const truncTitle =
            summary.novelTitle.length > 8
              ? summary.novelTitle.slice(0, 7) + "…"
              : summary.novelTitle;

          return (
            <g key={summary.novelSlug} role="img" aria-label={`${summary.novelTitle}: ${summary.totalViews}PV`} className="ranking-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="4"
                fill="var(--border)"
                className="ranking-bar"
                style={{ cursor: "pointer", transition: "fill 0.2s ease" }}
              >
                <title>{`${summary.novelTitle}: ${summary.totalViews}PV`}</title>
              </rect>
              {/* PV数ラベル */}
              <text
                x={labelX}
                y={y - 6}
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="var(--text)"
                fontFamily="var(--font-ui)"
              >
                {summary.totalViews}
              </text>
              {/* 作品名 */}
              <text
                x={labelX}
                y={chartHeight - labelHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted)"
                fontFamily="var(--font-ui)"
              >
                {truncTitle}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
