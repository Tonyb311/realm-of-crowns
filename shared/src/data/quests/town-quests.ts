// Rebalanced for daily action economy (v2.0)
import { QuestDefinition } from './types';

export const TOWN_QUESTS: QuestDefinition[] = [
  // ========================================
  // VERDANT HEARTLANDS — Kingshold / Millhaven
  // ========================================
  {
    id: 'town-heartlands-01',
    name: 'Rat Infestation',
    type: 'TOWN',
    description: 'The tavern cellar is overrun with giant rats. Clear them out before the food stores are ruined.',
    objectives: [{ type: 'KILL', target: 'Giant Rat', quantity: 2 }],
    rewards: { xp: 25, gold: 60 },
    levelRequired: 1,
    regionId: 'Verdant Heartlands',
    townId: 'Kingshold',
  },
  {
    id: 'town-heartlands-02',
    name: 'Harvest Protection',
    type: 'TOWN',
    description: 'Wolves have been attacking the farmsteads. Thin out the wolf packs to protect the harvest.',
    objectives: [{ type: 'KILL', target: 'Wolf', quantity: 2 }],
    rewards: { xp: 35, gold: 80 },
    levelRequired: 2,
    regionId: 'Verdant Heartlands',
    townId: 'Kingshold',
  },
  {
    id: 'town-heartlands-03',
    name: "Blacksmith's Request",
    type: 'TOWN',
    description: 'The local blacksmith needs ore for a large order. Gather iron ore from the nearby hills.',
    objectives: [{ type: 'GATHER', target: 'ORE', quantity: 3 }],
    rewards: { xp: 35, gold: 80 },
    levelRequired: 2,
    regionId: 'Verdant Heartlands',
    townId: 'Kingshold',
  },
  {
    id: 'town-heartlands-04',
    name: 'Bandit Highway',
    type: 'TOWN',
    description: 'Bandits are robbing travelers on the road to Bridgewater. Deal with them and make the roads safe again.',
    objectives: [
      { type: 'KILL', target: 'Bandit', quantity: 2 },
      { type: 'VISIT', target: 'Bridgewater', quantity: 1 },
    ],
    rewards: { xp: 50, gold: 120 },
    levelRequired: 3,
    regionId: 'Verdant Heartlands',
    townId: 'Kingshold',
  },
  {
    id: 'town-heartlands-05',
    name: 'Timber for the Mill',
    type: 'TOWN',
    description: 'Millhaven needs lumber for construction. Gather wood and deliver it.',
    objectives: [{ type: 'GATHER', target: 'WOOD', quantity: 3 }],
    rewards: { xp: 25, gold: 60 },
    levelRequired: 1,
    regionId: 'Verdant Heartlands',
    townId: 'Millhaven',
  },

  // ========================================
  // SILVERWOOD FOREST — Aelindra
  // ========================================
  {
    id: 'town-silverwood-01',
    name: 'Wolf Pack Cull',
    type: 'TOWN',
    description: 'The wolves in the old grove are becoming too aggressive. Thin the pack before they threaten Aelindra.',
    objectives: [{ type: 'KILL', target: 'Wolf', quantity: 2 }],
    rewards: { xp: 35, gold: 80 },
    levelRequired: 2,
    regionId: 'Silverwood Forest',
    townId: 'Aelindra',
  },
  {
    id: 'town-silverwood-02',
    name: 'Herbal Remedy',
    type: 'TOWN',
    description: 'A healer in Moonhaven needs rare herbs to craft medicine for the elders. Gather herbs from the forest.',
    objectives: [{ type: 'GATHER', target: 'HERB', quantity: 3 }],
    rewards: { xp: 40, gold: 90 },
    levelRequired: 2,
    regionId: 'Silverwood Forest',
    townId: 'Aelindra',
  },
  {
    id: 'town-silverwood-03',
    name: 'Enchanted Wood',
    type: 'TOWN',
    description: 'The Enchanting Spire requires special lumber. Gather wood for their latest magical project.',
    objectives: [{ type: 'GATHER', target: 'WOOD', quantity: 4 }],
    rewards: { xp: 50, gold: 110 },
    levelRequired: 3,
    regionId: 'Silverwood Forest',
    townId: 'Aelindra',
  },

  // ========================================
  // IRONVAULT MOUNTAINS — Kazad-Vorn
  // ========================================
  {
    id: 'town-ironvault-01',
    name: 'Mine Clearance',
    type: 'TOWN',
    description: 'Giant spiders have infested the lower mine shafts. Clear them so the miners can return to work.',
    objectives: [{ type: 'KILL', target: 'Giant Spider', quantity: 2 }],
    rewards: { xp: 70, gold: 160 },
    levelRequired: 5,
    regionId: 'Ironvault Mountains',
    townId: 'Kazad-Vorn',
  },
  {
    id: 'town-ironvault-02',
    name: 'Ore Requisition',
    type: 'TOWN',
    description: 'The Great Forge of Kazad-Vorn is running low on ore. The forgemaster needs a fresh supply.',
    objectives: [{ type: 'GATHER', target: 'ORE', quantity: 5 }],
    rewards: { xp: 75, gold: 170 },
    levelRequired: 5,
    regionId: 'Ironvault Mountains',
    townId: 'Kazad-Vorn',
  },
  {
    id: 'town-ironvault-03',
    name: 'Stone Guardian',
    type: 'TOWN',
    description: 'An ancient golem has awakened in the deep vaults. It threatens the structural integrity of the mountain halls.',
    objectives: [{ type: 'KILL', target: 'Ancient Golem', quantity: 1 }],
    rewards: { xp: 150, gold: 350 },
    levelRequired: 10,
    regionId: 'Ironvault Mountains',
    townId: 'Kazad-Vorn',
  },

  // ========================================
  // THE CROSSROADS — Hearthshire
  // ========================================
  {
    id: 'town-crossroads-01',
    name: 'Goblin Trouble',
    type: 'TOWN',
    description: 'Goblins are raiding the trade caravans. Put a stop to it.',
    objectives: [{ type: 'KILL', target: 'Goblin', quantity: 3 }],
    rewards: { xp: 25, gold: 60 },
    levelRequired: 1,
    regionId: 'The Crossroads',
    townId: 'Hearthshire',
  },
  {
    id: 'town-crossroads-02',
    name: 'Grain for the Market',
    type: 'TOWN',
    description: 'The Grand Exchange needs more grain. The Harthfolk farmers will pay well for gathered supplies.',
    objectives: [{ type: 'GATHER', target: 'GRAIN', quantity: 3 }],
    rewards: { xp: 30, gold: 70 },
    levelRequired: 1,
    regionId: 'The Crossroads',
    townId: 'Hearthshire',
  },
  {
    id: 'town-crossroads-03',
    name: 'Trade Route Patrol',
    type: 'TOWN',
    description: 'Visit the neighboring towns along the trade route to ensure no threats linger.',
    objectives: [
      { type: 'VISIT', target: 'Greenhollow', quantity: 1 },
      { type: 'VISIT', target: "Peddler's Rest", quantity: 1 },
    ],
    rewards: { xp: 40, gold: 90 },
    levelRequired: 2,
    regionId: 'The Crossroads',
    townId: 'Hearthshire',
  },

  // ========================================
  // THE TWILIGHT MARCH — Half-Elf territory
  // ========================================
  {
    id: 'town-twilight-01',
    name: 'Border Tensions',
    type: 'TOWN',
    description: 'Skirmishers from the Ashenfang Wastes have been probing the border. Drive them back and secure the perimeter.',
    objectives: [
      { type: 'KILL', target: 'Orc Skirmisher', quantity: 3 },
      { type: 'VISIT', target: 'Dawnbridge', quantity: 1 },
    ],
    rewards: { xp: 120, gold: 280 },
    levelRequired: 8,
    regionId: 'The Twilight March',
    townId: 'Dawnbridge',
  },
  {
    id: 'town-twilight-02',
    name: 'Diplomatic Correspondence',
    type: 'TOWN',
    description: 'The Twilight Council needs letters delivered to both Elven and Human settlements. The roads are dangerous — be quick and watchful.',
    objectives: [
      { type: 'VISIT', target: 'Aelindra', quantity: 1 },
      { type: 'VISIT', target: 'Kingshold', quantity: 1 },
    ],
    rewards: { xp: 85, gold: 200 },
    levelRequired: 6,
    regionId: 'The Twilight March',
    townId: 'Dawnbridge',
  },

  // ========================================
  // THE THORNWILDS — Beastfolk territory
  // ========================================
  {
    id: 'town-thornwilds-01',
    name: 'Alpha Challenge',
    type: 'TOWN',
    description: 'A rogue dire beast threatens the clan territories. Track it through the deep wilderness and bring back its hide as proof.',
    objectives: [
      { type: 'KILL', target: 'Dire Beast', quantity: 1 },
      { type: 'GATHER', target: 'HIDE', quantity: 3 },
    ],
    rewards: { xp: 180, gold: 400 },
    levelRequired: 12,
    regionId: 'The Thornwilds',
    townId: 'Fanghollow',
  },

  // ========================================
  // THE UNDERDARK — Drow territory
  // ========================================
  {
    id: 'town-underdark-01',
    name: 'Silk Harvest',
    type: 'TOWN',
    description: 'The spider farms need clearing of wild specimens that have grown too large and hostile. Exterminate them and gather their valuable silk.',
    objectives: [
      { type: 'KILL', target: 'Giant Spider', quantity: 3 },
      { type: 'GATHER', target: 'FIBER', quantity: 4 },
    ],
    rewards: { xp: 350, gold: 800 },
    levelRequired: 20,
    regionId: 'The Underdark',
    townId: 'Duskwarden',
  },

  // ========================================
  // THE PELAGIC DEPTHS — Merfolk territory
  // ========================================
  {
    id: 'town-pelagic-01',
    name: 'Tidal Predators',
    type: 'TOWN',
    description: 'Predatory sea creatures have been drawn to the warm vents near the coral settlements. Clear them before the spawning season.',
    objectives: [
      { type: 'KILL', target: 'Reef Shark', quantity: 2 },
      { type: 'KILL', target: 'Giant Eel', quantity: 2 },
    ],
    rewards: { xp: 150, gold: 350 },
    levelRequired: 10,
    regionId: 'The Pelagic Depths',
    townId: 'Coralspire',
  },

  // ========================================
  // THE SKYSPIRE PEAKS — Goliath territory
  // ========================================
  {
    id: 'town-skyspire-01',
    name: 'Avalanche Clearing',
    type: 'TOWN',
    description: 'A rockslide has blocked the high pass. Clear the debris and deal with the frost giants that have settled in the wreckage.',
    objectives: [
      { type: 'KILL', target: 'Frost Giant', quantity: 2 },
      { type: 'GATHER', target: 'STONE', quantity: 5 },
    ],
    rewards: { xp: 380, gold: 850 },
    levelRequired: 22,
    regionId: 'The Skyspire Peaks',
    townId: 'Summit Hold',
  },
];
