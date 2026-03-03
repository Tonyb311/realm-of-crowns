/**
 * Autonomous combat resolver for tick processing.
 * Wraps the existing combat-engine.ts with an AI decision layer
 * that reads each combatant's combat presets to decide actions.
 *
 * IMPORTANT: This does NOT rewrite combat formulas. It imports and uses
 * the existing combat-engine functions for all actual resolution.
 */

import { prisma } from '../lib/prisma';
import { ItemRarity } from '@prisma/client';
import { calculateItemStats } from './item-stats';
import {
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  rollAllInitiative,
  resolveTurn,
  resolveAttack,
  resolveFlee,
  calculateDeathPenalty,
  calculateAC,
  checkCombatEnd,
  STATUS_EFFECT_DEFS,
} from '../lib/combat-engine';
import { resolveMonsterAbility } from '../lib/monster-ability-resolver';
import type {
  CombatState,
  CombatAction,
  Combatant,
  WeaponInfo,
  CharacterStats,
  TurnLogEntry,
  CombatDamageType,
  MonsterAbilityInstance,
  MonsterAbility,
  LegendaryActionResult,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import {
  getCombatPresets,
  buildCombatParams,
  STANCE_MODIFIERS,
  type CombatPresets,
  type CombatStance,
  type StanceModifiers,
} from './combat-presets';
import { getMonsterKillXp } from '@shared/data/progression';
import {
  createRacialCombatTracker,
  type RacialCombatTracker,
} from './racial-combat-abilities';
import { processItemDrops } from '../lib/loot-items';
import { applyClassWeaponStat } from '../lib/road-encounter';
import { ALL_ABILITIES } from '@shared/data/skills';

// ---- Monster Ability Instance Builder ----

function buildMonsterAbilityInstances(abilities: unknown[]): MonsterAbilityInstance[] {
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  return abilities.map((a: any) => ({
    def: a as MonsterAbility,
    cooldownRemaining: 0,
    usesRemaining: a.usesPerCombat ?? null,
    isRecharged: false,
  }));
}

function buildMonsterCombatOptions(monster: any) {
  const abilities = buildMonsterAbilityInstances(monster.abilities as unknown[] ?? []);
  const resistances = (monster.resistances as string[] ?? []) as CombatDamageType[];
  const immunities = (monster.immunities as string[] ?? []) as CombatDamageType[];
  const vulnerabilities = (monster.vulnerabilities as string[] ?? []) as CombatDamageType[];
  const conditionImmunities = monster.conditionImmunities as string[] ?? [];
  const critImmunity = monster.critImmunity as boolean ?? false;
  const critResistance = monster.critResistance as number ?? 0;
  const legendaryActions = monster.legendaryActions as number ?? 0;
  const legendaryResistances = monster.legendaryResistances as number ?? 0;
  if (abilities.length === 0 && resistances.length === 0 && immunities.length === 0 &&
      vulnerabilities.length === 0 && conditionImmunities.length === 0 &&
      !critImmunity && critResistance === 0 && legendaryActions === 0 && legendaryResistances === 0) {
    return undefined;
  }
  return {
    ...(resistances.length > 0 && { resistances }),
    ...(immunities.length > 0 && { immunities }),
    ...(vulnerabilities.length > 0 && { vulnerabilities }),
    ...(conditionImmunities.length > 0 && { conditionImmunities }),
    ...(critImmunity && { critImmunity }),
    ...(critResistance !== 0 && { critResistance }),
    ...(abilities.length > 0 && { monsterAbilities: abilities }),
    ...(legendaryActions > 0 && { legendaryActions }),
    ...(legendaryResistances > 0 && { legendaryResistances }),
  };
}

// ---- Class Ability Detection ----

const CLASS_ABILITY_IDS = new Set(ALL_ABILITIES.map(a => a.id));

/** Check if an ability ID belongs to a class ability (vs racial ability) */
function isClassAbility(abilityId: string): boolean {
  return CLASS_ABILITY_IDS.has(abilityId);
}

// ---- Constants ----

const MAX_ROUNDS = 50;
const AMBUSH_INITIATIVE_BONUS = 2;

// ---- Types ----

export interface TickCombatOutcome {
  winner: 'team0' | 'team1' | 'draw' | 'fled';
  combatLog: TurnLogEntry[];
  rounds: number;
  survivors: { id: string; name: string; hpRemaining: number; team: number }[];
  casualties: { id: string; name: string; team: number }[];
  fled: { id: string; name: string; team: number }[];
  finalState: CombatState;
}

export interface CombatantParams {
  id: string;
  presets: CombatPresets;
  weapon: WeaponInfo | null;
  racialTracker: RacialCombatTracker;
  race: string;
  level: number;
  subRace?: { id: string; element?: string } | null;
}

// ---- Autonomous Decision Engine ----

/**
 * Decide what action a combatant should take based on their presets.
 * Decision priority:
 *   1. Check retreat conditions -> attempt flee
 *   2. Check ability priority queue -> use first available ability
 *   3. Check item usage rules -> use item if condition met
 *   4. Default: attack with stance modifier
 */
function decideAction(
  state: CombatState,
  actorId: string,
  params: CombatantParams,
): { action: CombatAction; context: { weapon?: WeaponInfo; spell?: any; item?: any } } {
  const actor = state.combatants.find(c => c.id === actorId);
  if (!actor || !actor.isAlive) {
    return { action: { type: 'defend', actorId }, context: {} };
  }

  const { presets } = params;
  const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive);
  const allies = state.combatants.filter(c => c.team === actor.team && c.isAlive);

  // ---- 1. Check retreat conditions ----
  if (!presets.retreat.neverRetreat) {
    const hpPercent = (actor.currentHp / actor.maxHp) * 100;
    const oppositionRatio = enemies.length / Math.max(1, allies.length);
    const currentRound = state.round;

    const shouldRetreat =
      (presets.retreat.hpThreshold > 0 && hpPercent <= presets.retreat.hpThreshold) ||
      (presets.retreat.oppositionRatio > 0 && oppositionRatio >= presets.retreat.oppositionRatio) ||
      (presets.retreat.roundLimit > 0 && currentRound >= presets.retreat.roundLimit);

    if (shouldRetreat) {
      return { action: { type: 'flee', actorId }, context: {} };
    }
  }

  // ---- 1b. Monster ability AI ----
  if (actor.entityType === 'monster' && actor.monsterAbilities && actor.monsterAbilities.length > 0) {
    const target = enemies.length > 0 ? enemies[0] : null;
    if (target) {
      // Recharge check: roll d6 for abilities with recharge field
      for (const inst of actor.monsterAbilities) {
        if (inst.def.recharge && !inst.isRecharged && inst.cooldownRemaining > 0) {
          const rechargeRoll = Math.floor(Math.random() * 6) + 1;
          if (rechargeRoll >= inst.def.recharge) {
            inst.isRecharged = true;
            inst.cooldownRemaining = 0;
          }
        }
      }

      // Filter available abilities (not on cooldown, has uses, not on_hit type)
      const available = actor.monsterAbilities.filter(inst => {
        if (inst.def.type === 'on_hit') return false; // on_hit triggers passively
        if (inst.cooldownRemaining > 0 && !inst.isRecharged) return false;
        if (inst.usesRemaining !== null && inst.usesRemaining <= 0) return false;
        return true;
      });

      // Sort by priority descending (higher = use first)
      available.sort((a, b) => (b.def.priority ?? 0) - (a.def.priority ?? 0));

      if (available.length > 0) {
        const chosen = available[0];
        return {
          action: {
            type: 'monster_ability',
            actorId,
            monsterAbilityId: chosen.def.id,
            targetId: target.id,
            targetIds: enemies.map(e => e.id),
          },
          context: { weapon: params.weapon ?? undefined },
        };
      }
    }
  }

  // ---- 2. Check ability priority queue ----
  for (const entry of presets.abilityQueue) {
    const hpPercent = (actor.currentHp / actor.maxHp) * 100;
    let shouldUse = false;

    switch (entry.useWhen) {
      case 'always':
        shouldUse = true;
        break;
      case 'low_hp':
        shouldUse = hpPercent <= (entry.hpThreshold ?? 50);
        break;
      case 'high_hp':
        shouldUse = hpPercent >= (entry.hpThreshold ?? 75);
        break;
      case 'first_round':
        shouldUse = state.round <= 1;
        break;
      case 'outnumbered':
        shouldUse = enemies.length > allies.length;
        break;
      default:
        shouldUse = true;
    }

    if (shouldUse) {
      const target = enemies.length > 0 ? enemies[0] : null;

      // Determine if this is a class ability or a racial ability
      if (entry.abilityId && isClassAbility(entry.abilityId)) {
        // Check cooldown before dispatching
        const cooldownRemaining = actor.abilityCooldowns?.[entry.abilityId] ?? 0;
        if (cooldownRemaining > 0) continue; // skip to next ability in queue

        return {
          action: {
            type: 'class_ability',
            actorId,
            classAbilityId: entry.abilityId,
            targetId: target?.id,
            targetIds: enemies.map(e => e.id),
          },
          context: { weapon: params.weapon ?? undefined },
        };
      }

      // Racial ability dispatch
      return {
        action: {
          type: 'racial_ability',
          actorId,
          racialAbilityName: entry.abilityName,
          targetId: target?.id,
          targetIds: enemies.map(e => e.id),
        },
        context: {},
      };
    }
  }

  // ---- 3. Check item usage rules ----
  for (const rule of presets.itemUsageRules) {
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
      // For healing items, target self. For damage items, target enemy.
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
          // Item info would need to be resolved from the template
          // For tick resolution, we pass a minimal item object
          item: {
            id: rule.itemTemplateId,
            name: rule.itemName,
            type: isHeal ? 'heal' : 'damage',
            flatAmount: 20, // Default healing potion amount — real items would be looked up
          },
        },
      };
    }
  }

  // ---- 4. Default: attack the weakest enemy with stance modifiers ----
  if (enemies.length === 0) {
    return { action: { type: 'defend', actorId }, context: {} };
  }

  // Target selection: attack the enemy with lowest HP
  const target = enemies.reduce((weakest, e) =>
    e.currentHp < weakest.currentHp ? e : weakest
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
  };
}

