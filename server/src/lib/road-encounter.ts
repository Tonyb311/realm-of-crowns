/**
 * Road Encounter System
 *
 * Handles random PvE encounters that occur during travel between towns.
 * When a character arrives at their destination, there's a chance they
 * encounter a monster on the road. Combat is auto-resolved server-side.
 *
 * Win → arrive at destination with combat rewards (XP + gold)
 * Lose → returned to origin town with death penalty
 */

import { db } from './db';
import { eq, and, gte, lte, inArray, gt, count, sql, or } from 'drizzle-orm';
import { characters, towns, monsters, characterEquipment, combatParticipants, combatSessions, combatEncounterLogs, characterActiveEffects, townPolicies, travelRoutes } from '@database/tables';
import type { BiomeType, ItemRarity } from '@shared/enums';
import { calculateItemStats, calculateEquipmentTotals } from '../services/item-stats';
import { logger } from './logger';
import {
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  resolveTurn,
  calculateDeathPenalty,
  calculateFleeDC,
} from './combat-engine';
import type {
  CharacterStats,
  CombatState,
  WeaponInfo,
  CombatDamageType,
  MonsterAbilityInstance,
  MonsterAbility,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import { CLASS_SAVE_PROFICIENCIES, CLASS_ARMOR_TYPE, getAttacksPerAction } from '@shared/data/combat-constants';
import { computeFinalAC } from '@shared/utils/armor-conversion';
import {
  ACTION_XP,
  DEATH_PENALTY,
  getMonsterKillXp,
  ENCOUNTER_CHANCE_CAP_BY_LEVEL,
  HIGH_LEVEL_ENCOUNTER_MULTIPLIER,
  ENCOUNTER_LEVEL_RANGE,
} from '@shared/data/progression';
import { onMonsterKill } from '../services/quest-triggers';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { logPveCombat, COMBAT_LOGGING_ENABLED, buildRoundsData, buildEncounterContext } from './combat-logger';
import { getSimulationTick, getSimulationRunId } from './simulation-context';
import { calculateWeightState } from '../services/weight-calculator';
import type { CombatRound } from './simulation/types';
import type { AttackResult, Combatant } from '@shared/types/combat';
import { processItemDrops } from './loot-items';
import { computeFeatBonus, hasFeatEffect } from '@shared/data/feats';
import { ENCOUNTER_TEMPLATES, type EncounterTemplate } from '@shared/data/encounter-templates';
import {
  resolveTickCombat,
  createDefaultMonsterParams,
  type CombatantParams,
  type TickCombatOutcome,
} from '../services/tick-combat-resolver';
import { buildCombatParams, STANCE_MODIFIERS } from '../services/combat-presets';
import { createRacialCombatTracker } from '../services/racial-combat-abilities';
import { getCharacterReligionContext, resolveReligionBuffs, getReligionEncounterReduction } from '../services/religion-buffs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base encounter chance — modified by route danger level. */
export const BASE_ENCOUNTER_CHANCE = 0.15;

/**
 * Encounter chance by route danger level (1-7).
 * Level 1 = safe (15%), Level 4 = moderate (45%), Level 7 = extreme (75%).
 */
export const DANGER_ENCOUNTER_CHANCE: Record<number, number> = {
  1: 0.15,
  2: 0.25,
  3: 0.35,
  4: 0.45,
  5: 0.55,
  6: 0.65,
  7: 0.75,
};

/**
 * Map route terrain strings to monster biome types.
 * Multiple terrain keywords can map to the same biome.
 */
const TERRAIN_TO_BIOME: [RegExp, BiomeType][] = [
  [/forest|wood|grove|glade|silverwood|elven|sacred/i, 'FOREST'],
  [/mountain|peak|altitude|mine|cavern|tunnel|descent|foothill/i, 'MOUNTAIN'],
  [/swamp|marsh|bog|mist|blighted|cursed/i, 'SWAMP'],
  [/plains|farm|meadow|cobblestone|paved|trade|country|border|highway|fortified/i, 'PLAINS'],
  [/hill|valley|river/i, 'HILLS'],
  [/volcanic|ember|lava|scorched/i, 'VOLCANIC'],
  [/tundra|frozen|frost|ice/i, 'TUNDRA'],
  [/coast|sea|ocean|coral|shallow|beach|seaside/i, 'COASTAL'],
  [/desert|arid|sand|rift/i, 'DESERT'],
  [/badland|waste|war|lawless|contested|frontier|hostile/i, 'BADLANDS'],
  [/underdark|subterranean|underground/i, 'UNDERGROUND'],
  [/fey|feywild|glimmer|moonpetal/i, 'FEYWILD'],
];

/**
 * Derive a monster biome from a route terrain string.
 * Falls back to null (any biome) if no match found.
 */
export function terrainToBiome(terrain: string): BiomeType | null {
  for (const [pattern, biome] of TERRAIN_TO_BIOME) {
    if (pattern.test(terrain)) return biome;
  }
  return null;
}

/** Get encounter chance for a given danger level. */
export function getEncounterChance(dangerLevel: number): number {
  return DANGER_ENCOUNTER_CHANCE[Math.max(1, Math.min(7, dangerLevel))] ?? BASE_ENCOUNTER_CHANCE;
}

/**
 * Monster level range based on character level.
 * Level 1 ONLY faces level 1 monsters (Giant Rat, Goblin) — no wolves.
 * Ranges defined in shared balance constants for easy tuning.
 */
export function getMonsterLevelRange(charLevel: number): { min: number; max: number } {
  const fixed = ENCOUNTER_LEVEL_RANGE[charLevel];
  if (fixed) return fixed;
  // Level 8+: face monsters within ±3 levels
  return { min: Math.max(1, charLevel - 3), max: charLevel + 3 };
}

/** Maximum combat rounds before auto-draw (safety valve). */
const MAX_COMBAT_ROUNDS = 30;

// ---------------------------------------------------------------------------
// Encounter Template Selection
// ---------------------------------------------------------------------------

/**
 * Select an encounter template matching biome, character level, and party context.
 * Returns null if no template matches (caller should fall back to single-monster selection).
 */
function selectEncounterTemplate(
  biome: BiomeType | null,
  charLevel: number,
  isSolo: boolean,
): EncounterTemplate | null {
  const eligible = ENCOUNTER_TEMPLATES.filter(t => {
    if (biome && !t.biomes.includes(biome)) return false;
    if (charLevel < t.levelRange.min || charLevel > t.levelRange.max) return false;
    if (isSolo && !t.soloAppropriate) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Weighted random selection
  const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of eligible) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return eligible[eligible.length - 1];
}

/**
 * Apply stat scaling for minion-role monsters in encounter templates.
 * When statScale < 1.0, reduces HP and attack to make pack members weaker.
 * Returns { scaledStats, displayName } — displayName appends "(Pack)" for scaled monsters.
 */
function applyStatScale(
  stats: Record<string, number>,
  name: string,
  scale: number,
): { scaledStats: Record<string, number>; displayName: string } {
  if (scale >= 1.0) return { scaledStats: stats, displayName: name };
  return {
    scaledStats: {
      ...stats,
      hp: Math.max(1, Math.round(stats.hp * scale)),
      attack: Math.max(1, stats.attack - (scale < 0.8 ? 1 : 0)),
    },
    displayName: `${name} (Pack)`,
  };
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from combat-pve.ts to avoid circular deps)
// ---------------------------------------------------------------------------

function parseStats(stats: unknown): CharacterStats {
  const s = stats as Record<string, number>;
  return {
    str: s.str ?? 10,
    dex: s.dex ?? 10,
    con: s.con ?? 10,
    int: s.int ?? 10,
    wis: s.wis ?? 10,
    cha: s.cha ?? 10,
  };
}

function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonus: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonus: 0 };
  return {
    diceCount: parseInt(match[1], 10),
    diceSides: parseInt(match[2], 10),
    bonus: match[3] ? parseInt(match[3], 10) : 0,
  };
}

