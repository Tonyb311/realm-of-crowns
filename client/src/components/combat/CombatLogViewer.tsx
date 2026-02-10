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
      <div className="bg-dark-400 border border-dark-50 rounded-lg p-4">
        <p className="text-parchment-500 text-xs">No combat log data available.</p>
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
    ? 'text-green-400 border-green-500/30 bg-green-500/10'
    : combatLog.outcome === 'LOSS'
      ? 'text-red-400 border-red-500/30 bg-red-500/10'
      : combatLog.outcome === 'RETREAT'
        ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
        : 'text-parchment-300 border-parchment-500/30 bg-parchment-500/10';

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-center gap-2 p-2.5 bg-dark-500 border border-dark-50 rounded-lg">
        <Info className="w-4 h-4 text-parchment-500 flex-shrink-0" />
        <p className="text-parchment-500 text-[10px]">
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
        <p className="text-parchment-300 text-xs">{combatLog.summary}</p>
      )}

      {/* Combatants */}
      {combatLog.combatants && combatLog.combatants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {combatLog.combatants.map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-dark-400 text-parchment-300 border border-dark-50"
            >
              {c.name}
              {c.level && <span className="text-parchment-500 ml-1">Lv.{c.level}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Rounds */}
      <div className="space-y-1.5">
        {combatLog.rounds.map((round) => {
          const isExpanded = expandedRounds.has(round.round);
          return (
            <div key={round.round} className="border border-dark-50 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRound(round.round)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-dark-400/50 transition-colors"
              >
                <span className="text-parchment-200 text-xs font-display">
                  Round {round.round}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-parchment-500 text-[10px]">
                    {round.actions.length} action{round.actions.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-parchment-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-parchment-500" />
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
                    <div className="border-t border-dark-50 px-2.5 pb-2.5 space-y-1.5">
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
        <div className="p-3 bg-dark-400 border border-primary-400/20 rounded-lg">
          <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1.5">Loot Received</p>
          <div className="space-y-0.5">
            {combatLog.loot.map((item, i) => (
              <p key={i} className="text-parchment-200 text-xs">
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
    <div className="flex items-start gap-2 p-2 bg-dark-500/50 rounded mt-1.5">
      <span className="text-parchment-200 text-[10px] font-display shrink-0 w-20 truncate">
        {action.actor}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-parchment-300 text-[10px]">{action.action}</p>
        {action.description && (
          <p className="text-parchment-500 text-[10px]">{action.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {action.damage != null && action.damage > 0 && (
            <span className="text-red-400 text-[10px] flex items-center gap-0.5">
              <Swords className="w-2.5 h-2.5" /> {action.damage}
            </span>
          )}
          {action.healing != null && action.healing > 0 && (
            <span className="text-green-400 text-[10px] flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5" /> +{action.healing}
            </span>
          )}
          {action.effects && action.effects.map((eff, i) => (
            <span key={i} className="text-purple-400 text-[10px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> {eff}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
