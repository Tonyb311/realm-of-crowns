/**
 * World Seed Data for Realm of Crowns
 *
 * Seeds: Regions, Towns, Travel Routes, Town Resources, Region Borders, Exclusive Zones
 * Source: docs/WORLD_MAP.md and docs/RACES.md
 *
 * All 8 core regions + 13 sub-regions = 21 territories
 * All 69 towns across Aethermere (68 racial + 1 neutral Changeling hub)
 */

import { PrismaClient, BiomeType, ResourceType } from '@prisma/client';

// ============================================================
// REGION DEFINITIONS
// ============================================================

interface RegionDef {
  name: string;
  description: string;
  biome: BiomeType;
  levelMin: number;
  levelMax: number;
}

const REGIONS: RegionDef[] = [
  // --- Core Regions (8) ---
  {
    name: 'Verdant Heartlands',
    description: 'The political and economic center of Aethermere. Fertile plains, rolling hills, and thriving cities make this the breadbasket of the continent. Homeland of the Humans.',
    biome: 'PLAINS',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'Silverwood Forest',
    description: 'An ancient, living forest where trees are thousands of years old, rivers sing, and the veil between worlds grows thin. Homeland of the Elves.',
    biome: 'FOREST',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'Ironvault Mountains',
    description: 'Vast underground complexes of halls, forges, mines, and vaults carved into the mountain bones over uncounted centuries. Homeland of the Dwarves.',
    biome: 'MOUNTAIN',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'The Crossroads',
    description: 'The most strategically valuable land in Aethermere, where every major trade route intersects. Rolling hills and fertile valleys. Homeland of the Harthfolk.',
    biome: 'HILLS',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'Ashenfang Wastes',
    description: 'A brutal expanse of scorched badlands, volcanic rock, and sparse resources. A land that kills the weak and hardens the strong. Homeland of the Orcs.',
    biome: 'BADLANDS',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'Shadowmere Marshes',
    description: 'Treacherous bogs, mists, and things that lurk beneath still waters. The Nethkin have mastered alchemy, dark magic, and survival in this forsaken land.',
    biome: 'SWAMP',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'Frozen Reaches',
    description: 'Glacial tundra and volcanic peaks where the Drakonid clans dwell. Ancient dragon lairs dot the landscape, and the air itself crackles with primal power.',
    biome: 'TUNDRA',
    levelMin: 1,
    levelMax: 50,
  },
  {
    name: 'The Suncoast',
    description: 'A stretch of warm coastline that no single race has held permanently. Cosmopolitan Free Cities serve as the economic engine of Aethermere, where all races mingle.',
    biome: 'COASTAL',
    levelMin: 1,
    levelMax: 50,
  },

  // --- Common Race Territories (6) ---
  {
    name: 'Twilight March',
    description: 'The borderland between the Verdant Heartlands and Silverwood Forest, where Human ambition and Elven grace meet. Home to the Half-Elves.',
    biome: 'FOREST',
    levelMin: 1,
    levelMax: 40,
  },
  {
    name: 'Scarred Frontier',
    description: 'The war-torn border between Ashenfang Wastes and the Heartlands. A proving ground where what you DO matters more than what you ARE. Home to the Half-Orcs.',
    biome: 'BADLANDS',
    levelMin: 5,
    levelMax: 45,
  },
  {
    name: 'Cogsworth Warrens',
    description: 'Elaborate burrow-cities in the Ironvault foothills filled with clockwork mechanisms, alchemical experiments, and at least one thing currently on fire. Home to the Gnomes.',
    biome: 'HILLS',
    levelMin: 1,
    levelMax: 40,
  },
  {
    name: 'Pelagic Depths',
    description: 'Underwater settlements off the Suncoast where coral cities shimmer beneath the waves. Only the Merfolk can freely access the deep ocean resources here.',
    biome: 'UNDERWATER',
    levelMin: 1,
    levelMax: 45,
  },
  {
    name: 'Thornwilds',
    description: 'Untamed wilderness between civilized regions where nature is still wild and dangerous. The Beastfolk packs roam these lands as supreme survivalists.',
    biome: 'FOREST',
    levelMin: 5,
    levelMax: 45,
  },
  {
    name: 'Glimmerveil',
    description: 'A pocket realm accessible through Silverwood where the border between the mortal world and the Feywild shimmers. Home to the Faefolk.',
    biome: 'FEYWILD',
    levelMin: 1,
    levelMax: 50,
  },

  // --- Exotic Race Territories (7) ---
  {
    name: 'Skypeak Plateaus',
    description: 'Extreme high-altitude peaks above the Ironvault where the air thins and lesser races can barely breathe. Home to the Goliaths.',
    biome: 'MOUNTAIN',
    levelMin: 10,
    levelMax: 50,
  },
  {
    name: "Vel'Naris Underdark",
    description: 'A vast underground network beneath Shadowmere with obsidian cities, spider-silk farms, and shadow magic. Home to the Nightborne.',
    biome: 'UNDERGROUND',
    levelMin: 10,
    levelMax: 50,
  },
  {
    name: 'Mistwood Glens',
    description: 'Hidden valleys deep within the oldest parts of Silverwood where Mosskin tend to nature in secret. The most powerful druidic site in Aethermere.',
    biome: 'FOREST',
    levelMin: 10,
    levelMax: 50,
  },
  {
    name: 'The Foundry',
    description: 'An ancient abandoned construct facility in no-mans land, partially restored by the Forgeborn who were created here centuries ago.',
    biome: 'MOUNTAIN',
    levelMin: 10,
    levelMax: 50,
  },
  {
    name: 'The Confluence',
    description: 'Where four elemental planes leak into the mortal world. The very air crackles with raw elemental power. Home to the Elementari.',
    biome: 'VOLCANIC',
    levelMin: 10,
    levelMax: 50,
  },
  {
    name: 'Ashenmoor',
    description: 'A cursed battlefield where death does not stick. Necromantic energy permeates the soil, and the undying community of Revenants has formed here.',
    biome: 'SWAMP',
    levelMin: 15,
    levelMax: 50,
  },
  // Changeling has no territory -- nomadic
];

// ============================================================
// TOWN DEFINITIONS
// ============================================================

interface TownDef {
  name: string;
  regionName: string;
  population: number;
  biome: BiomeType;
  description: string;
  availableBuildings: string[];
  x: number;
  y: number;
  prosperityLevel: number; // 1-5
  specialty: string;
}

