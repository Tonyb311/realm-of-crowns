// Rebalanced for daily action economy (v2.0)
import { QuestDefinition } from './types';

export const MAIN_QUESTS: QuestDefinition[] = [
  {
    id: 'main-01-awakening',
    name: 'The Awakening',
    type: 'MAIN',
    description: 'You have arrived in the realm of Aethermere. Speak with the town elder to learn about the growing darkness threatening the land.',
    objectives: [
      { type: 'TALK', target: 'Elder Tomas', quantity: 1 },
    ],
    rewards: { xp: 25, gold: 50 },
    levelRequired: 1,
  },
  {
    id: 'main-02-proving-ground',
    name: 'Proving Ground',
    type: 'MAIN',
    description: 'The elder says you must prove your worth. Defeat the creatures threatening the farmlands outside town.',
    objectives: [
      { type: 'KILL', target: 'Goblin', quantity: 2 },
      { type: 'KILL', target: 'Giant Rat', quantity: 2 },
    ],
    rewards: { xp: 40, gold: 80 },
    levelRequired: 1,
    prerequisiteQuestId: 'main-01-awakening',
  },
  {
    id: 'main-03-gathering-supplies',
    name: 'Gathering Supplies',
    type: 'MAIN',
    description: 'The militia needs supplies to prepare for the coming threat. Gather raw materials from the surrounding area.',
    objectives: [
      { type: 'GATHER', target: 'ORE', quantity: 3 },
      { type: 'GATHER', target: 'WOOD', quantity: 3 },
    ],
    rewards: { xp: 45, gold: 100 },
    levelRequired: 2,
    prerequisiteQuestId: 'main-02-proving-ground',
  },
  {
    id: 'main-04-the-road-ahead',
    name: 'The Road Ahead',
    type: 'MAIN',
    description: 'Reports of bandit activity on the trade routes have the merchants worried. Travel to the Crossroads to investigate.',
    objectives: [
      { type: 'VISIT', target: 'Hearthshire', quantity: 1 },
      { type: 'KILL', target: 'Bandit', quantity: 2 },
    ],
    rewards: { xp: 60, gold: 130 },
    levelRequired: 3,
    prerequisiteQuestId: 'main-03-gathering-supplies',
  },
  {
    id: 'main-05-shadows-stir',
    name: 'Shadows Stir',
    type: 'MAIN',
    description: 'The bandits carried orders from the Shadowmere Marshes. Travel to Nethermire to uncover the source of the corruption.',
    objectives: [
      { type: 'VISIT', target: 'Nethermire', quantity: 1 },
      { type: 'KILL', target: 'Skeleton Warrior', quantity: 2 },
    ],
    rewards: { xp: 85, gold: 180 },
    levelRequired: 5,
    prerequisiteQuestId: 'main-04-the-road-ahead',
  },
  {
    id: 'main-06-into-the-depths',
    name: 'Into the Depths',
    type: 'MAIN',
    description: 'The trail leads deep underground. Journey to the Ironvault Mountains and investigate the abandoned mines.',
    objectives: [
      { type: 'VISIT', target: 'Kazad-Vorn', quantity: 1 },
      { type: 'KILL', target: 'Giant Spider', quantity: 3 },
    ],
    rewards: { xp: 120, gold: 280 },
    levelRequired: 7,
    prerequisiteQuestId: 'main-05-shadows-stir',
  },
  {
    id: 'main-07-dragon-rumor',
    name: 'Rumors of Dragonfire',
    type: 'MAIN',
    description: 'Ancient texts speak of a dragon cult gathering in the Frozen Reaches. Travel to Drakenspire and put a stop to their plans.',
    objectives: [
      { type: 'VISIT', target: 'Drakenspire', quantity: 1 },
      { type: 'KILL', target: 'Dire Wolf', quantity: 2 },
      { type: 'KILL', target: 'Young Dragon', quantity: 1 },
    ],
    rewards: { xp: 200, gold: 450 },
    levelRequired: 12,
    prerequisiteQuestId: 'main-06-into-the-depths',
  },
  {
    id: 'main-08-final-stand',
    name: 'The Final Stand',
    type: 'MAIN',
    description: 'The true threat reveals itself. An ancient lich has been orchestrating the chaos from the Ashenmoor. End this once and for all.',
    objectives: [
      { type: 'VISIT', target: 'Ashenmoor', quantity: 1 },
      { type: 'KILL', target: 'Lich', quantity: 1 },
    ],
    rewards: { xp: 250, gold: 600, reputation: 50 },
    levelRequired: 16,
    prerequisiteQuestId: 'main-07-dragon-rumor',
  },

  // ============================================================
  // Extended main story — Act II (levels 20-30)
  // ============================================================
  {
    id: 'main-09-the-sunken-throne',
    name: 'The Sunken Throne',
    type: 'MAIN',
    description: 'The Lich\'s destruction has awakened something far older. Strange tides pull at the Pelagic Depths, and the Merfolk send word of an ancient throne rising from the ocean floor. Investigate the disturbance before it spreads.',
    objectives: [
      { type: 'VISIT', target: 'Coralspire', quantity: 1 },
      { type: 'KILL', target: 'Abyssal Kraken', quantity: 1 },
      { type: 'GATHER', target: 'REAGENT', quantity: 3 },
    ],
    rewards: { xp: 350, gold: 800, reputation: 75 },
    levelRequired: 20,
    prerequisiteQuestId: 'main-08-final-stand',
  },
  {
    id: 'main-10-crown-of-shadows',
    name: 'Crown of Shadows',
    type: 'MAIN',
    description: 'The Drow matriarchs have been unearthing fragments of the Crown of Shadows — an artifact that could unravel the barriers between worlds. Descend into the Underdark and secure the fragments before the ritual is complete.',
    objectives: [
      { type: 'VISIT', target: 'Duskwarden', quantity: 1 },
      { type: 'KILL', target: 'Shadow Weaver', quantity: 2 },
      { type: 'KILL', target: 'Drow Matriarch', quantity: 1 },
    ],
    rewards: { xp: 400, gold: 1000, reputation: 100 },
    levelRequired: 24,
    prerequisiteQuestId: 'main-09-the-sunken-throne',
  },
  {
    id: 'main-11-twilight-of-nations',
    name: 'Twilight of Nations',
    type: 'MAIN',
    description: 'The Crown fragments pulse with power, and the ancient barrier between Aethermere and the Void thins. The kingdoms fracture as each race prepares for what may come. Rally allies from across the realm before the Convergence arrives.',
    objectives: [
      { type: 'VISIT', target: 'Kingshold', quantity: 1 },
      { type: 'VISIT', target: 'Aelindra', quantity: 1 },
      { type: 'KILL', target: 'Void Harbinger', quantity: 2 },
    ],
    rewards: { xp: 500, gold: 1200, reputation: 100 },
    levelRequired: 27,
    prerequisiteQuestId: 'main-10-crown-of-shadows',
  },
  {
    id: 'main-12-dawn-of-eternity',
    name: 'Dawn of Eternity',
    type: 'MAIN',
    description: 'The Convergence has begun. The Void tears open above the Confluence and ancient horrors spill into the world. Lead the combined forces of Aethermere in a final battle to seal the rift and decide the fate of the realm.',
    objectives: [
      { type: 'VISIT', target: 'The Confluence', quantity: 1 },
      { type: 'KILL', target: 'Void Colossus', quantity: 1 },
    ],
    rewards: { xp: 600, gold: 1500, reputation: 200 },
    levelRequired: 30,
    prerequisiteQuestId: 'main-11-twilight-of-nations',
  },
];
