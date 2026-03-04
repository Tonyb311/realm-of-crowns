/**
 * Combat Simulator — Scenario Definitions
 *
 * 34 preset scenarios for testing different combat mechanics.
 * Stats derived from monster seed data and realistic character builds.
 */

import type {
  CharacterStats,
  WeaponInfo,
  SpellInfo,
  ItemInfo,
  SpellSlots,
  StatusEffect,
  StatusEffectName,
  CombatDamageType,
} from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';

// ---- Scenario Types ----

export type CombatStance = 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE' | 'EVASIVE';

export interface CombatantDef {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  team: number;
  stats: CharacterStats;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  weapon: WeaponInfo;
  spellSlots?: SpellSlots;
  spells?: SpellInfo[];
  items?: ItemInfo[];
  race?: string;
  subRace?: { id: string; element?: string } | null;
  characterClass?: string;
  specialization?: string;
  /** Class ability IDs this combatant has unlocked */
  unlockedAbilityIds?: string[];
  stance?: CombatStance;
  retreatHpThreshold?: number;
  neverRetreat?: boolean;
  abilityQueue?: AbilityQueueEntry[];
  itemUsageRules?: ItemUsageRule[];
  /** Pre-apply status effects at combat start */
  statusEffects?: StatusEffect[];
  /** Manually set antiHealAura flag (simulates cle-inq-6 passive) */
  antiHealAura?: boolean;
}

export interface AbilityQueueEntry {
  abilityId: string;
  abilityName: string;
  priority: number;
  useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered' | 'has_companion';
  hpThreshold?: number;
  /** Target an ally instead of an enemy (e.g., Translocation ally shield) */
  targetAlly?: boolean;
}

export interface ItemUsageRule {
  itemTemplateId: string;
  itemName: string;
  useWhen: 'hp_below' | 'mana_below' | 'status_effect' | 'first_round';
  threshold?: number;
  statusEffect?: string;
}

export interface ScenarioDef {
  name: string;
  description: string;
  type: 'PVE' | 'PVP' | 'DUEL' | 'ARENA' | 'WAR';
  combatants: CombatantDef[];
}

// ---- Helper ----

function makeWeapon(
  name: string,
  diceCount: number,
  diceSides: number,
  modStat: 'str' | 'dex' = 'str',
  bonusDamage = 0,
  bonusAttack = 0,
  damageType = 'SLASHING',
): WeaponInfo {
  return {
    id: `weapon-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    diceCount,
    diceSides,
    damageModifierStat: modStat,
    attackModifierStat: modStat,
    bonusDamage,
    bonusAttack,
    damageType,
  };
}

function makeSpell(
  name: string,
  level: number,
  castingStat: 'int' | 'wis' | 'cha',
  type: 'damage' | 'heal' | 'status' | 'damage_status',
  diceCount: number,
  diceSides: number,
  opts: {
    modifier?: number;
    statusEffect?: StatusEffectName;
    statusDuration?: number;
    requiresSave?: boolean;
    saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
    damageType?: CombatDamageType;
  } = {},
): SpellInfo {
  return {
    id: `spell-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    level,
    castingStat,
    type,
    diceCount,
    diceSides,
    modifier: opts.modifier ?? 0,
    statusEffect: opts.statusEffect,
    statusDuration: opts.statusDuration,
    requiresSave: opts.requiresSave ?? false,
    saveType: opts.saveType,
    damageType: opts.damageType,
  };
}

// ---- Preset Scenarios ----

const basicMelee: ScenarioDef = {
  name: 'basic-melee',
  description: 'L5 Human Warrior vs L5 Orc Warrior — pure attack/damage flow',
  type: 'DUEL',
  combatants: [
    {
      id: 'player-1',
      name: 'Aldric the Bold',
      entityType: 'character',
      team: 0,
      stats: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      level: 5,
      hp: 44,
      maxHp: 44,
      ac: 16, // chain mail + shield
      weapon: makeWeapon('Longsword', 1, 8, 'str'),
      race: 'human',
      characterClass: 'Warrior',
      stance: 'BALANCED',
    },
    {
      id: 'monster-1',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
      level: 6,
      hp: 50,
      maxHp: 50,
      ac: 14, // hide armor + shield
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 0, 0, 'SLASHING'),
      neverRetreat: true,
    },
  ],
};

const spellVsMelee: ScenarioDef = {
  name: 'spell-vs-melee',
  description: 'L7 Elf Mage vs L7 Human Warrior — spell saves and mixed combat',
  type: 'DUEL',
  combatants: [
    {
      id: 'player-mage',
      name: 'Aelindra Starweave',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
      level: 7,
      hp: 38,
      maxHp: 38,
      ac: 13, // mage armor
      weapon: makeWeapon('Quarterstaff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 10, { requiresSave: false, damageType: 'FIRE' }),
        makeSpell('Burning Hands', 1, 'int', 'damage_status', 3, 6, {
          requiresSave: true,
          saveType: 'dex',
          statusEffect: 'burning',
          statusDuration: 2,
          damageType: 'FIRE',
        }),
        makeSpell('Scorching Ray', 2, 'int', 'damage', 4, 6, { requiresSave: false, damageType: 'FIRE' }),
        makeSpell('Fireball', 3, 'int', 'damage', 8, 6, { requiresSave: true, saveType: 'dex', damageType: 'FIRE' }),
      ],
      race: 'elf',
      characterClass: 'Mage',
      stance: 'DEFENSIVE',
    },
    {
      id: 'player-warrior',
      name: 'Garrett Ironhand',
      entityType: 'character',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 10 },
      level: 7,
      hp: 60,
      maxHp: 60,
      ac: 18, // plate armor
      weapon: makeWeapon('Greatsword', 2, 6, 'str'),
      race: 'human',
      characterClass: 'Warrior',
      stance: 'AGGRESSIVE',
    },
  ],
};

const statusEffects: ScenarioDef = {
  name: 'status-effects',
  description: 'L6 Nethkin Warlock (DoTs) vs L6 Dwarf Cleric (HoTs) — status tick testing',
  type: 'DUEL',
  combatants: [
    {
      id: 'player-warlock',
      name: 'Malachar Vex',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 12, con: 14, int: 14, wis: 10, cha: 16 },
      level: 6,
      hp: 40,
      maxHp: 40,
      ac: 14, // studded leather
      weapon: makeWeapon('Eldritch Blast', 1, 10, 'dex', 0, 0, 'FORCE'),
      spellSlots: { 1: 3, 2: 2, 3: 1 },
      spells: [
        makeSpell('Hex', 1, 'cha', 'damage_status', 1, 6, {
          requiresSave: true,
          saveType: 'wis',
          statusEffect: 'poisoned',
          statusDuration: 3,
          damageType: 'NECROTIC',
        }),
        makeSpell('Hellfire', 2, 'cha', 'damage_status', 3, 6, {
          requiresSave: true,
          saveType: 'dex',
          statusEffect: 'burning',
          statusDuration: 3,
          damageType: 'FIRE',
        }),
        makeSpell('Blight', 3, 'cha', 'damage', 5, 8, {
          requiresSave: true,
          saveType: 'con',
          damageType: 'NECROTIC',
        }),
      ],
      race: 'nethkin',
      characterClass: 'Mage',
      stance: 'BALANCED',
    },
    {
      id: 'player-cleric',
      name: 'Thrain Stoneheart',
      entityType: 'character',
      team: 1,
      stats: { str: 14, dex: 10, con: 16, int: 10, wis: 16, cha: 12 },
      level: 6,
      hp: 52,
      maxHp: 52,
      ac: 18, // chain mail + shield + def fighting
      weapon: makeWeapon('Warhammer', 1, 8, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 1 },
      spells: [
        makeSpell('Healing Word', 1, 'wis', 'heal', 1, 8, { modifier: 3 }),
        makeSpell('Bless', 1, 'wis', 'status', 0, 0, {
          statusEffect: 'blessed',
          statusDuration: 3,
          requiresSave: false,
        }),
        makeSpell('Regenerate', 2, 'wis', 'status', 0, 0, {
          statusEffect: 'regenerating',
          statusDuration: 4,
          requiresSave: false,
        }),
      ],
      race: 'dwarf',
      characterClass: 'Cleric',
      stance: 'DEFENSIVE',
    },
  ],
};

const fleeTest: ScenarioDef = {
  name: 'flee-test',
  description: 'L3 Halfling Rogue (retreat@50%) vs L8 Young Dragon — flee mechanics',
  type: 'PVE',
  combatants: [
    {
      id: 'player-rogue',
      name: 'Pip Lightfoot',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 16, con: 12, int: 12, wis: 14, cha: 10 },
      level: 3,
      hp: 24,
      maxHp: 24,
      ac: 14, // leather armor + DEX
      weapon: makeWeapon('Shortsword', 1, 6, 'dex'),
      race: 'halfling',
      characterClass: 'Rogue',
      stance: 'EVASIVE',
      retreatHpThreshold: 50,
    },
    {
      id: 'monster-dragon',
      name: 'Young Dragon',
      entityType: 'monster',
      team: 1,
      // Stats from monsters.ts: level 14, hp 152, ac 17
      stats: { str: 21, dex: 10, con: 19, int: 14, wis: 13, cha: 17 },
      level: 14,
      hp: 152,
      maxHp: 152,
      ac: 17,
      weapon: makeWeapon('Claw', 2, 8, 'str', 3, 7, 'SLASHING'),
      neverRetreat: true,
    },
  ],
};

const racialAbilities: ScenarioDef = {
  name: 'racial-abilities',
  description: 'L10 Half-Orc Berserker vs L10 Drakonid Elementalist — racial triggers',
  type: 'DUEL',
  combatants: [
    {
      id: 'player-berserker',
      name: 'Grukk Skullcrusher',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 12, con: 16, int: 8, wis: 10, cha: 8 },
      level: 10,
      hp: 84,
      maxHp: 84,
      ac: 15, // breastplate
      weapon: makeWeapon('Greataxe', 1, 12, 'str'),
      race: 'half-orc',
      characterClass: 'Warrior',
      stance: 'AGGRESSIVE',
      neverRetreat: true,
      abilityQueue: [
        {
          abilityId: 'savage-attacks',
          abilityName: 'Savage Attacks',
          priority: 1,
          useWhen: 'always',
        },
      ],
    },
    {
      id: 'player-elementalist',
      name: 'Vyrnax Flamescale',
      entityType: 'character',
      team: 1,
      stats: { str: 14, dex: 12, con: 14, int: 16, wis: 10, cha: 16 },
      level: 10,
      hp: 68,
      maxHp: 68,
      ac: 16, // scale mail + shield
      weapon: makeWeapon('Scimitar', 1, 6, 'str'),
      spellSlots: { 1: 3, 2: 2 },
      spells: [
        makeSpell('Fire Breath', 1, 'cha', 'damage', 3, 6, {
          requiresSave: true,
          saveType: 'dex',
          damageType: 'FIRE',
        }),
      ],
      race: 'drakonid',
      subRace: { id: 'red', element: 'fire' },
      characterClass: 'Mage',
      stance: 'BALANCED',
      abilityQueue: [
        {
          abilityId: 'breath-weapon',
          abilityName: 'Breath Weapon',
          priority: 1,
          useWhen: 'first_round',
        },
      ],
    },
  ],
};

