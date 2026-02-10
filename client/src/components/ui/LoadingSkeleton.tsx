interface SkeletonProps {
  className?: string;
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`h-4 bg-dark-400 rounded animate-pulse ${className}`}
    />
  );
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`w-10 h-10 bg-dark-400 rounded-full animate-pulse flex-shrink-0 ${className}`}
    />
  );
}

export function SkeletonRow({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SkeletonAvatar className="w-8 h-8" />
      <div className="flex-1 space-y-2">
        <SkeletonText className="w-3/4" />
        <SkeletonText className="w-1/2 h-3" />
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-3 animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between">
        <SkeletonText className="w-2/5 h-5" />
        <SkeletonText className="w-16 h-4" />
      </div>
      <SkeletonText className="w-full h-3" />
      <SkeletonText className="w-4/5 h-3" />
      <div className="flex items-center justify-between pt-2">
        <SkeletonText className="w-20 h-4" />
        <SkeletonText className="w-12 h-4" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden animate-pulse">
      <div className="border-b border-dark-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonText key={i} className="flex-1 h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b border-dark-50 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonText key={j} className="flex-1 h-3" />
          ))}
        </div>
      ))}
    </div>
  );
}
