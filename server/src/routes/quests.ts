import crypto from 'crypto';
import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, lte, inArray, desc, sql } from 'drizzle-orm';
import { quests, questProgress, npcs, characters, itemTemplates, items, inventories } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { calculateWeightState } from '../services/weight-calculator';
import { computeFeatBonus } from '@shared/data/feats';

const router = Router();

// ---- Helpers ----

// ---- Zod Schemas ----

const acceptQuestSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
});

const progressSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
  objectiveIndex: z.number().int().min(0),
  amount: z.number().int().min(1).default(1),
});

const completeQuestSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
});

const abandonQuestSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
});

// ---- Routes ----

// GET /api/quests/available — List available quests for the character
router.get('/available', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Get the character's completed and active quest IDs
    const existingProgress = await db.select({
      questId: questProgress.questId,
      status: questProgress.status,
      completedAt: questProgress.completedAt,
    }).from(questProgress).where(eq(questProgress.characterId, character.id));

    const activeQuestIds = new Set(
      existingProgress.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PENDING').map((p) => p.questId),
    );
    const completedMap = new Map(
      existingProgress.filter((p) => p.status === 'COMPLETED').map((p) => [p.questId, p.completedAt]),
    );

    // Build filter for available quests
    // Drizzle doesn't support nested where on relations (towns.some), so we load all matching quests
    // and filter town membership in app code if needed
    const questRows = await db.query.quests.findMany({
      where: and(
        eq(quests.isActive, true),
        lte(quests.levelRequired, character.level),
      ),
      with: {
        region: { columns: { id: true, name: true } },
      },
    });

    // If townId filter specified, we'd need to check region->towns relation
    // For now, keep the same behavior: return all quests matching level
    // (The Prisma version used region.towns.some which is hard to replicate exactly in Drizzle)

    const now = new Date();
    const available = questRows.filter((quest) => {
      // Exclude already active quests
      if (activeQuestIds.has(quest.id)) return false;

      // If non-repeatable and completed, exclude
      if (!quest.isRepeatable && completedMap.has(quest.id)) return false;

      // If repeatable, check cooldown
      if (quest.isRepeatable && completedMap.has(quest.id) && quest.cooldownHours) {
        const completedAt = completedMap.get(quest.id);
        if (completedAt) {
          const cooldownEnd = new Date(new Date(completedAt).getTime() + quest.cooldownHours * 60 * 60 * 1000);
          if (now < cooldownEnd) return false;
        }
      }

      // Check prerequisite
      if (quest.prerequisiteQuestId && !completedMap.has(quest.prerequisiteQuestId)) {
        return false;
      }

      return true;
    });

    // Sort: by sortOrder asc, then name asc
    available.sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    // Attach NPC info for quests that have an NPC giver
    const questIds = available.map((q) => q.id);
    const npcsWithQuests = questIds.length > 0
      ? await db.select({
          id: npcs.id,
          name: npcs.name,
          townId: npcs.townId,
          questIds: npcs.questIds,
        }).from(npcs)
      : [];

    // Filter NPCs that have any of our quest IDs
    const relevantNpcs = npcsWithQuests.filter(npc =>
      (npc.questIds as string[]).some(qId => questIds.includes(qId))
    );

    const questToNpc = new Map<string, { id: string; name: string; townId: string }>();
    for (const npc of relevantNpcs) {
      for (const qId of (npc.questIds as string[])) {
        if (questIds.includes(qId)) {
          questToNpc.set(qId, { id: npc.id, name: npc.name, townId: npc.townId });
        }
      }
    }

    return res.json({
      quests: available.map((q) => ({
        id: q.id,
        name: q.name,
        type: q.type,
        description: q.description,
        objectives: q.objectives,
        rewards: q.rewards,
        levelRequired: q.levelRequired,
        region: q.region,
        isRepeatable: q.isRepeatable,
        npc: questToNpc.get(q.id) || null,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-available', req)) return;
    logRouteError(req, 500, 'Get available quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/active — List character's active quests with progress
router.get('/active', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeQuests = await db.query.questProgress.findMany({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.status, 'IN_PROGRESS'),
      ),
      with: {
        quest: {
          with: { region: { columns: { id: true, name: true } } },
        },
      },
      orderBy: desc(questProgress.startedAt),
    });

    return res.json({
      quests: activeQuests.map((qp) => ({
        questId: qp.quest.id,
        name: qp.quest.name,
        type: qp.quest.type,
        description: qp.quest.description,
        objectives: qp.quest.objectives,
        rewards: qp.quest.rewards,
        region: qp.quest.region,
        progress: qp.progress,
        startedAt: qp.startedAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-active', req)) return;
    logRouteError(req, 500, 'Get active quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/completed — List character's completed quests
router.get('/completed', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const completedQuests = await db.query.questProgress.findMany({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.status, 'COMPLETED'),
      ),
      with: {
        quest: { columns: { id: true, name: true, type: true, rewards: true } },
      },
      orderBy: desc(questProgress.completedAt),
    });

    return res.json({
      quests: completedQuests.map((qp) => ({
        questId: qp.quest.id,
        name: qp.quest.name,
        type: qp.quest.type,
        rewards: qp.quest.rewards,
        completedAt: qp.completedAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-completed', req)) return;
    logRouteError(req, 500, 'Get completed quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/accept — Accept a quest
router.post('/accept', authGuard, characterGuard, requireTown, validate(acceptQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const quest = await db.query.quests.findFirst({ where: eq(quests.id, questId) });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Enforce one active quest at a time
    const activeQuest = await db.query.questProgress.findFirst({
      where: and(eq(questProgress.characterId, character.id), eq(questProgress.status, 'IN_PROGRESS')),
    });
    if (activeQuest) {
      return res.status(400).json({
        error: 'You already have an active quest. Complete or abandon it first.',
      });
    }

    // Check level requirement
    if (character.level < quest.levelRequired) {
      return res.status(400).json({
        error: `You must be level ${quest.levelRequired} to accept this quest (currently level ${character.level})`,
      });
    }

    // Check prerequisite
    if (quest.prerequisiteQuestId) {
      const prereqComplete = await db.query.questProgress.findFirst({
        where: and(
          eq(questProgress.characterId, character.id),
          eq(questProgress.questId, quest.prerequisiteQuestId),
          eq(questProgress.status, 'COMPLETED'),
        ),
      });
      if (!prereqComplete) {
        return res.status(400).json({ error: 'Prerequisite quest not completed' });
      }
    }

    // Check not already active
    const existingActive = await db.query.questProgress.findFirst({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.questId, questId),
        eq(questProgress.status, 'IN_PROGRESS'),
      ),
    });
    if (existingActive) {
      return res.status(400).json({ error: 'Quest is already active' });
    }

    // For repeatable quests, check cooldown and remove old completed progress
    if (quest.isRepeatable) {
      const lastCompleted = await db.query.questProgress.findFirst({
        where: and(
          eq(questProgress.characterId, character.id),
          eq(questProgress.questId, questId),
          eq(questProgress.status, 'COMPLETED'),
        ),
        orderBy: desc(questProgress.completedAt),
      });

      if (lastCompleted && quest.cooldownHours) {
        const cooldownEnd = new Date(
          new Date(lastCompleted.completedAt!).getTime() + quest.cooldownHours * 60 * 60 * 1000,
        );
        if (new Date() < cooldownEnd) {
          const remaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (60 * 60 * 1000));
          return res.status(400).json({
            error: `Quest is on cooldown. Available in ${remaining} hour(s).`,
          });
        }
      }

      // Delete old completed progress so we can create a fresh one (unique constraint)
      if (lastCompleted) {
        await db.delete(questProgress).where(eq(questProgress.id, lastCompleted.id));
      }
    } else {
      // Non-repeatable: check not already completed
      const alreadyCompleted = await db.query.questProgress.findFirst({
        where: and(
          eq(questProgress.characterId, character.id),
          eq(questProgress.questId, questId),
          eq(questProgress.status, 'COMPLETED'),
        ),
      });
      if (alreadyCompleted) {
        return res.status(400).json({ error: 'Quest already completed' });
      }
    }

    // Initialize progress: each objective starts at 0
    const objectives = quest.objectives as { type: string; target: string; quantity: number }[];
    const initialProgress: Record<string, number> = {};
    for (let i = 0; i < objectives.length; i++) {
      initialProgress[String(i)] = 0;
    }

    const [newQuestProgress] = await db.insert(questProgress).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      questId,
      status: 'IN_PROGRESS',
      progress: initialProgress,
      startedAt: new Date().toISOString(),
    }).returning();

    return res.status(201).json({
      quest: {
        questId: quest.id,
        name: quest.name,
        type: quest.type,
        description: quest.description,
        objectives: quest.objectives,
        rewards: quest.rewards,
        progress: initialProgress,
        startedAt: newQuestProgress.startedAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-accept', req)) return;
    logRouteError(req, 500, 'Accept quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/progress — Manually report progress on an objective
router.post('/progress', authGuard, characterGuard, requireTown, validate(progressSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId, objectiveIndex, amount } = req.body;
    const character = req.character!;

    const qp = await db.query.questProgress.findFirst({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.questId, questId),
        eq(questProgress.status, 'IN_PROGRESS'),
      ),
      with: { quest: true },
    });

    if (!qp) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
    if (objectiveIndex < 0 || objectiveIndex >= objectives.length) {
      return res.status(400).json({ error: 'Invalid objective index' });
    }

    // Major-QUEST-01 FIX: Cap progress increment to 1 per request to prevent cheating
    const safeAmount = Math.min(amount, 1);

    const progress = (qp.progress as Record<string, number>) || {};
    const objective = objectives[objectiveIndex];
    const current = progress[String(objectiveIndex)] || 0;
    progress[String(objectiveIndex)] = Math.min(current + safeAmount, objective.quantity);

    await db.update(questProgress)
      .set({ progress })
      .where(eq(questProgress.id, qp.id));

    return res.json({
      questId,
      objectiveIndex,
      current: progress[String(objectiveIndex)],
      required: objective.quantity,
      complete: progress[String(objectiveIndex)] >= objective.quantity,
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-progress', req)) return;
    logRouteError(req, 500, 'Quest progress error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/complete — Complete a quest and claim rewards
router.post('/complete', authGuard, characterGuard, requireTown, validate(completeQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    const qp = await db.query.questProgress.findFirst({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.questId, questId),
        eq(questProgress.status, 'IN_PROGRESS'),
      ),
      with: { quest: true },
    });

    if (!qp) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    // Validate all objectives are met
    const objectives = qp.quest.objectives as { type: string; target: string; quantity: number }[];
    const progress = (qp.progress as Record<string, number>) || {};

    for (let i = 0; i < objectives.length; i++) {
      const current = progress[String(i)] || 0;
      if (current < objectives[i].quantity) {
        return res.status(400).json({
          error: `Objective ${i + 1} not complete: ${current}/${objectives[i].quantity} ${objectives[i].target}`,
        });
      }
    }

    // Grant rewards in a transaction
    const rewards = qp.quest.rewards as { xp: number; gold: number; items?: string[] };

    // Apply feat bonuses to XP and gold
    const questFeats = (character.feats as string[]) ?? [];
    const questXp = Math.round(rewards.xp * (1 + computeFeatBonus(questFeats, 'xpBonus')));
    const questGold = Math.round(rewards.gold * (1 + computeFeatBonus(questFeats, 'goldBonus')));

    await db.transaction(async (tx) => {
      // Grant XP and gold
      await tx.update(characters)
        .set({
          xp: sql`${characters.xp} + ${questXp}`,
          gold: sql`${characters.gold} + ${questGold}`,
        })
        .where(eq(characters.id, character.id));

      // P2 #51 FIX: Grant item rewards if present
      if (rewards.items && rewards.items.length > 0) {
        for (const itemTemplateName of rewards.items) {
          const template = await tx.query.itemTemplates.findFirst({
            where: eq(itemTemplates.name, itemTemplateName),
          });
          if (template) {
            const [item] = await tx.insert(items).values({
              id: crypto.randomUUID(),
              templateId: template.id,
              ownerId: character.id,
              currentDurability: template.durability ?? 100,
            }).returning();
            const existingInv = await tx.query.inventories.findFirst({
              where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, item.id)),
            });
            if (existingInv) {
              await tx.update(inventories)
                .set({ quantity: sql`${inventories.quantity} + 1` })
                .where(eq(inventories.id, existingInv.id));
            } else {
              await tx.insert(inventories).values({ id: crypto.randomUUID(), characterId: character.id, itemId: item.id, quantity: 1 });
            }
          }
        }
      }

      // Mark quest as completed
      await tx.update(questProgress)
        .set({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        })
        .where(eq(questProgress.id, qp.id));
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      completed: true,
      quest: {
        id: qp.quest.id,
        name: qp.quest.name,
      },
      rewards: {
        xp: rewards.xp,
        gold: rewards.gold,
        items: rewards.items ?? [],
      },
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-complete', req)) return;
    logRouteError(req, 500, 'Complete quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/abandon — Abandon an active quest
router.post('/abandon', authGuard, characterGuard, requireTown, validate(abandonQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    const qp = await db.query.questProgress.findFirst({
      where: and(
        eq(questProgress.characterId, character.id),
        eq(questProgress.questId, questId),
        eq(questProgress.status, 'IN_PROGRESS'),
      ),
    });

    if (!qp) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    await db.delete(questProgress).where(eq(questProgress.id, qp.id));

    return res.json({ abandoned: true, questId });
  } catch (error) {
    if (handleDbError(error, res, 'quest-abandon', req)) return;
    logRouteError(req, 500, 'Abandon quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/npcs/:townId — List NPCs in a town with their available quests
router.get('/npcs/:townId', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const character = req.character!;

    const npcRows = await db.query.npcs.findMany({
      where: eq(npcs.townId, townId),
      with: {
        town: { columns: { id: true, name: true } },
      },
    });

    // Get the character's quest progress to determine available vs completed
    const existingProgress = await db.select({
      questId: questProgress.questId,
      status: questProgress.status,
    }).from(questProgress).where(eq(questProgress.characterId, character.id));

    const activeIds = new Set(existingProgress.filter((p) => p.status === 'IN_PROGRESS').map((p) => p.questId));
    const completedIds = new Set(existingProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.questId));

    // Fetch quest details for all NPC quest IDs
    const allQuestIds = npcRows.flatMap((npc) => npc.questIds as string[]);
    const questRows = allQuestIds.length > 0
      ? await db.select({
          id: quests.id,
          name: quests.name,
          type: quests.type,
          description: quests.description,
          levelRequired: quests.levelRequired,
          isRepeatable: quests.isRepeatable,
        }).from(quests).where(inArray(quests.id, allQuestIds))
      : [];
    const questMap = new Map(questRows.map((q) => [q.id, q]));

    return res.json({
      npcs: npcRows.map((npc) => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        dialog: npc.dialog,
        town: npc.town,
        quests: (npc.questIds as string[])
          .map((qId) => {
            const quest = questMap.get(qId);
            if (!quest) return null;
            return {
              ...quest,
              status: activeIds.has(qId)
                ? 'active'
                : completedIds.has(qId)
                  ? 'completed'
                  : quest.levelRequired <= character.level
                    ? 'available'
                    : 'locked',
            };
          })
          .filter(Boolean),
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'quest-npcs', req)) return;
    logRouteError(req, 500, 'Get NPCs error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Auto-complete a tutorial quest: mark completed + award rewards.
 * Called from quest-triggers when all objectives are met on a tutorial quest.
 */
export async function autoCompleteTutorialQuest(
  characterId: string,
  questProgressId: string,
): Promise<void> {
  try {
    const qp = await db.query.questProgress.findFirst({
      where: eq(questProgress.id, questProgressId),
      with: { quest: true },
    });
    if (!qp || qp.status !== 'IN_PROGRESS') return;
    if (qp.quest.type !== 'TUTORIAL') return;

    const rewards = qp.quest.rewards as { xp?: number; gold?: number; items?: string[] };

    await db.transaction(async (tx) => {
      // Award XP and gold
      await tx.update(characters)
        .set({
          xp: sql`${characters.xp} + ${rewards.xp || 0}`,
          gold: sql`${characters.gold} + ${rewards.gold || 0}`,
        })
        .where(eq(characters.id, characterId));

      // Mark quest as completed
      await tx.update(questProgress)
        .set({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        })
        .where(eq(questProgress.id, questProgressId));
    });

    // Check for level up
    const { checkLevelUp } = await import('../services/progression');
    await checkLevelUp(characterId);

    console.log(`[Quest] Auto-completed tutorial quest "${qp.quest.name}" for character ${characterId}`);
  } catch (error) {
    console.error('[Quest] Auto-complete error:', error);
  }
}

export default router;
