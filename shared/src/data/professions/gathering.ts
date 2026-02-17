import { ProfessionDefinition } from './types';

export const FARMER: ProfessionDefinition = {
  type: 'FARMER',
  name: 'Farmer',
  category: 'GATHERING',
  description: 'Farmers cultivate the land, growing wheat, vegetables, cotton, and other crops. They are the backbone of civilization, feeding armies and supplying tailors with raw fiber. Farms thrive on the fertile plains and rolling hills of the Heartlands and the Crossroads.',
  primaryStat: 'CON',
  relatedProfessions: ['COOK', 'BREWER', 'TAILOR', 'RANCHER'],
  inputResources: ['Seeds', 'Water', 'Fertilizer'],
  outputProducts: ['Wheat', 'Vegetables', 'Corn', 'Hops', 'Cotton', 'Flax', 'Apples', 'Grapes'],
  townTypeAffinity: ['plains', 'hills'],
  tierUnlocks: {
    APPRENTICE: ['Apples (orchard)', 'Grain (private field)', 'Vegetables (private field)'],
    JOURNEYMAN: ['(No new spots — tier bonus scales)'],
    CRAFTSMAN: ['Wild Berries (Coming Soon)', 'Hops (Coming Soon)', 'Grapes (Coming Soon)'],
    EXPERT: ['Cotton (Coming Soon)', 'Flax (Coming Soon)'],
    MASTER: ['Rare Herbs (Coming Soon)', 'Exotic Fruits (Coming Soon)'],
    GRANDMASTER: ['Legendary Crops (Coming Soon)', 'Magical Seedlings (Coming Soon)'],
  },
};

export const RANCHER: ProfessionDefinition = {
  type: 'RANCHER',
  name: 'Rancher',
  category: 'GATHERING',
  description: 'Ranchers raise livestock for meat, leather, wool, eggs, and milk. They breed horses for Stable Masters and cattle for Cooks. Ranches require open grazing land, making them most productive on the plains.',
  primaryStat: 'CON',
  relatedProfessions: ['TANNER', 'COOK', 'TAILOR', 'STABLE_MASTER'],
  inputResources: ['Grain', 'Water', 'Hay'],
  outputProducts: ['Beef', 'Sheep', 'Pork', 'Chicken', 'Horses', 'Wool', 'Milk', 'Eggs'], // Major-ECON-07: Renamed Cattle->Beef, Pigs->Pork, Chickens->Chicken to match resource names
  townTypeAffinity: ['plains', 'hills'],
  tierUnlocks: {
    APPRENTICE: ['Chicken', 'Pork', 'Milk', 'Eggs'], // Major-ECON-07: Match resource names
    JOURNEYMAN: ['Beef', 'Sheep', 'Wool'], // Major-ECON-07: Match resource names
    CRAFTSMAN: ['Horses', 'Selective breeding'],
    EXPERT: ['War Horse stock', 'Exotic livestock'],
    MASTER: ['Prize breeding lines', 'Rare pelts'],
    GRANDMASTER: ['Legendary mounts breeding', 'Custom breed creation'],
  },
};

export const FISHERMAN: ProfessionDefinition = {
  type: 'FISHERMAN',
  name: 'Fisherman',
  category: 'GATHERING',
  description: 'Fishermen work the rivers, lakes, and seas, harvesting fish, shellfish, pearls, and seaweed. Coastal and river towns depend on them for food and valuable trade goods. A skilled fisherman with a keen eye can pull rare catches from the deep.',
  primaryStat: 'DEX',
  relatedProfessions: ['COOK', 'JEWELER', 'MERCHANT'],
  inputResources: ['Bait', 'Nets', 'Fishing Rods'],
  outputProducts: ['Common Fish', 'Rare Fish', 'Shellfish', 'Pearls', 'Seaweed'],
  townTypeAffinity: ['coastal', 'river'],
  tierUnlocks: {
    APPRENTICE: ['Common Fish', 'Seaweed'],
    JOURNEYMAN: ['Shellfish', 'Uncommon Fish'],
    CRAFTSMAN: ['Rare Fish', 'Pearls (occasional)'],
    EXPERT: ['Deep-sea catches', 'Pearls (reliable)'],
    MASTER: ['Abyssal Fish', 'Giant Shellfish'],
    GRANDMASTER: ['Legendary Sea Creatures', 'Abyssal Pearls'],
  },
};

