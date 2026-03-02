/**
 * Shared combat log narrator formatter.
 * Used by both PvE and PvP routes to transform raw TurnLogEntry[]
 * into narrated CombatLogEntry[] for the client.
 */

import type { CombatState } from '@shared/types/combat';
import {
  narrateCombatEvent,
  narrateStatusTick,
  narrateCombatOpening,
  narratePvpOpening,
} from '@shared/data/combat-narrator';
import type { NarrationContext, NarratorLogEntry } from '@shared/data/combat-narrator';

export interface CombatLogEntry {
  id: string;
  actor: string;
  actorType: 'player' | 'enemy' | 'system';
  action: string;
  roll?: number;
  damage?: number;
  healing?: number;
  message: string;
  isCritical: boolean;
  timestamp: string;
}

export interface FormatCombatLogOptions {
  /** PvP mode — changes opening line and actorType assignment */
  isPvp?: boolean;
  /** For PvP: the requesting character's ID (used to determine perspective) */
  requestingCharacterId?: string;
  /** For PvP spar: use friendlier opening lines */
  isSpar?: boolean;
}

/**
 * Transform a CombatState's raw log into narrated CombatLogEntry[].
 */
export function formatCombatLog(
  state: CombatState,
  options: FormatCombatLogOptions = {},
): CombatLogEntry[] {
  const combatantMap = new Map(state.combatants.map(c => [c.id, c]));

  // Determine actorType for each combatant
  function getActorType(combatantId: string): 'player' | 'enemy' {
    const c = combatantMap.get(combatantId);
    if (!c) return 'player';

    if (options.isPvp) {
      // In PvP, perspective depends on requesting player
      if (options.requestingCharacterId) {
        return combatantId === options.requestingCharacterId ? 'player' : 'enemy';
      }
      // Fallback: team 0 = player, team 1 = enemy
      return c.team === 0 ? 'player' : 'enemy';
    }

    // PvE: monster = enemy
    return c.entityType === 'monster' ? 'enemy' : 'player';
  }

  // Build opening entry
  let openingEntry: CombatLogEntry | null = null;

  if (options.isPvp) {
    // Find opponent name for PvP opening
    const opponent = options.requestingCharacterId
      ? state.combatants.find(c => c.id !== options.requestingCharacterId)
      : state.combatants[1];
    if (opponent) {
      openingEntry = {
        id: `${state.sessionId}-opening`,
        actor: '',
        actorType: 'system',
        action: 'opening',
        message: narratePvpOpening(opponent.name, !!options.isSpar),
        isCritical: false,
        timestamp: new Date().toISOString(),
      };
    }
  } else {
    // PvE: monster opening
    const monster = state.combatants.find(c => c.entityType === 'monster');
    if (monster) {
      openingEntry = {
        id: `${state.sessionId}-opening`,
        actor: '',
        actorType: 'system',
        action: 'opening',
        message: narrateCombatOpening(monster.name),
        isCritical: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Transform log entries
  const log = state.log.flatMap((entry, idx) => {
    const actor = combatantMap.get(entry.actorId);
    const result = entry.result as unknown as Record<string, unknown>;
    const targetId = (result.targetId as string) || '';
    const target = targetId ? combatantMap.get(targetId) : undefined;

    // Build narration context
    const ctx: NarrationContext = {
      actorName: actor?.name ?? 'Unknown',
      actorRace: (actor as any)?.race ?? undefined,
      actorClass: (actor as any)?.characterClass ?? undefined,
      actorEntityType: actor?.entityType ?? 'character',
      actorHpPercent: actor ? Math.round((actor.currentHp / actor.maxHp) * 100) : 100,
      targetName: target?.name,
      targetEntityType: target?.entityType,
      targetHpPercent: target ? Math.round((target.currentHp / target.maxHp) * 100) : undefined,
      targetKilled: result.targetKilled as boolean | undefined,
      weaponName: (result.weaponName as string) || (actor?.weapon as any)?.name,
    };

    const narEntry: NarratorLogEntry = {
      round: entry.round,
      actorId: entry.actorId,
      action: entry.action,
      result: { type: (result.type as string) || entry.action, actorId: entry.actorId, ...result },
      statusTicks: entry.statusTicks,
    };

    const message = narrateCombatEvent(narEntry, ctx);

    // Extract mechanical data for UI
    const roll = (result.attackRoll as number) || (result.fleeRoll as number) || undefined;
    const damage = (result.totalDamage as number) || (result.damage as number) || undefined;
    const healing = (result.healAmount as number) || (result.healing as number) || (result.selfHealing as number) || undefined;

    const entries: CombatLogEntry[] = [{
      id: `${state.sessionId}-${idx}`,
      actor: actor?.name ?? 'Unknown',
      actorType: getActorType(entry.actorId),
      action: entry.action,
      roll,
      damage: damage && damage > 0 ? damage : undefined,
      healing: healing && healing > 0 ? healing : undefined,
      message,
      isCritical: !!(result.critical),
      timestamp: new Date().toISOString(),
    }];

    // Expand status ticks
    if (entry.statusTicks) {
      for (let si = 0; si < entry.statusTicks.length; si++) {
        const tick = entry.statusTicks[si];
        const tickTarget = combatantMap.get(tick.combatantId);
        const tickMsg = narrateStatusTick(tick.effectName, tick.damage, tick.healing, tick.expired, tick.killed);
        if (tickMsg) {
          entries.push({
            id: `${state.sessionId}-${idx}-st${si}`,
            actor: tickTarget?.name ?? 'Unknown',
            actorType: getActorType(tick.combatantId),
            action: 'status',
            damage: tick.damage && tick.damage > 0 ? tick.damage : undefined,
            healing: tick.healing && tick.healing > 0 ? tick.healing : undefined,
            message: tickMsg,
            isCritical: false,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return entries;
  });

  return openingEntry ? [openingEntry, ...log] : log;
}
