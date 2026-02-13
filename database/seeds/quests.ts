/**
 * Quest & NPC Seed Data for Realm of Crowns
 *
 * Seeds the 9 tutorial quests from shared data into the quests table,
 * links prerequisite chains, and creates the tutorial NPC "Chronicler Maren".
 */

import { PrismaClient, NpcRole } from '@prisma/client';

// Quest data imported from shared (already compiled)
import { TUTORIAL_QUESTS } from '../../shared/src/data/quests';

export async function seedQuests(prisma: PrismaClient): Promise<void> {
  console.log('--- Seeding Quests (clean slate) ---');

  // 1. Delete ALL existing quest_progress records
  const deletedProgress = await prisma.questProgress.deleteMany({});
  console.log(`  Deleted ${deletedProgress.count} quest_progress records`);

  // 2. Delete ALL existing NPC records with role QUEST_GIVER
  const deletedNpcs = await prisma.npc.deleteMany({
    where: { role: 'QUEST_GIVER' as NpcRole },
  });
  console.log(`  Deleted ${deletedNpcs.count} QUEST_GIVER NPCs`);

  // 3. Delete ALL existing quest records (clear prerequisite links first)
  await prisma.quest.updateMany({
    data: { prerequisiteQuestId: null },
  });
  const deletedQuests = await prisma.quest.deleteMany({});
  console.log(`  Deleted ${deletedQuests.count} quests`);

  // 4. Seed the 9 tutorial quests
  const questIdMap = new Map<string, string>(); // dataId -> dbId
  let questCount = 0;

  for (const questDef of TUTORIAL_QUESTS) {
    const created = await prisma.quest.create({
      data: {
        name: questDef.name,
        slug: questDef.slug,
        type: questDef.type,
        description: questDef.description,
        objectives: questDef.objectives,
        rewards: questDef.rewards,
        levelRequired: questDef.levelRequired,
        sortOrder: questDef.sortOrder,
        isRepeatable: questDef.isRepeatable ?? false,
        cooldownHours: questDef.cooldownHours ?? null,
        regionId: null,
      },
    });
    questIdMap.set(questDef.id, created.id);
    questCount++;
  }

  console.log(`  Created ${questCount} tutorial quests`);

  // 5. Link prerequisite chains
  let linkedCount = 0;
  for (const questDef of TUTORIAL_QUESTS) {
    if (!questDef.prerequisiteQuestId) continue;
    const dbId = questIdMap.get(questDef.id);
    const prereqDbId = questIdMap.get(questDef.prerequisiteQuestId);
    if (dbId && prereqDbId) {
      await prisma.quest.update({
        where: { id: dbId },
        data: { prerequisiteQuestId: prereqDbId },
      });
      linkedCount++;
    }
  }
  console.log(`  Linked ${linkedCount} prerequisite chains`);

  // 6. Create tutorial NPC "Chronicler Maren" in Kingshold (or first available town)
  console.log('--- Seeding Tutorial NPC ---');

  let town = await prisma.town.findFirst({ where: { name: 'Kingshold' } });
  if (!town) {
    town = await prisma.town.findFirst();
  }

  if (!town) {
    console.error('  ERROR: No towns found in database. Cannot create tutorial NPC.');
    return;
  }

  const allQuestDbIds = TUTORIAL_QUESTS.map((q) => questIdMap.get(q.id)).filter(
    (id): id is string => id !== undefined
  );

  await prisma.npc.create({
    data: {
      name: 'Chronicler Maren',
      townId: town.id,
      role: 'QUEST_GIVER' as NpcRole,
      dialog: {
        greeting:
          'Ah, a new arrival! I am Maren, Chronicler of Aethermere. I keep records of all who walk these lands.',
        questAvailable:
          'I have guidance for you, adventurer. Each step will teach you the ways of this world.',
        questComplete:
          'Another lesson learned! You grow wiser with each challenge, traveler.',
      },
      questIds: allQuestDbIds,
    },
  });

  console.log(`  Created NPC "Chronicler Maren" in ${town.name} with ${allQuestDbIds.length} quests`);
}
