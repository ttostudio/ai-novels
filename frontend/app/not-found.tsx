import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

export default function NotFound() {
  return (
    <div className="max-w-content mx-auto px-4 py-24 text-center">
      <p className="text-6xl mb-6">📚</p>
      <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>
        ページが見つかりません
      </h1>
      <p className="text-base mb-8" style={{ color: "var(--muted)" }}>
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        トップページへ
      </Link>
    </div>
  );
}
