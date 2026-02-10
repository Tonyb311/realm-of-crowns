/**
 * Quest & NPC Seed Data for Realm of Crowns
 *
 * Seeds quest definitions from shared/src/data/quests/ into the quests table,
 * and creates NPC quest givers in major towns.
 */

import { PrismaClient, NpcRole } from '@prisma/client';

// Quest data imported from shared (already compiled)
import { ALL_QUESTS } from '../../shared/src/data/quests';

interface NpcDef {
  name: string;
  townName: string;
  role: NpcRole;
  dialog: { greeting: string; questAvailable: string; questComplete: string };
  questDataIds: string[]; // references QuestDefinition.id from shared data
}

const NPCS: NpcDef[] = [
  // Verdant Heartlands — Kingshold
  {
    name: 'Elder Tomas',
    townName: 'Kingshold',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Welcome, traveler. These are troubled times.',
      questAvailable: 'I have a task that needs a brave soul. Are you interested?',
      questComplete: 'Well done! The Heartlands owe you a debt.',
    },
    questDataIds: [
      'main-01-awakening',
      'main-02-proving-ground',
      'main-03-gathering-supplies',
      'town-heartlands-01',
      'town-heartlands-02',
      'town-heartlands-03',
    ],
  },
  {
    name: 'Captain Aldric',
    townName: 'Kingshold',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Stand tall, citizen. The militia protects these roads.',
      questAvailable: 'We have reports of trouble. Care to lend your sword?',
      questComplete: 'The realm is safer thanks to you, soldier.',
    },
    questDataIds: [
      'main-04-the-road-ahead',
      'town-heartlands-04',
      'daily-hunt',
      'daily-slayer',
    ],
  },
  {
    name: 'Farmer Hilde',
    townName: 'Millhaven',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Oh, hello! Always happy to see a helping hand.',
      questAvailable: 'Could you lend a hand with some work around the farm?',
      questComplete: 'Bless you! The harvest will be plentiful.',
    },
    questDataIds: ['town-heartlands-05', 'daily-gather', 'daily-prospector'],
  },

  // Silverwood Forest — Aelindra
  {
    name: 'Sage Elowen',
    townName: 'Aelindra',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'The forest whispers of your arrival.',
      questAvailable: 'Nature has need of a champion. Will you answer its call?',
      questComplete: 'The Silverwood thanks you, friend.',
    },
    questDataIds: [
      'town-silverwood-01',
      'town-silverwood-02',
      'town-silverwood-03',
    ],
  },

  // Ironvault Mountains — Kazad-Vorn
  {
    name: 'Forgemaster Durnik',
    townName: 'Kazad-Vorn',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Speak quickly, I have ore to tend.',
      questAvailable: 'The mountain needs strong arms. You look capable enough.',
      questComplete: 'Fine work. The ancestors would approve.',
    },
    questDataIds: [
      'main-06-into-the-depths',
      'town-ironvault-01',
      'town-ironvault-02',
      'town-ironvault-03',
    ],
  },

  // The Crossroads — Hearthshire
  {
    name: 'Merchant Bellamy',
    townName: 'Hearthshire',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Welcome to Hearthshire! Best trade hub in all of Aethermere.',
      questAvailable: 'Business has been disrupted. Perhaps you can help?',
      questComplete: 'Splendid! Commerce flows freely once more.',
    },
    questDataIds: [
      'town-crossroads-01',
      'town-crossroads-02',
      'town-crossroads-03',
      'daily-patrol',
    ],
  },

  // Ashenfang Wastes — Grakthar
  {
    name: 'Warchief Grumm',
    townName: 'Grakthar',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'You dare enter the Wastes? Prove your strength.',
      questAvailable: 'There are enemies to crush. Show me you are not weak.',
      questComplete: 'You fight well. The Wastes respect strength.',
    },
    questDataIds: ['bounty-orc-raiders'],
  },

  // Shadowmere Marshes — Nethermire
  {
    name: 'Shadow Broker Vex',
    townName: 'Nethermire',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'Information has a price. So does silence.',
      questAvailable: 'I have a task that requires... discretion.',
      questComplete: 'Consider us even. For now.',
    },
    questDataIds: ['main-05-shadows-stir', 'bounty-troll-menace'],
  },

  // Frozen Reaches — Drakenspire
  {
    name: 'Elder Varanax',
    townName: 'Drakenspire',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'The fire of the ancients burns in this place.',
      questAvailable: 'The Reaches face a dire threat. Only the worthy may answer.',
      questComplete: 'You carry the flame of the Drakonid now.',
    },
    questDataIds: ['main-07-dragon-rumor', 'bounty-dragon-slayer'],
  },

  // The Suncoast — Porto Sole (Guild quests)
  {
    name: 'Guildmaster Renna',
    townName: 'Porto Sole',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: "Welcome to the Adventurer's Guild headquarters!",
      questAvailable: 'The Guild always has work for willing hands.',
      questComplete: 'Another job well done. Your reputation grows.',
    },
    questDataIds: [
      'guild-01-initiation',
      'guild-02-resource-drive',
      'guild-03-expedition',
    ],
  },

  // Ashenmoor — Final quest
  {
    name: 'Spirit of the Fallen',
    townName: 'Ashenmoor',
    role: 'QUEST_GIVER',
    dialog: {
      greeting: 'The dead do not rest here. Neither can you.',
      questAvailable: 'End the curse that binds this place.',
      questComplete: 'At last... peace.',
    },
    questDataIds: ['main-08-final-stand'],
  },
];

