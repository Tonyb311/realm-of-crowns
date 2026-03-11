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
import { getProficiencyBonus, STAT_HARD_CAP } from '@shared/utils/bounded-accuracy';
import { CLASS_SAVE_PROFICIENCIES, CLASS_MILESTONE_SAVE_ORDER, CLASS_ARMOR_TYPE, getAttacksPerAction } from '@shared/data/combat-constants';
import { computeFinalAC } from '@shared/utils/armor-conversion';
import { FEAT_UNLOCK_LEVELS } from '@shared/data/feats';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyntheticPlayerConfig {
  race: string;       // e.g. "orc", "human", "elf"
  class: string;      // e.g. "warrior", "mage", "rogue"
  level: number;
  subRace?: string;
}

export interface PartyMemberConfig extends SyntheticPlayerConfig {
  specialization?: string;
  tier0Selections?: Record<number, string>;
  featIds?: string[];  // Override default feat picks
}

export interface PartyConfig {
  name: string;
  members: PartyMemberConfig[];
  partyLevel?: number;  // Override all member levels
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
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  attackStat?: string;
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

/**
 * Stat allocation model for synthetic players.
 * Mirrors real player progression:
 * - Base: 10 in all stats + racial modifiers
 * - 1 stat point per level, but cost curve (1/2/3/4 per step) limits how high stats go
 * - Simplified as 16 milestone allocations (flat +1 each) to approximate a smart player
 * - Smart allocation: primary stat first, then secondary, then tertiary
 */
const STAT_POINT_LEVELS = [4, 7, 9, 12, 16, 19, 22, 24, 27, 29, 33, 36, 39, 44, 47, 50];

/** Which stats to prioritize per class, in order. First stat filled to cap, then second, etc. */
const CLASS_STAT_PRIORITY: Record<string, (keyof StatBlock)[]> = {
  warrior: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  mage:    ['int', 'wis', 'con', 'dex', 'cha', 'str'],
  rogue:   ['dex', 'cha', 'con', 'int', 'str', 'wis'],
  cleric:  ['wis', 'con', 'str', 'cha', 'dex', 'int'],
  ranger:  ['dex', 'str', 'con', 'wis', 'cha', 'int'],
  bard:    ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  psion:   ['int', 'wis', 'con', 'dex', 'cha', 'str'],
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

/** Class HP bonus at character creation (mirrors getClassHpBonus in characters.ts) */
const CLASS_CREATION_HP_BONUS: Record<string, number> = {
  warrior: 10, cleric: 8, ranger: 8, rogue: 6, bard: 6, mage: 4, psion: 4,
};

/** HP per level by class (mirrors getHpPerLevel in xp-curve.ts) */
const CLASS_HP_PER_LEVEL: Record<string, number> = {
  warrior: 4, ranger: 4, cleric: 3, rogue: 3, bard: 3, mage: 2, psion: 2,
};

/** Weapon modifier stat per class — casters use their primary casting stat */
const CLASS_WEAPON_STAT: Record<string, 'str' | 'dex' | 'int' | 'wis' | 'cha'> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
};

/** Weapon category per class — determines which WEAPON_TIERS row to use */
const CLASS_WEAPON_TYPE: Record<string, string> = {
  warrior: 'sword', cleric: 'holy_symbol', rogue: 'dagger',
  ranger: 'bow', bard: 'instrument', mage: 'staff', psion: 'orb',
};


// ---------------------------------------------------------------------------
// Equipment Tiers — derived from real recipe baseDamage / armor values
// ---------------------------------------------------------------------------
// Tier index: 0=T1(L1-9), 1=T2(L10-19), 2=T3(L20-29), 3=T4(L30+)
// Quality: T1=COMMON(1.0×), T2=COMMON(1.0×), T3=FINE(1.15×), T4=MASTERWORK(1.5×)
// ---------------------------------------------------------------------------

interface WeaponTier {
  name: string;
  diceCount: number;
  diceSides: number;
  bonusDamage: number;
  bonusAttack: number;
}

/** Quality multipliers applied at each tier index */
const TIER_QUALITY: number[] = [1.0, 1.0, 1.15, 1.5];
const TIER_QUALITY_LABEL: string[] = ['COMMON', 'COMMON', 'FINE', 'MASTERWORK'];

/**
 * Class-specific weapon tiers based on real recipe data.
 * Values are PRE-quality (quality multiplier applied in buildSyntheticPlayer).
 *
 * Warrior: swords (Iron Sword 12 → Steel Sword 20 → Mithril Sword 30)
 * Rogue: daggers (Iron Dagger 8 → Steel Dagger 14 → Mithril Dagger ~20)
 * Ranger: bows (Hunting Bow 8 → War Bow 16 → Composite Bow 22 → Mithril Composite 36)
 * Mage: staves (Ashwood 4 → Ironwood 6 → Ebonwood 8 → Starwood 10)
 * Cleric: holy symbols (Wooden 3 → Iron 5 → Silver 6 → Gold 7)
 * Bard: instruments (Traveler's Lute 4 → Fine Lute 6 → Master's Lute 8 → Enchanted Harp 10)
 * Psion: orbs (Quartz 3 → Amethyst 5 → Sapphire 6 → Arcane 7)
 */
const WEAPON_TIERS: Record<string, WeaponTier[]> = {
  // Warrior: 1H swords — baseDamage 6/12/20/30
  sword: [
    { name: 'Copper Sword',     diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Iron Sword',       diceCount: 1, diceSides: 8,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Steel Sword',      diceCount: 1, diceSides: 10, bonusDamage: 2, bonusAttack: 2 },
    { name: 'Mithril Sword',    diceCount: 1, diceSides: 12, bonusDamage: 3, bonusAttack: 3 },
  ],
  // Rogue: daggers — baseDamage 4/8/14/~20
  dagger: [
    { name: 'Copper Dagger',    diceCount: 1, diceSides: 4,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Iron Dagger',      diceCount: 1, diceSides: 6,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Steel Dagger',     diceCount: 1, diceSides: 8,  bonusDamage: 2, bonusAttack: 2 },
    { name: 'Mithril Dagger',   diceCount: 1, diceSides: 10, bonusDamage: 3, bonusAttack: 3 },
  ],
  // Ranger: bows — baseDamage 6/14/22/36
  bow: [
    { name: 'Shortbow',         diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Longbow',          diceCount: 1, diceSides: 8,  bonusDamage: 2, bonusAttack: 1 },
    { name: 'Composite Bow',    diceCount: 1, diceSides: 10, bonusDamage: 3, bonusAttack: 2 },
    { name: 'Mithril Composite Bow', diceCount: 1, diceSides: 12, bonusDamage: 4, bonusAttack: 3 },
  ],
  // Mage: staves — baseDamage 4/6/8/10 (2H, force) — synced from caster-weapons.ts recipes
  staff: [
    { name: 'Ashwood Staff',    diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Ironwood Staff',   diceCount: 1, diceSides: 8,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Ebonwood Staff',   diceCount: 1, diceSides: 8,  bonusDamage: 2, bonusAttack: 3 },
    { name: 'Starwood Staff',   diceCount: 1, diceSides: 10, bonusDamage: 3, bonusAttack: 4 },
  ],
  // Cleric: holy symbols — baseDamage 3/5/6/7 (1H, radiant) — synced from caster-weapons.ts recipes
  holy_symbol: [
    { name: 'Wooden Holy Symbol',  diceCount: 1, diceSides: 4, bonusDamage: 0, bonusAttack: 0 },
    { name: 'Iron Holy Symbol',    diceCount: 1, diceSides: 6, bonusDamage: 1, bonusAttack: 1 },
    { name: 'Silver Holy Symbol',  diceCount: 1, diceSides: 6, bonusDamage: 2, bonusAttack: 2 },
    { name: 'Gold Holy Symbol',    diceCount: 1, diceSides: 8, bonusDamage: 3, bonusAttack: 3 },
  ],
  // Bard: instruments — baseDamage 4/6/8/10 (2H, thunder) — synced from caster-weapons.ts recipes
  instrument: [
    { name: "Traveler's Lute",  diceCount: 1, diceSides: 6,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Fine Lute',        diceCount: 1, diceSides: 8,  bonusDamage: 1, bonusAttack: 1 },
    { name: "Master's Lute",    diceCount: 1, diceSides: 8,  bonusDamage: 2, bonusAttack: 3 },
    { name: 'Enchanted Harp',   diceCount: 1, diceSides: 10, bonusDamage: 3, bonusAttack: 4 },
  ],
  // Psion: orbs — baseDamage 3/5/6/7 (1H, psychic) — synced from caster-weapons.ts recipes
  orb: [
    { name: 'Quartz Orb',      diceCount: 1, diceSides: 4,  bonusDamage: 0, bonusAttack: 0 },
    { name: 'Amethyst Orb',    diceCount: 1, diceSides: 6,  bonusDamage: 1, bonusAttack: 1 },
    { name: 'Sapphire Orb',    diceCount: 1, diceSides: 6,  bonusDamage: 2, bonusAttack: 2 },
    { name: 'Arcane Orb',      diceCount: 1, diceSides: 8,  bonusDamage: 3, bonusAttack: 3 },
  ],
};

/** Damage type per weapon category */
const WEAPON_CATEGORY_DAMAGE: Record<string, string> = {
  sword: 'SLASHING',
  dagger: 'PIERCING',
  bow: 'PIERCING',
  staff: 'FORCE',
  holy_symbol: 'RADIANT',
  instrument: 'THUNDER',
  orb: 'PSYCHIC',
};

/**
 * Raw armor totals by class × tier — derived from actual recipe armor values
 * in shared/src/data/recipes/armor.ts. These feed into the shared
 * computeFinalAC() formula which converts raw armor to D&D-scale AC.
 *
 * Values represent the sum of all equipped armor slot raw values at each tier.
 * Quality multiplier is applied via TIER_QUALITY before conversion.
 */
const RAW_ARMOR_BY_CLASS_TIER: Record<string, number[]> = {
  warrior: [30, 60, 102, 156],   // Plate armor: T1→T4 (5 slots + shield)
  cleric:  [30, 60, 102, 156],   // Cleric wears plate too
  ranger:  [15, 18, 32, 50],     // Leather/medium armor (5 body slots) — synced from recipe sums
  rogue:   [15, 18, 32, 50],     // Leather armor (5 body slots) — synced from recipe sums
  bard:    [8, 17, 35, 57],      // Cloth armor (5 body slots, T2 no LEGS piece) — synced from recipe sums
  mage:    [8, 17, 35, 57],      // Cloth armor — synced from recipe sums
  psion:   [8, 17, 35, 57],      // Cloth armor — synced from recipe sums
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Get all save proficiencies for a class at a given level (base + milestones). */
export function getSimSaveProficiencies(className: string, level: number): string[] {
  const base = [...(CLASS_SAVE_PROFICIENCIES[className] ?? [])];
  const milestoneOrder = CLASS_MILESTONE_SAVE_ORDER[className];
  if (milestoneOrder) {
    if (level >= 18 && milestoneOrder[0]) base.push(milestoneOrder[0]);
    if (level >= 30 && milestoneOrder[1]) base.push(milestoneOrder[1]);
    if (level >= 45 && milestoneOrder[2]) base.push(milestoneOrder[2]);
  }
  return base;
}

/** Pick sim-appropriate feats for a character at a given level.
 *  Martial classes: Precise Strikes first, then Tough.
 *  Caster classes: Arcane Focus first, then Tough.
 *  Cleric (tanky/healer): Iron Will first, then Tough. */
export function getSimFeatIds(className: string, level: number): string[] {
  const feats: string[] = [];
  const martial = ['warrior', 'ranger', 'rogue'];
  const caster = ['mage', 'psion', 'bard'];

  if (level >= FEAT_UNLOCK_LEVELS[0]) {  // Level 38
    if (martial.includes(className)) {
      feats.push('feat-precise-strikes');
    } else if (caster.includes(className)) {
      feats.push('feat-arcane-focus');
    } else {
      feats.push('feat-iron-will'); // Cleric — tanky/healer default
    }
  }
  if (level >= FEAT_UNLOCK_LEVELS[1]) {  // Level 48
    feats.push('feat-tough');
  }
  return feats;
}

/**
 * Map character level to equipment tier, matching real game recipe levelToEquip values.
 * Copper (L1) → Iron (L10) → Steel (L30) → Mithril (L55) → Adamantine (L75, out of sim range)
 */
function getTierIndex(level: number): number {
  if (level < 10) return 0;  // T1: Copper/starter gear (levelToEquip: 1)
  if (level < 30) return 1;  // T2: Iron gear (levelToEquip: 10)
  if (level < 55) return 2;  // T3: Steel gear (levelToEquip: 30, FINE quality 1.15×)
  return 3;                  // T4: Mithril gear (levelToEquip: 55, MASTERWORK quality 1.5×)
}

function computeEquipmentAC(className: string, level: number, dexMod: number): number {
  const rawTiers = RAW_ARMOR_BY_CLASS_TIER[className] || RAW_ARMOR_BY_CLASS_TIER.warrior;
  const tier = getTierIndex(level);
  const rawArmor = rawTiers[tier];
  // Apply quality multiplier to raw armor before conversion
  const qualityMult = TIER_QUALITY[tier];
  const scaledRaw = Math.floor(rawArmor * qualityMult);
  const armorType = CLASS_ARMOR_TYPE[className] ?? 'none';
  return computeFinalAC(scaledRaw, dexMod, armorType);
}

/**
 * Compute HP matching the actual game formula:
 * Starting: 10 + conMod + classCreationBonus
 * Per level: class-varied (4 martial / 3 hybrid / 2 caster)
 */
function computeHP(className: string, level: number, conMod: number): number {
  const creationBonus = CLASS_CREATION_HP_BONUS[className] ?? 6;
  const hpPerLevel = CLASS_HP_PER_LEVEL[className] ?? 3;
  const base = 10 + conMod + creationBonus;
  const levelHp = (level - 1) * hpPerLevel;
  return Math.max(1, base + levelHp);
}

function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonusDamage: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
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
export function buildSyntheticPlayer(config: SyntheticPlayerConfig, featIdsOverride?: string[]): SyntheticPlayerResult | null {
  const className = config.class.toLowerCase();
  const raceId = config.race.toLowerCase();

  // Validate class
  if (!CLASS_STAT_PRIORITY[className]) return null;

  // Get race data
  const race = getRace(raceId);
  if (!race) return null;

  // 1. Stats from new progression model (base 10 + racial + smart allocation)
  const stats = computeStatsForLevel(className, raceId, config.level);

  // 4. Proficiency bonus
  const proficiencyBonus = getProficiencyBonus(config.level);

  // 5. HP (including Tough feat bonus)
  const conMod = getModifier(stats.con);
  const feats = featIdsOverride ?? getSimFeatIds(className, config.level);
  let hp = computeHP(className, config.level, conMod);
  if (feats.includes('feat-tough')) {
    hp += config.level * 2;
  }

  // 6. Equipment AC
  const dexMod = getModifier(stats.dex);
  const equipmentAC = computeEquipmentAC(className, config.level, dexMod);

  // 7. Weapon — class-specific with quality scaling
  const weaponCategory = CLASS_WEAPON_TYPE[className] || 'sword';
  const weaponStat = CLASS_WEAPON_STAT[className] || 'str';
  const tier = getTierIndex(config.level);
  const weaponTier = WEAPON_TIERS[weaponCategory]?.[tier] ?? WEAPON_TIERS.sword[tier];
  const qualityMult = TIER_QUALITY[tier];
  const qualityLabel = TIER_QUALITY_LABEL[tier];

  const weapon: WeaponInfo = {
    id: 'sim-weapon',
    name: qualityLabel !== 'COMMON' ? `${qualityLabel} ${weaponTier.name}` : weaponTier.name,
    diceCount: weaponTier.diceCount,
    diceSides: weaponTier.diceSides,
    bonusDamage: Math.floor(weaponTier.bonusDamage * qualityMult),
    bonusAttack: Math.floor(weaponTier.bonusAttack * qualityMult),
    damageModifierStat: weaponStat,
    attackModifierStat: weaponStat,
    damageType: WEAPON_CATEGORY_DAMAGE[weaponCategory] ?? 'SLASHING',
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
 * Classify an ability's combat role based on its effects.type.
 * Used by buildAbilityQueue to assign smart useWhen conditions.
 */
type CombatRole = 'damage' | 'buff' | 'heal' | 'cc' | 'utility' | 'echo';

export function classifyAbility(ability: AbilityDefinition): CombatRole {
  const effects = ability.effects as Record<string, unknown>;
  const type = effects.type as string;

  // Direct damage dealers
  if ([
    'damage', 'damage_status', 'damage_debuff', 'damage_steal',
    'multi_attack', 'multi_target',
    'aoe_damage', 'aoe_damage_status', 'aoe_drain', 'aoe_dot',
    'drain', 'delayed_damage', 'dispel_damage',
    'companion_attack', 'teleport_attack', 'trap',
    'cantrip',
  ].includes(type)) {
    return 'damage';
  }

  // Heals and cleanse
  if (['heal', 'hot', 'cleanse'].includes(type)) {
    return 'heal';
  }

  // Echo abilities repeat last action — must NOT be used as openers (no previous action to echo)
  if (type === 'echo') {
    return 'echo';
  }

  // Buffs (self-buffs, defensive, summons)
  if (['buff', 'summon', 'counter'].includes(type)) {
    return 'buff';
  }

  // CC / debuffs / control
  if (['status', 'debuff', 'aoe_debuff', 'control', 'swap', 'banish'].includes(type)) {
    return 'cc';
  }

  // Utility (flee, steal, reaction, phase, special)
  if (['flee', 'steal', 'reaction', 'phase', 'special'].includes(type)) {
    return 'utility';
  }

  return 'utility';
}

/**
 * Build a role-aware ability queue from class abilities available at the given level.
 *
 * Priority order:
 *   1. OPENER: One buff or CC ability (first_round only)
 *   2. SUSTAIN: All damage abilities (always) — the primary combat loop
 *   3. EMERGENCY: Heal abilities (low_hp only, 40% threshold)
 *   4. FALLBACK: Remaining CC/debuff abilities (always, lower priority than damage)
 *   5. REMAINING: Other buffs (always, lowest priority)
 *
 * If all abilities are on cooldown, decideAction() falls through to basic attack.
 */
export interface AbilityQueueOptions {
  /** Which tier 0 option to pick per choice level, e.g. { 3: 'a', 5: 'b', 8: 'c' } */
  tier0Selections?: Record<number, string>;
  /** Filter spec abilities to a single specialization (e.g. 'berserker') */
  specialization?: string;
}

function buildAbilityQueue(className: string, level: number, options?: AbilityQueueOptions): AbilityQueueEntry[] {
  const classAbilities = ABILITIES_BY_CLASS[className] ?? [];
  const tier0Sel = options?.tier0Selections;
  const spec = options?.specialization;

  // For tier 0 choice abilities, pick specific option or default to first per group
  const chosenGroups = new Set<string>();
  const available = classAbilities.filter((a: AbilityDefinition) => {
    if (a.levelRequired > level) return false;
    if ((a.effects as any)?.type === 'passive') return false;

    // Tier 0: pick specific option if tier0Selections provided
    if (a.requiresChoice && a.choiceGroup) {
      if (tier0Sel) {
        const sel = tier0Sel[a.levelRequired];
        if (sel) {
          // Ability IDs end with the option letter: war-t0-3a, war-t0-3b, etc.
          return a.id.endsWith(sel);
        }
      }
      // Default: first per group
      if (chosenGroups.has(a.choiceGroup)) return false;
      chosenGroups.add(a.choiceGroup);
    }

    // Specialization filter: only include abilities from specified spec (tier 0 has spec='none', always included)
    if (spec && a.specialization !== 'none' && a.specialization !== spec) return false;

    return true;
  });

  // Classify each ability
  const classified = available.map(a => ({
    ability: a,
    role: classifyAbility(a),
  }));

  const queue: AbilityQueueEntry[] = [];
  const usedIds = new Set<string>();
  let priority = 0;

  // 1. OPENER: Best buff or CC ability (first round only)
  // Skip tier -1 defensive abilities — those fire reactively when HP drops
  const openerCandidates = classified
    .filter(c => (c.role === 'buff' || c.role === 'cc') && c.ability.tier >= 0)
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);

  if (openerCandidates.length > 0) {
    const opener = openerCandidates[0];
    queue.push({
      abilityId: opener.ability.id,
      abilityName: opener.ability.name,
      priority: priority++,
      useWhen: 'first_round',
    });
    usedIds.add(opener.ability.id);
  }

  // 1b. REACTIVE DEFENSE: Tier -1 buff/cc abilities fire when HP drops below 70%
  const defensiveCandidates = classified
    .filter(c => (c.role === 'buff' || c.role === 'cc') && c.ability.tier < 0 && c.ability.cooldown > 0)
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);

  for (const def of defensiveCandidates) {
    queue.push({
      abilityId: def.ability.id,
      abilityName: def.ability.name,
      priority: priority++,
      useWhen: 'low_hp',
      hpThreshold: 70,
    });
    usedIds.add(def.ability.id);
  }

  // 2. SUSTAIN: Damage abilities interleaved with echo abilities
  // Echo repeats last action — placing it after the first damage ability gives:
  // R1 opener, R2 damage, R3 echo(repeats damage), R4 damage, R5 echo, ...
  const damageAbilities = classified
    .filter(c => c.role === 'damage')
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);

  const echoAbilities = classified
    .filter(c => c.role === 'echo')
    .sort((a, b) => b.ability.tier - a.ability.tier);

  // Add first damage ability
  if (damageAbilities.length > 0) {
    queue.push({
      abilityId: damageAbilities[0].ability.id,
      abilityName: damageAbilities[0].ability.name,
      priority: priority++,
      useWhen: 'always',
    });
    usedIds.add(damageAbilities[0].ability.id);
  }

  // Add echo abilities right after first damage (so they alternate)
  for (const ea of echoAbilities) {
    queue.push({
      abilityId: ea.ability.id,
      abilityName: ea.ability.name,
      priority: priority++,
      useWhen: 'always',
    });
    usedIds.add(ea.ability.id);
  }

  // Add remaining damage abilities
  for (let i = 1; i < damageAbilities.length; i++) {
    queue.push({
      abilityId: damageAbilities[i].ability.id,
      abilityName: damageAbilities[i].ability.name,
      priority: priority++,
      useWhen: 'always',
    });
    usedIds.add(damageAbilities[i].ability.id);
  }

  // 3. EMERGENCY: Heal abilities — only when HP is low
  const healAbilities = classified
    .filter(c => c.role === 'heal')
    .sort((a, b) => b.ability.tier - a.ability.tier);

  for (const ha of healAbilities) {
    queue.push({
      abilityId: ha.ability.id,
      abilityName: ha.ability.name,
      priority: priority++,
      useWhen: 'low_hp',
      hpThreshold: 40,
    });
    usedIds.add(ha.ability.id);
  }

  // 4. FALLBACK CC: Remaining CC/debuff abilities not used as opener
  const remainingCC = classified
    .filter(c => c.role === 'cc' && !usedIds.has(c.ability.id))
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);

  for (const cc of remainingCC) {
    queue.push({
      abilityId: cc.ability.id,
      abilityName: cc.ability.name,
      priority: priority++,
      useWhen: 'always',
    });
    usedIds.add(cc.ability.id);
  }

  // 5. REMAINING: Other buffs not used as opener (lowest priority fallback)
  const remainingBuffs = classified
    .filter(c => c.role === 'buff' && !usedIds.has(c.ability.id))
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);

  for (const rb of remainingBuffs) {
    queue.push({
      abilityId: rb.ability.id,
      abilityName: rb.ability.name,
      priority: priority++,
      useWhen: 'always',
    });
    usedIds.add(rb.ability.id);
  }

  // 6. Utility abilities that weren't picked up (steal, flee, etc.)
  const remainingUtility = classified
    .filter(c => !usedIds.has(c.ability.id))
    .sort((a, b) => b.ability.tier - a.ability.tier);

  for (const ru of remainingUtility) {
    queue.push({
      abilityId: ru.ability.id,
      abilityName: ru.ability.name,
      priority: priority++,
      useWhen: 'always',
    });
  }

  return queue;
}

/**
 * Build default CombatPresets for a synthetic combatant.
 */
export function buildDefaultPresets(className: string, level: number, options?: AbilityQueueOptions): CombatPresets {
  return {
    stance: CLASS_DEFAULT_STANCE[className] ?? 'BALANCED',
    retreat: {
      hpThreshold: 0,
      oppositionRatio: 0,
      roundLimit: 0,
      neverRetreat: true,  // Sim combatants never flee
    },
    abilityQueue: buildAbilityQueue(className, level, options),
    itemUsageRules: [],
    pvpLootBehavior: 'TAKE_NOTHING',
    healingPotionThreshold: 50,
    maxHealingPotionsPerCombat: 1,
    travelEngagementMode: 'ALWAYS_FIGHT',
    travelFleeMaxMonsterLevel: null,
    targetSelectionStrategy: 'FIRST',
  };
}

/**
 * Build full CombatantParams for use with resolveTickCombat().
 */
export function buildPlayerCombatParams(player: SyntheticPlayerResult, options?: AbilityQueueOptions): {
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
    presets: buildDefaultPresets(player.class, player.level, options),
    weapon: player.weapon,
    racialTracker: createRacialCombatTracker(),
    race: player.race,
    level: player.level,
    subRace: null,
  };
}

