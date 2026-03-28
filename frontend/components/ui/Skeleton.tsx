interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: "var(--border)", ...style }}
      aria-hidden="true"
    />
  );
}

export function NovelCardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <Skeleton className="w-full aspect-[3/4]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function NovelGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <NovelCardSkeleton key={i} />
      ))}
    </div>
  );
}
