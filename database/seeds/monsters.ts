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
    itemTemplateName?: string; // if present, drop this item from ItemTemplate
  }[];
}

const MONSTERS: MonsterDef[] = [
  // ---- Tier 1 (Level 1-5) ----
  {
    name: 'Goblin',
    level: 1,
    biome: 'HILLS',
    regionName: 'The Crossroads',
    // Tuned for 65-75% win rate against Level 1 characters with +2 AC armor.
    // Monster attack stat is TOTAL bonus (no proficiency added by engine).
    //   Goblin total attack: STR(-1) + bonusAttack(3) = +2
    //   vs AC 13 player: hits on 11+ = 50%, avg damage 2.5/round = 1.25 eff
    //   Player total attack: ~+1 to +3 vs AC 12 = 45-55% hit, ~3.5 avg
    //   Player eff damage: ~1.75/round → kills in 13.7 rounds
    //   Goblin damage in 13 rounds: ~16 → leaves player at ~4 HP = ~68% win
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
    // Tuned: HP 20→15, damage 1d8+2→1d6+1 for Level 2 balance.
    // AC 11, +4 attack still makes it a threat but survivable.
    stats: {
      hp: 15, ac: 11, attack: 4, damage: '1d6+1', speed: 40,
      str: 12, dex: 14, con: 12, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 3, gold: 2 },
      { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Bandit',
    level: 3,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    stats: {
      hp: 25, ac: 13, attack: 4, damage: '1d8+2', speed: 30,
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
    // Giant Rat: easier than Goblin but still a real threat.
    // Total attack: STR(-2) + bonusAttack(3) = +1 → vs AC 13: hits on 12+ = 45%
    // HP 18 ensures ~4% more rounds → player win rate drops ~4% vs HP 14
    stats: {
      hp: 18, ac: 12, attack: 3, damage: '1d4+1', speed: 30,
      str: 6, dex: 14, con: 8, int: 2, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 2, gold: 1 },
    ],
  },
  {
    name: 'Slime',
    level: 2,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    // Tuned: HP 30→15 so Level 2 characters (~25-30 HP) can kill it.
    // AC 8 is very low (players hit ~85%), so 15 HP balances to ~4 rounds.
    stats: {
      hp: 15, ac: 8, attack: 2, damage: '1d6', speed: 10,
      str: 12, dex: 4, con: 16, int: 1, wis: 6, cha: 1,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 2 },
      { dropChance: 0.1, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },

  // ---- Tier 2 (Level 5-10) ----
  {
    name: 'Orc Warrior',
    level: 6,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    stats: {
      hp: 50, ac: 14, attack: 6, damage: '1d12+4', speed: 30,
      str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 8,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 5, maxQty: 15, gold: 12 },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Skeleton Warrior',
    level: 5,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
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
    name: 'Giant Spider',
    level: 7,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    stats: {
      hp: 45, ac: 13, attack: 6, damage: '1d10+3', speed: 30,
      str: 14, dex: 16, con: 12, int: 2, wis: 12, cha: 4,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 2, maxQty: 8, gold: 6 },
      { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0 },
    ],
  },
  {
    name: 'Dire Wolf',
    level: 8,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    stats: {
      hp: 55, ac: 13, attack: 7, damage: '2d6+3', speed: 50,
      str: 16, dex: 14, con: 14, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 3, maxQty: 8, gold: 10 },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },
  {
    name: 'Troll',
    level: 9,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
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
    name: 'Young Dragon',
    level: 14,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
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
    name: 'Lich',
    level: 18,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
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
  {
    name: 'Demon',
    level: 16,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
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
    name: 'Hydra',
    level: 15,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    stats: {
      hp: 160, ac: 15, attack: 8, damage: '3d6+4', speed: 30,
      str: 20, dex: 10, con: 20, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 15, maxQty: 50, gold: 40 },
      { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0 },
    ],
  },
  {
    name: 'Ancient Golem',
    level: 12,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    stats: {
      hp: 140, ac: 19, attack: 8, damage: '2d10+5', speed: 20,
      str: 22, dex: 6, con: 20, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 10, maxQty: 40, gold: 30 },
      { dropChance: 0.4, minQty: 1, maxQty: 3, gold: 0 },
      { dropChance: 0.1, minQty: 1, maxQty: 1, gold: 0 },
    ],
  },

  // ---- Arcane Monsters (drop Arcane Reagents) ----

  // Tier 1 — accessible from early game
  {
    name: 'Mana Wisp',
    level: 3,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    // Fragile arcane creature — low HP/AC but erratic, moderate magic damage.
    // Players fight these primarily for Arcane Reagent drops.
    stats: {
      hp: 16, ac: 13, attack: 3, damage: '1d6+1', speed: 40,
      str: 3, dex: 16, con: 8, int: 14, wis: 12, cha: 10,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 1, maxQty: 3, gold: 2 },
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Bog Wraith',
    level: 4,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    // Undead spirit infused with swamp magic. Tougher than Mana Wisp.
    stats: {
      hp: 22, ac: 12, attack: 4, damage: '1d6+2', speed: 25,
      str: 6, dex: 14, con: 12, int: 12, wis: 14, cha: 8,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 1, maxQty: 4, gold: 3 },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // Tier 2 — mid-game arcane sources
  {
    name: 'Arcane Elemental',
    level: 7,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    // Living convergence of elemental magic. High INT, moderate combat stats.
    stats: {
      hp: 48, ac: 14, attack: 6, damage: '1d10+3', speed: 30,
      str: 10, dex: 12, con: 14, int: 18, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 3, maxQty: 10, gold: 8 },
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Shadow Wraith',
    level: 9,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    // Ancient underdark spirit. High evasion, hits hard with necrotic magic.
    stats: {
      hp: 55, ac: 15, attack: 7, damage: '2d6+3', speed: 35,
      str: 8, dex: 16, con: 12, int: 16, wis: 16, cha: 14,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 4, maxQty: 12, gold: 10 },
      { dropChance: 0.40, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // Tier 3 — endgame arcane sources (generous drops)
  {
    name: 'Void Stalker',
    level: 13,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    // Alien predator from beyond the material plane. Very dangerous.
    stats: {
      hp: 110, ac: 17, attack: 9, damage: '2d8+5', speed: 40,
      str: 16, dex: 18, con: 16, int: 16, wis: 14, cha: 6,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 10, maxQty: 30, gold: 25 },
      { dropChance: 0.55, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Elder Fey Guardian',
    level: 16,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    // Ancient fey protector corrupted by wild magic. Boss-tier arcane source.
    stats: {
      hp: 135, ac: 17, attack: 10, damage: '2d10+5', speed: 35,
      str: 14, dex: 16, con: 16, int: 20, wis: 18, cha: 18,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 15, maxQty: 40, gold: 35 },
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

    if (existing) {
      await prisma.monster.update({
        where: { id: existing.id },
        data: {
          stats: monster.stats,
          lootTable: monster.lootTable,
          regionId,
          biome: monster.biome,
        },
      });
    } else {
      await prisma.monster.create({
        data: {
          name: monster.name,
          level: monster.level,
          stats: monster.stats,
          lootTable: monster.lootTable,
          regionId,
          biome: monster.biome,
        },
      });
    }
    count++;
  }

  console.log(`  Created/updated ${count} monsters`);
}
