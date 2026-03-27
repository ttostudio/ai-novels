import type { Metadata } from "next";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export const metadata: Metadata = {
  title: "読者分析ダッシュボード",
};

export default function AnalyticsPage() {
  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: "var(--max-width-content)" }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        読者分析ダッシュボード
      </h1>
      <AnalyticsDashboardClient />
    </div>
  );
}
