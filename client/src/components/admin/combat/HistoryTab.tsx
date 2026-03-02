import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, ScrollText, ArrowUpDown, Swords, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface EncounterCharacter {
  race: string;
  class: string | null;
  level: number;
}

interface Encounter {
  id: string;
  type: string;
  characterId: string;
  opponentId: string | null;
  characterName: string;
  opponentName: string;
  outcome: string;
  totalRounds: number;
  characterStartHp: number;
  characterEndHp: number;
  opponentStartHp: number;
  opponentEndHp: number;
  characterWeapon: string;
  opponentWeapon: string;
  xpAwarded: number;
  goldAwarded: number;
  lootDropped: string;
  triggerSource: string;
  startedAt: string;
  endedAt: string;
  summary: string;
  rounds: unknown;
  simulationTick: number | null;
  character: EncounterCharacter | null;
}

interface HistoryResponse {
  encounters: Encounter[];
  total: number;
  page: number;
  totalPages: number;
}

// Round data types (lightweight inline, matching combat engine output)
interface Modifier { source: string; value: number }
interface StatusTick { combatantId: string; effectName: string; damage?: number; healing?: number; expired: boolean; hpAfter: number; killed: boolean }
interface StrikeResult { strikeNumber: number; hit: boolean; crit: boolean; damage: number; attackRoll?: number; attackTotal?: number; targetAc?: number }
interface PerTargetResult { targetId: string; targetName?: string; damage?: number; healing?: number; statusApplied?: string; hpAfter: number; killed: boolean }

