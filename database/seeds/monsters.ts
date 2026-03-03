/**
 * Monster Seed Data for Realm of Crowns
 *
 * 21 monsters across 3 tiers:
 *   Tier 1 (lvl 1-5): Goblin, Wolf, Bandit, Giant Rat, Slime, Mana Wisp, Bog Wraith
 *   Tier 2 (lvl 5-10): Orc Warrior, Skeleton Warrior, Giant Spider, Dire Wolf, Troll, Arcane Elemental, Shadow Wraith
 *   Tier 3 (lvl 10-20): Young Dragon, Lich, Demon, Hydra, Ancient Golem, Void Stalker, Elder Fey Guardian
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
  type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'buff' | 'heal' | 'on_hit';
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
    ],
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
    abilities: [
      {
        id: 'demon_multiattack', name: 'Fiendish Strikes', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The demon slashes with burning claws.',
      },
      {
        id: 'demon_aoe', name: 'Infernal Blaze', type: 'aoe',
        damage: '8d6', damageType: 'FIRE', saveType: 'dex', saveDC: 15,
        priority: 8, cooldown: 3,
        description: 'The demon unleashes a wave of hellfire.',
      },
    ],
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
    abilities: [
      {
        id: 'lich_paralyze', name: 'Paralyzing Touch', type: 'status',
        saveType: 'con', saveDC: 18, statusEffect: 'stunned', statusDuration: 2,
        priority: 9, cooldown: 3,
        description: 'The lich reaches out with necrotic energy, attempting to paralyze.',
      },
      {
        id: 'lich_bolt', name: 'Necrotic Bolt', type: 'damage',
        damage: '4d8+5', damageType: 'NECROTIC',
        priority: 6, cooldown: 1,
        description: 'The lich hurls a bolt of concentrated necrotic energy.',
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
        description: 'The guardian unleashes a burst of radiant energy.',
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
