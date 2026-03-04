/**
 * Combat Simulator — Instrumented Runner
 *
 * Builds combatants from scenario definitions, steps through combat one turn
 * at a time with snapshots between every action, replicates AI decision logic.
 * Imports only pure functions from the combat engine — no DB, no Redis.
 */

import {
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  resolveTurn,
} from '../lib/combat-engine';
import { createRacialCombatTracker } from '../services/racial-combat-abilities';
import type { RacialCombatTracker } from '../services/racial-combat-abilities';
import type {
  CombatState,
  CombatAction,
  Combatant,
  WeaponInfo,
  SpellInfo,
  ItemInfo,
  TurnLogEntry,
  TurnResult,
  StatusTickResult,
  AttackResult,
  CastResult,
  FleeResult,
  ClassAbilityResult,
  SpellSlots,
} from '@shared/types/combat';
import { ALL_ABILITIES } from '@shared/data/skills';
import { applyPassiveAbilities } from '../lib/class-ability-resolver';

// Class ability ID set for dispatch detection
const CLASS_ABILITY_IDS = new Set(ALL_ABILITIES.map(a => a.id));
// Ability lookup map for chain tag resolution
const ABILITY_BY_ID = new Map(ALL_ABILITIES.map(a => [a.id, a]));
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import type {
  ScenarioDef,
  CombatantDef,
  CombatStance,
  AbilityQueueEntry,
  ItemUsageRule,
} from './combat-sim-scenarios';

// ---- Constants ----

const MAX_ROUNDS = 50;

// Stance modifier definitions (replicated from combat-presets.ts to avoid Prisma import)
const STANCE_MODIFIERS: Record<CombatStance, { attackBonus: number; acBonus: number; fleeBonus: number }> = {
  AGGRESSIVE: { attackBonus: 2, acBonus: -2, fleeBonus: 0 },
  BALANCED: { attackBonus: 0, acBonus: 0, fleeBonus: 0 },
  DEFENSIVE: { attackBonus: -2, acBonus: 2, fleeBonus: 0 },
  EVASIVE: { attackBonus: -4, acBonus: 4, fleeBonus: 4 },
};

// ---- Exported Types ----

export interface CombatantSnapshot {
  id: string;
  name: string;
  team: number;
  hp: number;
  maxHp: number;
  ac: number;
  isAlive: boolean;
  hasFled: boolean;
  statusEffects: { name: string; remainingRounds: number }[];
}

export interface TurnLog {
  actorId: string;
  actorName: string;
  action: string;
  reason: string;
  pre: CombatantSnapshot;
  post: CombatantSnapshot;
  statusTicks: StatusTickResult[];
  engineLog: string[];
  damageDealt: number;
  healingDone: number;
  kills: string[];
}

export interface RoundLog {
  roundNumber: number;
  turns: TurnLog[];
  endOfRoundSnapshot: CombatantSnapshot[];
}

export interface CombatantStatLine {
  id: string;
  name: string;
  team: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealingDone: number;
  kills: number;
  turnsActed: number;
}

export interface OutcomeLog {
  winner: string;
  totalRounds: number;
  survivors: { id: string; name: string; team: number; hpRemaining: number; maxHp: number }[];
  casualties: { id: string; name: string; team: number }[];
  fled: { id: string; name: string; team: number }[];
  combatantStats: CombatantStatLine[];
}

export interface SimulationResult {
  scenario: { name: string; description: string; type: string };
  seed: number | 'random';
  initiativeOrder: { id: string; name: string; team: number; roll: number; dexMod: number; total: number }[];
  rounds: RoundLog[];
  outcome: OutcomeLog;
  durationMs: number;
}

// ---- Internal Types ----

interface SimCombatantParams {
  id: string;
  stance: CombatStance;
  weapon: WeaponInfo | null;
  spells: SpellInfo[];
  items: ItemInfo[];
  retreatHpThreshold: number;
  neverRetreat: boolean;
  abilityQueue: AbilityQueueEntry[];
  itemUsageRules: ItemUsageRule[];
  racialTracker: RacialCombatTracker;
  race: string;
  level: number;
  subRace?: { id: string; element?: string } | null;
  unlockedAbilityIds: string[];
}

// ---- Snapshot Utility ----

