import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Swords, Loader2, Clock, Flag, Shield, Skull } from 'lucide-react';
import { getSocket } from '../../services/socket';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface War {
  id: string;
  attackerKingdomId: string;
  attackerName: string;
  attackerRace: string;
  defenderKingdomId: string;
  defenderName: string;
  defenderRace: string;
  attackerScore: number;
  defenderScore: number;
  status: string;
  reason: string;
  startedAt: string;
}

interface WarBulletin {
  warId: string;
  attackerScore: number;
  defenderScore: number;
  recentEvents?: Array<{ description: string; timestamp: string }>;
}

interface WarBulletinUpdatePayload {
  warId: string;
  attackerScore: number;
  defenderScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function getScoreColor(myScore: number, theirScore: number): string {
  if (myScore > theirScore) return 'text-realm-success';
  if (myScore < theirScore) return 'text-realm-danger';
  return 'text-realm-gold-400';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WarDashboard() {
  const queryClient = useQueryClient();

  const { data: wars, isLoading } = useQuery<War[]>({
    queryKey: ['diplomacy', 'wars'],
    queryFn: async () => {
      const { default: api } = await import('../../services/api');
      const res = await api.get('/diplomacy/wars');
      const d = res.data;
      return Array.isArray(d) ? d : (d?.wars ?? []);
    },
  });

  const { data: bulletin } = useQuery<WarBulletin>({
    queryKey: ['diplomacy', 'war-bulletin'],
    queryFn: async () => {
      const { default: api } = await import('../../services/api');
      const res = await api.get('/world-events/war-bulletin');
      const d = res.data;
      // Backend returns { activeWars, recentWarEvents } — normalize to WarBulletin shape
      return {
        warId: d?.activeWars?.[0]?.id ?? '',
        attackerScore: d?.activeWars?.[0]?.attackerScore ?? 0,
        defenderScore: d?.activeWars?.[0]?.defenderScore ?? 0,
        recentEvents: (d?.recentWarEvents ?? []).map((e: any) => ({
          description: e.description ?? e.title ?? '',
          timestamp: e.createdAt ?? '',
        })),
      };
    },
  });

  // Listen for real-time war score updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onBulletinUpdate = (payload: WarBulletinUpdatePayload) => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy', 'wars'] });
      queryClient.invalidateQueries({ queryKey: ['diplomacy', 'war-bulletin'] });
    };

    socket.on('war:bulletin-update', onBulletinUpdate);
    return () => {
      socket.off('war:bulletin-update', onBulletinUpdate);
    };
  }, [queryClient]);

  const activeWars = (wars ?? []).filter(w => w.status === 'ACTIVE');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        <span className="ml-2 text-realm-text-secondary font-display">Loading war data...</span>
      </div>
    );
  }

  if (activeWars.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-10 h-10 text-realm-text-muted mx-auto mb-3" />
        <p className="text-realm-text-secondary font-display">Peace reigns across Aethermere</p>
        <p className="text-realm-text-muted text-xs mt-1">No active wars at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5 text-realm-danger" />
        <h3 className="font-display text-realm-danger text-lg">Active Conflicts ({activeWars.length})</h3>
      </div>

      {/* War cards */}
      <div className="grid gap-3">
        {activeWars.map((war, i) => {
          const totalScore = war.attackerScore + war.defenderScore;
          const attackerPct = totalScore > 0 ? (war.attackerScore / totalScore) * 100 : 50;
          return (
            <motion.div
              key={war.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-realm-bg-800 border border-realm-danger/20 rounded-lg p-4"
            >
              {/* Combatants */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-left">
                  <p className="text-realm-text-primary font-display text-sm">{war.attackerName}</p>
                  <p className="text-realm-text-muted text-[10px]">{war.attackerRace} (Attacker)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-realm-danger" />
                  <span className="text-realm-text-muted text-xs font-display">VS</span>
                  <Skull className="w-4 h-4 text-realm-danger" />
                </div>
                <div className="text-right">
                  <p className="text-realm-text-primary font-display text-sm">{war.defenderName}</p>
                  <p className="text-realm-text-muted text-[10px]">{war.defenderRace} (Defender)</p>
                </div>
              </div>

              {/* Score bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-display ${getScoreColor(war.attackerScore, war.defenderScore)}`}>
                    {war.attackerScore}
                  </span>
                  <span className="text-realm-text-muted text-[10px]">WAR SCORE</span>
                  <span className={`text-xs font-display ${getScoreColor(war.defenderScore, war.attackerScore)}`}>
                    {war.defenderScore}
                  </span>
                </div>
                <div className="h-2 bg-realm-bg-900 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                    style={{ width: `${attackerPct}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                    style={{ width: `${100 - attackerPct}%` }}
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-[10px] text-realm-text-muted">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duration: {formatDuration(war.startedAt)}
                </div>
                {war.reason && (
                  <div className="flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    {war.reason.length > 40 ? war.reason.slice(0, 40) + '...' : war.reason}
                  </div>
                )}
              </div>

              {/* Enlist placeholder */}
              <div className="mt-3 pt-2 border-t border-realm-border">
                <button
                  disabled
                  className="text-[10px] px-2 py-1 rounded bg-realm-bg-900 text-realm-text-muted border border-realm-border cursor-not-allowed font-display"
                >
                  Enlist (Coming Soon)
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent war events from bulletin */}
      {bulletin?.recentEvents && bulletin.recentEvents.length > 0 && (
        <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
          <h4 className="font-display text-realm-text-secondary text-xs mb-2">Recent War Events</h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {bulletin.recentEvents.map((evt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs border-l-2 border-realm-danger/30 pl-2">
                <span className="text-realm-text-muted whitespace-nowrap shrink-0 text-[10px]">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-realm-text-secondary">{evt.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
