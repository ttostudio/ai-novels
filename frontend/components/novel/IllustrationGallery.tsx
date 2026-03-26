import type { Illustration } from "@/lib/types";

interface Props {
  illustrations: Illustration[];
}

export default function IllustrationGallery({ illustrations }: Props) {
  if (illustrations.length === 0) return null;

  return (
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
        🖼️ 挿絵ギャラリー
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {illustrations.map((illust) => (
          <div
            key={illust.id}
            className="illust-placeholder aspect-square rounded overflow-hidden"
            role="img"
            aria-label={illust.caption ?? "挿絵"}
            title={illust.caption}
          >
            <span className="text-2xl">🎨</span>
          </div>
        ))}
      </div>
    </section>
  );
}