// ---- Core Resolver ----

/**
 * Resolve a complete autonomous combat between combatants using their presets.
 * Runs the combat engine loop with AI decisions instead of player input.
 */
export function resolveTickCombat(
  combatState: CombatState,
  allParams: Map<string, CombatantParams>,
): TickCombatOutcome {
  let state = combatState;
  const fled: { id: string; name: string; team: number }[] = [];

  // Combat loop
  while (state.status === 'ACTIVE' && state.round <= MAX_ROUNDS) {
    const actorId = state.turnOrder[state.turnIndex];
    const actor = state.combatants.find(c => c.id === actorId);

    if (!actor || !actor.isAlive) {
      // Skip dead/fled combatants — advance turn
      state = resolveTurn(state, { type: 'defend', actorId }, {});
      continue;
    }

    // Get this combatant's params (or default for monsters)
    const params = allParams.get(actorId) ?? createDefaultMonsterParams(actorId, actor);

    // Decide action
    const { action, context } = decideAction(state, actorId, params);

    // Apply stance modifiers to the combatant before resolving
    if (params.presets.stance !== 'BALANCED') {
      const mods = STANCE_MODIFIERS[params.presets.stance];
      state = applyStanceToState(state, actorId, mods);
    }

    // Resolve the turn using the existing combat engine
    const racialContext = params.race
      ? {
          tracker: params.racialTracker,
          race: params.race.toLowerCase(),
          level: params.level,
          subRace: params.subRace,
        }
      : undefined;

    state = resolveTurn(state, action, context, racialContext);

    // === LEGENDARY ACTIONS (after player's turn, if opponent monster has LA remaining) ===
    if (actor.entityType === 'character' && state.status === 'ACTIVE') {
      const monsterOpponent = state.combatants.find(
        c => c.team !== actor.team && c.isAlive && c.entityType === 'monster'
          && c.legendaryActionsRemaining && c.legendaryActionsRemaining > 0
      );
      if (monsterOpponent) {
        const legendaryActionResults: LegendaryActionResult[] = [];
        let laCount = 0;
        const MAX_LA_PER_TURN = 3; // Safety cap

        while (
          state.status === 'ACTIVE'
          && laCount < MAX_LA_PER_TURN
        ) {
          const monster = state.combatants.find(c => c.id === monsterOpponent.id);
          if (!monster || !monster.isAlive || !monster.legendaryActionsRemaining || monster.legendaryActionsRemaining <= 0) break;

          // Check if monster is prevented from acting
          const isPrevented = monster.statusEffects.some(e => {
            const def = STATUS_EFFECT_DEFS[e.name as keyof typeof STATUS_EFFECT_DEFS];
            return def?.preventsAction;
          });
          if (isPrevented) break;

          // Find available legendary abilities (not fear_aura/damage_aura, not on cooldown, cost <= remaining)
          const availableLAs = (monster.monsterAbilities ?? []).filter(inst => {
            if (!inst.def.isLegendaryAction) return false;
            if (inst.def.type === 'fear_aura' || inst.def.type === 'damage_aura') return false;
            if (inst.cooldownRemaining > 0 && !inst.isRecharged) return false;
            if (inst.usesRemaining !== null && inst.usesRemaining <= 0) return false;
            if ((inst.def.legendaryCost ?? 1) > (monster.legendaryActionsRemaining ?? 0)) return false;
            return true;
          });

          // Sort by priority descending
          availableLAs.sort((a, b) => (b.def.priority ?? 0) - (a.def.priority ?? 0));

          const enemies = state.combatants.filter(c => c.team !== monster.team && c.isAlive);
          if (enemies.length === 0) break;
          const targetId = enemies[0].id;

          let laResult: LegendaryActionResult;

          if (availableLAs.length > 0) {
            const chosen = availableLAs[0];
            const cost = chosen.def.legendaryCost ?? 1;

            // Resolve the ability
            const abilityOutcome = resolveMonsterAbility(state, monster.id, chosen.def, targetId);
            state = abilityOutcome.state;

            // Tick cooldown on used ability
            state = {
              ...state,
              combatants: state.combatants.map(c => {
                if (c.id !== monster.id || !c.monsterAbilities) return c;
                return {
                  ...c,
                  legendaryActionsRemaining: (c.legendaryActionsRemaining ?? 0) - cost,
                  monsterAbilities: c.monsterAbilities.map(inst => {
                    if (inst.def.id === chosen.def.id) {
                      return {
                        ...inst,
                        cooldownRemaining: inst.def.recharge ? 1 : (inst.def.cooldown ?? 0),
                        usesRemaining: inst.usesRemaining !== null ? inst.usesRemaining - 1 : null,
                        isRecharged: false,
                      };
                    }
                    return inst;
                  }),
                };
              }),
            };

            const updatedMonster = state.combatants.find(c => c.id === monster.id);
            laResult = {
              actionNumber: laCount + 1,
              actionsRemaining: updatedMonster?.legendaryActionsRemaining ?? 0,
              cost,
              action: abilityOutcome.result,
            };
          } else {
            // Basic attack fallback (cost 1)
            const monsterWeapon = monster.weapon;
            if (!monsterWeapon) break;
            const atk = resolveAttack(state, monster.id, targetId, monsterWeapon);
            state = atk.state;

            // Deduct 1 LA point
            state = {
              ...state,
              combatants: state.combatants.map(c =>
                c.id === monster.id
                  ? { ...c, legendaryActionsRemaining: (c.legendaryActionsRemaining ?? 0) - 1 }
                  : c
              ),
            };

            const updatedMonster = state.combatants.find(c => c.id === monster.id);
            laResult = {
              actionNumber: laCount + 1,
              actionsRemaining: updatedMonster?.legendaryActionsRemaining ?? 0,
              cost: 1,
              action: atk.result,
            };
          }

          legendaryActionResults.push(laResult);
          state = checkCombatEnd(state);
          laCount++;
        }

        // Attach legendary action results to the last log entry
        if (legendaryActionResults.length > 0 && state.log.length > 0) {
          const lastEntry = state.log[state.log.length - 1];
          state = {
            ...state,
            log: [
              ...state.log.slice(0, -1),
              { ...lastEntry, legendaryActions: legendaryActionResults },
            ],
          };
        }
      }
    }

    // Track fled combatants
    if (action.type === 'flee') {
      const lastLog = state.log[state.log.length - 1];
      if (lastLog && lastLog.result.type === 'flee' && (lastLog.result as any).success) {
        fled.push({ id: actorId, name: actor.name, team: actor.team });
      }
    }

    // Safety: force end after MAX_ROUNDS
    if (state.round > MAX_ROUNDS && state.status === 'ACTIVE') {
      state = { ...state, status: 'COMPLETED', winningTeam: null };
    }
  }

  // Compile outcome
  const survivors = state.combatants
    .filter(c => c.isAlive)
    .map(c => ({ id: c.id, name: c.name, hpRemaining: c.currentHp, team: c.team }));

  const casualties = state.combatants
    .filter(c => !c.isAlive && !fled.some(f => f.id === c.id))
    .map(c => ({ id: c.id, name: c.name, team: c.team }));

  let winner: TickCombatOutcome['winner'] = 'draw';
  if (state.winningTeam === 0) winner = 'team0';
  else if (state.winningTeam === 1) winner = 'team1';
  else if (fled.length > 0 && survivors.length > 0) winner = 'fled';

  return {
    winner,
    combatLog: state.log,
    rounds: state.round,
    survivors,
    casualties,
    fled,
    finalState: state,
  };
}

