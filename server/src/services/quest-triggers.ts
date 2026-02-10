/**
 * Quest Trigger Service
 *
 * Called by combat-pve, work, and travel routes to automatically
 * update quest progress when relevant game events occur.
 */

import { prisma } from '../lib/prisma';
import { emitNotification } from '../socket/events';

interface ProgressMap {
  [objectiveIndex: string]: number;
}

/**
 * Called when a player kills a monster in PvE combat.
 * Checks all active quests for KILL objectives matching the monster type.
 */
export async function onMonsterKill(
  characterId: string,
  monsterType: string,
  count: number = 1,
): Promise<void> {
  try {
    const activeQuests = await prisma.questProgress.findMany({
      where: {
        characterId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    for (const qp of activeQuests) {
      const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
      const progress = (qp.progress as ProgressMap) || {};
      let updated = false;

      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.type !== 'KILL') continue;

        // Match specific monster type or wildcard '*'
        if (obj.target !== monsterType && obj.target !== '*') continue;

        const current = progress[String(i)] || 0;
        if (current >= obj.quantity) continue; // already complete

        progress[String(i)] = Math.min(current + count, obj.quantity);
        updated = true;
      }

      if (updated) {
        await prisma.questProgress.update({
          where: { id: qp.id },
          data: { progress },
        });

        // Check if all objectives are now met
        const allMet = objectives.every(
          (obj, idx) => (progress[String(idx)] || 0) >= obj.quantity,
        );

        if (allMet) {
          await emitNotification(characterId, {
            id: qp.id,
            type: 'quest_ready',
            title: 'Quest Complete!',
            message: `All objectives for "${qp.quest.name}" are complete. Turn it in to claim your reward!`,
          });
        }
      }
    }
  } catch (error) {
    console.error('[QuestTriggers] onMonsterKill error:', error);
  }
}

/**
 * Called when a player gathers a resource.
 * Checks all active quests for GATHER objectives matching the resource type.
 */
export async function onResourceGather(
  characterId: string,
  resourceType: string,
  count: number = 1,
): Promise<void> {
  try {
    const activeQuests = await prisma.questProgress.findMany({
      where: {
        characterId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    for (const qp of activeQuests) {
      const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
      const progress = (qp.progress as ProgressMap) || {};
      let updated = false;

      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.type !== 'GATHER') continue;

        if (obj.target !== resourceType && obj.target !== '*') continue;

        const current = progress[String(i)] || 0;
        if (current >= obj.quantity) continue;

        progress[String(i)] = Math.min(current + count, obj.quantity);
        updated = true;
      }

      if (updated) {
        await prisma.questProgress.update({
          where: { id: qp.id },
          data: { progress },
        });

        const allMet = objectives.every(
          (obj, idx) => (progress[String(idx)] || 0) >= obj.quantity,
        );

        if (allMet) {
          await emitNotification(characterId, {
            id: qp.id,
            type: 'quest_ready',
            title: 'Quest Complete!',
            message: `All objectives for "${qp.quest.name}" are complete. Turn it in to claim your reward!`,
          });
        }
      }
    }
  } catch (error) {
    console.error('[QuestTriggers] onResourceGather error:', error);
  }
}

/**
 * Called when a player arrives at a town.
 * Checks all active quests for VISIT objectives matching the town name.
 */
export async function onVisitLocation(
  characterId: string,
  townId: string,
): Promise<void> {
  try {
    // Resolve town name from ID
    const town = await prisma.town.findUnique({
      where: { id: townId },
      select: { name: true },
    });
    if (!town) return;

    const activeQuests = await prisma.questProgress.findMany({
      where: {
        characterId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    for (const qp of activeQuests) {
      const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
      const progress = (qp.progress as ProgressMap) || {};
      let updated = false;

      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.type !== 'VISIT') continue;

        if (obj.target !== town.name && obj.target !== '*') continue;

        const current = progress[String(i)] || 0;
        if (current >= obj.quantity) continue;

        progress[String(i)] = Math.min(current + 1, obj.quantity);
        updated = true;
      }

      if (updated) {
        await prisma.questProgress.update({
          where: { id: qp.id },
          data: { progress },
        });

        const allMet = objectives.every(
          (obj, idx) => (progress[String(idx)] || 0) >= obj.quantity,
        );

        if (allMet) {
          await emitNotification(characterId, {
            id: qp.id,
            type: 'quest_ready',
            title: 'Quest Complete!',
            message: `All objectives for "${qp.quest.name}" are complete. Turn it in to claim your reward!`,
          });
        }
      }
    }
  } catch (error) {
    console.error('[QuestTriggers] onVisitLocation error:', error);
  }
}
