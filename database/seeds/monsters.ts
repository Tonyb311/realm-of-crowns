/**
 * Monster Seed Data for Realm of Crowns
 *
 * 129 monsters across 6 tiers:
 *   Tier 1 (lvl 1-5): Goblin, Wolf, Bandit, Giant Rat, Slime, Mana Wisp, Bog Wraith,
 *                      Dustjaw Hyena, Bone Rattler, Thornvine Creeper, Tide Crab, Ember Beetle,
 *                      Frost Mote, Shambling Corpse, Prairie Stalker, Glimmerfae, Bloodwing Stirge,
 *                      Sand Viper, Hollow Sentinel, Brambleback Toad
 *   Tier 2 (lvl 5-10): Orc Warrior, Skeleton Warrior, Giant Spider, Dire Wolf, Troll, Arcane Elemental, Shadow Wraith,
 *                       Ghoul Stalker, Dune Scorpion, Tidal Elemental, Stoneclaw Gargoyle, Hooktusk,
 *                       Harrowsong Harpy, Lavamaw Salamander, Frostfang Wolf, Ironhide Ogre,
 *                       Broodmother Spider, Rust Lurker
 *   Tier 3 (lvl 10-20): Young Dragon, Lich, Demon, Hydra, Ancient Golem, Void Stalker, Elder Fey Guardian,
 *                        Sandscale Basilisk, Thornwarden, Razormane Manticore, Crypt Warden, Dune Revenant,
 *                        Cyclops Brute, Tidecaller Siren, Magma Crawler, Steppe Lion, Cairn Specter,
 *                        Mire Hulk, Gorgon Bull, Remorhaz Burrower, Prairie Centaur, Feywild Enchantress,
 *                        Chuul Predator
 *   Tier 4 (lvl 17-30): Wyvern, Treant, Chimera, Mind Flayer, Vampire Lord, Frost Giant, Sea Serpent,
 *                        Iron Golem, Fire Giant, Purple Worm, Beholder, Fey Dragon, Death Knight, Storm Giant,
 *                        Thornfang Wyvern, Sandstorm Djinn, Bone Fiend, Hill Ettin, Coastal Behemoth,
 *                        Obsidian Golem, Ashlands Wyrm, Feywood Archon, Wasteland Behir, Reef Terror,
 *                        Frost Revenant, Infernal Ravager, Dread Colossus, Moonveil Stalker
 *   Tier 5 (lvl 31-40): Sand Wyrm, Kraken Spawn, War Mammoth, River Leviathan, Basilisk King,
 *                        Aboleth, Djinn Lord, Roc, Archlich, Ironbark Treant, Steppe Behemoth,
 *                        Dune Colossus, Nightwalker, Volcanic Drake, Thornbloom Horror, Dust Devil,
 *                        Spectral Knight, Infernal Bladedancer, Coastal Wyrm, Feywild Warden,
 *                        Frost Wyrm, Hill Giant Warlord, Dracolich
 *   Tier 6 (lvl 41-50): Phoenix, Pit Fiend, Deep Kraken, Elder Wyrm, Arcane Titan, Tarrasque, Void Emperor,
 *                        Ember Titan, Ancient Forest Guardian, Swamp Hydra, Mind Reaver, Tundra Sentinel,
 *                        Plains Thunderherd, Blight Dragon, Granite Warden, Siege Wurm, Abyssal Ravager
 *
 * Arcane monsters (6) drop Arcane Reagents via itemTemplateName loot entries.
 *
 * Each monster is seeded with the region whose biome matches best.
 * Stats JSON: { hp, ac, attack, damage, str, dex, con, int, wis, cha }
 * LootTable JSON: array of { dropChance, minQty, maxQty, gold, itemTemplateName? }
 */

import { PrismaClient, BiomeType } from '@prisma/client';
import { computeFormulaCR, CRInput } from '@shared/data/combat/cr-formula';

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
  deathSaveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
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
  // Classification tags
  category?: string;       // 'beast' | 'humanoid' | 'undead' | 'fiend' | 'dragon' | 'construct' | 'elemental' | 'aberration' | 'fey' | 'monstrosity' | 'plant' | 'ooze'
  encounterType?: string;  // 'standard' | 'elite' | 'boss' | 'world_boss'
  sentient?: boolean;
  size?: string;           // 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
  subcategory?: string;
  isSolitary?: boolean;
  environment?: string[];
}

export { MonsterDef, MonsterAbilityDef };

