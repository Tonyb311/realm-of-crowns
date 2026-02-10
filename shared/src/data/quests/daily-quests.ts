// Rebalanced for daily action economy (v2.0)
// Renamed from "Daily Quests" to "Recurring Quests" — cooldowns 72h (3-day) or 168h (weekly)
import { QuestDefinition } from './types';

export const DAILY_QUESTS: QuestDefinition[] = [
  // ---- Tier 1: Available from level 1 (72h cooldown) ----
  {
    id: 'daily-hunt',
    name: 'Recurring Hunt',
    type: 'DAILY',
    description: 'The militia needs fresh kills for supplies. Defeat any 2 monsters.',
    objectives: [{ type: 'KILL', target: '*', quantity: 2 }],
    rewards: { xp: 30, gold: 60 },
    levelRequired: 1,
    isRepeatable: true,
    cooldownHours: 72,
  },
  {
    id: 'daily-gather',
    name: 'Recurring Gathering',
    type: 'DAILY',
    description: 'The town stockpile is always in need. Gather any 3 resources.',
    objectives: [{ type: 'GATHER', target: '*', quantity: 3 }],
    rewards: { xp: 25, gold: 50 },
    levelRequired: 1,
    isRepeatable: true,
    cooldownHours: 72,
  },
  {
    id: 'daily-patrol',
    name: 'Recurring Patrol',
    type: 'DAILY',
    description: 'Keep the roads safe. Visit a neighboring town.',
    objectives: [{ type: 'VISIT', target: '*', quantity: 1 }],
    rewards: { xp: 20, gold: 45 },
    levelRequired: 1,
    isRepeatable: true,
    cooldownHours: 72,
  },

  // ---- Tier 2: Available from level 5 (72h cooldown) ----
  {
    id: 'daily-slayer',
    name: 'Recurring Slayer',
    type: 'DAILY',
    description: 'Prove your combat prowess. Defeat 3 monsters.',
    objectives: [{ type: 'KILL', target: '*', quantity: 3 }],
    rewards: { xp: 55, gold: 120 },
    levelRequired: 5,
    isRepeatable: true,
    cooldownHours: 72,
  },
  {
    id: 'daily-prospector',
    name: 'Recurring Prospector',
    type: 'DAILY',
    description: 'The mines hunger for ore. Gather 3 ore.',
    objectives: [{ type: 'GATHER', target: 'ORE', quantity: 3 }],
    rewards: { xp: 50, gold: 110 },
    levelRequired: 5,
    isRepeatable: true,
    cooldownHours: 72,
  },

  // ---- Tier 3: Available from level 15 (168h / weekly cooldown) ----
  {
    id: 'daily-warden',
    name: 'Realm Warden',
    type: 'DAILY',
    description: 'Dangerous creatures stalk the frontier. Slay 3 monsters and visit a border town to report your findings.',
    objectives: [
      { type: 'KILL', target: '*', quantity: 3 },
      { type: 'VISIT', target: '*', quantity: 1 },
    ],
    rewards: { xp: 150, gold: 350 },
    levelRequired: 15,
    isRepeatable: true,
    cooldownHours: 168,
  },
  {
    id: 'daily-supplier',
    name: 'War Supplier',
    type: 'DAILY',
    description: 'The war effort demands materials. Gather a stockpile of any resources for the cause.',
    objectives: [{ type: 'GATHER', target: '*', quantity: 5 }],
    rewards: { xp: 130, gold: 300 },
    levelRequired: 15,
    isRepeatable: true,
    cooldownHours: 168,
  },

  // ---- Tier 4: Available from level 25 (168h / weekly cooldown) ----
  {
    id: 'daily-champion',
    name: 'Champion\'s Trial',
    type: 'DAILY',
    description: 'Only the strongest are asked to clear the most dangerous threats. Slay 3 creatures and gather 3 rare reagents.',
    objectives: [
      { type: 'KILL', target: '*', quantity: 3 },
      { type: 'GATHER', target: 'REAGENT', quantity: 3 },
    ],
    rewards: { xp: 300, gold: 700 },
    levelRequired: 25,
    isRepeatable: true,
    cooldownHours: 168,
  },
];
