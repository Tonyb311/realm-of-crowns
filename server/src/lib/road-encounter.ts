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

import { prisma } from './prisma';
import { Prisma, BiomeType } from '@prisma/client';
import { logger } from './logger';
import {
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  resolveTurn,
  calculateDeathPenalty,
} from './combat-engine';
import type {
  CharacterStats,
  CombatState,
  WeaponInfo,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
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
import { logPveCombat, COMBAT_LOGGING_ENABLED } from './combat-logger';
import { getSimulationTick } from './simulation-context';

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
  [/forest|wood|grove|glade|silverwood|elven|sacred/i, BiomeType.FOREST],
  [/mountain|peak|altitude|mine|cavern|tunnel|descent|foothill/i, BiomeType.MOUNTAIN],
  [/swamp|marsh|bog|mist|blighted|cursed/i, BiomeType.SWAMP],
  [/plains|farm|meadow|cobblestone|paved|trade|country|border|highway|fortified/i, BiomeType.PLAINS],
  [/hill|valley|river/i, BiomeType.HILLS],
  [/volcanic|ember|lava|scorched/i, BiomeType.VOLCANIC],
  [/tundra|frozen|frost|ice/i, BiomeType.TUNDRA],
  [/coast|sea|ocean|coral|shallow|beach|seaside/i, BiomeType.COASTAL],
  [/desert|arid|sand|rift/i, BiomeType.DESERT],
  [/badland|waste|war|lawless|contested|frontier|hostile/i, BiomeType.BADLANDS],
  [/underdark|subterranean|underground/i, BiomeType.UNDERGROUND],
  [/fey|feywild|glimmer|moonpetal/i, BiomeType.FEYWILD],
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

/**
 * Get the total AC bonus from all equipped armor/shield items.
 * Sums the `ac` stat from each equipped item's template.
 */
async function getEquipmentAC(characterId: string): Promise<number> {
  const equipment = await prisma.characterEquipment.findMany({
    where: { characterId },
    include: { item: { include: { template: true } } },
  });

  let ac = 0;
  for (const equip of equipment) {
    const stats = equip.item.template.stats as Record<string, number> | undefined;
    if (stats?.ac) {
      ac += stats.ac;
    }
  }
  return ac;
}

async function getEquippedWeapon(characterId: string): Promise<WeaponInfo> {
  const equip = await prisma.characterEquipment.findUnique({
    where: { characterId_slot: { characterId, slot: 'MAIN_HAND' } },
    include: { item: { include: { template: true } } },
  });

  if (!equip || equip.item.template.type !== 'WEAPON') {
    return UNARMED_WEAPON;
  }

  const stats = equip.item.template.stats as Record<string, unknown>;
  return {
    id: equip.item.id,
    name: equip.item.template.name,
    diceCount: (typeof stats.diceCount === 'number') ? stats.diceCount : 1,
    diceSides: (typeof stats.diceSides === 'number') ? stats.diceSides : 4,
    damageModifierStat: stats.damageModifierStat === 'dex' ? 'dex' : 'str',
    attackModifierStat: stats.attackModifierStat === 'dex' ? 'dex' : 'str',
    bonusDamage: (typeof stats.bonusDamage === 'number') ? stats.bonusDamage : 0,
    bonusAttack: (typeof stats.bonusAttack === 'number') ? stats.bonusAttack : 0,
    damageType: (typeof stats.damageType === 'string') ? stats.damageType : undefined,
  };
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
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      level: true,
      health: true,
      maxHealth: true,
      stats: true,
      gold: true,
      xp: true,
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

  const roll = Math.random();
  if (roll > encounterChance) {
    return { encountered: false };
  }

  // 3. Select a level-appropriate monster
  //    Priority: biome match (from route terrain) → region match → any
  const levelRange = getMonsterLevelRange(character.level);
  const routeBiome = routeInfo?.terrain ? terrainToBiome(routeInfo.terrain) : null;

  const destTown = await prisma.town.findUnique({
    where: { id: destinationTownId },
    select: { regionId: true },
  });

  let monsters: Awaited<ReturnType<typeof prisma.monster.findMany>> = [];

  // Try biome match first (most thematic — forest road gets forest monsters)
  if (routeBiome) {
    monsters = await prisma.monster.findMany({
      where: {
        biome: routeBiome,
        level: { gte: levelRange.min, lte: levelRange.max },
      },
    });
  }

  // Fallback to region match
  if (monsters.length === 0 && destTown?.regionId) {
    monsters = await prisma.monster.findMany({
      where: {
        regionId: destTown.regionId,
        level: { gte: levelRange.min, lte: levelRange.max },
      },
    });
  }

  if (monsters.length === 0) {
    // Final fallback: any monster in level range
    monsters = await prisma.monster.findMany({
      where: { level: { gte: levelRange.min, lte: levelRange.max } },
    });
  }

  if (monsters.length === 0) {
    logger.warn({ characterId, levelRange }, 'Road encounter: no suitable monsters found');
    return { encountered: false };
  }

  const monster = monsters[Math.floor(Math.random() * monsters.length)];
  const monsterStats = monster.stats as Record<string, number>;
  const charStats = parseStats(character.stats);

  // 4. Get character's equipped weapon and armor AC
  const playerWeapon = await getEquippedWeapon(characterId);
  const armorAC = await getEquipmentAC(characterId);
  // AC = 10 + DEX modifier + armor bonus (matches tick-combat-resolver.ts)
  const playerAC = 10 + getModifier(charStats.dex) + armorAC;

  // 5. Create combat state (no DB session needed — this is auto-resolved)
  //    Characters enter road encounters at full HP — road rest heals them.
  //    This prevents cascading damage from multiple encounters making wins impossible.
  const sessionId = crypto.randomUUID();
  const playerCombatant = createCharacterCombatant(
    character.id,
    character.name,
    0,
    charStats,
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
  const monsterCombatant = createMonsterCombatant(
    `monster-${monster.id}`,
    monster.name,
    1,
    parseStats(monster.stats),
    monster.level,
    monsterStats.hp ?? 50,
    monsterStats.ac ?? 12,
    buildMonsterWeapon(monsterStats),
    0,
  );

  let combatState = createCombatState(sessionId, 'PVE', [playerCombatant, monsterCombatant]);

  // 6. Auto-resolve combat (alternating attacks, max rounds)
  for (let round = 0; round < MAX_COMBAT_ROUNDS * 2; round++) {
    if (combatState.status !== 'ACTIVE') break;

    const currentActorId = combatState.turnOrder[combatState.turnIndex];
    const currentActor = combatState.combatants.find(c => c.id === currentActorId);

    if (!currentActor || !currentActor.isAlive) {
      // Skip dead combatant
      combatState = resolveTurn(combatState, { type: 'defend', actorId: currentActorId }, {});
      continue;
    }

    // Both player and monster just attack
    const enemies = combatState.combatants.filter(c => c.team !== currentActor.team && c.isAlive);
    if (enemies.length === 0) break;

    const target = enemies[0];
    const weapon = currentActor.entityType === 'monster'
      ? (currentActor.weapon ?? undefined)
      : playerWeapon;

    combatState = resolveTurn(
      combatState,
      { type: 'attack', actorId: currentActorId, targetId: target.id },
      { weapon },
    );
  }

  // 7. Determine outcome
  const playerResult = combatState.combatants.find(c => c.id === character.id);
  const monsterResult = combatState.combatants.find(c => c.entityType === 'monster');
  const playerWon = playerResult?.isAlive ?? false;
  const totalRounds = combatState.round;

  let xpAwarded = 0;
  let goldAwarded = 0;

  // 8. Apply outcomes within a transaction
  await prisma.$transaction(async (tx) => {
    if (playerWon) {
      // Win: award XP (front-loaded for low-tier monsters) and gold
      xpAwarded = getMonsterKillXp(monster.level);
      const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number }[];

      for (const entry of lootTable) {
        if (Math.random() <= entry.dropChance) {
          goldAwarded += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
        }
      }

      await tx.character.update({
        where: { id: characterId },
        data: {
          xp: { increment: xpAwarded },
          gold: { increment: goldAwarded },
          health: playerResult?.currentHp ?? character.health,
        },
      });
    } else {
      // Loss: apply death penalty
      const penalty = calculateDeathPenalty(
        characterId,
        character.level,
        character.gold,
        originTownId,
      );

      await tx.character.update({
        where: { id: characterId },
        data: {
          health: character.maxHealth, // respawn at full HP
          gold: Math.max(0, character.gold - penalty.goldLost),
          xp: Math.max(0, character.xp - penalty.xpLost),
        },
      });

      // Damage equipment durability
      const equipment = await tx.characterEquipment.findMany({
        where: { characterId },
        select: { itemId: true },
      });
      if (equipment.length > 0) {
        const itemIds = equipment.map(e => e.itemId);
        await tx.$executeRaw`
          UPDATE "items"
          SET "current_durability" = GREATEST(0, "current_durability" - ${penalty.durabilityDamage})
          WHERE "id" IN (${Prisma.join(itemIds)})
        `;
      }

      // Grant survive XP (consolation prize)
      await tx.character.update({
        where: { id: characterId },
        data: { xp: { increment: ACTION_XP.PVE_SURVIVE } },
      });
    }
  });

  // 9. Post-transaction side effects (quest triggers, level up, achievements)
  //    Wrapped in try/catch so the encounter result is returned even if
  //    a side-effect (e.g. achievement JSON path) errors.
  try {
    if (playerWon) {
      onMonsterKill(characterId, monster.name, 1);
      await checkLevelUp(characterId);

      const pveWins = await prisma.combatParticipant.count({
        where: {
          characterId,
          session: { type: 'PVE', status: 'COMPLETED' },
          currentHp: { gt: 0 },
        },
      });
      await checkAchievements(characterId, 'combat_pve', { wins: pveWins });
    }
  } catch (sideEffectErr: any) {
    logger.warn(
      { characterId, err: sideEffectErr.message },
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
      lootDropped: '',
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

  return {
    encountered: true,
    won: playerWon,
    fled: false,
    monsterName: monster.name,
    monsterLevel: monster.level,
    xpAwarded,
    goldAwarded,
    totalRounds,
  };
}
