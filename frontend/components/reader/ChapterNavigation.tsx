import Link from "next/link";

interface Props {
  novelSlug: string;
  currentChapter: number;
  totalChapters: number;
  prevTitle?: string;
  nextTitle?: string;
  nextChapter?: {
    title: string;
    previewText: string;
  };
}

export default function ChapterNavigation({
  novelSlug,
  currentChapter,
  totalChapters,
  prevTitle,
  nextChapter,
}: Props) {
  const hasPrev = currentChapter > 1;
  const hasNext = currentChapter < totalChapters;

  return (
    <nav
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 mt-8 gap-4"
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
        nextChapter ? (
          <Link
            href={`/novel/${novelSlug}/${currentChapter + 1}`}
            className="novel-card block rounded-lg p-4 w-full sm:w-auto sm:max-w-xs"
            style={{
              backgroundColor: "var(--panel)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
            aria-label={`次の話へ: 第${currentChapter + 1}話「${nextChapter.title}」`}
          >
            <p className="text-xs mb-1" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
              次の話
            </p>
            <p className="font-bold text-sm mb-2" style={{ color: "var(--text)" }}>
              第{currentChapter + 1}話「{nextChapter.title}」
            </p>
            {nextChapter.previewText && (
              <p
                className="text-xs mb-2 line-clamp-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-reading)" }}
              >
                {nextChapter.previewText}
              </p>
            )}
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              続きを読む →
            </span>
          </Link>
        ) : (
          <Link
            href={`/novel/${novelSlug}/${currentChapter + 1}`}
            className="flex items-center gap-2 px-4 py-2 rounded hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            第{currentChapter + 1}話 →
          </Link>
        )
      ) : (
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          最終話
        </div>
      )}
    </nav>
  );
}
