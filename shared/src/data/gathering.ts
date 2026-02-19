/**
 * Gathering Spot Definitions for Realm of Crowns
 *
 * Defines a unique gathering spot for each of the 68+ towns in Aethermere.
 * Each spot yields one of 8 basic resource items, themed by region and biome.
 *
 * Used by the gathering action system to determine what players can collect
 * via the free gathering action available in every town.
 */

// ============================================================
// INTERFACES
// ============================================================

export interface GatheringItem {
  templateName: string;
  type: 'CONSUMABLE' | 'MATERIAL';
  description: string;
  isFood: boolean;
  shelfLifeDays: number | null;
  foodBuff: { stat: string; value: number } | null;
  baseValue: number;
  icon: string;
}

export interface GatheringSpotDef {
  name: string;
  description: string;
  resourceType: string;
  item: GatheringItem;
  minYield: number;
  maxYield: number;
  gatherMessage: string;
  icon: string;
}

// ============================================================
// 9 GATHERING ITEMS
// ============================================================

export const APPLES: GatheringItem = {
  templateName: 'Apples',
  type: 'CONSUMABLE',
  description: 'Crisp, sweet apples freshly picked from the bough.',
  isFood: true,
  shelfLifeDays: 3,
  foodBuff: { stat: 'constitution', value: 1 },
  baseValue: 3,
  icon: '\uD83C\uDF4E',
};

export const RAW_FISH: GatheringItem = {
  templateName: 'Raw Fish',
  type: 'CONSUMABLE',
  description: 'A glistening catch still slick from the water. Best cooked soon.',
  isFood: true,
  shelfLifeDays: 1,
  foodBuff: null,
  baseValue: 4,
  icon: '\uD83D\uDC1F',
};

export const RIVER_TROUT: GatheringItem = {
  templateName: 'River Trout',
  type: 'MATERIAL',
  description: 'A prized freshwater fish with firm, flavorful flesh. Only skilled fishermen can consistently land these.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 22,
  icon: '\uD83D\uDC1F',
};

export const LAKE_PERCH: GatheringItem = {
  templateName: 'Lake Perch',
  type: 'MATERIAL',
  description: 'A large, meaty lake fish. Its delicate flavor makes it the centerpiece of fine cuisine.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 25,
  icon: '\uD83D\uDC1F',
};

export const WILD_BERRIES: GatheringItem = {
  templateName: 'Wild Berries',
  type: 'CONSUMABLE',
  description: 'A handful of plump, jewel-toned berries bursting with sweetness.',
  isFood: true,
  shelfLifeDays: 2,
  foodBuff: { stat: 'wisdom', value: 1 },
  baseValue: 2,
  icon: '\uD83E\uDED0',
};

export const WILD_HERBS: GatheringItem = {
  templateName: 'Wild Herbs',
  type: 'CONSUMABLE',
  description: 'Fragrant leaves and stems with subtle alchemical potency.',
  isFood: true,
  shelfLifeDays: 5,
  foodBuff: { stat: 'intelligence', value: 1 },
  baseValue: 5,
  icon: '\uD83C\uDF3F',
};

export const IRON_ORE_CHUNKS: GatheringItem = {
  templateName: 'Iron Ore Chunks',
  type: 'MATERIAL',
  description: 'Heavy chunks of raw iron ore veined with rust-colored striations.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 6,
  icon: '\u26CF\uFE0F',
};

export const WOOD_LOGS: GatheringItem = {
  templateName: 'Wood Logs',
  type: 'MATERIAL',
  description: 'Sturdy lengths of timber, freshly felled and fragrant with sap.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 5,
  icon: '\uD83E\uDEB5',
};

export const STONE_BLOCKS: GatheringItem = {
  templateName: 'Stone Blocks',
  type: 'MATERIAL',
  description: 'Rough-hewn blocks of solid stone, ready for the mason or builder.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 7,
  icon: '\uD83E\uDEA8',
};

export const CLAY: GatheringItem = {
  templateName: 'Clay',
  type: 'MATERIAL',
  description: 'Smooth, pliable clay dug from riverbanks or marshes. Useful for pottery and construction.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 4,
  icon: '\uD83C\uDFFA',
};

export const GRAIN: GatheringItem = {
  templateName: 'Grain',
  type: 'CONSUMABLE',
  description: 'Golden stalks of wheat and barley. The foundation of bread and beer.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 3,
  icon: '\uD83C\uDF3E',
};

export const VEGETABLES: GatheringItem = {
  templateName: 'Vegetables',
  type: 'CONSUMABLE',
  description: 'Carrots, onions, and turnips pulled fresh from the earth.',
  isFood: true,
  shelfLifeDays: 4,
  foodBuff: { stat: 'constitution', value: 1 },
  baseValue: 3,
  icon: '\uD83E\uDD55',
};

export const WILD_GAME_MEAT: GatheringItem = {
  templateName: 'Wild Game Meat',
  type: 'MATERIAL',
  description: 'Venison, boar, and rabbit harvested from the wilds. Lean and flavorful.',
  isFood: true,
  shelfLifeDays: 2,
  foodBuff: { stat: 'strength', value: 1 },
  baseValue: 5,
  icon: '\uD83C\uDF56',
};

