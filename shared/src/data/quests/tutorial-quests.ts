import { QuestDefinition } from './types';

/**
 * Tutorial Quest Chain — Realm of Crowns
 *
 * These quests guide new players through every core game mechanic,
 * one at a time, from character creation to market mastery.
 *
 * Design rules:
 * - One quest active at a time (enforced server-side)
 * - Auto-complete when objective is met (no manual turn-in)
 * - sortOrder uses gaps of 10 for future insertions
 * - Pre-profession quests (10-40) provide ~50 XP (30-40% of Level 3)
 *   XP to Level 3: 40 (L1→2) + 52 (L2→3) = 92 XP
 *   Quest rewards alone: 50 XP + combat XP from kills (~15 XP each) ≈ 95-125 total
 */

export const TUTORIAL_QUESTS: QuestDefinition[] = [
  // ──────────────────────────────────────────────────────────────────────
  // PRE-PROFESSION QUESTS (Level 1+)
  // ──────────────────────────────────────────────────────────────────────

  {
    id: 'tutorial-first-blood',
    slug: 'tutorial-first-blood',
    name: 'First Blood',
    type: 'TUTORIAL',
    description:
      'Every adventurer must face their first foe. Seek out a creature near town and prove you can hold your own in battle.',
    objectives: [{ type: 'KILL', target: '*', quantity: 1 }],
    rewards: { xp: 15, gold: 10 },    // First win — meaningful, not huge
    levelRequired: 1,
    sortOrder: 10,
    isRepeatable: false,
  },

  {
    id: 'tutorial-wanderlust',
    slug: 'tutorial-wanderlust',
    name: 'Wanderlust',
    type: 'TUTORIAL',
    description:
      'The world of Aethermere is vast and full of wonder. Set out from your hometown and travel to a neighboring settlement.',
    objectives: [{ type: 'VISIT', target: '*', quantity: 1 }],
    rewards: { xp: 10, gold: 5 },     // Easy task, small reward
    levelRequired: 1,
    sortOrder: 20,
    prerequisiteQuestId: 'tutorial-first-blood',
    isRepeatable: false,
  },

  {
    id: 'tutorial-gear-up',
    slug: 'tutorial-gear-up',
    name: 'Gear Up',
    type: 'TUTORIAL',
    description:
      'A warrior is only as good as their equipment. Open your inventory and equip a weapon or piece of armor to prepare for the challenges ahead.',
    objectives: [{ type: 'EQUIP', target: '*', quantity: 1 }],
    rewards: { xp: 5, gold: 0 },       // Trivial action, minimal reward
    levelRequired: 1,
    sortOrder: 30,
    prerequisiteQuestId: 'tutorial-wanderlust',
    isRepeatable: false,
  },

  {
    id: 'tutorial-battle-hardened',
    slug: 'tutorial-battle-hardened',
    name: 'Battle Hardened',
    type: 'TUTORIAL',
    description:
      'One victory does not make a warrior. Return to the wilds and defeat three more creatures to steel yourself for the road ahead.',
    objectives: [{ type: 'KILL', target: '*', quantity: 3 }],
    rewards: { xp: 20, gold: 20 },    // Bigger reward for persistence
    levelRequired: 1,
    sortOrder: 40,
    prerequisiteQuestId: 'tutorial-gear-up',
    isRepeatable: false,
  },

  // ──────────────────────────────────────────────────────────────────────
  // POST-PROFESSION QUESTS (Level 3+)
  // ──────────────────────────────────────────────────────────────────────

  {
    id: 'tutorial-choose-your-path',
    slug: 'tutorial-choose-your-path',
    name: 'Choose Your Path',
    type: 'TUTORIAL',
    description:
      'You have proven your mettle in combat. Now it is time to choose a trade. Visit the professions board and select a craft to master.',
    objectives: [{ type: 'SELECT_PROFESSION', target: '*', quantity: 1 }],
    rewards: { xp: 20, gold: 20 },
    levelRequired: 3,
    sortOrder: 50,
    prerequisiteQuestId: 'tutorial-battle-hardened',
    isRepeatable: false,
  },

  {
    id: 'tutorial-first-harvest',
    slug: 'tutorial-first-harvest',
    name: 'First Harvest',
    type: 'TUTORIAL',
    description:
      'Put your new skills to work. Gather a resource from the land — mine ore, chop wood, pick herbs, or harvest whatever your profession allows.',
    objectives: [{ type: 'GATHER', target: '*', quantity: 1 }],
    rewards: { xp: 15, gold: 15 },
    levelRequired: 3,
    sortOrder: 60,
    prerequisiteQuestId: 'tutorial-choose-your-path',
    isRepeatable: false,
  },

  {
    id: 'tutorial-artisans-touch',
    slug: 'tutorial-artisans-touch',
    name: "The Artisan's Touch",
    type: 'TUTORIAL',
    description:
      'Raw materials are only the beginning. Take what you have gathered to a workshop and craft your first item.',
    objectives: [{ type: 'CRAFT', target: '*', quantity: 1 }],
    rewards: { xp: 20, gold: 20 },
    levelRequired: 3,
    sortOrder: 70,
    prerequisiteQuestId: 'tutorial-first-harvest',
    isRepeatable: false,
  },

  {
    id: 'tutorial-open-for-business',
    slug: 'tutorial-open-for-business',
    name: 'Open for Business',
    type: 'TUTORIAL',
    description:
      'The marketplace is the lifeblood of Aethermere. List an item for sale and join the merchant economy.',
    objectives: [{ type: 'MARKET_SELL', target: '*', quantity: 1 }],
    rewards: { xp: 15, gold: 15 },
    levelRequired: 3,
    sortOrder: 80,
    prerequisiteQuestId: 'tutorial-artisans-touch',
    isRepeatable: false,
  },

  {
    id: 'tutorial-smart-shopping',
    slug: 'tutorial-smart-shopping',
    name: 'Smart Shopping',
    type: 'TUTORIAL',
    description:
      'Every coin spent wisely is a coin well earned. Browse the marketplace and purchase an item from a fellow adventurer.',
    objectives: [{ type: 'MARKET_BUY', target: '*', quantity: 1 }],
    rewards: { xp: 10, gold: 10 },
    levelRequired: 3,
    sortOrder: 90,
    prerequisiteQuestId: 'tutorial-open-for-business',
    isRepeatable: false,
  },
];
