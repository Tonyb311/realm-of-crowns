import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Timer, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface CycleStatus {
  cycleId: string;
  startedAt: string;
  timeRemainingMs: number;
  pendingOrders: number;
  status: string;
}

export default function AuctionTimer() {
  const queryClient = useQueryClient();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const { data: cycle, isLoading } = useQuery<CycleStatus>({
    queryKey: ['market', 'cycle-status'],
    queryFn: async () => (await api.get('/market/cycle-status')).data,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!cycle) return;
    setRemainingMs(cycle.timeRemainingMs);
  }, [cycle]);

  useEffect(() => {
    if (remainingMs === null || remainingMs <= 0) return;

    const id = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev === null) return null;
        const next = prev - 1000;
        if (next <= 0) {
          // Cycle resolved -- refetch market data
          queryClient.invalidateQueries({ queryKey: ['market'] });
          queryClient.invalidateQueries({ queryKey: ['characters', 'current'] });
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [remainingMs, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-realm-bg-700 border border-realm-border rounded">
        <Loader2 className="w-3.5 h-3.5 text-realm-text-muted animate-spin" />
        <span className="text-realm-text-muted text-xs font-display">Loading...</span>
      </div>
    );
  }

  if (!cycle || remainingMs === null) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isResolving = totalSeconds <= 0;
  const isUrgent = totalSeconds <= 60 && totalSeconds > 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
        isResolving
          ? 'bg-realm-gold-400/10 border-realm-gold-400/40'
          : isUrgent
            ? 'bg-realm-danger/10 border-realm-danger/40'
            : 'bg-realm-bg-700 border-realm-border'
      }`}
    >
      <Timer
        className={`w-3.5 h-3.5 ${
          isResolving
            ? 'text-realm-gold-400 animate-pulse'
            : isUrgent
              ? 'text-realm-danger'
              : 'text-realm-gold-400'
        }`}
      />
      {isResolving ? (
        <span className="text-realm-gold-400 text-xs font-display animate-pulse">
          Resolving auction...
        </span>
      ) : (
        <span
          className={`text-xs font-display ${
            isUrgent ? 'text-realm-danger' : 'text-realm-gold-400'
          }`}
        >
          Next auction in: {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      )}
      {cycle.pendingOrders > 0 && !isResolving && (
        <span className="text-realm-text-muted text-[10px] ml-1">
          ({cycle.pendingOrders} pending)
        </span>
      )}
    </div>
  );
}
