/**
 * Live Pipeline Integration Test
 *
 * Compares the live combat pipeline (real DB items, real equipment calculations)
 * against the sim's synthetic players (hardcoded tier tables).
 *
 * Creates temporary test data in the production DB, runs comparisons, cleans up.
 *
 * Usage:
 *   cd server && DATABASE_URL='...' REDIS_URL='...' npx tsx src/scripts/live-pipeline-test.ts
 */

import { db, pool } from '../lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import {
  characters,
  users,
  items,
  characterEquipment,
  itemTemplates,
  inventories,
  characterAbilities,
} from '@database/tables';
import { calculateItemStats, calculateEquipmentTotals } from '../services/item-stats';
import { applyClassWeaponStat } from '../lib/road-encounter';
import { buildSyntheticPlayer } from '../services/combat-simulator';
import type { MonsterStats, MonsterCombatData } from '../services/combat-simulator';
import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
  resolveTurn,
} from '../lib/combat-engine';
import { computeFinalAC } from '@shared/utils/armor-conversion';
import { CLASS_ARMOR_TYPE } from '@shared/data/combat-constants';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import type { WeaponInfo, CombatState, Combatant, CombatDamageType, MonsterAbilityInstance, MonsterAbility } from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import type { ItemRarity } from '@shared/enums';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CLASSES = ['warrior', 'rogue', 'ranger', 'mage', 'cleric', 'bard', 'psion'] as const;
const TEST_LEVELS = [5, 15, 30] as const;
const FIGHTS_PER_MATCHUP = 50;
const MAX_COMBAT_ROUNDS = 100;

/** Monsters to pit each level tier against */
const MONSTER_BY_LEVEL: Record<number, { name: string; level: number; stats: MonsterStats; combatData: MonsterCombatData }> = {
  5: {
    name: 'Skeleton Warrior',
    level: 5,
    stats: { hp: 15, ac: 11, attack: 3, damage: '1d6', str: 14, dex: 12, con: 12, int: 6, wis: 8, cha: 5 },
    combatData: {
      damageType: 'SLASHING',
      vulnerabilities: ['BLUDGEONING'],
      immunities: ['POISON'],
    },
  },
  15: {
    name: 'Mire Hulk',
    level: 15,
    stats: { hp: 44, ac: 16, attack: 4, damage: '1d8-2', str: 20, dex: 6, con: 20, int: 3, wis: 10, cha: 4 },
    combatData: {
      damageType: 'BLUDGEONING',
      immunities: ['LIGHTNING'],
      vulnerabilities: ['FIRE'],
      abilities: [
        { name: 'Multiattack', type: 'multi_attack', description: '2 attacks', attacks: 2, cooldown: 0 },
        { name: 'Engulf', type: 'engulf', description: 'Restrained', cooldown: 3, save: 'str', dc: 14, statusEffect: 'restrained', duration: 2 },
      ],
    },
  },
  30: {
    name: 'Storm Giant',
    level: 30,
    stats: { hp: 106, ac: 20, attack: 6, damage: '2d10-4', str: 29, dex: 14, con: 22, int: 16, wis: 18, cha: 20 },
    combatData: {
      damageType: 'BLUDGEONING',
      resistances: ['COLD', 'THUNDER'],
      immunities: ['LIGHTNING'],
      legendaryActions: 1,
      legendaryResistances: 1,
      abilities: [
        { name: 'Lightning Strike', type: 'ranged_attack', damage: '3d8', damageType: 'LIGHTNING', cooldown: 3, save: 'dex', dc: 18 },
        { name: 'Thunderous Blows', type: 'multi_attack', attacks: 2, cooldown: 0 },
        { name: 'Rock Throw', type: 'ranged_attack', damage: '2d10', damageType: 'BLUDGEONING', cooldown: 2 },
      ],
      phaseTransitions: [{ hpPercent: 40, name: 'Storm Rage', effects: [{ type: 'stat_boost', stat: 'str', amount: 4 }] }],
    },
  },
};

// ---------------------------------------------------------------------------
// Weapon & Armor Mapping (per class × tier)
// ---------------------------------------------------------------------------

type TierIndex = 0 | 1 | 2;

/** Weapon template names by class × tier index */
const WEAPON_NAMES: Record<string, string[]> = {
  warrior: ['Copper Sword', 'Iron Sword', 'Steel Sword'],
  rogue: ['Copper Dagger', 'Iron Dagger', 'Steel Dagger'],
  ranger: ['Shortbow', 'Longbow', 'Composite Bow'],
  mage: ['Ashwood Staff', 'Ironwood Staff', 'Ebonwood Staff'],
  cleric: ['Wooden Holy Symbol', 'Iron Holy Symbol', 'Silver Holy Symbol'],
  bard: ["Traveler's Lute", 'Fine Lute', "Master's Lute"],
  psion: ['Quartz Orb', 'Amethyst Orb', 'Sapphire Orb'],
};