interface TurnEntry {
  round: number;
  actorId: string;
  action: string;
  result: any;
  statusTicks: StatusTick[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<string, string> = {
  win: 'bg-green-500/20 text-green-400',
  loss: 'bg-red-500/20 text-red-400',
  flee: 'bg-yellow-500/20 text-yellow-400',
  draw: 'bg-gray-500/20 text-gray-400',
};

const TYPE_COLORS: Record<string, string> = {
  pve: 'bg-realm-teal-300/20 text-realm-teal-300',
  pvp: 'bg-purple-500/20 text-purple-400',
};

const SORT_OPTIONS = [
  { value: 'startedAt:desc', label: 'Newest First' },
  { value: 'startedAt:asc', label: 'Oldest First' },
  { value: 'totalRounds:desc', label: 'Most Rounds' },
  { value: 'xpAwarded:desc', label: 'Most XP' },
  { value: 'goldAwarded:desc', label: 'Most Gold' },
];

const STATUS_COLORS: Record<string, string> = {
  poisoned: 'text-green-400', burning: 'text-orange-400', frozen: 'text-blue-400',
  stunned: 'text-yellow-400', blessed: 'text-amber-300', bleeding: 'text-red-400',
  weakened: 'text-purple-400', shielded: 'text-cyan-400', regenerating: 'text-emerald-400',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function HpBar({ current, max, label }: { current: number; max: number; label: string }) {
  if (max <= 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-realm-text-muted w-12 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-red-900/40 rounded overflow-hidden">
        <div className="h-full bg-green-500/70 rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-realm-text-secondary w-16 shrink-0">{current}/{max}</span>
    </div>
  );
}

function MiniHpBar({ before, after, name }: { before: number; after: number; name: string }) {
  const lost = before - after;
  const pct = before > 0 ? Math.max(0, Math.min(100, (after / before) * 100)) : 0;
  const severe = before > 0 && lost > before * 0.5;
  const healed = after > before;
  return (
    <div className={`text-xs mt-0.5 ${severe ? 'text-red-400' : healed ? 'text-green-400' : 'text-realm-text-secondary'}`}>
      {name}: {before} → {after} HP
      <div className="inline-block w-16 h-1.5 bg-red-900/40 rounded ml-2 align-middle">
        <div className="h-full bg-green-500/70 rounded" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function buildNameMap(e: Encounter): Record<string, string> {
  const map: Record<string, string> = {};
  if (e.characterId) map[e.characterId] = e.characterName || 'Player';
  if (e.opponentId) map[e.opponentId] = e.opponentName || 'Opponent';
  return map;
}

function resolveName(id: string, nameMap: Record<string, string>): string {
  return nameMap[id] || id.substring(0, 8);
}

// ── Round Data Normalizer ────────────────────────────────────────────────────
// The DB stores RoundLogEntry[] (from combat-logger.ts), not TurnLogEntry[].
// First element is metadata: { _encounterContext: { combatants, turnOrder } }.
// RoundLogEntry has flat fields (attackRoll = {raw, modifiers, total}), no result wrapper.
// This normalizer transforms DB format → TurnEntry format expected by renderers.

interface EncounterContextMeta {
  _encounterContext: {
    combatants: Array<{ id: string; name: string; team: number; hp: number; maxHp: number; ac: number; weapon: { name: string; dice: string; damageType?: string } | null }>;
    turnOrder: string[];
  };
}

function isEncounterContext(entry: any): entry is EncounterContextMeta {
  return entry && typeof entry === 'object' && '_encounterContext' in entry;
}

/**
 * Build an extended name map from _encounterContext combatant data.
 * This resolves ALL combatant IDs (not just character/opponent).
 */
function buildNameMapFromContext(encounter: Encounter, raw: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  // Start with basic encounter names
  if (encounter.characterId) map[encounter.characterId] = encounter.characterName || 'Player';
  if (encounter.opponentId) map[encounter.opponentId] = encounter.opponentName || 'Opponent';
  // Enhance from _encounterContext if present
  const ctx = raw.find(isEncounterContext);
  if (ctx) {
    for (const c of ctx._encounterContext.combatants) {
      if (c.id && c.name) map[c.id] = c.name;
    }
  }
  return map;
}

/**
 * Normalize a RoundLogEntry (DB format) into TurnEntry (renderer format).
 * Adapts: flat fields → nested result object, object attackRoll → number fields, etc.
 */
function normalizeRoundEntry(raw: any, nameMap: Record<string, string>): TurnEntry | null {
  // Skip metadata entries
  if (isEncounterContext(raw)) return null;
  // Must have an action type
  if (!raw.action && !raw.type) return null;

  const action = raw.action || raw.type || 'unknown';
  const actorId = raw.actorId || '';

  // Build a result object that the renderers expect
  const result: any = { type: action };

  // Resolve targetId: find the non-actor combatant
  let targetId = raw.targetId || '';
  if (!targetId && raw.hpAfter && raw.actor) {
    for (const name of Object.keys(raw.hpAfter)) {
      if (name !== raw.actor) {
        const id = Object.entries(nameMap).find(([, n]) => n === name)?.[0];
        if (id) { targetId = id; break; }
      }
    }
  }
  if (!targetId) {
    targetId = Object.keys(nameMap).find(id => id !== actorId) || '';
  }

  // Copy common fields
  result.actorId = actorId;
  result.targetId = targetId;
  result.weaponName = raw.weaponName;
  result.targetKilled = raw.targetKilled;
  result.targetHpBefore = raw.targetHpBefore;
  result.targetHpAfter = raw.targetHpAfter;
  result.negatedAttack = raw.negatedAttack;

  if (action === 'attack') {
    // attackRoll can be { raw, modifiers, total } object or just a number
    if (raw.attackRoll && typeof raw.attackRoll === 'object') {
      result.attackRoll = raw.attackRoll.raw;
      result.attackModifiers = raw.attackRoll.modifiers;
      result.attackTotal = raw.attackRoll.total;
    } else {
      result.attackRoll = raw.attackRoll;
      result.attackModifiers = raw.attackModifiers;
      result.attackTotal = raw.attackTotal;
    }
    result.targetAC = raw.targetAC;
    result.hit = raw.hit;
    result.critical = raw.isCritical ?? raw.critical;

    // damageRoll can be { dice, rolls, modifiers, total, type } object or number
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.weaponDice = raw.damageRoll.dice;
      result.damageRolls = raw.damageRoll.rolls;
      result.damageModifiers = raw.damageRoll.modifiers;
      result.totalDamage = raw.damageRoll.total;
      result.damageType = raw.damageRoll.type;
    } else {
      result.damageRoll = raw.damageRoll;
      result.damageRolls = raw.damageRolls;
      result.damageModifiers = raw.damageModifiers;
      result.totalDamage = raw.totalDamage;
      result.damageType = raw.damageType;
    }

    // Reactive results
    result.counterTriggered = raw.counterTriggered;
    result.counterDamage = raw.counterDamage;
    result.counterAbilityName = raw.counterAbilityName;
    result.companionIntercepted = raw.companionIntercepted;
    result.companionDamageAbsorbed = raw.companionDamageAbsorbed;
    result.deathPrevented = raw.deathPrevented;
    result.deathPreventedAbility = raw.deathPreventedAbility;
  } else if (action === 'cast') {
    result.spellName = raw.spellName;
    result.saveRequired = raw.saveDC != null;
    result.saveDC = raw.saveDC;
    result.saveRoll = raw.saveRoll;
    result.saveTotal = raw.saveTotal;
    result.saveSucceeded = raw.saveSucceeded;
    result.healAmount = raw.healAmount;
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.totalDamage = raw.damageRoll.total;
    } else {
      result.totalDamage = raw.totalDamage;
    }
    if (raw.statusEffectsApplied?.length > 0) {
      result.statusApplied = raw.statusEffectsApplied[0];
    }
  } else if (action === 'defend') {
    result.acBonusGranted = raw.acBonusGranted;
  } else if (action === 'item') {
    result.itemName = raw.itemName;
    result.healAmount = raw.healAmount;
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.damageAmount = raw.damageRoll.total;
    }
    if (raw.statusEffectsApplied?.length > 0) {
      result.statusApplied = raw.statusEffectsApplied[0];
    }
  } else if (action === 'flee') {
    result.fleeRoll = raw.fleeRoll;
    result.fleeDC = raw.fleeDC;
    result.success = raw.fleeSuccess ?? raw.success;
  } else if (action === 'racial_ability') {
    result.abilityName = raw.abilityName;
    result.description = raw.abilityDescription ?? raw.description;
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.damage = raw.damageRoll.total;
    } else {
      result.damage = raw.damage;
    }
    result.healing = raw.healAmount ?? raw.healing;
    if (raw.statusEffectsApplied?.length > 0) {
      result.statusApplied = raw.statusEffectsApplied[0];
    }
  } else if (action === 'psion_ability') {
    result.abilityName = raw.abilityName;
    result.description = raw.abilityDescription ?? raw.description;
    result.saveRequired = raw.saveDC != null;
    result.saveDC = raw.saveDC;
    result.saveRoll = raw.saveRoll;
    result.saveTotal = raw.saveTotal;
    result.saveSucceeded = raw.saveSucceeded;
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.damage = raw.damageRoll.total;
    } else {
      result.damage = raw.damage;
    }
    result.controlled = raw.controlled;
    result.banished = raw.banished;
  } else if (action === 'class_ability') {
    result.abilityName = raw.abilityName;
    result.description = raw.abilityDescription ?? raw.description;
    result.saveRequired = raw.saveDC != null;
    result.saveDC = raw.saveDC;
    result.saveRoll = raw.saveRoll;
    result.saveTotal = raw.saveTotal;
    result.saveSucceeded = raw.saveSucceeded;
    if (raw.damageRoll && typeof raw.damageRoll === 'object') {
      result.damage = raw.damageRoll.total;
    } else {
      result.damage = raw.damage;
    }
    result.healing = raw.healAmount ?? raw.healing;
    result.selfHealing = raw.selfHealing;
    result.strikeResults = raw.strikeResults;
    result.totalStrikes = raw.totalStrikes;
    result.strikesHit = raw.strikesHit;
    result.perTargetResults = raw.perTargetResults;
    result.goldStolen = raw.goldStolen;
    result.peacefulResolution = raw.peacefulResolution;
    result.buffApplied = raw.buffApplied;
    result.debuffApplied = raw.debuffApplied;
    if (raw.statusEffectsApplied?.length > 0) {
      result.statusApplied = raw.statusEffectsApplied[0];
    }
  }

