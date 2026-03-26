import Link from "next/link";
import type { Novel } from "@/lib/types";
import { GENRE_LABELS } from "@/lib/types";

interface Props {
  novel: Novel;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="star-rating text-sm" aria-label={`評価 ${rating}`}>
      {"★".repeat(full)}
      {half ? "☆" : ""}
      <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default function NovelCard({ novel }: Props) {
  return (
    <Link href={`/novel/${novel.slug}`} className="novel-card block rounded-lg overflow-hidden" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
      {/* Cover image placeholder */}
      <div className="illust-placeholder h-48 w-full" role="img" aria-label={`${novel.title} カバー画像`}>
        <span className="text-4xl">📖</span>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base mb-1 line-clamp-2" style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}>
          {novel.title}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>
            {GENRE_LABELS[novel.genre]}
          </span>
          {novel.status === "paused" && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
              休止中
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>第{novel.latestChapter}話</span>
          <StarRating rating={novel.rating} />
        </div>
      </div>
    </Link>
  );
}
