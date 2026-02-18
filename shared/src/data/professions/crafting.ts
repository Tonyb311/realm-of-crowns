import { ProfessionDefinition } from './types';

export const SMELTER: ProfessionDefinition = {
  type: 'SMELTER',
  name: 'Smelter',
  category: 'CRAFTING',
  description: 'Smelters process raw ore into usable metal ingots and alloys. They turn iron ore and coal into iron ingots, refine them into steel, and work with precious metals. Every weapon and piece of armor begins at the smeltery.',
  primaryStat: 'CON',
  relatedProfessions: ['MINER', 'BLACKSMITH', 'ARMORER', 'JEWELER'],
  inputResources: ['Copper Ore', 'Iron Ore', 'Silver Ore', 'Gold Ore', 'Coal', 'Silite Sand'],
  outputProducts: ['Copper Ingots', 'Iron Ingots', 'Steel Ingots', 'Silver Ingots', 'Gold Ingots', 'Glass Vials', 'Mithril Ingots', 'Adamantine Ingots'],
  townTypeAffinity: ['mountain', 'industrial'],
  tierUnlocks: {
    APPRENTICE: ['Copper Ingots', 'Iron Nails'],
    JOURNEYMAN: ['Iron Ingots', 'Glass Vials'],
    CRAFTSMAN: ['Steel Ingots', 'Silver Ingots'],
    EXPERT: ['Gold Ingots', 'High-purity metals'],
    MASTER: ['Mithril Ingots', 'Adamantine Ingots'],
    GRANDMASTER: ['Legendary alloys', 'Elemental-infused metals'],
  },
};

export const BLACKSMITH: ProfessionDefinition = {
  type: 'BLACKSMITH',
  name: 'Blacksmith',
  category: 'CRAFTING',
  description: 'Blacksmiths forge tools, weapons, and armor from iron, wood, and stone. At Craftsman tier, they specialize into Toolsmith, Weaponsmith, or Armorer — a permanent choice that unlocks exclusive recipes.',
  primaryStat: 'STR',
  relatedProfessions: ['MINER', 'LUMBERJACK'],
  inputResources: ['Iron Ore Chunks', 'Coal', 'Silver Ore', 'Wood Logs', 'Hardwood'],
  outputProducts: ['Iron Pickaxe', 'Iron Sword', 'Iron Chain Shirt', 'Steel Pickaxe', 'Steel Sword', 'Steel Chain Mail', 'Silver Pickaxe', 'Silver Longsword', 'Silver-Studded Plate'],
  townTypeAffinity: ['mountain', 'industrial', 'military'],
  tierUnlocks: {
    APPRENTICE: ['Iron Pickaxe (+15% mining)', 'Iron Hatchet (+15% woodcutting)', 'Iron Sword (atk +5)', 'Iron Chain Shirt (def +4)', 'Wooden Shield (def +3)'],
    JOURNEYMAN: ['Steel Pickaxe (+25% mining)', 'Steel Sword (atk +8)', 'Steel Chain Mail (def +7)', 'Steel Helmet (def +4)'],
    CRAFTSMAN: ['Specialize: Toolsmith / Weaponsmith / Armorer', 'Silver & Hardwood recipes'],
    EXPERT: ['Mithril-tier branch recipes'],
    MASTER: ['Adamantine-tier branch recipes'],
    GRANDMASTER: ['Legendary artifacts'],
  },
  hasSpecializations: true,
  specializations: [
    { id: 'TOOLSMITH', name: 'Toolsmith', description: 'Premium tools with higher durability and yield bonuses' },
    { id: 'WEAPONSMITH', name: 'Weaponsmith', description: 'Premium weapons with higher attack stats' },
    { id: 'ARMORER', name: 'Armorer', description: 'Premium armor and shields with higher defense stats' },
  ],
};

