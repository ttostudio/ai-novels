import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{ borderTopColor: "var(--border)", backgroundColor: "var(--panel)" }}
      className="border-t mt-16"
    >
      <div className="max-w-content mx-auto px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          © 2026 AI Novels — AI が生み出す物語の世界
        </p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/" className="text-xs hover:opacity-80" style={{ color: "var(--muted)" }}>
            ホーム
          </Link>
          <Link href="/bookmarks" className="text-xs hover:opacity-80" style={{ color: "var(--muted)" }}>
            ブックマーク
          </Link>
        </div>
      </div>
    </footer>
  );
}