function snapshot(combatant: Combatant): CombatantSnapshot {
  return {
    id: combatant.id,
    name: combatant.name,
    team: combatant.team,
    hp: combatant.currentHp,
    maxHp: combatant.maxHp,
    ac: combatant.ac,
    isAlive: combatant.isAlive,
    hasFled: combatant.hasFled ?? false,
    statusEffects: combatant.statusEffects.map(e => ({
      name: e.name,
      remainingRounds: e.remainingRounds,
    })),
  };
}

function snapshotAll(state: CombatState): CombatantSnapshot[] {
  return state.combatants.map(snapshot);
}

// ---- Replicated AI Decision Logic ----

/**
 * Replicated from tick-combat-resolver.ts decideAction.
 * Enhanced with reason strings explaining each decision.
 */
function simDecideAction(
  state: CombatState,
  actorId: string,
  params: SimCombatantParams,
): {
  action: CombatAction;
  context: { weapon?: WeaponInfo; spell?: SpellInfo; item?: ItemInfo };
  reason: string;
} {
  const actor = state.combatants.find(c => c.id === actorId);
  if (!actor || !actor.isAlive) {
    return {
      action: { type: 'defend', actorId },
      context: {},
      reason: 'dead or missing — forced defend',
    };
  }

  const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
  const allies = state.combatants.filter(c => c.team === actor.team && c.isAlive);

  // 1. Check retreat conditions
  if (!params.neverRetreat) {
    const hpPercent = (actor.currentHp / actor.maxHp) * 100;
    if (params.retreatHpThreshold > 0 && hpPercent <= params.retreatHpThreshold) {
      return {
        action: { type: 'flee', actorId },
        context: {},
        reason: `flee: HP at ${Math.round(hpPercent)}% <= threshold ${params.retreatHpThreshold}%`,
      };
    }
  }

  // 1c. Setup→Payoff ability chaining
  const actorSetupTags = actor.setupTags ?? [];
  const chainTarget = enemies.length > 0 ? enemies[0] : null;

  // If actor has a setup tag, prioritize the payoff ability
  if (actorSetupTags.length > 0 && chainTarget) {
    for (const entry of params.abilityQueue) {
      if (!entry.abilityId || !CLASS_ABILITY_IDS.has(entry.abilityId)) continue;
      const def = ABILITY_BY_ID.get(entry.abilityId);
      if (!def?.requiresSetupTag) continue;
      if (!actorSetupTags.includes(def.requiresSetupTag)) continue;
      const cooldownRemaining = actor.abilityCooldowns?.[entry.abilityId] ?? 0;
      if (cooldownRemaining > 0) continue;
      // Dispatch psion abilities via psion_ability path
      if (entry.abilityId.startsWith('psi-')) {
        return {
          action: { type: 'psion_ability', actorId, psionAbilityId: entry.abilityId, targetId: chainTarget.id, targetIds: enemies.map(e => e.id) },
          context: {},
          reason: `chain payoff: ${entry.abilityName} (setup tag: ${def.requiresSetupTag})`,
        };
      }
      return {
        action: { type: 'class_ability', actorId, classAbilityId: entry.abilityId, targetId: chainTarget.id, targetIds: enemies.map(e => e.id) },
        context: {},
        reason: `chain payoff: ${entry.abilityName} (setup tag: ${def.requiresSetupTag})`,
      };
    }
  }

  // If no setup tag active, consider initiating a setup when payoff is available
  if (actorSetupTags.length === 0 && chainTarget) {
    const hpPercentForSetup = (actor.currentHp / actor.maxHp) * 100;
    if (hpPercentForSetup > 30) {
      for (const entry of params.abilityQueue) {
        if (!entry.abilityId || !CLASS_ABILITY_IDS.has(entry.abilityId)) continue;
        const def = ABILITY_BY_ID.get(entry.abilityId);
        if (!def?.grantsSetupTag) continue;
        const setupCd = actor.abilityCooldowns?.[entry.abilityId] ?? 0;
        if (setupCd > 0) continue;
        const payoffDef = ALL_ABILITIES.find(a => a.requiresSetupTag === def.grantsSetupTag);
        if (!payoffDef) continue;
        const payoffCd = actor.abilityCooldowns?.[payoffDef.id] ?? 0;
        if (payoffCd > 1) continue;
        // Don't re-setup if tag already active
        if (actorSetupTags.includes(def.grantsSetupTag)) continue;
        if (entry.abilityId.startsWith('psi-')) {
          return {
            action: { type: 'psion_ability', actorId, psionAbilityId: entry.abilityId, targetId: chainTarget.id, targetIds: enemies.map(e => e.id) },
            context: {},
            reason: `chain setup: ${entry.abilityName} (grants tag: ${def.grantsSetupTag})`,
          };
        }
        return {
          action: { type: 'class_ability', actorId, classAbilityId: entry.abilityId, targetId: chainTarget.id, targetIds: enemies.map(e => e.id) },
          context: {},
          reason: `chain setup: ${entry.abilityName} (grants tag: ${def.grantsSetupTag})`,
        };
      }
    }
  }

  // 2. Check ability priority queue
  for (const entry of params.abilityQueue) {
    const hpPercent = (actor.currentHp / actor.maxHp) * 100;
    let shouldUse = false;
    let condDesc = '';

    switch (entry.useWhen) {
      case 'always':
        shouldUse = true;
        condDesc = 'always';
        break;
      case 'low_hp':
        shouldUse = hpPercent <= (entry.hpThreshold ?? 50);
        condDesc = `low_hp: ${Math.round(hpPercent)}% <= ${entry.hpThreshold ?? 50}%`;
        break;
      case 'high_hp':
        shouldUse = hpPercent >= (entry.hpThreshold ?? 75);
        condDesc = `high_hp: ${Math.round(hpPercent)}% >= ${entry.hpThreshold ?? 75}%`;
        break;
      case 'first_round':
        shouldUse = state.round <= 1;
        condDesc = `first_round: round=${state.round}`;
        break;
      case 'outnumbered':
        shouldUse = enemies.length > allies.length;
        condDesc = `outnumbered: ${enemies.length} enemies vs ${allies.length} allies`;
        break;
      case 'has_companion': {
        const hasCompanion = actor.activeBuffs?.some(b => b.companionHp != null && b.companionHp > 0) ?? false;
        shouldUse = hasCompanion;
        condDesc = `has_companion: ${hasCompanion}`;
        break;
      }
      default:
        shouldUse = true;
        condDesc = 'default';
    }

    if (shouldUse) {
      const target = enemies.length > 0 ? enemies[0] : null;

      // Dispatch as class_ability or psion_ability if it's a known ability, else racial_ability
      if (entry.abilityId && CLASS_ABILITY_IDS.has(entry.abilityId)) {
        // Check cooldown
        const cooldownRemaining = actor.abilityCooldowns?.[entry.abilityId] ?? 0;
        if (cooldownRemaining > 0) continue; // skip to next ability in queue

        // Psion abilities need psion_ability dispatch (different resolver path)
        if (entry.abilityId.startsWith('psi-')) {
          // Support ally targeting (e.g., Translocation ally shield)
          let psiTargetId = target?.id;
          if (entry.targetAlly) {
            const ally = allies.find(a => a.id !== actorId);
            if (ally) psiTargetId = ally.id;
          }
          return {
            action: {
              type: 'psion_ability',
              actorId,
              psionAbilityId: entry.abilityId,
              targetId: psiTargetId,
              targetIds: enemies.map(e => e.id),
            },
            context: {},
            reason: `psion ability: ${entry.abilityName} (${condDesc})`,
          };
        }

        return {
          action: {
            type: 'class_ability',
            actorId,
            classAbilityId: entry.abilityId,
            targetId: target?.id,
            targetIds: enemies.map(e => e.id),
          },
          context: {},
          reason: `class ability: ${entry.abilityName} (${condDesc})`,
        };
      }

      return {
        action: {
          type: 'racial_ability',
          actorId,
          racialAbilityName: entry.abilityName,
          targetId: target?.id,
          targetIds: enemies.map(e => e.id),
        },
        context: {},
        reason: `racial ability: ${entry.abilityName} (${condDesc})`,
      };
    }
  }

  // 3. Check item usage rules
  for (const rule of params.itemUsageRules) {
    let shouldUse = false;
    const hpPercent = (actor.currentHp / actor.maxHp) * 100;

    switch (rule.useWhen) {
      case 'hp_below':
        shouldUse = hpPercent <= (rule.threshold ?? 30);
        break;
      case 'status_effect':
        shouldUse = rule.statusEffect
          ? actor.statusEffects.some(e => e.name === rule.statusEffect)
          : false;
        break;
      case 'first_round':
        shouldUse = state.round <= 1;
        break;
    }

    if (shouldUse) {
      const isHeal = rule.useWhen === 'hp_below' || rule.useWhen === 'status_effect';
      const targetId = isHeal ? actorId : (enemies[0]?.id ?? actorId);
      return {
        action: {
          type: 'item',
          actorId,
          targetId,
          resourceId: rule.itemTemplateId,
        },
        context: {
          item: {
            id: rule.itemTemplateId,
            name: rule.itemName,
            type: isHeal ? 'heal' : 'damage',
            flatAmount: 20,
          },
        },
        reason: `item: ${rule.itemName} (${rule.useWhen})`,
      };
    }
  }

  // 4. Spellcasting — use highest available spell on enemy (if applicable)
  if (params.spells.length > 0 && enemies.length > 0) {
    // Try spells from highest level to lowest
    const sortedSpells = [...params.spells].sort((a, b) => b.level - a.level);
    for (const spell of sortedSpells) {
      if (spell.level === 0) {
        // Cantrip — always available, but deprioritize vs slotted spells
        continue;
      }
      const slotsAvail = actor.spellSlots[spell.level] ?? 0;
      if (slotsAvail > 0) {
        // Healing spells target self or weakest ally
        if (spell.type === 'heal') {
          const wounded = allies
            .filter(a => a.currentHp < a.maxHp)
            .sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp);
          if (wounded.length > 0 && wounded[0].currentHp / wounded[0].maxHp < 0.5) {
            return {
              action: {
                type: 'cast',
                actorId,
                targetId: wounded[0].id,
                resourceId: spell.id,
                spellSlotLevel: spell.level,
              },
              context: { spell },
              reason: `cast: ${spell.name} on ${wounded[0].name} (HP ${Math.round((wounded[0].currentHp / wounded[0].maxHp) * 100)}%)`,
            };
          }
          continue; // Don't waste heals if nobody is hurt
        }

        // Buff spells target self
        if (spell.type === 'status' && !spell.requiresSave) {
          return {
            action: {
              type: 'cast',
              actorId,
              targetId: actorId,
              resourceId: spell.id,
              spellSlotLevel: spell.level,
            },
            context: { spell },
            reason: `cast: ${spell.name} (self-buff)`,
          };
        }

        // Damage / damage_status spells target weakest enemy
        const target = enemies.reduce((w, e) => (e.currentHp < w.currentHp ? e : w));
        return {
          action: {
            type: 'cast',
            actorId,
            targetId: target.id,
            resourceId: spell.id,
            spellSlotLevel: spell.level,
          },
          context: { spell },
          reason: `cast: ${spell.name} L${spell.level} on ${target.name} (HP ${target.currentHp}/${target.maxHp})`,
        };
      }
    }

    // Fallback: try cantrip (level 0 spell)
    const cantrip = sortedSpells.find(s => s.level === 0);
    if (cantrip && enemies.length > 0) {
      const target = enemies.reduce((w, e) => (e.currentHp < w.currentHp ? e : w));
      // Cantrips don't use spell slots, so we treat them as level-0 casts
      // The engine still calls resolveCast; we pass slotLevel=0
      // However the engine checks spellSlots[slotLevel] > 0 for non-zero levels.
      // For cantrips we'll fall through to melee if the engine would reject it.
    }
  }

  // 5. Default: attack the weakest enemy
  if (enemies.length === 0) {
    return {
      action: { type: 'defend', actorId },
      context: {},
      reason: 'defend: no enemies remaining',
    };
  }

  const target = enemies.reduce((weakest, e) =>
    e.currentHp < weakest.currentHp ? e : weakest,
  );

  return {
    action: {
      type: 'attack',
      actorId,
      targetId: target.id,
    },
    context: {
      weapon: params.weapon ?? undefined,
    },
    reason: `attack: targeting ${target.name} (lowest HP: ${target.currentHp}/${target.maxHp})`,
  };
}