export async function seedQuests(prisma: PrismaClient): Promise<void> {
  console.log('--- Seeding Quests ---');

  // Look up regions and towns by name
  const regions = await prisma.region.findMany({ select: { id: true, name: true } });
  const regionMap = new Map(regions.map((r) => [r.name, r.id]));

  const towns = await prisma.town.findMany({ select: { id: true, name: true } });
  const townMap = new Map(towns.map((t) => [t.name, t.id]));

  // First pass: upsert quests without prerequisite links (we need IDs first)
  const questIdMap = new Map<string, string>(); // dataId -> dbId
  let questCount = 0;

  for (const questDef of ALL_QUESTS) {
    const regionId = questDef.regionId ? regionMap.get(questDef.regionId) : null;

    const existing = await prisma.quest.findFirst({
      where: { name: questDef.name, type: questDef.type },
    });

    if (existing) {
      await prisma.quest.update({
        where: { id: existing.id },
        data: {
          description: questDef.description,
          objectives: questDef.objectives,
          rewards: questDef.rewards,
          levelRequired: questDef.levelRequired,
          isRepeatable: questDef.isRepeatable ?? false,
          cooldownHours: questDef.cooldownHours ?? null,
          regionId: regionId ?? null,
        },
      });
      questIdMap.set(questDef.id, existing.id);
    } else {
      const created = await prisma.quest.create({
        data: {
          name: questDef.name,
          type: questDef.type,
          description: questDef.description,
          objectives: questDef.objectives,
          rewards: questDef.rewards,
          levelRequired: questDef.levelRequired,
          isRepeatable: questDef.isRepeatable ?? false,
          cooldownHours: questDef.cooldownHours ?? null,
          regionId: regionId ?? null,
        },
      });
      questIdMap.set(questDef.id, created.id);
    }
    questCount++;
  }

  // Second pass: link prerequisites
  for (const questDef of ALL_QUESTS) {
    if (!questDef.prerequisiteQuestId) continue;
    const dbId = questIdMap.get(questDef.id);
    const prereqDbId = questIdMap.get(questDef.prerequisiteQuestId);
    if (dbId && prereqDbId) {
      await prisma.quest.update({
        where: { id: dbId },
        data: { prerequisiteQuestId: prereqDbId },
      });
    }
  }

  console.log(`  Created/updated ${questCount} quests`);

  // Seed NPCs
  console.log('--- Seeding NPCs ---');
  let npcCount = 0;

  for (const npcDef of NPCS) {
    const townId = townMap.get(npcDef.townName);
    if (!townId) {
      console.error(`  ERROR: Town "${npcDef.townName}" not found for NPC "${npcDef.name}"`);
      continue;
    }

    // Resolve quest data IDs to DB IDs
    const resolvedQuestIds = npcDef.questDataIds
      .map((dataId) => questIdMap.get(dataId))
      .filter((id): id is string => id !== undefined);

    const existing = await prisma.npc.findFirst({
      where: { name: npcDef.name, townId },
    });

    if (existing) {
      await prisma.npc.update({
        where: { id: existing.id },
        data: {
          role: npcDef.role,
          dialog: npcDef.dialog,
          questIds: resolvedQuestIds,
        },
      });
    } else {
      await prisma.npc.create({
        data: {
          name: npcDef.name,
          townId,
          role: npcDef.role,
          dialog: npcDef.dialog,
          questIds: resolvedQuestIds,
        },
      });
    }
    npcCount++;
  }

  console.log(`  Created/updated ${npcCount} NPCs`);
}
