import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  Swords,
  Heart,
  Zap,
  Target,
} from 'lucide-react';
import TurnResultDisplay from './TurnResultDisplay';

interface Participant {
  id?: string;
  team: number;
  character: { id: string; name: string; race?: string; class?: string; level?: number };
}

interface LogEntry {
  round: number;
  actorId: string;
  action: string;
  result: any;
}

interface CombatReplayProps {
  logs: LogEntry[];
  participants: Participant[];
  attackerParams?: any;
  defenderParams?: any;
}

interface RoundGroup {
  round: number;
  entries: LogEntry[];
}

interface CombatSummary {
  totalDamage: number;
  totalHealing: number;
  crits: number;
  abilitiesUsed: number;
  roundsTotal: number;
}

function buildNameMap(
  participants: Participant[],
  attackerParams?: any,
  defenderParams?: any,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const p of participants) {
    const id = p.id ?? p.character.id;
    map.set(id, p.character.name);
    if (p.character.id !== id) {
      map.set(p.character.id, p.character.name);
    }
  }

  // PvE monsters stored in attacker/defender params
  if (attackerParams?.name && attackerParams?.monsterId) {
    map.set(attackerParams.monsterId, attackerParams.name);
  }
  if (defenderParams?.name && defenderParams?.monsterId) {
    map.set(defenderParams.monsterId, defenderParams.name);
  }
  // Also handle when the monster id is stored as `id`
  if (attackerParams?.name && attackerParams?.id && !map.has(attackerParams.id)) {
    map.set(attackerParams.id, attackerParams.name);
  }
  if (defenderParams?.name && defenderParams?.id && !map.has(defenderParams.id)) {
    map.set(defenderParams.id, defenderParams.name);
  }

  return map;
}

function groupByRound(logs: LogEntry[]): RoundGroup[] {
  const map = new Map<number, LogEntry[]>();
  for (const log of logs) {
    const existing = map.get(log.round);
    if (existing) {
      existing.push(log);
    } else {
      map.set(log.round, [log]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, entries]) => ({ round, entries }));
}

function computeSummary(logs: LogEntry[]): CombatSummary {
  let totalDamage = 0;
  let totalHealing = 0;
  let crits = 0;
  let abilitiesUsed = 0;
  const rounds = new Set<number>();

  for (const log of logs) {
    rounds.add(log.round);
    const r = log.result ?? {};

    if (r.damage > 0) totalDamage += r.damage;
    if (r.healing > 0) totalHealing += r.healing;
    if (r.critical) crits++;
    if (['racial_ability', 'psion_ability', 'class_ability', 'cast'].includes(log.action)) {
      abilitiesUsed++;
    }

    // Count damage/healing from status ticks
    if (Array.isArray(r.statusTicks)) {
      for (const tick of r.statusTicks) {
        if (tick.dotDamage > 0) totalDamage += tick.dotDamage;
        if (tick.hotHealing > 0) totalHealing += tick.hotHealing;
      }
    }

    // Count per-target damage for class abilities
    if (Array.isArray(r.targets)) {
      for (const t of r.targets) {
        if (t.damage > 0) totalDamage += t.damage;
        if (t.healing > 0) totalHealing += t.healing;
      }
    }
  }

  return {
    totalDamage,
    totalHealing,
    crits,
    abilitiesUsed,
    roundsTotal: rounds.size,
  };
}