// ---- Combatant Building ----

function buildCombatants(scenario: ScenarioDef): Combatant[] {
  return scenario.combatants.map(def => {
    const profBonus = getProficiencyBonus(def.level);

    let combatant: Combatant;
    if (def.entityType === 'character') {
      combatant = createCharacterCombatant(
        def.id,
        def.name,
        def.team,
        def.stats,
        def.level,
        def.hp,
        def.maxHp,
        def.ac,
        def.weapon,
        def.spellSlots ?? {},
        profBonus,
      );
      // Set class-related fields
      if (def.characterClass) combatant = { ...combatant, characterClass: def.characterClass };
      if (def.specialization) combatant = { ...combatant, specialization: def.specialization };
      if (def.race) combatant = { ...combatant, race: def.race };

      // Apply passive class abilities at combat start
      if (def.unlockedAbilityIds && def.unlockedAbilityIds.length > 0) {
        combatant = applyPassiveAbilities(combatant, def.unlockedAbilityIds);
      }
    } else {
      combatant = createMonsterCombatant(
        def.id,
        def.name,
        def.team,
        def.stats,
        def.level,
        def.hp,
        def.ac,
        def.weapon,
        profBonus,
      );
    }

    // Apply optional CombatantDef overrides (statusEffects, antiHealAura)
    if (def.statusEffects && def.statusEffects.length > 0) {
      combatant = { ...combatant, statusEffects: [...(combatant.statusEffects ?? []), ...def.statusEffects] };
    }
    if (def.antiHealAura) {
      combatant = { ...combatant, antiHealAura: true };
    }

    return combatant;
  });
}