// ---- PvE Node Combat ----

/**
 * Resolve a PvE encounter on a travel node.
 * Uses the character's combat presets for autonomous decision-making.
 */
export async function resolveNodePvE(
  characterId: string,
  monsterId: string,
  nodeContext: { dangerLevel: number },
): Promise<TickCombatOutcome & { xpReward: number; goldReward: number; deathPenalty?: any }> {
  // Load character data
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      equipment: {
        include: { item: { include: { template: true } } },
      },
    },
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // Load monster data
  const monster = await prisma.monster.findUnique({
    where: { id: monsterId },
  });

  if (!monster) {
    throw new Error(`Monster ${monsterId} not found`);
  }

  const charStats = parseStats(character.stats);
  const monsterStats = monster.stats as Record<string, number>;

  // Apply equipment stat bonuses to combat stats
  const equipBonuses = getEquipmentStatBonuses(character.equipment);
  const effectiveStats: CharacterStats = {
    str: charStats.str + (equipBonuses.strength ?? 0),
    dex: charStats.dex + (equipBonuses.dexterity ?? 0),
    con: charStats.con + (equipBonuses.constitution ?? 0),
    int: charStats.int + (equipBonuses.intelligence ?? 0),
    wis: charStats.wis + (equipBonuses.wisdom ?? 0),
    cha: charStats.cha + (equipBonuses.charisma ?? 0),
  };
  const playerAC = 10 + getModifier(effectiveStats.dex) + getEquipmentAC(character.equipment);

  // Build combatants
  const rawWeapon = getEquippedWeapon(character.equipment);
  const playerWeapon = rawWeapon ? applyClassWeaponStat(rawWeapon, character.class) : null;
  const playerCombatant = createCharacterCombatant(
    character.id,
    character.name,
    0, // team 0
    effectiveStats,
    character.level,
    character.health,
    character.maxHealth,
    playerAC,
    playerWeapon,
    {},
    getProficiencyBonus(character.level),
  );

  // Add race to combatant
  (playerCombatant as any).race = character.race.toLowerCase();
  (playerCombatant as any).subRace = character.subRace;

  const monsterCombatant = createMonsterCombatant(
    `monster-${monster.id}`,
    monster.name,
    1, // team 1
    parseStats(monster.stats),
    monster.level,
    monsterStats.hp ?? 50,
    monsterStats.ac ?? 12,
    buildMonsterWeapon(monsterStats),
    0, // Monster attack stat already includes proficiency equivalent
    buildMonsterCombatOptions(monster),
  );

  // Create combat state
  const sessionId = `tick-pve-${characterId}-${Date.now()}`;
  const combatState = createCombatState(sessionId, 'PVE', [playerCombatant, monsterCombatant]);

  // Build params
  const params = await buildCombatParams(characterId);
  const combatantParams = new Map<string, CombatantParams>();

  combatantParams.set(character.id, {
    id: character.id,
    presets: params.presets,
    weapon: params.equippedWeapon,
    racialTracker: createRacialCombatTracker(),
    race: character.race,
    level: character.level,
    subRace: character.subRace as { id: string; element?: string } | null,
  });

  // Monster gets default aggressive presets
  combatantParams.set(`monster-${monster.id}`, createDefaultMonsterParams(
    `monster-${monster.id}`,
    monsterCombatant,
  ));

  // Resolve the combat
  const outcome = resolveTickCombat(combatState, combatantParams);

  // Calculate rewards
  let xpReward = 0;
  let goldReward = 0;
  let deathPenalty = undefined;

  const playerSurvived = outcome.survivors.some(s => s.id === characterId);

  if (playerSurvived) {
    // Player won
    xpReward = getMonsterKillXp(monster.level);
    const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number; itemTemplateName?: string }[];
    for (const entry of lootTable) {
      if (Math.random() <= entry.dropChance) {
        goldReward += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
      }
    }

    // Process item drops (arcane reagents, etc.)
    await processItemDrops(prisma, characterId, lootTable);

    // Apply rewards
    await prisma.character.update({
      where: { id: characterId },
      data: {
        xp: { increment: xpReward },
        gold: { increment: goldReward },
        health: outcome.survivors.find(s => s.id === characterId)?.hpRemaining ?? character.health,
      },
    });
  } else {
    // Player died
    deathPenalty = calculateDeathPenalty(
      characterId,
      character.level,
      character.gold,
      character.currentTownId ?? '',
    );

    await prisma.character.update({
      where: { id: characterId },
      data: {
        health: character.maxHealth, // respawn at full HP
        gold: Math.max(0, character.gold - deathPenalty.goldLost),
        xp: Math.max(0, character.xp - deathPenalty.xpLost),
      },
    });
  }

  return { ...outcome, xpReward, goldReward, deathPenalty };
}

