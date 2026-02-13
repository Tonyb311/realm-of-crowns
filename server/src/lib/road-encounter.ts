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
import { Prisma } from '@prisma/client';
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
import { ACTION_XP, DEATH_PENALTY } from '@shared/data/progression';
import { onMonsterKill } from '../services/quest-triggers';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { logPveCombat, COMBAT_LOGGING_ENABLED } from './combat-logger';
import { getSimulationTick } from './simulation-context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Probability of a random encounter during any travel action (45%). */
export const ROAD_ENCOUNTER_CHANCE = 0.45;

/**
 * Monster level range based on character level.
 * Characters face monsters at or below their level range.
 */
export function getMonsterLevelRange(charLevel: number): { min: number; max: number } {
  if (charLevel <= 2) return { min: 1, max: 2 };
  if (charLevel <= 5) return { min: 1, max: 5 };
  if (charLevel <= 10) return { min: 1, max: 10 };
  if (charLevel <= 20) return { min: Math.max(1, charLevel - 10), max: charLevel };
  return { min: Math.max(1, charLevel - 15), max: charLevel };
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
 * 1. Rolls against ROAD_ENCOUNTER_CHANCE
 * 2. If encounter triggers, selects a level-appropriate monster
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
): Promise<RoadEncounterResult> {
  // 1. Roll for encounter
  if (Math.random() > ROAD_ENCOUNTER_CHANCE) {
    return { encountered: false };
  }

  // 2. Load character data
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

  // 3. Select a level-appropriate monster
  const levelRange = getMonsterLevelRange(character.level);

  // Try to find monsters from the destination region first, then fallback globally
  const destTown = await prisma.town.findUnique({
    where: { id: destinationTownId },
    select: { regionId: true },
  });

  let monsters = await prisma.monster.findMany({
    where: {
      regionId: destTown?.regionId ?? undefined,
      level: { gte: levelRange.min, lte: levelRange.max },
    },
  });

  if (monsters.length === 0) {
    // Fallback: any monster in level range
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

  // 4. Get character's equipped weapon
  const playerWeapon = await getEquippedWeapon(characterId);

  // 5. Create combat state (no DB session needed — this is auto-resolved)
  const sessionId = crypto.randomUUID();
  const playerCombatant = createCharacterCombatant(
    character.id,
    character.name,
    0,
    charStats,
    character.level,
    character.health,
    character.maxHealth,
    10 + getModifier(charStats.dex),
    playerWeapon,
    {},
    getProficiencyBonus(character.level),
  );

  const monsterCombatant = createMonsterCombatant(
    `monster-${monster.id}`,
    monster.name,
    1,
    parseStats(monster.stats),
    monster.level,
    monsterStats.hp ?? 50,
    monsterStats.ac ?? 12,
    buildMonsterWeapon(monsterStats),
    getProficiencyBonus(monster.level),
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
      // Win: award XP and gold
      xpAwarded = ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level;
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
      characterStartHp: character.health,
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
