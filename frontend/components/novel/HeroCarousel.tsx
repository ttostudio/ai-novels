import NovelCard from "./NovelCard";
import type { Novel } from "@/lib/types";

interface Props {
  novels: Novel[];
}

export default function HeroCarousel({ novels }: Props) {
  return (
    <section aria-labelledby="featured-heading">
      <h2 id="featured-heading" className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
        🔥 注目の連載
      </h2>
      <div
        className="flex gap-4 overflow-x-auto snap-x pb-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        {novels.map((novel) => (
          <div key={novel.id} className="snap-start flex-shrink-0 w-48">
            <NovelCard novel={novel} />
          </div>
        ))}
      </div>
    </section>
  );
}
