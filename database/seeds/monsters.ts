/**
 * Monster Seed Data for Realm of Crowns
 *
 * 35 monsters across 4 tiers:
 *   Tier 1 (lvl 1-5): Goblin, Wolf, Bandit, Giant Rat, Slime, Mana Wisp, Bog Wraith
 *   Tier 2 (lvl 5-10): Orc Warrior, Skeleton Warrior, Giant Spider, Dire Wolf, Troll, Arcane Elemental, Shadow Wraith
 *   Tier 3 (lvl 10-20): Young Dragon, Lich, Demon, Hydra, Ancient Golem, Void Stalker, Elder Fey Guardian
 *   Tier 4 (lvl 17-30): Wyvern, Treant, Chimera, Mind Flayer, Vampire Lord, Frost Giant, Sea Serpent,
 *                        Iron Golem, Fire Giant, Purple Worm, Beholder, Fey Dragon, Death Knight, Storm Giant
 *
 * Arcane monsters (6) drop Arcane Reagents via itemTemplateName loot entries.
 *
 * Each monster is seeded with the region whose biome matches best.
 * Stats JSON: { hp, ac, attack, damage, speed, str, dex, con, int, wis, cha }
 * LootTable JSON: array of { dropChance, minQty, maxQty, gold, itemTemplateName? }
 */

import { PrismaClient, BiomeType } from '@prisma/client';

interface MonsterAbilityDef {
  id: string;
  name: string;
  type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'buff' | 'heal' | 'on_hit'
        | 'fear_aura' | 'damage_aura' | 'death_throes' | 'swallow';
  damage?: string;
  damageType?: string;
  saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  saveDC?: number;
  statusEffect?: string;
  statusDuration?: number;
  cooldown?: number;
  recharge?: number;
  usesPerCombat?: number;
  priority?: number;
  hpPerTurn?: number;
  disabledBy?: string[];
  attacks?: number;
  description?: string;
  auraDamage?: string;
  auraDamageType?: string;
  auraRepeats?: boolean;
  isLegendaryAction?: boolean;
  legendaryCost?: number;
  deathDamage?: string;
  deathDamageType?: string;
  deathSaveDC?: number;
  deathSaveType?: 'str' | 'dex' | 'con';
  swallowDamage?: string;
  swallowDamageType?: string;
  swallowEscapeThreshold?: number;
}