/**
 * Build a synthetic party from a PartyConfig.
 * Returns array of SyntheticPlayerResult with unique names (appends #1, #2, etc. for duplicate classes).
 */
export function buildSyntheticParty(config: PartyConfig): SyntheticPlayerResult[] {
  const results: SyntheticPlayerResult[] = [];
  const classCount = new Map<string, number>();

  for (const member of config.members) {
    const level = config.partyLevel ?? member.level;
    const player = buildSyntheticPlayer({ ...member, level }, member.featIds);
    if (!player) continue;

    // Track class counts for unique naming
    const cls = member.class.toLowerCase();
    const count = (classCount.get(cls) ?? 0) + 1;
    classCount.set(cls, count);

    results.push(player);
  }

  // Append #N suffix for duplicate classes
  const classSeen = new Map<string, number>();
  for (const player of results) {
    const cls = player.class;
    const total = classCount.get(cls) ?? 1;
    if (total > 1) {
      const idx = (classSeen.get(cls) ?? 0) + 1;
      classSeen.set(cls, idx);
      player.name = `${player.name} #${idx}`;
    }
  }

  return results;
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
      damageModifierStat: (monsterStats.attackStat ?? 'str') as 'str' | 'dex' | 'int' | 'wis' | 'cha',
      attackModifierStat: (monsterStats.attackStat ?? 'str') as 'str' | 'dex' | 'int' | 'wis' | 'cha',
      damageType: combatData?.damageType,
    },
    combatData,
  };
}