const teamFight: ScenarioDef = {
  name: 'team-fight',
  description: '3v3 team battle — multi-target turn order',
  type: 'ARENA',
  combatants: [
    // Team 0: Warrior, Mage, Cleric
    {
      id: 'team0-warrior',
      name: 'Ser Marcus',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 10 },
      level: 8,
      hp: 68,
      maxHp: 68,
      ac: 18,
      weapon: makeWeapon('Longsword', 1, 8, 'str'),
      race: 'human',
      characterClass: 'Warrior',
      stance: 'BALANCED',
    },
    {
      id: 'team0-mage',
      name: 'Elara Frostwind',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
      level: 8,
      hp: 42,
      maxHp: 42,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Ice Shard', 1, 'int', 'damage', 2, 8, { damageType: 'COLD' }),
        makeSpell('Frost Nova', 2, 'int', 'damage_status', 3, 6, {
          requiresSave: true,
          saveType: 'con',
          statusEffect: 'frozen',
          statusDuration: 1,
          damageType: 'COLD',
        }),
      ],
      race: 'elf',
      characterClass: 'Mage',
      stance: 'DEFENSIVE',
    },
    {
      id: 'team0-cleric',
      name: 'Brother Anselm',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
      level: 8,
      hp: 56,
      maxHp: 56,
      ac: 18,
      weapon: makeWeapon('Mace', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Cure Wounds', 1, 'wis', 'heal', 1, 8, { modifier: 3 }),
        makeSpell('Shield of Faith', 1, 'wis', 'status', 0, 0, {
          statusEffect: 'shielded',
          statusDuration: 3,
          requiresSave: false,
        }),
      ],
      race: 'human',
      characterClass: 'Cleric',
      stance: 'DEFENSIVE',
    },
    // Team 1: Rogue, Ranger, Necromancer
    {
      id: 'team1-rogue',
      name: 'Shadow',
      entityType: 'character',
      team: 1,
      stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 14 },
      level: 8,
      hp: 46,
      maxHp: 46,
      ac: 16, // studded leather + DEX
      weapon: makeWeapon('Rapier', 1, 8, 'dex'),
      race: 'halfling',
      characterClass: 'Rogue',
      stance: 'AGGRESSIVE',
    },
    {
      id: 'team1-ranger',
      name: 'Kael Windrunner',
      entityType: 'character',
      team: 1,
      stats: { str: 14, dex: 16, con: 14, int: 10, wis: 14, cha: 10 },
      level: 8,
      hp: 56,
      maxHp: 56,
      ac: 15, // scale mail
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 0, 0, 'PIERCING'),
      race: 'elf',
      characterClass: 'Ranger',
      stance: 'BALANCED',
    },
    {
      id: 'team1-necro',
      name: 'Morgrath the Pale',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 12, con: 14, int: 18, wis: 12, cha: 10 },
      level: 8,
      hp: 48,
      maxHp: 48,
      ac: 12,
      weapon: makeWeapon('Dagger', 1, 4, 'dex'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Necrotic Bolt', 1, 'int', 'damage', 2, 8, { requiresSave: false, damageType: 'NECROTIC' }),
        makeSpell('Wither', 2, 'int', 'damage_status', 3, 6, {
          requiresSave: true,
          saveType: 'con',
          statusEffect: 'weakened',
          statusDuration: 2,
          damageType: 'NECROTIC',
        }),
      ],
      race: 'human',
      characterClass: 'Mage',
      stance: 'DEFENSIVE',
    },
  ],
};

// ---- Scenario 7: Class Abilities ----