function buildMonsterWeapon(monsterStats: Record<string, unknown>, attackStat?: string | null): WeaponInfo {
  const damage = parseDamageString(String(monsterStats.damage ?? '1d6'));
  const stat = (attackStat ?? 'str') as 'str' | 'dex' | 'int' | 'wis' | 'cha';
  return {
    id: 'monster-attack',
    name: 'Natural Attack',
    diceCount: damage.diceCount,
    diceSides: damage.diceSides,
    damageModifierStat: stat,
    attackModifierStat: stat,
    bonusDamage: damage.bonus,
    bonusAttack: (monsterStats.attack as number) ?? 0,
    damageType: (monsterStats.damageType as string) ?? 'BLUDGEONING',
  };
}

/** Build MonsterAbilityInstance[] from DB JSON abilities array */
function buildMonsterAbilityInstances(abilities: unknown[]): MonsterAbilityInstance[] {
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  return abilities.map((a: any) => ({
    def: a as MonsterAbility,
    cooldownRemaining: 0,
    usesRemaining: a.usesPerCombat ?? null,
    isRecharged: false,
  }));
}

/** Build the options param for createMonsterCombatant from a DB monster row */
function buildMonsterCombatOptions(monster: any) {
  const abilities = buildMonsterAbilityInstances(monster.abilities as unknown[] ?? []);
  const resistances = (monster.resistances as string[] ?? []) as CombatDamageType[];
  const immunities = (monster.immunities as string[] ?? []) as CombatDamageType[];
  const vulnerabilities = (monster.vulnerabilities as string[] ?? []) as CombatDamageType[];
  const conditionImmunities = monster.conditionImmunities as string[] ?? [];
  const critImmunity = monster.critImmunity as boolean ?? false;
  const critResistance = monster.critResistance as number ?? 0;

  // Only return options if there's something non-default
  if (abilities.length === 0 && resistances.length === 0 && immunities.length === 0 &&
      vulnerabilities.length === 0 && conditionImmunities.length === 0 &&
      !critImmunity && critResistance === 0) {
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
  };
}

const UNARMED_WEAPON: WeaponInfo = {
  id: 'unarmed',
  name: 'Unarmed Strike',
  diceCount: 1,
  diceSides: 4,
  damageModifierStat: 'str',
  attackModifierStat: 'str',
  bonusDamage: 0,
  bonusAttack: 0,
};

/** Map class to preferred attack/damage stat for weapon overrides. */
const CLASS_ATTACK_STAT: Record<string, 'str' | 'dex' | 'int' | 'wis' | 'cha'> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
};

/** Apply class-based attack stat override to weapon (casters use INT/WIS/CHA). */
export function applyClassWeaponStat(weapon: WeaponInfo, characterClass: string | null): WeaponInfo {
  if (!characterClass) return weapon;
  const stat = CLASS_ATTACK_STAT[characterClass.toLowerCase()];
  if (!stat || stat === weapon.attackModifierStat) return weapon;
  return { ...weapon, attackModifierStat: stat, damageModifierStat: stat };
}

/**
 * Get quality-scaled equipped weapon stats using calculateItemStats().
 * Applies quality multiplier to bonusDamage and bonusAttack.
 */
async function getEquippedWeapon(characterId: string): Promise<WeaponInfo> {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'MAIN_HAND')),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'WEAPON') {
    return UNARMED_WEAPON;
  }

  const stats = equip.item.itemTemplate.stats as Record<string, unknown>;
  const calculated = calculateItemStats({
    quality: equip.item.quality ?? ('COMMON' as ItemRarity),
    enchantments: equip.item.enchantments,
    template: { stats: equip.item.itemTemplate.stats },
  });
  const multiplier = calculated.qualityMultiplier;

  return {
    id: equip.item.id,
    name: equip.item.itemTemplate.name,
    diceCount: (typeof stats.diceCount === 'number') ? stats.diceCount : 1,
    diceSides: (typeof stats.diceSides === 'number') ? stats.diceSides : 4,
    damageModifierStat: stats.damageModifierStat === 'dex' ? 'dex' : 'str',
    attackModifierStat: stats.attackModifierStat === 'dex' ? 'dex' : 'str',
    bonusDamage: Math.round(((typeof stats.bonusDamage === 'number') ? stats.bonusDamage : 0) * multiplier),
    bonusAttack: Math.round(((typeof stats.bonusAttack === 'number') ? stats.bonusAttack : 0) * multiplier),
    damageType: (typeof stats.damageType === 'string') ? stats.damageType : undefined,
  };
}

// ---------------------------------------------------------------------------
// Combat Round Builder — converts combat-engine TurnLogEntry[] to CombatRound[]
// ---------------------------------------------------------------------------