function HpBar({ name, current, max, team }: { name: string; current: number; max: number; team: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const barColor = team === 1 ? 'bg-realm-teal-300' : 'bg-red-400';
  const isDead = current <= 0;

  return (
    <div className={`flex items-center gap-2 text-xs ${isDead ? 'opacity-40' : ''}`}>
      <span className="w-24 truncate text-realm-text-secondary font-display" title={name}>
        {name}
      </span>
      <div className="flex-1 h-2 bg-realm-bg-800 rounded-sm overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 rounded-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-realm-text-muted">
        {current}/{max}
      </span>
    </div>
  );
}

export default function CombatReplay({ logs, participants, attackerParams, defenderParams }: CombatReplayProps) {
  const nameMap = useMemo(
    () => buildNameMap(participants, attackerParams, defenderParams),
    [participants, attackerParams, defenderParams],
  );

  const rounds = useMemo(() => groupByRound(logs), [logs]);
  const summary = useMemo(() => computeSummary(logs), [logs]);

  const [currentRound, setCurrentRound] = useState(0);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(() => new Set([0]));

  const totalRounds = rounds.length;

  // Build initial HP map from participants
  const initialHp = useMemo(() => {
    const hp = new Map<string, { current: number; max: number; name: string; team: number }>();
    for (const p of participants) {
      const id = p.id ?? p.character.id;
      // Try to get max HP from the participant data or first log reference
      const maxHp = (p as any).maxHp ?? (p as any).currentHp ?? 0;
      hp.set(id, {
        current: (p as any).currentHp ?? maxHp,
        max: maxHp,
        name: p.character.name,
        team: p.team,
      });
    }
    // Monster HP from params
    if (attackerParams?.hp) {
      const id = attackerParams.monsterId ?? attackerParams.id;
      if (id) {
        hp.set(id, {
          current: attackerParams.hp,
          max: attackerParams.hp,
          name: attackerParams.name ?? 'Monster',
          team: attackerParams.team ?? 2,
        });
      }
    }
    if (defenderParams?.hp) {
      const id = defenderParams.monsterId ?? defenderParams.id;
      if (id) {
        hp.set(id, {
          current: defenderParams.hp,
          max: defenderParams.hp,
          name: defenderParams.name ?? 'Monster',
          team: defenderParams.team ?? 2,
        });
      }
    }
    return hp;
  }, [participants, attackerParams, defenderParams]);

  // Compute HP state after all rounds up to currentRound
  const hpState = useMemo(() => {
    const hp = new Map<string, { current: number; max: number; name: string; team: number }>();
    for (const [id, data] of initialHp) {
      hp.set(id, { ...data });
    }

    // Walk through all logs up to and including the current round
    for (let i = 0; i <= currentRound && i < rounds.length; i++) {
      for (const log of rounds[i].entries) {
        const r = log.result ?? {};

        // Update target HP from attack / spell results
        if (r.targetId && r.targetHp !== undefined) {
          const existing = hp.get(r.targetId);
          if (existing) {
            existing.current = r.targetHp;
            if (r.targetMaxHp) existing.max = r.targetMaxHp;
          } else {
            hp.set(r.targetId, {
              current: r.targetHp,
              max: r.targetMaxHp ?? r.targetHp,
              name: nameMap.get(r.targetId) ?? r.targetId?.slice(0, 8) ?? '?',
              team: 0,
            });
          }
        }

        // Status tick HP updates
        if (Array.isArray(r.statusTicks)) {
          for (const tick of r.statusTicks) {
            if (tick.combatantId && tick.currentHp !== undefined) {
              const existing = hp.get(tick.combatantId);
              if (existing) {
                existing.current = tick.currentHp;
              }
            }
          }
        }
      }
    }

    return hp;
  }, [initialHp, rounds, currentRound, nameMap]);

  const toggleRound = (idx: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const goToRound = (idx: number) => {
    if (idx >= 0 && idx < totalRounds) {
      setCurrentRound(idx);
      setExpandedRounds((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
    }
  };

  const expandAll = () => {
    setExpandedRounds(new Set(rounds.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedRounds(new Set());
  };

  if (logs.length === 0) {
    return (
      <div className="bg-realm-bg-800/50 rounded-sm p-6 text-center text-realm-text-muted text-sm">
        No combat logs available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step-through controls */}
      <div className="flex items-center justify-between bg-realm-bg-800/50 rounded-sm px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToRound(currentRound - 1)}
            disabled={currentRound <= 0}
            className="p-1.5 rounded-sm bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-display text-realm-text-primary min-w-[100px] text-center">
            Round {totalRounds > 0 ? currentRound + 1 : 0} of {totalRounds}
          </span>
          <button
            onClick={() => goToRound(currentRound + 1)}
            disabled={currentRound >= totalRounds - 1}
            className="p-1.5 rounded-sm bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary transition-colors"
          >
            <ChevronsUpDown className="w-3 h-3" />
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary transition-colors"
          >
            <ChevronsDownUp className="w-3 h-3" />
            Collapse All
          </button>
        </div>
      </div>

      {/* HP bars */}
      {hpState.size > 0 && (
        <div className="bg-realm-bg-800/50 rounded-sm px-4 py-3 space-y-1.5">
          <div className="text-xs font-display text-realm-text-muted uppercase tracking-wider mb-1">
            HP after Round {currentRound + 1}
          </div>
          {Array.from(hpState.values())
            .filter((h) => h.max > 0)
            .sort((a, b) => b.team - a.team)
            .map((h) => (
              <HpBar key={h.name + h.team} name={h.name} current={h.current} max={h.max} team={h.team} />
            ))}
        </div>
      )}

      {/* Round list */}
      <div className="space-y-1">
        {rounds.map((group, idx) => {
          const isExpanded = expandedRounds.has(idx);
          const isCurrent = idx === currentRound;

          return (
            <div
              key={group.round}
              className={`rounded-sm border transition-colors ${
                isCurrent
                  ? 'border-realm-gold-500/50 bg-realm-bg-700'
                  : 'border-realm-border/50 bg-realm-bg-700/60'
              }`}
            >
              <button
                onClick={() => {
                  toggleRound(idx);
                  setCurrentRound(idx);
                }}
                className="w-full flex items-center justify-between px-4 py-2 text-left"
              >
                <span className={`text-sm font-display ${isCurrent ? 'text-realm-gold-400' : 'text-realm-text-primary'}`}>
                  Round {group.round}
                </span>
                <span className="text-xs text-realm-text-muted">
                  {group.entries.length} action{group.entries.length !== 1 ? 's' : ''}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-realm-border/30 pt-2 space-y-1">
                  {group.entries.map((entry, entryIdx) => (
                    <TurnResultDisplay key={entryIdx} log={entry} participants={nameMap} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Combat summary */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h4 className="font-display text-realm-text-primary text-sm mb-3">Combat Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Swords className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-lg font-display text-red-400">{summary.totalDamage.toLocaleString()}</div>
            <div className="text-xs text-realm-text-muted">Total Damage</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div className="text-lg font-display text-green-400">{summary.totalHealing.toLocaleString()}</div>
            <div className="text-xs text-realm-text-muted">Total Healing</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3.5 h-3.5 text-realm-gold-400" />
            </div>
            <div className="text-lg font-display text-realm-gold-400">{summary.crits}</div>
            <div className="text-xs text-realm-text-muted">Critical Hits</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-display text-purple-400">{summary.abilitiesUsed}</div>
            <div className="text-xs text-realm-text-muted">Abilities Used</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-display text-realm-text-primary">{summary.roundsTotal}</div>
            <div className="text-xs text-realm-text-muted">Rounds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