/** Template ID format */
function weaponTemplateId(name: string): string {
  return `weapon-${name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`;
}
function armorTemplateId(name: string): string {
  return `armor-${name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`;
}

type EquipSlot = 'HEAD' | 'CHEST' | 'HANDS' | 'LEGS' | 'FEET' | 'OFF_HAND';

interface ArmorPiece {
  slot: EquipSlot;
  name: string;
}

/**
 * Armor loadouts per class archetype × tier.
 * We list ALL pieces we WANT to equip. The script will check if the template exists.
 */
const HEAVY_ARMOR: ArmorPiece[][] = [
  // T1 (Copper)
  [
    { slot: 'HEAD', name: 'Copper Helm' },
    { slot: 'CHEST', name: 'Copper Chestplate' },
    { slot: 'HANDS', name: 'Copper Gauntlets' },
    { slot: 'LEGS', name: 'Copper Greaves' },
    { slot: 'FEET', name: 'Copper Boots' },
    { slot: 'OFF_HAND', name: 'Copper Shield' },
  ],
  // T2 (Iron)
  [
    { slot: 'HEAD', name: 'Iron Helm' },
    { slot: 'CHEST', name: 'Iron Chestplate' },
    { slot: 'HANDS', name: 'Iron Gauntlets' },
    { slot: 'LEGS', name: 'Iron Greaves' },
    { slot: 'FEET', name: 'Iron Boots' },
    { slot: 'OFF_HAND', name: 'Iron Shield' },
  ],
  // T3 (Steel)
  [
    { slot: 'HEAD', name: 'Steel Helm' },
    { slot: 'CHEST', name: 'Steel Chestplate' },
    { slot: 'HANDS', name: 'Steel Gauntlets' },
    { slot: 'LEGS', name: 'Steel Greaves' },
    { slot: 'FEET', name: 'Steel Boots' },
    { slot: 'OFF_HAND', name: 'Steel Shield' },
  ],
];

const LEATHER_ARMOR: ArmorPiece[][] = [
  // T1
  [
    { slot: 'HANDS', name: 'Leather Gloves' },
    { slot: 'FEET', name: 'Leather Boots' },
  ],
  // T2
  [
    { slot: 'HEAD', name: 'Hard Leather Cap' },
    { slot: 'HANDS', name: 'Wolf Leather Gloves' },
    { slot: 'FEET', name: 'Wolf Leather Boots' },
  ],
  // T3
  [
    { slot: 'HANDS', name: 'Bear Hide Vambraces' },
    { slot: 'LEGS', name: 'Bear Leather Leggings' },
    { slot: 'FEET', name: 'Bear Leather Boots' },
  ],
];

const CLOTH_ARMOR: ArmorPiece[][] = [
  // T1 (Cloth)
  [
    { slot: 'HEAD', name: 'Cloth Hood' },
    { slot: 'CHEST', name: 'Cloth Robes' },
    { slot: 'HANDS', name: 'Cloth Gloves' },
    { slot: 'FEET', name: 'Cloth Boots' },
  ],
  // T2 (Woven Wool)
  [
    { slot: 'HEAD', name: 'Woven Wool Hood' },
    { slot: 'CHEST', name: 'Woven Wool Robes' },
    { slot: 'HANDS', name: 'Woven Wool Gloves' },
    { slot: 'FEET', name: 'Woven Wool Boots' },
  ],
  // T3 — Silk requires L40, so L30 chars fall back to T2 (Woven Wool).
  // We still list Woven Wool here as the best available for L30.
  [
    { slot: 'HEAD', name: 'Woven Wool Hood' },
    { slot: 'CHEST', name: 'Woven Wool Robes' },
    { slot: 'HANDS', name: 'Woven Wool Gloves' },
    { slot: 'FEET', name: 'Woven Wool Boots' },
  ],
];

const MEDIUM_ARMOR: ArmorPiece[][] = [
  // T1 — Rangers use leather at T1
  [
    { slot: 'HANDS', name: 'Leather Gloves' },
    { slot: 'FEET', name: 'Leather Boots' },
  ],
  // T2
  [
    { slot: 'HEAD', name: 'Hard Leather Cap' },
    { slot: 'HANDS', name: 'Wolf Leather Gloves' },
    { slot: 'FEET', name: 'Wolf Leather Boots' },
  ],
  // T3
  [
    { slot: 'HANDS', name: 'Bear Hide Vambraces' },
    { slot: 'LEGS', name: 'Bear Leather Leggings' },
    { slot: 'FEET', name: 'Bear Leather Boots' },
  ],
];

function getArmorLoadout(className: string): ArmorPiece[][] {
  switch (className) {
    case 'warrior':
    case 'cleric':
      return HEAVY_ARMOR;
    case 'rogue':
      return LEATHER_ARMOR;
    case 'ranger':
      return MEDIUM_ARMOR;
    case 'mage':
    case 'psion':
    case 'bard':
      return CLOTH_ARMOR;
    default:
      return CLOTH_ARMOR;
  }
}