function buildCombatRoundsFromLog(
  sessionId: string,
  combatState: CombatState,
  tick: number | null,
): CombatRound[] {
  const rounds: CombatRound[] = [];
  const nameMap = new Map(combatState.combatants.map(c => [c.id, c.name]));

  // Track HP for each combatant starting at maxHp
  const hpTracker = new Map(combatState.combatants.map(c => [c.id, c.maxHp]));

  for (const entry of combatState.log) {
    // Process status effect ticks to keep HP tracker accurate
    for (const st of entry.statusTicks) {
      hpTracker.set(st.combatantId, st.hpAfter);
    }

    if (entry.result.type !== 'attack') continue;
    const atk = entry.result as AttackResult;

    const attackerHPBefore = hpTracker.get(entry.actorId) ?? 0;

    const notes: string[] = [];
    if (atk.critical) notes.push('Critical hit!');
    if (!atk.hit && (atk as any).negatedAttack) notes.push('Dodged!');
    if (!atk.hit && !(atk as any).negatedAttack) notes.push('Miss!');
    if (atk.targetKilled) notes.push('Killed!');

    rounds.push({
      tick: tick ?? 0,
      combatId: sessionId,
      round: entry.round,
      attacker: nameMap.get(entry.actorId) ?? entry.actorId,
      defender: nameMap.get(atk.targetId) ?? atk.targetId,
      attackRoll: atk.attackRoll,
      attackModifiers: (atk.attackModifiers || []).map(m => `${m.source}: ${m.value >= 0 ? '+' : ''}${m.value}`).join(', '),
      totalAttack: atk.attackTotal,
      defenseValue: atk.targetAC,
      defenseModifiers: `AC ${atk.targetAC}`,
      totalDefense: atk.targetAC,
      hit: atk.hit,
      damageRoll: atk.damageRoll ?? 0,
      damageModifiers: (atk.damageModifiers || []).map(m => `${m.source}: ${m.value >= 0 ? '+' : ''}${m.value}`).join(', '),
      totalDamage: atk.totalDamage,
      attackerHPBefore,
      attackerHPAfter: attackerHPBefore, // Attacker HP unchanged by their own attack
      defenderHPBefore: atk.targetHpBefore ?? 0,
      defenderHPAfter: atk.targetHpAfter ?? 0,
      notes: notes.join(' '),
    });

    // Update defender HP in tracker
    hpTracker.set(atk.targetId, atk.targetHpAfter);
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// Road Encounter Result
// ---------------------------------------------------------------------------

export interface RoadEncounterResult {
  /** Whether an encounter occurred (false = safe travel). */
  encountered: boolean;
  /** If encountered, did the player win? */
  won?: boolean;
  /** If encountered, did the player flee? */
  fled?: boolean;
  /** Number of extra travel ticks added as penalty for mid-combat flee (detour). */
  fleeDelayTicks?: number;
  /** Monster name. */
  monsterName?: string;
  /** Monster level. */
  monsterLevel?: number;
  /** XP awarded (win only). */
  xpAwarded?: number;
  /** Gold awarded (win only). */
  goldAwarded?: number;
  /** Total combat rounds. */
  totalRounds?: number;
  /** Round-by-round combat detail for simulation export. */
  combatRounds?: CombatRound[];
}

// ---------------------------------------------------------------------------
// Consumable Buff Application
// ---------------------------------------------------------------------------

/**
 * Query active consumable effects for a character and apply them to a combatant.
 * Modifies the combatant in-place: stat buffs, AC buffs, poison immunity, prepared scrolls.
 * Returns the modified combatant.
 */
export async function applyConsumableBuffs(combatant: Combatant, characterId: string): Promise<Combatant> {
  const effects = await db.select().from(characterActiveEffects)
    .where(and(
      eq(characterActiveEffects.characterId, characterId),
      gt(characterActiveEffects.expiresAt, new Date().toISOString()),
    ));

  if (effects.length === 0) return combatant;

  let conBuffed = false;
  const oldConMod = getModifier(combatant.stats.con);

  for (const effect of effects) {
    // Damage scrolls → set prepared scroll directly (needs itemName from effect row)
    if (effect.sourceType === 'SCROLL' && (
      effect.effectType.startsWith('damage_') || effect.effectType === 'heal_hp'
    )) {
      combatant.preparedScroll = {
        effectType: effect.effectType,
        magnitude: effect.magnitude,
        itemName: effect.itemName,
      };
      continue;
    }

    // Apply primary effect
    applyEffect(combatant, effect.effectType, effect.magnitude, effect.sourceType);
    // Apply secondary effect (dual buffs like Elixir of Fortitude)
    if (effect.effectType2 && effect.magnitude2 != null) {
      applyEffect(combatant, effect.effectType2, effect.magnitude2, effect.sourceType);
    }
    // Track CON changes for HP recalculation
    if (effect.effectType === 'buff_constitution' || effect.effectType2 === 'buff_constitution') {
      conBuffed = true;
    }
  }

  // Recalculate HP if CON was buffed
  if (conBuffed) {
    const newConMod = getModifier(combatant.stats.con);
    const conModDiff = newConMod - oldConMod;
    if (conModDiff > 0) {
      // Scale HP proportionally based on new modifier
      const hpBonus = conModDiff * (combatant.level ?? 1);
      combatant.maxHp += hpBonus;
      combatant.currentHp += hpBonus;
    }
  }

  return combatant;
}

function applyEffect(combatant: Combatant, effectType: string, magnitude: number, sourceType: string): void {
  // Stat buffs
  const statMap: Record<string, keyof typeof combatant.stats> = {
    buff_strength: 'str', buff_dexterity: 'dex', buff_constitution: 'con',
    buff_intelligence: 'int', buff_wisdom: 'wis', buff_charisma: 'cha',
  };
  if (statMap[effectType]) {
    combatant.stats[statMap[effectType]] += magnitude;
    return;
  }

  // AC buff
  if (effectType === 'buff_armor') {
    combatant.ac += magnitude;
    return;
  }

  // Poison immunity
  if (effectType === 'poison_immunity' || effectType === 'cure_poison' || effectType === 'cure_all') {
    combatant.poisonImmune = true;
    return;
  }

  // hp_regen as a stat buff effect (Berry Salve) — store as activeBuffs isn't needed
  // since it's pre-combat, we can treat it as a small HP boost
  if (effectType === 'hp_regen') {
    // hp_regen gives `magnitude` HP per round for `duration` rounds
    // As pre-combat buff, give a flat HP bump approximation (magnitude * 3 rounds)
    combatant.maxHp += magnitude * 3;
    combatant.currentHp += magnitude * 3;
    return;
  }
}

// ---------------------------------------------------------------------------
// Core: Resolve Road Encounter
// ---------------------------------------------------------------------------

/**
 * Roll for and resolve a road encounter during travel.
 *
 * This function:
 * 1. Rolls against danger-level-scaled encounter chance (15%-75%)
 * 2. If encounter triggers, selects a monster matching the route biome/terrain
 * 3. Auto-resolves combat (alternating attack turns)
 * 4. Applies rewards (win) or penalties (loss) to the character
 * 5. Logs the encounter
 *
 * The caller (travel-tick.ts) handles moving the character to origin/destination
 * based on the encounter result.
 */
export async function resolveRoadEncounter(
  characterId: string,
  originTownId: string,
  destinationTownId: string,
  routeInfo?: { dangerLevel: number; terrain: string },
): Promise<RoadEncounterResult> {
  // 1. Load character data (needed for level-based encounter chance)
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: {
      id: true,
      name: true,
      level: true,
      health: true,
      maxHealth: true,
      stats: true,
      gold: true,
      xp: true,
      race: true,
      subRace: true,
      class: true,
      bonusSaveProficiencies: true,
      feats: true,
    },
  });

  if (!character) {
    logger.warn({ characterId }, 'Road encounter: character not found');
    return { encountered: false };
  }

  // 2. Roll for encounter — chance scales with route danger + character level
  let encounterChance = getEncounterChance(routeInfo?.dangerLevel ?? 3);

  // Low-level characters face fewer encounters (capped)
  const cap = ENCOUNTER_CHANCE_CAP_BY_LEVEL[character.level];
  if (cap !== undefined) {
    encounterChance = Math.min(encounterChance, cap);
  } else if (character.level >= 6) {
    // High-level characters face slightly more encounters
    encounterChance = Math.min(1.0, encounterChance * HIGH_LEVEL_ENCOUNTER_MULTIPLIER);
  }

  // Apply feat-based encounter avoidance (reduces encounter chance multiplicatively)
  const avoidanceBonus = computeFeatBonus((character.feats as string[]) ?? [], 'encounterAvoidance');
  if (avoidanceBonus > 0) {
    encounterChance *= (1 - avoidanceBonus);
  }

  // Apply religion-based road safety (Aurvandos: personal, town-wide, shrine)
  const religionReduction = await getReligionEncounterReduction(characterId, originTownId, destinationTownId);
  if (religionReduction > 0) {
    encounterChance *= (1 - religionReduction);
  }

  // Apply patrol danger reduction (sheriff patrols, road patrol projects, guard shifts)
  const patrolReduction = await getPatrolDangerReduction(originTownId, destinationTownId);
  if (patrolReduction > 0) {
    encounterChance *= (1 - patrolReduction);
  }

  const roll = Math.random();
  if (roll > encounterChance) {
    return { encountered: false };
  }

  // 3. Select a level-appropriate monster (or group via encounter template)
  //    Priority: encounter template → biome match → region match → any
  const levelRange = getMonsterLevelRange(character.level);
  const routeBiome = routeInfo?.terrain ? terrainToBiome(routeInfo.terrain) : null;

  const destTown = await db.query.towns.findFirst({
    where: eq(towns.id, destinationTownId),
    columns: { regionId: true },
  });

  // Try encounter template first (coherent themed encounters)
  interface SelectedMonster {
    row: typeof monsters.$inferSelect;
    statScale: number;
    displayName: string;
  }
  let selectedMonsters: SelectedMonster[] = [];

  const template = selectEncounterTemplate(routeBiome, character.level, true /* solo */);
  if (template) {
    for (const comp of template.composition) {
      const monsterRow = await db.query.monsters.findFirst({
        where: eq(monsters.name, comp.monsterName),
      });
      if (monsterRow) {
        const { scaledStats, displayName } = applyStatScale(
          monsterRow.stats as Record<string, number>,
          monsterRow.name,
          comp.statScale ?? 1.0,
        );
        for (let i = 0; i < comp.count; i++) {
          selectedMonsters.push({
            row: { ...monsterRow, stats: scaledStats },
            statScale: comp.statScale ?? 1.0,
            displayName,
          });
        }
      } else {
        logger.warn({ monsterName: comp.monsterName, templateId: template.id },
          'Encounter template references non-existent monster');
      }
    }
  }

  // Fallback: original single-monster selection (biome → region → any)
  if (selectedMonsters.length === 0) {
    let monsterRows: (typeof monsters.$inferSelect)[] = [];

    if (routeBiome) {
      monsterRows = await db.query.monsters.findMany({
        where: and(
          eq(monsters.biome, routeBiome),
          gte(monsters.level, levelRange.min),
          lte(monsters.level, levelRange.max),
        ),
      });
    }

    if (monsterRows.length === 0 && destTown?.regionId) {
      monsterRows = await db.query.monsters.findMany({
        where: and(
          eq(monsters.regionId, destTown.regionId),
          gte(monsters.level, levelRange.min),
          lte(monsters.level, levelRange.max),
        ),
      });
    }

    if (monsterRows.length === 0) {
      monsterRows = await db.query.monsters.findMany({
        where: and(
          gte(monsters.level, levelRange.min),
          lte(monsters.level, levelRange.max),
        ),
      });
    }

    if (monsterRows.length === 0) {
      logger.warn({ characterId, levelRange }, 'Road encounter: no suitable monsters found');
      return { encountered: false };
    }

    const picked = monsterRows[Math.floor(Math.random() * monsterRows.length)];
    selectedMonsters = [{ row: picked, statScale: 1.0, displayName: picked.name }];
  }

  // Primary monster (for logging, XP reference, result)
  const monster = selectedMonsters[0].row;
  const monsterStats = monster.stats as Record<string, number>;
  const charStats = parseStats(character.stats);

  // 4. Get character's equipped weapon, armor AC, and equipment stat bonuses
  const rawWeapon = await getEquippedWeapon(characterId);
  const playerWeapon = applyClassWeaponStat(rawWeapon, character.class ?? null);
  const equipTotals = await calculateEquipmentTotals(characterId);

  // Apply equipment stat bonuses (STR ring, DEX boots, etc.) to combat stats
  const effectiveStats: CharacterStats = {
    str: charStats.str + (equipTotals.totalStatBonuses.strength ?? 0),
    dex: charStats.dex + (equipTotals.totalStatBonuses.dexterity ?? 0),
    con: charStats.con + (equipTotals.totalStatBonuses.constitution ?? 0),
    int: charStats.int + (equipTotals.totalStatBonuses.intelligence ?? 0),
    wis: charStats.wis + (equipTotals.totalStatBonuses.wisdom ?? 0),
    cha: charStats.cha + (equipTotals.totalStatBonuses.charisma ?? 0),
  };

  // AC = converted armor bonus + DEX (type-dependent)
  const charArmorType = CLASS_ARMOR_TYPE[character.class?.toLowerCase() ?? ''] ?? 'none';
  const playerAC = computeFinalAC(equipTotals.totalAC, getModifier(effectiveStats.dex), charArmorType);

  // 5. Create combat state (no DB session needed — this is auto-resolved)
  //    Characters enter road encounters at full HP — road rest heals them.
  //    This prevents cascading damage from multiple encounters making wins impossible.
  const sessionId = crypto.randomUUID();
  const playerCombatant = createCharacterCombatant(
    character.id,
    character.name,
    0,
    effectiveStats,
    character.level,
    character.maxHealth,
    character.maxHealth,
    playerAC,
    playerWeapon,
    {},
    getProficiencyBonus(character.level),
  );

  // Monster proficiency = 0 because the seed `attack` stat already includes the
  // monster's total attack bonus (stat mod + proficiency equivalent).  Adding
  // getProficiencyBonus on top would double-count it.
  const monsterCombatants = selectedMonsters.map((sm, i) => {
    const mStats = sm.row.stats as Record<string, number>;
    return createMonsterCombatant(
      `monster-${sm.row.id}-${i}`,
      sm.displayName,
      1,
      parseStats(sm.row.stats),
      sm.row.level,
      mStats.hp ?? 50,
      mStats.ac ?? 12,
      buildMonsterWeapon(mStats, sm.row.attackStat),
      0,
      buildMonsterCombatOptions(sm.row),
    );
  });
  const monsterCombatant = monsterCombatants[0]; // primary for backward compat

  // Set race, class, and save proficiencies for racial ability + save DC resolution
  (playerCombatant as any).race = character.race.toLowerCase();
  (playerCombatant as any).subRace = character.subRace ?? null;
  (playerCombatant as any).characterClass = character.class?.toLowerCase() ?? null;
  const featIds = (character.feats as string[]) ?? [];
  (playerCombatant as any).saveProficiencies = [
    ...(CLASS_SAVE_PROFICIENCIES[character.class?.toLowerCase() ?? ''] ?? []),
    ...((character.bonusSaveProficiencies as string[]) ?? []),
    // Resilient feat grants CON save proficiency
    ...(hasFeatEffect(featIds, 'bonusSaveProficiency') ? ['con'] : []),
  ];
  (playerCombatant as any).extraAttacks = getAttacksPerAction(character.class ?? '', character.level);
  (playerCombatant as any).featIds = featIds;

  // Encumbrance penalties (skip for simulation bots — they have no real inventory)
  if (!getSimulationRunId()) {
    const weightState = await calculateWeightState(character.id);
    if (
      weightState.encumbrance.attackPenalty !== 0 ||
      weightState.encumbrance.acPenalty !== 0 ||
      weightState.encumbrance.saveDcPenalty !== 0 ||
      weightState.encumbrance.damageMultiplier !== 1
    ) {
      (playerCombatant as any).encumbrancePenalties = {
        attackPenalty: weightState.encumbrance.attackPenalty,
        acPenalty: weightState.encumbrance.acPenalty,
        saveDcPenalty: weightState.encumbrance.saveDcPenalty,
        damageMultiplier: weightState.encumbrance.damageMultiplier,
      };
    }
  }

  // Apply pre-combat consumable buffs (stat potions, food buffs, scroll buffs)
  await applyConsumableBuffs(playerCombatant, character.id);

  // Apply religion combat defense buff (Aurvandos: damage reduction %)
  const relCtx = await getCharacterReligionContext(character.id);
  const relBuffs = resolveReligionBuffs(relCtx);
  const combatDefenseDR = relBuffs.combinedBuffs.combatDefensePercent ?? 0;
  if (combatDefenseDR > 0) {
    if (!playerCombatant.activeBuffs) playerCombatant.activeBuffs = [];
    playerCombatant.activeBuffs.push({
      sourceAbilityId: 'religion',
      name: 'Divine Protection',
      roundsRemaining: 999,
      damageReduction: combatDefenseDR,
    });
  }

  let combatState = createCombatState(sessionId, 'PVE', [playerCombatant, ...monsterCombatants]);

  // 6. Load player combat presets and build params for the tick resolver
  const combatParams = await buildCombatParams(character.id);
  const allParams = new Map<string, CombatantParams>();

  allParams.set(character.id, {
    id: character.id,
    presets: combatParams.presets,
    weapon: playerWeapon,
    racialTracker: createRacialCombatTracker(),
    race: character.race,
    level: character.level,
    subRace: character.subRace as { id: string; element?: string } | null,
    availableItems: combatParams.availableItems,
  });

  // Monster(s) get default aggressive presets (neverRetreat, no abilities queue)
  for (const mc of monsterCombatants) {
    allParams.set(mc.id, createDefaultMonsterParams(mc.id, mc));
  }

  // 6a. Pre-combat flee evaluation based on travel engagement mode
  const engagementMode = combatParams.presets.travelEngagementMode;
  if (engagementMode !== 'ALWAYS_FIGHT') {
    let shouldFlee = false;

    if (engagementMode === 'ALWAYS_FLEE') {
      shouldFlee = true;
    } else if (engagementMode === 'FLEE_IF_DANGEROUS') {
      const maxMonsterLevel = Math.max(...selectedMonsters.map(sm => sm.row.level));
      const levelCap = combatParams.presets.travelFleeMaxMonsterLevel;
      shouldFlee = maxMonsterLevel > character.level + 3
        || (levelCap != null && maxMonsterLevel > levelCap);
    } else if (engagementMode === 'FIGHT_IF_WINNABLE') {
      const maxMonsterLevel = Math.max(...selectedMonsters.map(sm => sm.row.level));
      const totalPackLevel = selectedMonsters.reduce((sum, sm) => sum + sm.row.level, 0);
      shouldFlee = maxMonsterLevel > character.level + 5
        || totalPackLevel > character.level * 1.5;
    }

    if (shouldFlee) {
      // Roll pre-combat flee save
      const fleeDC = calculateFleeDC(
        selectedMonsters.map(sm => ({ level: sm.row.level })),
        character.level,
        false, // not slowed pre-combat
      );

      // Gather flee bonus manually (no shared helper — duplicated sources acceptable per design)
      let fleeBonus = 0;
      const stanceMods = STANCE_MODIFIERS[combatParams.presets.stance];
      if (stanceMods.fleeBonus) fleeBonus += stanceMods.fleeBonus;
      const featFleeBonus = computeFeatBonus(featIds, 'fleeBonus');
      if (featFleeBonus) fleeBonus += featFleeBonus;
      const itemFleeBonus = (equipTotals.totalStatBonuses as Record<string, number>).fleeBonus ?? 0;
      if (itemFleeBonus) fleeBonus += itemFleeBonus;

      const fleeRoll = Math.floor(Math.random() * 20) + 1;
      const totalFleeRoll = fleeRoll + fleeBonus;
      const fleeSuccess = fleeRoll === 20 || (fleeRoll !== 1 && totalFleeRoll >= fleeDC);

      logger.info({
        characterId,
        engagementMode,
        monsterName: monster.name,
        monsterLevel: monster.level,
        monsterCount: selectedMonsters.length,
        fleeDC,
        fleeRoll,
        fleeBonus,
        totalFleeRoll,
        fleeSuccess,
      }, 'Pre-combat flee attempt');

      if (fleeSuccess) {
        return {
          encountered: true,
          won: false,
          fled: true,
          fleeDelayTicks: 0,
          monsterName: monster.name,
          monsterLevel: monster.level,
          xpAwarded: 0,
          goldAwarded: 0,
          totalRounds: 0,
          combatRounds: [],
        };
      }
      // Failed pre-combat flee — proceed to normal combat
    }
  }

  // 6b. Resolve combat using the unified tick combat resolver
  //     This gives road encounters the full preset-aware decision engine:
  //     ability queue, retreat conditions, healing potions, monster abilities, stance modifiers.
  const outcome = resolveTickCombat(combatState, allParams);
  combatState = outcome.finalState;

  // 7. Determine outcome
  const playerFled = outcome.fled.some(f => f.id === character.id);
  const playerSurvived = outcome.survivors.some(s => s.id === character.id);
  const playerWon = playerSurvived && !playerFled;
  const monsterResult = combatState.combatants.find(c => c.entityType === 'monster');
  const totalRounds = outcome.rounds;

  let xpAwarded = 0;
  let goldAwarded = 0;
  let droppedItems: { name: string; quantity: number; templateId: string }[] = [];

  // Feat bonuses for XP and gold (computed once, used in UPDATE)
  const charFeats = (character.feats as string[]) ?? [];
  const xpMultiplier = 1 + computeFeatBonus(charFeats, 'xpBonus');
  const goldMultiplier = 1 + computeFeatBonus(charFeats, 'goldBonus');

  // 8. Apply outcomes within a transaction
  await db.transaction(async (tx) => {
    if (playerWon) {
      // Win: award XP and gold from each killed monster
      for (const sm of selectedMonsters) {
        xpAwarded += getMonsterKillXp(sm.row.level);
        const lootTable = sm.row.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number; itemTemplateName?: string }[];

        for (const entry of lootTable) {
          if (Math.random() <= entry.dropChance) {
            goldAwarded += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
          }
        }

        const itemDrops = await processItemDrops(tx, characterId, lootTable);
        droppedItems.push(...itemDrops);
      }
      if (droppedItems.length > 0) {
        logger.info(
          { characterId, monster: monster.name, items: droppedItems },
          '[LOOT] Items dropped from road encounter victory',
        );
      }

      // Apply feat bonuses to XP and gold
      xpAwarded = Math.round(xpAwarded * xpMultiplier);
      goldAwarded = Math.round(goldAwarded * goldMultiplier);

      const playerHpRemaining = outcome.survivors.find(s => s.id === character.id)?.hpRemaining ?? character.health;
      await tx.update(characters).set({
        xp: sql`${characters.xp} + ${xpAwarded}`,
        gold: sql`${characters.gold} + ${goldAwarded}`,
        health: playerHpRemaining,
      }).where(eq(characters.id, characterId));
    } else if (playerFled) {
      // Fled: no death penalty, no rewards, just continue
      // Player's HP is preserved from combat (they escaped)
      const playerHpAfterFlee = outcome.fled.find(f => f.id === character.id)
        ? combatState.combatants.find(c => c.id === character.id)?.currentHp ?? character.maxHealth
        : character.maxHealth;
      await tx.update(characters).set({
        health: playerHpAfterFlee,
      }).where(eq(characters.id, characterId));
    } else {
      // Loss: apply death penalty
      const penalty = calculateDeathPenalty(
        characterId,
        character.level,
        character.gold,
        originTownId,
      );

      await tx.update(characters).set({
        health: character.maxHealth, // respawn at full HP
        gold: Math.max(0, character.gold - penalty.goldLost),
        xp: Math.max(0, character.xp - penalty.xpLost),
      }).where(eq(characters.id, characterId));

      // Damage equipment durability
      const equipment = await tx.query.characterEquipment.findMany({
        where: eq(characterEquipment.characterId, characterId),
        columns: { itemId: true },
      });
      if (equipment.length > 0) {
        const itemIds = equipment.map(e => e.itemId);
        await tx.execute(sql`
          UPDATE "items"
          SET "current_durability" = GREATEST(0, "current_durability" - ${penalty.durabilityDamage})
          WHERE "id" = ANY(${itemIds})
        `);
      }

      // Grant survive XP (consolation prize)
      await tx.update(characters).set({
        xp: sql`${characters.xp} + ${ACTION_XP.PVE_SURVIVE}`,
      }).where(eq(characters.id, characterId));
    }
  });

  // Build loot description from dropped items (for combat log)
  const lootDescription = droppedItems.map(d => `${d.quantity}x ${d.name}`).join(', ');

  // 9. Post-transaction side effects (quest triggers, level up, achievements)
  //    Wrapped in try/catch so the encounter result is returned even if
  //    a side-effect (e.g. achievement JSON path) errors.
  try {
    if (playerWon) {
      for (const sm of selectedMonsters) {
        onMonsterKill(characterId, sm.row.name, 1);
      }
      await checkLevelUp(characterId);

      const [{ total: pveWins }] = await db.select({ total: count() })
        .from(combatParticipants)
        .innerJoin(combatSessions, eq(combatParticipants.sessionId, combatSessions.id))
        .where(and(
          eq(combatParticipants.characterId, characterId),
          eq(combatSessions.type, 'PVE'),
          eq(combatSessions.status, 'COMPLETED'),
          gt(combatParticipants.currentHp, 0),
        ));
      await checkAchievements(characterId, 'combat_pve', { wins: Number(pveWins) });
    }
  } catch (sideEffectErr: unknown) {
    logger.warn(
      { characterId, err: sideEffectErr instanceof Error ? sideEffectErr.message : String(sideEffectErr) },
      'Road encounter: post-combat side-effect error (non-fatal)',
    );
  }

  // 10. Log the combat encounter
  if (COMBAT_LOGGING_ENABLED) {
    const outcome: 'win' | 'loss' = playerWon ? 'win' : 'loss';

    logPveCombat({
      sessionId,
      state: combatState,
      characterId,
      characterName: character.name,
      opponentName: monster.name,
      townId: null, // road encounter, not in a town
      characterStartHp: character.maxHealth,
      opponentStartHp: monsterStats.hp ?? 50,
      characterWeapon: playerWeapon.name,
      opponentWeapon: monsterResult?.weapon?.name ?? 'Natural Attack',
      xpAwarded,
      goldAwarded,
      lootDropped: lootDescription,
      outcome,
      triggerSource: 'road_encounter',
      originTownId,
      destinationTownId,
    });
  }

  logger.info(
    {
      characterId,
      characterName: character.name,
      monster: monster.name,
      monsterLevel: monster.level,
      monsterBiome: (monster as any).biome ?? null,
      routeDanger: routeInfo?.dangerLevel ?? null,
      routeTerrain: routeInfo?.terrain ?? null,
      routeBiome: routeBiome ?? null,
      encounterChance,
      outcome: playerWon ? 'win' : 'loss',
      rounds: totalRounds,
      xpAwarded,
      goldAwarded,
      originTownId,
      destinationTownId,
    },
    'Road encounter resolved',
  );

  // Build round-by-round combat data for simulation export
  const combatRounds = buildCombatRoundsFromLog(sessionId, combatState, getSimulationTick());

  return {
    encountered: true,
    won: playerWon,
    fled: playerFled,
    fleeDelayTicks: playerFled ? 2 : undefined,
    monsterName: monster.name,
    monsterLevel: monster.level,
    xpAwarded,
    goldAwarded,
    totalRounds,
    combatRounds,
  };
}