  // Build statusTicks from flat fields
  const statusTicks: StatusTick[] = [];
  if (raw.statusEffectsExpired?.length > 0) {
    for (const effectName of raw.statusEffectsExpired) {
      statusTicks.push({ combatantId: actorId, effectName, expired: true, hpAfter: 0, killed: false });
    }
  }
  if (raw.statusTickDamage && raw.statusTickDamage > 0) {
    statusTicks.push({
      combatantId: actorId,
      effectName: raw.statusEffectsApplied?.[0] || 'Status Effect',
      damage: raw.statusTickDamage,
      expired: false,
      hpAfter: raw.hpAfter?.[raw.actor] ?? 0,
      killed: false,
    });
  }
  if (raw.statusTickHealing && raw.statusTickHealing > 0) {
    statusTicks.push({
      combatantId: actorId,
      effectName: 'Regeneration',
      healing: raw.statusTickHealing,
      expired: false,
      hpAfter: raw.hpAfter?.[raw.actor] ?? 0,
      killed: false,
    });
  }

  return {
    round: raw.round ?? 1,
    actorId,
    action,
    result,
    statusTicks,
  };
}

// ── Round-by-Round Combat Log ────────────────────────────────────────────────

function RollBreakdown({ label, roll, modifiers, total, comparison, compLabel, hit }: {
  label: string;
  roll: number;
  modifiers?: Modifier[];
  total: number;
  comparison?: number;
  compLabel?: string;
  hit?: boolean;
}) {
  return (
    <div className="bg-realm-bg-900/50 border border-realm-border/30 rounded px-2.5 py-1.5 text-xs my-1">
      <div className="text-realm-text-muted font-display text-[10px] uppercase mb-0.5">{label}</div>
      <div className="font-mono text-realm-text-primary">
        <span className="text-realm-gold-400">d20</span> = <span className="font-bold">{roll}</span>
        {roll === 20 && <span className="text-realm-gold-400 ml-1">NAT 20!</span>}
        {roll === 1 && <span className="text-red-400 ml-1">NAT 1!</span>}
      </div>
      {modifiers && modifiers.length > 0 && modifiers.map((m, i) => (
        <div key={i} className="font-mono text-realm-text-muted pl-2">
          {m.value >= 0 ? '+' : ''}{m.value} <span className="text-realm-text-muted/70">{m.source}</span>
        </div>
      ))}
      <div className="font-mono font-bold mt-0.5 border-t border-realm-border/20 pt-0.5">
        = {total}
        {comparison != null && (
          <>
            <span className="text-realm-text-muted font-normal"> vs {compLabel} {comparison}</span>
            <span className="ml-1">→</span>
            {hit != null && (
              <span className={`ml-1 ${hit ? 'text-green-400' : 'text-red-400'}`}>
                {hit ? 'HIT' : 'MISS'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DamageBreakdown({ dice, rolls, modifiers, total, damageType }: {
  dice?: string;
  rolls?: number[];
  modifiers?: Modifier[];
  total: number;
  damageType?: string;
}) {
  return (
    <div className="bg-realm-bg-900/50 border border-realm-border/30 rounded px-2.5 py-1.5 text-xs my-1">
      <div className="text-realm-text-muted font-display text-[10px] uppercase mb-0.5">Damage</div>
      <div className="font-mono text-realm-text-primary">
        {dice && <span className="text-realm-gold-400">{dice}</span>}
        {rolls && rolls.length > 0 && <span> = [{rolls.join(', ')}]</span>}
        {!rolls && !dice && <span>{total}</span>}
      </div>
      {modifiers && modifiers.length > 0 && modifiers.map((m, i) => (
        <div key={i} className="font-mono text-realm-text-muted pl-2">
          {m.value >= 0 ? '+' : ''}{m.value} <span className="text-realm-text-muted/70">{m.source}</span>
        </div>
      ))}
      <div className="font-mono font-bold mt-0.5 border-t border-realm-border/20 pt-0.5">
        = {total} {damageType && <span className="text-realm-text-muted font-normal">{damageType}</span>}
      </div>
    </div>
  );
}

function SaveBreakdown({ roll, total, dc, succeeded }: {
  roll?: number;
  total?: number;
  dc?: number;
  succeeded?: boolean;
}) {
  if (roll == null && dc == null) return null;
  return (
    <div className="bg-realm-bg-900/50 border border-realm-border/30 rounded px-2.5 py-1.5 text-xs my-1">
      <div className="text-realm-text-muted font-display text-[10px] uppercase mb-0.5">Saving Throw</div>
      <div className="font-mono text-realm-text-primary">
        {roll != null && <><span className="text-realm-gold-400">d20</span> = {roll}</>}
        {total != null && roll != null && total !== roll && <span className="text-realm-text-muted"> → {total}</span>}
        {dc != null && <span className="text-realm-text-muted"> vs DC {dc}</span>}
        {succeeded != null && (
          <span className={`ml-1 font-bold ${succeeded ? 'text-green-400' : 'text-red-400'}`}>
            → {succeeded ? 'SAVED' : 'FAILED'}
          </span>
        )}
      </div>
    </div>
  );
}

function AttackEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  const target = resolveName(r.targetId, nameMap);
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> attacks </span>
        <span className="text-realm-text-secondary">{target}</span>
        {r.weaponName && <span className="text-realm-text-muted"> with </span>}
        {r.weaponName && <span className="text-amber-300">{r.weaponName}</span>}
        {r.critical && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-display bg-realm-gold-500/30 text-realm-gold-400">CRITICAL HIT!</span>}
      </div>
      <RollBreakdown
        label="Attack Roll"
        roll={r.attackRoll}
        modifiers={r.attackModifiers}
        total={r.attackTotal}
        comparison={r.targetAC}
        compLabel="AC"
        hit={r.hit}
      />
      {r.hit && r.totalDamage > 0 && (
        <DamageBreakdown
          dice={r.weaponDice}
          rolls={r.damageRolls}
          modifiers={r.damageModifiers}
          total={r.totalDamage}
          damageType={r.damageType}
        />
      )}
      {r.hit && r.targetHpBefore != null && (
        <MiniHpBar before={r.targetHpBefore} after={r.targetHpAfter} name={target} />
      )}
      {r.targetKilled && <div className="text-red-400 font-bold text-xs mt-0.5">{target} has been slain!</div>}
      {r.counterTriggered && (
        <div className="text-purple-400 text-xs mt-0.5">
          {r.counterAbilityName || 'Counter'} triggers for {r.counterDamage} damage!
        </div>
      )}
      {r.companionIntercepted && (
        <div className="text-cyan-400 text-xs mt-0.5">Companion intercepts, absorbing {r.companionDamageAbsorbed} damage</div>
      )}
      {r.deathPrevented && (
        <div className="text-amber-300 text-xs mt-0.5">{r.deathPreventedAbility || 'Ability'} prevents death!</div>
      )}
    </div>
  );
}

function CastEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  const target = r.targetId ? resolveName(r.targetId, nameMap) : null;
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> casts </span>
        <span className="text-purple-400">{r.spellName}</span>
        {r.spellLevel != null && <span className="text-realm-text-muted text-xs"> (Lv {r.spellLevel})</span>}
        {target && <span className="text-realm-text-muted"> on </span>}
        {target && <span className="text-realm-text-secondary">{target}</span>}
      </div>
      {r.saveRequired && (
        <SaveBreakdown roll={r.saveRoll} total={r.saveTotal} dc={r.saveDC} succeeded={r.saveSucceeded} />
      )}
      {r.totalDamage != null && r.totalDamage > 0 && (
        <div className="text-xs text-red-400">Deals {r.totalDamage} damage</div>
      )}
      {r.healAmount != null && r.healAmount > 0 && (
        <div className="text-xs text-green-400">Heals for {r.healAmount} HP</div>
      )}
      {r.statusApplied && (
        <div className="text-xs text-yellow-400">Applies {r.statusApplied}{r.statusDuration ? ` for ${r.statusDuration} rounds` : ''}</div>
      )}
      {r.targetHpAfter != null && target && r.targetHpBefore != null && (
        <MiniHpBar before={r.targetHpBefore} after={r.targetHpAfter} name={target} />
      )}
      {r.targetKilled && target && <div className="text-red-400 font-bold text-xs mt-0.5">{target} has been slain!</div>}
    </div>
  );
}

function DefendEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  return (
    <div className="text-sm">
      <span className="font-bold text-realm-text-primary">{actor}</span>
      <span className="text-realm-text-muted"> takes a defensive stance </span>
      <span className="text-cyan-400">(+{r.acBonusGranted} AC)</span>
    </div>
  );
}

function ItemEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  const target = r.targetId ? resolveName(r.targetId, nameMap) : null;
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> uses </span>
        <span className="text-green-400">{r.itemName}</span>
        {target && target !== actor && <span className="text-realm-text-muted"> on {target}</span>}
      </div>
      {r.healAmount != null && r.healAmount > 0 && <div className="text-xs text-green-400">Restores {r.healAmount} HP</div>}
      {r.damageAmount != null && r.damageAmount > 0 && <div className="text-xs text-red-400">Deals {r.damageAmount} damage</div>}
      {r.statusApplied && <div className="text-xs text-yellow-400">Applies {r.statusApplied}</div>}
      {r.statusRemoved && <div className="text-xs text-green-400">Removes {r.statusRemoved}</div>}
    </div>
  );
}

function FleeEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> attempts to flee!</span>
      </div>
      <div className="text-xs font-mono">
        Roll: {r.fleeRoll} vs DC {r.fleeDC} →{' '}
        <span className={r.success ? 'text-green-400' : 'text-red-400'}>
          {r.success ? 'Escaped!' : 'Failed to escape'}
        </span>
      </div>
    </div>
  );
}

function RacialAbilityEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> uses </span>
        <span className="text-violet-400">{r.abilityName}</span>
        {r.success === false && <span className="text-red-400 text-xs ml-1">(failed)</span>}
      </div>
      {r.description && <div className="text-xs text-realm-text-secondary italic">{r.description}</div>}
      {r.damage != null && r.damage > 0 && <div className="text-xs text-red-400">Deals {r.damage} damage</div>}
      {r.healing != null && r.healing > 0 && <div className="text-xs text-green-400">Heals for {r.healing}</div>}
      {r.statusApplied && <div className="text-xs text-yellow-400">Applies {r.statusApplied}</div>}
    </div>
  );
}

function PsionAbilityEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> uses </span>
        <span className="text-indigo-400">{r.abilityName}</span>
      </div>
      {r.saveRequired && (
        <SaveBreakdown roll={r.saveRoll} total={r.saveTotal} dc={r.saveDC} succeeded={r.saveSucceeded} />
      )}
      {r.description && <div className="text-xs text-realm-text-secondary italic">{r.description}</div>}
      {r.damage != null && r.damage > 0 && <div className="text-xs text-red-400">Deals {r.damage} damage</div>}
      {r.controlled && <div className="text-xs text-indigo-400">Target is controlled!</div>}
      {r.banished && <div className="text-xs text-indigo-400">Target is banished!</div>}
      {r.negatedAttack && <div className="text-xs text-cyan-400">Attack negated</div>}
      {r.targetKilled && <div className="text-red-400 font-bold text-xs">Target has been slain!</div>}
    </div>
  );
}