// ---- PvP Node Combat ----

/**
 * Resolve a PvP encounter on a travel node.
 * Ambusher gets +2 initiative bonus.
 */
export async function resolveNodePvP(
  travelerId: string,
  ambusherId: string,
  nodeContext: { dangerLevel: number },
): Promise<TickCombatOutcome> {
  // Load both characters
  const [traveler, ambusher] = await Promise.all([
    prisma.character.findUnique({
      where: { id: travelerId },
      include: {
        equipment: { include: { item: { include: { template: true } } } },
      },
    }),
    prisma.character.findUnique({
      where: { id: ambusherId },
      include: {
        equipment: { include: { item: { include: { template: true } } } },
      },
    }),
  ]);

  if (!traveler || !ambusher) {
    throw new Error('One or both combatants not found');
  }

  const travelerStats = parseStats(traveler.stats);
  const ambusherStats = parseStats(ambusher.stats);

  // Apply equipment stat bonuses
  const travelerBonuses = getEquipmentStatBonuses(traveler.equipment);
  const travelerEffective: CharacterStats = {
    str: travelerStats.str + (travelerBonuses.strength ?? 0),
    dex: travelerStats.dex + (travelerBonuses.dexterity ?? 0),
    con: travelerStats.con + (travelerBonuses.constitution ?? 0),
    int: travelerStats.int + (travelerBonuses.intelligence ?? 0),
    wis: travelerStats.wis + (travelerBonuses.wisdom ?? 0),
    cha: travelerStats.cha + (travelerBonuses.charisma ?? 0),
  };
  const ambusherBonuses = getEquipmentStatBonuses(ambusher.equipment);
  const ambusherEffective: CharacterStats = {
    str: ambusherStats.str + (ambusherBonuses.strength ?? 0),
    dex: ambusherStats.dex + (ambusherBonuses.dexterity ?? 0),
    con: ambusherStats.con + (ambusherBonuses.constitution ?? 0),
    int: ambusherStats.int + (ambusherBonuses.intelligence ?? 0),
    wis: ambusherStats.wis + (ambusherBonuses.wisdom ?? 0),
    cha: ambusherStats.cha + (ambusherBonuses.charisma ?? 0),
  };

  // Build combatants
  const travelerCombatant = createCharacterCombatant(
    traveler.id, traveler.name, 0,
    travelerEffective, traveler.level,
    traveler.health, traveler.maxHealth,
    10 + getModifier(travelerEffective.dex) + getEquipmentAC(traveler.equipment),
    (() => { const w = getEquippedWeapon(traveler.equipment); return w ? applyClassWeaponStat(w, traveler.class) : null; })(),
    {},
    getProficiencyBonus(traveler.level),
  );
  (travelerCombatant as any).race = traveler.race.toLowerCase();

  const ambusherCombatant = createCharacterCombatant(
    ambusher.id, ambusher.name, 1,
    ambusherEffective, ambusher.level,
    ambusher.health, ambusher.maxHealth,
    10 + getModifier(ambusherEffective.dex) + getEquipmentAC(ambusher.equipment),
    (() => { const w = getEquippedWeapon(ambusher.equipment); return w ? applyClassWeaponStat(w, ambusher.class) : null; })(),
    {},
    getProficiencyBonus(ambusher.level),
  );
  (ambusherCombatant as any).race = ambusher.race.toLowerCase();

  // Create combat state
  const sessionId = `tick-pvp-${travelerId}-${ambusherId}-${Date.now()}`;
  let combatState = createCombatState(sessionId, 'PVP', [travelerCombatant, ambusherCombatant]);

  // Apply ambush initiative bonus (+2 to ambusher)
  combatState = {
    ...combatState,
    combatants: combatState.combatants.map(c =>
      c.id === ambusherId
        ? { ...c, initiative: c.initiative + AMBUSH_INITIATIVE_BONUS }
        : c
    ),
  };

  // Re-sort turn order with updated initiative
  const sortedOrder = [...combatState.combatants]
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (b.stats.dex !== a.stats.dex) return b.stats.dex - a.stats.dex;
      return 0;
    })
    .map(c => c.id);

  combatState = { ...combatState, turnOrder: sortedOrder };

  // Build params for both
  const [travelerParams, ambusherParams] = await Promise.all([
    buildCombatParams(travelerId),
    buildCombatParams(ambusherId),
  ]);

  const combatantParams = new Map<string, CombatantParams>();

  combatantParams.set(travelerId, {
    id: travelerId,
    presets: travelerParams.presets,
    weapon: travelerParams.equippedWeapon,
    racialTracker: createRacialCombatTracker(),
    race: traveler.race,
    level: traveler.level,
    subRace: traveler.subRace as { id: string; element?: string } | null,
  });

  combatantParams.set(ambusherId, {
    id: ambusherId,
    presets: ambusherParams.presets,
    weapon: ambusherParams.equippedWeapon,
    racialTracker: createRacialCombatTracker(),
    race: ambusher.race,
    level: ambusher.level,
    subRace: ambusher.subRace as { id: string; element?: string } | null,
  });

  // Resolve
  const outcome = resolveTickCombat(combatState, combatantParams);

  // Apply results to both characters
  const travelerSurvived = outcome.survivors.some(s => s.id === travelerId);
  const ambusherSurvived = outcome.survivors.some(s => s.id === ambusherId);

  // Update HP for survivors
  if (travelerSurvived) {
    const hp = outcome.survivors.find(s => s.id === travelerId)?.hpRemaining ?? traveler.health;
    await prisma.character.update({
      where: { id: travelerId },
      data: { health: hp },
    });
  }

  if (ambusherSurvived) {
    const hp = outcome.survivors.find(s => s.id === ambusherId)?.hpRemaining ?? ambusher.health;
    await prisma.character.update({
      where: { id: ambusherId },
      data: { health: hp },
    });
  }

  // Apply death penalties to the loser
  if (!travelerSurvived) {
    const penalty = calculateDeathPenalty(travelerId, traveler.level, traveler.gold, traveler.currentTownId ?? '');
    await prisma.character.update({
      where: { id: travelerId },
      data: {
        health: traveler.maxHealth,
        gold: Math.max(0, traveler.gold - penalty.goldLost),
        xp: Math.max(0, traveler.xp - penalty.xpLost),
      },
    });
  }

  if (!ambusherSurvived) {
    const penalty = calculateDeathPenalty(ambusherId, ambusher.level, ambusher.gold, ambusher.currentTownId ?? '');
    await prisma.character.update({
      where: { id: ambusherId },
      data: {
        health: ambusher.maxHealth,
        gold: Math.max(0, ambusher.gold - penalty.goldLost),
        xp: Math.max(0, ambusher.xp - penalty.xpLost),
      },
    });
  }

  return outcome;
}

