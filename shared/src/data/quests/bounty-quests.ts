// Rebalanced for daily action economy (v2.0)
// Bounty quests: longer cooldowns (2-4 weeks), reduced kill counts
import { QuestDefinition } from './types';

export const BOUNTY_QUESTS: QuestDefinition[] = [
  // ---- Mid-level bounties (5-12) ----
  {
    id: 'bounty-orc-raiders',
    name: 'Bounty: Orc Raiders',
    type: 'BOUNTY',
    description: 'Orc warriors have been spotted raiding the borders. A bounty has been placed on their heads.',
    objectives: [{ type: 'KILL', target: 'Orc Warrior', quantity: 3 }],
    rewards: { xp: 80, gold: 180 },
    levelRequired: 5,
    regionId: 'Ashenfang Wastes',
    isRepeatable: true,
    cooldownHours: 336,
  },
  {
    id: 'bounty-troll-menace',
    name: 'Bounty: Troll Menace',
    type: 'BOUNTY',
    description: 'Trolls in the Shadowmere Marshes are terrorizing travelers. Eliminate them for a handsome reward.',
    objectives: [{ type: 'KILL', target: 'Troll', quantity: 2 }],
    rewards: { xp: 120, gold: 280 },
    levelRequired: 8,
    regionId: 'Shadowmere Marshes',
    isRepeatable: true,
    cooldownHours: 336,
  },
  {
    id: 'bounty-dragon-slayer',
    name: 'Bounty: Dragon Slayer',
    type: 'BOUNTY',
    description: 'A young dragon has been wreaking havoc in the Frozen Reaches. Only the bravest dare attempt this bounty.',
    objectives: [{ type: 'KILL', target: 'Young Dragon', quantity: 1 }],
    rewards: { xp: 200, gold: 500 },
    levelRequired: 12,
    regionId: 'Frozen Reaches',
    isRepeatable: true,
    cooldownHours: 336,
  },

  // ---- High-level bounties (18-30) ----
  {
    id: 'bounty-underdark-purge',
    name: 'Bounty: Underdark Purge',
    type: 'BOUNTY',
    description: 'An infestation of shadow wraiths has been reported in the deep tunnels beneath the Underdark. The Drow matriarchs offer a substantial bounty for their eradication.',
    objectives: [
      { type: 'KILL', target: 'Shadow Wraith', quantity: 3 },
      { type: 'KILL', target: 'Wraith Lord', quantity: 1 },
    ],
    rewards: { xp: 300, gold: 700 },
    levelRequired: 18,
    regionId: 'The Underdark',
    isRepeatable: true,
    cooldownHours: 336,
  },
  {
    id: 'bounty-elemental-surge',
    name: 'Bounty: Elemental Surge',
    type: 'BOUNTY',
    description: 'The Confluence is destabilizing. Rogue elementals threaten to tear reality apart at the seams. Destroy them before they breach the material plane.',
    objectives: [
      { type: 'KILL', target: 'Rogue Elemental', quantity: 3 },
      { type: 'KILL', target: 'Elemental Titan', quantity: 1 },
    ],
    rewards: { xp: 450, gold: 1100 },
    levelRequired: 25,
    regionId: 'The Confluence',
    isRepeatable: true,
    cooldownHours: 672,
  },
  {
    id: 'bounty-void-incursion',
    name: 'Bounty: Void Incursion',
    type: 'BOUNTY',
    description: 'Rifts to the Void are opening across the Ashenmoor. The Revenant councils, who know death better than any, offer their greatest bounty to those who can stem the tide.',
    objectives: [
      { type: 'KILL', target: 'Void Stalker', quantity: 3 },
      { type: 'KILL', target: 'Void Behemoth', quantity: 1 },
    ],
    rewards: { xp: 550, gold: 1400 },
    levelRequired: 30,
    regionId: 'The Ashenmoor',
    isRepeatable: true,
    cooldownHours: 672,
  },
];
