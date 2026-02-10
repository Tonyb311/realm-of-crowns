// Rebalanced for daily action economy (v2.0)
// Guild quests: designed for 3-5 players over 1-2 weeks
import { QuestDefinition } from './types';

export const GUILD_QUESTS: QuestDefinition[] = [
  {
    id: 'guild-01-initiation',
    name: 'Guild Initiation',
    type: 'GUILD',
    description: 'To prove your worth to the guild, defeat a variety of monsters across the realm.',
    objectives: [
      { type: 'KILL', target: 'Goblin', quantity: 5 },
      { type: 'KILL', target: 'Wolf', quantity: 5 },
    ],
    rewards: { xp: 60, gold: 150, reputation: 25 },
    levelRequired: 3,
  },
  {
    id: 'guild-02-resource-drive',
    name: 'Guild Resource Drive',
    type: 'GUILD',
    description: 'The guild treasury needs restocking. Gather a large quantity of raw materials for the guild coffers.',
    objectives: [
      { type: 'GATHER', target: 'ORE', quantity: 8 },
      { type: 'GATHER', target: 'WOOD', quantity: 8 },
      { type: 'GATHER', target: 'HERB', quantity: 5 },
    ],
    rewards: { xp: 80, gold: 200, reputation: 30 },
    levelRequired: 5,
  },
  {
    id: 'guild-03-expedition',
    name: 'Guild Expedition',
    type: 'GUILD',
    description: 'The guild is mapping dangerous territories. Visit key locations and report back.',
    objectives: [
      { type: 'VISIT', target: 'Nethermire', quantity: 1 },
      { type: 'VISIT', target: 'Kazad-Vorn', quantity: 1 },
    ],
    rewards: { xp: 100, gold: 250, reputation: 40 },
    levelRequired: 7,
  },
];