export const MONSTERS: MonsterDef[] = [
  // ---- Tier 1 (Level 1-5) ----
  {
    name: 'Goblin',
    level: 1,
    biome: 'HILLS',
    regionName: 'The Crossroads',
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'small',
    damageType: 'SLASHING',
    stats: {
      hp: 24, ac: 12, attack: 3, damage: '1d4+1',
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
    category: 'beast', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'PIERCING',
    abilities: [{
      id: 'wolf_knockdown', name: 'Knockdown', type: 'on_hit',
      saveType: 'str', saveDC: 11, statusEffect: 'knocked_down', statusDuration: 1,
      description: 'The wolf lunges and tries to knock the target prone.',
    }],
    stats: {
      hp: 15, ac: 11, attack: 4, damage: '1d6+1',
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
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'SLASHING',
    stats: {
      hp: 20, ac: 12, attack: 4, damage: '1d6+2',
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
    category: 'beast', encounterType: 'standard', sentient: false, size: 'small',
    damageType: 'PIERCING',
    abilities: [{
      id: 'rat_disease', name: 'Filth Fever', type: 'on_hit',
      saveType: 'con', saveDC: 10, statusEffect: 'diseased', statusDuration: 3,
      description: 'The rat\'s filthy bite risks spreading disease.',
    }],
    stats: {
      hp: 18, ac: 12, attack: 3, damage: '1d4+1',
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
    category: 'ooze', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'ACID',
    resistances: ['SLASHING', 'PIERCING'],
    immunities: ['LIGHTNING'],
    critImmunity: true,
    stats: {
      hp: 15, ac: 8, attack: 2, damage: '1d6',
      str: 12, dex: 4, con: 16, int: 1, wis: 6, cha: 1,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },

  // -- New Tier 1 monsters --
  {
    name: 'Dustjaw Hyena',
    level: 1,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'PIERCING',
    stats: {
      hp: 18, ac: 11, attack: 3, damage: '1d4+1',
      str: 12, dex: 13, con: 10, int: 2, wis: 11, cha: 5,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },
  {
    name: 'Bone Rattler',
    level: 2,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'SLASHING',
    vulnerabilities: ['BLUDGEONING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    stats: {
      hp: 16, ac: 11, attack: 3, damage: '1d6+1',
      str: 10, dex: 12, con: 10, int: 3, wis: 6, cha: 3,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Thornvine Creeper',
    level: 2,
    biome: 'FOREST',
    regionName: 'Thornwilds',
    category: 'plant', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'PIERCING',
    abilities: [{
      id: 'thornvine_entangle', name: 'Entangle', type: 'on_hit',
      saveType: 'str', saveDC: 10, statusEffect: 'restrained', statusDuration: 1,
      description: 'Thorned vines lash out and bind the target.',
    }],
    stats: {
      hp: 20, ac: 10, attack: 3, damage: '1d6',
      str: 14, dex: 6, con: 14, int: 1, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Tide Crab',
    level: 3,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'BLUDGEONING',
    stats: {
      hp: 16, ac: 14, attack: 3, damage: '1d4+2',
      str: 13, dex: 10, con: 12, int: 1, wis: 9, cha: 3,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Ember Beetle',
    level: 3,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'small',
    damageType: 'FIRE',
    abilities: [{
      id: 'ember_beetle_death', name: 'Ember Burst', type: 'death_throes',
      deathDamage: '1d4', deathDamageType: 'FIRE', deathSaveDC: 11, deathSaveType: 'dex',
      description: 'The beetle explodes in a burst of embers upon death.',
    }],
    stats: {
      hp: 15, ac: 13, attack: 3, damage: '1d4+1',
      str: 8, dex: 14, con: 12, int: 1, wis: 7, cha: 3,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Ember Core' },
    ],
  },
  {
    name: 'Frost Mote',
    level: 3,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'tiny',
    damageType: 'COLD',
    abilities: [{
      id: 'frost_mote_chill', name: 'Chill', type: 'on_hit',
      saveType: 'con', saveDC: 11, statusEffect: 'slowed', statusDuration: 2,
      description: 'Icy tendrils slow the target\'s movements.',
    }],
    stats: {
      hp: 14, ac: 13, attack: 4, damage: '1d6',
      str: 3, dex: 16, con: 8, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Shambling Corpse',
    level: 3,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'BLUDGEONING',
    vulnerabilities: ['SLASHING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    stats: {
      hp: 25, ac: 8, attack: 2, damage: '1d6+1',
      str: 14, dex: 4, con: 16, int: 1, wis: 6, cha: 3,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Prairie Stalker',
    level: 3,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'SLASHING',
    abilities: [{
      id: 'prairie_stalker_pounce', name: 'Pounce', type: 'on_hit',
      saveType: 'str', saveDC: 11, statusEffect: 'knocked_down', statusDuration: 1,
      description: 'The prairie cat pounces and tries to knock its prey down.',
    }],
    stats: {
      hp: 18, ac: 12, attack: 4, damage: '1d6+1',
      str: 14, dex: 14, con: 10, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },
  {
    name: 'Glimmerfae',
    level: 4,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'fey', encounterType: 'standard', sentient: true, size: 'tiny',
    damageType: 'RADIANT',
    abilities: [{
      id: 'glimmerfae_dazzle', name: 'Dazzle', type: 'status',
      saveType: 'wis', saveDC: 11, statusEffect: 'blinded', statusDuration: 1,
      priority: 7, cooldown: 2,
      description: 'The glimmerfae pulses with brilliant light, blinding nearby foes.',
    }],
    stats: {
      hp: 14, ac: 14, attack: 4, damage: '1d4+2',
      str: 3, dex: 18, con: 8, int: 12, wis: 14, cha: 16,
    },
    lootTable: [
      { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.6, minQty: 1, maxQty: 3, gold: 2 },
      { dropChance: 0.10, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Fey Tear' },
    ],
  },
  {
    name: 'Bloodwing Stirge',
    level: 4,
    biome: 'HILLS',
    regionName: 'The Crossroads',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'tiny',
    damageType: 'PIERCING',
    abilities: [{
      id: 'stirge_blood_drain', name: 'Blood Drain', type: 'on_hit',
      saveType: 'con', saveDC: 11, statusEffect: 'weakened', statusDuration: 1,
      description: 'The stirge latches on and drains blood, weakening the target.',
    }],
    stats: {
      hp: 12, ac: 13, attack: 5, damage: '1d4+2',
      str: 4, dex: 16, con: 10, int: 2, wis: 8, cha: 4,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Sand Viper',
    level: 4,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'small',
    damageType: 'PIERCING',
    abilities: [{
      id: 'sand_viper_venom', name: 'Venom', type: 'on_hit',
      saveType: 'con', saveDC: 12, statusEffect: 'poisoned', statusDuration: 2,
      description: 'The viper injects a debilitating venom into its prey.',
    }],
    stats: {
      hp: 16, ac: 13, attack: 5, damage: '1d6+2',
      str: 8, dex: 16, con: 12, int: 2, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },
  {
    name: 'Hollow Sentinel',
    level: 5,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'construct', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'BLUDGEONING',
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    stats: {
      hp: 28, ac: 15, attack: 5, damage: '1d8+2',
      str: 16, dex: 8, con: 14, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Brambleback Toad',
    level: 5,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'toad_croak', name: 'Croak Blast', type: 'aoe',
        damage: '1d6', damageType: 'THUNDER', saveType: 'con', saveDC: 12,
        priority: 7, cooldown: 3,
        description: 'The toad unleashes a deafening croak that rattles everything nearby.',
      },
      {
        id: 'toad_swallow', name: 'Swallow', type: 'swallow',
        swallowDamage: '1d6', swallowDamageType: 'ACID', swallowEscapeThreshold: 12,
        saveType: 'str', saveDC: 12,
        priority: 6, cooldown: 4,
        description: 'The toad attempts to swallow a smaller creature whole.',
      },
    ],
    stats: {
      hp: 30, ac: 11, attack: 4, damage: '1d8+2',
      str: 16, dex: 8, con: 14, int: 2, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' },
    ],
  },

  // ---- Tier 2 (Level 5-10) ----
  {
    name: 'Skeleton Warrior',
    level: 5,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'undead', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'SLASHING',
    vulnerabilities: ['BLUDGEONING'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    stats: {
      hp: 40, ac: 15, attack: 5, damage: '1d10+3',
      str: 14, dex: 12, con: 12, int: 6, wis: 8, cha: 5,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 3, maxQty: 10, gold: 8 },
      { dropChance: 0.2, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Orc Warrior',
    level: 6,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'SLASHING',
    abilities: [{
      id: 'orc_multiattack', name: 'Multiattack', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 1,
      description: 'The orc warrior attacks twice with its greataxe.',
    }],
    stats: {
      hp: 46, ac: 15, attack: 6, damage: '1d10+3',
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
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
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
      hp: 38, ac: 13, attack: 6, damage: '1d10+3',
      str: 14, dex: 16, con: 12, int: 2, wis: 12, cha: 4,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Spider Venom' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Spider Silk' },
    ],
  },
  {
    name: 'Dire Wolf',
    level: 8,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [{
      id: 'direwolf_knockdown', name: 'Pounce', type: 'on_hit',
      saveType: 'str', saveDC: 13, statusEffect: 'knocked_down', statusDuration: 1,
      description: 'The dire wolf pounces, trying to knock its prey to the ground.',
    }],
    stats: {
      hp: 45, ac: 14, attack: 7, damage: '2d8+3',
      str: 16, dex: 14, con: 14, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.7, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Animal Pelts' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bear Claw' },
    ],
  },
  {
    name: 'Troll',
    level: 9,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'humanoid', encounterType: 'elite', sentient: true, size: 'large',
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
      hp: 75, ac: 12, attack: 7, damage: '2d6+4',
      str: 18, dex: 8, con: 18, int: 6, wis: 8, cha: 6,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 5, maxQty: 20, gold: 15 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Troll Blood' },
    ],
  },

  // -- New Tier 2 monsters --
  {
    name: 'Ghoul Stalker',
    level: 5,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'SLASHING',
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    abilities: [{
      id: 'ghoul_paralyze', name: 'Paralyzing Touch', type: 'on_hit',
      saveType: 'con', saveDC: 12, statusEffect: 'paralyzed', statusDuration: 1,
      description: 'Necrotic claws lock the target\'s muscles in place.',
    }],
    stats: {
      hp: 38, ac: 13, attack: 5, damage: '1d8+2',
      str: 14, dex: 14, con: 12, int: 7, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Dune Scorpion',
    level: 6,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'scorpion_multiattack', name: 'Multiattack', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 1,
        description: 'The scorpion strikes with its claws and stinger in rapid succession.',
      },
      {
        id: 'scorpion_venom', name: 'Sting Venom', type: 'on_hit',
        saveType: 'con', saveDC: 12, statusEffect: 'poisoned', statusDuration: 2,
        description: 'The scorpion\'s stinger injects a potent toxin.',
      },
    ],
    stats: {
      hp: 45, ac: 14, attack: 6, damage: '1d10+3',
      str: 16, dex: 12, con: 14, int: 1, wis: 10, cha: 3,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Tidal Elemental',
    level: 6,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'BLUDGEONING',
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    abilities: [{
      id: 'tidal_wave', name: 'Crashing Wave', type: 'aoe',
      damage: '1d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 12,
      statusEffect: 'knocked_down', statusDuration: 1,
      priority: 7, cooldown: 3,
      description: 'The elemental unleashes a surging wave that slams into everything nearby.',
    }],
    stats: {
      hp: 48, ac: 13, attack: 6, damage: '1d10+2',
      str: 16, dex: 10, con: 16, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Stoneclaw Gargoyle',
    level: 7,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    category: 'construct', encounterType: 'elite', sentient: false, size: 'medium',
    damageType: 'SLASHING',
    resistances: ['PIERCING', 'SLASHING'],
    conditionImmunities: ['poisoned'],
    stats: {
      hp: 55, ac: 16, attack: 6, damage: '1d10+3',
      str: 16, dex: 10, con: 16, int: 6, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Hooktusk',
    level: 7,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [{
      id: 'hooktusk_multiattack', name: 'Rend', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The hooktusk attacks with its hooked beak and raking claws.',
    }],
    stats: {
      hp: 60, ac: 14, attack: 7, damage: '2d6+3',
      str: 18, dex: 12, con: 14, int: 3, wis: 12, cha: 5,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Harrowsong Harpy',
    level: 7,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'monstrosity', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'SLASHING',
    abilities: [{
      id: 'harpy_lure', name: 'Luring Song', type: 'status',
      saveType: 'wis', saveDC: 13, statusEffect: 'charmed', statusDuration: 2,
      priority: 8, cooldown: 3,
      description: 'The harpy sings an enchanting melody that lures victims closer.',
    }],
    stats: {
      hp: 42, ac: 13, attack: 6, damage: '1d8+3',
      str: 12, dex: 14, con: 12, int: 8, wis: 12, cha: 16,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.5, minQty: 2, maxQty: 8, gold: 6 },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Storm Feather' },
    ],
  },
  {
    name: 'Lavamaw Salamander',
    level: 8,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'elemental', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'FIRE',
    immunities: ['FIRE'],
    vulnerabilities: ['COLD'],
    abilities: [{
      id: 'lavamaw_heat', name: 'Heat Aura', type: 'damage_aura',
      auraDamage: '1d4', auraDamageType: 'FIRE',
      description: 'Waves of scorching heat radiate from the salamander\'s molten skin.',
    }],
    stats: {
      hp: 65, ac: 14, attack: 7, damage: '2d6+4',
      str: 18, dex: 10, con: 16, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Ember Core' },
    ],
  },
  {
    name: 'Frostfang Wolf',
    level: 8,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'COLD',
    abilities: [{
      id: 'frostfang_breath', name: 'Frost Breath', type: 'aoe',
      damage: '2d6', damageType: 'COLD', saveType: 'dex', saveDC: 13,
      recharge: 5, priority: 8, cooldown: 0,
      description: 'The wolf exhales a cone of frigid air that freezes everything in its path.',
    }],
    stats: {
      hp: 55, ac: 14, attack: 7, damage: '2d6+3',
      str: 16, dex: 14, con: 14, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.65, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Animal Pelts' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Frost Essence' },
    ],
  },
  {
    name: 'Ironhide Ogre',
    level: 8,
    biome: 'HILLS',
    regionName: 'Cogsworth Warrens',
    category: 'humanoid', encounterType: 'elite', sentient: true, size: 'large',
    damageType: 'BLUDGEONING',
    stats: {
      hp: 70, ac: 13, attack: 7, damage: '2d8+4',
      str: 20, dex: 8, con: 18, int: 5, wis: 7, cha: 6,
    },
    lootTable: [
      { dropChance: 0.8, minQty: 5, maxQty: 20, gold: 12 },
      { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Ogre Sinew' },
    ],
  },
  {
    name: 'Broodmother Spider',
    level: 9,
    biome: 'FOREST',
    regionName: 'Thornwilds',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'broodmother_multiattack', name: 'Frenzy', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'The broodmother strikes with fangs and two forelegs in a flurry.',
      },
      {
        id: 'broodmother_venom', name: 'Brood Venom', type: 'on_hit',
        saveType: 'con', saveDC: 13, statusEffect: 'poisoned', statusDuration: 2,
        description: 'Potent venom courses through the bite wound.',
      },
      {
        id: 'broodmother_web', name: 'Web Spray', type: 'status',
        saveType: 'dex', saveDC: 13, statusEffect: 'restrained', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The broodmother sprays thick webbing to immobilize its prey.',
      },
    ],
    stats: {
      hp: 68, ac: 14, attack: 7, damage: '2d6+3',
      str: 16, dex: 14, con: 16, int: 3, wis: 12, cha: 4,
    },
    lootTable: [
      { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Spider Venom' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Spider Silk' },
    ],
  },
  {
    name: 'Rust Lurker',
    level: 9,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'ACID',
    abilities: [{
      id: 'rust_lurker_corrode', name: 'Corrosion', type: 'on_hit',
      saveType: 'con', saveDC: 13, statusEffect: 'weakened', statusDuration: 2,
      description: 'Acidic secretions corrode armor and flesh alike.',
    }],
    stats: {
      hp: 50, ac: 14, attack: 6, damage: '2d6+2',
      str: 14, dex: 12, con: 14, int: 4, wis: 12, cha: 4,
    },
    lootTable: [
      { dropChance: 0.5, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },

  // ---- Tier 3 (Level 10-20) ----
  {
    name: 'Ancient Golem',
    level: 12,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'construct', encounterType: 'elite', sentient: false, size: 'large',
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
      hp: 140, ac: 19, attack: 8, damage: '2d10+5',
      str: 22, dex: 6, con: 20, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 10, maxQty: 40, gold: 0 },
      { dropChance: 0.4, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Earth Crystal' },
    ],
  },
  {
    name: 'Young Dragon',
    level: 14,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'dragon', encounterType: 'boss', sentient: true, size: 'large',
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
      hp: 150, ac: 18, attack: 10, damage: '2d10+6',
      str: 20, dex: 12, con: 18, int: 14, wis: 12, cha: 16,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 20, maxQty: 80, gold: 50 },
      { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 0 },
      { dropChance: 0.1, minQty: 1, maxQty: 1, gold: 0 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Dragon Scale' },
    ],
  },
  {
    name: 'Hydra',
    level: 15,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'PIERCING',
    abilities: [{
      id: 'hydra_multiattack', name: 'Multiple Heads', type: 'multiattack',
      attacks: 5, priority: 5, cooldown: 0,
      description: 'The hydra attacks with all five of its heads.',
    }],
    stats: {
      hp: 160, ac: 15, attack: 8, damage: '3d6+4',
      str: 20, dex: 10, con: 20, int: 4, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 15, maxQty: 50, gold: 0 },
      { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Hydra Fang' },
    ],
  },
  {
    name: 'Demon',
    level: 16,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'fiend', encounterType: 'boss', sentient: true, size: 'large',
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
      hp: 130, ac: 17, attack: 10, damage: '2d8+6',
      str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 25, maxQty: 60, gold: 60 },
      { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
      { dropChance: 0.12, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Demon Heart' },
    ],
  },
  {
    name: 'Lich',
    level: 18,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'undead', encounterType: 'boss', sentient: true, size: 'medium',
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
      hp: 120, ac: 17, attack: 9, damage: '3d6+5',
      str: 10, dex: 14, con: 14, int: 22, wis: 16, cha: 16,
    },
    lootTable: [
      { dropChance: 1.0, minQty: 30, maxQty: 100, gold: 80 },
      { dropChance: 0.5, minQty: 1, maxQty: 2, gold: 0 },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Lich Dust' },
    ],
  },

  // ---- Tier 3 New Monsters (Levels 10-19) ----

  {
    name: 'Sandscale Basilisk',
    level: 10,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'PIERCING',
    abilities: [{
      id: 'sandscale_petrify', name: 'Petrifying Gaze', type: 'on_hit',
      saveType: 'con', saveDC: 14, statusEffect: 'slowed', statusDuration: 2,
      description: 'The basilisk\'s gaze begins to petrify the target, slowing their movements.',
    }],
    stats: {
      hp: 110, ac: 15, attack: 8, damage: '2d8+3',
      str: 16, dex: 10, con: 16, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Basilisk Scale' },
    ],
  },
  {
    name: 'Thornwarden',
    level: 11,
    biome: 'FOREST',
    regionName: 'Thornwilds',
    category: 'plant', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'PIERCING',
    vulnerabilities: ['FIRE'],
    abilities: [
      {
        id: 'thornwarden_volley', name: 'Thorn Volley', type: 'aoe',
        damage: '2d6', damageType: 'PIERCING', saveType: 'dex', saveDC: 14,
        priority: 7, cooldown: 3,
        description: 'The thornwarden launches a barrage of razor-sharp thorns.',
      },
      {
        id: 'thornwarden_regen', name: 'Regeneration', type: 'heal',
        hpPerTurn: 8, disabledBy: ['FIRE'],
        description: 'The thornwarden regenerates 8 HP per turn unless damaged by fire.',
      },
    ],
    stats: {
      hp: 115, ac: 15, attack: 8, damage: '2d8+3',
      str: 16, dex: 8, con: 18, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Living Bark' },
    ],
  },
  {
    name: 'Razormane Manticore',
    level: 11,
    biome: 'HILLS',
    regionName: 'The Crossroads',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'manticore_multi', name: 'Claw and Sting', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The manticore slashes with its claws and strikes with its barbed tail.',
      },
      {
        id: 'manticore_poison', name: 'Tail Spike', type: 'on_hit',
        saveType: 'con', saveDC: 14, statusEffect: 'poisoned', statusDuration: 2,
        description: 'The manticore\'s tail spike injects a debilitating venom.',
      },
    ],
    stats: {
      hp: 145, ac: 16, attack: 9, damage: '2d8+4',
      str: 17, dex: 14, con: 16, int: 5, wis: 12, cha: 8,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Crypt Warden',
    level: 11,
    biome: 'UNDERGROUND',
    regionName: 'Vel\'Naris Underdark',
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'NECROTIC',
    immunities: ['POISON', 'NECROTIC'],
    conditionImmunities: ['poisoned'],
    abilities: [{
      id: 'crypt_wail', name: 'Wail of the Dead', type: 'status',
      saveType: 'wis', saveDC: 14, statusEffect: 'frightened', statusDuration: 2,
      priority: 7, cooldown: 3,
      description: 'The crypt warden unleashes a bone-chilling wail that strikes terror into the living.',
    }],
    stats: {
      hp: 115, ac: 16, attack: 8, damage: '2d8+3',
      str: 14, dex: 12, con: 16, int: 8, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Dune Revenant',
    level: 12,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'SLASHING',
    immunities: ['POISON'],
    conditionImmunities: ['poisoned'],
    abilities: [{
      id: 'dune_desiccate', name: 'Desiccating Touch', type: 'on_hit',
      saveType: 'con', saveDC: 14, statusEffect: 'weakened', statusDuration: 2,
      description: 'The revenant\'s touch drains moisture from the target\'s body.',
    }],
    stats: {
      hp: 120, ac: 15, attack: 8, damage: '2d8+3',
      str: 16, dex: 12, con: 16, int: 6, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Cyclops Brute',
    level: 12,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'BLUDGEONING',
    abilities: [{
      id: 'cyclops_hurl', name: 'Rock Hurl', type: 'damage',
      damage: '3d8', damageType: 'BLUDGEONING',
      priority: 7, cooldown: 2,
      description: 'The cyclops hurls a massive boulder at its target.',
    }],
    stats: {
      hp: 125, ac: 14, attack: 9, damage: '2d8+4',
      str: 20, dex: 8, con: 18, int: 6, wis: 10, cha: 8,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 8, maxQty: 20, gold: 8 },
      { dropChance: 0.40, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Tidecaller Siren',
    level: 13,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'fey', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'PSYCHIC',
    abilities: [
      {
        id: 'siren_charm', name: 'Enchanting Call', type: 'status',
        saveType: 'wis', saveDC: 15, statusEffect: 'charmed', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The siren\'s haunting melody compels the target to lower their guard.',
      },
      {
        id: 'siren_surge', name: 'Tidal Surge', type: 'aoe',
        damage: '2d8', damageType: 'COLD', saveType: 'dex', saveDC: 14,
        priority: 6, cooldown: 3,
        description: 'The siren calls forth a wave of frigid seawater.',
      },
    ],
    stats: {
      hp: 115, ac: 15, attack: 8, damage: '2d8+3',
      str: 10, dex: 14, con: 14, int: 14, wis: 16, cha: 18,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 10, maxQty: 25, gold: 10 },
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Magma Crawler',
    level: 13,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'FIRE',
    immunities: ['FIRE'],
    vulnerabilities: ['COLD'],
    abilities: [{
      id: 'magma_shell', name: 'Molten Shell', type: 'damage_aura',
      auraDamage: '1d6', auraDamageType: 'FIRE',
      description: 'The crawler\'s molten shell burns anything that gets too close.',
    }],
    stats: {
      hp: 125, ac: 16, attack: 8, damage: '2d8+4',
      str: 18, dex: 8, con: 18, int: 3, wis: 8, cha: 4,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Elemental Core' },
    ],
  },
  {
    name: 'Steppe Lion',
    level: 14,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'SLASHING',
    abilities: [
      {
        id: 'lion_multi', name: 'Claw and Bite', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The lion strikes with powerful claws and a crushing bite.',
      },
      {
        id: 'lion_pounce', name: 'Pounce', type: 'on_hit',
        saveType: 'str', saveDC: 15, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'The lion pounces on its prey, driving them to the ground.',
      },
    ],
    stats: {
      hp: 130, ac: 15, attack: 9, damage: '2d8+4',
      str: 18, dex: 16, con: 16, int: 4, wis: 14, cha: 8,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Animal Pelts' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Cairn Specter',
    level: 14,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    category: 'undead', encounterType: 'elite', sentient: false, size: 'medium',
    damageType: 'NECROTIC',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    immunities: ['POISON', 'NECROTIC'],
    conditionImmunities: ['poisoned'],
    abilities: [
      {
        id: 'cairn_drain', name: 'Life Drain', type: 'on_hit',
        saveType: 'con', saveDC: 15, statusEffect: 'weakened', statusDuration: 2,
        description: 'The specter drains life force from its target with a spectral touch.',
      },
      {
        id: 'cairn_howl', name: 'Howl', type: 'status',
        saveType: 'wis', saveDC: 15, statusEffect: 'frightened', statusDuration: 2,
        priority: 7, cooldown: 3,
        description: 'The specter unleashes a mournful howl that chills the soul.',
      },
    ],
    stats: {
      hp: 150, ac: 16, attack: 9, damage: '2d8+4',
      str: 8, dex: 16, con: 16, int: 10, wis: 14, cha: 12,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Mire Hulk',
    level: 15,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'plant', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    immunities: ['LIGHTNING'],
    vulnerabilities: ['FIRE'],
    abilities: [
      {
        id: 'mire_multi', name: 'Crushing Vines', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The hulk lashes out with two massive vine-covered limbs.',
      },
      {
        id: 'mire_engulf', name: 'Engulf', type: 'on_hit',
        saveType: 'str', saveDC: 15, statusEffect: 'restrained', statusDuration: 2,
        description: 'The hulk attempts to engulf the target in its tangled mass.',
      },
    ],
    stats: {
      hp: 170, ac: 16, attack: 9, damage: '2d8+4',
      str: 20, dex: 6, con: 20, int: 3, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Gorgon Bull',
    level: 16,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING'],
    abilities: [{
      id: 'gorgon_breath', name: 'Petrifying Breath', type: 'aoe',
      damage: '2d8', damageType: 'POISON', saveType: 'con', saveDC: 16,
      statusEffect: 'slowed', statusDuration: 2,
      priority: 8, recharge: 5,
      description: 'The gorgon exhales a cone of petrifying gas.',
    }],
    stats: {
      hp: 180, ac: 17, attack: 10, damage: '2d10+5',
      str: 20, dex: 8, con: 18, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Remorhaz Burrower',
    level: 16,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'PIERCING',
    immunities: ['FIRE', 'COLD'],
    abilities: [{
      id: 'remorhaz_heat', name: 'Heated Body', type: 'damage_aura',
      auraDamage: '1d8', auraDamageType: 'FIRE',
      description: 'The remorhaz\'s superheated body sears anything that touches it.',
    }],
    stats: {
      hp: 150, ac: 17, attack: 10, damage: '2d8+5',
      str: 22, dex: 10, con: 18, int: 3, wis: 10, cha: 4,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Prairie Centaur',
    level: 17,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'centaur_multi', name: 'Hooves and Lance', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The centaur strikes with its lance and rearing hooves.',
      },
      {
        id: 'centaur_trample', name: 'Trample', type: 'on_hit',
        saveType: 'str', saveDC: 16, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'The centaur charges forward, trampling the target underfoot.',
      },
    ],
    stats: {
      hp: 145, ac: 16, attack: 10, damage: '2d8+5',
      str: 18, dex: 16, con: 16, int: 10, wis: 14, cha: 12,
    },
    lootTable: [
      { dropChance: 0.65, minQty: 10, maxQty: 25, gold: 10 },
      { dropChance: 0.40, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Feywild Enchantress',
    level: 18,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'fey', encounterType: 'boss', sentient: true, size: 'medium',
    damageType: 'RADIANT',
    legendaryActions: 2,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'enchantress_beguile', name: 'Beguiling Mist', type: 'status',
        saveType: 'wis', saveDC: 17, statusEffect: 'charmed', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The enchantress weaves a mist of beguiling magic around the target.',
      },
      {
        id: 'enchantress_bolt', name: 'Fey Bolt', type: 'damage',
        damage: '3d8+4', damageType: 'RADIANT',
        priority: 6, cooldown: 1,
        description: 'A bolt of brilliant fey energy streaks toward the target.',
      },
      {
        id: 'enchantress_aura', name: 'Enchanting Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 16, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The enchantress radiates an overwhelming aura of otherworldly beauty.',
      },
    ],
    phaseTransitions: [{
      id: 'enchantress_phase2', hpThresholdPercent: 40, name: 'Fey Fury',
      description: 'The enchantress drops her serene facade, wild magic surging around her.',
      triggered: false,
      effects: [
        { type: 'stat_boost', statBoost: { attack: 2, damage: 2 } },
        { type: 'aoe_burst', aoeBurst: { damage: '4d6', damageType: 'RADIANT', saveDC: 17, saveType: 'dex' } },
      ],
    }],
    stats: {
      hp: 200, ac: 17, attack: 10, damage: '2d8+5',
      str: 10, dex: 16, con: 16, int: 18, wis: 20, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 15, maxQty: 40, gold: 15 },
      { dropChance: 0.55, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.15, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Fey Tear' },
    ],
  },
  {
    name: 'Chuul Predator',
    level: 19,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'aberration', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'chuul_multi', name: 'Pincers', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The chuul snaps at the target with both massive pincers.',
      },
      {
        id: 'chuul_paralyze', name: 'Paralyzing Tentacles', type: 'on_hit',
        saveType: 'con', saveDC: 16, statusEffect: 'paralyzed', statusDuration: 1,
        description: 'The chuul\'s tentacles secrete a paralyzing toxin.',
      },
    ],
    stats: {
      hp: 155, ac: 17, attack: 10, damage: '3d6+5',
      str: 20, dex: 10, con: 18, int: 5, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Aberrant Tissue' },
    ],
  },

  // ---- Arcane Monsters (drop Arcane Reagents) ----

  // Tier 1 — accessible from early game
  {
    name: 'Mana Wisp',
    level: 3,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'tiny',
    damageType: 'FORCE',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    critImmunity: true,
    stats: {
      hp: 16, ac: 13, attack: 3, damage: '1d6+1',
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
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'NECROTIC',
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    immunities: ['POISON', 'NECROTIC'],
    abilities: [{
      id: 'bogwraith_lifedrain', name: 'Life Drain', type: 'on_hit',
      saveType: 'con', saveDC: 12, statusEffect: 'weakened', statusDuration: 2,
      description: 'The wraith drains life force with its touch.',
    }],
    stats: {
      hp: 22, ac: 12, attack: 4, damage: '1d6+2',
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
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'medium',
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
      hp: 48, ac: 14, attack: 6, damage: '1d10+3',
      str: 10, dex: 12, con: 14, int: 18, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Elemental Core' },
    ],
  },
  {
    name: 'Shadow Wraith',
    level: 9,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    category: 'undead', encounterType: 'elite', sentient: false, size: 'medium',
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
      hp: 45, ac: 15, attack: 7, damage: '2d6+3',
      str: 8, dex: 16, con: 12, int: 16, wis: 16, cha: 14,
    },
    lootTable: [
      { dropChance: 0.40, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Shadow Essence' },
    ],
  },

  // Tier 3 — endgame arcane sources (generous drops)
  {
    name: 'Void Stalker',
    level: 13,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    category: 'aberration', encounterType: 'elite', sentient: false, size: 'large',
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
      hp: 110, ac: 17, attack: 9, damage: '2d8+5',
      str: 16, dex: 18, con: 16, int: 16, wis: 14, cha: 6,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Aberrant Tissue' },
    ],
  },
  {
    name: 'Elder Fey Guardian',
    level: 16,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'fey', encounterType: 'boss', sentient: true, size: 'large',
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
      hp: 135, ac: 17, attack: 10, damage: '2d10+5',
      str: 14, dex: 16, con: 16, int: 20, wis: 18, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 10, maxQty: 30, gold: 20 },
      { dropChance: 0.60, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Fey Heartwood' },
    ],
  },

  // ---- Tier 4 (Level 17-30) — Mid-to-High Tier ----
  {
    name: 'Wyvern',
    level: 17,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    category: 'dragon', encounterType: 'standard', sentient: false, size: 'large',
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
      hp: 130, ac: 15, attack: 9, damage: '2d8+5',
      str: 19, dex: 12, con: 16, int: 5, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Wyvern Venom Sac' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Wyvern Scale' },
    ],
  },
  {
    name: 'Treant',
    level: 18,
    biome: 'FOREST',
    regionName: 'Mistwood Glens',
    category: 'plant', encounterType: 'elite', sentient: true, size: 'huge',
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
      hp: 150, ac: 16, attack: 10, damage: '2d10+5',
      str: 22, dex: 8, con: 20, int: 10, wis: 16, cha: 10,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 5, maxQty: 15, gold: 10 },
      { dropChance: 0.45, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Heartwood Sap' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Living Bark' },
    ],
  },
  {
    name: 'Chimera',
    level: 19,
    biome: 'BADLANDS',
    regionName: 'Scarred Frontier',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'large',
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
      hp: 140, ac: 15, attack: 10, damage: '2d8+5',
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
    category: 'aberration', encounterType: 'boss', sentient: true, size: 'medium',
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
      hp: 120, ac: 16, attack: 10, damage: '2d8+4',
      str: 11, dex: 12, con: 14, int: 22, wis: 18, cha: 17,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 10, maxQty: 30, gold: 25 },
      { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.12, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Mind Crystal' },
    ],
  },
  {
    name: 'Vampire Lord',
    level: 21,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'undead', encounterType: 'boss', sentient: true, size: 'medium',
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
      hp: 155, ac: 17, attack: 11, damage: '2d8+5',
      str: 18, dex: 18, con: 16, int: 17, wis: 15, cha: 20,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 5, maxQty: 15, gold: 10 },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.12, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Vampire Ichor' },
    ],
  },
  {
    name: 'Frost Giant',
    level: 22,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'humanoid', encounterType: 'boss', sentient: true, size: 'huge',
    damageType: 'BLUDGEONING',
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
      hp: 175, ac: 16, attack: 11, damage: '3d8+6',
      str: 23, dex: 9, con: 21, int: 9, wis: 10, cha: 12,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 8, maxQty: 20, gold: 12 },
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Frost Essence' },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: "Giant's Knuckle" },
    ],
  },
  {
    name: 'Sea Serpent',
    level: 22,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'huge',
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
      hp: 165, ac: 16, attack: 11, damage: '2d10+5',
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
    category: 'construct', encounterType: 'boss', sentient: false, size: 'large',
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
      hp: 200, ac: 20, attack: 12, damage: '3d8+6',
      str: 24, dex: 9, con: 20, int: 3, wis: 11, cha: 1,
    },
    lootTable: [
      { dropChance: 0.45, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.20, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Earth Crystal' },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Golem Core' },
    ],
  },
  {
    name: 'Fire Giant',
    level: 24,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'humanoid', encounterType: 'boss', sentient: true, size: 'huge',
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
      hp: 185, ac: 17, attack: 12, damage: '3d8+7',
      str: 25, dex: 9, con: 23, int: 10, wis: 14, cha: 13,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 10, maxQty: 25, gold: 15 },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: "Giant's Knuckle" },
    ],
  },
  {
    name: 'Purple Worm',
    level: 25,
    biome: 'UNDERGROUND',
    regionName: "Vel'Naris Underdark",
    category: 'monstrosity', encounterType: 'boss', sentient: false, size: 'gargantuan',
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
      hp: 210, ac: 18, attack: 13, damage: '3d8+7',
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
    category: 'aberration', encounterType: 'boss', sentient: true, size: 'large',
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
      hp: 180, ac: 18, attack: 12, damage: '2d10+5',
      str: 10, dex: 14, con: 18, int: 20, wis: 15, cha: 17,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 15, maxQty: 40, gold: 30 },
      { dropChance: 0.55, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Beholder Lens' },
    ],
  },
  {
    name: 'Fey Dragon',
    level: 22,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'dragon', encounterType: 'elite', sentient: true, size: 'large',
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
      hp: 145, ac: 17, attack: 11, damage: '2d8+5',
      str: 16, dex: 18, con: 16, int: 18, wis: 16, cha: 20,
    },
    lootTable: [
      { dropChance: 0.65, minQty: 8, maxQty: 20, gold: 15 },
      { dropChance: 0.65, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Death Knight',
    level: 28,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'undead', encounterType: 'boss', sentient: true, size: 'medium',
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
      hp: 230, ac: 20, attack: 14, damage: '3d8+7',
      str: 22, dex: 11, con: 20, int: 14, wis: 16, cha: 20,
    },
    lootTable: [
      { dropChance: 0.75, minQty: 15, maxQty: 35, gold: 20 },
      { dropChance: 0.35, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: "Death Knight's Seal" },
    ],
  },
  {
    name: 'Storm Giant',
    level: 30,
    biome: 'MOUNTAIN',
    regionName: 'Skypeak Plateaus',
    category: 'humanoid', encounterType: 'boss', sentient: true, size: 'huge',
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
      hp: 280, ac: 21, attack: 15, damage: '3d10+8',
      str: 29, dex: 14, con: 22, int: 16, wis: 18, cha: 20,
    },
    lootTable: [
      { dropChance: 0.75, minQty: 20, maxQty: 50, gold: 25 },
      { dropChance: 0.40, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.08, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: "Storm Giant's Heart" },
      { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: "Giant's Knuckle" },
    ],
  },

  // ---- Tier 4 New Monsters (Levels 19-29) ----

  {
    name: 'Thornfang Wyvern',
    level: 19,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'thornwyvern_multi', name: 'Fang and Claw', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The wyvern tears with its fangs and rakes with its claws.',
      },
      {
        id: 'thornwyvern_venom', name: 'Venomous Sting', type: 'on_hit',
        saveType: 'con', saveDC: 16, statusEffect: 'poisoned', statusDuration: 2,
        description: 'The wyvern\'s tail stinger injects a potent venom.',
      },
    ],
    stats: {
      hp: 160, ac: 17, attack: 10, damage: '3d6+5',
      str: 19, dex: 14, con: 18, int: 5, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.30, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Sandstorm Djinn',
    level: 20,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'elemental', encounterType: 'elite', sentient: true, size: 'large',
    damageType: 'LIGHTNING',
    immunities: ['LIGHTNING', 'THUNDER'],
    abilities: [{
      id: 'djinn_sandstorm', name: 'Sandstorm', type: 'aoe',
      damage: '3d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 17,
      priority: 8, cooldown: 3,
      description: 'The djinn conjures a violent sandstorm that batters everything nearby.',
    }],
    stats: {
      hp: 210, ac: 18, attack: 12, damage: '2d10+5',
      str: 20, dex: 16, con: 18, int: 14, wis: 16, cha: 18,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 15, maxQty: 40, gold: 15 },
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Bone Fiend',
    level: 21,
    biome: 'UNDERGROUND',
    regionName: 'Vel\'Naris Underdark',
    category: 'fiend', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'NECROTIC',
    immunities: ['FIRE', 'POISON'],
    abilities: [
      {
        id: 'bonefiend_spear', name: 'Bone Spear', type: 'damage',
        damage: '3d8+5', damageType: 'PIERCING',
        priority: 6, cooldown: 1,
        description: 'The fiend launches a javelin of sharpened bone.',
      },
      {
        id: 'bonefiend_aura', name: 'Dread Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 16, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The bone fiend exudes an aura of infernal dread.',
      },
    ],
    stats: {
      hp: 175, ac: 18, attack: 12, damage: '2d10+5',
      str: 16, dex: 14, con: 18, int: 14, wis: 14, cha: 16,
    },
    lootTable: [
      { dropChance: 0.65, minQty: 12, maxQty: 30, gold: 12 },
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Hill Ettin',
    level: 21,
    biome: 'HILLS',
    regionName: 'Cogsworth Warrens',
    category: 'humanoid', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'BLUDGEONING',
    abilities: [{
      id: 'ettin_multi', name: 'Twin Clubs', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The ettin swings both of its massive clubs simultaneously.',
    }],
    stats: {
      hp: 180, ac: 17, attack: 12, damage: '2d10+5',
      str: 22, dex: 8, con: 20, int: 6, wis: 10, cha: 8,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 12, maxQty: 30, gold: 12 },
      { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Coastal Behemoth',
    level: 23,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'behemoth_multi', name: 'Crush and Slam', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The behemoth crushes with its massive body and slams with its tail.',
      },
      {
        id: 'behemoth_slam', name: 'Tidal Slam', type: 'aoe',
        damage: '3d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 17,
        priority: 7, cooldown: 3,
        description: 'The behemoth slams the ground, sending a shockwave of water and debris.',
      },
    ],
    stats: {
      hp: 240, ac: 18, attack: 12, damage: '3d8+5',
      str: 24, dex: 8, con: 22, int: 3, wis: 10, cha: 6,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Obsidian Golem',
    level: 24,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'construct', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING'],
    immunities: ['FIRE'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    abilities: [{
      id: 'obsidian_slam', name: 'Magma Slam', type: 'damage',
      damage: '3d10', damageType: 'FIRE',
      priority: 7, cooldown: 2,
      description: 'The golem slams its fist into the ground, erupting in molten rock.',
    }],
    stats: {
      hp: 250, ac: 19, attack: 13, damage: '3d8+6',
      str: 24, dex: 6, con: 22, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Ashlands Wyrm',
    level: 25,
    biome: 'BADLANDS',
    regionName: 'Scarred Frontier',
    category: 'dragon', encounterType: 'standard', sentient: true, size: 'huge',
    damageType: 'FIRE',
    abilities: [
      {
        id: 'ashwyrm_breath', name: 'Fire Breath', type: 'aoe',
        damage: '6d6', damageType: 'FIRE', saveType: 'dex', saveDC: 17,
        priority: 9, recharge: 5,
        description: 'The wyrm unleashes a torrent of flame from its jaws.',
      },
      {
        id: 'ashwyrm_multi', name: 'Bite and Claw', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The wyrm bites and rakes with its claws.',
      },
    ],
    stats: {
      hp: 220, ac: 18, attack: 13, damage: '3d8+5',
      str: 22, dex: 12, con: 20, int: 12, wis: 14, cha: 16,
    },
    lootTable: [
      { dropChance: 0.75, minQty: 15, maxQty: 40, gold: 15 },
      { dropChance: 0.45, minQty: 1, maxQty: 3, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Feywood Archon',
    level: 25,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'fey', encounterType: 'boss', sentient: true, size: 'large',
    damageType: 'RADIANT',
    legendaryActions: 2,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'archon_cascade', name: 'Radiant Cascade', type: 'aoe',
        damage: '5d8', damageType: 'RADIANT', saveType: 'dex', saveDC: 18,
        priority: 9, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The archon calls down a devastating cascade of radiant energy.',
      },
      {
        id: 'archon_command', name: 'Fey Command', type: 'status',
        saveType: 'wis', saveDC: 18, statusEffect: 'stunned', statusDuration: 1,
        priority: 8, cooldown: 3,
        description: 'The archon speaks a word of fey authority that stuns the target.',
      },
      {
        id: 'archon_multi', name: 'Archon Strikes', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The archon strikes twice with blinding speed.',
      },
    ],
    phaseTransitions: [{
      id: 'archon_phase2', hpThresholdPercent: 35, name: 'Verdant Wrath',
      description: 'The archon channels the full power of the Feywild, nature magic erupting violently.',
      triggered: false,
      effects: [
        { type: 'stat_boost', statBoost: { attack: 3, ac: 2, damage: 3 } },
        { type: 'aoe_burst', aoeBurst: { damage: '6d6', damageType: 'RADIANT', saveDC: 18, saveType: 'dex' } },
      ],
    }],
    stats: {
      hp: 320, ac: 20, attack: 13, damage: '3d8+6',
      str: 18, dex: 16, con: 20, int: 18, wis: 22, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 20, maxQty: 50, gold: 20 },
      { dropChance: 0.60, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Wasteland Behir',
    level: 26,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'LIGHTNING',
    abilities: [
      {
        id: 'behir_breath', name: 'Lightning Breath', type: 'aoe',
        damage: '5d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 17,
        priority: 9, recharge: 5,
        description: 'The behir discharges a line of crackling lightning.',
      },
      {
        id: 'behir_multi', name: 'Bite and Constrict', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The behir bites and wraps its serpentine body around the target.',
      },
    ],
    stats: {
      hp: 230, ac: 18, attack: 13, damage: '3d8+5',
      str: 24, dex: 12, con: 20, int: 5, wis: 12, cha: 8,
    },
    lootTable: [
      { dropChance: 0.55, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Reef Terror',
    level: 27,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'aberration', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'reef_multi', name: 'Tentacle Lash', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The reef terror lashes out with barbed tentacles.',
      },
      {
        id: 'reef_ink', name: 'Ink Cloud', type: 'status',
        saveType: 'con', saveDC: 17, statusEffect: 'blinded', statusDuration: 2,
        priority: 7, cooldown: 3,
        description: 'The creature releases a cloud of blinding ink.',
      },
    ],
    stats: {
      hp: 235, ac: 18, attack: 13, damage: '3d8+5',
      str: 22, dex: 10, con: 20, int: 6, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Frost Revenant',
    level: 27,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'undead', encounterType: 'elite', sentient: false, size: 'large',
    damageType: 'COLD',
    immunities: ['COLD', 'POISON'],
    conditionImmunities: ['poisoned', 'frightened'],
    abilities: [{
      id: 'frostrev_grasp', name: 'Freezing Grasp', type: 'on_hit',
      saveType: 'con', saveDC: 17, statusEffect: 'slowed', statusDuration: 2,
      description: 'The revenant\'s icy grip freezes the target\'s limbs.',
    }],
    stats: {
      hp: 270, ac: 19, attack: 13, damage: '3d8+6',
      str: 20, dex: 12, con: 20, int: 8, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Infernal Ravager',
    level: 28,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'fiend', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'FIRE',
    immunities: ['FIRE', 'POISON'],
    abilities: [
      {
        id: 'ravager_multi', name: 'Claw and Bite', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The ravager tears with burning claws and snapping jaws.',
      },
      {
        id: 'ravager_hellfire', name: 'Hellfire Cloak', type: 'damage_aura',
        auraDamage: '1d8', auraDamageType: 'FIRE',
        description: 'The ravager is wreathed in hellfire that scorches nearby foes.',
      },
    ],
    stats: {
      hp: 240, ac: 19, attack: 14, damage: '3d8+6',
      str: 22, dex: 14, con: 20, int: 12, wis: 14, cha: 18,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 15, maxQty: 40, gold: 15 },
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Dread Colossus',
    level: 29,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'construct', encounterType: 'boss', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    critResistance: -15,
    legendaryActions: 2,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'colossus_quake', name: 'Earthquake Slam', type: 'aoe',
        damage: '5d10', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 19,
        priority: 9, cooldown: 3,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The colossus slams both fists into the earth, triggering a localized earthquake.',
      },
      {
        id: 'colossus_multi', name: 'Titanic Blows', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The colossus unleashes a barrage of crushing blows.',
      },
    ],
    phaseTransitions: [{
      id: 'colossus_phase2', hpThresholdPercent: 30, name: 'Overload',
      description: 'The colossus begins to fracture, unleashing stored energy in devastating bursts.',
      triggered: false,
      effects: [
        { type: 'stat_boost', statBoost: { attack: 4, damage: 4 } },
        { type: 'aoe_burst', aoeBurst: { damage: '6d8', damageType: 'BLUDGEONING', saveDC: 19, saveType: 'str' } },
      ],
    }],
    stats: {
      hp: 380, ac: 21, attack: 14, damage: '3d10+7',
      str: 28, dex: 6, con: 24, int: 3, wis: 8, cha: 1,
    },
    lootTable: [
      { dropChance: 0.60, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Monster Parts' },
      { dropChance: 0.35, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Moonveil Stalker',
    level: 29,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'fey', encounterType: 'standard', sentient: true, size: 'medium',
    damageType: 'RADIANT',
    abilities: [
      {
        id: 'moonveil_fire', name: 'Moonfire', type: 'on_hit',
        saveType: 'wis', saveDC: 18, statusEffect: 'burning', statusDuration: 2,
        description: 'The stalker\'s attacks leave searing moonfire on the target.',
      },
      {
        id: 'moonveil_vanish', name: 'Vanish', type: 'buff',
        priority: 4, cooldown: 4,
        description: 'The stalker phases into moonlight, becoming nearly invisible.',
      },
    ],
    stats: {
      hp: 210, ac: 19, attack: 13, damage: '3d8+6',
      str: 14, dex: 20, con: 18, int: 16, wis: 18, cha: 20,
    },
    lootTable: [
      { dropChance: 0.70, minQty: 15, maxQty: 35, gold: 15 },
      { dropChance: 0.50, minQty: 2, maxQty: 3, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },

  // ==================== TIER 5 (L31-40) ====================

  {
    name: 'Sand Wyrm',
    level: 31,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'gargantuan',
    damageType: 'PIERCING',
    resistances: ['FIRE'],
    abilities: [
      {
        id: 'sandwyrm_multiattack', name: 'Burrow Strike', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The Sand Wyrm erupts from below with devastating twin strikes.',
      },
      {
        id: 'sandwyrm_sandblast', name: 'Sand Blast', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'A torrent of superheated sand blasts everything nearby.',
      },
      {
        id: 'sandwyrm_ambush', name: 'Tremorsense Ambush', type: 'on_hit',
        saveType: 'dex', saveDC: 17, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'Surprise attacks from below send the target sprawling.',
      },
      {
        id: 'sandwyrm_death', name: 'Burrowing Collapse', type: 'death_throes',
        deathDamage: '6d6', deathDamageType: 'BLUDGEONING', deathSaveDC: 17, deathSaveType: 'dex',
        description: 'The wyrm\'s tunnels collapse in a cascade of sand and stone.',
      },
    ],
    stats: {
      hp: 290, ac: 20, attack: 14, damage: '3d10+8',
      str: 26, dex: 10, con: 22, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 200, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Kraken Spawn',
    level: 32,
    biome: 'UNDERWATER',
    regionName: 'Pelagic Depths',
    category: 'monstrosity', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    resistances: ['COLD', 'LIGHTNING'],
    immunities: ['ACID'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'krakenspawn_tentacle', name: 'Tentacle Slam', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'Three massive tentacles slam down in rapid succession.',
      },
      {
        id: 'krakenspawn_ink', name: 'Ink Cloud', type: 'status',
        saveType: 'con', saveDC: 18, statusEffect: 'weakened', statusDuration: 2,
        priority: 7, cooldown: 3,
        description: 'A cloud of disorienting ink blinds and confuses.',
      },
      {
        id: 'krakenspawn_constrict', name: 'Constrict', type: 'status',
        saveType: 'str', saveDC: 18, statusEffect: 'restrained', statusDuration: 2,
        priority: 6, cooldown: 2,
        description: 'A tentacle wraps around the target, crushing them.',
      },
    ],
    stats: {
      hp: 310, ac: 20, attack: 14, damage: '3d8+8',
      str: 24, dex: 12, con: 22, int: 10, wis: 14, cha: 8,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 200, gold: 0 },
      { dropChance: 0.40, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'War Mammoth',
    level: 33,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    resistances: ['COLD'],
    abilities: [
      {
        id: 'warmammoth_multiattack', name: 'Gore and Stomp', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The mammoth gores with its tusks then stomps with massive feet.',
      },
      {
        id: 'warmammoth_trample', name: 'Trampling Charge', type: 'aoe',
        damage: '6d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'The mammoth charges through everything in its path.',
      },
      {
        id: 'warmammoth_toss', name: 'Tusk Toss', type: 'on_hit',
        saveType: 'str', saveDC: 18, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'A powerful tusk swing sends the target flying.',
      },
    ],
    stats: {
      hp: 330, ac: 20, attack: 15, damage: '3d10+8',
      str: 28, dex: 8, con: 24, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 200, gold: 0 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'River Leviathan',
    level: 34,
    biome: 'RIVER',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'gargantuan',
    damageType: 'PIERCING',
    resistances: ['COLD'],
    abilities: [
      {
        id: 'riverleviathan_multiattack', name: 'Bite and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The leviathan bites with its enormous jaws and lashes with its tail.',
      },
      {
        id: 'riverleviathan_tidal', name: 'Tidal Wave', type: 'aoe',
        damage: '5d10', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'A massive wave of water crashes over everything nearby.',
      },
      {
        id: 'riverleviathan_drag', name: 'Drag Under', type: 'status',
        saveType: 'str', saveDC: 18, statusEffect: 'restrained', statusDuration: 2,
        priority: 6, cooldown: 2,
        description: 'The leviathan drags its prey beneath the water.',
      },
    ],
    stats: {
      hp: 320, ac: 19, attack: 15, damage: '3d10+8',
      str: 26, dex: 14, con: 22, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 120, maxQty: 220, gold: 0 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Basilisk King',
    level: 35,
    biome: 'HILLS',
    regionName: 'Cogsworth Warrens',
    category: 'monstrosity', encounterType: 'boss', sentient: false, size: 'large',
    damageType: 'PIERCING',
    immunities: ['POISON'],
    legendaryResistances: 1,
    phaseTransitions: [
      {
        id: 'basilisk_stone_fury',
        hpThresholdPercent: 30,
        name: 'Stone Fury',
        description: 'The Basilisk King\'s scales harden into living stone, becoming more dangerous.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, ac: 2 } },
        ],
      },
    ],
    abilities: [
      {
        id: 'basilisk_multiattack', name: 'Bite and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The Basilisk King strikes with venomous fangs and a crushing tail.',
      },
      {
        id: 'basilisk_gaze', name: 'Petrifying Gaze', type: 'status',
        saveType: 'con', saveDC: 19, statusEffect: 'stunned', statusDuration: 2,
        priority: 9, cooldown: 4,
        description: 'The basilisk\'s gaze begins to turn flesh to stone.',
      },
      {
        id: 'basilisk_venom', name: 'Venomous Bite', type: 'on_hit',
        saveType: 'con', saveDC: 18, statusEffect: 'poisoned', statusDuration: 3,
        description: 'Potent venom courses through the wound.',
      },
    ],
    stats: {
      hp: 340, ac: 21, attack: 15, damage: '4d8+9',
      str: 24, dex: 10, con: 24, int: 3, wis: 14, cha: 8,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 130, maxQty: 230, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.10, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Basilisk Eye' },
    ],
  },
  {
    name: 'Aboleth',
    level: 37,
    biome: 'UNDERWATER',
    regionName: 'Pelagic Depths',
    category: 'aberration', encounterType: 'boss', sentient: true, size: 'large',
    damageType: 'PSYCHIC',
    resistances: ['PSYCHIC', 'COLD'],
    immunities: ['POISON'],
    conditionImmunities: ['poisoned', 'charmed'],
    legendaryActions: 2,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'aboleth_tentacle', name: 'Tentacle Lash', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'Three slimy tentacles lash out with supernatural precision.',
      },
      {
        id: 'aboleth_enslave', name: 'Enslave', type: 'status',
        saveType: 'wis', saveDC: 20, statusEffect: 'charmed', statusDuration: 3,
        priority: 9, cooldown: 4,
        description: 'The aboleth bends the target\'s will to its own.',
      },
      {
        id: 'aboleth_psychic', name: 'Psychic Drain', type: 'aoe',
        damage: '6d8', damageType: 'PSYCHIC', saveType: 'wis', saveDC: 19,
        priority: 8, cooldown: 3,
        description: 'A wave of psychic agony washes over the battlefield.',
      },
      {
        id: 'aboleth_mucus', name: 'Mucus Cloud', type: 'status',
        saveType: 'con', saveDC: 19, statusEffect: 'poisoned', statusDuration: 2,
        priority: 6, cooldown: 3,
        description: 'A cloud of slimy mucus envelops the target.',
      },
    ],
    stats: {
      hp: 370, ac: 21, attack: 16, damage: '3d10+9',
      str: 22, dex: 10, con: 22, int: 22, wis: 20, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 150, maxQty: 300, gold: 35 },
    ],
  },
  {
    name: 'Djinn Lord',
    level: 38,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'elemental', encounterType: 'boss', sentient: true, size: 'large',
    damageType: 'LIGHTNING',
    immunities: ['LIGHTNING', 'THUNDER'],
    resistances: ['FIRE'],
    legendaryActions: 2,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'djinn_scimitar', name: 'Scimitar Storm', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Twin scimitars of crackling lightning slash in rapid succession.',
      },
      {
        id: 'djinn_whirlwind', name: 'Whirlwind', type: 'aoe',
        damage: '8d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 20,
        priority: 8, cooldown: 3,
        description: 'A devastating whirlwind tears across the battlefield.',
      },
      {
        id: 'djinn_lightning', name: 'Lightning Storm', type: 'aoe',
        damage: '6d10', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 19,
        priority: 7, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'Bolts of lightning rain down from a conjured storm.',
      },
      {
        id: 'djinn_shield', name: 'Wind Shield', type: 'buff',
        statusEffect: 'shielded', statusDuration: 2,
        priority: 4, cooldown: 4,
        description: 'A barrier of swirling wind deflects incoming attacks.',
      },
    ],
    stats: {
      hp: 380, ac: 22, attack: 17, damage: '4d8+9',
      str: 22, dex: 18, con: 20, int: 16, wis: 18, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 200, maxQty: 350, gold: 20 },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Djinn Essence' },
    ],
  },
  {
    name: 'Roc',
    level: 39,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'beast', encounterType: 'elite', sentient: false, size: 'gargantuan',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'roc_multiattack', name: 'Talon and Beak', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Massive talons and a razor-sharp beak strike in tandem.',
      },
      {
        id: 'roc_snatch', name: 'Snatch', type: 'status',
        saveType: 'dex', saveDC: 20, statusEffect: 'restrained', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'The Roc snatches the target in its enormous talons.',
      },
      {
        id: 'roc_wingbuffet', name: 'Wing Buffet', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 19,
        priority: 7, cooldown: 2,
        description: 'A devastating sweep of its wings sends shockwaves across the ground.',
      },
    ],
    stats: {
      hp: 400, ac: 21, attack: 17, damage: '4d10+9',
      str: 28, dex: 14, con: 22, int: 4, wis: 14, cha: 10,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 180, maxQty: 320, gold: 0 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.15, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Storm Feather' },
    ],
  },
  {
    name: 'Archlich',
    level: 40,
    biome: 'SWAMP',
    regionName: 'Ashenmoor',
    category: 'undead', encounterType: 'boss', sentient: true, size: 'medium',
    damageType: 'NECROTIC',
    resistances: ['COLD', 'LIGHTNING', 'NECROTIC'],
    immunities: ['POISON', 'PSYCHIC'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
    legendaryActions: 3,
    legendaryResistances: 3,
    phaseTransitions: [
      {
        id: 'archlich_phylactery',
        hpThresholdPercent: 50,
        name: 'Phylactery Surge',
        description: 'The Archlich draws power from its phylactery, dark energy erupting outward.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3 } },
          { type: 'aoe_burst', aoeBurst: { damage: '6d8', damageType: 'NECROTIC', saveDC: 20, saveType: 'con' } },
        ],
      },
      {
        id: 'archlich_undying',
        hpThresholdPercent: 25,
        name: 'Undying Will',
        description: 'The Archlich refuses to perish, sustained by pure death energy.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { ac: 3 } },
          { type: 'add_ability', addAbility: { id: 'archlich_massraise', name: 'Mass Raise Dead', type: 'heal', hpPerTurn: 30, description: 'The archlich draws on death energy to sustain itself.' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'archlich_stun', name: 'Power Word Stun', type: 'status',
        saveType: 'wis', saveDC: 21, statusEffect: 'stunned', statusDuration: 2,
        priority: 10, cooldown: 4,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'A single word of power stuns the target\'s mind.',
      },
      {
        id: 'archlich_storm', name: 'Necrotic Storm', type: 'aoe',
        damage: '8d8', damageType: 'NECROTIC', saveType: 'con', saveDC: 20,
        priority: 8, cooldown: 2,
        description: 'A storm of death energy ravages all nearby life.',
      },
      {
        id: 'archlich_souldrain', name: 'Soul Drain', type: 'on_hit',
        saveType: 'con', saveDC: 20, statusEffect: 'weakened', statusDuration: 3,
        description: 'Each strike siphons away the target\'s life force.',
      },
      {
        id: 'archlich_deathaura', name: 'Death Aura', type: 'damage_aura',
        auraDamage: '3d6', auraDamageType: 'NECROTIC',
        description: 'An aura of death damages anyone who strikes the archlich.',
      },
    ],
    stats: {
      hp: 420, ac: 23, attack: 18, damage: '4d8+10',
      str: 14, dex: 14, con: 18, int: 24, wis: 22, cha: 20,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 200, maxQty: 400, gold: 25 },
      { dropChance: 0.60, minQty: 4, maxQty: 7, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.08, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Archlich Phylactery Shard' },
    ],
  },
  {
    name: 'Ironbark Treant',
    level: 31,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'plant', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    vulnerabilities: ['FIRE'],
    abilities: [
      {
        id: 'ironbarktreant_multiattack', name: 'Limb Slam', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two massive ironwood limbs crash down with bone-splintering force.',
      },
      {
        id: 'ironbarktreant_regen', name: 'Bark Regen', type: 'heal',
        hpPerTurn: 15, disabledBy: ['FIRE'],
        priority: 3, cooldown: 0,
        description: 'The treant\'s bark knits itself back together unless scorched by flame.',
      },
    ],
    stats: {
      hp: 290, ac: 19, attack: 14, damage: '3d8+8',
      str: 24, dex: 6, con: 22, int: 6, wis: 14, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 200, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.30, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Heartwood Sap' },
    ],
  },
  {
    name: 'Steppe Behemoth',
    level: 32,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'steppebehemoth_multiattack', name: 'Gore and Trample', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'The behemoth gores with its horns and tramples with massive hooves.',
      },
      {
        id: 'steppebehemoth_charge', name: 'Trampling Charge', type: 'on_hit',
        saveType: 'str', saveDC: 18, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'A devastating charge sends the target sprawling into the dirt.',
      },
    ],
    stats: {
      hp: 300, ac: 19, attack: 14, damage: '3d8+8',
      str: 26, dex: 8, con: 24, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 220, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.40, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Dune Colossus',
    level: 32,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'construct', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    abilities: [
      {
        id: 'dunecolossus_multiattack', name: 'Fist Slam', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two colossal stone fists crash down with earthshaking force.',
      },
      {
        id: 'dunecolossus_sandslam', name: 'Sand Slam', type: 'aoe',
        damage: '4d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'The colossus slams the ground, sending a shockwave of sand and stone.',
      },
    ],
    stats: {
      hp: 310, ac: 20, attack: 14, damage: '3d8+8',
      str: 26, dex: 6, con: 24, int: 3, wis: 10, cha: 3,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 220, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Nightwalker',
    level: 33,
    biome: 'UNDERGROUND',
    regionName: 'Vel\'Naris Underdark',
    category: 'undead', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'NECROTIC',
    immunities: ['POISON', 'NECROTIC'],
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    conditionImmunities: ['poisoned', 'frightened'],
    abilities: [
      {
        id: 'nightwalker_multiattack', name: 'Enervating Strike', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two massive fists wreathed in necrotic energy strike with soul-draining force.',
      },
      {
        id: 'nightwalker_lifeeater', name: 'Life Eater', type: 'aoe',
        damage: '5d8', damageType: 'NECROTIC', saveType: 'con', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'A wave of annihilating darkness drains the life from all nearby creatures.',
      },
      {
        id: 'nightwalker_aura', name: 'Annihilating Aura', type: 'damage_aura',
        auraDamage: '2d6', auraDamageType: 'NECROTIC',
        description: 'An aura of absolute darkness saps the life from anyone who draws near.',
      },
    ],
    stats: {
      hp: 340, ac: 20, attack: 15, damage: '3d10+8',
      str: 22, dex: 12, con: 22, int: 6, wis: 14, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 120, maxQty: 240, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.25, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Shadow Essence' },
    ],
  },
  {
    name: 'Volcanic Drake',
    level: 34,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'dragon', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'FIRE',
    immunities: ['FIRE'],
    abilities: [
      {
        id: 'volcanicdrake_multiattack', name: 'Bite and Claw', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Superheated fangs and molten claws strike in rapid succession.',
      },
      {
        id: 'volcanicdrake_breath', name: 'Fire Breath', type: 'aoe',
        damage: '5d6', damageType: 'FIRE', saveType: 'dex', saveDC: 18,
        priority: 9, recharge: 5, cooldown: 0,
        description: 'A torrent of liquid fire erupts from the drake\'s maw.',
      },
    ],
    stats: {
      hp: 310, ac: 20, attack: 15, damage: '3d8+8',
      str: 22, dex: 14, con: 20, int: 8, wis: 12, cha: 14,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 120, maxQty: 250, gold: 25 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Thornbloom Horror',
    level: 34,
    biome: 'FOREST',
    regionName: 'Thornwilds',
    category: 'plant', encounterType: 'elite', sentient: false, size: 'huge',
    damageType: 'POISON',
    immunities: ['POISON'],
    vulnerabilities: ['FIRE'],
    abilities: [
      {
        id: 'thornbloomhorror_multiattack', name: 'Vine Lash', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Thorn-covered vines whip out with blinding speed.',
      },
      {
        id: 'thornbloomhorror_spores', name: 'Toxic Spores', type: 'on_hit',
        saveType: 'con', saveDC: 18, statusEffect: 'poisoned', statusDuration: 2,
        description: 'Each strike releases a cloud of paralytic spores into the wound.',
      },
      {
        id: 'thornbloomhorror_cloud', name: 'Spore Cloud', type: 'aoe',
        damage: '4d8', damageType: 'POISON', saveType: 'con', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'A choking cloud of toxic spores engulfs the area.',
      },
    ],
    stats: {
      hp: 340, ac: 19, attack: 15, damage: '3d8+8',
      str: 20, dex: 8, con: 22, int: 4, wis: 14, cha: 4,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 120, maxQty: 240, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Dust Devil',
    level: 35,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'BLUDGEONING',
    immunities: ['LIGHTNING', 'THUNDER'],
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    abilities: [
      {
        id: 'dustdevil_whirlwind', name: 'Whirlwind', type: 'aoe',
        damage: '4d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 18,
        priority: 8, cooldown: 3,
        description: 'A howling vortex of sand and debris batters everything in range.',
      },
      {
        id: 'dustdevil_aura', name: 'Scouring Winds', type: 'damage_aura',
        auraDamage: '1d8', auraDamageType: 'SLASHING',
        description: 'Razor-sharp sand constantly swirls around the elemental.',
      },
    ],
    stats: {
      hp: 300, ac: 19, attack: 14, damage: '3d8+8',
      str: 18, dex: 20, con: 18, int: 6, wis: 12, cha: 8,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 220, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.20, minQty: 1, maxQty: 2, gold: 0, itemTemplateName: 'Wind Mote' },
    ],
  },
  {
    name: 'Spectral Knight',
    level: 35,
    biome: 'BADLANDS',
    regionName: 'Scarred Frontier',
    category: 'undead', encounterType: 'standard', sentient: false, size: 'medium',
    damageType: 'NECROTIC',
    immunities: ['POISON', 'NECROTIC'],
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    conditionImmunities: ['poisoned'],
    abilities: [
      {
        id: 'spectralknight_multiattack', name: 'Spectral Blade', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'A ghostly sword strikes twice, passing through armor to chill the soul.',
      },
      {
        id: 'spectralknight_chill', name: 'Soul Chill', type: 'on_hit',
        saveType: 'wis', saveDC: 18, statusEffect: 'weakened', statusDuration: 2,
        description: 'Each strike drains warmth and resolve from the target.',
      },
    ],
    stats: {
      hp: 300, ac: 20, attack: 15, damage: '3d8+8',
      str: 18, dex: 14, con: 18, int: 10, wis: 16, cha: 12,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 100, maxQty: 220, gold: 0 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Infernal Bladedancer',
    level: 36,
    biome: 'VOLCANIC',
    regionName: 'Ashenfang Wastes',
    category: 'fiend', encounterType: 'elite', sentient: true, size: 'large',
    damageType: 'SLASHING',
    immunities: ['FIRE', 'POISON'],
    resistances: ['COLD', 'LIGHTNING'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'infernalbladedancer_multiattack', name: 'Blade Flurry', type: 'multiattack',
        attacks: 4, priority: 5, cooldown: 0,
        description: 'Four blazing blades weave a deadly dance of fire and steel.',
      },
      {
        id: 'infernalbladedancer_constrict', name: 'Tail Constrict', type: 'on_hit',
        saveType: 'str', saveDC: 19, statusEffect: 'restrained', statusDuration: 1,
        description: 'A barbed tail wraps around the target, pinning them in searing agony.',
      },
    ],
    stats: {
      hp: 360, ac: 21, attack: 16, damage: '3d8+8',
      str: 22, dex: 20, con: 20, int: 16, wis: 14, cha: 20,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 150, maxQty: 280, gold: 30 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Coastal Wyrm',
    level: 36,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'dragon', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'ACID',
    resistances: ['ACID'],
    abilities: [
      {
        id: 'coastalwyrm_multiattack', name: 'Bite and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Corrosive jaws and a barnacle-encrusted tail strike in tandem.',
      },
      {
        id: 'coastalwyrm_acid', name: 'Acid Spray', type: 'aoe',
        damage: '5d6', damageType: 'ACID', saveType: 'dex', saveDC: 19,
        priority: 9, recharge: 5, cooldown: 0,
        description: 'A spray of concentrated acid dissolves everything in its path.',
      },
    ],
    stats: {
      hp: 330, ac: 20, attack: 16, damage: '3d10+8',
      str: 22, dex: 14, con: 20, int: 10, wis: 12, cha: 14,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 140, maxQty: 260, gold: 25 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Feywild Warden',
    level: 37,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'fey', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'RADIANT',
    abilities: [
      {
        id: 'feywildwarden_multiattack', name: 'Radiant Strike', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'A staff of living light strikes twice with blinding radiance.',
      },
      {
        id: 'feywildwarden_binding', name: 'Binding Light', type: 'status',
        saveType: 'wis', saveDC: 19, statusEffect: 'restrained', statusDuration: 2,
        priority: 8, cooldown: 3,
        description: 'Chains of radiant light bind the target in place.',
      },
    ],
    stats: {
      hp: 330, ac: 20, attack: 16, damage: '3d8+8',
      str: 18, dex: 16, con: 18, int: 16, wis: 20, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 150, maxQty: 280, gold: 25 },
      { dropChance: 0.50, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Frost Wyrm',
    level: 37,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'dragon', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'COLD',
    immunities: ['COLD'],
    abilities: [
      {
        id: 'frostwyrm_multiattack', name: 'Bite and Claw', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Ice-encrusted fangs and frost-rimed claws tear into the target.',
      },
      {
        id: 'frostwyrm_breath', name: 'Frost Breath', type: 'aoe',
        damage: '5d8', damageType: 'COLD', saveType: 'con', saveDC: 19,
        priority: 9, recharge: 5, cooldown: 0,
        description: 'A cone of absolute cold flash-freezes everything before the wyrm.',
      },
    ],
    stats: {
      hp: 340, ac: 20, attack: 16, damage: '3d10+8',
      str: 24, dex: 12, con: 22, int: 10, wis: 12, cha: 14,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 150, maxQty: 280, gold: 25 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Hill Giant Warlord',
    level: 38,
    biome: 'HILLS',
    regionName: 'Cogsworth Warrens',
    category: 'humanoid', encounterType: 'elite', sentient: true, size: 'huge',
    damageType: 'BLUDGEONING',
    legendaryActions: 1,
    abilities: [
      {
        id: 'hillgiantwarlord_multiattack', name: 'Greatclub Smash', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'A massive tree-trunk club crashes down twice with bone-crushing power.',
      },
      {
        id: 'hillgiantwarlord_boulder', name: 'Boulder Barrage', type: 'aoe',
        damage: '5d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 19,
        priority: 8, cooldown: 3,
        description: 'A rain of boulders pelts the area with devastating impact.',
      },
      {
        id: 'hillgiantwarlord_fear', name: 'Warlord\'s Bellow', type: 'fear_aura',
        saveType: 'wis', saveDC: 18, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'A thunderous war cry shakes the resolve of all who hear it.',
      },
    ],
    stats: {
      hp: 380, ac: 21, attack: 17, damage: '4d8+9',
      str: 26, dex: 8, con: 24, int: 8, wis: 12, cha: 14,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 170, maxQty: 300, gold: 30 },
      { dropChance: 0.45, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Dracolich',
    level: 39,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'undead', encounterType: 'boss', sentient: true, size: 'huge',
    damageType: 'NECROTIC',
    immunities: ['POISON', 'NECROTIC', 'COLD'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    legendaryActions: 2,
    legendaryResistances: 2,
    phaseTransitions: [
      {
        id: 'dracolich_undeath',
        hpThresholdPercent: 30,
        name: 'Undying Fury',
        description: 'The Dracolich\'s phylactery flares with dark power, death energy erupting from its skeletal frame.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3, ac: 2 } },
          { type: 'aoe_burst', aoeBurst: { damage: '6d8', damageType: 'NECROTIC', saveDC: 20, saveType: 'con' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'dracolich_multiattack', name: 'Bite and Claws', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'Skeletal jaws and bone claws rend with necrotic-infused savagery.',
      },
      {
        id: 'dracolich_breath', name: 'Necrotic Breath', type: 'aoe',
        damage: '8d8', damageType: 'NECROTIC', saveType: 'con', saveDC: 20,
        priority: 10, recharge: 5, cooldown: 0,
        description: 'A torrent of concentrated death energy annihilates all life before the dracolich.',
      },
      {
        id: 'dracolich_fear', name: 'Dread Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 19, statusEffect: 'frightened', statusDuration: 1,
        auraRepeats: false,
        description: 'The dracolich\'s unholy presence fills all nearby with existential dread.',
      },
      {
        id: 'dracolich_deathshroud', name: 'Death Shroud', type: 'damage_aura',
        auraDamage: '2d6', auraDamageType: 'NECROTIC',
        description: 'A shroud of death energy damages anyone who strikes the dracolich.',
      },
    ],
    stats: {
      hp: 420, ac: 22, attack: 17, damage: '4d8+9',
      str: 24, dex: 10, con: 22, int: 18, wis: 16, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 200, maxQty: 350, gold: 35 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Bones' },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Dracolich Bone' },
    ],
  },

  // ==================== TIER 6 (L41-50) ====================

  {
    name: 'Phoenix',
    level: 42,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'elemental', encounterType: 'boss', sentient: true, size: 'huge',
    damageType: 'FIRE',
    immunities: ['FIRE', 'POISON'],
    vulnerabilities: ['COLD'],
    legendaryActions: 2,
    legendaryResistances: 1,
    abilities: [
      {
        id: 'phoenix_talon', name: 'Flame Talon', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Talons wreathed in living flame strike twice in rapid succession.',
      },
      {
        id: 'phoenix_immolation', name: 'Immolation Burst', type: 'aoe',
        damage: '8d8', damageType: 'FIRE', saveType: 'dex', saveDC: 20,
        priority: 8, cooldown: 2,
        description: 'The Phoenix erupts in a devastating burst of sacred fire.',
      },
      {
        id: 'phoenix_heal', name: 'Healing Flames', type: 'heal',
        hpPerTurn: 25, disabledBy: ['COLD'],
        priority: 3, cooldown: 0,
        description: 'The Phoenix regenerates from its own flames unless chilled.',
      },
      {
        id: 'phoenix_aura', name: 'Fire Aura', type: 'damage_aura',
        auraDamage: '3d6', auraDamageType: 'FIRE',
        description: 'Intense heat sears anyone who strikes the Phoenix.',
      },
      {
        id: 'phoenix_death', name: 'Rebirth Inferno', type: 'death_throes',
        deathDamage: '10d6', deathDamageType: 'FIRE', deathSaveDC: 20, deathSaveType: 'dex',
        description: 'The Phoenix explodes in a final blaze of purifying fire.',
      },
    ],
    stats: {
      hp: 440, ac: 22, attack: 19, damage: '4d10+10',
      str: 22, dex: 20, con: 20, int: 14, wis: 18, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 300, maxQty: 500, gold: 35 },
      { dropChance: 0.50, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Phoenix Feather' },
    ],
  },
  {
    name: 'Pit Fiend',
    level: 43,
    biome: 'BADLANDS',
    regionName: 'Ashenfang Wastes',
    category: 'fiend', encounterType: 'boss', sentient: true, size: 'large',
    damageType: 'SLASHING',
    immunities: ['FIRE', 'POISON'],
    resistances: ['COLD'],
    conditionImmunities: ['poisoned', 'frightened'],
    legendaryActions: 2,
    legendaryResistances: 2,
    phaseTransitions: [
      {
        id: 'pitfiend_ascension',
        hpThresholdPercent: 25,
        name: 'Infernal Ascension',
        description: 'The Pit Fiend assumes its true form, wreathed in hellfire.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 4, damage: 4, ac: 2 } },
        ],
      },
    ],
    abilities: [
      {
        id: 'pitfiend_multiattack', name: 'Mace and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'A burning mace and spiked tail strike in deadly combination.',
      },
      {
        id: 'pitfiend_fireball', name: 'Fireball', type: 'aoe',
        damage: '10d6', damageType: 'FIRE', saveType: 'dex', saveDC: 21,
        priority: 8, cooldown: 2,
        description: 'A massive ball of hellfire detonates on impact.',
      },
      {
        id: 'pitfiend_fear', name: 'Fear Aura', type: 'fear_aura',
        saveType: 'wis', saveDC: 21, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'The Pit Fiend\'s mere presence inspires abject terror.',
      },
      {
        id: 'pitfiend_wound', name: 'Infernal Wound', type: 'on_hit',
        saveType: 'con', saveDC: 20, statusEffect: 'burning', statusDuration: 3,
        description: 'Hellfire lingers in the wound, burning from within.',
      },
    ],
    stats: {
      hp: 500, ac: 23, attack: 19, damage: '4d10+11',
      str: 28, dex: 16, con: 24, int: 20, wis: 18, cha: 24,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 350, maxQty: 550, gold: 25 },
      { dropChance: 0.10, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Pit Fiend Horn' },
    ],
  },
  {
    name: 'Deep Kraken',
    level: 44,
    biome: 'UNDERWATER',
    regionName: 'Pelagic Depths',
    category: 'monstrosity', encounterType: 'boss', sentient: true, size: 'gargantuan',
    damageType: 'BLUDGEONING',
    immunities: ['LIGHTNING', 'COLD'],
    resistances: ['ACID', 'PIERCING'],
    legendaryActions: 3,
    legendaryResistances: 2,
    abilities: [
      {
        id: 'deepkraken_tentacle', name: 'Tentacle Lash', type: 'multiattack',
        attacks: 4, priority: 5, cooldown: 0,
        description: 'Four colossal tentacles lash out with devastating force.',
      },
      {
        id: 'deepkraken_maelstrom', name: 'Maelstrom', type: 'aoe',
        damage: '8d10', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 21,
        priority: 9, cooldown: 3,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'A whirling vortex of crushing water engulfs everything.',
      },
      {
        id: 'deepkraken_lightning', name: 'Lightning Storm', type: 'aoe',
        damage: '8d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20,
        priority: 7, cooldown: 2,
        description: 'Electricity arcs through the water in deadly chains.',
      },
      {
        id: 'deepkraken_ink', name: 'Ink Darkness', type: 'status',
        saveType: 'wis', saveDC: 20, statusEffect: 'frightened', statusDuration: 2,
        priority: 6, cooldown: 4,
        description: 'Impenetrable darkness triggers primal terror.',
      },
    ],
    stats: {
      hp: 520, ac: 22, attack: 20, damage: '4d10+11',
      str: 30, dex: 12, con: 26, int: 18, wis: 16, cha: 14,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 350, maxQty: 550, gold: 40 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
    ],
  },
  {
    name: 'Elder Wyrm',
    level: 46,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'dragon', encounterType: 'boss', sentient: true, size: 'gargantuan',
    damageType: 'PIERCING',
    immunities: ['COLD'],
    resistances: ['FIRE', 'LIGHTNING'],
    legendaryActions: 3,
    legendaryResistances: 3,
    phaseTransitions: [
      {
        id: 'elderwyrm_fury',
        hpThresholdPercent: 20,
        name: 'Ancient Fury',
        description: 'The Elder Wyrm unleashes its full primordial power, trading defense for devastating offense.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 4, damage: 4, ac: -3 } },
          { type: 'aoe_burst', aoeBurst: { damage: '10d6', damageType: 'COLD', saveDC: 22, saveType: 'con' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'elderwyrm_multiattack', name: 'Bite and Claws', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'A devastating combination of razor-sharp teeth and ancient claws.',
      },
      {
        id: 'elderwyrm_breath', name: 'Glacial Breath', type: 'aoe',
        damage: '14d6', damageType: 'COLD', saveType: 'con', saveDC: 22,
        priority: 10, recharge: 5, cooldown: 0,
        description: 'A cone of absolute cold freezes everything it touches.',
      },
      {
        id: 'elderwyrm_fear', name: 'Frightful Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 21, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'The wyrm\'s presence inspires primal terror in all who face it.',
      },
      {
        id: 'elderwyrm_tail', name: 'Tail Sweep', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 20,
        priority: 6, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The wyrm\'s massive tail sweeps across the ground.',
      },
    ],
    stats: {
      hp: 560, ac: 24, attack: 21, damage: '5d8+12',
      str: 30, dex: 12, con: 26, int: 18, wis: 16, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 400, maxQty: 600, gold: 45 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.08, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Elder Wyrm Scale' },
    ],
  },
  {
    name: 'Arcane Titan',
    level: 47,
    biome: 'FEYWILD',
    regionName: 'Glimmerveil',
    category: 'construct', encounterType: 'boss', sentient: true, size: 'gargantuan',
    damageType: 'FORCE',
    immunities: ['PSYCHIC', 'FORCE'],
    resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
    conditionImmunities: ['charmed', 'frightened'],
    legendaryActions: 2,
    legendaryResistances: 2,
    phaseTransitions: [
      {
        id: 'arcanetitan_overload',
        hpThresholdPercent: 30,
        name: 'Arcane Overload',
        description: 'The Titan channels overwhelming arcane energy, becoming a conduit of raw magical power.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 5 } },
          { type: 'add_ability', addAbility: { id: 'arcanetitan_nova', name: 'Arcane Nova', type: 'aoe', damage: '12d8', damageType: 'FORCE', saveType: 'wis', saveDC: 23, cooldown: 3, priority: 10, description: 'A cataclysmic explosion of pure arcane energy.' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'arcanetitan_fist', name: 'Arcane Fist', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Fists glowing with arcane energy strike with devastating force.',
      },
      {
        id: 'arcanetitan_cataclysm', name: 'Arcane Cataclysm', type: 'aoe',
        damage: '10d8', damageType: 'FORCE', saveType: 'wis', saveDC: 22,
        priority: 9, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'A wave of pure arcane destruction rolls across the battlefield.',
      },
      {
        id: 'arcanetitan_pulse', name: 'Antimagic Pulse', type: 'status',
        saveType: 'int', saveDC: 22, statusEffect: 'weakened', statusDuration: 2,
        priority: 7, cooldown: 4,
        description: 'A pulse of antimagic suppresses all magical ability.',
      },
      {
        id: 'arcanetitan_shield', name: 'Arcane Shield', type: 'buff',
        statusEffect: 'shielded', statusDuration: 2,
        priority: 4, cooldown: 4,
        description: 'A shimmering barrier of arcane energy absorbs incoming damage.',
      },
    ],
    stats: {
      hp: 580, ac: 24, attack: 21, damage: '5d8+12',
      str: 28, dex: 12, con: 24, int: 24, wis: 20, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 400, maxQty: 600, gold: 25 },
      { dropChance: 0.70, minQty: 5, maxQty: 10, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.08, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Titan Shard' },
    ],
  },
  {
    name: 'Tarrasque',
    level: 49,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'monstrosity', encounterType: 'world_boss', sentient: false, size: 'gargantuan',
    damageType: 'PIERCING',
    immunities: ['FIRE', 'POISON'],
    resistances: ['COLD', 'LIGHTNING', 'SLASHING', 'PIERCING', 'BLUDGEONING'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
    critResistance: -30,
    legendaryActions: 3,
    legendaryResistances: 3,
    phaseTransitions: [
      {
        id: 'tarrasque_rage',
        hpThresholdPercent: 50,
        name: 'Primal Rage',
        description: 'The Tarrasque enters a primal fury, its attacks becoming even more devastating.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3 } },
          { type: 'aoe_burst', aoeBurst: { damage: '8d6', damageType: 'BLUDGEONING', saveDC: 22, saveType: 'str' } },
        ],
      },
      {
        id: 'tarrasque_extinction',
        hpThresholdPercent: 20,
        name: 'Extinction Event',
        description: 'The Tarrasque rears up and brings its full apocalyptic might to bear.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 5, ac: 2 } },
          { type: 'add_ability', addAbility: { id: 'tarrasque_quake', name: 'Earthshatter', type: 'aoe', damage: '12d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 24, cooldown: 3, priority: 10, description: 'The earth itself shatters beneath the Tarrasque\'s rage.' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'tarrasque_multiattack', name: 'Rend and Tear', type: 'multiattack',
        attacks: 4, priority: 5, cooldown: 0,
        description: 'Bite, two claws, and tail strike with world-ending force.',
      },
      {
        id: 'tarrasque_swallow', name: 'Swallow', type: 'swallow',
        saveType: 'str', saveDC: 24,
        swallowDamage: '5d8', swallowDamageType: 'ACID', swallowEscapeThreshold: 40,
        priority: 8, cooldown: 4,
        description: 'The Tarrasque swallows its prey whole.',
      },
      {
        id: 'tarrasque_fear', name: 'Frightful Presence', type: 'fear_aura',
        saveType: 'wis', saveDC: 23, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'The Tarrasque\'s presence is the stuff of nightmares.',
      },
      {
        id: 'tarrasque_tail', name: 'Tail Sweep', type: 'aoe',
        damage: '8d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 22,
        priority: 7, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 1,
        description: 'The Tarrasque\'s tail levels everything in its path.',
      },
    ],
    stats: {
      hp: 640, ac: 25, attack: 22, damage: '5d10+14',
      str: 30, dex: 12, con: 30, int: 4, wis: 14, cha: 14,
    },
    lootTable: [
      { dropChance: 0.90, minQty: 500, maxQty: 800, gold: 0 },
      { dropChance: 0.60, minQty: 4, maxQty: 8, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.05, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Tarrasque Plate' },
    ],
  },
  {
    name: 'Void Emperor',
    level: 50,
    biome: 'UNDERGROUND',
    regionName: 'Vel\'Naris Underdark',
    category: 'aberration', encounterType: 'world_boss', sentient: true, size: 'large',
    damageType: 'PSYCHIC',
    immunities: ['PSYCHIC', 'NECROTIC', 'POISON'],
    resistances: ['COLD', 'FIRE', 'LIGHTNING', 'FORCE'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
    critResistance: -25,
    legendaryActions: 3,
    legendaryResistances: 3,
    phaseTransitions: [
      {
        id: 'voidemperor_ascension',
        hpThresholdPercent: 50,
        name: 'Void Ascension',
        description: 'The Void Emperor transcends mortal form, reality warping around it.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 4, damage: 4 } },
          { type: 'aoe_burst', aoeBurst: { damage: '10d8', damageType: 'PSYCHIC', saveDC: 24, saveType: 'wis' } },
        ],
      },
      {
        id: 'voidemperor_horizon',
        hpThresholdPercent: 20,
        name: 'Event Horizon',
        description: 'The Void Emperor becomes an event horizon — reality collapses around it.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { ac: 3 } },
          { type: 'add_ability', addAbility: { id: 'voidemperor_collapse', name: 'Dimensional Collapse', type: 'aoe', damage: '14d8', damageType: 'FORCE', saveType: 'int', saveDC: 25, cooldown: 3, priority: 10, description: 'Reality itself tears apart in a sphere of annihilation.' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'voidemperor_rend', name: 'Void Rend', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'Three slashes through the fabric of reality itself.',
      },
      {
        id: 'voidemperor_tear', name: 'Reality Tear', type: 'aoe',
        damage: '12d8', damageType: 'PSYCHIC', saveType: 'wis', saveDC: 24,
        priority: 9, cooldown: 2,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The Emperor tears reality apart, psychic energy flooding the void.',
      },
      {
        id: 'voidemperor_dread', name: 'Existential Dread', type: 'fear_aura',
        saveType: 'wis', saveDC: 24, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'The Emperor\'s presence threatens to erase the concept of self.',
      },
      {
        id: 'voidemperor_drain', name: 'Void Drain', type: 'on_hit',
        saveType: 'wis', saveDC: 22, statusEffect: 'weakened', statusDuration: 3,
        description: 'Each strike drains meaning from the target\'s existence.',
      },
      {
        id: 'voidemperor_rift', name: 'Dimensional Rift', type: 'status',
        saveType: 'int', saveDC: 23, statusEffect: 'stunned', statusDuration: 2,
        priority: 10, cooldown: 4,
        isLegendaryAction: true, legendaryCost: 2,
        description: 'The Emperor opens a rift in spacetime, trapping the target between dimensions.',
      },
      {
        id: 'voidemperor_death', name: 'Void Collapse', type: 'death_throes',
        deathDamage: '12d8', deathDamageType: 'PSYCHIC', deathSaveDC: 22, deathSaveType: 'wis',
        description: 'The Emperor\'s destruction collapses the surrounding dimensional fabric.',
      },
    ],
    stats: {
      hp: 650, ac: 25, attack: 22, damage: '5d10+14',
      str: 24, dex: 16, con: 26, int: 28, wis: 24, cha: 26,
    },
    lootTable: [
      { dropChance: 0.90, minQty: 500, maxQty: 800, gold: 30 },
      { dropChance: 0.50, minQty: 5, maxQty: 8, gold: 0, itemTemplateName: 'Arcane Reagents' },
      { dropChance: 0.05, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Void Fragment' },
    ],
  },
  {
    name: 'Ember Titan',
    level: 41,
    biome: 'VOLCANIC',
    regionName: 'The Confluence',
    category: 'elemental', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'FIRE',
    immunities: ['FIRE', 'POISON'],
    vulnerabilities: ['COLD'],
    abilities: [
      {
        id: 'embertitan_multiattack', name: 'Magma Fist', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two fists of molten rock crash down with volcanic fury.',
      },
      {
        id: 'embertitan_eruption', name: 'Eruption', type: 'aoe',
        damage: '6d8', damageType: 'FIRE', saveType: 'dex', saveDC: 20,
        priority: 8, cooldown: 3,
        description: 'The titan erupts, showering the area in magma and superheated rock.',
      },
      {
        id: 'embertitan_aura', name: 'Magma Skin', type: 'damage_aura',
        auraDamage: '2d6', auraDamageType: 'FIRE',
        description: 'The titan\'s molten skin sears anyone who strikes it.',
      },
    ],
    stats: {
      hp: 460, ac: 22, attack: 19, damage: '4d8+10',
      str: 26, dex: 10, con: 24, int: 6, wis: 12, cha: 8,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 200, maxQty: 350, gold: 0 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Ancient Forest Guardian',
    level: 41,
    biome: 'FOREST',
    regionName: 'Silverwood Forest',
    category: 'plant', encounterType: 'elite', sentient: false, size: 'gargantuan',
    damageType: 'BLUDGEONING',
    immunities: ['LIGHTNING'],
    resistances: ['SLASHING', 'PIERCING'],
    vulnerabilities: ['FIRE'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'ancientforestguardian_multiattack', name: 'Ancient Limb', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two gargantuan limbs of ancient wood crash down with earth-shaking force.',
      },
      {
        id: 'ancientforestguardian_roots', name: 'Root Eruption', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 20,
        priority: 8, cooldown: 3,
        description: 'Massive roots erupt from the earth, battering everything in range.',
      },
      {
        id: 'ancientforestguardian_heal', name: 'Ancient Bark', type: 'heal',
        hpPerTurn: 20, disabledBy: ['FIRE'],
        priority: 3, cooldown: 0,
        description: 'Centuries-old bark regrows with supernatural speed unless burned.',
      },
      {
        id: 'ancientforestguardian_entangle', name: 'Entangle', type: 'on_hit',
        saveType: 'str', saveDC: 20, statusEffect: 'restrained', statusDuration: 2,
        description: 'Grasping roots and vines wrap around the target, pinning them in place.',
      },
    ],
    stats: {
      hp: 500, ac: 22, attack: 19, damage: '4d10+10',
      str: 28, dex: 6, con: 26, int: 8, wis: 18, cha: 8,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 200, maxQty: 380, gold: 0 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Arcane Reagents' },
    ],
  },
  {
    name: 'Swamp Hydra',
    level: 43,
    biome: 'SWAMP',
    regionName: 'Shadowmere Marshes',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'ACID',
    abilities: [
      {
        id: 'swamphydra_multiattack', name: 'Four-Headed Bite', type: 'multiattack',
        attacks: 4, priority: 5, cooldown: 0,
        description: 'Four serpentine heads lunge simultaneously, dripping corrosive venom.',
      },
      {
        id: 'swamphydra_regen', name: 'Regeneration', type: 'heal',
        hpPerTurn: 15, disabledBy: ['FIRE', 'ACID'],
        priority: 3, cooldown: 0,
        description: 'Severed heads regrow and wounds close unless cauterized.',
      },
    ],
    stats: {
      hp: 480, ac: 22, attack: 19, damage: '4d8+10',
      str: 24, dex: 12, con: 24, int: 4, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 220, maxQty: 400, gold: 0 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.40, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Mind Reaver',
    level: 44,
    biome: 'UNDERGROUND',
    regionName: 'Vel\'Naris Underdark',
    category: 'aberration', encounterType: 'standard', sentient: true, size: 'large',
    damageType: 'PSYCHIC',
    immunities: ['PSYCHIC'],
    abilities: [
      {
        id: 'mindreaver_multiattack', name: 'Tentacle Lash', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two writhing tentacles strike with psychic-charged precision.',
      },
      {
        id: 'mindreaver_mindblast', name: 'Mind Blast', type: 'status',
        saveType: 'int', saveDC: 21, statusEffect: 'stunned', statusDuration: 1,
        priority: 9, cooldown: 3,
        description: 'A devastating psychic shockwave overwhelms the target\'s consciousness.',
      },
      {
        id: 'mindreaver_braindrain', name: 'Brain Drain', type: 'on_hit',
        saveType: 'wis', saveDC: 20, statusEffect: 'weakened', statusDuration: 2,
        description: 'Each strike siphons thought and will from the target\'s mind.',
      },
    ],
    stats: {
      hp: 470, ac: 22, attack: 19, damage: '4d8+10',
      str: 16, dex: 16, con: 20, int: 24, wis: 20, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 250, maxQty: 400, gold: 30 },
      { dropChance: 0.45, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Tundra Sentinel',
    level: 44,
    biome: 'TUNDRA',
    regionName: 'Frozen Reaches',
    category: 'construct', encounterType: 'standard', sentient: false, size: 'large',
    damageType: 'COLD',
    immunities: ['COLD', 'POISON'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    abilities: [
      {
        id: 'tundrasentinel_multiattack', name: 'Frost Slam', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two ice-encased fists slam down with numbing cold.',
      },
      {
        id: 'tundrasentinel_frostnova', name: 'Frost Nova', type: 'aoe',
        damage: '5d8', damageType: 'COLD', saveType: 'con', saveDC: 20,
        priority: 8, cooldown: 3,
        description: 'A burst of absolute cold radiates outward, flash-freezing the area.',
      },
    ],
    stats: {
      hp: 480, ac: 23, attack: 19, damage: '4d8+10',
      str: 22, dex: 10, con: 24, int: 3, wis: 12, cha: 3,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 220, maxQty: 380, gold: 0 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Plains Thunderherd',
    level: 45,
    biome: 'PLAINS',
    regionName: 'Verdant Heartlands',
    category: 'beast', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    abilities: [
      {
        id: 'plainsthunderherd_multiattack', name: 'Horn and Hoof', type: 'multiattack',
        attacks: 3, priority: 5, cooldown: 0,
        description: 'Massive horns and thundering hooves strike with the force of a stampede.',
      },
      {
        id: 'plainsthunderherd_trample', name: 'Trampling Rush', type: 'on_hit',
        saveType: 'str', saveDC: 21, statusEffect: 'knocked_down', statusDuration: 1,
        description: 'The thunderherd\'s charge knocks the target flat.',
      },
      {
        id: 'plainsthunderherd_stampede', name: 'Stampede', type: 'aoe',
        damage: '6d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 21,
        priority: 8, cooldown: 4,
        description: 'The entire herd stampedes, crushing everything in the area.',
      },
    ],
    stats: {
      hp: 490, ac: 22, attack: 20, damage: '4d10+10',
      str: 28, dex: 10, con: 26, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 250, maxQty: 400, gold: 0 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.40, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Blight Dragon',
    level: 45,
    biome: 'HILLS',
    regionName: 'Cogsworth Warrens',
    category: 'dragon', encounterType: 'boss', sentient: true, size: 'huge',
    damageType: 'POISON',
    immunities: ['POISON'],
    resistances: ['ACID'],
    legendaryActions: 2,
    legendaryResistances: 1,
    phaseTransitions: [
      {
        id: 'blightdragon_plague',
        hpThresholdPercent: 30,
        name: 'Plague Unleashed',
        description: 'The Blight Dragon\'s body erupts with concentrated pestilence, poisoning the very air.',
        triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3, ac: 1 } },
          { type: 'aoe_burst', aoeBurst: { damage: '6d8', damageType: 'POISON', saveDC: 21, saveType: 'con' } },
        ],
      },
    ],
    abilities: [
      {
        id: 'blightdragon_multiattack', name: 'Bite and Claw', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Venom-dripping jaws and plague-infused claws rend flesh and spirit.',
      },
      {
        id: 'blightdragon_breath', name: 'Plague Breath', type: 'aoe',
        damage: '8d8', damageType: 'POISON', saveType: 'con', saveDC: 21,
        priority: 10, recharge: 5, cooldown: 0,
        description: 'A billowing cloud of concentrated plague dissolves all it touches.',
      },
      {
        id: 'blightdragon_bite', name: 'Corrosive Bite', type: 'on_hit',
        saveType: 'con', saveDC: 21, statusEffect: 'poisoned', statusDuration: 2,
        description: 'Each bite injects a virulent toxin that weakens the body.',
      },
      {
        id: 'blightdragon_fear', name: 'Plague Dread', type: 'fear_aura',
        saveType: 'wis', saveDC: 20, statusEffect: 'frightened', statusDuration: 2,
        auraRepeats: false,
        description: 'The stench of disease and decay inspires primal terror.',
      },
    ],
    stats: {
      hp: 540, ac: 23, attack: 20, damage: '5d8+11',
      str: 26, dex: 12, con: 24, int: 16, wis: 16, cha: 18,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 350, maxQty: 550, gold: 40 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Bones' },
    ],
  },
  {
    name: 'Granite Warden',
    level: 46,
    biome: 'MOUNTAIN',
    regionName: 'Ironvault Mountains',
    category: 'construct', encounterType: 'standard', sentient: false, size: 'huge',
    damageType: 'BLUDGEONING',
    resistances: ['SLASHING', 'PIERCING'],
    conditionImmunities: ['poisoned', 'frightened', 'charmed'],
    critResistance: -15,
    abilities: [
      {
        id: 'granitewarden_multiattack', name: 'Stone Fist', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Two enormous granite fists pound down with mountainous force.',
      },
      {
        id: 'granitewarden_avalanche', name: 'Avalanche Slam', type: 'aoe',
        damage: '6d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 21,
        priority: 8, cooldown: 3,
        description: 'The warden slams the ground, triggering a localized avalanche.',
      },
    ],
    stats: {
      hp: 520, ac: 24, attack: 20, damage: '4d10+11',
      str: 26, dex: 8, con: 26, int: 3, wis: 12, cha: 3,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 250, maxQty: 400, gold: 0 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Siege Wurm',
    level: 48,
    biome: 'DESERT',
    regionName: 'The Suncoast',
    category: 'monstrosity', encounterType: 'standard', sentient: false, size: 'gargantuan',
    damageType: 'PIERCING',
    abilities: [
      {
        id: 'siegewurm_multiattack', name: 'Bite and Tail', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Enormous mandibles and a crushing tail strike with siege-engine force.',
      },
      {
        id: 'siegewurm_burrow', name: 'Burrowing Eruption', type: 'aoe',
        damage: '7d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 22,
        priority: 8, cooldown: 3,
        description: 'The wurm erupts from underground, showering the area in rock and debris.',
      },
      {
        id: 'siegewurm_constrict', name: 'Constrict', type: 'on_hit',
        saveType: 'str', saveDC: 22, statusEffect: 'restrained', statusDuration: 2,
        description: 'The wurm coils around its prey, crushing with immense pressure.',
      },
    ],
    stats: {
      hp: 540, ac: 23, attack: 21, damage: '5d8+12',
      str: 28, dex: 10, con: 26, int: 3, wis: 12, cha: 6,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 280, maxQty: 420, gold: 0 },
      { dropChance: 0.55, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Hide' },
      { dropChance: 0.40, minQty: 2, maxQty: 5, gold: 0, itemTemplateName: 'Monster Parts' },
    ],
  },
  {
    name: 'Abyssal Ravager',
    level: 48,
    biome: 'COASTAL',
    regionName: 'The Suncoast',
    category: 'fiend', encounterType: 'elite', sentient: true, size: 'large',
    damageType: 'FIRE',
    immunities: ['FIRE', 'POISON'],
    resistances: ['COLD'],
    legendaryActions: 1,
    abilities: [
      {
        id: 'abyssalravager_multiattack', name: 'Hellblade Strike', type: 'multiattack',
        attacks: 2, priority: 5, cooldown: 0,
        description: 'Twin blades forged in the abyss strike with searing fury.',
      },
      {
        id: 'abyssalravager_hellfire', name: 'Hellfire Wave', type: 'aoe',
        damage: '7d8', damageType: 'FIRE', saveType: 'dex', saveDC: 22,
        priority: 8, cooldown: 2,
        description: 'A crescent wave of hellfire incinerates everything in its path.',
      },
      {
        id: 'abyssalravager_aura', name: 'Brimstone Cloak', type: 'damage_aura',
        auraDamage: '2d8', auraDamageType: 'FIRE',
        description: 'A cloak of brimstone and flame sears anyone who strikes the ravager.',
      },
    ],
    stats: {
      hp: 560, ac: 23, attack: 21, damage: '5d8+12',
      str: 24, dex: 18, con: 24, int: 18, wis: 16, cha: 22,
    },
    lootTable: [
      { dropChance: 0.80, minQty: 300, maxQty: 450, gold: 35 },
      { dropChance: 0.50, minQty: 3, maxQty: 6, gold: 0, itemTemplateName: 'Monster Parts' },
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

    // Compute formula CR
    const crInput: CRInput = {
      hp: monster.stats.hp,
      ac: monster.stats.ac,
      attack: monster.stats.attack,
      damage: monster.stats.damage,
      level: monster.level,
      resistances: monster.resistances,
      immunities: monster.immunities,
      vulnerabilities: monster.vulnerabilities,
      abilities: monster.abilities?.map(a => ({
        type: a.type as CRInput['abilities'][0]['type'],
        damage: a.damage,
        saveDC: a.saveDC,
        saveType: a.saveType,
        attacks: a.attacks,
        statusEffect: a.statusEffect,
        statusDuration: a.statusDuration,
        recharge: a.recharge,
        cooldown: a.cooldown,
      })),
      legendaryActions: monster.legendaryActions,
      legendaryResistances: monster.legendaryResistances,
      fearAura: monster.abilities?.some(a => a.type === 'fear_aura'),
      damageAura: monster.abilities?.find(a => a.type === 'damage_aura')
        ? { damage: monster.abilities.find(a => a.type === 'damage_aura')!.auraDamage ?? '0' }
        : undefined,
      deathThroesDamage: monster.abilities?.find(a => a.type === 'death_throes')?.deathDamage,
      phaseTransitions: monster.phaseTransitions,
    };
    const formulaCR = computeFormulaCR(crInput);

    const monsterData = {
      stats: monster.stats,
      lootTable: monster.lootTable,
      regionId,
      biome: monster.biome,
      damageType: monster.damageType ?? 'BLUDGEONING',
      abilities: (monster.abilities ?? []) as any,
      resistances: monster.resistances ?? [],
      immunities: monster.immunities ?? [],
      vulnerabilities: monster.vulnerabilities ?? [],
      conditionImmunities: monster.conditionImmunities ?? [],
      critImmunity: monster.critImmunity ?? false,
      critResistance: monster.critResistance ?? 0,
      legendaryActions: monster.legendaryActions ?? 0,
      legendaryResistances: monster.legendaryResistances ?? 0,
      phaseTransitions: (monster.phaseTransitions ?? []) as any,
      formulaCR,
      encounterType: monster.encounterType ?? 'standard',
      category: monster.category ?? 'beast',
      sentient: monster.sentient ?? false,
      size: monster.size ?? 'medium',
      tags: {
        subcategory: monster.subcategory,
        isSolitary: monster.isSolitary,
        environment: monster.environment,
      },
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