// ---- Group Combat ----

/**
 * Resolve a multi-combatant group combat.
 * Each combatant uses their individual presets.
 */
export async function resolveGroupCombat(
  allyIds: string[],
  enemyIds: string[],
): Promise<TickCombatOutcome> {
  // Load all characters
  const allIds = [...allyIds, ...enemyIds];
  const characters = await prisma.character.findMany({
    where: { id: { in: allIds } },
    include: {
      equipment: { include: { item: { include: { template: true } } } },
    },
  });

  const charMap = new Map(characters.map(c => [c.id, c]));

  // Build combatants
  const combatants: Combatant[] = [];
  const combatantParams = new Map<string, CombatantParams>();

  for (const id of allyIds) {
    const char = charMap.get(id);
    if (!char) continue;
    const stats = parseStats(char.stats);
    const bonuses = getEquipmentStatBonuses(char.equipment);
    const effective: CharacterStats = {
      str: stats.str + (bonuses.strength ?? 0),
      dex: stats.dex + (bonuses.dexterity ?? 0),
      con: stats.con + (bonuses.constitution ?? 0),
      int: stats.int + (bonuses.intelligence ?? 0),
      wis: stats.wis + (bonuses.wisdom ?? 0),
      cha: stats.cha + (bonuses.charisma ?? 0),
    };
    const combatant = createCharacterCombatant(
      char.id, char.name, 0, effective, char.level,
      char.health, char.maxHealth,
      10 + getModifier(effective.dex) + getEquipmentAC(char.equipment),
      (() => { const w = getEquippedWeapon(char.equipment); return w ? applyClassWeaponStat(w, char.class) : null; })(), {},
      getProficiencyBonus(char.level),
    );
    (combatant as any).race = char.race.toLowerCase();
    combatants.push(combatant);

    const params = await buildCombatParams(char.id);
    combatantParams.set(char.id, {
      id: char.id,
      presets: params.presets,
      weapon: params.equippedWeapon,
      racialTracker: createRacialCombatTracker(),
      race: char.race,
      level: char.level,
      subRace: char.subRace as { id: string; element?: string } | null,
    });
  }

  for (const id of enemyIds) {
    const char = charMap.get(id);
    if (!char) continue;
    const stats = parseStats(char.stats);
    const bonuses = getEquipmentStatBonuses(char.equipment);
    const effective: CharacterStats = {
      str: stats.str + (bonuses.strength ?? 0),
      dex: stats.dex + (bonuses.dexterity ?? 0),
      con: stats.con + (bonuses.constitution ?? 0),
      int: stats.int + (bonuses.intelligence ?? 0),
      wis: stats.wis + (bonuses.wisdom ?? 0),
      cha: stats.cha + (bonuses.charisma ?? 0),
    };
    const combatant = createCharacterCombatant(
      char.id, char.name, 1, effective, char.level,
      char.health, char.maxHealth,
      10 + getModifier(effective.dex) + getEquipmentAC(char.equipment),
      (() => { const w = getEquippedWeapon(char.equipment); return w ? applyClassWeaponStat(w, char.class) : null; })(), {},
      getProficiencyBonus(char.level),
    );
    (combatant as any).race = char.race.toLowerCase();
    combatants.push(combatant);

    const params = await buildCombatParams(char.id);
    combatantParams.set(char.id, {
      id: char.id,
      presets: params.presets,
      weapon: params.equippedWeapon,
      racialTracker: createRacialCombatTracker(),
      race: char.race,
      level: char.level,
      subRace: char.subRace as { id: string; element?: string } | null,
    });
  }

  // Create and resolve
  const sessionId = `tick-group-${Date.now()}`;
  const combatState = createCombatState(sessionId, 'PVP', combatants);
  return resolveTickCombat(combatState, combatantParams);
}

