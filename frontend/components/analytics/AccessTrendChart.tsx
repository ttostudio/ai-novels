"use client";

import type { DailyPV } from "@/hooks/useAnalytics";

interface Props {
  data: DailyPV[];
}

export default function AccessTrendChart({ data }: Props) {
  if (data.length === 0) return null;

  const viewBoxWidth = 800;
  const viewBoxHeight = 200;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const chartW = viewBoxWidth - padding.left - padding.right;
  const chartH = viewBoxHeight - padding.top - padding.bottom;

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const yStep = Math.ceil(maxViews / 4);
  const yMax = yStep * 4;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padding.top + chartH - (d.views / yMax) * chartH;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold mb-4" style={{ color: "var(--text)", fontSize: "1rem" }}>
        最終アクセス日別PV分布
      </h3>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        role="img"
        aria-label="最終アクセス日別PV分布の折れ線グラフ"
      >
        <title>最終アクセス日別PV分布</title>
        <desc>
          {data.map((d) => `${d.date}: ${d.views}PV`).join("、")}
        </desc>

        {/* Y軸グリッド線 + ラベル */}
        {[0, 1, 2, 3, 4].map((i) => {
          const value = yStep * i;
          const y = padding.top + chartH - (value / yMax) * chartH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={viewBoxWidth - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4,4"
                opacity="0.3"
              />
              <text
                x={padding.left - 8}
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

        {/* 折れ線 */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* データポイント + X軸ラベル */}
        {points.map((p, i) => {
          const dateLabel = p.date.slice(5); // MM-DD
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--accent)" style={{ cursor: "pointer" }}>
                <title>{`${p.date}: ${p.views}PV`}</title>
              </circle>
              <text
                x={p.x}
                y={viewBoxHeight - 8}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted)"
                fontFamily="var(--font-ui)"
              >
                {dateLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
