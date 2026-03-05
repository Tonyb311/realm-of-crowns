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
  Code,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — new DB format (RoundLogEntry)
// ---------------------------------------------------------------------------

interface RoundLogEntry {
  round: number;
  actor: string;
  actorId?: string;
  action: string;
  attackRoll?: { raw: number; modifiers: any[]; total: number };
  targetAC?: number;
  hit?: boolean;
  isCritical?: boolean;
  damageRoll?: { dice: string; rolls: number[]; modifiers: any[]; total: number; type?: string };
  targetHpBefore?: number;
  targetHpAfter?: number;
  targetKilled?: boolean;
  weaponName?: string;
  abilityName?: string;
  healAmount?: number;
  statusEffectsApplied?: string[];
  statusEffectsExpired?: string[];
  hpAfter?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CombatLogViewerProps {
  log: unknown;
}

export default function CombatLogViewer({ log }: CombatLogViewerProps) {
  const [showRounds, setShowRounds] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [showRaw, setShowRaw] = useState(false);

  if (!log || typeof log !== 'object') {
    return (
      <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-4">
        <p className="text-realm-text-muted text-xs">No combat log data available.</p>
      </div>
    );
  }

  const data = log as any;

  // Detect new format: has monsterName field
  const isNewFormat = 'monsterName' in data;

  if (!isNewFormat) {
    return <LegacyCombatLogViewer log={data} />;
  }

  // --- New format rendering ---
  const outcome = data.outcome ?? 'UNKNOWN';
  const outcomeColor = outcome === 'win' || outcome === 'WIN'
    ? 'text-realm-success border-realm-success/30 bg-realm-success/10'
    : outcome === 'loss' || outcome === 'LOSS'
      ? 'text-realm-danger border-realm-danger/30 bg-realm-danger/10'
      : outcome === 'retreat' || outcome === 'RETREAT'
        ? 'text-realm-gold-400 border-realm-gold-500/30 bg-realm-gold-500/10'
        : 'text-realm-text-secondary border-realm-border bg-realm-bg-700/50';

  const outcomeLabel = (outcome === 'win' || outcome === 'WIN') ? 'Victory!'
    : (outcome === 'loss' || outcome === 'LOSS') ? 'Defeat'
    : (outcome === 'retreat' || outcome === 'RETREAT') ? 'Retreated'
    : (outcome === 'draw' || outcome === 'DRAW') ? 'Draw'
    : outcome;

  const outcomeIcon = (outcome === 'win' || outcome === 'WIN') ? Swords
    : (outcome === 'loss' || outcome === 'LOSS') ? Skull
    : Shield;

  const OutcomeIcon = outcomeIcon;

  // Parse rounds
  const rawRounds: any[] = Array.isArray(data.rounds) ? data.rounds : [];
  let encounterContext: any = null;
  const roundEntries: RoundLogEntry[] = [];

  for (const entry of rawRounds) {
    if (entry._encounterContext) {
      encounterContext = entry._encounterContext;
    } else if (entry.round != null) {
      roundEntries.push(entry as RoundLogEntry);
    }
  }

  // Group entries by round number
  const roundGroups = new Map<number, RoundLogEntry[]>();
  for (const entry of roundEntries) {
    const existing = roundGroups.get(entry.round) ?? [];
    existing.push(entry);
    roundGroups.set(entry.round, existing);
  }

  // Determine player name from encounter context
  const playerName = encounterContext?.combatants?.find((c: any) => c.team === 0)?.name ?? 'Player';

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  const loot: any[] = data.loot ?? [];

  return (
    <div className="space-y-3">
      {/* Outcome banner */}
      <div className={`flex items-center gap-2 p-3 border rounded-lg ${outcomeColor}`}>
        <OutcomeIcon className="w-5 h-5" />
        <div className="flex-1">
          <span className="font-display text-sm">{outcomeLabel}</span>
          {data.monsterName && (
            <span className="text-xs ml-2 opacity-75">vs {data.monsterName}</span>
          )}
        </div>
        {data.totalRounds != null && (
          <span className="text-[10px] opacity-60">{data.totalRounds} rounds</span>
        )}
      </div>

      {/* Summary text */}
      {data.summary && (
        <p className="text-realm-text-secondary text-xs italic">{data.summary}</p>
      )}

      {/* Rewards */}
      <div className="flex flex-wrap gap-3">
        {data.xpAwarded != null && data.xpAwarded > 0 && (
          <span className="text-realm-teal-300 text-xs">+{data.xpAwarded} XP</span>
        )}
        {data.goldAwarded != null && data.goldAwarded > 0 && (
          <span className="text-realm-gold-400 text-xs">+{data.goldAwarded} gold</span>
        )}
      </div>

      {/* Loot */}
      {loot.length > 0 && (
        <div className="p-3 bg-realm-bg-800 border border-realm-gold-500/20 rounded-lg">
          <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1.5">Loot Received</p>
          <div className="space-y-0.5">
            {loot.map((item: any, i: number) => (
              <p key={i} className="text-realm-text-primary text-xs">
                {item.name ?? item.itemName} x{item.quantity ?? 1}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* HP summary */}
      {(data.characterStartHp != null || data.opponentStartHp != null) && (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-realm-bg-900 rounded p-2">
            <p className="text-realm-text-muted mb-0.5">{playerName}</p>
            <p className="text-realm-text-primary">
              HP: {data.characterStartHp} &rarr; {data.characterEndHp}
            </p>
          </div>
          <div className="bg-realm-bg-900 rounded p-2">
            <p className="text-realm-text-muted mb-0.5">{data.monsterName ?? 'Monster'}</p>
            <p className="text-realm-text-primary">
              HP: {data.opponentStartHp} &rarr; {data.opponentEndHp}
            </p>
          </div>
        </div>
      )}

      {/* Expandable round detail */}
      {roundEntries.length > 0 && (
        <div>
          <button
            onClick={() => setShowRounds(!showRounds)}
            className="flex items-center gap-1.5 text-realm-text-muted text-[10px] hover:text-realm-text-secondary transition-colors"
          >
            {showRounds ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showRounds ? 'Hide' : 'Show'} Round Detail ({roundGroups.size} rounds)
          </button>

          <AnimatePresence>
            {showRounds && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 mt-2">
                  {Array.from(roundGroups.entries()).map(([roundNum, entries]) => {
                    const isExpanded = expandedRounds.has(roundNum);
                    return (
                      <div key={roundNum} className="border border-realm-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleRound(roundNum)}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-realm-bg-800/50 transition-colors"
                        >
                          <span className="text-realm-text-primary text-xs font-display">
                            Round {roundNum}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-realm-text-muted text-[10px]">
                              {entries.length} action{entries.length !== 1 ? 's' : ''}
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
                                {entries.map((entry, i) => (
                                  <RoundEntryRow key={i} entry={entry} playerName={playerName} />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Raw JSON toggle */}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="flex items-center gap-1 text-realm-text-muted text-[10px] hover:text-realm-text-secondary transition-colors"
      >
        <Code className="w-3 h-3" />
        {showRaw ? 'Hide' : 'Show'} Raw Data
      </button>
      {showRaw && (
        <pre className="bg-realm-bg-900 border border-realm-border rounded p-3 text-[9px] text-realm-text-muted overflow-auto max-h-60">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round entry row (new DB format)
// ---------------------------------------------------------------------------

function RoundEntryRow({ entry, playerName }: { entry: RoundLogEntry; playerName: string }) {
  const isPlayer = entry.actor === playerName || entry.actorId?.startsWith('player');
  const actorColor = isPlayer ? 'text-realm-gold-400' : 'text-realm-danger';

  // Build action description
  let actionDesc = entry.action;
  if (entry.abilityName) {
    actionDesc = entry.abilityName;
  } else if (entry.weaponName) {
    actionDesc = `${entry.action} (${entry.weaponName})`;
  }

  // Hit/miss
  let hitDesc = '';
  if (entry.attackRoll) {
    const critLabel = entry.isCritical ? ' CRIT!' : '';
    hitDesc = entry.hit
      ? `Hit (${entry.attackRoll.total} vs AC ${entry.targetAC})${critLabel}`
      : `Miss (${entry.attackRoll.total} vs AC ${entry.targetAC})`;
  }

  return (
    <div className="flex items-start gap-2 p-2 bg-realm-bg-900/50 rounded mt-1.5">
      <span className={`text-[10px] font-display shrink-0 w-20 truncate ${actorColor}`}>
        {entry.actor}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-realm-text-secondary text-[10px]">{actionDesc}</p>
        {hitDesc && (
          <p className={`text-[10px] ${entry.hit ? 'text-realm-text-primary' : 'text-realm-text-muted'}`}>
            {hitDesc}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {entry.damageRoll && entry.damageRoll.total > 0 && (
            <span className="text-realm-danger text-[10px] flex items-center gap-0.5">
              <Swords className="w-2.5 h-2.5" /> {entry.damageRoll.total}
              {entry.damageRoll.type && <span className="opacity-60 ml-0.5">{entry.damageRoll.type}</span>}
            </span>
          )}
          {entry.healAmount != null && entry.healAmount > 0 && (
            <span className="text-realm-success text-[10px] flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5" /> +{entry.healAmount}
            </span>
          )}
          {entry.targetKilled && (
            <span className="text-realm-danger text-[10px] flex items-center gap-0.5">
              <Skull className="w-2.5 h-2.5" /> Killed!
            </span>
          )}
          {entry.statusEffectsApplied && entry.statusEffectsApplied.map((eff, i) => (
            <span key={`a-${i}`} className="text-realm-teal-300 text-[10px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> +{eff}
            </span>
          ))}
          {entry.statusEffectsExpired && entry.statusEffectsExpired.map((eff, i) => (
            <span key={`e-${i}`} className="text-realm-text-muted text-[10px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> -{eff}
            </span>
          ))}
        </div>
        {entry.targetHpBefore != null && entry.targetHpAfter != null && (
          <p className="text-realm-text-muted text-[9px] mt-0.5">
            Target HP: {entry.targetHpBefore} &rarr; {entry.targetHpAfter}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy format viewer (old CombatRound with actions[] arrays)
// ---------------------------------------------------------------------------

interface LegacyCombatAction {
  actor: string;
  action: string;
  damage?: number;
  healing?: number;
  effects?: string[];
  description?: string;
}

interface LegacyCombatRound {
  round: number;
  actions: LegacyCombatAction[];
}

function LegacyCombatLogViewer({ log }: { log: any }) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  const rounds: LegacyCombatRound[] = log.rounds ?? [];

  if (rounds.length === 0) {
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

  const outcomeColor = log.outcome === 'WIN'
    ? 'text-realm-success border-realm-success/30 bg-realm-success/10'
    : log.outcome === 'LOSS'
      ? 'text-realm-danger border-realm-danger/30 bg-realm-danger/10'
      : log.outcome === 'RETREAT'
        ? 'text-realm-gold-400 border-realm-gold-500/30 bg-realm-gold-500/10'
        : 'text-realm-text-secondary border-realm-border bg-realm-bg-700/50';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2.5 bg-realm-bg-900 border border-realm-border rounded-lg">
        <Info className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
        <p className="text-realm-text-muted text-[10px]">
          This combat was resolved automatically during the daily tick.
        </p>
      </div>

      {log.outcome && (
        <div className={`flex items-center gap-2 p-3 border rounded-lg ${outcomeColor}`}>
          {log.outcome === 'WIN' ? <Swords className="w-5 h-5" /> : log.outcome === 'LOSS' ? <Skull className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          <span className="font-display text-sm">
            {log.outcome === 'WIN' ? 'Victory!' : log.outcome === 'LOSS' ? 'Defeat' : log.outcome === 'RETREAT' ? 'Retreated' : log.outcome === 'DRAW' ? 'Draw' : log.outcome}
          </span>
        </div>
      )}

      {log.summary && <p className="text-realm-text-secondary text-xs">{log.summary}</p>}

      {log.combatants && log.combatants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {log.combatants.map((c: any, i: number) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-realm-bg-800 text-realm-text-secondary border border-realm-border">
              {c.name}{c.level && <span className="text-realm-text-muted ml-1">Lv.{c.level}</span>}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {rounds.map((round) => {
          const isExpanded = expandedRounds.has(round.round);
          return (
            <div key={round.round} className="border border-realm-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRound(round.round)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-realm-bg-800/50 transition-colors"
              >
                <span className="text-realm-text-primary text-xs font-display">Round {round.round}</span>
                <div className="flex items-center gap-2">
                  <span className="text-realm-text-muted text-[10px]">
                    {round.actions.length} action{round.actions.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-realm-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted" />}
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
                        <div key={i} className="flex items-start gap-2 p-2 bg-realm-bg-900/50 rounded mt-1.5">
                          <span className="text-realm-text-primary text-[10px] font-display shrink-0 w-20 truncate">
                            {action.actor}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-realm-text-secondary text-[10px]">{action.action}</p>
                            {action.description && <p className="text-realm-text-muted text-[10px]">{action.description}</p>}
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
                              {action.effects && action.effects.map((eff, j) => (
                                <span key={j} className="text-realm-teal-300 text-[10px] flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> {eff}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {log.loot && log.loot.length > 0 && (
        <div className="p-3 bg-realm-bg-800 border border-realm-gold-500/20 rounded-lg">
          <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1.5">Loot Received</p>
          <div className="space-y-0.5">
            {log.loot.map((item: any, i: number) => (
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