// ---- Helper Functions ----

function parseStats(stats: unknown): CharacterStats {
  const s = stats as Record<string, number>;
  return {
    str: s?.str ?? 10,
    dex: s?.dex ?? 10,
    con: s?.con ?? 10,
    int: s?.int ?? 10,
    wis: s?.wis ?? 10,
    cha: s?.cha ?? 10,
  };
}

function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonus: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonus: 0 };
  return {
    diceCount: parseInt(match[1], 10),
    diceSides: parseInt(match[2], 10),
    bonus: match[3] ? parseInt(match[3], 10) : 0,
  };
}

function buildMonsterWeapon(monsterStats: Record<string, unknown>): WeaponInfo {
  const damage = parseDamageString(String(monsterStats.damage ?? '1d6'));
  return {
    id: 'monster-attack',
    name: 'Natural Attack',
    diceCount: damage.diceCount,
    diceSides: damage.diceSides,
    damageModifierStat: 'str',
    attackModifierStat: 'str',
    bonusDamage: damage.bonus,
    bonusAttack: (monsterStats.attack as number) ?? 0,
    damageType: (monsterStats.damageType as string) ?? 'BLUDGEONING',
  };
}

/**
 * Get quality-scaled AC from pre-loaded equipment using calculateItemStats().
 */
