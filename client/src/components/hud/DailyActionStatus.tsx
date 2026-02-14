import { useQuery } from '@tanstack/react-query';
import { Zap, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import Tooltip from '../ui/Tooltip';
import { TickCountdown } from './TickCountdown';

interface ActionStatusResponse {
  gameDay: number;
  actionUsed: boolean;
  actionType: string | null;
  resetsAt: string;
  timeUntilResetMs: number;
}

/**
 * Compact HUD component showing the player's daily action status.
 * - If action available: gold accent with subtle pulse
 * - If action used: muted, shows what was committed
 * - Always shows countdown to next tick
 */
export function DailyActionStatus() {
  const { data } = useQuery<ActionStatusResponse>({
    queryKey: ['game', 'action-status'],
    queryFn: async () => (await api.get('/game/action-status')).data,
    refetchInterval: 60_000,
  });

  if (!data) return null;

  const { actionUsed, actionType } = data;

  if (actionUsed) {
    return (
      <Tooltip content={`Daily action used: ${actionType ?? 'Unknown'}. Resets at next tick.`} position="bottom">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-realm-bg-600/40 border border-realm-border">
          <CheckCircle className="w-3 h-3 text-realm-text-muted flex-shrink-0" />
          <span className="text-[10px] text-realm-text-muted truncate max-w-[80px] hidden sm:inline">
            {actionType ?? 'Used'}
          </span>
          <div className="w-px h-3 bg-realm-border hidden sm:block" />
          <TickCountdown showLabel={false} />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="You have 1 daily action available. Gather, travel, or craft!" position="bottom">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-realm-gold-400/10 border border-realm-gold-400/30 animate-pulse-subtle">
        <Zap className="w-3 h-3 text-realm-gold-400 flex-shrink-0" />
        <span className="text-[10px] text-realm-gold-400 font-display whitespace-nowrap hidden sm:inline">
          1 Action
        </span>
        <div className="w-px h-3 bg-realm-gold-400/20 hidden sm:block" />
        <TickCountdown showLabel={false} />
      </div>
    </Tooltip>
  );
}
