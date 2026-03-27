"use client";

import type { ChapterAnalyticsDetail } from "@/hooks/useAnalytics";

interface Props {
  details: ChapterAnalyticsDetail[];
  novelTitle: string;
}

export default function ReadingProgressList({ details, novelTitle }: Props) {
  const barHeight = 28;
  const gap = 10;
  const labelWidth = 160;
  const barAreaWidth = 400;
  const percentLabelWidth = 60;
  const viewBoxWidth = labelWidth + barAreaWidth + percentLabelWidth + 20;
  const viewBoxHeight = details.length * (barHeight + gap) + 30;

  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold mb-4" style={{ color: "var(--text)", fontSize: "1rem" }}>
        読了率（{novelTitle}）
      </h3>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        role="img"
        aria-label={`${novelTitle}の章別読了率の横棒グラフ`}
      >
        <title>{novelTitle}の章別読了率</title>
        <desc>
          {details.map((d) => `第${d.chapterNumber}話「${d.chapterTitle}」: 読了率${d.views > 0 ? ((d.completed ? 1 : 0) / 1 * 100).toFixed(1) : "0.0"}%`).join("、")}
        </desc>

        {/* 100%基準線 */}
        <line
          x1={labelWidth + barAreaWidth}
          y1="0"
          x2={labelWidth + barAreaWidth}
          y2={viewBoxHeight}
          stroke="var(--border)"
          strokeWidth="2"
        />

        {details.map((detail, i) => {
          const y = i * (barHeight + gap) + 10;
          const completionPercent = detail.views > 0
            ? (detail.completed ? detail.readPercent : detail.readPercent)
            : 0;
          const barW = (completionPercent / 100) * barAreaWidth;
          const truncTitle =
            `第${detail.chapterNumber}話`.length + detail.chapterTitle.length > 12
              ? `第${detail.chapterNumber}話 ${detail.chapterTitle.slice(0, 6)}…`
              : `第${detail.chapterNumber}話 ${detail.chapterTitle}`;

          return (
            <g key={`${detail.novelSlug}-${detail.chapterNumber}`}>
              {/* 章ラベル */}
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--muted)"
                fontFamily="var(--font-ui)"
              >
                {truncTitle}
              </text>
              {/* 背景バー */}
              <rect
                x={labelWidth}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                rx="4"
                fill="var(--border)"
                opacity="0.4"
              />
              {/* 前景バー */}
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx="4"
                fill="var(--accent)"
                opacity="0.8"
                style={{ cursor: "pointer" }}
              >
                <title>{`第${detail.chapterNumber}話「${detail.chapterTitle}」: ${completionPercent.toFixed(1)}%`}</title>
              </rect>
              {/* %ラベル */}
              <text
                x={labelWidth + barAreaWidth + 10}
                y={y + barHeight / 2 + 4}
                textAnchor="start"
                fontSize="14"
                fill="var(--text)"
                fontFamily="var(--font-ui)"
              >
                {completionPercent.toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