export const ARMORER: ProfessionDefinition = {
  type: 'ARMORER',
  name: 'Armorer',
  category: 'CRAFTING',
  description: 'Armorers forge protective gear from metal, leather, and padding. Helmets, chestplates, shields, and gauntlets are their trade. The difference between life and death in battle often comes down to the skill of the armorer who forged your plate.',
  primaryStat: 'STR',
  relatedProfessions: ['SMELTER', 'TANNER', 'TAILOR', 'ENCHANTER'],
  inputResources: ['Metal Ingots', 'Hard Leather', 'Cloth Padding', 'Gems'],
  outputProducts: ['Helmets', 'Chestplates', 'Shields', 'Gauntlets', 'Greaves', 'Full Plate Sets'],
  townTypeAffinity: ['mountain', 'industrial', 'military'],
  tierUnlocks: {
    APPRENTICE: ['Copper armor pieces', 'Wooden shields'],
    JOURNEYMAN: ['Iron armor', 'Iron shields'],
    CRAFTSMAN: ['Steel armor', 'Steel shields'],
    EXPERT: ['Mithril armor', 'Reinforced shields'],
    MASTER: ['Adamantine armor', 'Dragonscale armor'],
    GRANDMASTER: ['Legendary armor sets', 'Custom enchantable plates'],
  },
};

export const WOODWORKER: ProfessionDefinition = {
  type: 'WOODWORKER',
  name: 'Woodworker',
  category: 'CRAFTING',
  description: 'Woodworkers shape timber into bows, staves, furniture, barrels, and building materials. They supply Fletchers with bow staves, Brewers with barrels, and towns with the lumber products needed for construction and daily life.',
  primaryStat: 'DEX',
  relatedProfessions: ['LUMBERJACK', 'FLETCHER', 'BREWER', 'MASON'],
  inputResources: ['Softwood', 'Hardwood', 'Exotic Wood', 'Nails', 'Glue'],
  outputProducts: ['Bows', 'Staves', 'Furniture', 'Barrels', 'Planks', 'Beams', 'Building Materials'],
  townTypeAffinity: ['forest', 'plains'],
  tierUnlocks: {
    APPRENTICE: ['Planks', 'Simple furniture', 'Wooden Vials'],
    JOURNEYMAN: ['Bows', 'Barrels', 'Beams'],
    CRAFTSMAN: ['Quality furniture', 'Staves', 'Building materials'],
    EXPERT: ['Exotic wood bows', 'Ornate furniture'],
    MASTER: ['Masterwork staves', 'Siege equipment parts'],
    GRANDMASTER: ['Legendary bows', 'Enchantable wood products'],
  },
};

export const TANNER: ProfessionDefinition = {
  type: 'TANNER',
  name: 'Tanner',
  category: 'CRAFTING',
  description: 'Tanners transform raw animal pelts into supple leather, then craft armor, bags, and accessories. Their leather goods offer nimble protection favored by scouts, rangers, and rogues.',
  primaryStat: 'DEX',
  relatedProfessions: ['HUNTER'],
  inputResources: ['Animal Pelts', 'Wolf Pelts', 'Bear Hides', 'Iron Ore Chunks', 'Silver Ore'],
  outputProducts: ['Cured Leather', 'Wolf Leather', 'Bear Leather', 'Leather Armor', 'Bear Hide Cuirass'],
  townTypeAffinity: ['forest', 'plains'],
  tierUnlocks: {
    APPRENTICE: ['Cured Leather', 'Leather Cap', 'Leather Vest', 'Leather Belt', 'Leather Satchel'],
    JOURNEYMAN: ['Leather Armor', 'Leather Bracers', 'Leather Greaves', 'Quiver'],
    CRAFTSMAN: ['Wolf Leather', 'Bear Leather', 'Wolf Leather Armor', 'Bear Hide Cuirass', 'Wolf Leather Hood', "Ranger's Quiver"],
    EXPERT: ['Dragonhide Armor', 'Shadow Cloak', 'Master Quiver'],
    MASTER: ["Assassin's Garb", 'Beastmaster Mantle'],
    GRANDMASTER: ['Legendary Leatherwork'],
  },
};