// --- HUNTER Tiered Gathering Resources ---

export const ANIMAL_PELTS: GatheringItem = {
  templateName: 'Animal Pelts',
  type: 'MATERIAL',
  description: 'Rough animal pelts stripped from hunted game. Essential for leatherworking.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 8,
  icon: '\uD83E\uDDE4',
};

export const WOLF_PELTS: GatheringItem = {
  templateName: 'Wolf Pelts',
  type: 'MATERIAL',
  description: 'Thick, durable pelts from wolves. Their natural toughness makes superior leather for armor.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 28,
  icon: '\uD83D\uDC3A',
};

export const BEAR_HIDES: GatheringItem = {
  templateName: 'Bear Hides',
  type: 'MATERIAL',
  description: 'Massive hides from bears. Incredibly dense and durable — the finest material for heavy leather armor.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 35,
  icon: '\uD83D\uDC3B',
};

// --- FARMER T2 Field Crops (Hops, Grapes) ---

export const HOPS: GatheringItem = {
  templateName: 'Hops',
  type: 'MATERIAL',
  description: 'Aromatic hop flowers, essential for brewing fine beer.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 6,
  icon: '\uD83C\uDF3F',
};

export const GRAPES: GatheringItem = {
  templateName: 'Grapes',
  type: 'MATERIAL',
  description: 'Plump, juicy grapes, ready to be pressed into wine.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 6,
  icon: '\uD83C\uDF47',
};

// --- FARMER T2 Cotton Field ---

export const COTTON: GatheringItem = {
  templateName: 'Cotton',
  type: 'MATERIAL',
  description: 'Fluffy cotton bolls harvested from cultivated fields. Essential for spinning cloth.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 4,
  icon: '☁️',
};

// --- MINER T2/T3 Private Assets (Coal, Silver Ore) ---

export const COAL: GatheringItem = {
  templateName: 'Coal',
  type: 'MATERIAL',
  description: 'Dense black lumite fuel, essential for smelting steel and forging advanced metalwork.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 12,
  icon: '\u26AB',
};

export const SILVER_ORE: GatheringItem = {
  templateName: 'Silver Ore',
  type: 'MATERIAL',
  description: 'Lustrous silver-veined rock prized by blacksmiths and jewelers alike.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 30,
  icon: '\uD83E\uDEA8',
};

// --- LUMBERJACK T2 Private Asset (Hardwood) ---

export const HARDWOOD: GatheringItem = {
  templateName: 'Hardwood',
  type: 'MATERIAL',
  description: 'Dense, slow-grown timber from old-growth trees. Superior for tool handles and shields.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 25,
  icon: '\uD83E\uDEB5',
};

// --- HERBALIST T3 Resources (L7+ at herb spots) ---

export const MEDICINAL_HERBS: GatheringItem = {
  templateName: 'Medicinal Herbs',
  type: 'MATERIAL',
  description: 'Potent herbs with proven healing properties, identifiable only by skilled herbalists.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 28,
  icon: '\uD83C\uDF3F',
};

export const GLOWCAP_MUSHROOMS: GatheringItem = {
  templateName: 'Glowcap Mushrooms',
  type: 'MATERIAL',
  description: 'Luminescent fungi found in shaded groves, prized by alchemists for their arcane reagent properties.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 32,
  icon: '\uD83C\uDF44',
};

// --- RANCHER Livestock Products ---

export const EGGS: GatheringItem = {
  templateName: 'Eggs',
  type: 'CONSUMABLE',
  description: 'Fresh eggs collected from the chicken coop. Essential for cooking.',
  isFood: true,
  shelfLifeDays: 3,
  foodBuff: { stat: 'constitution', value: 1 },
  baseValue: 8,
  icon: '\uD83E\uDD5A',
};

export const MILK: GatheringItem = {
  templateName: 'Milk',
  type: 'CONSUMABLE',
  description: 'Rich, creamy milk from well-tended dairy cows. Prized by cooks and brewers.',
  isFood: true,
  shelfLifeDays: 2,
  foodBuff: { stat: 'constitution', value: 1 },
  baseValue: 12,
  icon: '\uD83E\uDD5B',
};

export const WOOL_ITEM: GatheringItem = {
  templateName: 'Wool',
  type: 'MATERIAL',
  description: 'Soft fleece sheared from healthy sheep. Used by tailors and weavers.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 15,
  icon: '\uD83E\uDDF6',
};

export const FINE_WOOL: GatheringItem = {
  templateName: 'Fine Wool',
  type: 'MATERIAL',
  description: 'Exceptionally soft, high-grade wool from carefully bred sheep. The foundation of luxury garments.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 30,
  icon: '\uD83E\uDDF6',
};

