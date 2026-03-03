/**
 * Combat Simulator — Synthetic combatant builder for batch balance testing.
 *
 * Pure functions, no DB calls. Uses race data from shared/ and hardcoded
 * class stat arrays + equipment tiers to generate realistic combatants.
 */

import { RaceRegistry, getRace } from '@shared/data/races';
import { VALID_CLASSES, ABILITIES_BY_CLASS } from '@shared/data/skills';
import type { AbilityDefinition } from '@shared/data/skills';
import type { WeaponInfo } from '@shared/types/combat';
import type { CombatPresets, AbilityQueueEntry } from '../services/combat-presets';
import { createRacialCombatTracker, type RacialCombatTracker } from '../services/racial-combat-abilities';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyntheticPlayerConfig {
  race: string;       // e.g. "orc", "human", "elf"
  class: string;      // e.g. "warrior", "mage", "rogue"
  level: number;
  subRace?: string;
}

export interface SyntheticPlayerResult {
  name: string;
  race: string;
  class: string;
  level: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  hp: number;
  maxHp: number;
  equipmentAC: number;
  weapon: WeaponInfo;
  spellSlots: Record<number, number>;
  proficiencyBonus: number;
}

export interface MonsterStats {
  hp: number;
  ac: number;
  attack: number;
  damage: string;
  speed: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface MonsterCombatData {
  damageType?: string;
  abilities?: any[];
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  conditionImmunities?: string[];
  critImmunity?: boolean;
  critResistance?: number;
  legendaryActions?: number;
  legendaryResistances?: number;
  phaseTransitions?: any[];
}

export interface SyntheticMonsterResult {
  name: string;
  level: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  hp: number;
  ac: number;
  weapon: WeaponInfo;
  combatData?: MonsterCombatData;
}

// ---------------------------------------------------------------------------
// Constants — Class Archetypes
// ---------------------------------------------------------------------------

type StatBlock = { str: number; dex: number; con: number; int: number; wis: number; cha: number };

/** Base stat arrays by class (before racial mods). Primary/secondary emphasized. */
const CLASS_BASE_STATS: Record<string, StatBlock> = {
  warrior: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  mage:    { str: 8,  dex: 10, con: 12, int: 16, wis: 14, cha: 10 },
  rogue:   { str: 10, dex: 16, con: 12, int: 10, wis: 10, cha: 14 },
  cleric:  { str: 12, dex: 10, con: 14, int: 8,  wis: 16, cha: 10 },
  ranger:  { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
  bard:    { str: 8,  dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
  psion:   { str: 8,  dex: 10, con: 12, int: 16, wis: 14, cha: 10 },
};

/** Primary stat for each class (gets +1 every 4 levels) */
const CLASS_PRIMARY_STAT: Record<string, keyof StatBlock> = {
  warrior: 'str', mage: 'int', rogue: 'dex', cleric: 'wis',
  ranger: 'dex', bard: 'cha', psion: 'int',
};

/** Hit die per class */
const CLASS_HIT_DIE: Record<string, number> = {
  warrior: 10, mage: 6, rogue: 8, cleric: 8, ranger: 8, bard: 8, psion: 6,
};

/** Weapon modifier stat per class — casters use their primary casting stat */
const CLASS_WEAPON_STAT: Record<string, 'str' | 'dex' | 'int' | 'wis' | 'cha'> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
};

/** Weapon type per class */
const CLASS_WEAPON_TYPE: Record<string, 'melee' | 'ranged' | 'staff'> = {
  warrior: 'melee', cleric: 'melee', rogue: 'melee',
  ranger: 'ranged', bard: 'melee', mage: 'staff', psion: 'staff',
};

/** Default damage type per weapon type — used when weapon has no explicit damageType */
const WEAPON_TYPE_DAMAGE: Record<string, string> = {
  melee: 'SLASHING',
  ranged: 'PIERCING',
  staff: 'BLUDGEONING',
};

/** Class-specific damage type overrides (rogue uses piercing weapons, cleric uses bludgeoning) */
const CLASS_DAMAGE_TYPE_OVERRIDE: Record<string, string> = {
  rogue: 'PIERCING',
  cleric: 'BLUDGEONING',
};

// ---------------------------------------------------------------------------
// Equipment Tiers (index 0-4 for level ranges 1-4, 5-9, 10-14, 15-19, 20+)
// ---------------------------------------------------------------------------

interface WeaponTier {
  name: string;
  diceCount: number;
  diceSides: number;
  bonusDamage: number;
  bonusAttack: number;
}

const WEAPON_TIERS: Record<string, WeaponTier[]> = {
  melee: [
    { name: 'Copper Sword',           diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Iron Longsword',         diceCount: 1, diceSides: 8,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Steel Longsword',        diceCount: 1, diceSides: 8,  bonusDamage: 3, bonusAttack: 2 },
    { name: 'Mithril Sword',          diceCount: 1, diceSides: 10, bonusDamage: 4, bonusAttack: 3 },
    { name: 'Adamantine Greatsword',  diceCount: 1, diceSides: 12, bonusDamage: 5, bonusAttack: 4 },
  ],
  ranged: [
    { name: 'Short Bow',              diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Longbow',                diceCount: 1, diceSides: 8,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Steel Longbow',          diceCount: 1, diceSides: 8,  bonusDamage: 3, bonusAttack: 2 },
    { name: 'Mithril Longbow',        diceCount: 1, diceSides: 10, bonusDamage: 4, bonusAttack: 3 },
    { name: 'Adamantine Longbow',     diceCount: 1, diceSides: 12, bonusDamage: 5, bonusAttack: 4 },
  ],
  staff: [
    { name: 'Wooden Staff',           diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Iron Staff',             diceCount: 1, diceSides: 6,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Steel Staff',            diceCount: 1, diceSides: 6,  bonusDamage: 2, bonusAttack: 2 },
    { name: 'Mithril Staff',          diceCount: 1, diceSides: 8,  bonusDamage: 3, bonusAttack: 3 },
    { name: 'Adamantine Staff',       diceCount: 1, diceSides: 8,  bonusDamage: 4, bonusAttack: 4 },
  ],
};

/**
 * Base armor AC per class per tier (before DEX mod for applicable armor types).
 * Heavy armor: flat AC, no DEX bonus.
 * Medium armor: base + min(DEX mod, 2).
 * Light armor: base + DEX mod.
 * None: 10 + DEX mod.
 */
const ARMOR_TIERS: Record<string, { type: 'heavy' | 'medium' | 'light' | 'none'; ac: number[] }> = {
  warrior: { type: 'heavy',  ac: [14, 17, 19, 21, 23] },
  cleric:  { type: 'medium', ac: [13, 15, 17, 18, 20] },
  ranger:  { type: 'medium', ac: [12, 14, 16, 17, 19] },
  rogue:   { type: 'light',  ac: [11, 13, 14, 16, 17] },
  bard:    { type: 'light',  ac: [11, 13, 14, 16, 17] },
  mage:    { type: 'none',   ac: [10, 10, 10, 10, 10] },
  psion:   { type: 'none',   ac: [10, 10, 10, 10, 10] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getTierIndex(level: number): number {
  if (level <= 4) return 0;
  if (level <= 9) return 1;
  if (level <= 14) return 2;
  if (level <= 19) return 3;
  return 4;
}

function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

function computeEquipmentAC(className: string, level: number, dexMod: number): number {
  const armor = ARMOR_TIERS[className] || ARMOR_TIERS.warrior;
  const tier = getTierIndex(level);
  const baseAC = armor.ac[tier];

  switch (armor.type) {
    case 'heavy':  return baseAC;
    case 'medium': return baseAC + Math.min(dexMod, 2);
    case 'light':  return baseAC + dexMod;
    case 'none':   return baseAC + dexMod;
  }
}

function computeHP(className: string, level: number, conMod: number): number {
  const hitDie = CLASS_HIT_DIE[className] || 8;
  const hitDieAvg = hitDie / 2 + 0.5; // 10→5.5, 8→4.5, 6→3.5
  // Max HP at level 1, then average + CON mod per level
  return Math.max(1, hitDie + conMod + (level - 1) * Math.floor(hitDieAvg + conMod));
}

function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonusDamage: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonusDamage: 0 };
  return {
    diceCount: parseInt(match[1]),
    diceSides: parseInt(match[2]),
    bonusDamage: match[3] ? parseInt(match[3]) : 0,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All valid race IDs from the RaceRegistry. */
export function getAllRaceIds(): string[] {
  return Object.keys(RaceRegistry);
}

/** All valid class names. */
export function getAllClassNames(): string[] {
  return [...VALID_CLASSES];
}

/**
 * Build a synthetic player combatant from race/class/level.
 * Returns all parameters needed for createCharacterCombatant().
 */
export function buildSyntheticPlayer(config: SyntheticPlayerConfig): SyntheticPlayerResult | null {
  const className = config.class.toLowerCase();
  const raceId = config.race.toLowerCase();

  // Validate class
  if (!CLASS_BASE_STATS[className]) return null;

  // Get race data
  const race = getRace(raceId);
  if (!race) return null;

  // 1. Base stats from class archetype
  const stats = { ...CLASS_BASE_STATS[className] };

  // 2. Apply racial modifiers
  const mods = race.statModifiers;
  stats.str += mods.str;
  stats.dex += mods.dex;
  stats.con += mods.con;
  stats.int += mods.int;
  stats.wis += mods.wis;
  stats.cha += mods.cha;

  // 3. Level scaling: +1 to primary stat every 4 levels
  const primaryStat = CLASS_PRIMARY_STAT[className];
  const abilityBumps = Math.floor(config.level / 4);
  stats[primaryStat] += abilityBumps;

  // 4. Proficiency bonus
  const proficiencyBonus = getProficiencyBonus(config.level);

  // 5. HP
  const conMod = getModifier(stats.con);
  const hp = computeHP(className, config.level, conMod);

  // 6. Equipment AC
  const dexMod = getModifier(stats.dex);
  const equipmentAC = computeEquipmentAC(className, config.level, dexMod);

  // 7. Weapon
  const weaponType = CLASS_WEAPON_TYPE[className] || 'melee';
  const weaponStat = CLASS_WEAPON_STAT[className] || 'str';
  const tier = getTierIndex(config.level);
  const weaponTier = WEAPON_TIERS[weaponType][tier];

  const weapon: WeaponInfo = {
    id: 'sim-weapon',
    name: weaponTier.name,
    diceCount: weaponTier.diceCount,
    diceSides: weaponTier.diceSides,
    bonusDamage: weaponTier.bonusDamage,
    bonusAttack: weaponTier.bonusAttack,
    damageModifierStat: weaponStat,
    attackModifierStat: weaponStat,
    damageType: CLASS_DAMAGE_TYPE_OVERRIDE[className] ?? WEAPON_TYPE_DAMAGE[weaponType] ?? 'SLASHING',
  };

  return {
    name: `L${config.level} ${race.name} ${className.charAt(0).toUpperCase() + className.slice(1)}`,
    race: raceId,
    class: className,
    level: config.level,
    stats,
    hp,
    maxHp: hp,
    equipmentAC,
    weapon,
    spellSlots: {},
    proficiencyBonus,
  };
}

/**
 * Build a synthetic monster from raw stat data (from DB or seed data).
 * Returns all parameters needed for createMonsterCombatant().
 */
/** Default stance per class archetype.
 *  NOTE: AGGRESSIVE stance attackBonus is NOT applied in applyStanceToState() —
 *  only the AC penalty takes effect. Use BALANCED for accurate sim results. */
const CLASS_DEFAULT_STANCE: Record<string, 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE'> = {
  warrior: 'BALANCED', rogue: 'BALANCED', ranger: 'BALANCED',
  mage: 'BALANCED', psion: 'BALANCED', cleric: 'BALANCED', bard: 'BALANCED',
};

/**
 * Build a default ability queue from class abilities available at the given level.
 * Sorts by tier descending so highest-tier abilities are tried first.
 * Filters out passives (cooldown 0 + passive effect) since they don't need to be queued.
 */
function buildAbilityQueue(className: string, level: number): AbilityQueueEntry[] {
  const classAbilities = ABILITIES_BY_CLASS[className] ?? [];
  const available = classAbilities.filter(
    (a: AbilityDefinition) => a.levelRequired <= level && (a.effects as any)?.type !== 'passive',
  );
  // Sort by tier descending (strongest first), then by cooldown ascending (lower CD = more useful)
  available.sort((a: AbilityDefinition, b: AbilityDefinition) => b.tier - a.tier || a.cooldown - b.cooldown);

  return available.map((a: AbilityDefinition, i: number) => ({
    abilityId: a.id,
    abilityName: a.name,
    priority: i,
    useWhen: 'always' as const,
  }));
}

/**
 * Build default CombatPresets for a synthetic combatant.
 */
export function buildDefaultPresets(className: string, level: number): CombatPresets {
  return {
    stance: CLASS_DEFAULT_STANCE[className] ?? 'BALANCED',
    retreat: {
      hpThreshold: 0,
      oppositionRatio: 0,
      roundLimit: 0,
      neverRetreat: true,  // Sim combatants never flee
    },
    abilityQueue: buildAbilityQueue(className, level),
    itemUsageRules: [],
    pvpLootBehavior: 'TAKE_NOTHING',
  };
}

/**
 * Build full CombatantParams for use with resolveTickCombat().
 */
export function buildPlayerCombatParams(player: SyntheticPlayerResult): {
  id: string;
  presets: CombatPresets;
  weapon: WeaponInfo | null;
  racialTracker: RacialCombatTracker;
  race: string;
  level: number;
  subRace?: { id: string; element?: string } | null;
} {
  return {
    id: 'sim-player',
    presets: buildDefaultPresets(player.class, player.level),
    weapon: player.weapon,
    racialTracker: createRacialCombatTracker(),
    race: player.race,
    level: player.level,
    subRace: null,
  };
}

export function buildSyntheticMonster(
  name: string,
  level: number,
  monsterStats: MonsterStats,
  combatData?: MonsterCombatData,
): SyntheticMonsterResult {
  const parsed = parseDamageString(monsterStats.damage);

  return {
    name,
    level,
    stats: {
      str: monsterStats.str,
      dex: monsterStats.dex,
      con: monsterStats.con,
      int: monsterStats.int,
      wis: monsterStats.wis,
      cha: monsterStats.cha,
    },
    hp: monsterStats.hp,
    ac: monsterStats.ac,
    weapon: {
      id: 'monster-attack',
      name: 'Natural Attack',
      diceCount: parsed.diceCount,
      diceSides: parsed.diceSides,
      bonusDamage: parsed.bonusDamage,
      bonusAttack: monsterStats.attack,
      damageModifierStat: 'str',
      attackModifierStat: 'str',
      damageType: combatData?.damageType,
    },
    combatData,
  };
}
