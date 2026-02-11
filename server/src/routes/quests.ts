import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { cache } from '../middleware/cache';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

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
router.get('/available', authGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Get the character's completed and active quest IDs
    const existingProgress = await prisma.questProgress.findMany({
      where: { characterId: character.id },
      select: { questId: true, status: true, completedAt: true },
    });

    const activeQuestIds = new Set(
      existingProgress.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PENDING').map((p) => p.questId),
    );
    const completedMap = new Map(
      existingProgress.filter((p) => p.status === 'COMPLETED').map((p) => [p.questId, p.completedAt]),
    );

    // Build filter for available quests
    const townFilter = req.query.townId ? { id: String(req.query.townId) } : undefined;

    const quests = await prisma.quest.findMany({
      where: {
        levelRequired: { lte: character.level },
        ...(townFilter
          ? {
              region: {
                towns: { some: townFilter },
              },
            }
          : {}),
      },
      include: {
        region: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const available = quests.filter((quest) => {
      // Exclude already active quests
      if (activeQuestIds.has(quest.id)) return false;

      // If non-repeatable and completed, exclude
      if (!quest.isRepeatable && completedMap.has(quest.id)) return false;

      // If repeatable, check cooldown
      if (quest.isRepeatable && completedMap.has(quest.id) && quest.cooldownHours) {
        const completedAt = completedMap.get(quest.id);
        if (completedAt) {
          const cooldownEnd = new Date(completedAt.getTime() + quest.cooldownHours * 60 * 60 * 1000);
          if (now < cooldownEnd) return false;
        }
      }

      // Check prerequisite
      if (quest.prerequisiteQuestId && !completedMap.has(quest.prerequisiteQuestId)) {
        return false;
      }

      return true;
    });

    // Attach NPC info for quests that have an NPC giver
    const questIds = available.map((q) => q.id);
    const npcsWithQuests = questIds.length > 0
      ? await prisma.npc.findMany({
          where: { questIds: { hasSome: questIds } },
          select: { id: true, name: true, townId: true, questIds: true },
        })
      : [];

    const questToNpc = new Map<string, { id: string; name: string; townId: string }>();
    for (const npc of npcsWithQuests) {
      for (const qId of npc.questIds) {
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
    if (handlePrismaError(error, res, 'quest-available', req)) return;
    logRouteError(req, 500, 'Get available quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/active — List character's active quests with progress
router.get('/active', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeQuests = await prisma.questProgress.findMany({
      where: {
        characterId: character.id,
        status: 'IN_PROGRESS',
      },
      include: {
        quest: {
          include: { region: { select: { id: true, name: true } } },
        },
      },
      orderBy: { startedAt: 'desc' },
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
        startedAt: qp.startedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-active', req)) return;
    logRouteError(req, 500, 'Get active quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/completed — List character's completed quests
router.get('/completed', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const completedQuests = await prisma.questProgress.findMany({
      where: {
        characterId: character.id,
        status: 'COMPLETED',
      },
      include: {
        quest: { select: { id: true, name: true, type: true, rewards: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    return res.json({
      quests: completedQuests.map((qp) => ({
        questId: qp.quest.id,
        name: qp.quest.name,
        type: qp.quest.type,
        rewards: qp.quest.rewards,
        completedAt: qp.completedAt?.toISOString(),
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-completed', req)) return;
    logRouteError(req, 500, 'Get completed quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/accept — Accept a quest
router.post('/accept', authGuard, characterGuard, validate(acceptQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Check level requirement
    if (character.level < quest.levelRequired) {
      return res.status(400).json({
        error: `You must be level ${quest.levelRequired} to accept this quest (currently level ${character.level})`,
      });
    }

    // Check prerequisite
    if (quest.prerequisiteQuestId) {
      const prereqComplete = await prisma.questProgress.findFirst({
        where: {
          characterId: character.id,
          questId: quest.prerequisiteQuestId,
          status: 'COMPLETED',
        },
      });
      if (!prereqComplete) {
        return res.status(400).json({ error: 'Prerequisite quest not completed' });
      }
    }

    // Check not already active
    const existingActive = await prisma.questProgress.findFirst({
      where: {
        characterId: character.id,
        questId,
        status: 'IN_PROGRESS',
      },
    });
    if (existingActive) {
      return res.status(400).json({ error: 'Quest is already active' });
    }

    // For repeatable quests, check cooldown and remove old completed progress
    if (quest.isRepeatable) {
      const lastCompleted = await prisma.questProgress.findFirst({
        where: {
          characterId: character.id,
          questId,
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      });

      if (lastCompleted && quest.cooldownHours) {
        const cooldownEnd = new Date(
          lastCompleted.completedAt!.getTime() + quest.cooldownHours * 60 * 60 * 1000,
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
        await prisma.questProgress.delete({ where: { id: lastCompleted.id } });
      }
    } else {
      // Non-repeatable: check not already completed
      const alreadyCompleted = await prisma.questProgress.findFirst({
        where: {
          characterId: character.id,
          questId,
          status: 'COMPLETED',
        },
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

    const questProgress = await prisma.questProgress.create({
      data: {
        characterId: character.id,
        questId,
        status: 'IN_PROGRESS',
        progress: initialProgress,
        startedAt: new Date(),
      },
    });

    return res.status(201).json({
      quest: {
        questId: quest.id,
        name: quest.name,
        type: quest.type,
        description: quest.description,
        objectives: quest.objectives,
        rewards: quest.rewards,
        progress: initialProgress,
        startedAt: questProgress.startedAt.toISOString(),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-accept', req)) return;
    logRouteError(req, 500, 'Accept quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/progress — Manually report progress on an objective
router.post('/progress', authGuard, characterGuard, validate(progressSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId, objectiveIndex, amount } = req.body;
    const character = req.character!;

    const questProgress = await prisma.questProgress.findFirst({
      where: {
        characterId: character.id,
        questId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    if (!questProgress) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    const objectives = questProgress.quest.objectives as { type: string; target: string; quantity: number }[];
    if (objectiveIndex < 0 || objectiveIndex >= objectives.length) {
      return res.status(400).json({ error: 'Invalid objective index' });
    }

    // Major-QUEST-01 FIX: Cap progress increment to 1 per request to prevent cheating
    const safeAmount = Math.min(amount, 1);

    const progress = (questProgress.progress as Record<string, number>) || {};
    const objective = objectives[objectiveIndex];
    const current = progress[String(objectiveIndex)] || 0;
    progress[String(objectiveIndex)] = Math.min(current + safeAmount, objective.quantity);

    await prisma.questProgress.update({
      where: { id: questProgress.id },
      data: { progress },
    });

    return res.json({
      questId,
      objectiveIndex,
      current: progress[String(objectiveIndex)],
      required: objective.quantity,
      complete: progress[String(objectiveIndex)] >= objective.quantity,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-progress', req)) return;
    logRouteError(req, 500, 'Quest progress error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/complete — Complete a quest and claim rewards
router.post('/complete', authGuard, characterGuard, validate(completeQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    const questProgress = await prisma.questProgress.findFirst({
      where: {
        characterId: character.id,
        questId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    if (!questProgress) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    // Validate all objectives are met
    const objectives = questProgress.quest.objectives as { type: string; target: string; quantity: number }[];
    const progress = (questProgress.progress as Record<string, number>) || {};

    for (let i = 0; i < objectives.length; i++) {
      const current = progress[String(i)] || 0;
      if (current < objectives[i].quantity) {
        return res.status(400).json({
          error: `Objective ${i + 1} not complete: ${current}/${objectives[i].quantity} ${objectives[i].target}`,
        });
      }
    }

    // Grant rewards in a transaction
    const rewards = questProgress.quest.rewards as { xp: number; gold: number; items?: string[] };

    await prisma.$transaction(async (tx) => {
      // Grant XP and gold
      await tx.character.update({
        where: { id: character.id },
        data: {
          xp: { increment: rewards.xp },
          gold: { increment: rewards.gold },
        },
      });

      // P2 #51 FIX: Grant item rewards if present
      if (rewards.items && rewards.items.length > 0) {
        for (const itemTemplateName of rewards.items) {
          const template = await tx.itemTemplate.findFirst({
            where: { name: itemTemplateName },
          });
          if (template) {
            const item = await tx.item.create({
              data: {
                templateId: template.id,
                ownerId: character.id,
                currentDurability: template.durability ?? 100,
              },
            });
            const existingInv = await tx.inventory.findFirst({
              where: { characterId: character.id, itemId: item.id },
            });
            if (existingInv) {
              await tx.inventory.update({
                where: { id: existingInv.id },
                data: { quantity: { increment: 1 } },
              });
            } else {
              await tx.inventory.create({
                data: { characterId: character.id, itemId: item.id, quantity: 1 },
              });
            }
          }
        }
      }

      // Mark quest as completed
      await tx.questProgress.update({
        where: { id: questProgress.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    });

    return res.json({
      completed: true,
      quest: {
        id: questProgress.quest.id,
        name: questProgress.quest.name,
      },
      rewards: {
        xp: rewards.xp,
        gold: rewards.gold,
        items: rewards.items ?? [],
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-complete', req)) return;
    logRouteError(req, 500, 'Complete quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/abandon — Abandon an active quest
router.post('/abandon', authGuard, characterGuard, validate(abandonQuestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questId } = req.body;
    const character = req.character!;

    const questProgress = await prisma.questProgress.findFirst({
      where: {
        characterId: character.id,
        questId,
        status: 'IN_PROGRESS',
      },
    });

    if (!questProgress) {
      return res.status(404).json({ error: 'Active quest not found' });
    }

    await prisma.questProgress.delete({ where: { id: questProgress.id } });

    return res.json({ abandoned: true, questId });
  } catch (error) {
    if (handlePrismaError(error, res, 'quest-abandon', req)) return;
    logRouteError(req, 500, 'Abandon quest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/npcs/:townId — List NPCs in a town with their available quests
router.get('/npcs/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const character = req.character!;

    const npcs = await prisma.npc.findMany({
      where: { townId },
      include: {
        town: { select: { id: true, name: true } },
      },
    });

    // Get the character's quest progress to determine available vs completed
    const existingProgress = await prisma.questProgress.findMany({
      where: { characterId: character.id },
      select: { questId: true, status: true },
    });
    const activeIds = new Set(existingProgress.filter((p) => p.status === 'IN_PROGRESS').map((p) => p.questId));
    const completedIds = new Set(existingProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.questId));

    // Fetch quest details for all NPC quest IDs
    const allQuestIds = npcs.flatMap((npc) => npc.questIds);
    const quests = allQuestIds.length > 0
      ? await prisma.quest.findMany({
          where: { id: { in: allQuestIds } },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            levelRequired: true,
            isRepeatable: true,
          },
        })
      : [];
    const questMap = new Map(quests.map((q) => [q.id, q]));

    return res.json({
      npcs: npcs.map((npc) => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        dialog: npc.dialog,
        town: npc.town,
        quests: npc.questIds
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
    if (handlePrismaError(error, res, 'quest-npcs', req)) return;
    logRouteError(req, 500, 'Get NPCs error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