interface MonsterDef {
  name: string;
  level: number;
  biome: BiomeType;
  regionName: string;
  stats: {
    hp: number;
    ac: number;
    attack: number;
    damage: string; // e.g. "1d6+2"
    speed: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  lootTable: {
    dropChance: number;
    minQty: number;
    maxQty: number;
    gold: number;
    itemTemplateName?: string;
  }[];
  // New fields for monster abilities & damage types
  damageType?: string;
  abilities?: MonsterAbilityDef[];
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

const MONSTERS: MonsterDef[] = [
  // ---- Tier 1 (Level 1-5) ----
  {
    name: 'Goblin',
    level: 1,
    biome: 'HILLS',
    regionName: 'The Crossroads',
    damageType: 'SLASHING',
    stats: {
      hp: 24, ac: 12, attack: 3, damage: '1d4+1', speed: 30,
      str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 6,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 1, maxQty: 5, gold: 3 },
      { dropChance: 0.2, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Wolf',
    level: 2,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    damageType: 'PIERCING',
    abilities: [{
      id: 'wolf_knockdown', name: 'Knockdown', type: 'on_hit',
      saveType: 'str', saveDC: 11, statusEffect: 'knocked_down', statusDuration: 1,
      description: 'The wolf lunges and tries to knock the target prone.',
    }],
    stats: {
      hp: 15, ac: 11, attack: 4, damage: '1d6+1', speed: 40,
      str: 12, dex: 14, con: 12, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },
  {
    name: 'Bandit',
    level: 3,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    damageType: 'SLASHING',
    stats: {
      hp: 20, ac: 12, attack: 4, damage: '1d6+2', speed: 30,
      str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10,
    },
    lootTable: [
      { dropChance: 0.9, minQty: 2, maxQty: 10, gold: 8 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Giant Rat',
    level: 1,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'PIERCING',
    abilities: [{
      id: 'rat_disease', name: 'Filth Fever', type: 'on_hit',
      saveType: 'con', saveDC: 10, statusEffect: 'diseased', statusDuration: 3,
      description: 'The rat\'s filthy bite risks spreading disease.',
    }],
    stats: {
      hp: 18, ac: 12, attack: 3, damage: '1d4+1', speed: 30,
      str: 6, dex: 14, con: 8, int: 2, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Slime',
    level: 2,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    damageType: 'ACID',
    resistances: ['SLASHING', 'PIERCING'],
    immunities: ['LIGHTNING'],
    critImmunity: true,
    stats: {
      hp: 15, ac: 8, attack: 2, damage: '1d6', speed: 10,
      str: 12, dex: 4, con: 16, int: 1, wis: 6, cha: 1,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },

  // ---- Tier 2 (Level 5-10) ----
  {
    name: 'Skeleton Warrior',
    level: 5,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    damageType: 'SLASHING',
    vulnerabilities: ['BLUDGEONING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    stats: {
      hp: 40, ac: 15, attack: 5, damage: '1d10+3', speed: 30,
      str: 14, dex: 12, con: 12, int: 6, wis: 8, cha: 5,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 3, maxQty: 10, gold: 8 },
      { dropChance: 0.2, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Orc Warrior',
    level: 6,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    damageType: 'SLASHING',
    abilities: [{
      id: 'orc_multiattack', name: 'Multiattack', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 1,
      description: 'The orc warrior attacks twice with its greataxe.',
    }],
    stats: {
      hp: 46, ac: 15, attack: 6, damage: '1d10+3', speed: 30,
      str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 5, maxQty: 15, gold: 12 },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Giant Spider',
    level: 7,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'spider_poison', name: 'Venomous Bite', type: 'on_hit',
        saveType: 'con', saveDC: 12, statusEffect: 'poisoned', statusDuration: 3,
        description: 'The spider injects venom with its bite.',
      },
      {
        id: 'spider_web', name: 'Web', type: 'status',
        saveType: 'dex', saveDC: 12, statusEffect: 'restrained', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The spider shoots sticky webbing to restrain its prey.',
      },
    ],
    stats: {
      hp: 38, ac: 13, attack: 6, damage: '1d10+3', speed: 30,
      str: 14, dex: 16, con: 12, int: 2, wis: 12, cha: 4,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Dire Wolf',
    level: 8,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    damageType: 'PIERCING',
    abilities: [{
      id: 'direwolf_knockdown', name: 'Pounce', type: 'on_hit',
      saveType: 'str', saveDC: 13, statusEffect: 'knocked_down', statusDuration: 1,
      description: 'The dire wolf pounces, trying to knock its prey to the ground.',
    }],
    stats: {
      hp: 45, ac: 14, attack: 7, damage: '2d8+3', speed: 50,
      str: 16, dex: 14, con: 14, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },
  {
    name: 'Troll',
    level: 9,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    damageType: 'SLASHING',
    vulnerabilities: ['FIRE', 'ACID'],
    abilities: [
      {
        id: 'troll_multiattack', name: 'Rend', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'The troll attacks with two claws and a bite.',
      },
      {
        id: 'troll_regen', name: 'Regeneration', type: 'heal',
        hpPerTurn: 10, disabledBy: ['FIRE', 'ACID'],
        description: 'The troll regenerates 10 HP per turn unless damaged by fire or acid.',
      },
    ],
    stats: {
      hp: 75, ac: 12, attack: 7, damage: '2d6+4', speed: 30,
      str: 18, dex: 8, con: 18, int: 6, wis: 8, cha: 6,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 5, maxQty: 20, gold: 15 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },

  // ---- Tier 3 (Level 10-20) ----
  {
    name: 'Ancient Golem',
    level: 12,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    critResistance: -20,
    legendaryResistances: 2,
    abilities: [{
      id: 'golem_multiattack', name: 'Slam', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The golem slams with both massive fists.',
    }],
    stats: {
      hp: 140, ac: 19, attack: 8, damage: '2d10+5', speed: 20,
      str: 22, dex: 6, con: 20, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 10, maxQty: 40, gold: 0 },
      { dropChance: 0.4, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Young Dragon',
    level: 14,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    damageType: 'PIERCING',
    immunities: ['COLD'],
    legendaryActions: 1,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'dragon_multiattack', name: 'Multiattack', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'The dragon attacks with a bite and two claws.',
      },
      {
        id: 'dragon_breath', name: 'Cold Breath', type: 'aoe',
        damage: '12d6', damageType: 'COLD', saveType: 'con', saveDC: 17,
        recharge: 5, priority: 10, cooldown: 0,
        description: 'The dragon exhales a blast of freezing air.',
      },
      {
        id: 'dragon_fear_aura', name: 'Frightful Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 15, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The dragon radiates a terrifying presence.',
      },
    ],
    phaseTransitions: [{
      id: 'dragon_phase2', hpThresholdPercent: 25, name: 'Cornered Fury',
      description: 'The young dragon roars in fury, abandoning defense for reckless ferocity.',
      triggered: false,
      effects: [
        { type: 'unlock_ability', unlockAbilityId: 'dragon_breath' },
        { type: 'stat_boost', statBoost: { attack: 3, ac: -2 } },
        { type: 'aoe_burst', aoeBurst: { damage: '6d6', damageType: 'COLD', saveDC: 15, saveType: 'dex' } },
      ],
    }],
    stats: {
      hp: 150, ac: 18, attack: 10, damage: '2d10+6', speed: 40,
      str: 20, dex: 12, con: 18, int: 14, wis: 12, cha: 16,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 20, maxQty: 80, gold: 50 },
      { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 0 },
      { dropChance: 0.1, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Hydra',
    level: 15,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    damageType: 'PIERCING',
    abilities: [{
      id: 'hydra_multiattack', name: 'Multiple Heads', type: 'multiattack',
      attacks: 5, priority: 5, cooldown: 0,
      description: 'The hydra attacks with all five of its heads.',
    }],
    stats: {
      hp: 160, ac: 15, attack: 8, damage: '3d6+4', speed: 30,
      str: 20, dex: 10, con: 20, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 15, maxQty: 50, gold: 0 },
      { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Demon',
    level: 16,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    damageType: 'FIRE',
    resistances: ['COLD', 'LIGHTNING'],
    immunities: ['FIRE', 'POISON'],
    legendaryActions: 2,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'demon_multiattack', name: 'Fiendish Strikes', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The demon slashes with burning claws.',
      },
      {
        id: 'demon_aoe', name: 'Infernal Blaze', type: 'aoe',
        damage: '8d6', damageType: 'FIRE', saveType: 'dex', saveDC: 15,
        priority: 8, cooldown: 3,
        description: 'The demon unleashes a wave of hellfire.',
      },
      {
        id: 'demon_fear_aura', name: 'Abyssal Dread', type: 'fear_aura',
        saveType: 'wis', saveDC: 15, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The demon radiates an aura of abyssal terror.',
      },
      {
        id: 'demon_fire_aura', name: 'Fire Aura', type: 'damage_aura',
        auraDamage: '1d6', auraDamageType: 'FIRE',
        description: 'Flames lash out at anyone who strikes the demon in melee.',
      },
      {
        id: 'demon_death_throes', name: 'Infernal Explosion', type: 'death_throes',
        deathDamage: '8d6', deathDamageType: 'FIRE', deathSaveDC: 15, deathSaveType: 'dex',
        description: 'The demon explodes in a burst of hellfire upon death.',
      },
    ],
    phaseTransitions: [{
      id: 'demon_phase2', hpThresholdPercent: 30, name: 'Infernal Rage',
      description: 'The demon enters a berserk frenzy as infernal flames surge around it.',
      triggered: false,
      effects: [
        { type: 'stat_boost', statBoost: { attack: 3, damage: 2 } },
      ],
    }],
    stats: {
      hp: 130, ac: 17, attack: 10, damage: '2d8+6', speed: 40,
      str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 25, maxQty: 60, gold: 60 },
      { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Lich',
    level: 18,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    damageType: 'NECROTIC',
    resistances: ['COLD', 'LIGHTNING', 'NECROTIC'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    critResistance: -10,
    legendaryActions: 3,
    legendaryResistances: 3,
    abilities: [
      {
        id: 'lich_paralyze', name: 'Paralyzing Touch', type: 'status',
        saveType: 'con', saveDC: 18, statusEffect: 'stunned', statusDuration: 2,
        priority: 9, cooldown: 3,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The lich reaches out with necrotic energy, attempting to paralyze.',
      },
      {
        id: 'lich_bolt', name: 'Necrotic Bolt', type: 'damage',
        damage: '4d8+5', damageType: 'NECROTIC',
        priority: 6, cooldown: 1,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The lich hurls a bolt of concentrated necrotic energy.',
      },
      {
        id: 'lich_fear_aura', name: 'Dread Aura', type: 'fear_aura',
        saveType: 'wis', saveDC: 18, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The lich emanates an aura of overwhelming dread.',
      },
    ],
    phaseTransitions: [
      {
        id: 'lich_phase2', hpThresholdPercent: 50, name: 'Desperate Arcana',
        description: 'The lich channels forbidden reserves, unleashing devastating arcane power.',
        triggered: false,
        effects: [
          {
            type: 'add_ability',
            ability: {
              id: 'lich_mass_necrotic', name: 'Mass Necrotic Wave', type: 'aoe',
              damage: '4d8+5', damageType: 'NECROTIC', saveType: 'con', saveDC: 18,
              cooldown: 2, priority: 10,
              description: 'A wave of concentrated necrotic energy.',
            },
          },
          { type: 'stat_boost', statBoost: { attack: 2 } },
          { type: 'aoe_burst', aoeBurst: { damage: '3d6', damageType: 'NECROTIC', saveDC: 18, saveType: 'dex' } },
        ],
      },
      {
        id: 'lich_phase3', hpThresholdPercent: 25, name: 'Phylactery Rage',
        description: 'The lich draws power from its phylactery in a desperate bid for survival.',
        triggered: false,
        effects: [
          { type: 'unlock_ability', unlockAbilityId: 'lich_paralyze' },
          { type: 'stat_boost', statBoost: { damage: 3, ac: 2 } },
        ],
      },
    ],
    stats: {
      hp: 120, ac: 17, attack: 9, damage: '3d6+5', speed: 30,
      str: 10, dex: 14, con: 14, int: 22, wis: 16, cha: 16,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 30, maxQty: 100, gold: 80 },
      { dropChance: 0.5, minQty: 1, maxQty: 2, gold: 0 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },

  // ---- Arcane Monsters (drop Arcane Reagents) ----

  // Tier 1 — accessible from early game
  {
    name: 'Mana Wisp',
    level: 3,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    damageType: 'FORCE',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    critImmunity: true,
    stats: {
      hp: 16, ac: 13, attack: 3, damage: '1d6+1', speed: 40,
      str: 3, dex: 16, con: 8, int: 14, wis: 12, cha: 10,
    },
    lootTable: [
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Bog Wraith',
    level: 4,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    damageType: 'NECROTIC',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    immunities: ['POISON', 'NECROTIC'],
    abilities: [{
      id: 'bogwraith_lifedrain', name: 'Life Drain', type: 'on_hit',
      saveType: 'con', saveDC: 12, statusEffect: 'weakened', statusDuration: 2,
      description: 'The wraith drains life force with its touch.',
    }],
    stats: {
      hp: 22, ac: 12, attack: 4, damage: '1d6+2', speed: 25,
      str: 6, dex: 14, con: 12, int: 12, wis: 14, cha: 8,
    },
    lootTable: [
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // Tier 2 — mid-game arcane sources
  {
    name: 'Arcane Elemental',
    level: 7,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    damageType: 'FORCE',
    resistances: ['SLASHING', 'PIERCING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    abilities: [{
      id: 'elemental_burn', name: 'Arcane Burn', type: 'status',
      saveType: 'con', saveDC: 13, statusEffect: 'burning', statusDuration: 3,
      priority: 7, cooldown: 2,
      description: 'The elemental unleashes arcane fire that burns continuously.',
    }],
    stats: {
      hp: 48, ac: 14, attack: 6, damage: '1d10+3', speed: 30,
      str: 10, dex: 12, con: 14, int: 18, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Shadow Wraith',
    level: 9,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'NECROTIC',
    resistances: ['COLD'],
    immunities: ['NECROTIC', 'POISON'],
    abilities: [
      {
        id: 'shadowwraith_fear', name: 'Dread Gaze', type: 'status',
        saveType: 'wis', saveDC: 14, statusEffect: 'frightened', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The wraith fixes its gaze on a target, filling them with supernatural dread.',
      },
      {
        id: 'shadowwraith_lifedrain', name: 'Life Drain', type: 'on_hit',
        saveType: 'con', saveDC: 13, statusEffect: 'weakened', statusDuration: 2,
        description: 'The wraith drains life force with each strike.',
      },
    ],
    stats: {
      hp: 45, ac: 15, attack: 7, damage: '2d6+3', speed: 35,
      str: 8, dex: 16, con: 12, int: 16, wis: 16, cha: 14,
    },
    lootTable: [
      { dropChance: 0.40, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // Tier 3 — endgame arcane sources (generous drops)
  {
    name: 'Void Stalker',
    level: 13,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'PSYCHIC',
    resistances: ['COLD', 'NECROTIC'],
    abilities: [
      {
        id: 'voidstalker_fear', name: 'Psychic Terror', type: 'on_hit',
        saveType: 'wis', saveDC: 14, statusEffect: 'frightened', statusDuration: 2,
        description: 'The void stalker projects psychic terror on contact.',
      },
      {
        id: 'voidstalker_multiattack', name: 'Void Rend', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The void stalker attacks with two psychic-infused claws.',
      },
    ],
    stats: {
      hp: 110, ac: 17, attack: 9, damage: '2d8+5', speed: 40,
      str: 16, dex: 18, con: 16, int: 16, wis: 14, cha: 6,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Elder Fey Guardian',
    level: 16,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    damageType: 'FORCE',
    resistances: ['SLASHING', 'PIERCING'],
    immunities: ['PSYCHIC'],
    legendaryActions: 2,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'fey_root', name: 'Entangling Roots', type: 'status',
        saveType: 'wis', saveDC: 16, statusEffect: 'restrained', statusDuration: 2,
        priority: 9, cooldown: 3,
        description: 'The guardian commands roots to restrain enemies.',
      },
      {
        id: 'fey_aoe', name: 'Radiant Burst', type: 'aoe',
        damage: '6d8', damageType: 'RADIANT', saveType: 'dex', saveDC: 16,
        priority: 7, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The guardian unleashes a burst of radiant energy.',
      },
      {
        id: 'fey_fear_aura', name: 'Fey Majesty', type: 'fear_aura',
        saveType: 'wis', saveDC: 16, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The guardian radiates an aura of overwhelming fey majesty.',
      },
    ],
    stats: {
      hp: 135, ac: 17, attack: 10, damage: '2d10+5', speed: 35,
      str: 14, dex: 16, con: 16, int: 20, wis: 18, cha: 18,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // ---- Tier 4 (Level 17-30) — Mid-to-High Tier ----
  {
    name: 'Wyvern',
    level: 17,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    damageType: 'PIERCING',
    resistances: ['BLUDGEONING'],
    abilities: [
      {
        id: 'wyvern_multiattack', name: 'Claw and Bite', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The wyvern slashes with its talons and snaps with its jaws.',
      },
      {
        id: 'wyvern_poison', name: 'Venomous Stinger', type: 'on_hit',
        saveType: 'con', saveDC: 15, statusEffect: 'poisoned', statusDuration: 2,
        damage: '2d6', damageType: 'POISON',
        description: 'The wyvern\'s tail stinger injects a potent venom on contact.',
      },
    ],
    stats: {
      hp: 130, ac: 15, attack: 9, damage: '2d8+5', speed: 60,
      str: 19, dex: 12, con: 16, int: 5, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Wyvern Venom Sac' },
    ],
  },
  {
    name: 'Treant',
    level: 18,
    biome: 'FOREST',
    regionName: 'Mistwood Glens',
    damageType: 'BLUDGEONING',
    resistances: ['BLUDGEONING', 'PIERCING'],
    vulnerabilities: ['FIRE'],
    abilities: [
      {
        id: 'treant_regen', name: 'Bark Regeneration', type: 'heal',
        hpPerTurn: 8, priority: 3, cooldown: 0,
        disabledBy: ['FIRE'],
        description: 'The treant regenerates its bark armor each round.',
      },
      {
        id: 'treant_entangle', name: 'Entangling Roots', type: 'status',
        saveType: 'str', saveDC: 16, statusEffect: 'restrained', statusDuration: 2,
        priority: 7, cooldown: 3,
        description: 'Thick roots burst from the earth, binding the target in place.',
      },
    ],
    stats: {
      hp: 150, ac: 16, attack: 10, damage: '2d10+5', speed: 20,
      str: 22, dex: 8, con: 20, int: 10, wis: 16, cha: 10,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Chimera',
    level: 19,
    biome: 'BADLANDS',
    regionName: 'Scarred Frontier',
    damageType: 'SLASHING',
    resistances: ['FIRE'],
    abilities: [
      {
        id: 'chimera_multiattack', name: 'Triple Maw', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'The chimera strikes with lion bite, goat horns, and dragon fangs.',
      },
      {
        id: 'chimera_breath', name: 'Fire Breath', type: 'aoe',
        damage: '6d6', damageType: 'FIRE', saveType: 'dex', saveDC: 15,
        priority: 8, recharge: 5,
        description: 'The dragon head unleashes a cone of searing flame.',
      },
    ],
    stats: {
      hp: 140, ac: 15, attack: 10, damage: '2d8+5', speed: 40,
      str: 19, dex: 11, con: 18, int: 3, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Mind Flayer',
    level: 20,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'PSYCHIC',
    resistances: ['PSYCHIC'],
    immunities: ['FORCE'],
    conditionImmunities: ['frightened'],
    abilities: [
      {
        id: 'mindflayer_blast', name: 'Mind Blast', type: 'aoe',
        damage: '6d8', damageType: 'PSYCHIC', saveType: 'int', saveDC: 17,
        priority: 8, recharge: 5,
        description: 'The mind flayer emits a devastating psychic wave.',
      },
      {
        id: 'mindflayer_stun', name: 'Psychic Grasp', type: 'status',
        saveType: 'wis', saveDC: 17, statusEffect: 'stunned', statusDuration: 2,
        priority: 6, cooldown: 3,
        description: 'Tendrils of psychic energy grip the target\'s mind.',
      },
      {
        id: 'mindflayer_extract', name: 'Extract Brain', type: 'damage',
        damage: '10d10', damageType: 'PSYCHIC',
        priority: 10, usesPerCombat: 1, cooldown: 0,
        description: 'The mind flayer attempts to extract the target\'s brain — a devastating attack.',
      },
    ],
    stats: {
      hp: 120, ac: 16, attack: 10, damage: '2d8+4', speed: 30,
      str: 11, dex: 12, con: 14, int: 22, wis: 18, cha: 17,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Vampire Lord',
    level: 21,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    damageType: 'NECROTIC',
    resistances: ['NECROTIC', 'COLD'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    phaseTransitions: [
      {
        id: 'vampire_mist_form',
        hpThresholdPercent: 40,
        name: 'Mist Form',
        description: 'The Vampire Lord dissolves into crimson mist, reforming with renewed vigor.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { ac: 2, attack: 2 } },
          { type: 'self_buff', selfBuff: { status: 'hasted', duration: 3 } },
        ],
      },
    ],
    abilities: [
      {
        id: 'vampire_drain', name: 'Life Drain', type: 'on_hit',
        saveType: 'con', saveDC: 16, statusEffect: 'weakened', statusDuration: 2,
        hpPerTurn: 10,
        description: 'The vampire drains life force on each strike, healing itself.',
      },
      {
        id: 'vampire_charm', name: 'Vampiric Charm', type: 'status',
        saveType: 'wis', saveDC: 17, statusEffect: 'mesmerize', statusDuration: 2,
        priority: 7, cooldown: 4,
        description: 'The vampire lord fixes its gaze, mesmerizing the target.',
      },
      {
        id: 'vampire_multiattack', name: 'Claw and Bite', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The vampire strikes with claws and fangs in rapid succession.',
      },
    ],
    stats: {
      hp: 155, ac: 17, attack: 11, damage: '2d8+5', speed: 40,
      str: 18, dex: 18, con: 16, int: 17, wis: 15, cha: 20,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 5, maxQty: 15, gold: 10 },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Frost Giant',
    level: 22,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    damageType: 'BLUDGEONING',
    resistances: ['COLD'],
    immunities: ['COLD'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'frost_boulder', name: 'Boulder Hurl', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 16,
        priority: 7, cooldown: 2,
        description: 'The frost giant hurls a massive boulder, shattering on impact.',
      },
      {
        id: 'frost_stomp', name: 'Freeze Stomp', type: 'status',
        saveType: 'con', saveDC: 16, statusEffect: 'frozen', statusDuration: 2,
        priority: 6, cooldown: 3,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The giant stomps the ground, sending a wave of frost that freezes targets.',
      },
    ],
    stats: {
      hp: 175, ac: 16, attack: 11, damage: '3d8+6', speed: 40,
      str: 23, dex: 9, con: 21, int: 9, wis: 10, cha: 12,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 8, maxQty: 20, gold: 12 },
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Sea Serpent',
    level: 22,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    damageType: 'BLUDGEONING',
    resistances: ['COLD', 'LIGHTNING'],
    abilities: [
      {
        id: 'serpent_constrict', name: 'Constrict', type: 'status',
        saveType: 'str', saveDC: 17, statusEffect: 'restrained', statusDuration: 2,
        damage: '3d8', damageType: 'BLUDGEONING',
        priority: 7, cooldown: 2,
        description: 'The serpent wraps its coils around the target, crushing them.',
      },
      {
        id: 'serpent_tidal', name: 'Tidal Surge', type: 'aoe',
        damage: '5d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 16,
        priority: 6, cooldown: 3,
        description: 'The serpent thrashes, sending a wall of water crashing over everything.',
      },
    ],
    stats: {
      hp: 165, ac: 16, attack: 11, damage: '2d10+5', speed: 50,
      str: 22, dex: 14, con: 20, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Iron Golem',
    level: 23,
    biome: 'MOUNTAIN',
    regionName: 'The Foundry',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    immunities: ['FIRE', 'POISON', 'PSYCHIC', 'NECROTIC'],
    conditionImmunities: ['poisoned', 'frightened', 'stunned', 'paralyzed'],
    critImmunity: true,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'golem_slam', name: 'Iron Slam', type: 'damage',
        damage: '4d10+6', damageType: 'BLUDGEONING',
        priority: 5, cooldown: 0,
        description: 'The golem brings its massive iron fist crashing down.',
      },
      {
        id: 'golem_poison_breath', name: 'Poison Breath', type: 'aoe',
        damage: '6d8', damageType: 'POISON', saveType: 'con', saveDC: 17,
        priority: 7, recharge: 6,
        description: 'The golem exhales a cloud of toxic gas from its furnace core.',
      },
    ],
    stats: {
      hp: 200, ac: 20, attack: 12, damage: '3d8+6', speed: 25,
      str: 24, dex: 9, con: 20, int: 3, wis: 11, cha: 1,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Fire Giant',
    level: 24,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    damageType: 'BLUDGEONING',
    resistances: ['BLUDGEONING'],
    immunities: ['FIRE'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'fire_giant_flame', name: 'Flame Strike', type: 'aoe',
        damage: '7d6', damageType: 'FIRE', saveType: 'dex', saveDC: 17,
        priority: 7, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The fire giant swings its blazing greatsword in a devastating arc.',
      },
      {
        id: 'fire_giant_heated', name: 'Heated Body', type: 'damage_aura',
        auraDamage: '2d6', auraDamageType: 'FIRE',
        description: 'The giant\'s body radiates intense heat, searing anyone who strikes it.',
      },
    ],
    stats: {
      hp: 185, ac: 17, attack: 12, damage: '3d8+7', speed: 40,
      str: 25, dex: 9, con: 23, int: 10, wis: 14, cha: 13,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 10, maxQty: 25, gold: 15 },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Purple Worm',
    level: 25,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'PIERCING',
    resistances: ['BLUDGEONING', 'PIERCING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned', 'frightened'],
    phaseTransitions: [
      {
        id: 'worm_frenzy',
        hpThresholdPercent: 30,
        name: 'Burrowing Frenzy',
        description: 'The Purple Worm thrashes violently, its tunneling instincts driving it into a frenzy.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3 } },
          { type: 'aoe_burst', aoeBurst: { damage: '4d8', damageType: 'BLUDGEONING', saveDC: 18, saveType: 'dex' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'worm_swallow', name: 'Swallow', type: 'swallow',
        saveType: 'str', saveDC: 18,
        swallowDamage: '3d6', swallowDamageType: 'ACID', swallowEscapeThreshold: 25,
        priority: 9, cooldown: 4,
        description: 'The worm opens its maw and attempts to swallow the target whole.',
      },
      {
        id: 'worm_multiattack', name: 'Bite and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The worm strikes with its crushing jaws and lashing tail.',
      },
      {
        id: 'worm_death_throes', name: 'Bursting Death', type: 'death_throes',
        deathDamage: '6d8', deathDamageType: 'ACID', deathSaveDC: 16, deathSaveType: 'dex',
        description: 'The worm explodes in a shower of caustic acid on death.',
      },
    ],
    stats: {
      hp: 210, ac: 18, attack: 13, damage: '3d8+7', speed: 50,
      str: 28, dex: 7, con: 22, int: 1, wis: 8, cha: 4,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Beholder',
    level: 26,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    damageType: 'FORCE',
    immunities: ['PSYCHIC'],
    conditionImmunities: ['stunned', 'paralyzed'],
    legendaryActions: 2,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'beholder_rays', name: 'Eye Rays', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The beholder fires beams of destructive energy from its eye stalks.',
      },
      {
        id: 'beholder_disintegrate', name: 'Disintegration Ray', type: 'damage',
        damage: '10d8', damageType: 'FORCE',
        priority: 9, cooldown: 3,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The beholder\'s central eye fires a concentrated beam of annihilation.',
      },
      {
        id: 'beholder_charm', name: 'Charm Ray', type: 'status',
        saveType: 'wis', saveDC: 17, statusEffect: 'mesmerize', statusDuration: 2,
        priority: 6, cooldown: 3,
        description: 'A shimmering ray attempts to dominate the target\'s will.',
      },
    ],
    stats: {
      hp: 180, ac: 18, attack: 12, damage: '2d10+5', speed: 20,
      str: 10, dex: 14, con: 18, int: 20, wis: 15, cha: 17,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Fey Dragon',
    level: 22,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    damageType: 'FORCE',
    resistances: ['PSYCHIC', 'RADIANT'],
    abilities: [
      {
        id: 'feydragon_breath', name: 'Fey Breath', type: 'aoe',
        damage: '6d6', damageType: 'FORCE', saveType: 'dex', saveDC: 16,
        priority: 7, recharge: 5,
        description: 'The fey dragon exhales a shimmering wave of raw magical energy.',
      },
      {
        id: 'feydragon_phase', name: 'Phase Shift', type: 'buff',
        statusEffect: 'shielded', statusDuration: 1,
        priority: 4, cooldown: 3,
        description: 'The dragon shifts between planes, becoming partially incorporeal.',
      },
      {
        id: 'feydragon_multiattack', name: 'Claw and Fang', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The fey dragon rakes with iridescent claws and snaps with prismatic fangs.',
      },
    ],
    stats: {
      hp: 145, ac: 17, attack: 11, damage: '2d8+5', speed: 60,
      str: 16, dex: 18, con: 16, int: 18, wis: 16, cha: 20,
    },
    lootTable: [
      { dropChance: 0.65, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Death Knight',
    level: 28,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    damageType: 'NECROTIC',
    resistances: ['COLD', 'NECROTIC'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned', 'frightened'],
    legendaryActions: 2,
    legendaryResistances: 2,
    phaseTransitions: [
      {
        id: 'death_knight_undying',
        hpThresholdPercent: 30,
        name: 'Undying Hatred',
        description: 'The Death Knight\'s armor cracks, dark energy pouring from within as it enters a berserk rage.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 4 } },
          { type: 'aoe_burst', aoeBurst: { damage: '6d6', damageType: 'NECROTIC', saveDC: 19, saveType: 'con' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'dk_hellfire', name: 'Hellfire Orb', type: 'aoe',
        damage: '10d8', damageType: 'FIRE', saveType: 'dex', saveDC: 19,
        priority: 9, cooldown: 4,
        description: 'The Death Knight hurls an orb of black flame that explodes on impact.',
      },
      {
        id: 'dk_dread_aura', name: 'Dread Aura', type: 'fear_aura',
        saveType: 'wis', saveDC: 18, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'An aura of overwhelming dread emanates from the Death Knight.',
      },
      {
        id: 'dk_multiattack', name: 'Ruinous Strikes', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The Death Knight strikes with its cursed blade in a blur of dark steel.',
      },
      {
        id: 'dk_necrotic_smite', name: 'Necrotic Smite', type: 'damage',
        damage: '6d8', damageType: 'NECROTIC',
        priority: 7, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The Death Knight channels necrotic energy through its blade.',
      },
    ],
    stats: {
      hp: 230, ac: 20, attack: 14, damage: '3d8+7', speed: 30,
      str: 22, dex: 11, con: 20, int: 14, wis: 16, cha: 20,
    },
    lootTable: [
      { dropChance: 0.75, minQty: 15, maxQty: 35, gold: 20 },
      { dropChance: 0.35, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Storm Giant',
    level: 30,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    damageType: 'BLUDGEONING',
    resistances: ['COLD', 'THUNDER'],
    immunities: ['LIGHTNING'],
    legendaryActions: 3,
    legendaryResistances: 2,
    phaseTransitions: [
      {
        id: 'storm_giant_tempest',
        hpThresholdPercent: 40,
        name: 'Eye of the Storm',
        description: 'The Storm Giant channels the full fury of the tempest, lightning crackling across its form.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, ac: 2, damage: 4 } },
          { type: 'aoe_burst', aoeBurst: { damage: '8d6', damageType: 'LIGHTNING', saveDC: 20, saveType: 'dex' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'storm_lightning', name: 'Lightning Strike', type: 'aoe',
        damage: '8d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20,
        priority: 8, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The giant calls down a devastating bolt of lightning.',
      },
      {
        id: 'storm_aura', name: 'Storm Aura', type: 'damage_aura',
        auraDamage: '2d8', auraDamageType: 'LIGHTNING',
        description: 'Electricity arcs from the giant\'s body to anyone who strikes it.',
      },
      {
        id: 'storm_multiattack', name: 'Thunderous Blows', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The giant strikes twice with its massive greatsword wreathed in lightning.',
      },
      {
        id: 'storm_throw', name: 'Rock Throw', type: 'damage',
        damage: '4d10+7', damageType: 'BLUDGEONING',
        priority: 6, cooldown: 1,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The giant hurls a massive boulder with devastating force.',
      },
    ],
    stats: {
      hp: 280, ac: 21, attack: 15, damage: '3d10+8', speed: 50,
      str: 29, dex: 14, con: 22, int: 16, wis: 18, cha: 20,
    },
    lootTable: [
      { dropChance: 0.75, minQty: 20, maxQty: 50, gold: 25 },
      { dropChance: 0.40, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
];

export async function seedMonsters(prisma: PrismaClient): Promise<void> {
  console.log('--- Seeding Monsters ---');

  // Look up regions by name
  const regions = await prisma.region.findMany({ select: { id: true, name: true } });
  const regionMap = new Map(regions.map((r) => [r.name, r.id]));

  let count = 0;
  for (const monster of MONSTERS) {
    const regionId = regionMap.get(monster.regionName);
    if (!regionId) {
      console.error(`  ERROR: Region "${monster.regionName}" not found for monster "${monster.name}"`);
      continue;
    }

    // Upsert by name+level to allow re-running safely
    const existing = await prisma.monster.findFirst({
      where: { name: monster.name, level: monster.level },
    });

    const monsterData = {
      stats: monster.stats,
      lootTable: monster.lootTable,
      regionId,
      biome: monster.biome,
      damageType: monster.damageType ?? 'BLUDGEONING',
      abilities: monster.abilities ?? [],
      resistances: monster.resistances ?? [],
      immunities: monster.immunities ?? [],
      vulnerabilities: monster.vulnerabilities ?? [],
      conditionImmunities: monster.conditionImmunities ?? [],
      critImmunity: monster.critImmunity ?? false,
      critResistance: monster.critResistance ?? 0,
      legendaryActions: monster.legendaryActions ?? 0,
      legendaryResistances: monster.legendaryResistances ?? 0,
      phaseTransitions: monster.phaseTransitions ?? [],
    };

    if (existing) {
      await prisma.monster.update({
        where: { id: existing.id },
        data: monsterData,
      });
    } else {
      await prisma.monster.create({
        data: {
          name: monster.name,
          level: monster.level,
          ...monsterData,
        },
      });
    }
    count++;
  }

  console.log(`  Created/updated ${count} monsters`);
}