const classAbilities: ScenarioDef = {
  name: 'class-abilities',
  description: 'L10 Warrior (Berserker) vs L10 Cleric (Healer) — tests class ability dispatch, buffs, heals, cooldowns',
  type: 'DUEL',
  combatants: [
    {
      id: 'warrior-1',
      name: 'Grukk the Berserker',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 10 },
      level: 10,
      hp: 78,
      maxHp: 78,
      ac: 16,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 0, 0, 'SLASHING'),
      race: 'orc',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1'], // Reckless Strike
      abilityQueue: [
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 1, useWhen: 'always' },
      ],
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'cleric-1',
      name: 'Sister Aelith',
      entityType: 'character',
      team: 1,
      stats: { str: 10, dex: 12, con: 14, int: 12, wis: 18, cha: 14 },
      level: 10,
      hp: 62,
      maxHp: 62,
      ac: 17,
      weapon: makeWeapon('Mace', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Healer',
      unlockedAbilityIds: ['cle-hea-1'], // Healing Light
      abilityQueue: [
        { abilityId: 'cle-hea-1', abilityName: 'Healing Light', priority: 1, useWhen: 'low_hp', hpThreshold: 60 },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 8: AoE Abilities ----

const aoeAbilities: ScenarioDef = {
  name: 'aoe-abilities',
  description: 'L20 Mage (Elementalist) with Fireball+Meteor+Chain Lightning vs 3x L15 Orc Warriors — AoE/multi_target testing',
  type: 'ARENA',
  combatants: [
    {
      id: 'mage-aoe',
      name: 'Ignatius Stormcaller',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 14, int: 20, wis: 12, cha: 10 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Arcane Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: ['mag-ele-1', 'mag-ele-3', 'mag-ele-5'],
      abilityQueue: [
        { abilityId: 'mag-ele-5', abilityName: 'Meteor Strike', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-ele-1', abilityName: 'Fireball', priority: 2, useWhen: 'always' },
        { abilityId: 'mag-ele-3', abilityName: 'Chain Lightning', priority: 3, useWhen: 'always' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-1',
      name: 'Orc Brute Alpha',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 15,
      hp: 95,
      maxHp: 95,
      ac: 15,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 0, 0, 'SLASHING'),
      neverRetreat: true,
    },
    {
      id: 'orc-2',
      name: 'Orc Brute Beta',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 15,
      hp: 95,
      maxHp: 95,
      ac: 15,
      weapon: makeWeapon('Warhammer', 1, 10, 'str', 0, 0, 'BLUDGEONING'),
      neverRetreat: true,
    },
    {
      id: 'orc-3',
      name: 'Orc Brute Gamma',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 15,
      hp: 95,
      maxHp: 95,
      ac: 15,
      weapon: makeWeapon('Morningstar', 1, 8, 'str', 2, 0, 'PIERCING'),
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 9: Multi-Attack ----

const multiAttack: ScenarioDef = {
  name: 'multi-attack',
  description: 'L22 Rogue (Swashbuckler) with Dual Strike+Flurry vs L22 Warrior (Guardian) with Fortify — multi_attack vs buff testing',
  type: 'DUEL',
  combatants: [
    {
      id: 'rogue-multi',
      name: 'Vex Quickblade',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 14, int: 12, wis: 12, cha: 14 },
      level: 22,
      hp: 92,
      maxHp: 92,
      ac: 18,
      weapon: makeWeapon('Twin Rapiers', 1, 8, 'dex', 2, 1),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-1', 'rog-swa-2', 'rog-swa-4'],
      abilityQueue: [
        { abilityId: 'rog-swa-4', abilityName: 'Flurry of Blades', priority: 1, useWhen: 'always' },
        { abilityId: 'rog-swa-2', abilityName: 'Dual Strike', priority: 2, useWhen: 'always' },
      ],
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'guardian-1',
      name: 'Ser Darius Ironwall',
      entityType: 'character',
      team: 1,
      stats: { str: 18, dex: 10, con: 18, int: 10, wis: 14, cha: 12 },
      level: 22,
      hp: 130,
      maxHp: 130,
      ac: 20,
      weapon: makeWeapon('Bastard Sword', 1, 10, 'str', 1, 1, 'SLASHING'),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-1', 'war-gua-2'],
      abilityQueue: [
        { abilityId: 'war-gua-2', abilityName: 'Fortify', priority: 1, useWhen: 'first_round' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 10: Counter/Trap Reactive Triggers ----

const counterTrap: ScenarioDef = {
  name: 'counter-trap',
  description: 'L14 Rogue (Swashbuckler, Riposte) vs L22 Ranger (Tracker, Lay Trap + Explosive Trap) — reactive trigger testing',
  type: 'DUEL',
  combatants: [
    {
      id: 'rogue-riposte',
      name: 'Vex Swiftblade',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 14, int: 12, wis: 12, cha: 14 },
      level: 14,
      hp: 72,
      maxHp: 72,
      ac: 17,
      weapon: makeWeapon('Rapier', 1, 8, 'dex'),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-1'],
      abilityQueue: [
        { abilityId: 'rog-swa-1', abilityName: 'Riposte', priority: 1, useWhen: 'always' },
      ],
      stance: 'BALANCED',
      neverRetreat: true,
    },
    {
      id: 'ranger-trapper',
      name: 'Kael Trapweaver',
      entityType: 'character',
      team: 1,
      stats: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 10 },
      level: 22,
      hp: 98,
      maxHp: 98,
      ac: 16,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 0, 0, 'PIERCING'),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Tracker',
      unlockedAbilityIds: ['ran-tra-1', 'ran-tra-4'],
      abilityQueue: [
        { abilityId: 'ran-tra-4', abilityName: 'Explosive Trap', priority: 1, useWhen: 'first_round' },
        { abilityId: 'ran-tra-1', abilityName: 'Lay Trap', priority: 2, useWhen: 'always' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 11: Companion System ----

const companion: ScenarioDef = {
  name: 'companion',
  description: 'L30 Ranger (Beastmaster, Alpha Predator + Bestial Fury + Call Companion) vs 2x L20 Orcs — companion summon, auto-damage, interception',
  type: 'PVE',
  combatants: [
    {
      id: 'ranger-beast',
      name: 'Sylva Wildheart',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 18, con: 16, int: 10, wis: 16, cha: 10 },
      level: 30,
      hp: 140,
      maxHp: 140,
      ac: 18,
      weapon: makeWeapon('Composite Longbow', 1, 10, 'dex', 2, 1, 'PIERCING'),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Beastmaster',
      unlockedAbilityIds: ['ran-bea-1', 'ran-bea-4', 'ran-bea-5'],
      abilityQueue: [
        { abilityId: 'ran-bea-5', abilityName: 'Alpha Predator', priority: 1, useWhen: 'first_round' },
        { abilityId: 'ran-bea-4', abilityName: 'Bestial Fury', priority: 2, useWhen: 'has_companion' },
      ],
      stance: 'BALANCED',
      neverRetreat: true,
    },
    {
      id: 'orc-elite-1',
      name: 'Orc Warlord',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 8, wis: 10, cha: 10 },
      level: 20,
      hp: 110,
      maxHp: 110,
      ac: 16,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 2, 1, 'SLASHING'),
      neverRetreat: true,
    },
    {
      id: 'orc-elite-2',
      name: 'Orc Shaman',
      entityType: 'monster',
      team: 1,
      stats: { str: 14, dex: 12, con: 16, int: 14, wis: 14, cha: 10 },
      level: 20,
      hp: 85,
      maxHp: 85,
      ac: 14,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 3, 2: 2 },
      spells: [
        makeSpell('Dark Bolt', 1, 'int', 'damage', 2, 8, { damageType: 'NECROTIC' }),
        makeSpell('Curse', 2, 'int', 'damage_status', 2, 6, {
          requiresSave: true,
          saveType: 'wis',
          statusEffect: 'weakened',
          statusDuration: 2,
          damageType: 'NECROTIC',
        }),
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 12: Special Abilities (Steal, Diplomat, Tome) ----

const specialAbilities: ScenarioDef = {
  name: 'special-abilities',
  description: 'Bard Diplomat (Gambit) + Rogue Thief (Pilfer/Mug) + Bard Lorekeeper (Tome of Secrets) in 3v2 — steal/special effect testing',
  type: 'ARENA',
  combatants: [
    {
      id: 'bard-diplomat',
      name: 'Thalia Peaceweaver',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 12, con: 12, int: 14, wis: 12, cha: 20 },
      level: 22,
      hp: 74,
      maxHp: 74,
      ac: 14,
      weapon: makeWeapon('Rapier', 1, 8, 'dex'),
      race: 'human',
      characterClass: 'Bard',
      specialization: 'Diplomat',
      unlockedAbilityIds: ['bar-dip-4'],
      abilityQueue: [
        { abilityId: 'bar-dip-4', abilityName: 'Diplomats Gambit', priority: 1, useWhen: 'first_round' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
    {
      id: 'rogue-thief',
      name: 'Quickfingers Nim',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 14 },
      level: 30,
      hp: 90,
      maxHp: 90,
      ac: 17,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 2, 2),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Thief',
      unlockedAbilityIds: ['rog-thi-1', 'rog-thi-5'],
      abilityQueue: [
        { abilityId: 'rog-thi-5', abilityName: 'Mug', priority: 1, useWhen: 'always' },
        { abilityId: 'rog-thi-1', abilityName: 'Pilfer', priority: 2, useWhen: 'always' },
      ],
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'bard-lore',
      name: 'Orion Bookwarden',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 14, cha: 16 },
      level: 30,
      hp: 82,
      maxHp: 82,
      ac: 15,
      weapon: makeWeapon('Quarterstaff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'gnome',
      characterClass: 'Bard',
      specialization: 'Lorekeeper',
      unlockedAbilityIds: ['bar-lor-5'],
      abilityQueue: [
        { abilityId: 'bar-lor-5', abilityName: 'Tome of Secrets', priority: 1, useWhen: 'always' },
      ],
      stance: 'BALANCED',
      neverRetreat: true,
    },
    // Enemies
    {
      id: 'bandit-captain',
      name: 'Blackhand the Cruel',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 14, con: 16, int: 10, wis: 10, cha: 12 },
      level: 20,
      hp: 100,
      maxHp: 100,
      ac: 17,
      weapon: makeWeapon('Bastard Sword', 1, 10, 'str', 1, 1, 'SLASHING'),
      neverRetreat: true,
    },
    {
      id: 'bandit-mage',
      name: 'Zara Hexblade',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
      level: 20,
      hp: 78,
      maxHp: 78,
      ac: 14,
      weapon: makeWeapon('Dagger', 1, 4, 'dex'),
      spellSlots: { 1: 3, 2: 2 },
      spells: [
        makeSpell('Shadow Bolt', 1, 'int', 'damage', 2, 8, { damageType: 'NECROTIC' }),
        makeSpell('Fear', 2, 'int', 'damage_status', 2, 6, {
          requiresSave: true,
          saveType: 'wis',
          statusEffect: 'weakened',
          statusDuration: 2,
          damageType: 'PSYCHIC',
        }),
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 13: Death Prevention (BUG-1 validation) ----

const deathPrevention: ScenarioDef = {
  name: 'death-prevention',
  description: 'L40 Warrior/Berserker (Undying Fury) vs L45 Executioner Golem — class death prevention validation',
  type: 'DUEL',
  combatants: [
    {
      id: 'warrior-berserker',
      name: 'Thorin Ironfist',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 12, con: 18, int: 8, wis: 10, cha: 8 },
      level: 40,
      hp: 80,
      maxHp: 80,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1', 'war-ber-6'],
      abilityQueue: [
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 1, useWhen: 'always' },
      ],
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'executioner-golem',
      name: 'Executioner Golem',
      entityType: 'monster',
      team: 1,
      stats: { str: 22, dex: 8, con: 20, int: 5, wis: 5, cha: 5 },
      level: 45,
      hp: 200,
      maxHp: 200,
      ac: 12,
      weapon: makeWeapon('Giant Maul', 3, 10, 'str', 6, 0, 'BLUDGEONING'),
      neverRetreat: true,
      stance: 'AGGRESSIVE',
    },
  ],
};

// ---- Scenario 14: Psion Telepath (BUG-3 validation) ----

const psionTelepath: ScenarioDef = {
  name: 'psion-telepath',
  description: 'L20 Psion/Telepath vs 2x L18 Orc Warriors — psion dispatch and domination',
  type: 'PVE',
  combatants: [
    {
      id: 'psion-tel',
      name: 'Zephyr Mindweaver',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 12, con: 12, int: 20, wis: 16, cha: 10 },
      level: 20,
      hp: 60,
      maxHp: 60,
      ac: 12,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Psion',
      specialization: 'Telepath',
      unlockedAbilityIds: ['psi-tel-1', 'psi-tel-3', 'psi-tel-4'],
      abilityQueue: [
        { abilityId: 'psi-tel-4', abilityName: 'Dominate', priority: 1, useWhen: 'first_round' },
        { abilityId: 'psi-tel-3', abilityName: 'Psychic Crush', priority: 2, useWhen: 'always' },
        { abilityId: 'psi-tel-1', abilityName: 'Mind Spike', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-warrior-a',
      name: 'Orc Enforcer',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 18,
      hp: 80,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-warrior-b',
      name: 'Orc Brute',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 18,
      hp: 80,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 15: Psion Seer vs Nomad ----

const psionSeerNomad: ScenarioDef = {
  name: 'psion-seer-nomad',
  description: 'L20 Psion/Seer vs L20 Psion/Nomad — reaction, phase, teleport_attack, aoe psion types',
  type: 'DUEL',
  combatants: [
    {
      id: 'psion-seer',
      name: 'Oracle Vesper',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 20, cha: 10 },
      level: 20,
      hp: 55,
      maxHp: 55,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Psion',
      specialization: 'Seer',
      unlockedAbilityIds: ['psi-see-1', 'psi-see-3'],
      abilityQueue: [
        { abilityId: 'psi-see-1', abilityName: 'Foresight', priority: 1, useWhen: 'first_round' },
        { abilityId: 'psi-see-3', abilityName: 'Precognitive Dodge', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'psion-nomad',
      name: 'Drifter Kaelen',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 16, con: 12, int: 20, wis: 14, cha: 10 },
      level: 20,
      hp: 55,
      maxHp: 55,
      ac: 14,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex'),
      race: 'gnome',
      characterClass: 'Psion',
      specialization: 'Nomad',
      unlockedAbilityIds: ['psi-nom-1', 'psi-nom-3', 'psi-nom-5'],
      abilityQueue: [
        { abilityId: 'psi-nom-3', abilityName: 'Dimensional Pocket', priority: 1, useWhen: 'first_round' },
        { abilityId: 'psi-nom-5', abilityName: 'Rift Walk', priority: 2, useWhen: 'always' },
        { abilityId: 'psi-nom-1', abilityName: 'Blink Strike', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 16: Drain Heal Loop ----

const drainHealLoop: ScenarioDef = {
  name: 'drain-heal-loop',
  description: 'L30 Mage/Necromancer (Life Drain + Soul Harvest) vs 3x L25 Orcs — drain self-healing',
  type: 'PVE',
  combatants: [
    {
      id: 'necro',
      name: 'Malachar the Undying',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 12, con: 14, int: 20, wis: 14, cha: 10 },
      level: 30,
      hp: 70,
      maxHp: 70,
      ac: 12,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3 },
      spells: [
        makeSpell('Shadow Bolt', 1, 'int', 'damage', 2, 8, { damageType: 'NECROTIC' }),
        makeSpell('Blight', 2, 'int', 'damage_status', 3, 6, {
          requiresSave: true,
          saveType: 'con',
          statusEffect: 'poisoned',
          statusDuration: 2,
          damageType: 'NECROTIC',
        }),
      ],
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Necromancer',
      unlockedAbilityIds: ['mag-nec-1', 'mag-nec-5'],
      abilityQueue: [
        { abilityId: 'mag-nec-5', abilityName: 'Soul Harvest', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-nec-1', abilityName: 'Life Drain', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-drain-1',
      name: 'Orc Raider',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 60,
      maxHp: 60,
      ac: 14,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-drain-2',
      name: 'Orc Savage',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 60,
      maxHp: 60,
      ac: 14,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-drain-3',
      name: 'Orc Reaver',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 60,
      maxHp: 60,
      ac: 14,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 17: Delayed Damage (Death Mark) ----

const delayedDamage: ScenarioDef = {
  name: 'delayed-damage',
  description: 'L30 Rogue/Assassin (Death Mark) vs L30 Armored Construct — delayed detonation test',
  type: 'DUEL',
  combatants: [
    {
      id: 'assassin',
      name: 'Shade Veilstrike',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 8 },
      level: 30,
      hp: 60,
      maxHp: 60,
      ac: 16,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 5),
      race: 'human',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-5', 'rog-ass-1'],
      abilityQueue: [
        { abilityId: 'rog-ass-5', abilityName: 'Death Mark', priority: 1, useWhen: 'first_round' },
        { abilityId: 'rog-ass-1', abilityName: 'Backstab', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'armored-construct',
      name: 'Armored Construct',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 8, con: 20, int: 5, wis: 8, cha: 5 },
      level: 30,
      hp: 150,
      maxHp: 150,
      ac: 18,
      weapon: makeWeapon('Iron Fist', 2, 8, 'str', 4, 0, 'BLUDGEONING'),
      neverRetreat: true,
      stance: 'DEFENSIVE',
    },
  ],
};

// ---- Scenario 18: Dispel and Cleanse ----

const dispelAndCleanse: ScenarioDef = {
  name: 'dispel-and-cleanse',
  description: 'L20 Cleric/Inquisitor (Purging Flame + Denounce) vs L20 Mage/Enchanter (Haste + Enfeeble) — dispel mechanic',
  type: 'DUEL',
  combatants: [
    {
      id: 'inquisitor',
      name: 'Brother Marcus',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 10, con: 14, int: 12, wis: 20, cha: 14 },
      level: 20,
      hp: 65,
      maxHp: 65,
      ac: 16,
      weapon: makeWeapon('Mace', 1, 8, 'str', 1, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Inquisitor',
      unlockedAbilityIds: ['cle-inq-4', 'cle-inq-1'],
      abilityQueue: [
        { abilityId: 'cle-inq-1', abilityName: 'Denounce', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-inq-4', abilityName: 'Purging Flame', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'enchanter',
      name: 'Sylena Spellbinder',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 12 },
      level: 20,
      hp: 50,
      maxHp: 50,
      ac: 12,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3 },
      spells: [
        makeSpell('Hex', 1, 'int', 'damage_status', 1, 6, {
          requiresSave: true,
          saveType: 'wis',
          statusEffect: 'weakened',
          statusDuration: 2,
          damageType: 'NECROTIC',
        }),
        makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 6, { damageType: 'FIRE' }),
      ],
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Enchanter',
      unlockedAbilityIds: ['mag-enc-2', 'mag-enc-3'],
      abilityQueue: [
        { abilityId: 'mag-enc-3', abilityName: 'Haste', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-enc-2', abilityName: 'Enfeeble', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 19: Absorption Shield ----

const absorptionShield: ScenarioDef = {
  name: 'absorption-shield',
  description: 'L22 Mage/Elementalist (Elemental Shield + Fireball) vs L22 Orc Warrior — absorption shield test',
  type: 'DUEL',
  combatants: [
    {
      id: 'elementalist',
      name: 'Pyra Flameguard',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 10 },
      level: 22,
      hp: 55,
      maxHp: 55,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 6, { damageType: 'FIRE' }),
        makeSpell('Scorching Ray', 2, 'int', 'damage', 3, 6, { damageType: 'FIRE' }),
      ],
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: ['mag-ele-4', 'mag-ele-1'],
      abilityQueue: [
        { abilityId: 'mag-ele-4', abilityName: 'Elemental Shield', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-ele-1', abilityName: 'Fireball', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-shield-test',
      name: 'Orc Destroyer',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 7, wis: 10, cha: 8 },
      level: 22,
      hp: 90,
      maxHp: 90,
      ac: 15,
      weapon: makeWeapon('Greataxe', 2, 12, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 20: AoE DoT Consecrate ----

const aoeDotConsecrate: ScenarioDef = {
  name: 'aoe-dot-consecrate',
  description: 'L16 Cleric/Paladin (Consecrate + Smite) vs 3x L14 Goblins — AoE DoT + radiant damage',
  type: 'PVE',
  combatants: [
    {
      id: 'paladin',
      name: 'Sir Aldwin Lightsworn',
      entityType: 'character',
      team: 0,
      stats: { str: 16, dex: 10, con: 16, int: 10, wis: 18, cha: 14 },
      level: 16,
      hp: 75,
      maxHp: 75,
      ac: 18,
      weapon: makeWeapon('Warhammer', 1, 8, 'str', 3, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Paladin',
      unlockedAbilityIds: ['cle-pal-3', 'cle-pal-1'],
      abilityQueue: [
        { abilityId: 'cle-pal-3', abilityName: 'Consecrate', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-pal-1', abilityName: 'Smite', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'goblin-1',
      name: 'Goblin Scrapper',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 14, con: 10, int: 8, wis: 8, cha: 6 },
      level: 14,
      hp: 30,
      maxHp: 30,
      ac: 12,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex', 2),
      neverRetreat: true,
    },
    {
      id: 'goblin-2',
      name: 'Goblin Stabber',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 14, con: 10, int: 8, wis: 8, cha: 6 },
      level: 14,
      hp: 30,
      maxHp: 30,
      ac: 12,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex', 2),
      neverRetreat: true,
    },
    {
      id: 'goblin-3',
      name: 'Goblin Sneaker',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 14, con: 10, int: 8, wis: 8, cha: 6 },
      level: 14,
      hp: 30,
      maxHp: 30,
      ac: 12,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex', 2),
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 21: Cooldown Reduction (BUG-2 validation) ----

const cooldownReduction: ScenarioDef = {
  name: 'cooldown-reduction',
  description: 'L40 Mage/Elementalist (Arcane Mastery 30% CDR) vs L35 Training Dummy — cooldown reduction test',
  type: 'DUEL',
  combatants: [
    {
      id: 'cdr-mage',
      name: 'Arcanus Spellforge',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 22, wis: 16, cha: 10 },
      level: 40,
      hp: 60,
      maxHp: 60,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [
        makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 6, { damageType: 'FIRE' }),
      ],
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: ['mag-ele-1', 'mag-ele-5', 'mag-ele-6'],
      abilityQueue: [
        { abilityId: 'mag-ele-5', abilityName: 'Meteor Strike', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-ele-1', abilityName: 'Fireball', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'training-dummy',
      name: 'Training Dummy',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 8, con: 20, int: 5, wis: 5, cha: 5 },
      level: 35,
      hp: 300,
      maxHp: 300,
      ac: 10,
      weapon: makeWeapon('Fist', 1, 4, 'str', 0, 0, 'BLUDGEONING'),
      neverRetreat: true,
      stance: 'DEFENSIVE',
    },
  ],
};

// ---- Scenario 22: Nethkin Counter Stack ----

const nethkinCounterStack: ScenarioDef = {
  name: 'nethkin-counter-stack',
  description: 'L14 Nethkin Rogue/Swashbuckler (Riposte + Infernal Rebuke) vs L14 Orc — reactive damage stacking',
  type: 'DUEL',
  combatants: [
    {
      id: 'nethkin-rogue',
      name: 'Vex Infernus',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 12, wis: 10, cha: 14 },
      level: 14,
      hp: 50,
      maxHp: 50,
      ac: 16,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 4),
      race: 'nethkin',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-1'],
      abilityQueue: [
        { abilityId: 'rog-swa-1', abilityName: 'Riposte', priority: 1, useWhen: 'always' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-counter-test',
      name: 'Orc Warbringer',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 14,
      hp: 70,
      maxHp: 70,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 23: Multi Buff Stack ----

const multiBuffStack: ScenarioDef = {
  name: 'multi-buff-stack',
  description: 'L20 Warrior/Guardian (Fortify + Shield Wall) vs L20 Orc Berserker — multiple buff stacking',
  type: 'DUEL',
  combatants: [
    {
      id: 'guardian',
      name: 'Ironwall Dorin',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 18, int: 8, wis: 12, cha: 10 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 18,
      weapon: makeWeapon('Longsword+Shield', 1, 8, 'str', 4),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-2', 'war-gua-4'],
      abilityQueue: [
        { abilityId: 'war-gua-2', abilityName: 'Fortify', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-gua-4', abilityName: 'Shield Wall', priority: 2, useWhen: 'always' },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
    {
      id: 'orc-berserker',
      name: 'Orc Berserker',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 7, wis: 8, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 12,
      weapon: makeWeapon('Greataxe', 2, 6, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 24: Mutual Kill ----

const mutualKill: ScenarioDef = {
  name: 'mutual-kill',
  description: 'L10 Nethkin Rogue (Riposte, 8HP) vs L10 Orc (8HP) — simultaneous death via reactive damage',
  type: 'DUEL',
  combatants: [
    {
      id: 'nethkin-low',
      name: 'Ashblood Nyx',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 14 },
      level: 10,
      hp: 8,
      maxHp: 8,
      ac: 14,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 3),
      race: 'nethkin',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-1'],
      abilityQueue: [
        { abilityId: 'rog-swa-1', abilityName: 'Riposte', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-low',
      name: 'Orc Grunt',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 12, int: 7, wis: 10, cha: 8 },
      level: 10,
      hp: 8,
      maxHp: 8,
      ac: 12,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 25: Drain Heal Fixed (BUG-FIX 1 validation) ----

const drainHealFixed: ScenarioDef = {
  name: 'drain-heal-fixed',
  description: 'L30 Mage/Necromancer (Life Drain) vs L30 Orc — validates healPercent bug fix (50% heal, not 0.5%)',
  type: 'DUEL',
  combatants: [
    {
      id: 'necro-drain',
      name: 'Malachar the Siphoner',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 12, con: 14, int: 20, wis: 14, cha: 10 },
      level: 30,
      hp: 80,
      maxHp: 80,
      ac: 12,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3 },
      spells: [makeSpell('Shadow Bolt', 1, 'int', 'damage', 2, 8, { damageType: 'NECROTIC' })],
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Necromancer',
      unlockedAbilityIds: ['mag-nec-1', 'mag-nec-2'],
      abilityQueue: [
        { abilityId: 'mag-nec-1', abilityName: 'Life Drain', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-drain-target',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 30,
      hp: 120,
      maxHp: 120,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 26: Reckless Strike Penalty (BUG-FIX 2 validation) ----

const recklessStrikePenalty: ScenarioDef = {
  name: 'reckless-strike-penalty',
  description: 'L10 Warrior/Berserker (Reckless Strike) vs L10 Orc — validates selfDefenseDebuff AC penalty',
  type: 'DUEL',
  combatants: [
    {
      id: 'berserker-reckless',
      name: 'Grimjaw the Bold',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 8 },
      level: 10,
      hp: 60,
      maxHp: 60,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 2),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1'],
      abilityQueue: [
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-reckless-target',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 14, int: 7, wis: 10, cha: 8 },
      level: 10,
      hp: 60,
      maxHp: 60,
      ac: 12,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 27: CC Immune Berserker (BUFF-1 validation) ----

const ccImmuneBerserker: ScenarioDef = {
  name: 'cc-immune-berserker',
  description: 'L35 Warrior/Berserker (Berserker Rage) vs L35 Mage/Enchanter (Polymorph) — CC immunity test',
  type: 'DUEL',
  combatants: [
    {
      id: 'berserker-cc',
      name: 'Ragnar Ironfury',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 12, con: 18, int: 8, wis: 10, cha: 8 },
      level: 35,
      hp: 150,
      maxHp: 150,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      race: 'orc',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-5', 'war-ber-4'],
      abilityQueue: [
        { abilityId: 'war-ber-5', abilityName: 'Berserker Rage', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-ber-4', abilityName: 'Frenzy', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'enchanter-cc',
      name: 'Sylara the Enchantress',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 12 },
      level: 35,
      hp: 80,
      maxHp: 80,
      ac: 11,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 6, { damageType: 'FIRE' })],
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Enchanter',
      unlockedAbilityIds: ['mag-enc-5', 'mag-enc-2', 'mag-enc-1'],
      abilityQueue: [
        { abilityId: 'mag-enc-5', abilityName: 'Polymorph', priority: 1, useWhen: 'always' },
        { abilityId: 'mag-enc-2', abilityName: 'Enfeeble', priority: 2, useWhen: 'always' },
        { abilityId: 'mag-enc-1', abilityName: 'Arcane Bolt', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 28: Guaranteed Hits Warlord (BUFF-2 validation) ----

const guaranteedHitsWarlord: ScenarioDef = {
  name: 'guaranteed-hits-warlord',
  description: 'L35 Warrior/Warlord (Warlord\'s Decree) vs L35 High-AC Mage — guaranteed hits test',
  type: 'DUEL',
  combatants: [
    {
      id: 'warlord-hits',
      name: 'Commander Voss',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 12, con: 16, int: 10, wis: 12, cha: 16 },
      level: 35,
      hp: 130,
      maxHp: 130,
      ac: 15,
      weapon: makeWeapon('Longsword', 1, 8, 'str', 5),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Warlord',
      unlockedAbilityIds: ['war-war-5', 'war-war-2'],
      abilityQueue: [
        { abilityId: 'war-war-5', abilityName: "Warlord's Decree", priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-war-2', abilityName: 'Commanding Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'high-ac-mage',
      name: 'Archmage Theron',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 18, con: 12, int: 22, wis: 16, cha: 10 },
      level: 35,
      hp: 80,
      maxHp: 80,
      ac: 18,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spells: [makeSpell('Fire Bolt', 0, 'int', 'damage', 2, 6, { damageType: 'FIRE' })],
      race: 'elf',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 29: Dodge Evasion (BUFF-3 validation) ----

const dodgeEvasion: ScenarioDef = {
  name: 'dodge-evasion',
  description: 'L20 Rogue/Swashbuckler (Evasion 30% dodge) vs L20 Orc — dodge mechanic test',
  type: 'DUEL',
  combatants: [
    {
      id: 'rogue-dodge',
      name: 'Lira Quickstep',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 12, wis: 10, cha: 14 },
      level: 20,
      hp: 55,
      maxHp: 55,
      ac: 15,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 4),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-3', 'rog-swa-2'],
      abilityQueue: [
        { abilityId: 'rog-swa-3', abilityName: 'Evasion', priority: 1, useWhen: 'first_round' },
        { abilityId: 'rog-swa-2', abilityName: 'Dual Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-dodge-test',
      name: 'Orc Brawler',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 12,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 30: Damage Reflect Bulwark (BUFF-4 validation) ----

const damageReflectBulwark: ScenarioDef = {
  name: 'damage-reflect-bulwark',
  description: 'L30 Warrior/Guardian (Iron Bulwark 30% reflect) vs L30 Orc Berserker — damage reflect test',
  type: 'DUEL',
  combatants: [
    {
      id: 'guardian-reflect',
      name: 'Thane Ironheart',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 10, con: 20, int: 8, wis: 12, cha: 10 },
      level: 30,
      hp: 140,
      maxHp: 140,
      ac: 18,
      weapon: makeWeapon('Longsword+Shield', 1, 8, 'str', 4),
      race: 'dwarf',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-5', 'war-gua-2', 'war-gua-4'],
      abilityQueue: [
        { abilityId: 'war-gua-5', abilityName: 'Iron Bulwark', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-gua-2', abilityName: 'Fortify', priority: 2, useWhen: 'always' },
        { abilityId: 'war-gua-4', abilityName: 'Shield Wall', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-reflect-test',
      name: 'Orc Berserker',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 7, wis: 8, cha: 8 },
      level: 30,
      hp: 120,
      maxHp: 120,
      ac: 12,
      weapon: makeWeapon('Greataxe', 2, 8, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 31: Stealth Vanish (BUFF-5 validation) ----

const stealthVanish: ScenarioDef = {
  name: 'stealth-vanish',
  description: 'L15 Rogue/Assassin (Vanish + Backstab) vs L15 Orc — stealth miss + crit bonus test',
  type: 'DUEL',
  combatants: [
    {
      id: 'assassin-stealth',
      name: 'Kael Shadowmeld',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 8 },
      level: 15,
      hp: 45,
      maxHp: 45,
      ac: 14,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 4),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-2', 'rog-ass-1'],
      abilityQueue: [
        { abilityId: 'rog-ass-2', abilityName: 'Vanish', priority: 1, useWhen: 'always' },
        { abilityId: 'rog-ass-1', abilityName: 'Backstab', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-stealth-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 14, int: 7, wis: 10, cha: 8 },
      level: 15,
      hp: 70,
      maxHp: 70,
      ac: 12,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 32: Ambush Stealth Chain (DMG-6 + DMG-7 validation) ----

const ambushStealthChain: ScenarioDef = {
  name: 'ambush-stealth-chain',
  description: 'L25 Rogue/Assassin (Vanish + Ambush 3x) vs L25 Orc — stealth requirement + damage multiplier',
  type: 'DUEL',
  combatants: [
    {
      id: 'assassin-ambush',
      name: 'Nyx Shadowstrike',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 8 },
      level: 25,
      hp: 55,
      maxHp: 55,
      ac: 14,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 5),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-2', 'rog-ass-4'],
      abilityQueue: [
        { abilityId: 'rog-ass-2', abilityName: 'Vanish', priority: 1, useWhen: 'always' },
        { abilityId: 'rog-ass-4', abilityName: 'Ambush', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-ambush-test',
      name: 'Orc Warchief',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 12, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 100,
      maxHp: 100,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 33: Aimed Shot Accuracy (DMG-4 validation) ----

const aimedShotAccuracy: ScenarioDef = {
  name: 'aimed-shot-accuracy',
  description: 'L20 Ranger/Sharpshooter (Aimed Shot +3, Headshot -5/+20crit) vs L20 Orc — accuracy mod test',
  type: 'DUEL',
  combatants: [
    {
      id: 'sharpshooter-acc',
      name: 'Elara Truemark',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 14, wis: 16, cha: 8 },
      level: 20,
      hp: 65,
      maxHp: 65,
      ac: 14,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 3),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Sharpshooter',
      unlockedAbilityIds: ['ran-sha-1', 'ran-sha-4'],
      abilityQueue: [
        { abilityId: 'ran-sha-1', abilityName: 'Aimed Shot', priority: 1, useWhen: 'always' },
        { abilityId: 'ran-sha-4', abilityName: 'Headshot', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-accuracy-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 16,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 34: Penance Debuff Bonus (DMG-5 validation) ----

const penanceDebuffBonus: ScenarioDef = {
  name: 'penance-debuff-bonus',
  description: 'L20 Cleric/Inquisitor (Denounce + Silence + Penance) vs L20 Orc — bonus per debuff test',
  type: 'DUEL',
  combatants: [
    {
      id: 'inquisitor-penance',
      name: 'Father Aldric',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 10, con: 14, int: 12, wis: 20, cha: 14 },
      level: 20,
      hp: 70,
      maxHp: 70,
      ac: 14,
      weapon: makeWeapon('Mace', 1, 8, 'str', 2, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Inquisitor',
      unlockedAbilityIds: ['cle-inq-1', 'cle-inq-3', 'cle-inq-2'],
      abilityQueue: [
        { abilityId: 'cle-inq-1', abilityName: 'Denounce', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-inq-3', abilityName: 'Silence', priority: 2, useWhen: 'always' },
        { abilityId: 'cle-inq-2', abilityName: 'Penance', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-penance-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 90,
      maxHp: 90,
      ac: 13,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 35: Crit Chance + First Strike (PASSIVE-1, PASSIVE-3) ----
// Tests: ran-tra-6 (firstStrikeCrit), ran-sha-6 (critChanceBonus: 10, accuracyBonus: 5)
// First attack auto-crits, subsequent attacks have expanded crit range

const critFirstStrike: ScenarioDef = {
  name: 'crit-first-strike',
  description: 'L40 Ranger/Tracker with firstStrikeCrit + critChanceBonus passives vs L35 Orc — auto-crit first hit + expanded crit range',
  type: 'DUEL',
  combatants: [
    {
      id: 'tracker-crit',
      name: 'Fen Deadeye',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 20, con: 14, int: 10, wis: 18, cha: 10 },
      level: 40,
      hp: 85,
      maxHp: 85,
      ac: 16,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 5),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Tracker',
      unlockedAbilityIds: ['ran-tra-1', 'ran-tra-5', 'ran-tra-6'],
      abilityQueue: [
        { abilityId: 'ran-tra-1', abilityName: 'Lay Trap', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-crit-test',
      name: 'Orc Berserker',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 18, int: 7, wis: 10, cha: 8 },
      level: 35,
      hp: 120,
      maxHp: 120,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 36: Permanent Companion (PASSIVE-4) ----

const permanentCompanion: ScenarioDef = {
  name: 'permanent-companion',
  description: 'L30 Ranger/Beastmaster with permanent immune companion vs L30 Orc — companion never expires or takes damage',
  type: 'DUEL',
  combatants: [
    {
      id: 'beastmaster-perm',
      name: 'Kael Wildrun',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 18, con: 14, int: 10, wis: 16, cha: 10 },
      level: 30,
      hp: 80,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 4),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Beastmaster',
      unlockedAbilityIds: ['ran-bea-1', 'ran-bea-3'],
      abilityQueue: [
        { abilityId: 'ran-bea-1', abilityName: 'Call Companion', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-perm-comp',
      name: 'Orc Chieftain',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 8, wis: 10, cha: 10 },
      level: 30,
      hp: 120,
      maxHp: 120,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 6),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 37: Stacking Damage Per Round (PASSIVE-5) ----

const stackingDamage: ScenarioDef = {
  name: 'stacking-damage',
  description: 'L20 Warrior with stackingDamagePerRound (+3/round) vs L20 Orc — damage increases each turn',
  type: 'DUEL',
  combatants: [
    {
      id: 'stacker-warrior',
      name: 'Darius Ironfist',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 10, wis: 12, cha: 10 },
      level: 20,
      hp: 75,
      maxHp: 75,
      ac: 15,
      weapon: makeWeapon('Longsword', 1, 8, 'str', 3),
      race: 'human',
      characterClass: 'Bard',
      specialization: 'Battlechanter',
      unlockedAbilityIds: [],
      abilityQueue: [],
      neverRetreat: true,
    },
    {
      id: 'orc-stacking-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 85,
      maxHp: 85,
      ac: 13,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 38: Advantage vs Low HP (PASSIVE-6) ----

const advantageLowHp: ScenarioDef = {
  name: 'advantage-low-hp',
  description: 'L20 Ranger with advantageVsLowHp (50% threshold) vs wounded L20 Orc — roll twice vs low targets',
  type: 'DUEL',
  combatants: [
    {
      id: 'hunter-adv',
      name: 'Fen Ironarrow',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 20, con: 14, int: 10, wis: 16, cha: 10 },
      level: 20,
      hp: 65,
      maxHp: 65,
      ac: 14,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 4),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Sharpshooter',
      unlockedAbilityIds: [],
      abilityQueue: [],
      neverRetreat: true,
    },
    {
      id: 'orc-wounded',
      name: 'Wounded Orc',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 14, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 30,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 39: Consume-on-Use Buff + Cooldown Halved (MECH-1, MECH-2) ----
// Tests: bar-lor-1 (Analyze, bonusDamageNext consumeOnUse), bar-lor-4 (Arcane Insight, nextCooldownHalved)
// bar-lor-3 (Exploit Weakness, requiresAnalyze + critBonus)

const consumeAndCooldown: ScenarioDef = {
  name: 'consume-and-cooldown',
  description: 'L30 Bard/Lorekeeper with Analyze (consumeOnUse) + Arcane Insight (nextCooldownHalved) vs L25 Orc',
  type: 'DUEL',
  combatants: [
    {
      id: 'lorekeeper-consume',
      name: 'Theron the Sage',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 14, con: 12, int: 20, wis: 16, cha: 14 },
      level: 30,
      hp: 65,
      maxHp: 65,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      race: 'gnome',
      characterClass: 'Bard',
      specialization: 'Lorekeeper',
      unlockedAbilityIds: ['bar-lor-1', 'bar-lor-3', 'bar-lor-4'],
      abilityQueue: [
        { abilityId: 'bar-lor-1', abilityName: 'Analyze', priority: 1, useWhen: 'first_round' },
        { abilityId: 'bar-lor-4', abilityName: 'Arcane Insight', priority: 2, useWhen: 'always' },
        { abilityId: 'bar-lor-3', abilityName: 'Exploit Weakness', priority: 3, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-consume-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 100,
      maxHp: 100,
      ac: 13,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 40: Taunt Enforcement + AC Debuff (MECH-7) ----
// Tests: war-gua-3 (Taunt, status taunt 2 rounds, applies -2 AC debuff)
// war-gua-1 (Shield Bash, damage_status stun 1 round)
// Enemy must attack Guardian while taunted, ignoring squishy Mage

const tauntEnforcement: ScenarioDef = {
  name: 'taunt-enforcement',
  description: 'L20 Warrior/Guardian taunts enemy via war-gua-3, forcing attacks against self with AC debuff (-2)',
  type: 'PVE',
  combatants: [
    {
      id: 'guardian-taunt',
      name: 'Ser Brannok',
      entityType: 'character',
      team: 0,
      stats: { str: 16, dex: 10, con: 20, int: 10, wis: 14, cha: 14 },
      level: 20,
      hp: 100,
      maxHp: 100,
      ac: 18,
      weapon: makeWeapon('Sword & Shield', 1, 8, 'str', 3),
      race: 'dwarf',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-1', 'war-gua-3'],
      abilityQueue: [
        { abilityId: 'war-gua-1', abilityName: 'Shield Bash', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-gua-3', abilityName: 'Taunt', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'squishy-mage',
      name: 'Lira Sparkwand',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 10, int: 20, wis: 14, cha: 12 },
      level: 20,
      hp: 45,
      maxHp: 45,
      ac: 12,
      weapon: makeWeapon('Staff', 1, 6, 'str', 1, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: [],
      abilityQueue: [],
      neverRetreat: true,
    },
    {
      id: 'orc-taunt-test',
      name: 'Orc Brute',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 90,
      maxHp: 90,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 41: Anti-Heal Aura (MECH-8) ----
// Tests: cle-hea-1 (Healing Light), cle-hea-3 (Regeneration HoT) blocked by enemy antiHealAura
// Monster has antiHealAura set manually (simulating cle-inq-6 Inquisitors Verdict passive)

const antiHealAura: ScenarioDef = {
  name: 'anti-heal-aura',
  description: 'L30 Cleric/Healer vs L30 enemy with antiHealAura — all healing blocked',
  type: 'DUEL',
  combatants: [
    {
      id: 'healer-blocked',
      name: 'Sister Miriel',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 10, con: 14, int: 14, wis: 20, cha: 14 },
      level: 30,
      hp: 40,
      maxHp: 80,
      ac: 14,
      weapon: makeWeapon('Mace', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Healer',
      unlockedAbilityIds: ['cle-hea-1', 'cle-hea-3'],
      abilityQueue: [
        { abilityId: 'cle-hea-3', abilityName: 'Regeneration', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-hea-1', abilityName: 'Healing Light', priority: 2, useWhen: 'low_hp', hpThreshold: 80 },
      ],
      neverRetreat: true,
    },
    {
      id: 'anti-healer',
      name: 'Plague Knight',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 12, wis: 14, cha: 8 },
      level: 30,
      hp: 100,
      maxHp: 100,
      ac: 15,
      weapon: makeWeapon('Plague Sword', 1, 8, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 42: Poison Charges (MECH-9) ----
// Tests: rog-ass-3 (Poison Blade buff, poisonCharges: 3, dotDamage: 4, dotDuration: 3)
// Then rog-ass-1 (Backstab) attacks to consume charges — each hit applies poisoned status

const poisonCharges: ScenarioDef = {
  name: 'poison-charges',
  description: 'L20 Rogue/Assassin: Poison Blade buff (3 charges) then Backstab attacks — poison applies on each hit',
  type: 'DUEL',
  combatants: [
    {
      id: 'poison-rogue',
      name: 'Viper the Toxic',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 10 },
      level: 20,
      hp: 55,
      maxHp: 55,
      ac: 14,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 5),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-1', 'rog-ass-3'],
      abilityQueue: [
        { abilityId: 'rog-ass-3', abilityName: 'Poison Blade', priority: 1, useWhen: 'first_round' },
        { abilityId: 'rog-ass-1', abilityName: 'Backstab', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-poison-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 13,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 43: Extra Action (MECH-10) ----
// Tests: mag-enc-3 (Haste, extraAction duration: 1), mag-enc-1 (Arcane Bolt, autoHit)
// On Haste turn, actor gets primary action + bonus basic attack

const extraActionAttack: ScenarioDef = {
  name: 'extra-action-attack',
  description: 'L25 Mage/Enchanter casts Haste for extraAction — bonus basic attack after primary action, no infinite loop',
  type: 'DUEL',
  combatants: [
    {
      id: 'haste-mage',
      name: 'Blaze the Swift',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 12 },
      level: 25,
      hp: 60,
      maxHp: 60,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 1, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Mage',
      specialization: 'Enchanter',
      unlockedAbilityIds: ['mag-enc-1', 'mag-enc-3'],
      abilityQueue: [
        { abilityId: 'mag-enc-3', abilityName: 'Haste', priority: 1, useWhen: 'first_round' },
        { abilityId: 'mag-enc-1', abilityName: 'Arcane Bolt', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-extra-test',
      name: 'Orc Warboss',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 18, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 110,
      maxHp: 110,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 44: Stacking Attack Speed (MECH-11) ----
// Tests: rog-swa-5 (Dance of Steel, stackingAttackSpeed maxStacks: 5, duration: 5)
// Each hit increments stacks, ATK grows by +2 per stack, caps at 5

const stackingAttackSpeed: ScenarioDef = {
  name: 'stacking-attack-speed',
  description: 'L30 Rogue/Swashbuckler with Dance of Steel — stacking attack speed +2 per hit, max 5 stacks',
  type: 'DUEL',
  combatants: [
    {
      id: 'speed-rogue',
      name: 'Zara Quickstrike',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 12 },
      level: 30,
      hp: 65,
      maxHp: 65,
      ac: 15,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 4),
      race: 'elf',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-5'],
      abilityQueue: [
        { abilityId: 'rog-swa-5', abilityName: 'Dance of Steel', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-speed-test',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 25,
      hp: 100,
      maxHp: 100,
      ac: 13,
      weapon: makeWeapon('Battleaxe', 1, 10, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 45: Charm Effectiveness + Holy Damage (MECH-3, MECH-6) ----
// Tests: bar-dip-5 (Enthrall, mesmerize 3 rounds), bar-dip-6 (charmEffectiveness passive +50% duration)
// cle-pal-1 (Smite, radiant), cle-pal-6 (Avatar of Light, holyDamageBonus: 0.25 passive)

const charmHoly: ScenarioDef = {
  name: 'charm-holy',
  description: 'L40 Bard/Diplomat (charmEffectiveness) + L40 Cleric/Paladin (holyDamageBonus) vs L35 Orc — extended CC + radiant bonus',
  type: 'PVE',
  combatants: [
    {
      id: 'bard-charm',
      name: 'Lyric Goldtongue',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 14, con: 12, int: 14, wis: 12, cha: 20 },
      level: 40,
      hp: 65,
      maxHp: 65,
      ac: 13,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 2),
      race: 'halfling',
      characterClass: 'Bard',
      specialization: 'Diplomat',
      unlockedAbilityIds: ['bar-dip-1', 'bar-dip-5', 'bar-dip-6'],
      abilityQueue: [
        { abilityId: 'bar-dip-5', abilityName: 'Enthrall', priority: 1, useWhen: 'first_round' },
        { abilityId: 'bar-dip-1', abilityName: 'Charming Words', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'holy-cleric',
      name: 'Father Radiance',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 10, con: 14, int: 12, wis: 20, cha: 14 },
      level: 40,
      hp: 80,
      maxHp: 80,
      ac: 16,
      weapon: makeWeapon('Mace', 1, 8, 'str', 3, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Paladin',
      unlockedAbilityIds: ['cle-pal-1', 'cle-pal-6'],
      abilityQueue: [
        { abilityId: 'cle-pal-1', abilityName: 'Smite', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-charm-test',
      name: 'Orc Champion',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 7, wis: 8, cha: 8 },
      level: 35,
      hp: 120,
      maxHp: 120,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 6),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

const custom: ScenarioDef = {
  name: 'custom',
  description: 'User-defined scenario loaded from --config=path.json',
  type: 'DUEL',
  combatants: [], // Populated from config file
};

// ========== Phase 6: Coverage Expansion Scenarios (S46-S58) ==========

// ---- Scenario 46: Battlechanter Full Kit ----
// Tests: ALL bar-bat-1 through bar-bat-6 + stackingDamagePerRound, damage_debuff handler, aoe_damage bonusPerRound
const battlechanterFullKit: ScenarioDef = {
  name: 'battlechanter-full-kit',
  description: 'L40 Bard/Battlechanter full kit — War Song, Discordant Note, Shatter, Epic Finale + Crescendo passive',
  type: 'DUEL',
  combatants: [
    {
      id: 'battlechanter-main',
      name: 'Cadence Stormsong',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 16, con: 14, int: 12, wis: 10, cha: 20 },
      level: 40,
      hp: 90,
      maxHp: 90,
      ac: 15,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 4),
      race: 'human',
      characterClass: 'Bard',
      specialization: 'Battlechanter',
      unlockedAbilityIds: ['bar-bat-1', 'bar-bat-2', 'bar-bat-3', 'bar-bat-4', 'bar-bat-5', 'bar-bat-6'],
      abilityQueue: [
        { abilityId: 'bar-bat-1', abilityName: 'War Song', priority: 1, useWhen: 'first_round' },
        { abilityId: 'bar-bat-4', abilityName: 'Shatter', priority: 2, useWhen: 'always' },
        { abilityId: 'bar-bat-2', abilityName: 'Discordant Note', priority: 3, useWhen: 'always' },
        { abilityId: 'bar-bat-6', abilityName: 'Epic Finale', priority: 4, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-battlechanter',
      name: 'Training Dummy',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 10, con: 20, int: 5, wis: 5, cha: 5 },
      level: 35,
      hp: 200,
      maxHp: 200,
      ac: 10,
      weapon: makeWeapon('Fists', 1, 4, 'str'),
      stance: 'BALANCED',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 47: Healer Full Kit ----
// Tests: ALL cle-hea-1 through cle-hea-6 + hot handler, cleanse handler, Resurrection passive
const healerFullKit: ScenarioDef = {
  name: 'healer-full-kit',
  description: 'L40 Cleric/Healer full kit — Miracle, Purify, Regeneration, Divine Shield, Healing Light + Resurrection passive',
  type: 'DUEL',
  combatants: [
    {
      id: 'healer-fullkit',
      name: 'Sister Luminara',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 10, con: 16, int: 12, wis: 20, cha: 16 },
      level: 40,
      hp: 30,     // Start at ~30% of 100 HP to trigger low_hp abilities
      maxHp: 100,
      ac: 16,
      weapon: makeWeapon('Holy Mace', 1, 6, 'str', 3, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Healer',
      unlockedAbilityIds: ['cle-hea-1', 'cle-hea-2', 'cle-hea-3', 'cle-hea-4', 'cle-hea-5', 'cle-hea-6'],
      abilityQueue: [
        { abilityId: 'cle-hea-6', abilityName: 'Miracle', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-hea-2', abilityName: 'Purify', priority: 2, useWhen: 'always' },
        { abilityId: 'cle-hea-3', abilityName: 'Regeneration', priority: 3, useWhen: 'always' },
        { abilityId: 'cle-hea-4', abilityName: 'Divine Shield', priority: 4, useWhen: 'always' },
        { abilityId: 'cle-hea-1', abilityName: 'Healing Light', priority: 5, useWhen: 'always' },
      ],
      statusEffects: [
        { id: 'poison-pre', name: 'poisoned', remainingRounds: 3, damagePerRound: 3, sourceId: 'dummy-healer' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-healer',
      name: 'Plague Zombie',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 8, con: 18, int: 5, wis: 5, cha: 5 },
      level: 35,
      hp: 120,
      maxHp: 120,
      ac: 10,
      weapon: makeWeapon('Claws', 1, 6, 'str', 2),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 48: Lorekeeper Full Kit ----
// Tests: bar-lor-1 (Analyze, consumeOnUse), bar-lor-3 (Exploit Weakness, requiresAnalyze),
//        bar-lor-4 (Arcane Insight, nextCooldownHalved), bar-lor-5 (Tome of Secrets)
const lorekeeperFullKit: ScenarioDef = {
  name: 'lorekeeper-full-kit',
  description: 'L40 Bard/Lorekeeper — Analyze consumeOnUse, Exploit Weakness requiresAnalyze, Arcane Insight nextCooldownHalved',
  type: 'DUEL',
  combatants: [
    {
      id: 'lorekeeper-main',
      name: 'Theomund the Sage',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 14, con: 12, int: 20, wis: 16, cha: 18 },
      level: 40,
      hp: 75,
      maxHp: 75,
      ac: 14,
      weapon: makeWeapon('Quarterstaff', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      race: 'gnome',
      characterClass: 'Bard',
      specialization: 'Lorekeeper',
      unlockedAbilityIds: ['bar-lor-1', 'bar-lor-2', 'bar-lor-3', 'bar-lor-4', 'bar-lor-5', 'bar-lor-6'],
      abilityQueue: [
        { abilityId: 'bar-lor-1', abilityName: 'Analyze', priority: 1, useWhen: 'first_round' },
        { abilityId: 'bar-lor-3', abilityName: 'Exploit Weakness', priority: 2, useWhen: 'always' },
        { abilityId: 'bar-lor-4', abilityName: 'Arcane Insight', priority: 3, useWhen: 'always' },
        { abilityId: 'bar-lor-5', abilityName: 'Tome of Secrets', priority: 4, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-lorekeeper',
      name: 'Training Golem',
      entityType: 'monster',
      team: 1,
      stats: { str: 14, dex: 8, con: 20, int: 5, wis: 5, cha: 5 },
      level: 35,
      hp: 180,
      maxHp: 180,
      ac: 12,
      weapon: makeWeapon('Stone Fist', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      stance: 'BALANCED',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 49: Warlord Full Kit ----
// Tests: ALL war-war-1 through war-war-6 + extraAction, guaranteedHits, hpRegenPerRound
const warlordFullKit: ScenarioDef = {
  name: 'warlord-full-kit',
  description: 'L40 Warrior/Warlord — Rally Cry, Tactical Advance extraAction, Warlords Decree guaranteedHits, Legendary Commander',
  type: 'DUEL',
  combatants: [
    {
      id: 'warlord-main',
      name: 'General Theron',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 14, con: 18, int: 14, wis: 14, cha: 16 },
      level: 40,
      hp: 55,     // Start at ~50% HP so Legendary Commander can trigger
      maxHp: 110,
      ac: 18,
      weapon: makeWeapon('Greatsword', 2, 6, 'str', 5),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Warlord',
      unlockedAbilityIds: ['war-war-1', 'war-war-2', 'war-war-3', 'war-war-4', 'war-war-5', 'war-war-6'],
      abilityQueue: [
        { abilityId: 'war-war-1', abilityName: 'Rally Cry', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-war-3', abilityName: 'Tactical Advance', priority: 2, useWhen: 'always' },
        { abilityId: 'war-war-5', abilityName: 'Warlords Decree', priority: 3, useWhen: 'always' },
        { abilityId: 'war-war-2', abilityName: 'Commanding Strike', priority: 4, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-warlord',
      name: 'Training Golem',
      entityType: 'monster',
      team: 1,
      stats: { str: 14, dex: 10, con: 20, int: 5, wis: 5, cha: 5 },
      level: 35,
      hp: 200,
      maxHp: 200,
      ac: 12,
      weapon: makeWeapon('Stone Fist', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      stance: 'BALANCED',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 50: Taunt + Heal + Anti-Heal ----
// Tests: war-gua-3 (Taunt), cle-hea-1, cle-hea-3 (heal/HoT) blocked by enemy antiHealAura
const tauntHealAntiheal: ScenarioDef = {
  name: 'taunt-heal-antiheal',
  description: '2v1 — Guardian taunts, Healer tries healing but enemy has antiHealAura',
  type: 'ARENA',
  combatants: [
    {
      id: 'guardian-taunt2',
      name: 'Ser Brannok',
      entityType: 'character',
      team: 0,
      stats: { str: 16, dex: 10, con: 20, int: 10, wis: 14, cha: 14 },
      level: 20,
      hp: 100,
      maxHp: 100,
      ac: 18,
      weapon: makeWeapon('Sword & Shield', 1, 8, 'str', 3),
      race: 'dwarf',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-1', 'war-gua-2', 'war-gua-3'],
      abilityQueue: [
        { abilityId: 'war-gua-3', abilityName: 'Taunt', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-gua-2', abilityName: 'Fortify', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'healer-taunt2',
      name: 'Sister Miriel',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 10, con: 14, int: 14, wis: 20, cha: 14 },
      level: 20,
      hp: 35,
      maxHp: 60,
      ac: 14,
      weapon: makeWeapon('Mace', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Healer',
      unlockedAbilityIds: ['cle-hea-1', 'cle-hea-3'],
      abilityQueue: [
        { abilityId: 'cle-hea-3', abilityName: 'Regeneration', priority: 1, useWhen: 'always' },
        { abilityId: 'cle-hea-1', abilityName: 'Healing Light', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'anti-heal-orc',
      name: 'Orc Inquisitor',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 18, int: 10, wis: 14, cha: 8 },
      level: 25,
      hp: 110,
      maxHp: 110,
      ac: 14,
      weapon: makeWeapon('Warhammer', 1, 10, 'str', 4, 0, 'BLUDGEONING'),
      stance: 'AGGRESSIVE',
      antiHealAura: true,
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 51: Counter + Reflect Loop Prevention ----
// Tests: rog-swa-1 (Riposte counter) vs war-gua-5 (Iron Bulwark reflect) — no infinite loop
const counterReflectLoop: ScenarioDef = {
  name: 'counter-reflect-loop',
  description: 'L30 Rogue/Swashbuckler (Riposte) vs L30 Guardian (Iron Bulwark) — counter+reflect terminates cleanly',
  type: 'DUEL',
  combatants: [
    {
      id: 'rogue-counter',
      name: 'Vex Swiftblade',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 20, con: 14, int: 10, wis: 12, cha: 14 },
      level: 30,
      hp: 80,
      maxHp: 80,
      ac: 16,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 4),
      race: 'human',
      characterClass: 'Rogue',
      specialization: 'Swashbuckler',
      unlockedAbilityIds: ['rog-swa-1', 'rog-swa-2', 'rog-swa-3'],
      abilityQueue: [
        { abilityId: 'rog-swa-1', abilityName: 'Riposte', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'guardian-reflect',
      name: 'Ser Ironwall',
      entityType: 'character',
      team: 1,
      stats: { str: 18, dex: 10, con: 20, int: 10, wis: 14, cha: 12 },
      level: 30,
      hp: 120,
      maxHp: 120,
      ac: 20,
      weapon: makeWeapon('Sword & Shield', 1, 8, 'str', 4),
      race: 'dwarf',
      characterClass: 'Warrior',
      specialization: 'Guardian',
      unlockedAbilityIds: ['war-gua-1', 'war-gua-5'],
      abilityQueue: [
        { abilityId: 'war-gua-5', abilityName: 'Iron Bulwark', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-gua-1', abilityName: 'Shield Bash', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 52: Stealth vs AoE ----
// Tests: rog-ass-2 (Vanish stealth) vs mag-ele-1 (Fireball AoE) interaction
const stealthVsAoe: ScenarioDef = {
  name: 'stealth-vs-aoe',
  description: '2v2 — Stealthed Rogue vs Fireball AoE — does AoE hit stealthed targets?',
  type: 'ARENA',
  combatants: [
    {
      id: 'rogue-stealth-aoe',
      name: 'Shadow Veil',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 12, int: 10, wis: 14, cha: 10 },
      level: 20,
      hp: 55,
      maxHp: 55,
      ac: 16,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 3),
      race: 'elf',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-2', 'rog-ass-4'],
      abilityQueue: [
        { abilityId: 'rog-ass-2', abilityName: 'Vanish', priority: 1, useWhen: 'first_round' },
        { abilityId: 'rog-ass-4', abilityName: 'Ambush', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'warrior-stealth-ally',
      name: 'Orc Grunt',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 10, con: 16, int: 8, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 3),
      race: 'orc',
      characterClass: 'Warrior',
      neverRetreat: true,
    },
    {
      id: 'mage-aoe',
      name: 'Pyra Flamecaster',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 10 },
      level: 20,
      hp: 50,
      maxHp: 50,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 1, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: ['mag-ele-1'],
      abilityQueue: [
        { abilityId: 'mag-ele-1', abilityName: 'Fireball', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-aoe-ally',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 16, int: 8, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 53: Buff Stack Overflow ----
// Tests: war-war-1 (Rally Cry) + bar-bat-1 (War Song) + war-ber-2 (Blood Rage) stacking
const buffStackOverflow: ScenarioDef = {
  name: 'buff-stack-overflow',
  description: '3v1 — Rally Cry + War Song + Blood Rage all stacking ATK buffs on Berserker',
  type: 'ARENA',
  combatants: [
    {
      id: 'warlord-buff',
      name: 'General Theron',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 14, wis: 14, cha: 16 },
      level: 30,
      hp: 90,
      maxHp: 90,
      ac: 17,
      weapon: makeWeapon('Longsword', 1, 8, 'str', 4),
      race: 'human',
      characterClass: 'Warrior',
      specialization: 'Warlord',
      unlockedAbilityIds: ['war-war-1'],
      abilityQueue: [
        { abilityId: 'war-war-1', abilityName: 'Rally Cry', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'battlechanter-buff',
      name: 'Cadence Stormsong',
      entityType: 'character',
      team: 0,
      stats: { str: 12, dex: 16, con: 14, int: 12, wis: 10, cha: 18 },
      level: 30,
      hp: 75,
      maxHp: 75,
      ac: 15,
      weapon: makeWeapon('Rapier', 1, 8, 'dex', 3),
      race: 'human',
      characterClass: 'Bard',
      specialization: 'Battlechanter',
      unlockedAbilityIds: ['bar-bat-1'],
      abilityQueue: [
        { abilityId: 'bar-bat-1', abilityName: 'War Song', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'berserker-buff',
      name: 'Grukk Bloodfist',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 14, con: 18, int: 8, wis: 10, cha: 8 },
      level: 30,
      hp: 100,
      maxHp: 100,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      race: 'orc',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1', 'war-ber-2'],
      abilityQueue: [
        { abilityId: 'war-ber-2', abilityName: 'Blood Rage', priority: 1, useWhen: 'first_round' },
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'golem-buff-test',
      name: 'Iron Golem',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 6, con: 22, int: 3, wis: 5, cha: 3 },
      level: 40,
      hp: 300,
      maxHp: 300,
      ac: 14,
      weapon: makeWeapon('Iron Slam', 2, 8, 'str', 4, 0, 'BLUDGEONING'),
      stance: 'BALANCED',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 54: Companion + AoE Interaction ----
// Tests: ran-bea-5 (Alpha Predator companion) vs mag-ele-1 (Fireball AoE)
const companionAoeInteraction: ScenarioDef = {
  name: 'companion-aoe-interaction',
  description: '2v2 — Beastmaster companion vs Fireball AoE interaction',
  type: 'ARENA',
  combatants: [
    {
      id: 'beastmaster-aoe',
      name: 'Kael Wildrun',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 18, con: 14, int: 10, wis: 16, cha: 10 },
      level: 30,
      hp: 80,
      maxHp: 80,
      ac: 15,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 4),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Beastmaster',
      unlockedAbilityIds: ['ran-bea-4', 'ran-bea-5'],
      abilityQueue: [
        { abilityId: 'ran-bea-5', abilityName: 'Alpha Predator', priority: 1, useWhen: 'first_round' },
        { abilityId: 'ran-bea-4', abilityName: 'Bestial Fury', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'warrior-comp-ally',
      name: 'Ser Rowan',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 10, wis: 10, cha: 10 },
      level: 30,
      hp: 90,
      maxHp: 90,
      ac: 17,
      weapon: makeWeapon('Longsword', 1, 8, 'str', 4),
      race: 'human',
      characterClass: 'Warrior',
      neverRetreat: true,
    },
    {
      id: 'mage-comp-aoe',
      name: 'Ignis Spellfire',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 14, cha: 10 },
      level: 30,
      hp: 60,
      maxHp: 60,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 1, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Elementalist',
      unlockedAbilityIds: ['mag-ele-1'],
      abilityQueue: [
        { abilityId: 'mag-ele-1', abilityName: 'Fireball', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-comp-ally',
      name: 'Orc Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 8, wis: 10, cha: 8 },
      level: 30,
      hp: 90,
      maxHp: 90,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 55: Death Prevention + Drain ----
// Tests: war-ber-6 (Undying Fury cheatingDeath) + mag-nec-1 (Life Drain) interaction
const deathPreventionDrain: ScenarioDef = {
  name: 'death-prevention-drain',
  description: 'L40 Berserker (8 HP, cheatingDeath) vs L40 Necromancer (Life Drain) — death prevention + drain interaction',
  type: 'DUEL',
  combatants: [
    {
      id: 'berserker-death',
      name: 'Grukk Undying',
      entityType: 'character',
      team: 0,
      stats: { str: 20, dex: 12, con: 20, int: 8, wis: 10, cha: 8 },
      level: 40,
      hp: 8,       // Very low to trigger death prevention quickly
      maxHp: 120,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      race: 'orc',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1', 'war-ber-6'],
      abilityQueue: [
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'necro-drain',
      name: 'Lord Malachar',
      entityType: 'character',
      team: 1,
      stats: { str: 10, dex: 12, con: 14, int: 20, wis: 16, cha: 12 },
      level: 40,
      hp: 100,
      maxHp: 100,
      ac: 15,
      weapon: makeWeapon('Shadow Staff', 1, 6, 'str', 2, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Mage',
      specialization: 'Necromancer',
      unlockedAbilityIds: ['mag-nec-1'],
      abilityQueue: [
        { abilityId: 'mag-nec-1', abilityName: 'Life Drain', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 56: Poison + Stealth Chain (Full Assassin Kit) ----
// Tests: rog-ass-3 (Poison Blade), rog-ass-2 (Vanish), rog-ass-4 (Ambush), rog-ass-6 (Shadow Mastery passive)
const poisonStealthChain: ScenarioDef = {
  name: 'poison-stealth-chain',
  description: 'L30 Rogue/Assassin full kit — Poison Blade charges, Vanish stealth, Ambush 3x from stealth, Shadow Mastery crit passive',
  type: 'DUEL',
  combatants: [
    {
      id: 'assassin-chain',
      name: 'Nyxara Shadowblade',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 20, con: 14, int: 14, wis: 12, cha: 10 },
      level: 30,
      hp: 70,
      maxHp: 70,
      ac: 17,
      weapon: makeWeapon('Poisoned Dagger', 1, 4, 'dex', 4),
      race: 'elf',
      characterClass: 'Rogue',
      specialization: 'Assassin',
      unlockedAbilityIds: ['rog-ass-1', 'rog-ass-2', 'rog-ass-3', 'rog-ass-4', 'rog-ass-6'],
      abilityQueue: [
        { abilityId: 'rog-ass-3', abilityName: 'Poison Blade', priority: 1, useWhen: 'first_round' },
        { abilityId: 'rog-ass-2', abilityName: 'Vanish', priority: 2, useWhen: 'always' },
        { abilityId: 'rog-ass-4', abilityName: 'Ambush', priority: 3, useWhen: 'always' },
        { abilityId: 'rog-ass-1', abilityName: 'Backstab', priority: 4, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-assassin',
      name: 'Training Dummy',
      entityType: 'monster',
      team: 1,
      stats: { str: 14, dex: 10, con: 18, int: 5, wis: 5, cha: 5 },
      level: 30,
      hp: 150,
      maxHp: 150,
      ac: 12,
      weapon: makeWeapon('Fists', 1, 4, 'str', 2),
      stance: 'BALANCED',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 57: Paladin Holy Kit ----
// Tests: ALL cle-pal-1 through cle-pal-6 + holyDamageBonus on all radiant abilities
const paladinHolyKit: ScenarioDef = {
  name: 'paladin-holy-kit',
  description: 'L40 Cleric/Paladin full kit — Smite, Holy Armor, Consecrate, Judgment drain, Divine Wrath AoE + Avatar of Light passive',
  type: 'DUEL',
  combatants: [
    {
      id: 'paladin-holy',
      name: 'Sir Aldric the Radiant',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 10, con: 16, int: 12, wis: 18, cha: 16 },
      level: 40,
      hp: 100,
      maxHp: 100,
      ac: 20,
      weapon: makeWeapon('Holy Warhammer', 1, 10, 'str', 5, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Paladin',
      unlockedAbilityIds: ['cle-pal-1', 'cle-pal-2', 'cle-pal-3', 'cle-pal-4', 'cle-pal-5', 'cle-pal-6'],
      abilityQueue: [
        { abilityId: 'cle-pal-2', abilityName: 'Holy Armor', priority: 1, useWhen: 'first_round' },
        { abilityId: 'cle-pal-3', abilityName: 'Consecrate', priority: 2, useWhen: 'always' },
        { abilityId: 'cle-pal-1', abilityName: 'Smite', priority: 3, useWhen: 'always' },
        { abilityId: 'cle-pal-4', abilityName: 'Judgment', priority: 4, useWhen: 'always' },
        { abilityId: 'cle-pal-5', abilityName: 'Divine Wrath', priority: 5, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'skeleton-paladin',
      name: 'Skeleton Warrior',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 12, con: 16, int: 6, wis: 8, cha: 5 },
      level: 35,
      hp: 150,
      maxHp: 150,
      ac: 14,
      weapon: makeWeapon('Rusted Longsword', 1, 8, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Scenario 58: Hunter's Mark + Advantage + First Strike Crit ----
// Tests: ran-tra-3 (Hunter's Mark bonusDamageFromYou), ran-tra-5 (advantageVsLowHp), ran-tra-6 (firstStrikeCrit)
const hunterMarkAdvantage: ScenarioDef = {
  name: 'hunter-mark-advantage',
  description: 'L40 Ranger/Tracker — first strike auto-crit, Hunter Mark +4 bonus damage, advantage vs low HP target',
  type: 'DUEL',
  combatants: [
    {
      id: 'tracker-mark',
      name: 'Fen Stalker',
      entityType: 'character',
      team: 0,
      stats: { str: 14, dex: 20, con: 14, int: 12, wis: 18, cha: 10 },
      level: 40,
      hp: 85,
      maxHp: 85,
      ac: 16,
      weapon: makeWeapon('Longbow', 1, 8, 'dex', 5),
      race: 'elf',
      characterClass: 'Ranger',
      specialization: 'Tracker',
      unlockedAbilityIds: ['ran-tra-1', 'ran-tra-3', 'ran-tra-5', 'ran-tra-6'],
      abilityQueue: [
        { abilityId: 'ran-tra-3', abilityName: 'Hunters Mark', priority: 1, useWhen: 'first_round' },
        { abilityId: 'ran-tra-1', abilityName: 'Lay Trap', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-mark-test',
      name: 'Wounded Orc',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 35,
      hp: 45,      // Start at ~40% of 110 to trigger advantageVsLowHp
      maxHp: 110,
      ac: 13,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// ---- Phase 7 Scenarios: 5 Previously Untested Handlers (S59-S65) ----

// S59: Temporal Echo replays a psion ability
const echoReplay: ScenarioDef = {
  name: 'echo-replay',
  description: 'L28 Psion/Seer — Foresight → Mind Spike → Temporal Echo (replays Mind Spike)',
  type: 'DUEL',
  combatants: [
    {
      id: 'seer-echo',
      name: 'Chronos Veil',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 18, cha: 10 },
      level: 28,
      hp: 65,
      maxHp: 65,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Psion',
      specialization: 'Seer',
      unlockedAbilityIds: ['psi-tel-1', 'psi-see-5'],
      abilityQueue: [
        // Round 1: Mind Spike fires (sets lastAction for echo)
        { abilityId: 'psi-tel-1', abilityName: 'Mind Spike', priority: 1, useWhen: 'first_round' },
        // Round 2+: Temporal Echo replays Mind Spike
        { abilityId: 'psi-see-5', abilityName: 'Temporal Echo', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-echo',
      name: 'Training Dummy',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 10, con: 18, int: 6, wis: 8, cha: 6 },
      level: 20,
      hp: 200,
      maxHp: 200,
      ac: 8,
      weapon: makeWeapon('Slam', 1, 4, 'str'),
      neverRetreat: true,
    },
  ],
};

// S60: Temporal Echo with no prior action (edge case — no-op)
const echoNoPrevious: ScenarioDef = {
  name: 'echo-no-previous',
  description: 'L28 Psion/Seer — Temporal Echo as first action (no previous action to repeat)',
  type: 'DUEL',
  combatants: [
    {
      id: 'seer-echo-noop',
      name: 'Hasty Oracle',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 14, con: 12, int: 20, wis: 18, cha: 10 },
      level: 28,
      hp: 65,
      maxHp: 65,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Psion',
      specialization: 'Seer',
      unlockedAbilityIds: ['psi-see-5'],
      abilityQueue: [
        { abilityId: 'psi-see-5', abilityName: 'Temporal Echo', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'dummy-echo-noop',
      name: 'Training Dummy',
      entityType: 'monster',
      team: 1,
      stats: { str: 10, dex: 10, con: 18, int: 6, wis: 8, cha: 6 },
      level: 20,
      hp: 200,
      maxHp: 200,
      ac: 8,
      weapon: makeWeapon('Slam', 1, 4, 'str'),
      neverRetreat: true,
    },
  ],
};

// S61: Translocation vs enemy — INT save, stun on fail
const swapEnemyStun: ScenarioDef = {
  name: 'swap-enemy-stun',
  description: 'L18 Psion/Nomad — Translocation vs enemy (INT save, stunned 1 round on fail)',
  type: 'DUEL',
  combatants: [
    {
      id: 'nomad-swap',
      name: 'Warp Strider',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 16, con: 12, int: 20, wis: 14, cha: 10 },
      level: 18,
      hp: 50,
      maxHp: 50,
      ac: 14,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex'),
      race: 'gnome',
      characterClass: 'Psion',
      specialization: 'Nomad',
      unlockedAbilityIds: ['psi-nom-1', 'psi-nom-4'],
      abilityQueue: [
        { abilityId: 'psi-nom-4', abilityName: 'Translocation', priority: 1, useWhen: 'first_round' },
        { abilityId: 'psi-nom-1', abilityName: 'Blink Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-swap-enemy',
      name: 'Orc Brute',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 18,
      hp: 80,
      maxHp: 80,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// S62: Translocation with ally — both caster and ally get +2 AC buff
const swapAllyShield: ScenarioDef = {
  name: 'swap-ally-shield',
  description: '2v1: L18 Psion/Nomad + L18 Warrior vs L20 Orc — Translocation ally gives +2 AC buff',
  type: 'ARENA',
  combatants: [
    {
      id: 'nomad-swap-ally',
      name: 'Warp Guardian',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 16, con: 12, int: 20, wis: 14, cha: 10 },
      level: 18,
      hp: 50,
      maxHp: 50,
      ac: 14,
      weapon: makeWeapon('Short Sword', 1, 6, 'dex'),
      race: 'gnome',
      characterClass: 'Psion',
      specialization: 'Nomad',
      unlockedAbilityIds: ['psi-nom-1', 'psi-nom-4'],
      abilityQueue: [
        { abilityId: 'psi-nom-4', abilityName: 'Translocation', priority: 1, useWhen: 'first_round', targetAlly: true },
        { abilityId: 'psi-nom-1', abilityName: 'Blink Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'warrior-swap-ally',
      name: 'Shield Bearer',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 10, wis: 12, cha: 10 },
      level: 18,
      hp: 90,
      maxHp: 90,
      ac: 18,
      weapon: makeWeapon('Longsword', 1, 8, 'str', 4),
      neverRetreat: true,
    },
    {
      id: 'orc-swap-ally',
      name: 'Orc Warlord',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 8, wis: 10, cha: 8 },
      level: 20,
      hp: 100,
      maxHp: 100,
      ac: 15,
      weapon: makeWeapon('Warhammer', 1, 10, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// S63: Banishment full cycle — banish 3 rounds, return with damage + stun
const banishFullCycle: ScenarioDef = {
  name: 'banish-full-cycle',
  description: 'L40 Psion/Nomad — Banishment vs L35 Orc (3 round void, return 4d6 + stunned)',
  type: 'DUEL',
  combatants: [
    {
      id: 'nomad-banish',
      name: 'Void Caller',
      entityType: 'character',
      team: 0,
      stats: { str: 8, dex: 16, con: 14, int: 22, wis: 16, cha: 10 },
      level: 40,
      hp: 85,
      maxHp: 85,
      ac: 15,
      weapon: makeWeapon('Crystal Blade', 1, 6, 'dex', 3),
      race: 'gnome',
      characterClass: 'Psion',
      specialization: 'Nomad',
      unlockedAbilityIds: ['psi-nom-1', 'psi-nom-6'],
      abilityQueue: [
        { abilityId: 'psi-nom-6', abilityName: 'Banishment', priority: 1, useWhen: 'first_round' },
        { abilityId: 'psi-nom-1', abilityName: 'Blink Strike', priority: 2, useWhen: 'always' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-banish-target',
      name: 'Orc Chieftain',
      entityType: 'monster',
      team: 1,
      stats: { str: 20, dex: 10, con: 18, int: 7, wis: 10, cha: 8 },
      level: 35,
      hp: 130,
      maxHp: 130,
      ac: 15,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 5),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// S64: Thief Disengage flee (90% success)
const fleeDisengage: ScenarioDef = {
  name: 'flee-disengage',
  description: 'L22 Rogue/Thief — Disengage flee attempt (90% success), hasFled removes from combat',
  type: 'PVE',
  combatants: [
    {
      id: 'thief-flee',
      name: 'Shadow Runner',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 10 },
      level: 22,
      hp: 55,
      maxHp: 55,
      ac: 15,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 4),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Thief',
      unlockedAbilityIds: ['rog-thi-1', 'rog-thi-2', 'rog-thi-4'],
      abilityQueue: [
        { abilityId: 'rog-thi-4', abilityName: 'Disengage', priority: 1, useWhen: 'always' },
      ],
      neverRetreat: true, // Let the ability handle flee, not the retreat system
    },
    {
      id: 'orc-flee-test',
      name: 'Orc Pursuer',
      entityType: 'monster',
      team: 1,
      stats: { str: 18, dex: 10, con: 16, int: 7, wis: 10, cha: 8 },
      level: 20,
      hp: 80,
      maxHp: 80,
      ac: 14,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 4),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
  ],
};

// S65: Smoke Bomb AoE debuff — applies blinded to all enemies + immuneBlinded immunity test
const smokeBombAoe: ScenarioDef = {
  name: 'smoke-bomb-aoe',
  description: '1v2: L14 Rogue/Thief Smoke Bomb — blinded on normal enemy, blocked by immuneBlinded Psion',
  type: 'PVE',
  combatants: [
    {
      id: 'thief-smoke',
      name: 'Smoke Artist',
      entityType: 'character',
      team: 0,
      stats: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 10 },
      level: 14,
      hp: 40,
      maxHp: 40,
      ac: 15,
      weapon: makeWeapon('Dagger', 1, 4, 'dex', 4),
      race: 'halfling',
      characterClass: 'Rogue',
      specialization: 'Thief',
      unlockedAbilityIds: ['rog-thi-1', 'rog-thi-2'],
      abilityQueue: [
        { abilityId: 'rog-thi-2', abilityName: 'Smoke Bomb', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
    {
      id: 'orc-smoke-1',
      name: 'Orc Grunt',
      entityType: 'monster',
      team: 1,
      stats: { str: 16, dex: 10, con: 14, int: 7, wis: 10, cha: 8 },
      level: 14,
      hp: 55,
      maxHp: 55,
      ac: 13,
      weapon: makeWeapon('Handaxe', 1, 6, 'str', 3),
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'psion-smoke-immune',
      name: 'Third Eye Psion',
      entityType: 'character',
      team: 1,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 16, cha: 10 },
      level: 18,
      hp: 50,
      maxHp: 50,
      ac: 13,
      weapon: makeWeapon('Staff', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'elf',
      characterClass: 'Psion',
      specialization: 'Seer',
      // Third Eye passive grants immuneBlinded
      unlockedAbilityIds: ['psi-see-1', 'psi-see-4'],
      abilityQueue: [
        { abilityId: 'psi-see-1', abilityName: 'Foresight', priority: 1, useWhen: 'first_round' },
      ],
      neverRetreat: true,
    },
  ],
};

// ---- Scenario Registry ----

export const SCENARIOS: Record<string, ScenarioDef> = {
  'basic-melee': basicMelee,
  'spell-vs-melee': spellVsMelee,
  'status-effects': statusEffects,
  'flee-test': fleeTest,
  'racial-abilities': racialAbilities,
  'team-fight': teamFight,
  'class-abilities': classAbilities,
  'aoe-abilities': aoeAbilities,
  'multi-attack': multiAttack,
  'counter-trap': counterTrap,
  'companion': companion,
  'special-abilities': specialAbilities,
  'death-prevention': deathPrevention,
  'psion-telepath': psionTelepath,
  'psion-seer-nomad': psionSeerNomad,
  'drain-heal-loop': drainHealLoop,
  'delayed-damage': delayedDamage,
  'dispel-and-cleanse': dispelAndCleanse,
  'absorption-shield': absorptionShield,
  'aoe-dot-consecrate': aoeDotConsecrate,
  'cooldown-reduction': cooldownReduction,
  'nethkin-counter-stack': nethkinCounterStack,
  'multi-buff-stack': multiBuffStack,
  'mutual-kill': mutualKill,
  'drain-heal-fixed': drainHealFixed,
  'reckless-strike-penalty': recklessStrikePenalty,
  'cc-immune-berserker': ccImmuneBerserker,
  'guaranteed-hits-warlord': guaranteedHitsWarlord,
  'dodge-evasion': dodgeEvasion,
  'damage-reflect-bulwark': damageReflectBulwark,
  'stealth-vanish': stealthVanish,
  'ambush-stealth-chain': ambushStealthChain,
  'aimed-shot-accuracy': aimedShotAccuracy,
  'penance-debuff-bonus': penanceDebuffBonus,
  // Phase 5B scenarios
  'crit-first-strike': critFirstStrike,
  'permanent-companion': permanentCompanion,
  'stacking-damage': stackingDamage,
  'advantage-low-hp': advantageLowHp,
  'consume-and-cooldown': consumeAndCooldown,
  'taunt-enforcement': tauntEnforcement,
  'anti-heal-aura': antiHealAura,
  'poison-charges': poisonCharges,
  'extra-action-attack': extraActionAttack,
  'stacking-attack-speed': stackingAttackSpeed,
  'charm-holy': charmHoly,
  // Phase 6 scenarios
  'battlechanter-full-kit': battlechanterFullKit,
  'healer-full-kit': healerFullKit,
  'lorekeeper-full-kit': lorekeeperFullKit,
  'warlord-full-kit': warlordFullKit,
  'taunt-heal-antiheal': tauntHealAntiheal,
  'counter-reflect-loop': counterReflectLoop,
  'stealth-vs-aoe': stealthVsAoe,
  'buff-stack-overflow': buffStackOverflow,
  'companion-aoe-interaction': companionAoeInteraction,
  'death-prevention-drain': deathPreventionDrain,
  'poison-stealth-chain': poisonStealthChain,
  'paladin-holy-kit': paladinHolyKit,
  'hunter-mark-advantage': hunterMarkAdvantage,
  // Phase 7 scenarios — 5 untested handlers
  'echo-replay': echoReplay,
  'echo-no-previous': echoNoPrevious,
  'swap-enemy-stun': swapEnemyStun,
  'swap-ally-shield': swapAllyShield,
  'banish-full-cycle': banishFullCycle,
  'flee-disengage': fleeDisengage,
  'smoke-bomb-aoe': smokeBombAoe,
  custom,
};

export function getScenarioNames(): string[] {
  return Object.keys(SCENARIOS).filter(k => k !== 'custom');
}
