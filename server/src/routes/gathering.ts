import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getTodayTickDate, getNextTickTime } from '../lib/game-day';
import { getGatheringSpot } from '@shared/data/gathering';
import { ACTION_XP } from '@shared/data/progression';
import { checkLevelUp } from '../services/progression';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/gathering/spot
// Returns the gathering spot info for the character's current town.
// ---------------------------------------------------------------------------

router.get('/spot', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.currentTownId) {
      return res.json({ spot: null, canGather: false, actionsRemaining: 0, reason: 'traveling' });
    }

    const town = await prisma.town.findUnique({ where: { id: character.currentTownId } });
    if (!town) {
      return res.json({ spot: null, canGather: false, actionsRemaining: 0, reason: 'no_town' });
    }

    const spot = getGatheringSpot(town.name);
    if (!spot) {
      return res.json({ spot: null, canGather: false, actionsRemaining: 0, reason: 'no_spot' });
    }

    const todayTick = getTodayTickDate();
    const existing = await prisma.dailyAction.findFirst({
      where: { characterId: character.id, tickDate: todayTick },
    });

    const canGather = !existing;
    const reason = existing ? 'no_actions' : null;

    return res.json({
      spot: {
        name: spot.name,
        description: spot.description,
        resourceType: spot.resourceType,
        item: {
          name: spot.item.templateName,
          baseValue: spot.item.baseValue,
          icon: spot.item.icon,
          isFood: spot.item.isFood,
        },
        minYield: spot.minYield,
        maxYield: spot.maxYield,
        icon: spot.icon,
      },
      canGather,
      actionsRemaining: canGather ? 1 : 0,
      reason,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'gathering-spot', req)) return;
    logRouteError(req, 500, 'Gathering spot error', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/gathering/gather
// Performs the gathering action. Costs 1 daily action. Returns items immediately.
// ---------------------------------------------------------------------------

router.post('/gather', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Must be in a town
    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to gather.' });
    }

    // Check daily action availability
    const todayTick = getTodayTickDate();
    const existing = await prisma.dailyAction.findFirst({
      where: { characterId: character.id, tickDate: todayTick },
    });
    if (existing) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existing.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // Look up town and spot
    const town = await prisma.town.findUnique({ where: { id: character.currentTownId } });
    if (!town) {
      return res.status(404).json({ error: 'Town not found.' });
    }

    const spot = getGatheringSpot(town.name);
    if (!spot) {
      return res.status(404).json({ error: 'No gathering spot in this town.' });
    }

    // Roll yield
    const quantity = Math.floor(Math.random() * (spot.maxYield - spot.minYield + 1)) + spot.minYield;

    // Transaction: create items + consume daily action
    await prisma.$transaction(async (tx) => {
      // Find or create item template
      let itemTemplate = await tx.itemTemplate.findFirst({
        where: { name: spot.item.templateName },
      });
      if (!itemTemplate) {
        itemTemplate = await tx.itemTemplate.create({
          data: {
            name: spot.item.templateName,
            type: spot.item.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL',
            rarity: 'COMMON',
            description: spot.item.description,
            isFood: spot.item.isFood,
            shelfLifeDays: spot.item.shelfLifeDays,
            isPerishable: spot.item.shelfLifeDays != null,
            foodBuff: spot.item.foodBuff ?? Prisma.JsonNull,
            levelRequired: 1,
          },
        });
      }

      // Find existing inventory slot for this template
      const existingSlot = await tx.inventory.findFirst({
        where: {
          characterId: character.id,
          item: { templateId: itemTemplate.id },
        },
        include: { item: true },
      });

      if (existingSlot) {
        await tx.inventory.update({
          where: { id: existingSlot.id },
          data: { quantity: existingSlot.quantity + quantity },
        });
      } else {
        const item = await tx.item.create({
          data: {
            templateId: itemTemplate.id,
            ownerId: character.id,
            quality: 'COMMON',
            daysRemaining: spot.item.shelfLifeDays,
          },
        });
        await tx.inventory.create({
          data: { characterId: character.id, itemId: item.id, quantity },
        });
      }

      // Create daily action to consume the slot
      await tx.dailyAction.create({
        data: {
          characterId: character.id,
          tickDate: todayTick,
          actionType: 'GATHER',
          actionTarget: { type: 'town_gathering', townId: town.id, spotName: spot.name, itemName: spot.item.templateName, quantity },
          status: 'COMPLETED',
          result: { item: spot.item.templateName, quantity, spotName: spot.name },
        },
      });
    });

    // Award character XP for gathering (base 15 XP, half goes to character)
    const gatherXp = ACTION_XP.WORK_GATHER_BASE;
    const characterXpGain = Math.max(1, Math.floor(gatherXp / 2));
    await prisma.character.update({
      where: { id: character.id },
      data: { xp: { increment: characterXpGain } },
    });
    await checkLevelUp(character.id);

    return res.json({
      success: true,
      gathered: {
        spotName: spot.name,
        item: {
          name: spot.item.templateName,
          icon: spot.item.icon,
          baseValue: spot.item.baseValue,
        },
        quantity,
        message: spot.gatherMessage,
      },
      xpEarned: characterXpGain,
      actionsRemaining: 0,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'gathering-gather', req)) return;
    logRouteError(req, 500, 'Gathering error', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