// ---------------------------------------------------------------------------
// Group Road Encounter Result
// ---------------------------------------------------------------------------

export interface GroupRoadEncounterResult {
  /** Whether an encounter occurred (false = safe travel). */
  encountered: boolean;
  /** If encountered, did the party win? */
  won?: boolean;
  /** Monster name. */
  monsterName?: string;
  /** Monster level. */
  monsterLevel?: number;
  /** Total combat rounds. */
  totalRounds?: number;
  /** Per-member results. */
  memberResults?: {
    characterId: string;
    survived: boolean;
    xpAwarded: number;
    goldAwarded: number;
    deathPenalty?: { goldLost: number; xpLost: number; durabilityDamage: number };
  }[];
  /** Round-by-round combat detail for simulation export. */
  combatRounds?: CombatRound[];
}

// ---------------------------------------------------------------------------
// Core: Resolve Group Road Encounter
// ---------------------------------------------------------------------------

/**
 * Roll for and resolve a group road encounter during travel.
 *
 * Mirrors resolveRoadEncounter() but for a party of characters fighting
 * a single scaled monster together.
 *
 * Monster scaling:
 * - Level based on HIGHEST character level in the party
 * - HP multiplied by party size
 * - Damage bonus: +1 per extra member beyond the first
 *
 * Rewards / penalties:
 * - XP per living member = base monster XP / party size
 * - Gold split evenly among living members
 * - Only dead members receive death penalties
 * - All members receive consolation XP on loss
 *
 * The caller (travel-tick.ts) handles moving characters to origin/destination
 * based on the encounter result.
 */