export const SILKWORM_COCOONS: GatheringItem = {
  templateName: 'Silkworm Cocoons',
  type: 'MATERIAL',
  description: 'Delicate cocoons spun by silkworms raised alongside livestock. Their threads produce fabric of extraordinary quality.',
  isFood: false,
  shelfLifeDays: null,
  foodBuff: null,
  baseValue: 38,
  icon: '\uD83D\uDC1B',
};

// ============================================================
// RESOURCE TYPE -> ITEM + ICON MAPPING
// ============================================================

export const RESOURCE_MAP: Record<string, { item: GatheringItem; icon: string }> = {
  // Public gathering spots
  orchard:         { item: APPLES,          icon: '\uD83C\uDF3E' },
  fishing:         { item: RAW_FISH,        icon: '\uD83C\uDFA3' },
  herb:            { item: WILD_HERBS,      icon: '\uD83C\uDF3F' },
  mine:            { item: IRON_ORE_CHUNKS, icon: '\u26CF\uFE0F' },
  forest:          { item: WOOD_LOGS,       icon: '\uD83C\uDF32' },
  quarry:          { item: STONE_BLOCKS,    icon: '\u26F0\uFE0F' },
  clay:            { item: CLAY,            icon: '\uD83C\uDFFA' },
  hunting_ground:  { item: WILD_GAME_MEAT,  icon: '\uD83C\uDF56' },
  // FARMER private fields only (no public spots use these)
  grain_field:     { item: GRAIN,           icon: '\uD83C\uDF3E' },
  vegetable_patch: { item: VEGETABLES,      icon: '\uD83E\uDD55' },
  berry:           { item: WILD_BERRIES,    icon: '\uD83C\uDF53' },
  // FARMER T2 private fields
  hop_field:       { item: HOPS,            icon: '\uD83C\uDF3F' },
  vineyard:        { item: GRAPES,          icon: '\uD83C\uDF47' },
  cotton_field:    { item: COTTON,          icon: '☁️' },
  // MINER T2/T3 private assets
  coal_mine:       { item: COAL,            icon: '\u26AB' },
  silver_mine:     { item: SILVER_ORE,      icon: '\uD83E\uDEA8' },
  // LUMBERJACK T2 private asset
  hardwood_grove:  { item: HARDWOOD,        icon: '\uD83E\uDEB5' },
  // RANCHER buildings (asset-based, not public spots)
  chicken_coop:    { item: EGGS,            icon: '\uD83D\uDC14' },
  dairy_barn:      { item: MILK,            icon: '\uD83D\uDC04' },
  sheep_pen:       { item: WOOL_ITEM,       icon: '\uD83D\uDC11' },
  // RANCHER T3 Craftsman building (no livestock — auto-produces)
  silkworm_house:  { item: SILKWORM_COCOONS, icon: '\uD83D\uDC1B' },
};

/**
 * Maps gathering spot resourceType to the profession that qualifies for the XP bonus.
 * Used by daily tick to award +5 XP if the character has the matching profession.
 */
export const GATHER_SPOT_PROFESSION_MAP: Record<string, string> = {
  orchard:         'FARMER',
  fishing:         'FISHERMAN',
  herb:            'HERBALIST',
  mine:            'MINER',
  forest:          'LUMBERJACK',
  quarry:          'MINER',
  clay:            'MINER',
  hunting_ground:  'HUNTER',
  // FARMER T2 private fields
  hop_field:       'FARMER',
  vineyard:        'FARMER',
  cotton_field:    'FARMER',
  // MINER T2/T3 private assets
  coal_mine:       'MINER',
  silver_mine:     'MINER',
  // LUMBERJACK T2 private asset
  hardwood_grove:  'LUMBERJACK',
  // RANCHER buildings
  chicken_coop:    'RANCHER',
  dairy_barn:      'RANCHER',
  sheep_pen:       'RANCHER',
};

// ============================================================
// HELPER TO BUILD SPOT DEFINITIONS
// ============================================================

function spot(
  name: string,
  description: string,
  resourceType: string,
  gatherMessage: string,
): GatheringSpotDef {
  const mapping = RESOURCE_MAP[resourceType];
  if (!mapping) {
    throw new Error(`Unknown resourceType: ${resourceType}`);
  }
  return {
    name,
    description,
    resourceType,
    item: mapping.item,
    minYield: 1,
    maxYield: 3,
    gatherMessage,
    icon: mapping.icon,
  };
}

// ============================================================
// TOWN GATHERING SPOTS (68 towns + 1 Changeling hub)
// ============================================================

