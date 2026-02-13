import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import api from '../../services/api';
import Tooltip from '../ui/Tooltip';

interface GameDayResponse {
  gameDay: number;
  nextTickAt: string;
  timeUntilResetMs: number;
}

/**
 * Formats a millisecond duration into a human-readable countdown string.
 * Shows "Xh Ym" for durations > 5 minutes, "Xm Ys" when close.
 */
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Now';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

interface TickCountdownProps {
  /** Extra CSS classes */
  className?: string;
  /** Whether to show the label "Next Day:" prefix (default true) */
  showLabel?: boolean;
}

export function TickCountdown({ className = '', showLabel = true }: TickCountdownProps) {
  const { data } = useQuery<GameDayResponse>({
    queryKey: ['game', 'day'],
    queryFn: async () => (await api.get('/game/day')).data,
    refetchInterval: 60_000, // re-sync with server every minute
  });

  const [remaining, setRemaining] = useState<number>(0);

  // Sync remaining from server response
  useEffect(() => {
    if (!data?.nextTickAt) return;
    const target = new Date(data.nextTickAt).getTime();
    setRemaining(Math.max(0, target - Date.now()));
  }, [data?.nextTickAt]);

  // Client-side countdown tick
  const tick = useCallback(() => {
    if (!data?.nextTickAt) return;
    const target = new Date(data.nextTickAt).getTime();
    setRemaining(Math.max(0, target - Date.now()));
  }, [data?.nextTickAt]);

  useEffect(() => {
    // When < 5 minutes, tick every second; otherwise every minute
    const intervalMs = remaining > 0 && remaining <= 5 * 60 * 1000 ? 1000 : 60_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, remaining]);

  if (!data) return null;

  const isImminent = remaining > 0 && remaining <= 5 * 60 * 1000;

  return (
    <Tooltip content={`Game Day ${data.gameDay} -- resets at ${new Date(data.nextTickAt).toLocaleTimeString()}`}>
      <div
        className={`flex items-center gap-1 text-[10px] tabular-nums ${
          isImminent
            ? 'text-realm-gold-400 animate-pulse'
            : 'text-realm-text-muted'
        } ${className}`}
      >
        <Clock className="w-3 h-3 flex-shrink-0" />
        {showLabel && <span>Next Day:</span>}
        <span className="font-display">{formatCountdown(remaining)}</span>
      </div>
    </Tooltip>
  );
}