export async function resolveGroupRoadEncounter(
  memberCharacterIds: string[],
  originTownId: string,
  destinationTownId: string,
  routeInfo?: { dangerLevel: number; terrain: string },
  partyId?: string,
): Promise<GroupRoadEncounterResult> {
  if (memberCharacterIds.length === 0) {
    return { encountered: false };
  }

  // 1. Load ALL member characters with their equipment data
  const charRows = await db.query.characters.findMany({
    where: inArray(characters.id, memberCharacterIds),
    columns: {
      id: true,
      name: true,
      level: true,
      health: true,
      maxHealth: true,
      stats: true,
      gold: true,
      xp: true,
      race: true,
      subRace: true,
      class: true,
      bonusSaveProficiencies: true,
      feats: true,
    },
  });

  if (charRows.length === 0) {
    logger.warn({ memberCharacterIds }, 'Group road encounter: no characters found');
    return { encountered: false };
  }

  // 2. Find the highest level among members
  const highestLevel = Math.max(...charRows.map(c => c.level));

  // 3. Roll for encounter — chance scales with route danger + highest member level
  let encounterChance = getEncounterChance(routeInfo?.dangerLevel ?? 3);

  const cap = ENCOUNTER_CHANCE_CAP_BY_LEVEL[highestLevel];
  if (cap !== undefined) {
    encounterChance = Math.min(encounterChance, cap);
  } else if (highestLevel >= 6) {
    encounterChance = Math.min(1.0, encounterChance * HIGH_LEVEL_ENCOUNTER_MULTIPLIER);
  }

  // Apply feat-based encounter avoidance (use best bonus among group members)
  const groupAvoidance = Math.max(...charRows.map(c => computeFeatBonus((c.feats as string[]) ?? [], 'encounterAvoidance')));
  if (groupAvoidance > 0) {
    encounterChance *= (1 - groupAvoidance);
  }

  // Apply religion-based road safety (best reduction among group members)
  let bestReligionReduction = 0;
  for (const c of charRows) {
    const rr = await getReligionEncounterReduction(c.id, originTownId, destinationTownId);
    if (rr > bestReligionReduction) bestReligionReduction = rr;
  }
  if (bestReligionReduction > 0) {
    encounterChance *= (1 - bestReligionReduction);
  }

  const roll = Math.random();
  if (roll > encounterChance) {
    return { encountered: false };
  }

  // 4. Select a level-appropriate monster (biome → region → any)
  const levelRange = getMonsterLevelRange(highestLevel);
  const routeBiome = routeInfo?.terrain ? terrainToBiome(routeInfo.terrain) : null;

  const destTown = await db.query.towns.findFirst({
    where: eq(towns.id, destinationTownId),
    columns: { regionId: true },
  });

  let monsterRows: (typeof monsters.$inferSelect)[] = [];

  if (routeBiome) {
    monsterRows = await db.query.monsters.findMany({
      where: and(
        eq(monsters.biome, routeBiome),
        gte(monsters.level, levelRange.min),
        lte(monsters.level, levelRange.max),
      ),
    });
  }

  if (monsterRows.length === 0 && destTown?.regionId) {
    monsterRows = await db.query.monsters.findMany({
      where: and(
        eq(monsters.regionId, destTown.regionId),
        gte(monsters.level, levelRange.min),
        lte(monsters.level, levelRange.max),
      ),
    });
  }

  if (monsterRows.length === 0) {
    monsterRows = await db.query.monsters.findMany({
      where: and(
        gte(monsters.level, levelRange.min),
        lte(monsters.level, levelRange.max),
      ),
    });
  }

  if (monsterRows.length === 0) {
    logger.warn({ memberCharacterIds, levelRange }, 'Group road encounter: no suitable monsters found');
    return { encountered: false };
  }

  const monster = monsterRows[Math.floor(Math.random() * monsterRows.length)];
  const monsterStats = monster.stats as Record<string, number>;
  const memberCount = charRows.length;

  // 5. Scale the monster: HP * partySize, bonusDamage + (partySize - 1)
  const scaledMonsterHp = (monsterStats.hp ?? 50) * memberCount;
  const baseMonsterWeapon = buildMonsterWeapon(monsterStats, monster.attackStat);
  const scaledMonsterWeapon: WeaponInfo = {
    ...baseMonsterWeapon,
    bonusDamage: baseMonsterWeapon.bonusDamage + (memberCount - 1),
  };

  // 6. Create combat state with all members (team 0) + scaled monster (team 1)
  const sessionId = crypto.randomUUID();
  const combatants = [];

  // Build player combatants and cache their weapons for combat resolution
  const playerWeapons: Record<string, WeaponInfo> = {};
  for (const char of charRows) {
    const charStats = parseStats(char.stats);
    const rawWeapon = await getEquippedWeapon(char.id);
    const playerWeapon = applyClassWeaponStat(rawWeapon, char.class ?? null);
    const equipTotals = await calculateEquipmentTotals(char.id);

    // Apply equipment stat bonuses to combat stats
    const effectiveStats: CharacterStats = {
      str: charStats.str + (equipTotals.totalStatBonuses.strength ?? 0),
      dex: charStats.dex + (equipTotals.totalStatBonuses.dexterity ?? 0),
      con: charStats.con + (equipTotals.totalStatBonuses.constitution ?? 0),
      int: charStats.int + (equipTotals.totalStatBonuses.intelligence ?? 0),
      wis: charStats.wis + (equipTotals.totalStatBonuses.wisdom ?? 0),
      cha: charStats.cha + (equipTotals.totalStatBonuses.charisma ?? 0),
    };
    const groupArmorType = CLASS_ARMOR_TYPE[char.class?.toLowerCase() ?? ''] ?? 'none';
    const playerAC = computeFinalAC(equipTotals.totalAC, getModifier(effectiveStats.dex), groupArmorType);

    playerWeapons[char.id] = playerWeapon;

    const combatant = createCharacterCombatant(
        char.id,
        char.name,
        0, // team 0 = players
        effectiveStats,
        char.level,
        char.maxHealth, // road rest heals to full
        char.maxHealth,
        playerAC,
        playerWeapon,
        {},
        getProficiencyBonus(char.level),
    );
    // Set race, class, and save proficiencies for racial ability + save DC resolution
    (combatant as any).race = char.race.toLowerCase();
    (combatant as any).subRace = char.subRace ?? null;
    (combatant as any).characterClass = char.class?.toLowerCase() ?? null;
    const charFeatIds = (char.feats as string[]) ?? [];
    (combatant as any).saveProficiencies = [
      ...(CLASS_SAVE_PROFICIENCIES[char.class?.toLowerCase() ?? ''] ?? []),
      ...((char.bonusSaveProficiencies as string[]) ?? []),
      // Resilient feat grants CON save proficiency
      ...(hasFeatEffect(charFeatIds, 'bonusSaveProficiency') ? ['con'] : []),
    ];
    (combatant as any).extraAttacks = getAttacksPerAction(char.class ?? '', char.level);
    (combatant as any).featIds = charFeatIds;
    // Apply pre-combat consumable buffs
    await applyConsumableBuffs(combatant, char.id);
    // Apply religion combat defense buff
    const grpRelCtx = await getCharacterReligionContext(char.id);
    const grpRelBuffs = resolveReligionBuffs(grpRelCtx);
    const grpDefenseDR = grpRelBuffs.combinedBuffs.combatDefensePercent ?? 0;
    if (grpDefenseDR > 0) {
      if (!combatant.activeBuffs) combatant.activeBuffs = [];
      combatant.activeBuffs.push({
        sourceAbilityId: 'religion',
        name: 'Divine Protection',
        roundsRemaining: 999,
        damageReduction: grpDefenseDR,
      });
    }
    combatants.push(combatant);
  }

  const monsterCombatant = createMonsterCombatant(
    `monster-${monster.id}`,
    monster.name,
    1, // team 1 = monster
    parseStats(monster.stats),
    monster.level,
    scaledMonsterHp,
    monsterStats.ac ?? 12,
    scaledMonsterWeapon,
    0, // proficiency already baked into monster attack stat
    buildMonsterCombatOptions(monster),
  );
  combatants.push(monsterCombatant);

  let combatState = createCombatState(sessionId, 'PVE', combatants);

  // 7. Auto-resolve combat (alternating attacks, max rounds)
  for (let tick = 0; tick < MAX_COMBAT_ROUNDS * (memberCount + 1); tick++) {
    if (combatState.status !== 'ACTIVE') break;

    const currentActorId = combatState.turnOrder[combatState.turnIndex];
    const currentActor = combatState.combatants.find(c => c.id === currentActorId);

    if (!currentActor || !currentActor.isAlive) {
      combatState = resolveTurn(combatState, { type: 'defend', actorId: currentActorId }, {});
      continue;
    }

    // Determine target: monster attacks random living player, players attack monster
    const enemies = combatState.combatants.filter(c => c.team !== currentActor.team && c.isAlive);
    if (enemies.length === 0) break;

    const target = enemies[Math.floor(Math.random() * enemies.length)];
    const weapon = currentActor.entityType === 'monster'
      ? (currentActor.weapon ?? undefined)
      : playerWeapons[currentActor.id] ?? UNARMED_WEAPON;

    combatState = resolveTurn(
      combatState,
      { type: 'attack', actorId: currentActorId, targetId: target.id },
      { weapon },
    );
  }

  // 8. Determine outcome: party wins if monster is dead, loses if all players are dead
  const monsterResult = combatState.combatants.find(c => c.entityType === 'monster');
  const playerResults = combatState.combatants.filter(c => c.entityType === 'character');
  const partyWon = !(monsterResult?.isAlive ?? true);
  const totalRounds = combatState.round;

  const livingMembers = playerResults.filter(p => p.isAlive);
  const deadMembers = playerResults.filter(p => !p.isAlive);
  const livingCount = livingMembers.length;

  // 9. Apply outcomes in a transaction
  const memberResults: GroupRoadEncounterResult['memberResults'] = [];

  await db.transaction(async (tx) => {
    if (partyWon) {
      // Win: split XP and gold among living members
      const totalXp = getMonsterKillXp(monster.level);
      const xpPerMember = livingCount > 0 ? Math.floor(totalXp / memberCount) : 0;

      // Calculate total gold from loot table
      let totalGold = 0;
      const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number }[];
      for (const entry of lootTable) {
        if (Math.random() <= entry.dropChance) {
          totalGold += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
        }
      }
      const goldPerMember = livingCount > 0 ? Math.floor(totalGold / livingCount) : 0;

      for (const char of charRows) {
        const combatant = playerResults.find(p => p.id === char.id);
        const survived = combatant?.isAlive ?? false;

        if (survived) {
          await tx.update(characters).set({
            xp: sql`${characters.xp} + ${xpPerMember}`,
            gold: sql`${characters.gold} + ${goldPerMember}`,
            health: combatant?.currentHp ?? char.health,
          }).where(eq(characters.id, char.id));
          memberResults.push({
            characterId: char.id,
            survived: true,
            xpAwarded: xpPerMember,
            goldAwarded: goldPerMember,
          });
        } else {
          // Dead member: no rewards
          await tx.update(characters).set({
            health: char.maxHealth, // respawn at full HP
          }).where(eq(characters.id, char.id));
          memberResults.push({
            characterId: char.id,
            survived: false,
            xpAwarded: 0,
            goldAwarded: 0,
          });
        }
      }
    } else {
      // Loss: dead members get death penalty, all members get consolation XP
      for (const char of charRows) {
        const combatant = playerResults.find(p => p.id === char.id);
        const survived = combatant?.isAlive ?? false;

        if (!survived) {
          // Dead member: apply death penalty
          const penalty = calculateDeathPenalty(
            char.id,
            char.level,
            char.gold,
            originTownId,
          );

          await tx.update(characters).set({
            health: char.maxHealth, // respawn at full HP
            gold: Math.max(0, char.gold - penalty.goldLost),
            xp: Math.max(0, char.xp - penalty.xpLost),
          }).where(eq(characters.id, char.id));

          // Damage equipment durability
          const equipment = await tx.query.characterEquipment.findMany({
            where: eq(characterEquipment.characterId, char.id),
            columns: { itemId: true },
          });
          if (equipment.length > 0) {
            const itemIds = equipment.map(e => e.itemId);
            await tx.execute(sql`
              UPDATE "items"
              SET "current_durability" = GREATEST(0, "current_durability" - ${penalty.durabilityDamage})
              WHERE "id" = ANY(${itemIds})
            `);
          }

          memberResults.push({
            characterId: char.id,
            survived: false,
            xpAwarded: ACTION_XP.PVE_SURVIVE,
            goldAwarded: 0,
            deathPenalty: {
              goldLost: penalty.goldLost,
              xpLost: penalty.xpLost,
              durabilityDamage: penalty.durabilityDamage,
            },
          });
        } else {
          // Living member on a lost fight: no penalty, just consolation XP
          memberResults.push({
            characterId: char.id,
            survived: true,
            xpAwarded: ACTION_XP.PVE_SURVIVE,
            goldAwarded: 0,
          });
        }

        // All members get consolation XP
        await tx.update(characters).set({
          xp: sql`${characters.xp} + ${ACTION_XP.PVE_SURVIVE}`,
        }).where(eq(characters.id, char.id));
      }
    }
  });

  // 10. Post-transaction side effects for winning members
  try {
    if (partyWon) {
      for (const mr of memberResults) {
        if (mr.survived) {
          onMonsterKill(mr.characterId, monster.name, 1);
          await checkLevelUp(mr.characterId);

          const [{ total: pveWins }] = await db.select({ total: count() })
            .from(combatParticipants)
            .innerJoin(combatSessions, eq(combatParticipants.sessionId, combatSessions.id))
            .where(and(
              eq(combatParticipants.characterId, mr.characterId),
              eq(combatSessions.type, 'PVE'),
              eq(combatSessions.status, 'COMPLETED'),
              gt(combatParticipants.currentHp, 0),
            ));
          await checkAchievements(mr.characterId, 'combat_pve', { wins: Number(pveWins) });
        }
      }
    }
  } catch (sideEffectErr: unknown) {
    logger.warn(
      { memberCharacterIds, err: sideEffectErr instanceof Error ? sideEffectErr.message : String(sideEffectErr) },
      'Group road encounter: post-combat side-effect error (non-fatal)',
    );
  }

  // 11. Log combat encounters — one record per member
  if (COMBAT_LOGGING_ENABLED) {
    const outcome: 'win' | 'loss' = partyWon ? 'win' : 'loss';

    // Build round data once for the first member's full log
    const roundsData = buildRoundsData(combatState);
    const encounterCtx = buildEncounterContext(combatState);
    const roundsWithContext = [{ _encounterContext: encounterCtx }, ...roundsData];

    for (let ci = 0; ci < charRows.length; ci++) {
      const char = charRows[ci];
      const combatant = playerResults.find(p => p.id === char.id);
      const mr = memberResults.find(m => m.characterId === char.id);

      try {
        await db.insert(combatEncounterLogs).values({
            id: crypto.randomUUID(),
            type: 'pve',
            sessionId,
            characterId: char.id,
            characterName: char.name,
            opponentId: monsterCombatant.id,
            opponentName: monster.name,
            townId: null, // road encounter, not in a town
            partyId: partyId ?? null,
            startedAt: new Date(Date.now() - (totalRounds * 6000)).toISOString(),
            endedAt: new Date().toISOString(),
            outcome,
            totalRounds,
            characterStartHp: char.maxHealth,
            characterEndHp: combatant?.currentHp ?? 0,
            opponentStartHp: scaledMonsterHp,
            opponentEndHp: monsterResult?.currentHp ?? 0,
            characterWeapon: playerWeapons[char.id]?.name ?? 'Unarmed Strike',
            opponentWeapon: monsterResult?.weapon?.name ?? 'Natural Attack',
            xpAwarded: mr?.xpAwarded ?? 0,
            goldAwarded: mr?.goldAwarded ?? 0,
            lootDropped: '',
            rounds: ci === 0 ? roundsWithContext : ([] as any),
            summary: `Group encounter (${memberCount} members): ${partyWon ? 'Victory' : 'Defeat'} vs ${monster.name} (L${monster.level}) in ${totalRounds} rounds.`,
            triggerSource: 'group_road_encounter',
            originTownId,
            destinationTownId,
            simulationTick: getSimulationTick(),
            simulationRunId: getSimulationRunId(),
        });
      } catch (logErr: unknown) {
        logger.error(
          { characterId: char.id, err: logErr instanceof Error ? logErr.message : String(logErr) },
          'Failed to write group combat encounter log',
        );
      }
    }
  }

  logger.info(
    {
      memberCharacterIds,
      memberCount,
      highestLevel,
      monster: monster.name,
      monsterLevel: monster.level,
      scaledMonsterHp,
      routeDanger: routeInfo?.dangerLevel ?? null,
      routeTerrain: routeInfo?.terrain ?? null,
      outcome: partyWon ? 'win' : 'loss',
      rounds: totalRounds,
      livingMembers: livingCount,
      deadMembers: deadMembers.length,
      partyId: partyId ?? null,
      originTownId,
      destinationTownId,
    },
    'Group road encounter resolved',
  );

  // Build round-by-round combat data for simulation export
  const combatRounds = buildCombatRoundsFromLog(sessionId, combatState, getSimulationTick());

  return {
    encountered: true,
    won: partyWon,
    monsterName: monster.name,
    monsterLevel: monster.level,
    totalRounds,
    memberResults,
    combatRounds,
  };
}