export const TOWN_GATHERING_SPOTS: Record<string, GatheringSpotDef> = {
  // --------------------------------------------------------
  // VERDANT HEARTLANDS (Human) — Plains/Hills
  // --------------------------------------------------------
  'Kingshold': spot(
    'Royal Apple Orchard',
    'Ancient apple trees line the gentle slopes below the castle walls, their boughs heavy with fruit blessed by generations of careful tending.',
    'orchard',
    'You fill your satchel with crisp apples from the ancient trees, their sweet scent lingering on your fingers.',
  ),
  'Millhaven': spot(
    'Millhaven Millpond Orchard',
    'Ancient apple trees line the gentle slopes beside the millpond, their boughs heavy with fruit nourished by the rich valley soil.',
    'orchard',
    'You pick apples from the trees beside the millpond, the splash of the waterwheel a soothing rhythm as you fill your satchel.',
  ),
  'Bridgewater': spot(
    'Bridgewater Fishing Pier',
    'A weathered pier juts into the river confluence where two great waterways meet, making the currents rich with fish.',
    'fishing',
    'You cast your line from the old pier and haul in a fine catch, river water dripping in silver threads.',
  ),
  'Ironford': spot(
    'Ironford Open Pit',
    'A shallow mine at the edge of town where iron veins break through the hillside, accessible to anyone willing to swing a pickaxe.',
    'mine',
    'You chip away at the exposed iron seam, prying loose heavy chunks of raw ore that clang into your bucket.',
  ),
  'Whitefield': spot(
    'Whitefield Chalk Hill Orchard',
    'Rows of apple trees climb the chalk-white hillside, their fruit crisp and sweet from the mineral-rich soil.',
    'orchard',
    'You twist apples from the chalk hill trees, their skin flushed red against the pale earth below.',
  ),

  // --------------------------------------------------------
  // SILVERWOOD FOREST (Elf) — Ancient Forest
  // --------------------------------------------------------
  'Aelindra': spot(
    'The Whispering Herb Gardens',
    'Terraced gardens spiral around the roots of the Great Library Tree, where rare herbs grow under the dappled canopy light.',
    'herb',
    'You kneel among the whispering herbs and carefully harvest fragrant leaves still glistening with morning dew.',
  ),
  'Moonhaven': spot(
    'Moonlit Glade of Remedies',
    'In a silver clearing where moonlight pools even at midday, the elves cultivate herbs of extraordinary potency.',
    'herb',
    'You gather herbs from the moonlit glade, their leaves shimmering faintly with an otherworldly luminescence.',
  ),
  'Thornwatch': spot(
    'Thornwatch Timber Stand',
    'A managed grove of towering ironwood trees at the forest edge, where fallen limbs and sanctioned timber may be harvested.',
    'forest',
    'You haul away sturdy logs from the timber stand, the ironwood heavy with the forest\'s ancient strength.',
  ),
  'Willowmere': spot(
    'Willowmere Weeping Woods',
    'An enchanted copse of silver willows whose trailing branches dip into still, mirror-dark waters. Their wood is prized by artisans.',
    'forest',
    'You gather lengths of silvery willow wood, each piece smooth and fragrant with the scent of water and starlight.',
  ),
  'Eldergrove': spot(
    'The Elder Timber Hollow',
    'The heart of Silverwood, where ancient trees shed massive branches naturally. The elves permit careful gathering of these gifts.',
    'forest',
    'You collect a bounty of elderwood logs from the forest floor, their grain so tight they ring like bells when struck.',
  ),

  // --------------------------------------------------------
  // IRONVAULT MOUNTAINS (Dwarf) — Mountain
  // --------------------------------------------------------
  'Kazad-Vorn': spot(
    'The Public Delving',
    'A vast public mine shaft where any citizen may dig, its walls glittering with iron and the echoes of a thousand hammers.',
    'mine',
    'You descend into the Public Delving and hack at the glittering walls until your pack is heavy with raw ore.',
  ),
  'Deepvein': spot(
    'The Fissure Mines',
    'Deep natural fissures in the mountain expose rich iron deposits, their dark mouths breathing cold mineral air.',
    'mine',
    'You squeeze into the fissure and chip away at the exposed veins, the ring of metal on stone echoing endlessly.',
  ),
  'Hammerfall': spot(
    'Hammerfall Stone Quarry',
    'A terraced quarry carved into the mountainside, where blocks of granite and basalt are cut with dwarven precision.',
    'quarry',
    'You lever out a clean block of mountain stone, the quarry dust settling on your shoulders like grey snow.',
  ),
  'Gemhollow': spot(
    'Gemhollow Crystal Quarry',
    'A quarry renowned for its veins of quartz and feldspar, where the stone itself sparkles under torchlight.',
    'quarry',
    'You pry loose blocks of crystalline stone from the quarry wall, each one catching the torchlight in dazzling facets.',
  ),
  'Alehearth': spot(
    'Alehearth Mountain Game Trails',
    'Narrow trails wind through the crags above Alehearth where mountain goats, hares, and wild boar roam between the rocky outcrops.',
    'hunting_ground',
    'You track game through the mountain crags above Alehearth, returning with fresh venison slung over your shoulder.',
  ),

  // --------------------------------------------------------
  // THE CROSSROADS (Halfling) — Hills
  // --------------------------------------------------------
  'Hearthshire': spot(
    'Old Mother Thornberry\'s Orchard',
    'A beloved community orchard tended by generations of halfling families, where the trees grow low enough for even the smallest hands.',
    'orchard',
    'You reach up on tiptoes and twist a perfect apple free from Old Mother Thornberry\'s finest tree.',
  ),
  'Greenhollow': spot(
    'Greenhollow Rolling Orchard',
    'Apple trees dot the rolling green hills, tended by generations of halfling families who keep the boughs low and heavy with fruit.',
    'orchard',
    'You wander between the low-branched apple trees on the rolling hills, filling your basket with ease.',
  ),
  "Peddler's Rest": spot(
    'Peddler\'s Roadside Orchard',
    'A cheerful orchard flanking the trade road, where halfling families sell apples to passing merchants and travelers.',
    'orchard',
    'You pick apples from the roadside orchard while carts rattle past, the scent of blossoms mixing with dust.',
  ),
  'Bramblewood': spot(
    'Bramblewood Coppice',
    'A managed woodland where halflings harvest timber from fast-growing coppiced trees, always replanting what they take.',
    'forest',
    'You select a sturdy coppiced trunk and saw through it cleanly, adding another fine log to your growing pile.',
  ),
  'Riverside': spot(
    'Riverside Lazy Bend',
    'A calm, wide bend in the river where fish gather in the shade of overhanging willows. A halfling\'s dream fishing spot.',
    'fishing',
    'You dangle your feet off the bank and wait patiently until a fine fish tugs your line at the lazy bend.',
  ),

  // --------------------------------------------------------
  // ASHENFANG WASTES (Orc) — Badlands
  // --------------------------------------------------------
  'Grakthar': spot(
    'The Skull Quarry',
    'A brutal open quarry where orc workers hack obsidian and basalt from the volcanic badlands under a red sky.',
    'quarry',
    'You swing your pick into the blackened rock face and wrench free jagged blocks of volcanic stone.',
  ),
  'Bonepile': spot(
    'Bonepile Ridge Quarry',
    'A wind-scoured ridgeline where ancient lava flows hardened into layers of useful building stone, named for the fossils within.',
    'quarry',
    'You crack apart layers of hardened lava rock, each slab revealing the ghostly imprints of creatures long dead.',
  ),
  'Ironfist Hold': spot(
    'Ironfist Bloodstone Mine',
    'A mine carved into rust-red cliffs, where iron ore is stained crimson by the mineral-rich volcanic soil.',
    'mine',
    'You descend into the crimson tunnels and pry loose chunks of bloodstone-red iron ore from the sweltering walls.',
  ),
  'Thornback Camp': spot(
    'Thornback Clay Pits',
    'Shallow pits of reddish clay exposed by seasonal floods, thick and pliable, used by orc artisans for crude but sturdy pottery.',
    'clay',
    'You squat at the clay pits and scoop out handfuls of rich red clay, kneading it into workable lumps.',
  ),
  'Ashen Market': spot(
    'Ashen Mudflats',
    'Broad, cracked mudflats beyond the market where volcanic ash has mixed with clay over centuries, creating a uniquely fire-resistant material.',
    'clay',
    'You dig into the ash-grey mudflats, pulling up dense clay that smells of sulfur and ancient fire.',
  ),

  // --------------------------------------------------------
  // SHADOWMERE MARSHES (Tiefling) — Swamp
  // --------------------------------------------------------
  'Nethermire': spot(
    'Nethermire Witch-Herb Bog',
    'A murky bog thick with luminous fungi and rare herbs that grow only where the veil between worlds is thin.',
    'herb',
    'You wade into the glowing bog and pluck herbs that pulse faintly with infernal warmth between your fingers.',
  ),
  'Boghollow': spot(
    'Boghollow Fungal Gardens',
    'Cultivated beds of rare marsh herbs and medicinal mushrooms tended by Nethkin herbalists in the hollow of an ancient peat mound.',
    'herb',
    'You harvest herbs from the damp fungal gardens, their pungent aroma cutting through the pervasive marsh fog.',
  ),
  'Mistwatch': spot(
    'Mistwatch Vapour Fields',
    'Herb beds planted among natural hot springs, where mineral-rich steam infuses the plants with uncommon properties.',
    'herb',
    'You gather steaming herbs from the vapour fields, their leaves warm to the touch and fragrant with mineral essence.',
  ),
  'Cinderkeep': spot(
    'Cinderkeep Slag Mine',
    'An old mine beneath the keep where veins of iron run through layers of volcanic slag and hardened brimstone.',
    'mine',
    'You chip through layers of sulphurous slag to reach the iron veins beneath, each strike releasing a plume of acrid dust.',
  ),
  'Whispering Docks': spot(
    'The Whispering Shallows',
    'Eerie, fog-shrouded fishing waters where strange, eyeless fish swim in slow circles and the reeds whisper secrets.',
    'fishing',
    'You pull a pale, wriggling catch from the whispering shallows, trying not to listen too closely to the reeds.',
  ),

  // --------------------------------------------------------
  // FROZEN REACHES (Dragonborn) — Tundra
  // --------------------------------------------------------
  'Drakenspire': spot(
    'Drakenspire Frost Mine',
    'A mine bored into the heart of a frozen peak, where iron ore is entombed in permafrost and must be chipped free with heated picks.',
    'mine',
    'You heat your pick over a brazier and strike the permafrost, freeing chunks of ice-encrusted iron ore.',
  ),
  'Frostfang': spot(
    'Frostfang Frozen Hunting Grounds',
    'Icy tundra where arctic foxes, snow hares, and woolly elk roam between glacial ridges under pale skies.',
    'hunting_ground',
    'You stalk game across the frozen tundra, your breath crystallizing as you bring down a snow hare in the drifts.',
  ),
  'Emberpeak': spot(
    'Emberpeak Volcanic Seam',
    'Where fire meets ice, a volcanic vent exposes rich iron deposits heated by the earth\'s own forge.',
    'mine',
    'You work the volcanic seam where ore glows faintly with geothermal heat, each chunk warm in your gloved hands.',
  ),
  'Scalehaven': spot(
    'Scalehaven Ice Fishing Holes',
    'Bore holes cut through thick glacial ice, where Drakonid fishers pull enormous cold-water fish from the depths below.',
    'fishing',
    'You peer into the dark ice hole and haul up a thrashing fish, its scales flashing silver in the pale arctic light.',
  ),
  'Wyrmrest': spot(
    'Wyrmrest Dragon-Tooth Quarry',
    'A quarry of petrified dragonbone and basalt where the stone itself seems to hum with ancient draconic resonance.',
    'quarry',
    'You quarry blocks of resonant stone from the dragon-tooth formation, the rock vibrating faintly beneath your tools.',
  ),

  // --------------------------------------------------------
  // THE SUNCOAST (Free Cities) — Coastal
  // --------------------------------------------------------
  'Porto Sole': spot(
    'Porto Sole Grand Fishing Wharf',
    'The busiest wharf on the Suncoast, where fishing boats jostle for berths and the air is thick with salt spray and commerce.',
    'fishing',
    'You secure a spot on the crowded wharf and cast your line into the busy harbour, reeling in a fine catch.',
  ),
  'Coral Bay': spot(
    'Coral Bay Tide Pools',
    'Shallow tide pools teeming with colourful fish trapped by the retreating tide, easy pickings for patient gatherers.',
    'fishing',
    'You wade into the warm tide pools and scoop up darting fish, their scales flashing coral pink and turquoise.',
  ),
  'Sandrift': spot(
    'Sandrift Dune Shore Fishery',
    'Sheltered tidal pools and sandy shallows behind the dunes, where flounder and crabs gather as the tide recedes.',
    'fishing',
    'You wade into the warm shallows behind the dunes and scoop up darting fish trapped by the retreating tide.',
  ),
  'Libertad': spot(
    'Libertad River Clay Banks',
    'Rich deposits of river clay along the estuary, prized by potters and builders throughout the Free Cities.',
    'clay',
    'You dig smooth clay from the riverbank, its cool weight yielding easily to your hands as gulls wheel overhead.',
  ),
  "Beacon's End": spot(
    'Beacon\'s End Lighthouse Jetty',
    'A stone jetty beneath the great lighthouse where the deep-water currents bring large ocean fish within casting range.',
    'fishing',
    'You brace against the lighthouse jetty and battle a powerful ocean fish to the surface, spray soaking your cloak.',
  ),

  // --------------------------------------------------------
  // TWILIGHT MARCH (Half-Elf) — Forest/Border
  // --------------------------------------------------------
  'Dawnmere': spot(
    'Dawnmere Sunrise Orchard',
    'An orchard planted where the first light of dawn strikes the forest edge, its fruit renowned for golden sweetness.',
    'orchard',
    'You pick sun-warmed apples from the Sunrise Orchard as golden light streams through the branches.',
  ),
  'Twinvale': spot(
    'Twinvale Twin-Tree Orchard',
    'A unique orchard where each tree has been grafted into pairs, a half-elven technique that doubles the yield.',
    'orchard',
    'You twist apples from the paired branches of the twin-trees, marveling at the half-elven grafting artistry.',
  ),
  'Harmony Point': spot(
    'Harmony Point Borderland Wilds',
    'Dense woodlands along the old border where deer, pheasants, and wild boar thrive in the unclaimed no-man\'s land between territories.',
    'hunting_ground',
    'You track game through the borderland wilds, flushing pheasants and deer from the dense undergrowth.',
  ),

  // --------------------------------------------------------
  // SCARRED FRONTIER (Half-Orc) — Badlands/Border
  // --------------------------------------------------------
  'Scarwatch': spot(
    'Scarwatch Rubble Quarry',
    'A quarry built in the ruins of an old battlefield, where shattered fortifications yield useful stone to those willing to dig.',
    'quarry',
    'You heave blocks of battle-scarred stone from the rubble quarry, each one bearing the marks of ancient conflict.',
  ),
  'Tuskbridge': spot(
    'Tuskbridge River Fork',
    'A wild river fork beneath the great tusked bridge, where catfish and pike grow fat in the turbulent eddies.',
    'fishing',
    'You cast your line into the roaring fork beneath the bridge and wrestle a thick catfish to the bank.',
  ),
  'Proving Grounds': spot(
    'Proving Grounds War-Stone Quarry',
    'A quarry where aspiring warriors cut stone to build their own shelters, the labour itself considered part of their trials.',
    'quarry',
    'You cut stone from the war-quarry until your arms burn, earning both building material and the respect of onlookers.',
  ),

  // --------------------------------------------------------
  // COGSWORTH WARRENS (Gnome) — Underground/Hills
  // --------------------------------------------------------
  'Cogsworth': spot(
    'Cogsworth Tinker\'s Clay Pit',
    'A pit of fine-grained clay used by gnome engineers for moulds, seals, and the mysterious art of clockwork casting.',
    'clay',
    'You scoop out handfuls of perfectly smooth clay from the Tinker\'s Pit, ideal for precision moulding.',
  ),
  'Sparkhollow': spot(
    'Sparkhollow Crystal Mine',
    'A mine rich in iron and quartz crystals, its tunnels lit by natural phosphorescence and the occasional gnomish contraption.',
    'mine',
    'You mine ore from the phosphorescent tunnels of Sparkhollow, the crystals lighting your way with an eerie glow.',
  ),
  'Fumblewick': spot(
    'Fumblewick Herb Laboratory Overflow',
    'A patch of wild herbs that escaped from an alchemist\'s laboratory and now flourishes in spectacular, uncontrolled abundance.',
    'herb',
    'You harvest armfuls of wildly overgrown herbs from the laboratory overflow, each variety more pungent than the last.',
  ),

  // --------------------------------------------------------
  // PELAGIC DEPTHS (Merfolk) — Underwater/Coastal
  // --------------------------------------------------------
  'Coralspire': spot(
    'Coralspire Kelp Forest Fishery',
    'A vast underwater kelp forest where bioluminescent fish drift in lazy schools among the towering fronds.',
    'fishing',
    'You glide through the kelp forest and snare shimmering fish, their scales glowing softly in the deep water.',
  ),
  'Shallows End': spot(
    'Shallows End Reef Nets',
    'Woven nets strung between coral formations trap fish as the tides shift, a Merfolk technique perfected over millennia.',
    'fishing',
    'You check the reef nets and find them heavy with a fine catch, the coral humming with the rhythm of the sea.',
  ),
  'Abyssal Reach': spot(
    'Abyssal Reach Deep Trenches',
    'The darkest fishing waters in Aethermere, where blind, ancient fish rise from trenches that plunge beyond all light.',
    'fishing',
    'You descend into the crushing dark and haul up a pale, eyeless fish from the abyss, its flesh dense and rich.',
  ),

  // --------------------------------------------------------
  // THORNWILDS (Beastfolk) — Dense Wilderness
  // --------------------------------------------------------
  'Thornden': spot(
    'Thornden Primal Woodland',
    'An untamed forest of massive, moss-draped trees where Beastfolk hunters mark the best timber with claw signs.',
    'forest',
    'You follow the claw marks to a fallen giant and saw off lengths of primal timber, thick with sap and strength.',
  ),
  'Clawridge': spot(
    'Clawridge Canopy Timber',
    'Towering trees along a rocky ridge where Beastfolk harvest wind-hardened wood prized for its resilience.',
    'forest',
    'You scale the ridge and fell a wind-hardened tree, its wood dense and tough from a lifetime battling gales.',
  ),
  'Windrun': spot(
    'Windrun Prairie Orchard',
    'Windswept fruit trees growing on the open prairie, their gnarled trunks shaped by constant breeze into twisting forms.',
    'orchard',
    'You brace against the wind and pluck firm apples from the gnarled prairie trees, the grass rippling around you.',
  ),

  // --------------------------------------------------------
  // GLIMMERVEIL (Faefolk) — Feywild/Enchanted
  // --------------------------------------------------------
  'Glimmerheart': spot(
    'Glimmerheart Starbloom Meadow',
    'A meadow of luminous herbs that bloom only when the stars align, tended by Faefolk who sing them into flowering.',
    'herb',
    'You sing softly as the starbloom herbs unfurl at your touch, their petals releasing a perfume of pure magic.',
  ),
  'Dewdrop Hollow': spot(
    'Dewdrop Hollow Singing Woods',
    'Trees whose trunks resonate with fey music, their timber imbued with echoes of ancient songs and wild magic.',
    'forest',
    'You harvest singing timber from the hollow, each log humming a faint, haunting melody as you carry it away.',
  ),
  'Moonpetal Grove': spot(
    'Moonpetal Grove Silver Herb Circle',
    'A ring of silver-leafed herbs growing around an ancient moonstone, their potency waxing and waning with the lunar cycle.',
    'herb',
    'You harvest moonpetal herbs from the silver circle, their leaves cool as moonlight against your palm.',
  ),

  // --------------------------------------------------------
  // SKYPEAK PLATEAUS (Goliath) — High Mountain
  // --------------------------------------------------------
  'Skyhold': spot(
    'Skyhold Summit Mine',
    'The highest mine in Aethermere, where iron ore is laced with sky-metal and the air is thin enough to make lesser folk dizzy.',
    'mine',
    'You swing your pick at dizzying altitude, the thin air burning in your lungs as sky-laced ore clatters into your pack.',
  ),
  'Windbreak': spot(
    'Windbreak Cliff-Face Quarry',
    'A quarry cut into sheer cliff faces battered by eternal winds, where only Goliath strength can work the stone.',
    'quarry',
    'You brace against the screaming wind and pry enormous stone blocks from the cliff face with raw, Goliath might.',
  ),

  // --------------------------------------------------------
  // VEL'NARIS UNDERDARK (Drow) — Underground
  // --------------------------------------------------------
  "Vel'Naris": spot(
    'Vel\'Naris Obsidian Mine',
    'A mine of gleaming black obsidian and deep iron, its tunnels lit by caged bioluminescent spiders spinning webs of cold light.',
    'mine',
    'You chip away at the obsidian walls, your pick strikes sending sparks that dance among the spider-lit tunnels.',
  ),
  'Gloom Market': spot(
    'Gloom Market Shadow-Herb Cellars',
    'Underground cellars where Drow cultivate pale, eyeless herbs in absolute darkness, their flavour sharp and otherworldly.',
    'herb',
    'You harvest blind herbs from the shadow cellars, their pale tendrils groping weakly in the utter darkness.',
  ),

  // --------------------------------------------------------
  // MISTWOOD GLENS (Firbolg) — Deep Forest
  // --------------------------------------------------------
  'Misthaven': spot(
    'Misthaven Spirit-Root Gardens',
    'Sheltered herb gardens where Firbolg druids grow plants said to be tended by forest spirits in the dead of night.',
    'herb',
    'You gather spirit-touched herbs from the misty gardens, whispering thanks to the unseen caretakers among the roots.',
  ),
  'Rootholme': spot(
    'Rootholme Ancient Coppice',
    'A grove of impossibly old trees that the Firbolg harvest with reverent care, taking only what the forest offers willingly.',
    'forest',
    'You accept the forest\'s gift of fallen timber from the ancient coppice, each log warm as a living thing.',
  ),

  // --------------------------------------------------------
  // THE FOUNDRY (Warforged) — Industrial
  // --------------------------------------------------------
  'The Foundry': spot(
    'The Foundry Scrap Mine',
    'A mine beneath the great Foundry where raw iron is extracted alongside fragments of ancient, pre-Cataclysm machinery.',
    'mine',
    'You mine ore from the Foundry depths, occasionally uncovering fragments of mysterious ancient mechanisms alongside the iron.',
  ),

  // --------------------------------------------------------
  // THE CONFLUENCE (Genasi) — Elemental
  // --------------------------------------------------------
  'The Confluence': spot(
    'Confluence Elemental Clay Beds',
    'Clay beds where all four elements converge, imbuing the earth with subtle elemental resonance valued by Genasi artisans.',
    'clay',
    'You dig elemental clay from the convergence point, the material shifting colour faintly as you shape it in your hands.',
  ),
  'Emberheart': spot(
    'Emberheart Magma-Vein Mine',
    'A mine where iron ore runs through veins of cooled magma, the stone still radiating warmth from the fire below.',
    'mine',
    'You mine ore from the magma veins, the rock warm to the touch and the air shimmering with residual heat.',
  ),

  // --------------------------------------------------------
  // ASHENMOOR (Revenant) — Deathlands
  // --------------------------------------------------------
  'Ashenmoor': spot(
    'Ashenmoor Grave-Herb Fields',
    'Eerie herb fields growing in the ashen soil of old battlegrounds, nourished by the restless dead that walk these lands.',
    'herb',
    'You harvest pale herbs from the grave-fields, their roots tangled in soil that whispers with half-remembered voices.',
  ),

  // --------------------------------------------------------
  // THE CROSSWINDS INN (Changeling) — Neutral Hub
  // --------------------------------------------------------
  'The Crosswinds Inn': spot(
    'Crosswinds Roadside Game Trail',
    'A well-worn game trail through scrubland near the inn, where rabbits and quail are drawn to scraps left by travelers.',
    'hunting_ground',
    'You set snares along the game trail near the inn, returning with wild rabbit and quail before the next caravan arrives.',
  ),
};

// ============================================================
// LOOKUP FUNCTION
// ============================================================

// Pre-build a case-insensitive map for fast lookup
const _spotsByLowerName = new Map<string, GatheringSpotDef>();
for (const [townName, spotDef] of Object.entries(TOWN_GATHERING_SPOTS)) {
  _spotsByLowerName.set(townName.toLowerCase(), spotDef);
}

/**
 * Look up the gathering spot for a town by name (case-insensitive).
 * Returns null if no gathering spot is defined for the given town.
 */
export function getGatheringSpot(townName: string): GatheringSpotDef | null {
  return _spotsByLowerName.get(townName.toLowerCase()) ?? null;
}