export const LEATHERWORKER: ProfessionDefinition = {
  type: 'LEATHERWORKER',
  name: 'Leatherworker',
  category: 'CRAFTING',
  description: 'Leatherworkers craft finished goods from tanned leather: armor, boots, belts, bags, quivers, and saddles. They are essential suppliers for adventurers who prefer agility over heavy plate.',
  primaryStat: 'DEX',
  relatedProfessions: ['TANNER', 'HUNTER', 'STABLE_MASTER', 'ENCHANTER'],
  inputResources: ['Soft Leather', 'Hard Leather', 'Studded Leather', 'Buckles', 'Thread'],
  outputProducts: ['Leather Armor', 'Boots', 'Belts', 'Bags', 'Saddles', 'Quivers', 'Gloves'],
  townTypeAffinity: ['forest', 'plains', 'trade'],
  tierUnlocks: {
    APPRENTICE: ['Leather belts', 'Simple bags'],
    JOURNEYMAN: ['Leather armor', 'Boots', 'Gloves'],
    CRAFTSMAN: ['Studded armor', 'Quality saddles', 'Quivers'],
    EXPERT: ['Exotic leather armor', 'Reinforced bags'],
    MASTER: ['Masterwork leather sets', 'War saddles'],
    GRANDMASTER: ['Legendary leather armor', 'Custom enchantable leatherwork'],
  },
};

export const TAILOR: ProfessionDefinition = {
  type: 'TAILOR',
  name: 'Tailor',
  category: 'CRAFTING',
  description: 'Tailors weave wool and leather into robes, cloaks, and enchanted garments. Their creations enhance the mind, bolster charisma, and channel magical energies — the attire of mages, priests, and nobility.',
  primaryStat: 'CHA',
  relatedProfessions: ['RANCHER', 'TANNER'],
  inputResources: ['Wool', 'Fine Wool', 'Silkworm Cocoons', 'Cured Leather', 'Wolf Leather', 'Bear Leather'],
  outputProducts: ['Woven Cloth', 'Fine Cloth', 'Silk Fabric', 'Robes', 'Cloaks', 'Hoods', 'Garments'],
  townTypeAffinity: ['plains', 'trade', 'urban'],
  tierUnlocks: {
    APPRENTICE: ['Woven Cloth', 'Cloth Hood', 'Cloth Robe', 'Wool Trousers', 'Cloth Sash'],
    JOURNEYMAN: ["Scholar's Robe", "Traveler's Cloak", "Merchant's Hat", "Herbalist's Apron"],
    CRAFTSMAN: ['Fine Cloth', 'Silk Fabric', "Archmage's Robe", "Diplomat's Regalia", 'Silk Hood of Insight', "Noble's Leggings", 'Enchanted Cloak'],
    EXPERT: ['Spellweave Robe', 'Cloak of Shadows', 'Royal Vestments'],
    MASTER: ['Robe of the Archmage', 'Crown Weavers Masterpiece'],
    GRANDMASTER: ['Legendary Woven Artifacts'],
  },
};

