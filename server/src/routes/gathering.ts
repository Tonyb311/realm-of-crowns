import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getTodayTickDate, getNextTickTime } from '../lib/game-day';
import { getGatheringSpot } from '@shared/data/gathering';
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
    const actionType = existing?.actionType || null;
    const actionStatus = existing?.status || null;

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
      committedAction: existing ? {
        type: actionType,
        status: actionStatus,
        target: existing.actionTarget,
      } : null,
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

    // Create LOCKED_IN daily action — items and XP are awarded at tick resolution
    await prisma.dailyAction.create({
      data: {
        characterId: character.id,
        tickDate: todayTick,
        actionType: 'GATHER',
        actionTarget: {
          type: 'town_gathering',
          townId: town.id,
          spotName: spot.name,
          itemName: spot.item.templateName,
          templateName: spot.item.templateName,
          itemType: spot.item.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL',
          isFood: spot.item.isFood,
          shelfLifeDays: spot.item.shelfLifeDays,
          description: spot.item.description,
          foodBuff: spot.item.foodBuff ?? null,
          minYield: spot.minYield,
          maxYield: spot.maxYield,
        },
        status: 'LOCKED_IN',
      },
    });

    return res.json({
      success: true,
      committed: true,
      action: 'GATHER',
      spotName: spot.name,
      itemName: spot.item.templateName,
      message: `You've committed to gathering ${spot.item.templateName}. Results will be available after the tick resolves.`,
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'gathering-gather', req)) return;
    logRouteError(req, 500, 'Gathering error', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
