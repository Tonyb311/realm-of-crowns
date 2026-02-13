/**
 * Quest Trigger Service
 *
 * Called by game action handlers to automatically update quest progress.
 * For TUTORIAL quests, auto-completes and awards rewards when all objectives are met.
 * For other quest types, sends a notification prompting the player to turn in.
 *
 * All functions are wrapped in try/catch — quest bugs must NEVER break game actions.
 */

import { prisma } from '../lib/prisma';
import { emitNotification } from '../socket/events';
import { autoCompleteTutorialQuest } from '../routes/quests';

interface ProgressMap {
  [objectiveIndex: string]: number;
}

/**
 * Generic quest progress updater. Checks the character's active quest
 * for matching objectives and increments progress.
 */
async function updateQuestProgress(
  characterId: string,
  objectiveType: string,
  target: string = '*',
  count: number = 1,
): Promise<void> {
  // Find the single active quest (one-at-a-time rule)
  const qp = await prisma.questProgress.findFirst({
    where: { characterId, status: 'IN_PROGRESS' },
    include: { quest: true },
  });
  if (!qp) return;

  const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
  const progress = (qp.progress as ProgressMap) || {};
  let updated = false;

  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    if (obj.type !== objectiveType) continue;
    if (obj.target !== target && obj.target !== '*' && target !== '*') continue;

    const current = progress[String(i)] || 0;
    if (current >= obj.quantity) continue;

    progress[String(i)] = Math.min(current + count, obj.quantity);
    updated = true;
  }

  if (!updated) return;

  await prisma.questProgress.update({
    where: { id: qp.id },
    data: { progress },
  });

  // Check if all objectives are now met
  const allMet = objectives.every(
    (obj, idx) => (progress[String(idx)] || 0) >= obj.quantity,
  );

  if (allMet) {
    if (qp.quest.type === 'TUTORIAL') {
      // Auto-complete tutorial quests — no manual turn-in needed
      await autoCompleteTutorialQuest(characterId, qp.id);
    } else {
      // Non-tutorial: notify player to turn in
      emitNotification(characterId, {
        id: qp.id,
        type: 'quest_ready',
        title: 'Quest Complete!',
        message: `All objectives for "${qp.quest.name}" are complete. Turn it in to claim your reward!`,
      });
    }
  }
}

/** Called when a player kills a monster in PvE combat. */
export async function onMonsterKill(
  characterId: string,
  monsterType: string,
  count: number = 1,
): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'KILL', monsterType, count);
  } catch (error) {
    console.error('[QuestTriggers] onMonsterKill error:', error);
  }
}

/** Called when a player gathers a resource. */
export async function onResourceGather(
  characterId: string,
  resourceType: string,
  count: number = 1,
): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'GATHER', resourceType, count);
  } catch (error) {
    console.error('[QuestTriggers] onResourceGather error:', error);
  }
}

/** Called when a player arrives at a town. */
export async function onVisitLocation(
  characterId: string,
  townId: string,
): Promise<void> {
  try {
    // Resolve town name from ID for matching
    const town = await prisma.town.findUnique({
      where: { id: townId },
      select: { name: true },
    });
    if (!town) return;
    await updateQuestProgress(characterId, 'VISIT', town.name, 1);
  } catch (error) {
    console.error('[QuestTriggers] onVisitLocation error:', error);
  }
}

/** Called when a player equips an item. */
export async function onEquipItem(characterId: string): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'EQUIP', '*', 1);
  } catch (error) {
    console.error('[QuestTriggers] onEquipItem error:', error);
  }
}

/** Called when a player selects a profession. */
export async function onSelectProfession(characterId: string): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'SELECT_PROFESSION', '*', 1);
  } catch (error) {
    console.error('[QuestTriggers] onSelectProfession error:', error);
  }
}

/** Called when a player crafts an item. */
export async function onCraftItem(characterId: string): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'CRAFT', '*', 1);
  } catch (error) {
    console.error('[QuestTriggers] onCraftItem error:', error);
  }
}

/** Called when a player lists an item on the market. */
export async function onMarketSell(characterId: string): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'MARKET_SELL', '*', 1);
  } catch (error) {
    console.error('[QuestTriggers] onMarketSell error:', error);
  }
}

/** Called when a player buys an item from the market. */
export async function onMarketBuy(characterId: string): Promise<void> {
  try {
    await updateQuestProgress(characterId, 'MARKET_BUY', '*', 1);
  } catch (error) {
    console.error('[QuestTriggers] onMarketBuy error:', error);
  }
}
