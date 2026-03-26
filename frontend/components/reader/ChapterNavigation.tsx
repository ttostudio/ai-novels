import Link from "next/link";

interface Props {
  novelSlug: string;
  currentChapter: number;
  totalChapters: number;
  prevTitle?: string;
  nextTitle?: string;
}

export default function ChapterNavigation({
  novelSlug,
  currentChapter,
  totalChapters,
  prevTitle,
  nextTitle,
}: Props) {
  const hasPrev = currentChapter > 1;
  const hasNext = currentChapter < totalChapters;

  return (
    <nav
      className="flex items-center justify-between py-6 mt-8"
      style={{ borderTop: "1px solid var(--border)" }}
      aria-label="章ナビゲーション"
    >
      {hasPrev ? (
        <Link
          href={`/novel/${novelSlug}/${currentChapter - 1}`}
          className="flex items-center gap-2 px-4 py-2 rounded hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--accent)" }}
        >
          ← 第{currentChapter - 1}話{prevTitle ? `「${prevTitle}」` : ""}
        </Link>
      ) : (
        <div />
      )}

      {hasNext ? (
        <Link
          href={`/novel/${novelSlug}/${currentChapter + 1}`}
          className="flex items-center gap-2 px-4 py-2 rounded hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--accent)" }}
        >
          第{currentChapter + 1}話{nextTitle ? `「${nextTitle}」` : ""} →
        </Link>
      ) : (
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          最終話
        </div>
      )}
    </nav>
  );
}