/**
 * Get combined patrol danger reduction for a route between two towns.
 * Checks tradePolicy.activePatrols for both origin and destination towns.
 * Sources: SHERIFF patrols, PROJECT road patrols, GUARD_SHIFT emergency spending.
 */
async function getPatrolDangerReduction(originTownId: string, destinationTownId: string): Promise<number> {
  const policies = await db.query.townPolicies.findMany({
    where: inArray(townPolicies.townId, [originTownId, destinationTownId]),
    columns: { townId: true, tradePolicy: true },
  });

  const now = new Date();
  let totalReduction = 0;

  for (const policy of policies) {
    const tp = (policy.tradePolicy as Record<string, any>) ?? {};
    const patrols = (tp.activePatrols as any[]) ?? [];

    for (const patrol of patrols) {
      if (new Date(patrol.expiresAt) <= now) continue;

      // GUARD_SHIFT covers ALL adjacent routes from that town
      if (patrol.source === 'GUARD_SHIFT') {
        totalReduction += patrol.dangerReduction ?? 0;
        continue;
      }

      // SHERIFF and PROJECT patrols cover a specific route
      // Match if the patrol's routeId connects these two towns
      if (patrol.routeId) {
        // We need to check if this route connects origin and destination
        // For efficiency, we check against both town IDs
        const route = await db.query.travelRoutes.findFirst({
          where: and(
            eq(travelRoutes.id, patrol.routeId),
            or(
              and(eq(travelRoutes.fromTownId, originTownId), eq(travelRoutes.toTownId, destinationTownId)),
              and(eq(travelRoutes.fromTownId, destinationTownId), eq(travelRoutes.toTownId, originTownId)),
            ),
          ),
          columns: { id: true },
        });
        if (route) {
          totalReduction += patrol.dangerReduction ?? 0;
        }
      }
    }
  }

  // Cap at 0.50 (50% max reduction from patrols)
  return Math.min(0.50, totalReduction);
}
