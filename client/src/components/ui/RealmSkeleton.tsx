import { RealmPanel } from './RealmPanel';

export function RealmSkeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-realm-bg-600 rounded animate-pulse ${className || ''}`} />
  );
}

export function SkeletonCard() {
  return (
    <RealmPanel className="p-4 space-y-3">
      <RealmSkeleton className="h-4 w-2/3" />
      <RealmSkeleton className="h-3 w-full" />
      <RealmSkeleton className="h-3 w-4/5" />
    </RealmPanel>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <RealmSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