/** Level → tier index (mirrors getTierIndex from sim) */
function getTierIndex(level: number): TierIndex {
  if (level < 10) return 0;
  if (level < 30) return 1;
  return 2;
}

/** Quality per tier (mirrors TIER_QUALITY from sim) */
function getQuality(tier: TierIndex): ItemRarity {
  if (tier <= 1) return 'COMMON' as ItemRarity;
  return 'FINE' as ItemRarity;
}

// ---------------------------------------------------------------------------
// Stat computation (replicates sim's computeStatsForLevel)
// ---------------------------------------------------------------------------

import { getRace } from '@shared/data/races';
import { STAT_HARD_CAP } from '@shared/utils/bounded-accuracy';

type StatBlock = { str: number; dex: number; con: number; int: number; wis: number; cha: number };

const STAT_POINT_LEVELS = [4, 7, 9, 12, 16, 19, 22, 24, 27, 29, 33, 36, 39, 44, 47, 50];

const CLASS_STAT_PRIORITY: Record<string, (keyof StatBlock)[]> = {
  warrior: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  mage:    ['int', 'wis', 'con', 'dex', 'cha', 'str'],
  rogue:   ['dex', 'cha', 'con', 'int', 'str', 'wis'],
  cleric:  ['wis', 'con', 'str', 'cha', 'dex', 'int'],
  ranger:  ['dex', 'str', 'con', 'wis', 'cha', 'int'],
  bard:    ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  psion:   ['int', 'wis', 'con', 'dex', 'cha', 'str'],
};

const CLASS_CREATION_HP_BONUS: Record<string, number> = {
  warrior: 10, cleric: 8, ranger: 8, rogue: 6, bard: 6, mage: 4, psion: 4,
};

const CLASS_HP_PER_LEVEL: Record<string, number> = {
  warrior: 4, ranger: 4, cleric: 3, rogue: 3, bard: 3, mage: 2, psion: 2,
};

function computeStatsForLevel(className: string, raceId: string, level: number): StatBlock {
  const race = getRace(raceId);
  const base: StatBlock = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  if (race) {
    base.str += race.statModifiers.str;
    base.dex += race.statModifiers.dex;
    base.con += race.statModifiers.con;
    base.int += race.statModifiers.int;
    base.wis += race.statModifiers.wis;
    base.cha += race.statModifiers.cha;
  }
  const earnedPoints = STAT_POINT_LEVELS.filter(l => l <= level).length;
  const priority = CLASS_STAT_PRIORITY[className] ?? ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  let remaining = earnedPoints;
  for (const stat of priority) {
    if (remaining <= 0) break;
    const room = STAT_HARD_CAP - base[stat];
    const toAdd = Math.min(remaining, Math.max(0, room));
    base[stat] += toAdd;
    remaining -= toAdd;
  }
  return base;
}

function computeHP(className: string, level: number, conMod: number): number {
  const creationBonus = CLASS_CREATION_HP_BONUS[className] ?? 6;
  const hpPerLevel = CLASS_HP_PER_LEVEL[className] ?? 3;
  const base = 10 + conMod + creationBonus;
  const levelHp = (level - 1) * hpPerLevel;
  return Math.max(1, base + levelHp);
}

// ---------------------------------------------------------------------------
// Result Containers
// ---------------------------------------------------------------------------

interface StatComparison {
  className: string;
  level: number;
  stat: string;
  live: string;
  sim: string;
  match: boolean;
  notes: string;
}

interface ArmorSlotInfo {
  className: string;
  level: number;
  slot: string;
  templateName: string;
  rawArmor: number;
  notes: string;
}

interface CombatResult {
  className: string;
  level: number;
  monsterName: string;
  liveWinPct: number;
  simWinPct: number;
  delta: number;
  flagged: boolean;
  liveAvgRounds: number;
  simAvgRounds: number;
}

const statComparisons: StatComparison[] = [];
const armorSlots: ArmorSlotInfo[] = [];
const combatResults: CombatResult[] = [];
const warnings: string[] = [];

// ---------------------------------------------------------------------------
// Helper: Get equipped weapon (replicates road-encounter.ts getEquippedWeapon)
// ---------------------------------------------------------------------------