function getEquipmentAC(equipment: any[]): number {
  let ac = 0;
  for (const equip of equipment) {
    if (!equip.item?.template) continue;
    const calculated = calculateItemStats({
      quality: equip.item.quality ?? ('COMMON' as ItemRarity),
      enchantments: equip.item.enchantments ?? [],
      template: { stats: equip.item.template.stats },
    });
    if (typeof calculated.finalStats.armor === 'number') {
      ac += calculated.finalStats.armor;
    }
  }
  return ac;
}

/**
 * Get quality-scaled weapon stats from pre-loaded equipment.
 */
function getEquippedWeapon(equipment: any[]): WeaponInfo | null {
  const mainHand = equipment.find((e: any) => e.slot === 'MAIN_HAND');
  if (!mainHand) return null;

  const stats = mainHand.item?.template?.stats as Record<string, any> | undefined;
  if (!stats) return null;

  const calculated = calculateItemStats({
    quality: mainHand.item.quality ?? ('COMMON' as ItemRarity),
    enchantments: mainHand.item.enchantments ?? [],
    template: { stats: mainHand.item.template.stats },
  });
  const multiplier = calculated.qualityMultiplier;

  return {
    id: mainHand.item.id,
    name: mainHand.item.template.name,
    diceCount: stats.diceCount ?? 1,
    diceSides: stats.diceSides ?? 6,
    damageModifierStat: stats.damageModifierStat ?? 'str',
    attackModifierStat: stats.attackModifierStat ?? 'str',
    bonusDamage: Math.round((stats.bonusDamage ?? 0) * multiplier),
    bonusAttack: Math.round((stats.bonusAttack ?? 0) * multiplier),
    damageType: stats.damageType ?? undefined,
  };
}

