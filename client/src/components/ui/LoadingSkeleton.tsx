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

// Page-level skeleton: Character/Profile page
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-dark-500 pt-12 animate-pulse">
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-dark-300 rounded-lg border-2 border-dark-50" />
            <div className="flex-1 space-y-2">
              <SkeletonText className="w-48 h-7" />
              <SkeletonText className="w-32 h-4" />
              <SkeletonText className="w-24 h-3" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-3">
            <SkeletonText className="w-20 h-5" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <SkeletonText className="w-12 h-3" />
                  <SkeletonText className="w-8 h-5" />
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}

// Page-level skeleton: Inventory page
export function InventorySkeleton() {
  return (
    <div className="min-h-screen bg-dark-500 pt-12 animate-pulse">
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="w-40 h-7" />
            <SkeletonText className="w-24 h-4" />
          </div>
          <SkeletonText className="w-32 h-9 rounded" />
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-dark-300 border border-dark-50 rounded-lg p-4 space-y-2">
              <div className="w-12 h-12 bg-dark-400 rounded mx-auto" />
              <SkeletonText className="w-3/4 mx-auto h-4" />
              <SkeletonText className="w-1/2 mx-auto h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Page-level skeleton: Combat page
export function CombatSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Initiative bar */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg px-4 py-3 flex items-center gap-2">
        <SkeletonText className="w-16 h-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonText key={i} className="w-20 h-7 rounded" />
        ))}
      </div>
      {/* Combatants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-dark-300 border border-dark-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-dark-400 rounded-lg" />
              <div className="flex-1 space-y-2">
                <SkeletonText className="w-24 h-4" />
                <SkeletonText className="w-16 h-3" />
              </div>
            </div>
            <SkeletonText className="w-full h-3 rounded-full" />
            <SkeletonText className="w-full h-3 rounded-full" />
          </div>
        ))}
      </div>
      {/* Action bar */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonText key={i} className="w-24 h-10 rounded" />
        ))}
      </div>
    </div>
  );
}

// Page-level skeleton: Kingdom page
export function KingdomSkeleton() {
  return (
    <div className="min-h-screen bg-dark-500 pt-12 animate-pulse">
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-dark-300 rounded" />
            <div className="space-y-2">
              <SkeletonText className="w-48 h-7" />
              <SkeletonText className="w-28 h-4" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <SkeletonCard />
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-2">
              <SkeletonText className="w-28 h-3" />
              <SkeletonText className="w-20 h-7" />
            </div>
            <SkeletonCard />
          </div>
          <div className="lg:col-span-2 space-y-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}

// Page-level skeleton: Town Hall page
export function TownHallSkeleton() {
  return (
    <div className="min-h-screen bg-dark-500 pt-12 animate-pulse">
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-dark-300 rounded" />
            <div className="space-y-2">
              <SkeletonText className="w-36 h-7" />
              <SkeletonText className="w-24 h-4" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-2">
              <SkeletonText className="w-20 h-3" />
              <SkeletonText className="w-16 h-7" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
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
