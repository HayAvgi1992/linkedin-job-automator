interface SkeletonCardProps {
  index?: number;
}

export function SkeletonCard({ index = 0 }: SkeletonCardProps) {
  return (
    <div
      className="skeleton-card stagger-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Title */}
      <div className="skeleton skeleton-line-lg w-3/4 mb-2" />
      {/* Company */}
      <div className="skeleton skeleton-line w-1/2 mb-3" />
      {/* Salary */}
      <div className="skeleton skeleton-line w-2/5 mb-3" />
      {/* Tags row */}
      <div className="flex gap-1.5 mb-3">
        <div className="skeleton w-16 h-5 rounded" />
        <div className="skeleton w-14 h-5 rounded" />
      </div>
      {/* Action buttons */}
      <div className="flex gap-1.5 pt-2.5 border-t border-edge">
        <div className="skeleton h-7 flex-1 rounded-md" />
        <div className="skeleton h-7 flex-1 rounded-md" />
        <div className="skeleton h-7 w-8 rounded-md" />
      </div>
    </div>
  );
}

export function SalarySkeleton() {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="skeleton w-20 h-4 rounded" />
      <div className="skeleton w-12 h-4 rounded" />
    </div>
  );
}