const TOWNS: TownDef[] = [
  // ========================================
  // VERDANT HEARTLANDS (Human) - 5 towns
  // ========================================
  {
    name: 'Kingshold',
    regionName: 'Verdant Heartlands',
    population: 15000,
    biome: 'PLAINS',
    description: 'The capital of the Heartlands. Home to the Royal Palace, Grand Market, and Arena. The political center of Aethermere.',
    availableBuildings: ['SMITHY', 'MARKET_STALL', 'BANK', 'INN', 'STABLE', 'WAREHOUSE', 'TAILOR_SHOP', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 500, y: 500,
    prosperityLevel: 5,
    specialty: 'Politics and Trade',
  },
  {
    name: 'Millhaven',
    regionName: 'Verdant Heartlands',
    population: 5000,
    biome: 'PLAINS',
    description: 'A prosperous plains town with the largest granary in Aethermere. The breadbasket of the continent.',
    availableBuildings: ['FARM', 'RANCH', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'KITCHEN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 470, y: 530,
    prosperityLevel: 4,
    specialty: 'Agriculture',
  },
  {
    name: 'Bridgewater',
    regionName: 'Verdant Heartlands',
    population: 7000,
    biome: 'RIVER',
    description: 'A river town at the crossroads of three trade routes. A hub for fishermen and merchants alike.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'BANK', 'STABLE', 'KITCHEN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 530, y: 480,
    prosperityLevel: 4,
    specialty: 'River Trade',
  },
  {
    name: 'Ironford',
    regionName: 'Verdant Heartlands',
    population: 4500,
    biome: 'HILLS',
    description: 'A hill town known for its military academy and weapon forges. Limited mining supports a thriving smithing industry.',
    availableBuildings: ['SMITHY', 'SMELTERY', 'MINE', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 540, y: 520,
    prosperityLevel: 3,
    specialty: 'Weapons and Military',
  },
  {
    name: 'Whitefield',
    regionName: 'Verdant Heartlands',
    population: 4000,
    biome: 'PLAINS',
    description: 'Famous for its cotton fields, tailors, and cloth market. The textile capital of Aethermere.',
    availableBuildings: ['FARM', 'TAILOR_SHOP', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 480, y: 510,
    prosperityLevel: 3,
    specialty: 'Textiles',
  },

  // ========================================
  // SILVERWOOD FOREST (Elf) - 5 towns
  // ========================================
  {
    name: 'Aelindra',
    regionName: 'Silverwood Forest',
    population: 8000,
    biome: 'FOREST',
    description: 'The Elven capital, a magnificent treetop city. Home to the Great Library and the Enchanting Spire.',
    availableBuildings: ['ENCHANTING_TOWER', 'SCRIBE_STUDY', 'ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'LUMBER_MILL', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 350, y: 400,
    prosperityLevel: 5,
    specialty: 'Enchanting and Lore',
  },
  {
    name: 'Moonhaven',
    regionName: 'Silverwood Forest',
    population: 2500,
    biome: 'FOREST',
    description: 'A settlement deep in the forest, surrounded by moonlit glades with rare herb spawns. Center of Elven herbalism and alchemy.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 320, y: 380,
    prosperityLevel: 3,
    specialty: 'Herbalism and Alchemy',
  },
  {
    name: 'Thornwatch',
    regionName: 'Silverwood Forest',
    population: 3000,
    biome: 'FOREST',
    description: 'A ranger outpost on the forest edge, known for bow crafting masters and the finest fletchers in the land.',
    availableBuildings: ['FLETCHER_BENCH', 'LUMBER_MILL', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL'],
    x: 380, y: 430,
    prosperityLevel: 3,
    specialty: 'Archery and Fletching',
  },
  {
    name: 'Willowmere',
    regionName: 'Silverwood Forest',
    population: 2000,
    biome: 'FOREST',
    description: 'A peaceful lakeside settlement known for its crystal-clear waters, paper mills, and Elven scribes.',
    availableBuildings: ['SCRIBE_STUDY', 'LUMBER_MILL', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 340, y: 420,
    prosperityLevel: 3,
    specialty: 'Scribing and Paper',
  },
  {
    name: 'Eldergrove',
    regionName: 'Silverwood Forest',
    population: 1500,
    biome: 'FOREST',
    description: 'A sacred grove housing the Temple of the Old Gods and the finest healer sanctuary in Aethermere.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 310, y: 400,
    prosperityLevel: 2,
    specialty: 'Healing and Divination',
  },

  // ========================================
  // IRONVAULT MOUNTAINS (Dwarf) - 5 towns
  // ========================================
  {
    name: 'Kazad-Vorn',
    regionName: 'Ironvault Mountains',
    population: 10000,
    biome: 'UNDERGROUND',
    description: "The Dwarven capital, a vast underground city of grand halls and roaring forges. Home to the Great Forge and the Thane's Hall.",
    availableBuildings: ['SMITHY', 'SMELTERY', 'MINE', 'JEWELER_WORKSHOP', 'MASON_YARD', 'MARKET_STALL', 'BANK', 'INN', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 600, y: 300,
    prosperityLevel: 5,
    specialty: 'Forging and Mining',
  },
  {
    name: 'Deepvein',
    regionName: 'Ironvault Mountains',
    population: 3500,
    biome: 'UNDERGROUND',
    description: 'Home to the deepest mine in Aethermere, where mithril veins glow in the dark. A smelting powerhouse.',
    availableBuildings: ['MINE', 'SMELTERY', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 620, y: 280,
    prosperityLevel: 4,
    specialty: 'Deep Mining and Mithril',
  },
  {
    name: 'Hammerfall',
    regionName: 'Ironvault Mountains',
    population: 4000,
    biome: 'MOUNTAIN',
    description: 'A mountain pass fortress guarding the border against Orc raids. Known for its armorsmiths and military discipline.',
    availableBuildings: ['SMITHY', 'SMELTERY', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 640, y: 320,
    prosperityLevel: 3,
    specialty: 'Armor Smithing',
  },
  {
    name: 'Gemhollow',
    regionName: 'Ironvault Mountains',
    population: 2500,
    biome: 'UNDERGROUND',
    description: 'A cavern town nestled among crystal caverns with rare gem deposits. The jeweling capital of Aethermere.',
    availableBuildings: ['JEWELER_WORKSHOP', 'MINE', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 610, y: 260,
    prosperityLevel: 4,
    specialty: 'Gem Cutting and Jewelry',
  },
  {
    name: 'Alehearth',
    regionName: 'Ironvault Mountains',
    population: 3000,
    biome: 'MOUNTAIN',
    description: 'A mountain valley town famous for Dwarven ales and as a trade hub between the underground holds and the surface world.',
    availableBuildings: ['BREWERY', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 580, y: 330,
    prosperityLevel: 3,
    specialty: 'Brewing and Surface Trade',
  },

  // ========================================
  // THE CROSSROADS (Harthfolk) - 5 towns
  // ========================================
  {
    name: 'Hearthshire',
    regionName: 'The Crossroads',
    population: 8000,
    biome: 'HILLS',
    description: 'The Harthfolk capital and trade center. Home to the Grand Exchange and the famous Harthfolk Bank.',
    availableBuildings: ['BANK', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'KITCHEN', 'BREWERY', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 450, y: 600,
    prosperityLevel: 5,
    specialty: 'Banking and Trade',
  },
  {
    name: 'Greenhollow',
    regionName: 'The Crossroads',
    population: 3500,
    biome: 'HILLS',
    description: 'A farming village with the best farmland in the region and a renowned cooking academy.',
    availableBuildings: ['FARM', 'KITCHEN', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 430, y: 620,
    prosperityLevel: 3,
    specialty: 'Cuisine and Farming',
  },
  {
    name: "Peddler's Rest",
    regionName: 'The Crossroads',
    population: 5000,
    biome: 'HILLS',
    description: 'A trade hub where every trade route passes through. Caravans from all corners of Aethermere stop here.',
    availableBuildings: ['MARKET_STALL', 'STABLE', 'WAREHOUSE', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 470, y: 610,
    prosperityLevel: 4,
    specialty: 'Caravan Trade',
  },
  {
    name: 'Bramblewood',
    regionName: 'The Crossroads',
    population: 2500,
    biome: 'FOREST',
    description: 'A forest-edge village known for hidden distilleries, herb gardens, and the finest Harthfolk mead.',
    availableBuildings: ['BREWERY', 'ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 420, y: 590,
    prosperityLevel: 2,
    specialty: 'Brewing and Herbalism',
  },
  {
    name: 'Riverside',
    regionName: 'The Crossroads',
    population: 3000,
    biome: 'RIVER',
    description: 'A charming river town famous for its inns and tournament fishing. Travelers come from afar to taste the fresh catch.',
    availableBuildings: ['INN', 'KITCHEN', 'MARKET_STALL', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 460, y: 630,
    prosperityLevel: 3,
    specialty: 'Fishing and Hospitality',
  },

  // ========================================
  // ASHENFANG WASTES (Orc) - 5 towns
  // ========================================
  {
    name: 'Grakthar',
    regionName: 'Ashenfang Wastes',
    population: 9000,
    biome: 'BADLANDS',
    description: "The Orc capital fortress. Home to the Warchief's Arena and the War Council. Strength is law here.",
    availableBuildings: ['SMITHY', 'TANNERY', 'STABLE', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 700, y: 500,
    prosperityLevel: 4,
    specialty: 'Warfare and Arena Combat',
  },
  {
    name: 'Bonepile',
    regionName: 'Ashenfang Wastes',
    population: 4000,
    biome: 'BADLANDS',
    description: 'A badlands town surrounded by massive hunting grounds and tanneries. The leather produced here is feared across Aethermere.',
    availableBuildings: ['TANNERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 720, y: 480,
    prosperityLevel: 2,
    specialty: 'Hunting and Leather',
  },
  {
    name: 'Ironfist Hold',
    regionName: 'Ashenfang Wastes',
    population: 3000,
    biome: 'VOLCANIC',
    description: 'Built on the volcanic edge of the Wastes, this settlement uses volcanic forges and obsidian deposits for crude but effective metalwork.',
    availableBuildings: ['MINE', 'SMELTERY', 'SMITHY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 740, y: 510,
    prosperityLevel: 2,
    specialty: 'Volcanic Forging',
  },
  {
    name: 'Thornback Camp',
    regionName: 'Ashenfang Wastes',
    population: 3500,
    biome: 'BADLANDS',
    description: 'A plains-edge settlement known for war beast breeding and border raids. The finest warbeasts in Aethermere are bred here.',
    availableBuildings: ['RANCH', 'STABLE', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 680, y: 520,
    prosperityLevel: 2,
    specialty: 'War Beast Breeding',
  },
  {
    name: 'Ashen Market',
    regionName: 'Ashenfang Wastes',
    population: 2500,
    biome: 'BADLANDS',
    description: 'The only place where outsiders regularly trade with Orcs. Mercenary contracts and exotic goods change hands here.',
    availableBuildings: ['MARKET_STALL', 'INN', 'STABLE', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 670, y: 540,
    prosperityLevel: 3,
    specialty: 'Mercenary Contracts',
  },

  // ========================================
  // SHADOWMERE MARSHES (Nethkin) - 5 towns
  // ========================================
  {
    name: 'Nethermire',
    regionName: 'Shadowmere Marshes',
    population: 6000,
    biome: 'SWAMP',
    description: 'The hidden Nethkin capital. Home to the Shadow Council chambers and secret markets where information is the most valuable currency.',
    availableBuildings: ['ALCHEMY_LAB', 'ENCHANTING_TOWER', 'MARKET_STALL', 'INN', 'SCRIBE_STUDY', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 400, y: 250,
    prosperityLevel: 4,
    specialty: 'Information and Dark Magic',
  },
  {
    name: 'Boghollow',
    regionName: 'Shadowmere Marshes',
    population: 2000,
    biome: 'SWAMP',
    description: 'Deep in the swamp, this settlement is built around mushroom caves and rare herb spawns. The finest alchemical ingredients grow here.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 380, y: 230,
    prosperityLevel: 2,
    specialty: 'Rare Alchemical Ingredients',
  },
  {
    name: 'Mistwatch',
    regionName: 'Shadowmere Marshes',
    population: 3000,
    biome: 'SWAMP',
    description: 'An intelligence network hub on the marsh edge. The spy guild operates openly here, and information flows like water.',
    availableBuildings: ['MARKET_STALL', 'INN', 'SCRIBE_STUDY', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 430, y: 260,
    prosperityLevel: 3,
    specialty: 'Espionage and Intelligence',
  },
  {
    name: 'Cinderkeep',
    regionName: 'Shadowmere Marshes',
    population: 2500,
    biome: 'VOLCANIC',
    description: 'Built atop volcanic hot springs in the swamp. The arcane forge here produces uniquely powerful enchantments.',
    availableBuildings: ['ENCHANTING_TOWER', 'SMELTERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 370, y: 260,
    prosperityLevel: 3,
    specialty: 'Arcane Forging',
  },
  {
    name: 'Whispering Docks',
    regionName: 'Shadowmere Marshes',
    population: 2500,
    biome: 'COASTAL',
    description: 'A black market port where contraband flows freely. If it exists and is illegal, you can buy it here.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 420, y: 230,
    prosperityLevel: 3,
    specialty: 'Smuggling and Contraband',
  },

  // ========================================
  // FROZEN REACHES (Drakonid) - 5 towns
  // ========================================
  {
    name: 'Drakenspire',
    regionName: 'Frozen Reaches',
    population: 5000,
    biome: 'MOUNTAIN',
    description: 'The Drakonid capital perched on a mountain peak. Home to the Dragon Temple and the Elder Council.',
    availableBuildings: ['SMITHY', 'SMELTERY', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 550, y: 150,
    prosperityLevel: 4,
    specialty: 'Dragon Worship and Metalwork',
  },
  {
    name: 'Frostfang',
    regionName: 'Frozen Reaches',
    population: 2500,
    biome: 'TUNDRA',
    description: 'A tundra town where mammoth hunts provide exotic furs and bone. The leatherwork here is unmatched in the north.',
    availableBuildings: ['TANNERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 520, y: 130,
    prosperityLevel: 2,
    specialty: 'Exotic Furs and Mammoth Bone',
  },
  {
    name: 'Emberpeak',
    regionName: 'Frozen Reaches',
    population: 3000,
    biome: 'VOLCANIC',
    description: 'Built around volcanic forges that burn with dragonfire. Rare ores from the volcanic depths are smelted here.',
    availableBuildings: ['MINE', 'SMELTERY', 'SMITHY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 570, y: 170,
    prosperityLevel: 3,
    specialty: 'Dragonfire Smelting',
  },
  {
    name: 'Scalehaven',
    regionName: 'Frozen Reaches',
    population: 2000,
    biome: 'COASTAL',
    description: 'A northern coastal trade port. Whaling ships depart from here, and it serves as the primary trade link to the south.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'STABLE', 'HOUSE_SMALL'],
    x: 580, y: 190,
    prosperityLevel: 3,
    specialty: 'Whaling and Northern Trade',
  },
  {
    name: 'Wyrmrest',
    regionName: 'Frozen Reaches',
    population: 1500,
    biome: 'TUNDRA',
    description: 'Ancient dragon burial grounds where artifacts of immense power lie beneath the permafrost. A place of magic and reverence.',
    availableBuildings: ['ENCHANTING_TOWER', 'SCRIBE_STUDY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 540, y: 120,
    prosperityLevel: 2,
    specialty: 'Ancient Dragon Relics',
  },

  // ========================================
  // THE SUNCOAST (Free Cities) - 5 towns
  // ========================================
  {
    name: 'Porto Sole',
    regionName: 'The Suncoast',
    population: 20000,
    biome: 'COASTAL',
    description: "The largest Free City and economic engine of Aethermere. Home to the Grand Bazaar and the Adventurer's Guild HQ.",
    availableBuildings: ['SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP', 'MARKET_STALL', 'BANK', 'INN', 'STABLE', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 350, y: 700,
    prosperityLevel: 5,
    specialty: 'Grand Bazaar and Adventuring',
  },
  {
    name: 'Coral Bay',
    regionName: 'The Suncoast',
    population: 6000,
    biome: 'COASTAL',
    description: 'A coastal town known for the best fishing and future naval content. Merfolk traders frequent its docks.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'KITCHEN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 320, y: 710,
    prosperityLevel: 3,
    specialty: 'Fishing and Naval Trade',
  },
  {
    name: 'Sandrift',
    regionName: 'The Suncoast',
    population: 4000,
    biome: 'DESERT',
    description: 'On the desert edge, known for gem trading, sand glass production, and Elementari enclaves. Desert expeditions depart from here.',
    availableBuildings: ['JEWELER_WORKSHOP', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 400, y: 730,
    prosperityLevel: 3,
    specialty: 'Gem Trading and Desert Expeditions',
  },
  {
    name: 'Libertad',
    regionName: 'The Suncoast',
    population: 12000,
    biome: 'COASTAL',
    description: 'A port city of entertainment, arenas, and casinos. Its black market is an open secret, and anything can be found for the right price.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'BANK', 'KITCHEN', 'BREWERY', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 380, y: 720,
    prosperityLevel: 4,
    specialty: 'Entertainment and Black Market',
  },
  {
    name: "Beacon's End",
    regionName: 'The Suncoast',
    population: 3500,
    biome: 'COASTAL',
    description: 'A lighthouse town that serves as the scribe headquarters and cartography center. World maps are drawn and sold here.',
    availableBuildings: ['SCRIBE_STUDY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 310, y: 690,
    prosperityLevel: 3,
    specialty: 'Cartography and Navigation',
  },

  // ========================================
  // TWILIGHT MARCH (Half-Elf) - 3 towns
  // ========================================
  {
    name: 'Dawnmere',
    regionName: 'Twilight March',
    population: 5000,
    biome: 'FOREST',
    description: 'The Half-Elf border capital, a center for diplomacy and cultural exchange between Human and Elven worlds.',
    availableBuildings: ['MARKET_STALL', 'INN', 'SCRIBE_STUDY', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 420, y: 450,
    prosperityLevel: 4,
    specialty: 'Diplomacy and Cultural Exchange',
  },
  {
    name: 'Twinvale',
    regionName: 'Twilight March',
    population: 2500,
    biome: 'FOREST',
    description: 'A settlement on the forest-plains border where herbalism and farming coexist. Both Elven herbs and Human crops thrive here.',
    availableBuildings: ['FARM', 'ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 400, y: 460,
    prosperityLevel: 3,
    specialty: 'Hybrid Agriculture',
  },
  {
    name: 'Harmony Point',
    regionName: 'Twilight March',
    population: 3500,
    biome: 'HILLS',
    description: 'A trade crossroads and center of education where Half-Elves teach diplomacy and the arts of both their parent races.',
    availableBuildings: ['MARKET_STALL', 'INN', 'SCRIBE_STUDY', 'WAREHOUSE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 440, y: 470,
    prosperityLevel: 3,
    specialty: 'Education and Diplomacy',
  },

  // ========================================
  // SCARRED FRONTIER (Half-Orc) - 3 towns
  // ========================================
  {
    name: 'Scarwatch',
    regionName: 'Scarred Frontier',
    population: 4000,
    biome: 'BADLANDS',
    description: 'A border fortress and Mercenary Guild HQ. Half-Orcs prove their worth through combat and service here.',
    availableBuildings: ['SMITHY', 'TANNERY', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 620, y: 470,
    prosperityLevel: 3,
    specialty: 'Mercenary Services',
  },
  {
    name: 'Tuskbridge',
    regionName: 'Scarred Frontier',
    population: 3000,
    biome: 'RIVER',
    description: 'A river crossing that serves as a trade bridge between Orc and Human lands. Commerce flows despite old hatreds.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'STABLE', 'HOUSE_SMALL'],
    x: 640, y: 490,
    prosperityLevel: 2,
    specialty: 'Cross-Cultural Trade',
  },
  {
    name: 'Proving Grounds',
    regionName: 'Scarred Frontier',
    population: 2500,
    biome: 'BADLANDS',
    description: 'An arena town dedicated to combat training and monster hunting. Warriors come here to test themselves against the wilds.',
    availableBuildings: ['SMITHY', 'TANNERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 650, y: 460,
    prosperityLevel: 2,
    specialty: 'Combat Training',
  },

  // ========================================
  // COGSWORTH WARRENS (Gnome) - 3 towns
  // ========================================
  {
    name: 'Cogsworth',
    regionName: 'Cogsworth Warrens',
    population: 4000,
    biome: 'HILLS',
    description: 'The Gnome capital burrow-city, a marvel of clockwork engineering and innovation labs. Something is always exploding here.',
    availableBuildings: ['JEWELER_WORKSHOP', 'ALCHEMY_LAB', 'SCRIBE_STUDY', 'ENCHANTING_TOWER', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 560, y: 350,
    prosperityLevel: 4,
    specialty: 'Clockwork Engineering',
  },
  {
    name: 'Sparkhollow',
    regionName: 'Cogsworth Warrens',
    population: 2000,
    biome: 'HILLS',
    description: 'A mine-adjacent settlement known for gem cutting and clockwork mechanisms powered by underground steam vents.',
    availableBuildings: ['MINE', 'JEWELER_WORKSHOP', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 570, y: 340,
    prosperityLevel: 3,
    specialty: 'Gem Cutting and Clockwork',
  },
  {
    name: 'Fumblewick',
    regionName: 'Cogsworth Warrens',
    population: 1500,
    biome: 'HILLS',
    description: 'A hillside village of alchemists and experimental brewers. The explosions are considered a feature, not a bug.',
    availableBuildings: ['ALCHEMY_LAB', 'BREWERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 550, y: 360,
    prosperityLevel: 2,
    specialty: 'Experimental Alchemy',
  },

  // ========================================
  // PELAGIC DEPTHS (Merfolk) - 3 towns
  // ========================================
  {
    name: 'Coralspire',
    regionName: 'Pelagic Depths',
    population: 5000,
    biome: 'UNDERWATER',
    description: 'The underwater Merfolk capital, a coral city of breathtaking beauty. The pearl markets here set prices across Aethermere.',
    availableBuildings: ['MARKET_STALL', 'JEWELER_WORKSHOP', 'ENCHANTING_TOWER', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 280, y: 720,
    prosperityLevel: 4,
    specialty: 'Pearl Trading and Coral Craft',
  },
  {
    name: 'Shallows End',
    regionName: 'Pelagic Depths',
    population: 3000,
    biome: 'COASTAL',
    description: 'A half-submerged coastal settlement where Merfolk trade with surface races. The freshest fish in Aethermere is sold here.',
    availableBuildings: ['MARKET_STALL', 'INN', 'WAREHOUSE', 'KITCHEN', 'HOUSE_SMALL'],
    x: 300, y: 730,
    prosperityLevel: 3,
    specialty: 'Surface-Sea Trade',
  },
  {
    name: 'Abyssal Reach',
    regionName: 'Pelagic Depths',
    population: 1500,
    biome: 'UNDERWATER',
    description: 'The deepest Merfolk settlement, where exotic deep-sea resources are gathered. Only Merfolk can reach this depth.',
    availableBuildings: ['MINE', 'MARKET_STALL', 'HOUSE_SMALL'],
    x: 260, y: 740,
    prosperityLevel: 2,
    specialty: 'Deep-Sea Gathering',
  },

  // ========================================
  // THORNWILDS (Beastfolk) - 3 towns
  // ========================================
  {
    name: 'Thornden',
    regionName: 'Thornwilds',
    population: 3500,
    biome: 'FOREST',
    description: 'The Beastfolk capital forest haven where Pack Moots are held. The greatest hunters in Aethermere gather here.',
    availableBuildings: ['TANNERY', 'MARKET_STALL', 'INN', 'STABLE', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 450, y: 380,
    prosperityLevel: 3,
    specialty: 'Pack Moots and Hunting',
  },
  {
    name: 'Clawridge',
    regionName: 'Thornwilds',
    population: 2000,
    biome: 'MOUNTAIN',
    description: 'A mountain wilderness settlement known for tracking rare game. The pelts and trophies from here are legendary.',
    availableBuildings: ['TANNERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 470, y: 360,
    prosperityLevel: 2,
    specialty: 'Rare Game Tracking',
  },
  {
    name: 'Windrun',
    regionName: 'Thornwilds',
    population: 2500,
    biome: 'PLAINS',
    description: 'An open plains settlement where Beastfolk breed the fastest horses and finest steeds in the land.',
    availableBuildings: ['RANCH', 'STABLE', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 440, y: 400,
    prosperityLevel: 3,
    specialty: 'Horse Breeding',
  },

  // ========================================
  // GLIMMERVEIL (Faefolk) - 3 towns
  // ========================================
  {
    name: 'Glimmerheart',
    regionName: 'Glimmerveil',
    population: 3000,
    biome: 'FEYWILD',
    description: 'The Faefolk capital on the Feywild border, where the Seelie Court convenes and the air sparkles with wild magic.',
    availableBuildings: ['ENCHANTING_TOWER', 'ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 300, y: 380,
    prosperityLevel: 4,
    specialty: 'Wild Magic and Fey Crafts',
  },
  {
    name: 'Dewdrop Hollow',
    regionName: 'Glimmerveil',
    population: 1500,
    biome: 'FOREST',
    description: 'A Silverwood glade where Faefolk practice herbalism and fey crafts. The herbs here grow nowhere else in the mortal world.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 320, y: 370,
    prosperityLevel: 2,
    specialty: 'Fey Herbalism',
  },
  {
    name: 'Moonpetal Grove',
    regionName: 'Glimmerveil',
    population: 1000,
    biome: 'FEYWILD',
    description: 'Deep in the Feywild side, this grove hosts the Fey Market where exotic gathering and otherworldly trades occur.',
    availableBuildings: ['ENCHANTING_TOWER', 'MARKET_STALL', 'HOUSE_SMALL'],
    x: 290, y: 360,
    prosperityLevel: 3,
    specialty: 'Fey Market and Otherworldly Goods',
  },

  // ========================================
  // SKYPEAK PLATEAUS (Goliath) - 2 towns
  // ========================================
  {
    name: 'Skyhold',
    regionName: 'Skypeak Plateaus',
    population: 2000,
    biome: 'MOUNTAIN',
    description: 'A peak settlement where Goliath competitions determine leadership. Sky-ore mining yields materials found nowhere else.',
    availableBuildings: ['MINE', 'MASON_YARD', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 620, y: 220,
    prosperityLevel: 3,
    specialty: 'Sky-Ore Mining',
  },
  {
    name: 'Windbreak',
    regionName: 'Skypeak Plateaus',
    population: 1200,
    biome: 'MOUNTAIN',
    description: 'A plateau camp used as a base for hunting expeditions and beast tracking in the extreme heights.',
    availableBuildings: ['TANNERY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 630, y: 200,
    prosperityLevel: 1,
    specialty: 'High-Altitude Hunting',
  },

  // ========================================
  // VEL'NARIS UNDERDARK (Nightborne) - 2 towns
  // ========================================
  {
    name: "Vel'Naris",
    regionName: "Vel'Naris Underdark",
    population: 6000,
    biome: 'UNDERGROUND',
    description: 'The Nightborne capital, a vast underground city of obsidian spires and spider-silk bridges. The Matriarchal Houses compete for dominance here.',
    availableBuildings: ['ALCHEMY_LAB', 'ENCHANTING_TOWER', 'TAILOR_SHOP', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE'],
    x: 380, y: 200,
    prosperityLevel: 4,
    specialty: 'Shadow Magic and Spider-Silk',
  },
  {
    name: 'Gloom Market',
    regionName: "Vel'Naris Underdark",
    population: 3000,
    biome: 'UNDERGROUND',
    description: 'An Underdark cavern bazaar specializing in poisons, shadow magic components, and spider-silk goods.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 360, y: 210,
    prosperityLevel: 3,
    specialty: 'Poisons and Shadow Components',
  },

  // ========================================
  // MISTWOOD GLENS (Mosskin) - 2 towns
  // ========================================
  {
    name: 'Misthaven',
    regionName: 'Mistwood Glens',
    population: 1500,
    biome: 'FOREST',
    description: 'A hidden glen with the most powerful druidic circle in Aethermere. Legendary herbs grow only in these mist-shrouded valleys.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 300, y: 420,
    prosperityLevel: 2,
    specialty: 'Druidic Arts and Legendary Herbs',
  },
  {
    name: 'Rootholme',
    regionName: 'Mistwood Glens',
    population: 1000,
    biome: 'FOREST',
    description: 'An ancient grove where homes are grown from living giant-trees. A renowned healing sanctuary draws the wounded and sick.',
    availableBuildings: ['ALCHEMY_LAB', 'FARM', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 290, y: 430,
    prosperityLevel: 2,
    specialty: 'Healing Sanctuary',
  },

  // ========================================
  // THE FOUNDRY (Forgeborn) - 1 town
  // ========================================
  {
    name: 'The Foundry',
    regionName: 'The Foundry',
    population: 800,
    biome: 'MOUNTAIN',
    description: 'An ancient construct facility partially restored by the Forgeborn. Arcane engineering and existential debates are equally common.',
    availableBuildings: ['SMITHY', 'SMELTERY', 'MASON_YARD', 'ENCHANTING_TOWER', 'MARKET_STALL', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 500, y: 300,
    prosperityLevel: 2,
    specialty: 'Arcane Engineering',
  },

  // ========================================
  // THE CONFLUENCE (Elementari) - 2 towns
  // ========================================
  {
    name: 'The Confluence',
    regionName: 'The Confluence',
    population: 2500,
    biome: 'VOLCANIC',
    description: 'Where four elemental planes converge. Raw elemental power crackles in the air, making this the premier site for elemental crafting.',
    availableBuildings: ['SMELTERY', 'ENCHANTING_TOWER', 'ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL', 'HOUSE_MEDIUM'],
    x: 450, y: 750,
    prosperityLevel: 3,
    specialty: 'Elemental Crafting',
  },
  {
    name: 'Emberheart',
    regionName: 'The Confluence',
    population: 1500,
    biome: 'VOLCANIC',
    description: 'Built around a fire rift, this settlement specializes in fire-forging and volcanic resource extraction.',
    availableBuildings: ['MINE', 'SMELTERY', 'SMITHY', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 460, y: 760,
    prosperityLevel: 2,
    specialty: 'Fire-Forging',
  },

  // ========================================
  // ASHENMOOR (Revenant) - 1 town
  // ========================================
  {
    name: 'Ashenmoor',
    regionName: 'Ashenmoor',
    population: 600,
    biome: 'SWAMP',
    description: 'A cursed battlefield where death does not stick. The perpetually undying have formed a community here, complete with very dark humor.',
    availableBuildings: ['ALCHEMY_LAB', 'MARKET_STALL', 'INN', 'HOUSE_SMALL'],
    x: 430, y: 220,
    prosperityLevel: 1,
    specialty: 'Necromantic Reagents',
  },

  // ========================================
  // NEUTRAL HUB (Changeling start) - 1 town
  // ========================================
  {
    name: 'The Crosswinds Inn',
    regionName: 'The Suncoast',
    population: 1500,
    biome: 'COASTAL',
    description: 'A legendary neutral waystation where no questions are asked and all faces are welcome. Changelings and travelers of every stripe converge here. Identities are flexible and so are the prices.',
    availableBuildings: ['INN', 'MARKET_STALL', 'STABLE', 'WAREHOUSE', 'HOUSE_SMALL'],
    x: 340, y: 680,
    prosperityLevel: 3,
    specialty: 'Neutral Ground and Identity Trade',
  },
];

// ============================================================
// TRAVEL ROUTES
// ============================================================

interface RouteDef {
  from: string;
  to: string;
  distance: number; // minutes
  dangerLevel: number; // 1-7
  terrain: string;
}

const ROUTES: RouteDef[] = [
  // ---- WITHIN VERDANT HEARTLANDS ----
  { from: 'Kingshold', to: 'Millhaven', distance: 15, dangerLevel: 1, terrain: 'plains road' },
  { from: 'Kingshold', to: 'Bridgewater', distance: 15, dangerLevel: 1, terrain: 'paved road' },
  { from: 'Kingshold', to: 'Ironford', distance: 20, dangerLevel: 1, terrain: 'hill road' },
  { from: 'Kingshold', to: 'Whitefield', distance: 15, dangerLevel: 1, terrain: 'plains road' },
  { from: 'Millhaven', to: 'Whitefield', distance: 10, dangerLevel: 1, terrain: 'farm path' },
  { from: 'Bridgewater', to: 'Ironford', distance: 15, dangerLevel: 1, terrain: 'river trail' },

  // ---- WITHIN SILVERWOOD FOREST ----
  { from: 'Aelindra', to: 'Moonhaven', distance: 20, dangerLevel: 2, terrain: 'forest path' },
  { from: 'Aelindra', to: 'Thornwatch', distance: 15, dangerLevel: 1, terrain: 'elven trail' },
  { from: 'Aelindra', to: 'Willowmere', distance: 15, dangerLevel: 1, terrain: 'lakeside path' },
  { from: 'Aelindra', to: 'Eldergrove', distance: 20, dangerLevel: 2, terrain: 'sacred path' },
  { from: 'Moonhaven', to: 'Eldergrove', distance: 15, dangerLevel: 2, terrain: 'deep forest' },
  { from: 'Thornwatch', to: 'Willowmere', distance: 10, dangerLevel: 1, terrain: 'forest edge' },

  // ---- WITHIN IRONVAULT MOUNTAINS ----
  { from: 'Kazad-Vorn', to: 'Deepvein', distance: 20, dangerLevel: 2, terrain: 'mine tunnel' },
  { from: 'Kazad-Vorn', to: 'Hammerfall', distance: 15, dangerLevel: 2, terrain: 'mountain pass' },
  { from: 'Kazad-Vorn', to: 'Gemhollow', distance: 15, dangerLevel: 2, terrain: 'cavern road' },
  { from: 'Kazad-Vorn', to: 'Alehearth', distance: 10, dangerLevel: 1, terrain: 'valley road' },
  { from: 'Deepvein', to: 'Gemhollow', distance: 15, dangerLevel: 3, terrain: 'deep tunnel' },
  { from: 'Hammerfall', to: 'Alehearth', distance: 15, dangerLevel: 2, terrain: 'mountain trail' },

  // ---- WITHIN THE CROSSROADS ----
  { from: 'Hearthshire', to: 'Greenhollow', distance: 10, dangerLevel: 1, terrain: 'cobblestone road' },
  { from: 'Hearthshire', to: "Peddler's Rest", distance: 10, dangerLevel: 1, terrain: 'trade road' },
  { from: 'Hearthshire', to: 'Bramblewood', distance: 15, dangerLevel: 1, terrain: 'country lane' },
  { from: 'Hearthshire', to: 'Riverside', distance: 10, dangerLevel: 1, terrain: 'riverside path' },
  { from: "Peddler's Rest", to: 'Riverside', distance: 10, dangerLevel: 1, terrain: 'trade road' },
  { from: 'Greenhollow', to: 'Bramblewood', distance: 10, dangerLevel: 1, terrain: 'farm trail' },

  // ---- WITHIN ASHENFANG WASTES ----
  { from: 'Grakthar', to: 'Bonepile', distance: 15, dangerLevel: 2, terrain: 'wasteland track' },
  { from: 'Grakthar', to: 'Ironfist Hold', distance: 20, dangerLevel: 3, terrain: 'volcanic trail' },
  { from: 'Grakthar', to: 'Thornback Camp', distance: 15, dangerLevel: 2, terrain: 'badlands road' },
  { from: 'Grakthar', to: 'Ashen Market', distance: 10, dangerLevel: 1, terrain: 'war road' },
  { from: 'Bonepile', to: 'Ironfist Hold', distance: 15, dangerLevel: 3, terrain: 'scorched path' },
  { from: 'Thornback Camp', to: 'Ashen Market', distance: 10, dangerLevel: 2, terrain: 'border trail' },

  // ---- WITHIN SHADOWMERE MARSHES ----
  { from: 'Nethermire', to: 'Boghollow', distance: 20, dangerLevel: 3, terrain: 'marsh boardwalk' },
  { from: 'Nethermire', to: 'Mistwatch', distance: 15, dangerLevel: 2, terrain: 'hidden path' },
  { from: 'Nethermire', to: 'Cinderkeep', distance: 20, dangerLevel: 3, terrain: 'swamp trail' },
  { from: 'Nethermire', to: 'Whispering Docks', distance: 15, dangerLevel: 2, terrain: 'waterway' },
  { from: 'Boghollow', to: 'Cinderkeep', distance: 15, dangerLevel: 3, terrain: 'deep swamp' },
  { from: 'Mistwatch', to: 'Whispering Docks', distance: 10, dangerLevel: 2, terrain: 'marsh edge' },

  // ---- WITHIN FROZEN REACHES ----
  { from: 'Drakenspire', to: 'Frostfang', distance: 20, dangerLevel: 3, terrain: 'frozen trail' },
  { from: 'Drakenspire', to: 'Emberpeak', distance: 20, dangerLevel: 3, terrain: 'volcanic path' },
  { from: 'Drakenspire', to: 'Scalehaven', distance: 25, dangerLevel: 2, terrain: 'mountain descent' },
  { from: 'Drakenspire', to: 'Wyrmrest', distance: 25, dangerLevel: 4, terrain: 'ancient road' },
  { from: 'Frostfang', to: 'Wyrmrest', distance: 20, dangerLevel: 4, terrain: 'tundra path' },
  { from: 'Emberpeak', to: 'Scalehaven', distance: 20, dangerLevel: 2, terrain: 'coastal descent' },

  // ---- WITHIN THE SUNCOAST ----
  { from: 'Porto Sole', to: 'Coral Bay', distance: 15, dangerLevel: 1, terrain: 'coastal highway' },
  { from: 'Porto Sole', to: 'Libertad', distance: 15, dangerLevel: 1, terrain: 'coastal highway' },
  { from: 'Porto Sole', to: "Beacon's End", distance: 20, dangerLevel: 1, terrain: 'coastal road' },
  { from: 'Porto Sole', to: 'Sandrift', distance: 25, dangerLevel: 2, terrain: 'desert road' },
  { from: 'Coral Bay', to: "Beacon's End", distance: 10, dangerLevel: 1, terrain: 'seaside path' },
  { from: 'Libertad', to: 'Sandrift', distance: 20, dangerLevel: 2, terrain: 'arid road' },
  { from: 'Porto Sole', to: 'The Crosswinds Inn', distance: 10, dangerLevel: 1, terrain: 'coastal path' },
  { from: "Beacon's End", to: 'The Crosswinds Inn', distance: 10, dangerLevel: 1, terrain: 'seaside trail' },

  // ---- WITHIN COMMON RACE TERRITORIES ----
  // Twilight March
  { from: 'Dawnmere', to: 'Twinvale', distance: 15, dangerLevel: 1, terrain: 'border road' },
  { from: 'Dawnmere', to: 'Harmony Point', distance: 15, dangerLevel: 1, terrain: 'trade road' },
  { from: 'Twinvale', to: 'Harmony Point', distance: 10, dangerLevel: 1, terrain: 'meadow path' },

  // Scarred Frontier
  { from: 'Scarwatch', to: 'Tuskbridge', distance: 15, dangerLevel: 3, terrain: 'war-scarred road' },
  { from: 'Scarwatch', to: 'Proving Grounds', distance: 15, dangerLevel: 3, terrain: 'frontier trail' },
  { from: 'Tuskbridge', to: 'Proving Grounds', distance: 10, dangerLevel: 2, terrain: 'contested path' },

  // Cogsworth Warrens
  { from: 'Cogsworth', to: 'Sparkhollow', distance: 10, dangerLevel: 1, terrain: 'burrow tunnel' },
  { from: 'Cogsworth', to: 'Fumblewick', distance: 10, dangerLevel: 1, terrain: 'hillside path' },
  { from: 'Sparkhollow', to: 'Fumblewick', distance: 10, dangerLevel: 1, terrain: 'gnome trail' },

  // Pelagic Depths
  { from: 'Coralspire', to: 'Shallows End', distance: 15, dangerLevel: 2, terrain: 'ocean current' },
  { from: 'Coralspire', to: 'Abyssal Reach', distance: 25, dangerLevel: 4, terrain: 'deep trench' },
  { from: 'Shallows End', to: 'Abyssal Reach', distance: 20, dangerLevel: 3, terrain: 'ocean descent' },

  // Thornwilds
  { from: 'Thornden', to: 'Clawridge', distance: 20, dangerLevel: 3, terrain: 'wild trail' },
  { from: 'Thornden', to: 'Windrun', distance: 15, dangerLevel: 2, terrain: 'forest-to-plains' },
  { from: 'Clawridge', to: 'Windrun', distance: 20, dangerLevel: 3, terrain: 'mountain descent' },

  // Glimmerveil
  { from: 'Glimmerheart', to: 'Dewdrop Hollow', distance: 15, dangerLevel: 2, terrain: 'fey path' },
  { from: 'Glimmerheart', to: 'Moonpetal Grove', distance: 20, dangerLevel: 3, terrain: 'feywild crossing' },
  { from: 'Dewdrop Hollow', to: 'Moonpetal Grove', distance: 15, dangerLevel: 2, terrain: 'glade path' },

  // ---- WITHIN EXOTIC RACE TERRITORIES ----
  // Skypeak
  { from: 'Skyhold', to: 'Windbreak', distance: 15, dangerLevel: 3, terrain: 'peak trail' },

  // Vel'Naris Underdark
  { from: "Vel'Naris", to: 'Gloom Market', distance: 15, dangerLevel: 3, terrain: 'underdark tunnel' },

  // Mistwood Glens
  { from: 'Misthaven', to: 'Rootholme', distance: 15, dangerLevel: 2, terrain: 'misty path' },

  // The Confluence
  { from: 'The Confluence', to: 'Emberheart', distance: 15, dangerLevel: 3, terrain: 'elemental rift' },

  // ============================================================
  // INTER-REGION ROUTES (connecting regions together)
  // ============================================================

  // Frozen Reaches <-> Ironvault Mountains
  { from: 'Drakenspire', to: 'Kazad-Vorn', distance: 45, dangerLevel: 4, terrain: 'high mountain pass' },

  // Frozen Reaches <-> Verdant Heartlands
  { from: 'Scalehaven', to: 'Kingshold', distance: 50, dangerLevel: 3, terrain: 'northern highway' },

  // Frozen Reaches <-> Shadowmere Marshes
  { from: 'Frostfang', to: 'Nethermire', distance: 55, dangerLevel: 4, terrain: 'tundra-to-marsh trail' },

  // Ironvault Mountains <-> Verdant Heartlands
  { from: 'Alehearth', to: 'Ironford', distance: 35, dangerLevel: 2, terrain: 'mountain-to-hills road' },
  { from: 'Hammerfall', to: 'Kingshold', distance: 40, dangerLevel: 2, terrain: 'fortified road' },

  // Ironvault Mountains <-> Ashenfang Wastes
  { from: 'Hammerfall', to: 'Grakthar', distance: 40, dangerLevel: 5, terrain: 'blood feud border' },

  // Verdant Heartlands <-> The Crossroads
  { from: 'Bridgewater', to: 'Hearthshire', distance: 30, dangerLevel: 1, terrain: 'great trade road' },
  { from: 'Millhaven', to: 'Greenhollow', distance: 30, dangerLevel: 1, terrain: 'farmland road' },

  // Verdant Heartlands <-> Shadowmere Marshes
  { from: 'Kingshold', to: 'Mistwatch', distance: 45, dangerLevel: 3, terrain: 'marsh approach' },

  // The Crossroads <-> The Suncoast
  { from: "Peddler's Rest", to: 'Porto Sole', distance: 35, dangerLevel: 1, terrain: 'merchant highway' },
  { from: 'Riverside', to: 'Coral Bay', distance: 35, dangerLevel: 1, terrain: 'river-to-coast road' },

  // The Crossroads <-> Ashenfang Wastes
  { from: "Peddler's Rest", to: 'Ashen Market', distance: 40, dangerLevel: 3, terrain: 'contested trade route' },

  // Ashenfang Wastes <-> Silverwood Forest (distant, through Crossroads)
  { from: 'Ashen Market', to: 'Thornwatch', distance: 55, dangerLevel: 4, terrain: 'hostile borderlands' },

  // Shadowmere Marshes <-> Silverwood Forest
  { from: 'Mistwatch', to: 'Thornwatch', distance: 40, dangerLevel: 3, terrain: 'marsh-to-forest trail' },

  // The Suncoast <-> Silverwood Forest
  { from: 'Porto Sole', to: 'Aelindra', distance: 45, dangerLevel: 2, terrain: 'ancient trade road' },

  // The Suncoast <-> Ashenfang Wastes
  { from: 'Libertad', to: 'Ashen Market', distance: 40, dangerLevel: 3, terrain: 'lawless coast road' },

  // ---- Common/Exotic territory connections ----
  // Twilight March connections
  { from: 'Dawnmere', to: 'Kingshold', distance: 30, dangerLevel: 1, terrain: 'border highway' },
  { from: 'Dawnmere', to: 'Aelindra', distance: 30, dangerLevel: 1, terrain: 'forest border road' },
  { from: 'Harmony Point', to: 'Bridgewater', distance: 25, dangerLevel: 1, terrain: 'trade road' },

  // Scarred Frontier connections
  { from: 'Scarwatch', to: 'Kingshold', distance: 35, dangerLevel: 2, terrain: 'fortified road' },
  { from: 'Tuskbridge', to: 'Grakthar', distance: 35, dangerLevel: 3, terrain: 'orc border road' },
  { from: 'Tuskbridge', to: 'Ashen Market', distance: 30, dangerLevel: 3, terrain: 'wasteland track' },

  // Cogsworth Warrens connections
  { from: 'Cogsworth', to: 'Kazad-Vorn', distance: 30, dangerLevel: 2, terrain: 'mountain foothill' },
  { from: 'Cogsworth', to: 'Alehearth', distance: 25, dangerLevel: 1, terrain: 'valley connector' },

  // Pelagic Depths connections
  { from: 'Shallows End', to: 'Coral Bay', distance: 20, dangerLevel: 1, terrain: 'coastal shallows' },
  { from: 'Shallows End', to: 'Porto Sole', distance: 25, dangerLevel: 1, terrain: 'coastal path' },

  // Thornwilds connections
  { from: 'Thornden', to: 'Thornwatch', distance: 30, dangerLevel: 3, terrain: 'wild forest' },
  { from: 'Windrun', to: "Peddler's Rest", distance: 30, dangerLevel: 2, terrain: 'plains connector' },
  { from: 'Clawridge', to: 'Hammerfall', distance: 35, dangerLevel: 3, terrain: 'mountain wilderness' },

  // Glimmerveil connections
  { from: 'Dewdrop Hollow', to: 'Aelindra', distance: 25, dangerLevel: 2, terrain: 'silverwood glade' },
  { from: 'Dewdrop Hollow', to: 'Eldergrove', distance: 20, dangerLevel: 2, terrain: 'sacred forest' },

  // Skypeak connections
  { from: 'Skyhold', to: 'Drakenspire', distance: 30, dangerLevel: 4, terrain: 'extreme altitude' },
  { from: 'Skyhold', to: 'Kazad-Vorn', distance: 35, dangerLevel: 3, terrain: 'high peak descent' },

  // Vel'Naris Underdark connections
  { from: "Vel'Naris", to: 'Nethermire', distance: 30, dangerLevel: 4, terrain: 'underdark-to-surface' },
  { from: 'Gloom Market', to: 'Cinderkeep', distance: 25, dangerLevel: 3, terrain: 'subterranean passage' },

  // Mistwood Glens connections
  { from: 'Misthaven', to: 'Eldergrove', distance: 25, dangerLevel: 2, terrain: 'hidden forest trail' },
  { from: 'Misthaven', to: 'Aelindra', distance: 30, dangerLevel: 2, terrain: 'deep silverwood' },

  // The Foundry connections
  { from: 'The Foundry', to: 'Kazad-Vorn', distance: 40, dangerLevel: 3, terrain: 'abandoned road' },
  { from: 'The Foundry', to: 'Porto Sole', distance: 45, dangerLevel: 2, terrain: 'trade road' },

  // The Confluence connections
  { from: 'The Confluence', to: 'Porto Sole', distance: 35, dangerLevel: 2, terrain: 'elemental road' },
  { from: 'Emberheart', to: 'Sandrift', distance: 25, dangerLevel: 3, terrain: 'desert-rift path' },

  // Ashenmoor connections
  { from: 'Ashenmoor', to: 'Nethermire', distance: 35, dangerLevel: 4, terrain: 'cursed marshland' },
  { from: 'Ashenmoor', to: 'Mistwatch', distance: 30, dangerLevel: 3, terrain: 'blighted trail' },
];

// ============================================================
// TOWN RESOURCES
// ============================================================

interface ResourceDef {
  type: ResourceType;
  abundance: number; // 10-100
  respawnRate: number; // 0.5-2.0
}

type TownResourceMap = Record<string, ResourceDef[]>;

function getResourcesForTown(townName: string, regionName: string, biome: BiomeType): ResourceDef[] {
  const specific = TOWN_SPECIFIC_RESOURCES[townName];
  if (specific) return specific;
  return getRegionResources(regionName, biome);
}

const TOWN_SPECIFIC_RESOURCES: TownResourceMap = {
  // Heartlands towns
  'Kingshold': [
    { type: 'GRAIN', abundance: 60, respawnRate: 1.0 },
    { type: 'FIBER', abundance: 50, respawnRate: 1.0 },
    { type: 'ANIMAL_PRODUCT', abundance: 40, respawnRate: 0.8 },
  ],
  'Millhaven': [
    { type: 'GRAIN', abundance: 100, respawnRate: 1.5 },
    { type: 'ANIMAL_PRODUCT', abundance: 80, respawnRate: 1.2 },
    { type: 'FIBER', abundance: 60, respawnRate: 1.0 },
    { type: 'HERB', abundance: 30, respawnRate: 0.8 },
  ],
  'Bridgewater': [
    { type: 'FISH', abundance: 80, respawnRate: 1.2 },
    { type: 'GRAIN', abundance: 50, respawnRate: 1.0 },
    { type: 'HERB', abundance: 30, respawnRate: 0.8 },
  ],
  'Ironford': [
    { type: 'ORE', abundance: 40, respawnRate: 0.7 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
    { type: 'GRAIN', abundance: 30, respawnRate: 0.8 },
  ],
  'Whitefield': [
    { type: 'FIBER', abundance: 100, respawnRate: 1.5 },
    { type: 'GRAIN', abundance: 70, respawnRate: 1.2 },
    { type: 'ANIMAL_PRODUCT', abundance: 30, respawnRate: 0.8 },
  ],

  // Silverwood towns
  'Aelindra': [
    { type: 'WOOD', abundance: 70, respawnRate: 1.0 },
    { type: 'HERB', abundance: 60, respawnRate: 1.0 },
    { type: 'REAGENT', abundance: 50, respawnRate: 0.8 },
  ],
  'Moonhaven': [
    { type: 'HERB', abundance: 100, respawnRate: 1.5 },
    { type: 'REAGENT', abundance: 80, respawnRate: 1.2 },
    { type: 'WOOD', abundance: 40, respawnRate: 0.8 },
  ],
  'Thornwatch': [
    { type: 'WOOD', abundance: 90, respawnRate: 1.3 },
    { type: 'HIDE', abundance: 40, respawnRate: 0.8 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
  ],
  'Willowmere': [
    { type: 'WOOD', abundance: 80, respawnRate: 1.2 },
    { type: 'FISH', abundance: 60, respawnRate: 1.0 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
  ],
  'Eldergrove': [
    { type: 'HERB', abundance: 90, respawnRate: 1.3 },
    { type: 'REAGENT', abundance: 70, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],

  // Ironvault towns
  'Kazad-Vorn': [
    { type: 'ORE', abundance: 80, respawnRate: 1.2 },
    { type: 'STONE', abundance: 80, respawnRate: 1.2 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],
  'Deepvein': [
    { type: 'ORE', abundance: 100, respawnRate: 1.5 },
    { type: 'EXOTIC', abundance: 60, respawnRate: 0.7 },
    { type: 'STONE', abundance: 70, respawnRate: 1.0 },
  ],
  'Hammerfall': [
    { type: 'ORE', abundance: 70, respawnRate: 1.0 },
    { type: 'STONE', abundance: 80, respawnRate: 1.2 },
  ],
  'Gemhollow': [
    { type: 'EXOTIC', abundance: 90, respawnRate: 0.8 },
    { type: 'ORE', abundance: 50, respawnRate: 0.8 },
    { type: 'STONE', abundance: 60, respawnRate: 1.0 },
  ],
  'Alehearth': [
    { type: 'GRAIN', abundance: 30, respawnRate: 0.7 },
    { type: 'STONE', abundance: 40, respawnRate: 0.8 },
    { type: 'ORE', abundance: 30, respawnRate: 0.7 },
  ],

  // Crossroads towns
  'Hearthshire': [
    { type: 'GRAIN', abundance: 70, respawnRate: 1.0 },
    { type: 'HERB', abundance: 50, respawnRate: 0.8 },
    { type: 'FISH', abundance: 30, respawnRate: 0.8 },
  ],
  'Greenhollow': [
    { type: 'GRAIN', abundance: 100, respawnRate: 1.5 },
    { type: 'HERB', abundance: 70, respawnRate: 1.0 },
    { type: 'ANIMAL_PRODUCT', abundance: 50, respawnRate: 0.8 },
  ],
  "Peddler's Rest": [
    { type: 'GRAIN', abundance: 50, respawnRate: 0.8 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],
  'Bramblewood': [
    { type: 'HERB', abundance: 90, respawnRate: 1.3 },
    { type: 'WOOD', abundance: 50, respawnRate: 0.8 },
    { type: 'GRAIN', abundance: 30, respawnRate: 0.7 },
  ],
  'Riverside': [
    { type: 'FISH', abundance: 90, respawnRate: 1.3 },
    { type: 'GRAIN', abundance: 40, respawnRate: 0.8 },
    { type: 'HERB', abundance: 30, respawnRate: 0.7 },
  ],

  // Ashenfang towns
  'Grakthar': [
    { type: 'HIDE', abundance: 60, respawnRate: 1.0 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
    { type: 'ANIMAL_PRODUCT', abundance: 40, respawnRate: 0.8 },
  ],
  'Bonepile': [
    { type: 'HIDE', abundance: 100, respawnRate: 1.5 },
    { type: 'ANIMAL_PRODUCT', abundance: 80, respawnRate: 1.2 },
    { type: 'EXOTIC', abundance: 20, respawnRate: 0.5 },
  ],
  'Ironfist Hold': [
    { type: 'ORE', abundance: 50, respawnRate: 0.7 },
    { type: 'STONE', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.6 },
  ],
  'Thornback Camp': [
    { type: 'HIDE', abundance: 80, respawnRate: 1.2 },
    { type: 'ANIMAL_PRODUCT', abundance: 90, respawnRate: 1.3 },
  ],
  'Ashen Market': [
    { type: 'HIDE', abundance: 50, respawnRate: 0.8 },
    { type: 'STONE', abundance: 30, respawnRate: 0.7 },
  ],

  // Shadowmere towns
  'Nethermire': [
    { type: 'HERB', abundance: 70, respawnRate: 1.0 },
    { type: 'REAGENT', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],
  'Boghollow': [
    { type: 'HERB', abundance: 100, respawnRate: 1.5 },
    { type: 'REAGENT', abundance: 90, respawnRate: 1.3 },
    { type: 'FISH', abundance: 30, respawnRate: 0.7 },
  ],
  'Mistwatch': [
    { type: 'HERB', abundance: 50, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 40, respawnRate: 0.8 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],
  'Cinderkeep': [
    { type: 'REAGENT', abundance: 80, respawnRate: 1.2 },
    { type: 'ORE', abundance: 30, respawnRate: 0.6 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
  ],
  'Whispering Docks': [
    { type: 'FISH', abundance: 70, respawnRate: 1.0 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],

  // Frozen Reaches towns
  'Drakenspire': [
    { type: 'ORE', abundance: 60, respawnRate: 0.8 },
    { type: 'STONE', abundance: 60, respawnRate: 0.8 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.6 },
  ],
  'Frostfang': [
    { type: 'HIDE', abundance: 90, respawnRate: 1.3 },
    { type: 'EXOTIC', abundance: 60, respawnRate: 0.8 },
    { type: 'ANIMAL_PRODUCT', abundance: 70, respawnRate: 1.0 },
  ],
  'Emberpeak': [
    { type: 'ORE', abundance: 90, respawnRate: 1.3 },
    { type: 'EXOTIC', abundance: 70, respawnRate: 0.8 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
  ],
  'Scalehaven': [
    { type: 'FISH', abundance: 80, respawnRate: 1.2 },
    { type: 'HIDE', abundance: 40, respawnRate: 0.7 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],
  'Wyrmrest': [
    { type: 'EXOTIC', abundance: 80, respawnRate: 0.7 },
    { type: 'REAGENT', abundance: 60, respawnRate: 0.8 },
    { type: 'STONE', abundance: 30, respawnRate: 0.7 },
  ],

  // Suncoast towns
  'Porto Sole': [
    { type: 'FISH', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],
  'Coral Bay': [
    { type: 'FISH', abundance: 100, respawnRate: 1.5 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],
  'Sandrift': [
    { type: 'EXOTIC', abundance: 70, respawnRate: 0.8 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
  ],
  'Libertad': [
    { type: 'FISH', abundance: 60, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.6 },
  ],
  "Beacon's End": [
    { type: 'FISH', abundance: 50, respawnRate: 0.8 },
    { type: 'WOOD', abundance: 20, respawnRate: 0.6 },
  ],
  'The Crosswinds Inn': [
    { type: 'FISH', abundance: 40, respawnRate: 0.8 },
    { type: 'HERB', abundance: 20, respawnRate: 0.6 },
  ],

  // Twilight March towns
  'Dawnmere': [
    { type: 'HERB', abundance: 60, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 50, respawnRate: 0.8 },
    { type: 'GRAIN', abundance: 40, respawnRate: 0.8 },
  ],
  'Twinvale': [
    { type: 'HERB', abundance: 80, respawnRate: 1.2 },
    { type: 'GRAIN', abundance: 70, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 40, respawnRate: 0.8 },
  ],
  'Harmony Point': [
    { type: 'GRAIN', abundance: 50, respawnRate: 0.8 },
    { type: 'HERB', abundance: 40, respawnRate: 0.8 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],

  // Scarred Frontier towns
  'Scarwatch': [
    { type: 'HIDE', abundance: 60, respawnRate: 1.0 },
    { type: 'ORE', abundance: 40, respawnRate: 0.7 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
  ],
  'Tuskbridge': [
    { type: 'HIDE', abundance: 50, respawnRate: 0.8 },
    { type: 'FISH', abundance: 40, respawnRate: 0.8 },
    { type: 'GRAIN', abundance: 30, respawnRate: 0.7 },
  ],
  'Proving Grounds': [
    { type: 'HIDE', abundance: 70, respawnRate: 1.0 },
    { type: 'ANIMAL_PRODUCT', abundance: 60, respawnRate: 0.8 },
    { type: 'STONE', abundance: 30, respawnRate: 0.7 },
  ],

  // Cogsworth Warrens towns
  'Cogsworth': [
    { type: 'ORE', abundance: 50, respawnRate: 0.8 },
    { type: 'STONE', abundance: 40, respawnRate: 0.7 },
    { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
  ],
  'Sparkhollow': [
    { type: 'ORE', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 50, respawnRate: 0.7 },
    { type: 'STONE', abundance: 50, respawnRate: 0.8 },
  ],
  'Fumblewick': [
    { type: 'HERB', abundance: 60, respawnRate: 1.0 },
    { type: 'REAGENT', abundance: 50, respawnRate: 0.8 },
    { type: 'GRAIN', abundance: 30, respawnRate: 0.7 },
  ],

  // Pelagic Depths towns
  'Coralspire': [
    { type: 'FISH', abundance: 80, respawnRate: 1.2 },
    { type: 'EXOTIC', abundance: 70, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 50, respawnRate: 0.8 },
  ],
  'Shallows End': [
    { type: 'FISH', abundance: 100, respawnRate: 1.5 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.6 },
  ],
  'Abyssal Reach': [
    { type: 'EXOTIC', abundance: 100, respawnRate: 0.7 },
    { type: 'ORE', abundance: 60, respawnRate: 0.7 },
    { type: 'REAGENT', abundance: 50, respawnRate: 0.6 },
  ],

  // Thornwilds towns
  'Thornden': [
    { type: 'HIDE', abundance: 90, respawnRate: 1.3 },
    { type: 'HERB', abundance: 60, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 50, respawnRate: 0.8 },
  ],
  'Clawridge': [
    { type: 'HIDE', abundance: 80, respawnRate: 1.2 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.6 },
    { type: 'STONE', abundance: 40, respawnRate: 0.7 },
  ],
  'Windrun': [
    { type: 'ANIMAL_PRODUCT', abundance: 90, respawnRate: 1.3 },
    { type: 'HIDE', abundance: 60, respawnRate: 1.0 },
    { type: 'GRAIN', abundance: 30, respawnRate: 0.7 },
  ],

  // Glimmerveil towns
  'Glimmerheart': [
    { type: 'REAGENT', abundance: 90, respawnRate: 1.3 },
    { type: 'HERB', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 60, respawnRate: 0.7 },
  ],
  'Dewdrop Hollow': [
    { type: 'HERB', abundance: 100, respawnRate: 1.5 },
    { type: 'REAGENT', abundance: 70, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 30, respawnRate: 0.7 },
  ],
  'Moonpetal Grove': [
    { type: 'EXOTIC', abundance: 100, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 80, respawnRate: 1.0 },
    { type: 'HERB', abundance: 60, respawnRate: 0.8 },
  ],

  // Skypeak towns
  'Skyhold': [
    { type: 'ORE', abundance: 80, respawnRate: 1.0 },
    { type: 'STONE', abundance: 70, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 50, respawnRate: 0.6 },
  ],
  'Windbreak': [
    { type: 'HIDE', abundance: 70, respawnRate: 1.0 },
    { type: 'ANIMAL_PRODUCT', abundance: 50, respawnRate: 0.8 },
    { type: 'STONE', abundance: 30, respawnRate: 0.7 },
  ],

  // Vel'Naris towns
  "Vel'Naris": [
    { type: 'EXOTIC', abundance: 80, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 70, respawnRate: 1.0 },
    { type: 'ORE', abundance: 50, respawnRate: 0.7 },
  ],
  'Gloom Market': [
    { type: 'REAGENT', abundance: 80, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 60, respawnRate: 0.7 },
    { type: 'HERB', abundance: 40, respawnRate: 0.7 },
  ],

  // Mistwood towns
  'Misthaven': [
    { type: 'HERB', abundance: 100, respawnRate: 1.5 },
    { type: 'WOOD', abundance: 60, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 50, respawnRate: 0.8 },
  ],
  'Rootholme': [
    { type: 'HERB', abundance: 90, respawnRate: 1.3 },
    { type: 'GRAIN', abundance: 60, respawnRate: 1.0 },
    { type: 'WOOD', abundance: 50, respawnRate: 0.8 },
  ],

  // The Foundry
  'The Foundry': [
    { type: 'ORE', abundance: 70, respawnRate: 0.8 },
    { type: 'STONE', abundance: 60, respawnRate: 0.8 },
    { type: 'EXOTIC', abundance: 50, respawnRate: 0.6 },
  ],

  // The Confluence towns
  'The Confluence': [
    { type: 'EXOTIC', abundance: 90, respawnRate: 0.8 },
    { type: 'REAGENT', abundance: 80, respawnRate: 1.0 },
    { type: 'ORE', abundance: 50, respawnRate: 0.7 },
  ],
  'Emberheart': [
    { type: 'ORE', abundance: 80, respawnRate: 1.0 },
    { type: 'EXOTIC', abundance: 60, respawnRate: 0.7 },
    { type: 'STONE', abundance: 40, respawnRate: 0.7 },
  ],

  // Ashenmoor
  'Ashenmoor': [
    { type: 'HERB', abundance: 80, respawnRate: 1.0 },
    { type: 'REAGENT', abundance: 70, respawnRate: 0.8 },
    { type: 'EXOTIC', abundance: 40, respawnRate: 0.5 },
  ],
};

function getRegionResources(_regionName: string, biome: BiomeType): ResourceDef[] {
  switch (biome) {
    case 'PLAINS':
      return [
        { type: 'GRAIN', abundance: 70, respawnRate: 1.0 },
        { type: 'FIBER', abundance: 50, respawnRate: 0.8 },
        { type: 'ANIMAL_PRODUCT', abundance: 40, respawnRate: 0.8 },
      ];
    case 'FOREST':
      return [
        { type: 'WOOD', abundance: 70, respawnRate: 1.0 },
        { type: 'HERB', abundance: 60, respawnRate: 1.0 },
      ];
    case 'MOUNTAIN':
      return [
        { type: 'ORE', abundance: 70, respawnRate: 0.8 },
        { type: 'STONE', abundance: 60, respawnRate: 0.8 },
      ];
    case 'HILLS':
      return [
        { type: 'GRAIN', abundance: 50, respawnRate: 0.8 },
        { type: 'HERB', abundance: 40, respawnRate: 0.7 },
        { type: 'STONE', abundance: 30, respawnRate: 0.7 },
      ];
    case 'BADLANDS':
      return [
        { type: 'HIDE', abundance: 60, respawnRate: 1.0 },
        { type: 'STONE', abundance: 50, respawnRate: 0.8 },
      ];
    case 'SWAMP':
      return [
        { type: 'HERB', abundance: 70, respawnRate: 1.0 },
        { type: 'REAGENT', abundance: 60, respawnRate: 0.8 },
      ];
    case 'TUNDRA':
      return [
        { type: 'ORE', abundance: 50, respawnRate: 0.7 },
        { type: 'HIDE', abundance: 60, respawnRate: 0.8 },
        { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
      ];
    case 'VOLCANIC':
      return [
        { type: 'ORE', abundance: 70, respawnRate: 0.8 },
        { type: 'STONE', abundance: 50, respawnRate: 0.7 },
        { type: 'EXOTIC', abundance: 40, respawnRate: 0.5 },
      ];
    case 'COASTAL':
      return [
        { type: 'FISH', abundance: 80, respawnRate: 1.2 },
        { type: 'EXOTIC', abundance: 20, respawnRate: 0.5 },
      ];
    case 'DESERT':
      return [
        { type: 'EXOTIC', abundance: 50, respawnRate: 0.6 },
        { type: 'STONE', abundance: 40, respawnRate: 0.7 },
      ];
    case 'RIVER':
      return [
        { type: 'FISH', abundance: 70, respawnRate: 1.0 },
        { type: 'GRAIN', abundance: 40, respawnRate: 0.8 },
      ];
    case 'UNDERGROUND':
      return [
        { type: 'ORE', abundance: 80, respawnRate: 0.8 },
        { type: 'STONE', abundance: 70, respawnRate: 0.8 },
        { type: 'EXOTIC', abundance: 30, respawnRate: 0.5 },
      ];
    case 'UNDERWATER':
      return [
        { type: 'FISH', abundance: 90, respawnRate: 1.3 },
        { type: 'EXOTIC', abundance: 60, respawnRate: 0.7 },
      ];
    case 'FEYWILD':
      return [
        { type: 'REAGENT', abundance: 80, respawnRate: 1.0 },
        { type: 'HERB', abundance: 70, respawnRate: 1.0 },
        { type: 'EXOTIC', abundance: 50, respawnRate: 0.6 },
      ];
    default:
      return [];
  }
}

// ============================================================
// REGION BORDERS
// ============================================================

interface BorderDef {
  region1: string;
  region2: string;
  type: string; // 'land', 'water', 'underground', 'planar'
}

const BORDERS: BorderDef[] = [
  // Core region adjacencies
  { region1: 'Verdant Heartlands', region2: 'Silverwood Forest', type: 'land' },
  { region1: 'Verdant Heartlands', region2: 'Ironvault Mountains', type: 'land' },
  { region1: 'Verdant Heartlands', region2: 'The Crossroads', type: 'land' },
  { region1: 'Verdant Heartlands', region2: 'Shadowmere Marshes', type: 'land' },
  { region1: 'Verdant Heartlands', region2: 'Frozen Reaches', type: 'land' },
  { region1: 'Silverwood Forest', region2: 'Shadowmere Marshes', type: 'land' },
  { region1: 'Silverwood Forest', region2: 'The Crossroads', type: 'land' },
  { region1: 'Ironvault Mountains', region2: 'Ashenfang Wastes', type: 'land' },
  { region1: 'Ironvault Mountains', region2: 'Frozen Reaches', type: 'land' },
  { region1: 'The Crossroads', region2: 'Ashenfang Wastes', type: 'land' },
  { region1: 'The Crossroads', region2: 'The Suncoast', type: 'land' },
  { region1: 'Ashenfang Wastes', region2: 'The Suncoast', type: 'land' },
  { region1: 'Shadowmere Marshes', region2: 'Frozen Reaches', type: 'land' },

  // Common race territory borders
  { region1: 'Twilight March', region2: 'Verdant Heartlands', type: 'land' },
  { region1: 'Twilight March', region2: 'Silverwood Forest', type: 'land' },
  { region1: 'Scarred Frontier', region2: 'Verdant Heartlands', type: 'land' },
  { region1: 'Scarred Frontier', region2: 'Ashenfang Wastes', type: 'land' },
  { region1: 'Cogsworth Warrens', region2: 'Ironvault Mountains', type: 'land' },
  { region1: 'Pelagic Depths', region2: 'The Suncoast', type: 'water' },
  { region1: 'Thornwilds', region2: 'Silverwood Forest', type: 'land' },
  { region1: 'Thornwilds', region2: 'The Crossroads', type: 'land' },
  { region1: 'Thornwilds', region2: 'Ironvault Mountains', type: 'land' },
  { region1: 'Glimmerveil', region2: 'Silverwood Forest', type: 'planar' },

  // Exotic race territory borders
  { region1: 'Skypeak Plateaus', region2: 'Ironvault Mountains', type: 'land' },
  { region1: 'Skypeak Plateaus', region2: 'Frozen Reaches', type: 'land' },
  { region1: "Vel'Naris Underdark", region2: 'Shadowmere Marshes', type: 'underground' },
  { region1: 'Mistwood Glens', region2: 'Silverwood Forest', type: 'land' },
  { region1: 'The Foundry', region2: 'Ironvault Mountains', type: 'land' },
  { region1: 'The Confluence', region2: 'The Suncoast', type: 'land' },
  { region1: 'Ashenmoor', region2: 'Shadowmere Marshes', type: 'land' },
];

// ============================================================
// EXCLUSIVE ZONES
// ============================================================

interface ExclusiveZoneDef {
  name: string;
  description: string;
  regionName: string;
  requiredRaces: string[];
}

const EXCLUSIVE_ZONES: ExclusiveZoneDef[] = [
  {
    name: 'The Great Library of Aelindra',
    description: 'The innermost sanctum of Elven knowledge. Only those of Elven blood may access the restricted archives containing millennia of accumulated lore.',
    regionName: 'Silverwood Forest',
    requiredRaces: ['ELF', 'HALF_ELF'],
  },
  {
    name: 'The Deep Forge',
    description: 'The legendary ancestral forge of the Dwarven Thanes, carved into the heart of the mountain. Only Dwarves know the secret tunnels to reach it.',
    regionName: 'Ironvault Mountains',
    requiredRaces: ['DWARF'],
  },
  {
    name: "Warchief's Proving Pit",
    description: 'A sacred arena where only those of Orc blood may fight for honor and rank. Outsiders who enter are killed on sight.',
    regionName: 'Ashenfang Wastes',
    requiredRaces: ['ORC', 'HALF_ORC'],
  },
  {
    name: 'The Abyssal Sanctum',
    description: 'The deepest coral cathedral where Merfolk commune with the ocean spirits. The crushing pressure and lack of air make it lethal to surface dwellers.',
    regionName: 'Pelagic Depths',
    requiredRaces: ['MERFOLK'],
  },
  {
    name: 'The Feywild Crossing',
    description: 'A permanent tear between the mortal world and the Feywild. Only those with Fey blood can pass through without being lost between worlds forever.',
    regionName: 'Glimmerveil',
    requiredRaces: ['FAEFOLK'],
  },
  {
    name: "The Matriarch's Inner Sanctum",
    description: 'The obsidian heart of Nightborne society where the Matriarchal Houses meet in secret. Only Nightborne may enter; all others are ensnared in shadow webs.',
    regionName: "Vel'Naris Underdark",
    requiredRaces: ['NIGHTBORNE'],
  },
  {
    name: 'The Creation Vault',
    description: 'The original facility where the first Forgeborn were built. Only Forgeborn can interface with the ancient construct machinery that still operates within.',
    regionName: 'The Foundry',
    requiredRaces: ['FORGEBORN'],
  },
  {
    name: 'The Elemental Nexus',
    description: 'The raw convergence point of four elemental planes. Non-Elementari are torn apart by the conflicting elemental energies.',
    regionName: 'The Confluence',
    requiredRaces: ['ELEMENTARI'],
  },
  {
    name: 'The Druidic Heart',
    description: 'The oldest living tree in Aethermere, tended by Mosskin druids since before recorded history. Only Mosskin may commune with the ancient nature spirits here.',
    regionName: 'Mistwood Glens',
    requiredRaces: ['MOSSKIN'],
  },
  {
    name: 'The Goliath Proving Peaks',
    description: 'Mountain peaks so high that the air barely sustains life. Only Goliaths can endure the altitude and compete in the Sky Trials held here.',
    regionName: 'Skypeak Plateaus',
    requiredRaces: ['GOLIATH'],
  },
  {
    name: 'The Shadow Council Chamber',
    description: 'Hidden deep within Nethermire, this chamber is warded with infernal magic. Only those of Nethkin blood can pass through the hellfire wards.',
    regionName: 'Shadowmere Marshes',
    requiredRaces: ['NETHKIN'],
  },
  {
    name: 'The Dragon Bone Sanctum',
    description: 'Ancient dragon burial grounds where the spirits of elder dragons still linger. Only Drakonid with dragon bloodline can withstand the overwhelming primal aura.',
    regionName: 'Frozen Reaches',
    requiredRaces: ['DRAKONID'],
  },
  {
    name: 'The Pack Den',
    description: 'A hidden cave system where all Beastfolk clans gather for the Great Hunt. The primal scent wards repel any who lack beast blood.',
    regionName: 'Thornwilds',
    requiredRaces: ['BEASTFOLK'],
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedWorld(prisma: PrismaClient) {
  console.log('--- Seeding Regions ---');
  const regionMap = new Map<string, string>(); // name -> id

  for (const region of REGIONS) {
    const created = await prisma.region.upsert({
      where: { name: region.name },
      update: {
        description: region.description,
        biome: region.biome,
        levelMin: region.levelMin,
        levelMax: region.levelMax,
      },
      create: {
        name: region.name,
        description: region.description,
        biome: region.biome,
        levelMin: region.levelMin,
        levelMax: region.levelMax,
      },
    });
    regionMap.set(region.name, created.id);
  }
  console.log(`  Created ${regionMap.size} regions`);

  console.log('--- Seeding Towns ---');
  const townMap = new Map<string, string>(); // name -> id

  for (const town of TOWNS) {
    const regionId = regionMap.get(town.regionName);
    if (!regionId) {
      console.error(`  ERROR: Region "${town.regionName}" not found for town "${town.name}"`);
      continue;
    }

    const features = {
      x: town.x,
      y: town.y,
      prosperityLevel: town.prosperityLevel,
      specialty: town.specialty,
      availableBuildings: town.availableBuildings,
    };

    const created = await prisma.town.upsert({
      where: { name: town.name },
      update: {
        regionId,
        population: town.population,
        biome: town.biome,
        description: town.description,
        features,
      },
      create: {
        name: town.name,
        regionId,
        population: town.population,
        biome: town.biome,
        description: town.description,
        features,
      },
    });
    townMap.set(town.name, created.id);
  }
  console.log(`  Created ${townMap.size} towns`);

  console.log('--- Seeding Travel Routes ---');
  let routeCount = 0;

  for (const route of ROUTES) {
    const fromId = townMap.get(route.from);
    const toId = townMap.get(route.to);
    if (!fromId || !toId) {
      console.error(`  ERROR: Could not find towns for route "${route.from}" -> "${route.to}"`);
      continue;
    }

    // Create bidirectional routes
    await prisma.travelRoute.upsert({
      where: { fromTownId_toTownId: { fromTownId: fromId, toTownId: toId } },
      update: {
        distance: route.distance,
        dangerLevel: route.dangerLevel,
        terrain: route.terrain,
      },
      create: {
        fromTownId: fromId,
        toTownId: toId,
        distance: route.distance,
        dangerLevel: route.dangerLevel,
        terrain: route.terrain,
      },
    });

    await prisma.travelRoute.upsert({
      where: { fromTownId_toTownId: { fromTownId: toId, toTownId: fromId } },
      update: {
        distance: route.distance,
        dangerLevel: route.dangerLevel,
        terrain: route.terrain,
      },
      create: {
        fromTownId: toId,
        toTownId: fromId,
        distance: route.distance,
        dangerLevel: route.dangerLevel,
        terrain: route.terrain,
      },
    });

    routeCount++;
  }
  console.log(`  Created ${routeCount} routes (${routeCount * 2} bidirectional)`);

  console.log('--- Seeding Town Resources ---');
  let resourceCount = 0;

  for (const town of TOWNS) {
    const townId = townMap.get(town.name);
    if (!townId) continue;

    const resources = getResourcesForTown(town.name, town.regionName, town.biome);

    for (const resource of resources) {
      await prisma.townResource.upsert({
        where: { townId_resourceType: { townId, resourceType: resource.type } },
        update: {
          abundance: resource.abundance,
          respawnRate: resource.respawnRate,
        },
        create: {
          townId,
          resourceType: resource.type,
          abundance: resource.abundance,
          respawnRate: resource.respawnRate,
        },
      });
      resourceCount++;
    }
  }
  console.log(`  Created ${resourceCount} town resources`);

  console.log('--- Seeding Region Borders ---');
  let borderCount = 0;

  for (const border of BORDERS) {
    const regionId1 = regionMap.get(border.region1);
    const regionId2 = regionMap.get(border.region2);
    if (!regionId1 || !regionId2) {
      console.error(`  ERROR: Could not find regions for border "${border.region1}" <-> "${border.region2}"`);
      continue;
    }

    // Sort IDs to ensure consistent ordering for the unique constraint
    const [sortedId1, sortedId2] = regionId1 < regionId2
      ? [regionId1, regionId2]
      : [regionId2, regionId1];

    await prisma.regionBorder.upsert({
      where: { regionId1_regionId2: { regionId1: sortedId1, regionId2: sortedId2 } },
      update: {
        type: border.type,
      },
      create: {
        regionId1: sortedId1,
        regionId2: sortedId2,
        type: border.type,
      },
    });
    borderCount++;
  }
  console.log(`  Created ${borderCount} region borders`);

  console.log('--- Seeding Exclusive Zones ---');
  let zoneCount = 0;

  for (const zone of EXCLUSIVE_ZONES) {
    const regionId = regionMap.get(zone.regionName);
    if (!regionId) {
      console.error(`  ERROR: Region "${zone.regionName}" not found for exclusive zone "${zone.name}"`);
      continue;
    }

    // Use upsert by checking existing zone with same name in the region
    const existing = await prisma.exclusiveZone.findFirst({
      where: { name: zone.name, regionId },
    });

    if (existing) {
      await prisma.exclusiveZone.update({
        where: { id: existing.id },
        data: {
          description: zone.description,
          requiredRaces: zone.requiredRaces,
        },
      });
    } else {
      await prisma.exclusiveZone.create({
        data: {
          name: zone.name,
          description: zone.description,
          regionId,
          requiredRaces: zone.requiredRaces,
        },
      });
    }
    zoneCount++;
  }
  console.log(`  Created ${zoneCount} exclusive zones`);

  console.log('--- World Seed Complete ---');
}
