import Link from "next/link";
import type { Chapter } from "@/lib/types";

interface Props {
  novelSlug: string;
  chapters: Chapter[];
  latestChapter: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function ChapterList({ novelSlug, chapters, latestChapter }: Props) {
  return (
    <section aria-labelledby="chapter-list-heading">
      <h2 id="chapter-list-heading" className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
        📑 章一覧
      </h2>
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
        {chapters.map((chapter, i) => (
          <Link
            key={chapter.id}
            href={`/novel/${novelSlug}/${chapter.number}`}
            className="flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
            style={{
              borderBottom: i < chapters.length - 1 ? "1px solid var(--border)" : "none",
              backgroundColor: "var(--panel)",
              color: "var(--text)",
            }}
          >
            <span className="text-sm">
              第{chapter.number}話「{chapter.title}」
            </span>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
              <span>{formatDate(chapter.publishedAt)}</span>
              {chapter.number === latestChapter && (
                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                  NEW
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
