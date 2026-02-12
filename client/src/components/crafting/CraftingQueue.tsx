import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Loader2 } from 'lucide-react';

export interface QueueItem {
  id: string;
  index: number;
  recipeId: string;
  recipeName: string;
  startedAt: string;
  completesAt: string;
  ready: boolean;
  remainingMinutes: number;
}

interface CraftingQueueProps {
  queue: QueueItem[];
  isLoading: boolean;
  onCollect: () => void;
  isCollecting: boolean;
}

export default function CraftingQueue({ queue, isLoading, onCollect, isCollecting }: CraftingQueueProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (queue.length === 0) return;
    const hasActive = queue.some((q) => !q.ready);
    if (!hasActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [queue]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <Clock className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm">No active crafting.</p>
        <p className="text-realm-text-muted/60 text-xs mt-1">Start a recipe from the Recipes tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((item) => {
        const completesAt = new Date(item.completesAt).getTime();
        const startedAt = new Date(item.startedAt).getTime();
        const totalDuration = completesAt - startedAt;
        const elapsed = now - startedAt;
        const isReady = item.ready || completesAt <= now;
        const progress = isReady ? 100 : Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        const remaining = isReady ? 0 : Math.max(0, completesAt - now);
        const remainingMin = Math.floor(remaining / 60000);
        const remainingSec = Math.ceil((remaining % 60000) / 1000);
        const isFirst = item.index === 1 || queue.indexOf(item) === 0;

        return (
          <div
            key={item.id}
            className={`bg-realm-bg-700 border rounded-lg p-4 ${
              isReady ? 'border-realm-success/50' : 'border-realm-border'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isReady ? (
                <CheckCircle2 className="w-5 h-5 text-realm-success flex-shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-realm-text-primary text-sm truncate">
                    {item.recipeName}
                  </h4>
                  <span className="text-[10px] text-realm-text-muted flex-shrink-0">
                    #{item.index}
                  </span>
                </div>
                <p className="text-[10px] text-realm-text-muted">
                  {isReady ? 'Ready to collect!' : `${remainingMin}m ${remainingSec}s remaining`}
                </p>
              </div>
              {isReady && isFirst && (
                <button
                  onClick={onCollect}
                  disabled={isCollecting}
                  className="px-4 py-1.5 bg-realm-success text-realm-text-primary font-display text-xs rounded
                    hover:bg-realm-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isCollecting ? 'Collecting...' : 'Collect'}
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-realm-bg-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isReady ? 'bg-realm-success' : 'bg-realm-gold-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