function ClassAbilityEntry({ r, nameMap }: { r: any; nameMap: Record<string, string> }) {
  const actor = resolveName(r.actorId, nameMap);
  return (
    <div className="space-y-0.5">
      <div className="text-sm">
        <span className="font-bold text-realm-text-primary">{actor}</span>
        <span className="text-realm-text-muted"> uses </span>
        <span className="text-sky-400">{r.abilityName}</span>
      </div>
      {r.saveRequired && (
        <SaveBreakdown roll={r.saveRoll} total={r.saveTotal} dc={r.saveDC} succeeded={r.saveSucceeded} />
      )}
      {r.description && <div className="text-xs text-realm-text-secondary italic">{r.description}</div>}
      {r.damage != null && r.damage > 0 && <div className="text-xs text-red-400">Deals {r.damage} damage</div>}
      {r.healing != null && r.healing > 0 && <div className="text-xs text-green-400">Heals for {r.healing}</div>}
      {r.selfHealing != null && r.selfHealing > 0 && <div className="text-xs text-green-400">Self-heals for {r.selfHealing}</div>}
      {r.buffApplied && <div className="text-xs text-cyan-400">Buff: {r.buffApplied}</div>}
      {r.debuffApplied && <div className="text-xs text-yellow-400">Debuff: {r.debuffApplied}</div>}
      {r.statusApplied && <div className="text-xs text-yellow-400">Applies {r.statusApplied}</div>}
      {/* Multi-strike */}
      {r.strikeResults && (r.strikeResults as StrikeResult[]).length > 0 && (
        <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-realm-border/30 pl-2">
          {(r.strikeResults as StrikeResult[]).map((s, i) => (
            <div key={i} className="text-xs font-mono">
              Strike {s.strikeNumber}:
              {s.attackRoll != null && <> d20={s.attackRoll}</>}
              {s.attackTotal != null && <> ({s.attackTotal})</>}
              {s.targetAc != null && <> vs AC {s.targetAc}</>}
              {' → '}
              <span className={s.hit ? 'text-green-400' : 'text-red-400'}>{s.hit ? 'HIT' : 'MISS'}</span>
              {s.crit && <span className="text-realm-gold-400 ml-1">CRIT!</span>}
              {s.hit && <span className="text-red-400"> → {s.damage} dmg</span>}
            </div>
          ))}
          {r.totalStrikes != null && (
            <div className="text-xs text-realm-text-muted font-bold">{r.strikesHit}/{r.totalStrikes} strikes hit</div>
          )}
        </div>
      )}
      {/* AoE per-target */}
      {r.perTargetResults && (r.perTargetResults as PerTargetResult[]).length > 0 && (
        <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-realm-border/30 pl-2">
          {(r.perTargetResults as PerTargetResult[]).map((t, i) => (
            <div key={i} className="text-xs">
              <span className="text-realm-text-secondary">{t.targetName || resolveName(t.targetId, nameMap)}</span>
              {t.damage != null && <span className="text-red-400"> → {t.damage} dmg</span>}
              {t.healing != null && <span className="text-green-400"> → +{t.healing} HP</span>}
              {t.statusApplied && <span className="text-yellow-400"> [{t.statusApplied}]</span>}
              <span className="text-realm-text-muted"> ({t.hpAfter} HP)</span>
              {t.killed && <span className="text-red-400 font-bold"> SLAIN</span>}
            </div>
          ))}
        </div>
      )}
      {r.goldStolen != null && r.goldStolen > 0 && <div className="text-xs text-realm-gold-400">Stole {r.goldStolen} gold!</div>}
      {r.peacefulResolution && <div className="text-xs text-green-400">Combat resolved peacefully</div>}
      {r.targetKilled && <div className="text-red-400 font-bold text-xs">Target has been slain!</div>}
    </div>
  );
}

function StatusTickEntry({ tick, nameMap }: { tick: StatusTick; nameMap: Record<string, string> }) {
  const name = resolveName(tick.combatantId, nameMap);
  const effectColor = STATUS_COLORS[tick.effectName.toLowerCase()] || 'text-realm-text-muted';
  return (
    <div className={`text-xs ${effectColor}`}>
      {name}: <span className="font-bold">{tick.effectName}</span>
      {tick.damage != null && tick.damage > 0 && <span> → {tick.damage} damage</span>}
      {tick.healing != null && tick.healing > 0 && <span> → +{tick.healing} HP</span>}
      <span className="text-realm-text-muted"> ({tick.hpAfter} HP)</span>
      {tick.expired && <span className="text-realm-text-muted italic"> [worn off]</span>}
      {tick.killed && <span className="text-red-400 font-bold"> KILLED by {tick.effectName}!</span>}
    </div>
  );
}

const ACTION_ICONS: Record<string, string> = {
  attack: '\u2694\uFE0F', cast: '\u2728', defend: '\uD83D\uDEE1\uFE0F', item: '\uD83E\uDDEA',
  flee: '\uD83C\uDFC3', racial_ability: '\uD83D\uDD2E', psion_ability: '\uD83E\uDDE0', class_ability: '\u26A1',
};