async function getEquippedWeapon(characterId: string): Promise<WeaponInfo> {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'MAIN_HAND')),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'WEAPON') {
    return {
      id: 'unarmed', name: 'Unarmed', diceCount: 1, diceSides: 4,
      bonusDamage: 0, bonusAttack: 0,
      damageModifierStat: 'str', attackModifierStat: 'str',
    };
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
// Helper: Format weapon for display
// ---------------------------------------------------------------------------

function formatWeapon(w: WeaponInfo): string {
  const bonus = w.bonusDamage > 0 ? `+${w.bonusDamage}` : w.bonusDamage < 0 ? `${w.bonusDamage}` : '';
  return `${w.diceCount}d${w.diceSides}${bonus} (atk+${w.bonusAttack})`;
}

// ---------------------------------------------------------------------------
// Helper: Run a single fight
// ---------------------------------------------------------------------------

function runFight(playerCombatant: Combatant, monsterCombatant: Combatant): { won: boolean; rounds: number } {
  // Deep-clone combatants so each fight starts fresh
  const p = JSON.parse(JSON.stringify(playerCombatant));
  const m = JSON.parse(JSON.stringify(monsterCombatant));

  let state = createCombatState('test-' + crypto.randomUUID(), 'PVE', [p, m]);
  let iterations = 0;
  const maxIterations = MAX_COMBAT_ROUNDS * 2; // 2 combatants

  while (state.status === 'ACTIVE' && iterations < maxIterations) {
    const currentActorId = state.turnOrder[state.turnIndex];
    const currentActor = state.combatants.find(c => c.id === currentActorId);

    if (!currentActor || !currentActor.isAlive) {
      state = resolveTurn(state, { type: 'defend', actorId: currentActorId }, {});
      iterations++;
      continue;
    }

    const enemies = state.combatants.filter(c => c.team !== currentActor.team && c.isAlive);
    if (enemies.length === 0) break;

    const target = enemies[0];
    const weapon = currentActor.weapon ?? undefined;

    state = resolveTurn(
      state,
      { type: 'attack', actorId: currentActorId, targetId: target.id },
      { weapon },
    );
    iterations++;
  }

  const playerAlive = state.combatants[0]?.isAlive ?? false;
  return { won: playerAlive, rounds: state.round };
}

// ---------------------------------------------------------------------------
// Helper: Build monster combatant from our seed data
// ---------------------------------------------------------------------------

function buildMonsterCombatantFromSeed(
  monsterDef: { name: string; level: number; stats: MonsterStats; combatData: MonsterCombatData },
): Combatant {
  const parsed = parseDamage(monsterDef.stats.damage);
  const monsterWeapon: WeaponInfo = {
    id: 'monster-attack',
    name: 'Natural Attack',
    diceCount: parsed.diceCount,
    diceSides: parsed.diceSides,
    bonusDamage: parsed.bonus,
    bonusAttack: monsterDef.stats.attack,
    damageModifierStat: 'str',
    attackModifierStat: 'str',
    damageType: monsterDef.combatData.damageType,
  };

  const mStats = {
    str: monsterDef.stats.str,
    dex: monsterDef.stats.dex,
    con: monsterDef.stats.con,
    int: monsterDef.stats.int,
    wis: monsterDef.stats.wis,
    cha: monsterDef.stats.cha,
  };

  const abilities: MonsterAbilityInstance[] = (monsterDef.combatData.abilities ?? []).map((a: any) => ({
    def: a as MonsterAbility,
    cooldownRemaining: 0,
    usesRemaining: a.usesPerCombat ?? null,
    isRecharged: false,
  }));

  const options: {
    resistances?: CombatDamageType[];
    immunities?: CombatDamageType[];
    vulnerabilities?: CombatDamageType[];
    monsterAbilities?: MonsterAbilityInstance[];
    legendaryActions?: number;
    legendaryResistances?: number;
  } = {};

  if ((monsterDef.combatData.resistances ?? []).length > 0)
    options.resistances = monsterDef.combatData.resistances as CombatDamageType[];
  if ((monsterDef.combatData.immunities ?? []).length > 0)
    options.immunities = monsterDef.combatData.immunities as CombatDamageType[];
  if ((monsterDef.combatData.vulnerabilities ?? []).length > 0)
    options.vulnerabilities = monsterDef.combatData.vulnerabilities as CombatDamageType[];
  if (abilities.length > 0)
    options.monsterAbilities = abilities;
  if (monsterDef.combatData.legendaryActions)
    options.legendaryActions = monsterDef.combatData.legendaryActions;
  if (monsterDef.combatData.legendaryResistances)
    options.legendaryResistances = monsterDef.combatData.legendaryResistances;

  return createMonsterCombatant(
    'monster-test',
    monsterDef.name,
    1,
    mStats,
    monsterDef.level,
    monsterDef.stats.hp,
    monsterDef.stats.ac,
    monsterWeapon,
    0, // monster prof = 0 (attack stat includes it)
    Object.keys(options).length > 0 ? options : undefined,
  );
}

function parseDamage(damage: string): { diceCount: number; diceSides: number; bonus: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonus: 0 };
  return {
    diceCount: parseInt(match[1]),
    diceSides: parseInt(match[2]),
    bonus: match[3] ? parseInt(match[3]) : 0,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const testUserId = crypto.randomUUID();
  const testCharacterIds: string[] = [];

  console.log('=== Live Pipeline Integration Test ===');
  console.log(`Test matrix: ${CLASSES.length} classes x ${TEST_LEVELS.length} levels = ${CLASSES.length * TEST_LEVELS.length} characters`);
  console.log(`Fights per matchup: ${FIGHTS_PER_MATCHUP}`);
  console.log();

  try {
    // -----------------------------------------------------------------------
    // 1. Create test user
    // -----------------------------------------------------------------------
    console.log('[1/8] Creating test user...');
    await db.insert(users).values({
      id: testUserId,
      username: '[TEST] Pipeline Bot',
      email: 'test-pipeline@test.local',
      passwordHash: 'nologin',
      role: 'player',
      isTestAccount: true,
      updatedAt: new Date().toISOString(),
    });
    console.log(`  Created user: ${testUserId}`);

    // -----------------------------------------------------------------------
    // 2. Create characters (7 classes × 3 levels = 21)
    // -----------------------------------------------------------------------
    console.log('[2/8] Creating test characters...');

    // We need a valid town ID for currentTownId. Grab the first town.
    const anyTown = await db.query.towns.findFirst({ columns: { id: true } });
    const townId = anyTown?.id ?? null;
    if (!townId) {
      console.warn('  WARNING: No towns in DB. Setting currentTownId to null (may fail FK constraint).');
    }

    for (const className of CLASSES) {
      for (const level of TEST_LEVELS) {
        const charId = crypto.randomUUID();
        testCharacterIds.push(charId);

        const stats = computeStatsForLevel(className, 'human', level);
        const conMod = Math.floor((stats.con - 10) / 2);
        const hp = computeHP(className, level, conMod);

        await db.insert(characters).values({
          id: charId,
          userId: testUserId,
          name: `[TEST] L${level} ${className.charAt(0).toUpperCase() + className.slice(1)}`,
          race: 'HUMAN',
          class: className,
          level,
          health: hp,
          maxHealth: hp,
          gold: 0,
          xp: 0,
          stats: { str: stats.str, dex: stats.dex, con: stats.con, int: stats.int, wis: stats.wis, cha: stats.cha },
          currentTownId: townId,
          homeTownId: townId,
          updatedAt: new Date().toISOString(),
        });
        console.log(`  Created: L${level} ${className} (HP=${hp}, STR=${stats.str} DEX=${stats.dex} CON=${stats.con} INT=${stats.int} WIS=${stats.wis} CHA=${stats.cha})`);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Create & equip items from real templates
    // -----------------------------------------------------------------------
    console.log('[3/8] Creating and equipping items from real templates...');

    // Cache all templates we need by querying the DB once for each
    const templateCache = new Map<string, { id: string; name: string; type: string; stats: unknown; levelRequired: number }>();

    async function ensureTemplate(templateId: string): Promise<boolean> {
      if (templateCache.has(templateId)) return true;
      const tmpl = await db.query.itemTemplates.findFirst({
        where: eq(itemTemplates.id, templateId),
        columns: { id: true, name: true, type: true, stats: true, levelRequired: true },
      });
      if (tmpl) {
        templateCache.set(templateId, tmpl);
        return true;
      }
      return false;
    }

    async function createAndEquipItem(
      characterId: string,
      templateId: string,
      slot: string,
      quality: ItemRarity,
    ): Promise<boolean> {
      const exists = await ensureTemplate(templateId);
      if (!exists) {
        const msg = `Template not found: ${templateId} — skipping slot ${slot}`;
        console.warn(`  WARNING: ${msg}`);
        warnings.push(msg);
        return false;
      }

      const itemId = crypto.randomUUID();
      await db.insert(items).values({
        id: itemId,
        templateId,
        ownerId: characterId,
        quality,
        enchantments: [],
        currentDurability: 100,
        updatedAt: new Date().toISOString(),
      });

      // Also add to inventory so FK chains work
      await db.insert(inventories).values({
        id: crypto.randomUUID(),
        characterId,
        itemId,
        quantity: 1,
        updatedAt: new Date().toISOString(),
      });

      await db.insert(characterEquipment).values({
        id: crypto.randomUUID(),
        characterId,
        slot: slot as any,
        itemId,
        updatedAt: new Date().toISOString(),
      });

      return true;
    }

    let charIndex = 0;
    for (const className of CLASSES) {
      for (const level of TEST_LEVELS) {
        const charId = testCharacterIds[charIndex++];
        const tier = getTierIndex(level);
        const quality = getQuality(tier);

        // Equip weapon
        const weaponName = WEAPON_NAMES[className][tier];
        const wTemplateId = weaponTemplateId(weaponName);
        const weaponEquipped = await createAndEquipItem(charId, wTemplateId, 'MAIN_HAND', quality);
        if (weaponEquipped) {
          console.log(`  ${className} L${level}: weapon = ${weaponName} (${quality})`);
        }

        // Equip armor
        const armorLoadout = getArmorLoadout(className);
        const armorPieces = armorLoadout[tier] ?? [];
        for (const piece of armorPieces) {
          const aTemplateId = armorTemplateId(piece.name);
          const equipped = await createAndEquipItem(charId, aTemplateId, piece.slot, quality);
          if (equipped) {
            const tmpl = templateCache.get(aTemplateId);
            const tmplStats = tmpl?.stats as Record<string, unknown> ?? {};
            const armorVal = typeof tmplStats.armor === 'number' ? tmplStats.armor : 0;
            const mrVal = typeof tmplStats.magicResist === 'number' ? tmplStats.magicResist : 0;
            const notes = armorVal === 0 && mrVal > 0 ? `NO ARMOR STAT (magicResist: ${mrVal})` : '';
            armorSlots.push({
              className,
              level,
              slot: piece.slot,
              templateName: piece.name,
              rawArmor: armorVal,
              notes,
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. Extract live stats and compare to sim stats
    // -----------------------------------------------------------------------
    console.log('[4/8] Extracting and comparing stats...');

    charIndex = 0;
    for (const className of CLASSES) {
      for (const level of TEST_LEVELS) {
        const charId = testCharacterIds[charIndex++];

        // --- Live pipeline stats ---
        const rawWeapon = await getEquippedWeapon(charId);
        const liveWeapon = applyClassWeaponStat(rawWeapon, className);
        const equipTotals = await calculateEquipmentTotals(charId);

        const charStats = computeStatsForLevel(className, 'human', level);
        const dexMod = getModifier(charStats.dex);
        const conMod = getModifier(charStats.con);
        const armorType = CLASS_ARMOR_TYPE[className] ?? 'none';
        const liveAC = computeFinalAC(equipTotals.totalAC, dexMod, armorType);
        const liveHP = computeHP(className, level, conMod);

        // --- Sim stats ---
        const simResult = buildSyntheticPlayer({ race: 'human', class: className, level });
        if (!simResult) {
          warnings.push(`buildSyntheticPlayer returned null for ${className} L${level}`);
          continue;
        }

        // HP comparison
        statComparisons.push({
          className, level, stat: 'HP',
          live: String(liveHP), sim: String(simResult.hp),
          match: liveHP === simResult.hp,
          notes: liveHP !== simResult.hp ? `delta=${liveHP - simResult.hp}` : '',
        });

        // AC comparison
        statComparisons.push({
          className, level, stat: 'AC',
          live: String(liveAC), sim: String(simResult.equipmentAC),
          match: liveAC === simResult.equipmentAC,
          notes: liveAC !== simResult.equipmentAC
            ? `rawArmor: live=${equipTotals.totalAC} sim=? delta=${liveAC - simResult.equipmentAC}`
            : '',
        });

        // Weapon comparison
        const liveWeaponStr = formatWeapon(liveWeapon);
        const simWeaponStr = formatWeapon(simResult.weapon);
        statComparisons.push({
          className, level, stat: 'Weapon',
          live: liveWeaponStr, sim: simWeaponStr,
          match: liveWeaponStr === simWeaponStr,
          notes: liveWeaponStr !== simWeaponStr ? 'MISMATCH' : '',
        });

        // Weapon modStat comparison
        statComparisons.push({
          className, level, stat: 'WeaponStat',
          live: `atk=${liveWeapon.attackModifierStat} dmg=${liveWeapon.damageModifierStat}`,
          sim: `atk=${simResult.weapon.attackModifierStat} dmg=${simResult.weapon.damageModifierStat}`,
          match: liveWeapon.attackModifierStat === simResult.weapon.attackModifierStat &&
                 liveWeapon.damageModifierStat === simResult.weapon.damageModifierStat,
          notes: '',
        });

        // Raw armor total
        statComparisons.push({
          className, level, stat: 'RawArmor',
          live: String(equipTotals.totalAC), sim: '(hardcoded)',
          match: true, // informational
          notes: `${equipTotals.items.length} slots equipped`,
        });

        console.log(`  ${className} L${level}: HP live=${liveHP} sim=${simResult.hp} | AC live=${liveAC} sim=${simResult.equipmentAC} | Weapon live=${liveWeaponStr} sim=${simWeaponStr}`);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Run combat comparisons
    // -----------------------------------------------------------------------
    console.log('[5/8] Running combat comparisons...');

    charIndex = 0;
    for (const className of CLASSES) {
      for (const level of TEST_LEVELS) {
        const charId = testCharacterIds[charIndex++];
        const monsterDef = MONSTER_BY_LEVEL[level];

        // --- Build LIVE combatant (from DB equipment) ---
        const rawWeapon = await getEquippedWeapon(charId);
        const liveWeapon = applyClassWeaponStat(rawWeapon, className);
        const equipTotals = await calculateEquipmentTotals(charId);
        const charStats = computeStatsForLevel(className, 'human', level);
        const dexMod = getModifier(charStats.dex);
        const conMod = getModifier(charStats.con);
        const armorType = CLASS_ARMOR_TYPE[className] ?? 'none';
        const liveAC = computeFinalAC(equipTotals.totalAC, dexMod, armorType);
        const liveHP = computeHP(className, level, conMod);
        const profBonus = getProficiencyBonus(level);

        const liveCombatant = createCharacterCombatant(
          charId,
          `[LIVE] L${level} ${className}`,
          0,
          charStats,
          level,
          liveHP,
          liveHP,
          liveAC,
          liveWeapon,
          {},
          profBonus,
        );

        // --- Build SIM combatant ---
        const simResult = buildSyntheticPlayer({ race: 'human', class: className, level });
        if (!simResult) continue;

        const simCombatant = createCharacterCombatant(
          'sim-player',
          `[SIM] L${level} ${className}`,
          0,
          simResult.stats,
          simResult.level,
          simResult.hp,
          simResult.maxHp,
          simResult.equipmentAC,
          simResult.weapon,
          {},
          simResult.proficiencyBonus,
        );

        // --- Build monster combatant ---
        const monsterTemplate = buildMonsterCombatantFromSeed(monsterDef);

        // Run fights: LIVE vs Monster
        let liveWins = 0;
        let liveTotalRounds = 0;
        for (let i = 0; i < FIGHTS_PER_MATCHUP; i++) {
          const result = runFight(liveCombatant, monsterTemplate);
          if (result.won) liveWins++;
          liveTotalRounds += result.rounds;
        }

        // Run fights: SIM vs Monster
        let simWins = 0;
        let simTotalRounds = 0;
        for (let i = 0; i < FIGHTS_PER_MATCHUP; i++) {
          const result = runFight(simCombatant, monsterTemplate);
          if (result.won) simWins++;
          simTotalRounds += result.rounds;
        }

        const liveWinPct = (liveWins / FIGHTS_PER_MATCHUP) * 100;
        const simWinPct = (simWins / FIGHTS_PER_MATCHUP) * 100;
        const delta = liveWinPct - simWinPct;
        const flagged = Math.abs(delta) >= 15;

        combatResults.push({
          className,
          level,
          monsterName: monsterDef.name,
          liveWinPct,
          simWinPct,
          delta,
          flagged,
          liveAvgRounds: Math.round(liveTotalRounds / FIGHTS_PER_MATCHUP * 10) / 10,
          simAvgRounds: Math.round(simTotalRounds / FIGHTS_PER_MATCHUP * 10) / 10,
        });

        const flag = flagged ? ' *** FLAGGED ***' : '';
        console.log(`  ${className} L${level} vs ${monsterDef.name}: live=${liveWinPct.toFixed(0)}% sim=${simWinPct.toFixed(0)}% delta=${delta.toFixed(0)}%${flag}`);
      }
    }

    // -----------------------------------------------------------------------
    // 6. Generate report
    // -----------------------------------------------------------------------
    console.log('[6/8] Generating report...');

    const now = new Date().toISOString().slice(0, 10);
    let report = `# Live Pipeline Integration Test Results\n\n`;
    report += `**Date:** ${now}\n`;
    report += `**Test Matrix:** ${CLASSES.length} classes x ${TEST_LEVELS.length} levels = ${CLASSES.length * TEST_LEVELS.length} characters\n`;
    report += `**Fights per matchup:** ${FIGHTS_PER_MATCHUP}\n\n`;

    // Warnings section
    if (warnings.length > 0) {
      report += `## Warnings\n\n`;
      for (const w of warnings) {
        report += `- ${w}\n`;
      }
      report += `\n`;
    }

    // Stat Comparison table
    report += `## Stat Comparison\n\n`;
    report += `| Class | Level | Stat | Live | Sim | Match? | Notes |\n`;
    report += `|-------|-------|------|------|-----|--------|-------|\n`;
    for (const s of statComparisons) {
      report += `| ${s.className} | ${s.level} | ${s.stat} | ${s.live} | ${s.sim} | ${s.match ? 'YES' : '**NO**'} | ${s.notes} |\n`;
    }
    report += `\n`;

    // Armor Coverage table
    report += `## Armor Coverage Analysis\n\n`;
    report += `| Class | Level | Slot | Template | Raw Armor | Notes |\n`;
    report += `|-------|-------|------|----------|-----------|-------|\n`;
    for (const a of armorSlots) {
      report += `| ${a.className} | ${a.level} | ${a.slot} | ${a.templateName} | ${a.rawArmor} | ${a.notes} |\n`;
    }
    report += `\n`;

    // Combat Results table
    report += `## Combat Results\n\n`;
    report += `| Class | Level | Monster | Live Win% | Sim Win% | Delta | Avg Rounds (L/S) | Flag? |\n`;
    report += `|-------|-------|---------|-----------|----------|-------|-------------------|-------|\n`;
    for (const c of combatResults) {
      report += `| ${c.className} | ${c.level} | ${c.monsterName} | ${c.liveWinPct.toFixed(0)}% | ${c.simWinPct.toFixed(0)}% | ${c.delta > 0 ? '+' : ''}${c.delta.toFixed(0)}% | ${c.liveAvgRounds}/${c.simAvgRounds} | ${c.flagged ? '**YES**' : ''} |\n`;
    }
    report += `\n`;

    // Key Findings
    report += `## Key Findings\n\n`;

    // Summarize stat mismatches
    const mismatches = statComparisons.filter(s => !s.match && s.stat !== 'RawArmor');
    if (mismatches.length === 0) {
      report += `- All stats match between live and sim pipelines.\n`;
    } else {
      report += `### Stat Mismatches (${mismatches.length} found)\n\n`;
      for (const m of mismatches) {
        report += `- **${m.className} L${m.level} ${m.stat}**: live=${m.live} sim=${m.sim} ${m.notes}\n`;
      }
      report += `\n`;
    }

    // Summarize combat deltas
    const flaggedResults = combatResults.filter(c => c.flagged);
    if (flaggedResults.length === 0) {
      report += `- All combat win rates within 15% tolerance between live and sim.\n`;
    } else {
      report += `### Flagged Combat Deltas (>${FIGHTS_PER_MATCHUP >= 50 ? '15' : '20'}% gap)\n\n`;
      for (const f of flaggedResults) {
        report += `- **${f.className} L${f.level} vs ${f.monsterName}**: live=${f.liveWinPct.toFixed(0)}% sim=${f.simWinPct.toFixed(0)}% (delta=${f.delta > 0 ? '+' : ''}${f.delta.toFixed(0)}%)\n`;
      }
      report += `\n`;
    }

    // AC analysis summary
    const acMismatches = statComparisons.filter(s => s.stat === 'AC' && !s.match);
    if (acMismatches.length > 0) {
      report += `### AC Divergences\n\n`;
      report += `The sim uses hardcoded \`RAW_ARMOR_BY_CLASS_TIER\` values that may not match real DB templates:\n\n`;
      for (const m of acMismatches) {
        report += `- **${m.className} L${m.level}**: live AC=${m.live}, sim AC=${m.sim} (${m.notes})\n`;
      }
      report += `\nRoot causes: cloth armor has magicResist but no armor stat at T1, leather armor coverage is sparse, Silk T3 cloth requires L40.\n`;
    }

    // Write report
    const reportDir = path.join(process.cwd(), '..', 'audits');
    const reportPath = path.join(reportDir, 'live-pipeline-test.md');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`  Report written to: ${reportPath}`);

    // -----------------------------------------------------------------------
    // 7. Summary
    // -----------------------------------------------------------------------
    console.log('\n[7/8] Summary:');
    console.log(`  Stat comparisons: ${statComparisons.length} (${mismatches.length} mismatches)`);
    console.log(`  Armor slots logged: ${armorSlots.length}`);
    console.log(`  Combat matchups: ${combatResults.length} (${flaggedResults.length} flagged)`);
    console.log(`  Warnings: ${warnings.length}`);

  } finally {
    // -----------------------------------------------------------------------
    // 8. Cleanup (always runs, even on error)
    // -----------------------------------------------------------------------
    console.log('\n[8/8] Cleaning up test data...');

    try {
      if (testCharacterIds.length > 0) {
        // Delete equipment first (FK → items)
        const eqResult = await db.delete(characterEquipment)
          .where(inArray(characterEquipment.characterId, testCharacterIds));
        console.log(`  Deleted ${eqResult.rowCount ?? 0} equipment rows`);

        // Delete character abilities (FK → abilities)
        const abResult = await db.delete(characterAbilities)
          .where(inArray(characterAbilities.characterId, testCharacterIds));
        console.log(`  Deleted ${abResult.rowCount ?? 0} ability rows`);

        // Delete inventories (FK → items)
        const invResult = await db.delete(inventories)
          .where(inArray(inventories.characterId, testCharacterIds));
        console.log(`  Deleted ${invResult.rowCount ?? 0} inventory rows`);

        // Delete items owned by test characters
        const itemResult = await db.delete(items)
          .where(inArray(items.ownerId, testCharacterIds));
        console.log(`  Deleted ${itemResult.rowCount ?? 0} item rows`);

        // Delete characters
        const charResult = await db.delete(characters)
          .where(inArray(characters.id, testCharacterIds));
        console.log(`  Deleted ${charResult.rowCount ?? 0} character rows`);
      }

      // Delete test user
      const userResult = await db.delete(users)
        .where(eq(users.id, testUserId));
      console.log(`  Deleted ${userResult.rowCount ?? 0} user rows`);

      console.log('  Cleanup complete.');
    } catch (cleanupErr) {
      console.error('  Cleanup error (test data may be orphaned):', cleanupErr);
      console.error(`  Manual cleanup: DELETE FROM users WHERE id = '${testUserId}';`);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main()
  .then(() => {
    console.log('\nDone.');
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Fatal error:', err);
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(1);
  });