export const ALCHEMIST: ProfessionDefinition = {
  type: 'ALCHEMIST',
  name: 'Alchemist',
  category: 'CRAFTING',
  description: 'Alchemists brew potions, salves, and elixirs from herbs, berries, and minerals. Their concoctions heal wounds, sharpen minds, and protect against poisons \u2014 essential supplies for any adventurer.',
  primaryStat: 'INT',
  relatedProfessions: ['HERBALIST', 'FARMER'],
  inputResources: ['Wild Herbs', 'Wild Berries', 'Clay', 'Medicinal Herbs', 'Glowcap Mushrooms'],
  outputProducts: ['Minor Healing Potion', 'Antidote', 'Berry Salve', 'Healing Potion', 'Elixir of Strength', 'Elixir of Wisdom', 'Poison Resistance Tonic', 'Greater Healing Potion', 'Elixir of Fortitude', 'Glowcap Extract', 'Universal Antidote'],
  townTypeAffinity: ['swamp', 'forest', 'academic'],
  tierUnlocks: {
    APPRENTICE: ['Minor Healing Potion (heal 15 HP)', 'Antidote (cure poison)', 'Berry Salve (HP regen)'],
    JOURNEYMAN: ['Healing Potion (heal 30 HP)', 'Elixir of Strength (+3 STR)', 'Elixir of Wisdom (+3 WIS)', 'Poison Resistance Tonic'],
    CRAFTSMAN: ['Greater Healing Potion (heal 60 HP)', 'Elixir of Fortitude (+4 CON, +2 STR)', 'Glowcap Extract (+4 INT, +2 WIS)', 'Universal Antidote (cure all)'],
    EXPERT: ['Superior Healing Potion', 'Elixir of Haste', 'Fire Resistance Potion'],
    MASTER: ['Philosopher\'s Stone Elixir', 'Potion of Invisibility'],
    GRANDMASTER: ['Elixir of Immortality'],
  },
};

export const ENCHANTER: ProfessionDefinition = {
  type: 'ENCHANTER',
  name: 'Enchanter',
  category: 'CRAFTING',
  description: 'Enchanters imbue finished items with magical properties using arcane reagents and gems. They transform an ordinary sword into a flaming blade and common robes into wards of protection. Requires an Enchanting Tower.',
  primaryStat: 'INT',
  relatedProfessions: ['HERBALIST', 'JEWELER', 'BLACKSMITH', 'ARMORER', 'SCRIBE'],
  inputResources: ['Finished Items', 'Arcane Reagents', 'Gems', 'Enchanting Dust'],
  outputProducts: ['Enchanted Weapons', 'Enchanted Armor', 'Enchanted Jewelry', 'Enchanted Robes', 'Warding Stones'],
  townTypeAffinity: ['academic', 'magical'],
  tierUnlocks: {
    APPRENTICE: ['Minor enchantments (+1 effects)'],
    JOURNEYMAN: ['Standard enchantments (+2 effects)'],
    CRAFTSMAN: ['Advanced enchantments (+3 effects, elemental)'],
    EXPERT: ['Superior enchantments (+5 effects, multi-property)'],
    MASTER: ['Master enchantments (legendary properties)'],
    GRANDMASTER: ['Legendary enchantments (unique effects, custom spells)'],
  },
};

export const COOK: ProfessionDefinition = {
  type: 'COOK',
  name: 'Cook',
  category: 'CRAFTING',
  description: 'Cooks transform raw ingredients into meals, bread, and feast platters that grant temporary stat buffs and restore health. From simple rations to legendary banquets, well-fed adventurers fight harder and live longer.',
  primaryStat: 'WIS',
  relatedProfessions: ['FARMER', 'RANCHER', 'HUNTER', 'HERBALIST', 'FISHERMAN'],
  inputResources: ['Grain', 'Apples', 'Wild Berries', 'Wild Herbs', 'Raw Fish', 'River Trout', 'Lake Perch', 'Eggs', 'Milk', 'Wood Logs', 'Vegetables'],
  outputProducts: ['Flour', 'Apple Sauce', 'Porridge', 'Berry Jam', 'Grilled Fish', 'Herbal Tea', 'Vegetable Stew', 'Bread Loaf', 'Apple Pie', 'Fish Stew', 'Smoked Fish', 'Pan-Seared Trout', 'Perch Feast', "Fisherman's Pie", 'Smoked Trout Rations', 'Harvest Feast', "Fisherman's Banquet", 'Spiced Pastry'],
  townTypeAffinity: ['plains', 'urban', 'trade'],
  tierUnlocks: {
    APPRENTICE: ['Flour', 'Apple Sauce', 'Porridge', 'Berry Jam', 'Herbal Tea', 'Vegetable Stew', 'Scrambled Eggs'],
    JOURNEYMAN: ['Bread Loaf', 'Apple Pie', 'Grilled Fish', 'Fish Stew', 'Smoked Fish', 'Berry Tart', 'Farm Breakfast'],
    CRAFTSMAN: ['Harvest Feast', "Fisherman's Banquet", 'Pan-Seared Trout', 'Perch Feast', "Fisherman's Pie", 'Smoked Trout Rations'],
    EXPERT: ['Feast Platters (+3 party buff)', 'Exotic cuisine'],
    MASTER: ['Legendary Banquets (+5 party buff)', 'Rare recipe mastery'],
    GRANDMASTER: ['Mythical Feasts (unique party buffs)', 'Custom recipe creation'],
  },
};