/**
 * Sum equipment attribute bonuses (STR, DEX, etc.) from pre-loaded equipment.
 */
function getEquipmentStatBonuses(equipment: any[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const equip of equipment) {
    if (!equip.item?.template) continue;
    const calculated = calculateItemStats({
      quality: equip.item.quality ?? ('COMMON' as ItemRarity),
      enchantments: equip.item.enchantments ?? [],
      template: { stats: equip.item.template.stats },
    });
    const fs = calculated.finalStats;
    for (const key of ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']) {
      if (typeof fs[key] === 'number') {
        totals[key] = (totals[key] ?? 0) + (fs[key] as number);
      }
    }
  }
  return totals;
}

/**
 * Apply stance modifiers to a combatant's state temporarily.
 * Modifies AC and stores attack bonus for the attack resolver to use.
 */
function applyStanceToState(
  state: CombatState,
  actorId: string,
  mods: StanceModifiers,
): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c => {
      if (c.id !== actorId) return c;
      return {
        ...c,
        ac: c.ac + mods.acBonus,
      };
    }),
  };
}

/**
 * Create default monster combat params (aggressive, no retreat).
 */
function createDefaultMonsterParams(id: string, combatant: Combatant): CombatantParams {
  return {
    id,
    presets: {
      stance: 'AGGRESSIVE',
      retreat: {
        hpThreshold: 0,
        oppositionRatio: 0,
        roundLimit: 0,
        neverRetreat: true,
      },
      abilityQueue: [],
      itemUsageRules: [],
      pvpLootBehavior: 'TAKE_NOTHING',
    },
    weapon: combatant.weapon,
    racialTracker: createRacialCombatTracker(),
    race: '',
    level: combatant.level,
  };
}