function TurnResultRenderer({ entry, nameMap }: { entry: TurnEntry; nameMap: Record<string, string> }) {
  const r = entry.result;
  if (!r) {
    // Fallback: render raw entry as formatted JSON with parse error label
    return (
      <div className="py-1.5 pl-6 relative">
        <span className="absolute left-0 top-2 text-sm text-yellow-400">⚠</span>
        <div className="text-xs text-yellow-400 font-display mb-1">Parse Error — Raw Entry</div>
        <pre className="text-[10px] text-realm-text-muted bg-realm-bg-900/50 rounded p-2 overflow-x-auto max-h-32">
          {JSON.stringify(entry, null, 2)}
        </pre>
      </div>
    );
  }
  const type = r.type || entry.action;

  return (
    <div className="py-1.5 pl-6 relative">
      <span className="absolute left-0 top-2 text-sm">{ACTION_ICONS[type] || '\u25CF'}</span>
      {type === 'attack' && <AttackEntry r={r} nameMap={nameMap} />}
      {type === 'cast' && <CastEntry r={r} nameMap={nameMap} />}
      {type === 'defend' && <DefendEntry r={r} nameMap={nameMap} />}
      {type === 'item' && <ItemEntry r={r} nameMap={nameMap} />}
      {type === 'flee' && <FleeEntry r={r} nameMap={nameMap} />}
      {type === 'racial_ability' && <RacialAbilityEntry r={r} nameMap={nameMap} />}
      {type === 'psion_ability' && <PsionAbilityEntry r={r} nameMap={nameMap} />}
      {type === 'class_ability' && <ClassAbilityEntry r={r} nameMap={nameMap} />}
      {/* Fallback for unknown types */}
      {!['attack', 'cast', 'defend', 'item', 'flee', 'racial_ability', 'psion_ability', 'class_ability'].includes(type) && (
        <div className="text-xs text-realm-text-muted">
          <span className="font-bold">{resolveName(entry.actorId, nameMap)}</span> performs {type}
          {r.description && <div className="italic">{r.description}</div>}
        </div>
      )}
      {/* Status ticks */}
      {entry.statusTicks && entry.statusTicks.length > 0 && (
        <div className="mt-1 ml-2 border-l border-realm-border/30 pl-2 space-y-0.5">
          {entry.statusTicks.map((tick, i) => (
            <StatusTickEntry key={i} tick={tick} nameMap={nameMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function CombatRoundLog({ encounter }: { encounter: Encounter }) {
  const rawEntries = useMemo(() => {
    try {
      const raw = Array.isArray(encounter.rounds) ? encounter.rounds : JSON.parse(encounter.rounds as string);
      if (!Array.isArray(raw) || raw.length === 0) return null;
      return raw;
    } catch {
      return null;
    }
  }, [encounter.rounds]);

  const nameMap = useMemo(
    () => rawEntries ? buildNameMapFromContext(encounter, rawEntries) : buildNameMap(encounter),
    [encounter.characterId, encounter.opponentId, encounter.characterName, encounter.opponentName, rawEntries],
  );

  const parsedRounds = useMemo(() => {
    if (!rawEntries) return null;

    // Detect format: if first non-context entry has a nested `result` object, it's already TurnEntry format.
    // Otherwise it's RoundLogEntry from combat-logger and needs normalization.
    const firstReal = rawEntries.find((e: any) => !isEncounterContext(e));
    const needsNormalize = firstReal && !firstReal.result;

    // Group by round number
    const grouped = new Map<number, TurnEntry[]>();
    for (const rawEntry of rawEntries) {
      let entry: TurnEntry | null;
      if (needsNormalize) {
        entry = normalizeRoundEntry(rawEntry, nameMap);
      } else if (isEncounterContext(rawEntry)) {
        continue; // skip metadata
      } else {
        entry = rawEntry as TurnEntry;
      }
      if (!entry) continue;
      const rnd = entry.round ?? 1;
      if (!grouped.has(rnd)) grouped.set(rnd, []);
      grouped.get(rnd)!.push(entry);
    }
    if (grouped.size === 0) return null;
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [rawEntries, nameMap]);

  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());

  if (!parsedRounds || parsedRounds.length === 0) {
    return (
      <div className="text-xs text-realm-text-muted text-center py-4">
        No round-by-round data available for this encounter.
      </div>
    );
  }

  function toggleRound(rnd: number) {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(rnd)) next.delete(rnd);
      else next.add(rnd);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {parsedRounds.map(([roundNum, entries]) => {
        const isCollapsed = collapsedRounds.has(roundNum);
        return (
          <div key={roundNum} className="bg-realm-bg-800/50 border-l-2 border-realm-gold-500/40 rounded">
            <button
              onClick={() => toggleRound(roundNum)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-realm-bg-800/70 transition-colors rounded-t"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-display text-amber-300 uppercase">Round {roundNum}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-realm-bg-700 text-realm-text-muted">
                  {entries.length} action{entries.length !== 1 ? 's' : ''}
                </span>
              </div>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-realm-text-muted" />}
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-2 divide-y divide-realm-border/20">
                {entries.map((entry, i) => (
                  <TurnResultRenderer key={i} entry={entry} nameMap={nameMap} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function EncounterCard({
  encounter: e,
  isSelected,
  onClick,
}: {
  encounter: Encounter;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeColor = TYPE_COLORS[e.type] ?? 'bg-realm-bg-600/50 text-realm-text-muted';
  const outcomeColor = OUTCOME_COLORS[e.outcome] ?? 'bg-realm-bg-600/50 text-realm-text-muted';
  const charClass = e.character?.class ? ` ${e.character.class}` : '';
  const charInfo = e.character ? `(${e.character.race}${charClass}, Lv ${e.character.level})` : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
        isSelected
          ? 'bg-realm-bg-800/80 border border-realm-gold-500/50'
          : 'bg-realm-bg-800/30 border border-transparent hover:bg-realm-bg-800/50 hover:border-realm-border/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase ${typeColor}`}>{e.type}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase ${outcomeColor}`}>{e.outcome}</span>
        </div>
        <span className="text-xs text-realm-text-muted">{e.totalRounds} round{e.totalRounds !== 1 ? 's' : ''}</span>
      </div>
      <div className="text-sm text-realm-text-primary truncate">
        {e.characterName} <span className="text-realm-text-muted text-xs">{charInfo}</span>
      </div>
      <div className="text-xs text-realm-text-secondary ml-2 truncate">vs {e.opponentName}</div>
      <div className="mt-1 space-y-0.5">
        <HpBar current={e.characterEndHp} max={e.characterStartHp} label="Player" />
        <HpBar current={e.opponentEndHp} max={e.opponentStartHp} label="Enemy" />
      </div>
      {(e.xpAwarded > 0 || e.goldAwarded > 0 || e.lootDropped) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-realm-text-muted">
          {e.xpAwarded > 0 && <span className="text-blue-400">XP: +{e.xpAwarded}</span>}
          {e.goldAwarded > 0 && <span className="text-realm-gold-400">Gold: +{e.goldAwarded}</span>}
          {e.lootDropped && <span className="text-green-400 truncate">{e.lootDropped}</span>}
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          {e.simulationTick != null && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-display bg-purple-500/20 text-purple-400">
              SIM Tick {e.simulationTick}
            </span>
          )}
          <span className="text-[10px] text-realm-text-muted">{e.triggerSource}</span>
        </div>
        <span className="text-[10px] text-realm-text-muted">{formatDateTime(e.startedAt)}</span>
      </div>
    </button>
  );
}

function Pagination({
  page, totalPages, total, limit, onPageChange,
}: {
  page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1 && total <= limit) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  const showStart = (page - 1) * limit + 1;
  const showEnd = Math.min(page * limit, total);

  return (
    <div className="text-center">
      <div className="text-xs text-realm-text-muted mb-1">Showing {showStart}-{showEnd} of {total.toLocaleString()}</div>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page <= 1} className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs">&laquo;</button>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
        {pages[0] > 1 && <span className="text-realm-text-muted text-xs px-1">...</span>}
        {pages.map((p) => (
          <button key={p} onClick={() => onPageChange(p)} className={`w-7 h-7 rounded text-xs font-display transition-colors ${p === page ? 'bg-realm-gold-500 text-realm-bg-900' : 'bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary'}`}>{p}</button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="text-realm-text-muted text-xs px-1">...</span>}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs">&raquo;</button>
      </div>
    </div>
  );
}

function DetailPanel({ encounter: e }: { encounter: Encounter }) {
  // Build HP timeline from actual round data (handles both RoundLogEntry and TurnEntry formats)
  const hpTimeline = useMemo(() => {
    try {
      const raw = Array.isArray(e.rounds) ? e.rounds : JSON.parse(e.rounds as string);
      if (!Array.isArray(raw) || raw.length === 0) return null;

      let playerHp = e.characterStartHp;
      let enemyHp = e.opponentStartHp;
      const points: { round: number; playerHp: number; enemyHp: number }[] = [
        { round: 0, playerHp, enemyHp },
      ];

      let lastRound = 0;
      for (const entry of raw) {
        // Skip _encounterContext metadata
        if (entry && typeof entry === 'object' && '_encounterContext' in entry) continue;
        if (!entry || typeof entry !== 'object') continue;

        // RoundLogEntry format: hpAfter is a Record<name, hp>
        if (entry.hpAfter && typeof entry.hpAfter === 'object' && !Array.isArray(entry.hpAfter)) {
          const hpMap = entry.hpAfter as Record<string, number>;
          // Match by name
          if (e.characterName && hpMap[e.characterName] != null) playerHp = hpMap[e.characterName];
          if (e.opponentName && hpMap[e.opponentName] != null) enemyHp = hpMap[e.opponentName];
        }
        // TurnEntry format: result.targetHpAfter + targetId
        else if (entry.result) {
          const r = entry.result;
          if (r.targetHpAfter != null && r.targetId) {
            if (r.targetId === e.characterId) playerHp = r.targetHpAfter;
            else if (r.targetId === e.opponentId) enemyHp = r.targetHpAfter;
          }
          // Status tick HP
          if (entry.statusTicks) {
            for (const tick of entry.statusTicks) {
              if (tick.combatantId === e.characterId) playerHp = tick.hpAfter;
              else if (tick.combatantId === e.opponentId) enemyHp = tick.hpAfter;
            }
          }
        }

        const rnd = entry.round ?? 1;
        if (rnd !== lastRound) {
          points.push({ round: rnd, playerHp: Math.max(0, playerHp), enemyHp: Math.max(0, enemyHp) });
          lastRound = rnd;
        }
      }
      // Final state
      if (points.length > 1) {
        points.push({ round: lastRound + 1, playerHp: Math.max(0, playerHp), enemyHp: Math.max(0, enemyHp) });
      }
      return points.length > 1 ? points : null;
    } catch {
      return null;
    }
  }, [e.rounds, e.characterId, e.opponentId, e.characterName, e.opponentName, e.characterStartHp, e.opponentStartHp]);

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${TYPE_COLORS[e.type] ?? ''}`}>{e.type}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${OUTCOME_COLORS[e.outcome] ?? ''}`}>{e.outcome}</span>
          {e.simulationTick != null && (
            <span className="px-2 py-0.5 rounded text-xs font-display bg-purple-500/20 text-purple-400">SIM Tick {e.simulationTick}</span>
          )}
          <span className="text-xs text-realm-text-muted ml-auto">{formatDateTime(e.startedAt)}</span>
        </div>
        <div className="text-lg font-display text-realm-text-primary">
          {e.characterName} <span className="text-realm-text-muted text-sm">vs</span> {e.opponentName}
        </div>
        {e.character && (
          <div className="text-xs text-realm-text-muted mt-0.5">
            {e.character.race}{e.character.class ? ` ${e.character.class}` : ''}, Level {e.character.level}
          </div>
        )}
      </div>

      {/* Combat stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-realm-bg-800/50 rounded p-3 space-y-2">
          <div className="text-xs font-display text-realm-text-secondary mb-1">
            <Swords className="w-3 h-3 inline mr-1" />Player
          </div>
          <HpBar current={e.characterEndHp} max={e.characterStartHp} label="HP" />
          {e.characterWeapon && (
            <div className="text-xs text-realm-text-muted">Weapon: <span className="text-realm-text-secondary">{e.characterWeapon}</span></div>
          )}
        </div>
        <div className="bg-realm-bg-800/50 rounded p-3 space-y-2">
          <div className="text-xs font-display text-realm-text-secondary mb-1">
            <Heart className="w-3 h-3 inline mr-1" />Opponent
          </div>
          <HpBar current={e.opponentEndHp} max={e.opponentStartHp} label="HP" />
          {e.opponentWeapon && (
            <div className="text-xs text-realm-text-muted">Weapon: <span className="text-realm-text-secondary">{e.opponentWeapon}</span></div>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-realm-text-muted">Rounds: <span className="text-realm-text-primary">{e.totalRounds}</span></span>
        {e.xpAwarded > 0 && <span className="text-blue-400">+{e.xpAwarded} XP</span>}
        {e.goldAwarded > 0 && <span className="text-realm-gold-400">+{e.goldAwarded} Gold</span>}
        {e.lootDropped && <span className="text-green-400">{e.lootDropped}</span>}
      </div>

      <div className="text-xs text-realm-text-muted">Source: {e.triggerSource}</div>

      {/* Summary */}
      {e.summary && (
        <div className="bg-realm-bg-800/50 rounded p-3">
          <div className="text-xs font-display text-realm-text-secondary mb-1">Summary</div>
          <div className="text-sm text-realm-text-primary whitespace-pre-wrap">{e.summary}</div>
        </div>
      )}

      {/* HP Timeline */}
      {hpTimeline && (
        <div className="bg-realm-bg-800/50 rounded p-3">
          <div className="text-xs font-display text-realm-text-secondary mb-2">HP Timeline</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={hpTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="round" tick={{ fill: '#9ca3af', fontSize: 10 }} label={{ value: 'Round', position: 'insideBottomRight', offset: -5, fill: '#6b7280', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#d1d5db' }}
                labelFormatter={(v) => `Round ${v}`}
              />
              <Line type="monotone" dataKey="playerHp" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name={e.characterName} />
              <Line type="monotone" dataKey="enemyHp" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name={e.opponentName} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Parsed combat log */}
      <div>
        <div className="text-xs font-display text-realm-text-secondary mb-2">Combat Log</div>
        <CombatRoundLog encounter={e} />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HistoryTab({ dataSource = 'live' }: { dataSource?: string }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('startedAt:desc');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [typeFilter, outcomeFilter, dateFrom, dateTo, sort, dataSource]);

  const [sortBy, sortOrder] = sort.split(':');
  const queryParams = useMemo(() => {
    const params: Record<string, string> = { page: String(page), limit: '25', dataSource, sortBy, sortOrder };
    if (typeFilter !== 'all') params.type = typeFilter;
    if (outcomeFilter !== 'all') params.outcome = outcomeFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    if (dateFrom) params.startDate = new Date(dateFrom).toISOString();
    if (dateTo) params.endDate = new Date(dateTo + 'T23:59:59.999Z').toISOString();
    return params;
  }, [page, dataSource, typeFilter, outcomeFilter, debouncedSearch, dateFrom, dateTo, sortBy, sortOrder]);

  const { data: historyData, isLoading: listLoading, error: listError } = useQuery<HistoryResponse>({
    queryKey: ['admin', 'combat', 'history', queryParams],
    queryFn: async () => (await api.get('/admin/combat/history', { params: queryParams })).data,
  });

  const encounters = historyData?.encounters ?? [];
  const total = historyData?.total ?? 0;
  const totalPages = historyData?.totalPages ?? 0;
  const selectedEncounter = encounters.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-realm-text-muted" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none">
              <option value="all">All Types</option>
              <option value="pve">PvE</option>
              <option value="pvp">PvP</option>
            </select>
          </div>
          <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none">
            <option value="all">All Outcomes</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="flee">Flee</option>
            <option value="draw">Draw</option>
          </select>
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-realm-text-muted" />
            <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-realm-text-muted" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none" />
            <span className="text-realm-text-muted text-xs">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-realm-text-muted" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none">
              {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex gap-3 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Left: Encounter list (~55%) */}
        <div className="w-[55%] flex flex-col bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {listLoading && [...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-realm-bg-800/50 rounded animate-pulse" />
            ))}
            {listError && <div className="p-4 text-center text-realm-danger text-sm">Failed to load combat encounters.</div>}
            {!listLoading && !listError && encounters.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-realm-text-muted gap-2">
                <ScrollText className="w-8 h-8 opacity-30" />
                <span className="text-sm">No encounters found matching your filters.</span>
              </div>
            )}
            {!listLoading && encounters.map((enc) => (
              <EncounterCard key={enc.id} encounter={enc} isSelected={enc.id === selectedId} onClick={() => setSelectedId(enc.id)} />
            ))}
          </div>
          <div className="border-t border-realm-border px-3 py-2">
            <Pagination page={page} totalPages={totalPages} total={total} limit={25} onPageChange={setPage} />
          </div>
        </div>

        {/* Right: Detail (~45%) */}
        <div className="w-[45%] bg-realm-bg-700 border border-realm-border rounded-lg overflow-y-auto">
          {!selectedEncounter && (
            <div className="h-full flex flex-col items-center justify-center text-realm-text-muted gap-3">
              <ScrollText className="w-10 h-10 opacity-30" />
              <span className="text-sm">Select a combat encounter to view details</span>
            </div>
          )}
          {selectedEncounter && <DetailPanel encounter={selectedEncounter} />}
        </div>
      </div>
    </div>
  );
}