export const LUMBERJACK: ProfessionDefinition = {
  type: 'LUMBERJACK',
  name: 'Lumberjack',
  category: 'GATHERING',
  description: 'Lumberjacks fell trees and process timber into usable lumber. Their wood feeds the workshops of Woodworkers, Fletchers, and builders alike. The best timber comes from ancient forests, but every settlement needs a steady supply of wood.',
  primaryStat: 'STR',
  relatedProfessions: ['WOODWORKER', 'FLETCHER', 'MASON', 'TANNER'],
  inputResources: ['Axes', 'Saws'],
  outputProducts: ['Softwood', 'Hardwood', 'Exotic Wood', 'Bark', 'Sap', 'Resin'],
  townTypeAffinity: ['forest'],
  tierUnlocks: {
    APPRENTICE: ['Softwood', 'Bark'],
    JOURNEYMAN: ['Hardwood', 'Sap'],
    CRAFTSMAN: ['Resin', 'Quality timber selection'],
    EXPERT: ['Exotic Wood (common forests)'],
    MASTER: ['Exotic Wood (ancient forests)', 'Petrified Wood'],
    GRANDMASTER: ['Heartwood', 'Living Bark', 'Legendary timber'],
  },
};

export const MINER: ProfessionDefinition = {
  type: 'MINER',
  name: 'Miner',
  category: 'GATHERING',
  description: 'Miners extract ore, gems, coal, and stone from the earth. Their raw materials are the foundation of every crafting chain involving metal or stone. Mountain towns and underground settlements offer the richest veins.',
  primaryStat: 'STR',
  relatedProfessions: ['SMELTER', 'JEWELER', 'MASON', 'BLACKSMITH'],
  inputResources: ['Pickaxes', 'Lanterns', 'Supports'],
  outputProducts: ['Copper Ore', 'Iron Ore', 'Silver Ore', 'Gold Ore', 'Gemstones', 'Coal', 'Stone'],
  townTypeAffinity: ['mountain', 'underground'],
  tierUnlocks: {
    APPRENTICE: ['Copper Ore', 'Coal', 'Stone'],
    JOURNEYMAN: ['Iron Ore', 'Raw Gemstones (common)'],
    CRAFTSMAN: ['Silver Ore', 'Raw Gemstones (uncommon)'],
    EXPERT: ['Gold Ore', 'Rare Gemstones'],
    MASTER: ['Mithril Ore', 'Adamantine Ore'],
    GRANDMASTER: ['Legendary Ore Veins', 'Elemental Crystals'],
  },
};

export const HERBALIST: ProfessionDefinition = {
  type: 'HERBALIST',
  name: 'Herbalist',
  category: 'GATHERING',
  description: 'Herbalists forage for medicinal herbs, rare reagents, mushrooms, and flowers. They supply Alchemists and Healers with the ingredients needed for potions, salves, and enchantments. Forests and swamps hold the greatest botanical diversity.',
  primaryStat: 'WIS',
  relatedProfessions: ['ALCHEMIST', 'HEALER', 'ENCHANTER', 'COOK'],
  inputResources: ['Gathering Satchel', 'Pruning Shears'],
  outputProducts: ['Common Herbs', 'Medicinal Herbs', 'Rare Herbs', 'Mushrooms', 'Flowers', 'Arcane Reagents'],
  townTypeAffinity: ['forest', 'swamp'],
  tierUnlocks: {
    APPRENTICE: ['Common Herbs', 'Mushrooms'],
    JOURNEYMAN: ['Medicinal Herbs', 'Flowers'],
    CRAFTSMAN: ['Rare Herbs', 'Spices'],
    EXPERT: ['Arcane Reagents', 'Exotic Mushrooms'],
    MASTER: ['Legendary Flora', 'Rare Arcane Reagents'],
    GRANDMASTER: ['Mythical Plants', 'Pure Arcane Essences'],
  },
};

export const HUNTER: ProfessionDefinition = {
  type: 'HUNTER',
  name: 'Hunter',
  category: 'GATHERING',
  description: 'Hunters track and harvest wild game in forests and mountains. They provide raw leather, pelts, bone, feathers, and wild meat. Skilled hunters are crucial suppliers for Tanners, Fletchers, and Cooks.',
  primaryStat: 'DEX',
  relatedProfessions: ['TANNER', 'FLETCHER', 'COOK', 'LEATHERWORKER'],
  inputResources: ['Bows', 'Traps', 'Skinning Knives'],
  outputProducts: ['Raw Leather', 'Pelts', 'Bone', 'Antlers', 'Feathers', 'Wild Game Meat'],
  townTypeAffinity: ['forest', 'mountain'],
  tierUnlocks: {
    APPRENTICE: ['Raw Leather (common)', 'Wild Game Meat'],
    JOURNEYMAN: ['Pelts', 'Bone', 'Feathers'],
    CRAFTSMAN: ['Antlers', 'Fine Pelts', 'Exotic Feathers'],
    EXPERT: ['Exotic Hides', 'Rare Bone'],
    MASTER: ['Legendary Creature parts', 'Dragon Bone fragments'],
    GRANDMASTER: ['Mythical Beast trophies', 'Spirit Beast Hide'],
  },
};

export const GATHERING_PROFESSIONS: ProfessionDefinition[] = [
  FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER,
];