function buildParams(def: CombatantDef): SimCombatantParams {
  return {
    id: def.id,
    stance: def.stance ?? 'BALANCED',
    weapon: def.weapon,
    spells: def.spells ?? [],
    items: def.items ?? [],
    retreatHpThreshold: def.retreatHpThreshold ?? (def.entityType === 'monster' ? 0 : 20),
    neverRetreat: def.neverRetreat ?? (def.entityType === 'monster'),
    abilityQueue: def.abilityQueue ?? [],
    itemUsageRules: def.itemUsageRules ?? [],
    racialTracker: createRacialCombatTracker(),
    race: def.race ?? '',
    level: def.level,
    subRace: def.subRace,
    unlockedAbilityIds: def.unlockedAbilityIds ?? [],
  };
}

function buildAllParams(scenario: ScenarioDef): Map<string, SimCombatantParams> {
  const map = new Map<string, SimCombatantParams>();
  for (const def of scenario.combatants) {
    map.set(def.id, buildParams(def));
  }
  return map;
}

// ---- Turn Result Analysis ----

function extractTurnDetails(result: TurnResult): {
  damageDealt: number;
  healingDone: number;
  kills: string[];
  logLines: string[];
} {
  let damageDealt = 0;
  let healingDone = 0;
  const kills: string[] = [];
  const logLines: string[] = [];

  switch (result.type) {
    case 'attack': {
      const r = result as AttackResult;
      if (r.hit) {
        logLines.push(
          `Attack: d20(${r.attackRoll}) total ${r.attackTotal} vs AC ${r.targetAC} → HIT${r.critical ? ' (CRITICAL!)' : ''}`,
        );
        logLines.push(
          `Damage: ${r.weaponDice ?? '?'} [${r.damageRolls?.join(', ') ?? '?'}] = ${r.totalDamage} ${r.damageType ?? ''}`,
        );
        damageDealt = r.totalDamage;
        if (r.targetHpBefore !== undefined) {
          logLines.push(`Target HP: ${r.targetHpBefore} → ${r.targetHpAfter}`);
        }
      } else {
        logLines.push(
          `Attack: d20(${r.attackRoll}) total ${r.attackTotal} vs AC ${r.targetAC} → MISS`,
        );
      }
      // Phase 3: Companion interception
      if (r.companionIntercepted) {
        logLines.push(`Companion intercepted! Absorbed ${r.companionDamageAbsorbed ?? 0} damage${r.companionKilled ? ' (companion killed)' : ''}`);
      }
      // Phase 3: Counter/trap reactive
      if (r.counterTriggered) {
        logLines.push(`Counter triggered: ${r.counterAbilityName ?? 'reactive'} deals ${r.counterDamage ?? 0} damage${r.counterAoe ? ' (AoE)' : ''}`);
      }
      // Phase 4: Death prevention
      if (r.deathPrevented) {
        logLines.push(`Target survived lethal damage via ${r.deathPreventedAbility ?? 'death prevention'}! (1 HP)`);
      }
      if (r.attackerDeathPrevented) {
        logLines.push(`Attacker survived lethal damage via ${r.attackerDeathPreventedAbility ?? 'death prevention'}! (1 HP)`);
      }
      if (r.targetKilled) {
        kills.push(r.targetId);
        logLines.push(`Target killed!`);
      }
      break;
    }
    case 'cast': {
      const r = result as CastResult;
      logLines.push(`Cast: ${r.spellName} (L${r.spellLevel}, slot L${r.slotExpended})`);
      if (r.saveRequired) {
        logLines.push(
          `Save: d20(${r.saveRoll ?? '?'}) total ${r.saveTotal ?? '?'} vs DC ${r.saveDC ?? '?'} → ${r.saveSucceeded ? 'SAVED' : 'FAILED'}`,
        );
      }
      if (r.totalDamage && r.totalDamage > 0) {
        damageDealt = r.totalDamage;
        logLines.push(`Damage: ${r.totalDamage}`);
      }
      if (r.healAmount && r.healAmount > 0) {
        healingDone = r.healAmount;
        logLines.push(`Healing: +${r.healAmount}`);
      }
      if (r.statusApplied) {
        logLines.push(`Status applied: ${r.statusApplied} (${r.statusDuration ?? '?'} rounds)`);
      }
      if (r.targetKilled) {
        kills.push(r.targetId);
        logLines.push(`Target killed!`);
      }
      break;
    }
    case 'defend': {
      logLines.push(`Defend: +${result.acBonusGranted} AC`);
      break;
    }
    case 'item': {
      logLines.push(`Item: ${result.itemName}`);
      if (result.healAmount) {
        healingDone = result.healAmount;
        logLines.push(`Healing: +${result.healAmount}`);
      }
      if (result.damageAmount) {
        damageDealt = result.damageAmount;
        logLines.push(`Damage: ${result.damageAmount}`);
      }
      break;
    }
    case 'flee': {
      const r = result as FleeResult;
      logLines.push(
        `Flee: d20(${r.fleeRoll}) vs DC ${r.fleeDC} → ${r.success ? 'ESCAPED!' : 'FAILED'}`,
      );
      break;
    }
    case 'racial_ability': {
      logLines.push(`Racial: ${result.abilityName} — ${result.description}`);
      if (result.damage) {
        damageDealt = result.damage;
        logLines.push(`Damage: ${result.damage}`);
      }
      if (result.healing) {
        healingDone = result.healing;
        logLines.push(`Healing: +${result.healing}`);
      }
      break;
    }
    case 'psion_ability': {
      logLines.push(`Psion: ${result.abilityName} — ${result.description}`);
      if (result.damage) {
        damageDealt = result.damage;
        logLines.push(`Damage: ${result.damage}`);
      }
      if (result.targetKilled) {
        if (result.targetId) kills.push(result.targetId);
        logLines.push(`Target killed!`);
      }
      break;
    }
    case 'class_ability': {
      const r = result as ClassAbilityResult;
      logLines.push(`Class: ${r.abilityName} [${r.effectType}] — ${r.description}`);
      if (r.damage && r.damage > 0) {
        damageDealt = r.damage;
        logLines.push(`Damage: ${r.damage}`);
      }
      if (r.healing && r.healing > 0) {
        healingDone = r.healing;
        logLines.push(`Healing: +${r.healing}`);
      }
      if (r.selfHealing && r.selfHealing > 0) {
        healingDone += r.selfHealing;
        logLines.push(`Self healing: +${r.selfHealing}`);
      }
      if (r.buffApplied) {
        logLines.push(`Buff: ${r.buffApplied} (${r.buffDuration ?? '?'} rounds)`);
      }
      if (r.statusApplied) {
        logLines.push(`Status: ${r.statusApplied} (${r.statusDuration ?? '?'} rounds)`);
      }
      // Per-target AoE breakdown
      if (r.perTargetResults && r.perTargetResults.length > 0) {
        let aoeTotalDmg = 0;
        for (const ptr of r.perTargetResults) {
          const dmgStr = ptr.damage ? ` ${ptr.damage} dmg` : '';
          const healStr = ptr.healing ? ` +${ptr.healing} heal` : '';
          const killStr = ptr.killed ? ' KILLED' : '';
          logLines.push(`  → ${ptr.targetName}:${dmgStr}${healStr} (HP ${ptr.hpAfter})${killStr}`);
          if (ptr.damage) aoeTotalDmg += ptr.damage;
          if (ptr.killed) kills.push(ptr.targetId);
        }
        if (aoeTotalDmg > 0) damageDealt = aoeTotalDmg;
      }
      // Multi-attack strike breakdown
      if (r.strikeResults && r.strikeResults.length > 0) {
        logLines.push(`  Strikes: ${r.strikesHit ?? 0}/${r.totalStrikes ?? 0} hit`);
        let strikeTotalDmg = 0;
        for (const sr of r.strikeResults) {
          const hitStr = sr.hit ? (sr.crit ? 'CRIT' : 'HIT') : 'MISS';
          const rollStr = sr.attackRoll ? ` d20(${sr.attackRoll}) total ${sr.attackTotal} vs AC ${sr.targetAc}` : '';
          logLines.push(`  → Strike ${sr.strikeNumber}: ${hitStr}${rollStr} — ${sr.damage} dmg`);
          strikeTotalDmg += sr.damage;
        }
        if (strikeTotalDmg > 0) damageDealt = strikeTotalDmg;
      }
      if (r.targetKilled) {
        if (r.targetId) kills.push(r.targetId);
        logLines.push(`Target killed!`);
      }
      if (r.fallbackToAttack) {
        logLines.push(`(fell back to basic attack)`);
      }
      // Phase 3: Steal results
      if (r.goldStolen && r.goldStolen > 0) {
        logLines.push(`Gold stolen: ${r.goldStolen}`);
      }
      if (r.bonusLootRoll) {
        logLines.push(`Bonus loot roll granted!`);
      }
      // Phase 3: Special results
      if (r.peacefulResolution) {
        logLines.push(`PEACEFUL RESOLUTION — combat ends with no penalties!`);
      }
      if (r.randomAbilityUsed) {
        logLines.push(`Random ability used: ${r.randomAbilityUsed}`);
      }
      break;
    }
  }

  return { damageDealt, healingDone, kills, logLines };
}

