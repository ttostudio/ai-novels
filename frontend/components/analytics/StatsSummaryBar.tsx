"use client";

interface Props {
  totalPV: number;
  averageCompletionRate: number;
}

export default function StatsSummaryBar({ totalPV, averageCompletionRate }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: "var(--panel)",
          border: "1px solid var(--border)",
        }}
        aria-label={`総ページビュー数: ${totalPV}`}
      >
        <p className="text-sm mb-1" style={{ color: "var(--muted)", fontFamily: "var(--font-ui)" }}>
          総PV
        </p>
        <p
          className="font-bold"
          style={{ fontSize: "2.25rem", color: "var(--text)", fontFamily: "var(--font-ui)" }}
        >
          {totalPV.toLocaleString()}
        </p>
      </div>

      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: "var(--panel)",
          border: "1px solid var(--border)",
        }}
        aria-label={`平均読了率: ${averageCompletionRate.toFixed(1)}%`}
      >
        <p className="text-sm mb-1" style={{ color: "var(--muted)", fontFamily: "var(--font-ui)" }}>
          平均読了率
        </p>
        <p
          className="font-bold"
          style={{ fontSize: "2.25rem", color: "var(--text)", fontFamily: "var(--font-ui)" }}
        >
          {averageCompletionRate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
