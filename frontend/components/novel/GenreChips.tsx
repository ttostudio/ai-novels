import Link from "next/link";
import { GENRES } from "@/lib/types";

export default function GenreChips() {
  return (
    <section aria-labelledby="genre-heading">
      <h2 id="genre-heading" className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
        📚 ジャンル
      </h2>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            href={`/genre/${g.slug}`}
            className="px-4 py-2 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "var(--panel)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
            }}
          >
            {g.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