// ---- Core Simulation ----

export function runCombatSim(scenario: ScenarioDef, seed: number | 'random'): SimulationResult {
  const startTime = Date.now();

  // 1. Build combatants and params
  const combatants = buildCombatants(scenario);
  const paramsMap = buildAllParams(scenario);

  // 2. Create initial combat state (calls rollAllInitiative internally)
  const sessionId = `sim-${scenario.name}-${Date.now()}`;
  let state = createCombatState(sessionId, scenario.type, combatants);

  // 3. Extract initiative order for logging
  const initiativeOrder = state.turnOrder.map(id => {
    const c = state.combatants.find(x => x.id === id)!;
    const dexMod = getModifier(c.stats.dex);
    return {
      id: c.id,
      name: c.name,
      team: c.team,
      roll: c.initiative - dexMod, // raw d20 roll (initiative = roll + dexMod)
      dexMod,
      total: c.initiative,
    };
  });

  // 4. Run instrumented loop
  const rounds: RoundLog[] = [];
  const combatantStats = new Map<string, CombatantStatLine>();

  // Initialize stat tracking
  for (const c of state.combatants) {
    combatantStats.set(c.id, {
      id: c.id,
      name: c.name,
      team: c.team,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealingDone: 0,
      kills: 0,
      turnsActed: 0,
    });
  }

  let currentRound: RoundLog = { roundNumber: 1, turns: [], endOfRoundSnapshot: [] };
  let lastRound = 1;

  while (state.status === 'ACTIVE' && state.round <= MAX_ROUNDS) {
    // Start new round if needed
    if (state.round !== lastRound) {
      currentRound.endOfRoundSnapshot = snapshotAll(state);
      rounds.push(currentRound);
      currentRound = { roundNumber: state.round, turns: [], endOfRoundSnapshot: [] };
      lastRound = state.round;
    }

    const actorId = state.turnOrder[state.turnIndex];
    const actor = state.combatants.find(c => c.id === actorId);

    if (!actor) break; // Safety

    // Skip dead/fled combatants
    if (!actor.isAlive || actor.hasFled) {
      // The engine's resolveTurn + advanceTurn handles this, but we need to step
      const params = paramsMap.get(actorId);
      const racialContext = params?.race
        ? {
            tracker: params.racialTracker,
            race: params.race,
            level: params.level,
            subRace: params.subRace,
          }
        : undefined;

      const prevLogLen = state.log.length;
      state = resolveTurn(
        state,
        { type: 'defend', actorId },
        {},
        racialContext,
      );
      continue;
    }

    // Pre-snapshot
    const pre = snapshot(actor);

    // Get params for this combatant
    const params = paramsMap.get(actorId);
    if (!params) break; // Safety

    // Decide action
    const decision = simDecideAction(state, actorId, params);

    // Apply stance modifier before turn (and revert after to prevent stacking)
    const stanceMods = STANCE_MODIFIERS[params.stance];
    const stanceAcDelta = params.stance !== 'BALANCED' ? stanceMods.acBonus : 0;
    if (stanceAcDelta !== 0) {
      state = {
        ...state,
        combatants: state.combatants.map(c =>
          c.id === actorId ? { ...c, ac: c.ac + stanceAcDelta } : c,
        ),
      };
    }

    // Capture log length before engine call
    const logLenBefore = state.log.length;

    // Build racial context
    const racialContext = params.race
      ? {
          tracker: params.racialTracker,
          race: params.race,
          level: params.level,
          subRace: params.subRace,
        }
      : undefined;

    // Resolve the turn through the engine
    state = resolveTurn(state, decision.action, decision.context, racialContext);

    // Revert stance AC modifier to prevent accumulation across turns
    if (stanceAcDelta !== 0) {
      state = {
        ...state,
        combatants: state.combatants.map(c =>
          c.id === actorId ? { ...c, ac: c.ac - stanceAcDelta } : c,
        ),
      };
    }

    // Extract new log entries produced by the engine
    const newLogEntries = state.log.slice(logLenBefore);

    // Post-snapshot
    const postActor = state.combatants.find(c => c.id === actorId);
    const post = postActor ? snapshot(postActor) : { ...pre, hp: 0, isAlive: false, hasFled: false };

    // Extract details from all new log entries
    let totalDamageDealt = 0;
    let totalHealingDone = 0;
    const allKills: string[] = [];
    const allLogLines: string[] = [];
    const statusTicks: StatusTickResult[] = [];

    for (const entry of newLogEntries) {
      const details = extractTurnDetails(entry.result);
      totalDamageDealt += details.damageDealt;
      totalHealingDone += details.healingDone;
      allKills.push(...details.kills);
      allLogLines.push(...details.logLines);
      statusTicks.push(...entry.statusTicks);
    }

    // Map kill IDs to names
    const killNames = allKills.map(kid => {
      const victim = state.combatants.find(c => c.id === kid);
      return victim?.name ?? kid;
    });

    // Build turn log
    const turnLog: TurnLog = {
      actorId,
      actorName: actor.name,
      action: decision.action.type,
      reason: decision.reason,
      pre,
      post,
      statusTicks,
      engineLog: allLogLines,
      damageDealt: totalDamageDealt,
      healingDone: totalHealingDone,
      kills: killNames,
    };

    currentRound.turns.push(turnLog);

    // Update stat tracking
    const stats = combatantStats.get(actorId)!;
    stats.totalDamageDealt += totalDamageDealt;
    stats.totalHealingDone += totalHealingDone;
    stats.kills += allKills.length;
    stats.turnsActed++;

    // Track damage taken on targets
    for (const entry of newLogEntries) {
      if (entry.result.type === 'attack') {
        const ar = entry.result as AttackResult;
        if (ar.hit) {
          const targetStats = combatantStats.get(ar.targetId);
          if (targetStats) targetStats.totalDamageTaken += ar.totalDamage;
        }
      }
      if (entry.result.type === 'cast') {
        const cr = entry.result as CastResult;
        if (cr.totalDamage && cr.totalDamage > 0) {
          const targetStats = combatantStats.get(cr.targetId);
          if (targetStats) targetStats.totalDamageTaken += cr.totalDamage;
        }
      }
    }
  }

  // Push final round
  currentRound.endOfRoundSnapshot = snapshotAll(state);
  rounds.push(currentRound);

  // 5. Compile outcome
  const survivors = state.combatants
    .filter(c => c.isAlive && !c.hasFled)
    .map(c => ({ id: c.id, name: c.name, team: c.team, hpRemaining: c.currentHp, maxHp: c.maxHp }));

  const casualties = state.combatants
    .filter(c => !c.isAlive)
    .map(c => ({ id: c.id, name: c.name, team: c.team }));

  const fled = state.combatants
    .filter(c => c.hasFled)
    .map(c => ({ id: c.id, name: c.name, team: c.team }));

  let winner: string;
  if (state.peacefulResolution) {
    winner = 'peaceful resolution';
  } else if (state.winningTeam !== null && state.winningTeam !== undefined) {
    // Find a team name from survivors
    const winTeamMembers = state.combatants.filter(c => c.team === state.winningTeam && c.isAlive);
    if (winTeamMembers.length === 1) {
      winner = winTeamMembers[0].name;
    } else {
      winner = `Team ${state.winningTeam}`;
    }
  } else if (fled.length > 0 && survivors.length > 0) {
    winner = survivors[0].name;
  } else {
    winner = 'draw';
  }

  const outcome: OutcomeLog = {
    winner,
    totalRounds: state.round,
    survivors,
    casualties,
    fled,
    combatantStats: Array.from(combatantStats.values()),
  };

  return {
    scenario: { name: scenario.name, description: scenario.description, type: scenario.type },
    seed,
    initiativeOrder,
    rounds,
    outcome,
    durationMs: Date.now() - startTime,
  };
}