export const BREWER: ProfessionDefinition = {
  type: 'BREWER',
  name: 'Brewer',
  category: 'CRAFTING',
  description: 'Brewers transform grain, fruit, and herbs into ales, ciders, wines, and cordials. Their beverages grant stat buffs, fuel tavern trade, and create steady demand for Farmer and Herbalist output.',
  primaryStat: 'CON',
  relatedProfessions: ['FARMER', 'HERBALIST'],
  inputResources: ['Grain', 'Apples', 'Wild Berries', 'Wild Herbs', 'Hops', 'Grapes'],
  outputProducts: ['Ale', 'Apple Cider', 'Berry Cordial', 'Strong Ale', 'Mulled Cider', 'Herbal Brew', 'Hopped Beer', 'Grape Wine', 'Pale Ale'],
  townTypeAffinity: ['plains', 'hills', 'trade'],
  tierUnlocks: {
    APPRENTICE: ['Ale (+1 CON)', 'Apple Cider (+1 CHA)', 'Berry Cordial (HP regen)'],
    JOURNEYMAN: ['Strong Ale (+2 STR)', 'Mulled Cider (+2 WIS)', 'Herbal Brew (HP regen)'],
    CRAFTSMAN: ['Hopped Beer (+3 CON, +1 STR)', 'Grape Wine (+3 CHA, +1 WIS)', 'Pale Ale (+2 STR, +2 DEX)'],
    EXPERT: ['Superior Spirits', 'Vintage Wine', 'Specialty Brews'],
    MASTER: ['Masterwork Spirits', 'Legendary Vintages'],
    GRANDMASTER: ['Legendary Brews (unique buffs)', 'Custom recipe creation'],
  },
};

export const JEWELER: ProfessionDefinition = {
  type: 'JEWELER',
  name: 'Jeweler',
  category: 'CRAFTING',
  description: 'Jewelers cut raw gems and combine them with metal ingots to create rings, necklaces, circlets, and enchanting focuses. Their products are prized both for stat bonuses and as bases for powerful enchantments.',
  primaryStat: 'DEX',
  relatedProfessions: ['MINER', 'SMELTER', 'ENCHANTER', 'MERCHANT'],
  inputResources: ['Raw Gemstones', 'Metal Ingots', 'Gold Ingots', 'Silver Ingots'],
  outputProducts: ['Rings', 'Necklaces', 'Circlets', 'Enchanting Focuses', 'Cut Gems', 'Amulets'],
  townTypeAffinity: ['mountain', 'trade', 'urban'],
  tierUnlocks: {
    APPRENTICE: ['Copper rings', 'Rough-cut gems'],
    JOURNEYMAN: ['Silver jewelry', 'Standard gem cuts'],
    CRAFTSMAN: ['Gold jewelry', 'Fine gem cuts', 'Enchanting Focuses'],
    EXPERT: ['Multi-gem settings', 'Rare gem cuts'],
    MASTER: ['Masterwork jewelry sets', 'Legendary gem cuts'],
    GRANDMASTER: ['Legendary jewelry (unique stat bonuses)', 'Custom enchantable pieces'],
  },
};

