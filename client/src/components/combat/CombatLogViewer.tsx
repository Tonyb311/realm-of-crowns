import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  ChevronDown,
  ChevronUp,
  Info,
  Shield,
  Heart,
  Zap,
  Skull,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CombatAction {
  actor: string;
  action: string;
  damage?: number;
  healing?: number;
  effects?: string[];
  description?: string;
}

interface CombatRound {
  round: number;
  actions: CombatAction[];
}

interface CombatLog {
  combatants?: { name: string; level?: number; race?: string }[];
  rounds?: CombatRound[];
  outcome?: string;
  loot?: { name: string; quantity: number }[];
  summary?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CombatLogViewerProps {
  log: unknown;
}

export default function CombatLogViewer({ log }: CombatLogViewerProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  const combatLog = log as CombatLog;

  if (!combatLog || !combatLog.rounds || combatLog.rounds.length === 0) {
    return (
      <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-4">
        <p className="text-realm-text-muted text-xs">No combat log data available.</p>
      </div>
    );
  }

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  const outcomeColor = combatLog.outcome === 'WIN'
    ? 'text-realm-success border-realm-success/30 bg-realm-success/10'
    : combatLog.outcome === 'LOSS'
      ? 'text-realm-danger border-realm-danger/30 bg-realm-danger/10'
      : combatLog.outcome === 'RETREAT'
        ? 'text-realm-gold-400 border-realm-gold-500/30 bg-realm-gold-500/10'
        : 'text-realm-text-secondary border-realm-border bg-realm-bg-700/50';

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-center gap-2 p-2.5 bg-realm-bg-900 border border-realm-border rounded-lg">
        <Info className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
        <p className="text-realm-text-muted text-[10px]">
          This combat was resolved automatically during the daily tick.
        </p>
      </div>

      {/* Outcome */}
      {combatLog.outcome && (
        <div className={`flex items-center gap-2 p-3 border rounded-lg ${outcomeColor}`}>
          {combatLog.outcome === 'WIN' ? (
            <Swords className="w-5 h-5" />
          ) : combatLog.outcome === 'LOSS' ? (
            <Skull className="w-5 h-5" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
          <span className="font-display text-sm">
            {combatLog.outcome === 'WIN' ? 'Victory!'
              : combatLog.outcome === 'LOSS' ? 'Defeat'
              : combatLog.outcome === 'RETREAT' ? 'Retreated'
              : combatLog.outcome === 'DRAW' ? 'Draw'
              : combatLog.outcome}
          </span>
        </div>
      )}

      {/* Summary */}
      {combatLog.summary && (
        <p className="text-realm-text-secondary text-xs">{combatLog.summary}</p>
      )}

      {/* Combatants */}
      {combatLog.combatants && combatLog.combatants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {combatLog.combatants.map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-realm-bg-800 text-realm-text-secondary border border-realm-border"
            >
              {c.name}
              {c.level && <span className="text-realm-text-muted ml-1">Lv.{c.level}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Rounds */}
      <div className="space-y-1.5">
        {combatLog.rounds.map((round) => {
          const isExpanded = expandedRounds.has(round.round);
          return (
            <div key={round.round} className="border border-realm-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRound(round.round)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-realm-bg-800/50 transition-colors"
              >
                <span className="text-realm-text-primary text-xs font-display">
                  Round {round.round}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-realm-text-muted text-[10px]">
                    {round.actions.length} action{round.actions.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-realm-text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-realm-border px-2.5 pb-2.5 space-y-1.5">
                      {round.actions.map((action, i) => (
                        <ActionRow key={i} action={action} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Loot */}
      {combatLog.loot && combatLog.loot.length > 0 && (
        <div className="p-3 bg-realm-bg-800 border border-realm-gold-500/20 rounded-lg">
          <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1.5">Loot Received</p>
          <div className="space-y-0.5">
            {combatLog.loot.map((item, i) => (
              <p key={i} className="text-realm-text-primary text-xs">
                {item.name} x{item.quantity}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action row
// ---------------------------------------------------------------------------

function ActionRow({ action }: { action: CombatAction }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-realm-bg-900/50 rounded mt-1.5">
      <span className="text-realm-text-primary text-[10px] font-display shrink-0 w-20 truncate">
        {action.actor}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-realm-text-secondary text-[10px]">{action.action}</p>
        {action.description && (
          <p className="text-realm-text-muted text-[10px]">{action.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {action.damage != null && action.damage > 0 && (
            <span className="text-realm-danger text-[10px] flex items-center gap-0.5">
              <Swords className="w-2.5 h-2.5" /> {action.damage}
            </span>
          )}
          {action.healing != null && action.healing > 0 && (
            <span className="text-realm-success text-[10px] flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5" /> +{action.healing}
            </span>
          )}
          {action.effects && action.effects.map((eff, i) => (
            <span key={i} className="text-realm-teal-300 text-[10px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> {eff}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
