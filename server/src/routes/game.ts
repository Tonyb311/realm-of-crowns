import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { prisma } from '../lib/prisma';
import { getGameDay, getNextTickTime, getTimeUntilReset, getTodayTickDate } from '../lib/game-day';

const router = Router();

// GET /day — Current game day info
router.get('/day', (_req, res) => {
  return res.json({
    gameDay: getGameDay(),
    nextTickAt: getNextTickTime().toISOString(),
    timeUntilResetMs: getTimeUntilReset(),
  });
});

// GET /action-status — Whether character has used daily action
router.get('/action-status', authGuard, async (req: AuthenticatedRequest, res) => {
  const character = await prisma.character.findFirst({
    where: { userId: req.user!.userId },
  });
  if (!character) return res.status(404).json({ error: 'No character found' });

  const todayTick = getTodayTickDate();
  const action = await prisma.dailyAction.findFirst({
    where: { characterId: character.id, tickDate: todayTick },
  });

  return res.json({
    gameDay: getGameDay(),
    actionUsed: !!action,
    actionType: action?.actionType || null,
    resetsAt: getNextTickTime().toISOString(),
    timeUntilResetMs: getTimeUntilReset(),
  });
});

export default router;