export const FLETCHER: ProfessionDefinition = {
  type: 'FLETCHER',
  name: 'Fletcher',
  category: 'CRAFTING',
  description: 'Fletchers craft arrows, bolts, and throwing weapons from wood, feathers, and metal tips. Rangers and archers depend on a steady supply of quality ammunition, making Fletchers essential to any kingdom at war.',
  primaryStat: 'DEX',
  relatedProfessions: ['LUMBERJACK', 'HUNTER', 'SMELTER', 'WOODWORKER'],
  inputResources: ['Softwood', 'Hardwood', 'Feathers', 'Metal Tips', 'Bowstrings'],
  outputProducts: ['Arrows', 'Bolts', 'Throwing Knives', 'Specialty Ammunition'],
  townTypeAffinity: ['forest', 'military'],
  tierUnlocks: {
    APPRENTICE: ['Wooden Arrows', 'Basic Bolts'],
    JOURNEYMAN: ['Iron-tipped Arrows', 'Iron Bolts'],
    CRAFTSMAN: ['Steel Arrows', 'Throwing Knives', 'Fire Arrows'],
    EXPERT: ['Mithril Arrows', 'Explosive Bolts'],
    MASTER: ['Adamantine Arrows', 'Enchantable ammunition'],
    GRANDMASTER: ['Legendary ammunition', 'Custom specialty ammo'],
  },
};

export const MASON: ProfessionDefinition = {
  type: 'MASON',
  name: 'Mason',
  category: 'CRAFTING',
  description: 'Masons process raw stone into cut blocks, bricks, and building materials. They are essential for town construction, fortification building, and monument creation. A skilled mason shapes the very skyline of a city.',
  primaryStat: 'STR',
  relatedProfessions: ['MINER', 'WOODWORKER', 'LUMBERJACK'],
  inputResources: ['Raw Stone', 'Sand', 'Clay', 'Mortar'],
  outputProducts: ['Cut Stone', 'Bricks', 'Building Materials', 'Statues', 'Fortification Blocks'],
  townTypeAffinity: ['mountain', 'urban', 'military'],
  tierUnlocks: {
    APPRENTICE: ['Rough-cut Stone', 'Basic Bricks'],
    JOURNEYMAN: ['Cut Stone Blocks', 'Quality Bricks'],
    CRAFTSMAN: ['Ornamental Stone', 'Fortification Blocks'],
    EXPERT: ['Marble work', 'Reinforced structures'],
    MASTER: ['Masterwork statues', 'Siege-resistant walls'],
    GRANDMASTER: ['Legendary monuments', 'Enchantable stonework'],
  },
};

export const SCRIBE: ProfessionDefinition = {
  type: 'SCRIBE',
  name: 'Scribe',
  category: 'CRAFTING',
  description: 'Scribes produce scrolls, spell books, maps, and written works from paper and ink. Spell scrolls let non-mages cast spells once, maps reveal hidden areas, and books preserve knowledge. A valuable profession in academic and magical communities.',
  primaryStat: 'INT',
  relatedProfessions: ['WOODWORKER', 'HERBALIST', 'ALCHEMIST', 'ENCHANTER'],
  inputResources: ['Paper', 'Ink', 'Arcane Reagents', 'Quills'],
  outputProducts: ['Spell Scrolls', 'Maps', 'Books', 'Enchanting Manuals', 'Town Charters'],
  townTypeAffinity: ['academic', 'urban', 'magical'],
  tierUnlocks: {
    APPRENTICE: ['Basic Maps', 'Simple Scrolls'],
    JOURNEYMAN: ['Regional Maps', 'Tier 1 Spell Scrolls'],
    CRAFTSMAN: ['Detailed Maps', 'Tier 2 Spell Scrolls', 'Recipe Books'],
    EXPERT: ['Hidden Area Maps', 'Tier 3 Spell Scrolls'],
    MASTER: ['Masterwork Spell Books', 'Legendary Maps'],
    GRANDMASTER: ['Legendary Tomes', 'Custom scroll creation'],
  },
};

export const CRAFTING_PROFESSIONS: ProfessionDefinition[] = [
  SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER, LEATHERWORKER, TAILOR,
  ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER, FLETCHER, MASON, SCRIBE,
];
