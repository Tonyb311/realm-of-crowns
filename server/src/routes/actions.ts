import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import {
  lockInAction,
  getLockedAction,
  cancelAction,
  getAvailableActions,
  validateCombatParams,
  combatParamsSchema,
} from '../services/action-lock-in';
import { Prisma } from '@prisma/client';
import { emitActionLockedIn, emitActionCancelled } from '../socket/events';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/actions/lock-in
// ---------------------------------------------------------------------------

const lockInSchema = z.object({
  actionType: z.enum(['GATHER', 'CRAFT', 'TRAVEL', 'GUARD', 'AMBUSH', 'ENLIST', 'PROPOSE_LAW', 'REST']),
  actionTarget: z.record(z.string(), z.unknown()).default({}),
  combatParams: combatParamsSchema.optional(),
});

router.post('/lock-in', authGuard, characterGuard, validate(lockInSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { actionType, actionTarget, combatParams } = req.body;

    const result = await lockInAction(
      character.id,
      actionType,
      actionTarget,
      combatParams,
    );

    emitActionLockedIn(character.id, {
      actionType: result.actionType,
      actionTarget: result.actionTarget as Record<string, unknown>,
    });

    return res.status(201).json({ action: result });
  } catch (error) {
    if (handlePrismaError(error, res, 'lock-in-action', req)) return;
    if (error instanceof Error) {
      if (error.message.includes('INCAPACITATED') || error.message.includes('not found')) {
        return res.status(400).json({ error: error.message });
      }
    }
    logRouteError(req, 500, 'Lock-in action error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/actions/current
// ---------------------------------------------------------------------------

router.get('/current', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const action = await getLockedAction(character.id);

    if (!action) {
      return res.json({ action: null, defaultAction: 'REST' });
    }

    return res.json({ action });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-current-action', req)) return;
    logRouteError(req, 500, 'Get current action error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/actions/current
// ---------------------------------------------------------------------------

router.delete('/current', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    await cancelAction(character.id);

    emitActionCancelled(character.id, { defaultAction: 'REST' });

    return res.json({ cancelled: true, defaultAction: 'REST' });
  } catch (error) {
    if (handlePrismaError(error, res, 'cancel-action', req)) return;
    logRouteError(req, 500, 'Cancel action error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/actions/available
// ---------------------------------------------------------------------------

router.get('/available', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const result = await getAvailableActions(character.id);
    return res.json(result);
  } catch (error) {
    if (handlePrismaError(error, res, 'available-actions', req)) return;
    logRouteError(req, 500, 'Available actions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/actions/combat-params
// ---------------------------------------------------------------------------

const updateCombatParamsSchema = z.object({
  combatStance: z.enum(['AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'EVASIVE']).optional(),
  retreatHpThreshold: z.number().min(0).max(1).optional(),
  retreatOppositionRatio: z.number().min(0).optional(),
  retreatRoundLimit: z.number().int().min(1).optional(),
  neverRetreat: z.boolean().optional(),
  abilityPriorityQueue: z.array(z.string()).optional(),
  itemUsageRules: z.record(z.string(), z.unknown()).optional(),
  pvpLootBehavior: z.string().optional(),
});

router.put('/combat-params', authGuard, characterGuard, validate(updateCombatParamsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const params = validateCombatParams(req.body);

    await prisma.character.update({
      where: { id: character.id },
      data: {
        combatStance: params.combatStance,
        retreatHpThreshold: params.retreatHpThreshold,
        retreatOppositionRatio: params.retreatOppositionRatio,
        retreatRoundLimit: params.retreatRoundLimit,
        neverRetreat: params.neverRetreat,
        abilityPriorityQueue: params.abilityPriorityQueue,
        itemUsageRules: params.itemUsageRules as Prisma.InputJsonValue | undefined,
        pvpLootBehavior: params.pvpLootBehavior,
      },
    });

    return res.json({ combatParams: params });
  } catch (error) {
    if (handlePrismaError(error, res, 'update-combat-params', req)) return;
    logRouteError(req, 500, 'Update combat params error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/actions/combat-params
// ---------------------------------------------------------------------------

router.get('/combat-params', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const data = await prisma.character.findUnique({
      where: { id: character.id },
      select: {
        combatStance: true,
        retreatHpThreshold: true,
        retreatOppositionRatio: true,
        retreatRoundLimit: true,
        neverRetreat: true,
        abilityPriorityQueue: true,
        itemUsageRules: true,
        pvpLootBehavior: true,
      },
    });

    return res.json({ combatParams: data });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-combat-params', req)) return;
    logRouteError(req, 500, 'Get combat params error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
