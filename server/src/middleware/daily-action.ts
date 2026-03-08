import { Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { characters, dailyActions } from '@database/tables';
import { AuthenticatedRequest } from '../types/express';
import { getNextTickTime, getTodayTickDate } from '../lib/game-day';

/**
 * Middleware that enforces the one-major-action-per-day rule.
 * Attaches `req.character` and `req.dailyActionType` on success.
 *
 * Usage:  router.post('/gather', authGuard, requireDailyAction('GATHER'), handler)
 */
export function requireDailyAction(actionType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const character = await db.query.characters.findFirst({
        where: eq(characters.userId, req.user!.userId),
      });

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const todayTick = getTodayTickDate();

      // Check if character already has a major action for today
      const existing = await db.query.dailyActions.findFirst({
        where: and(
          eq(dailyActions.characterId, character.id),
          eq(dailyActions.tickDate, todayTick.toISOString()),
        ),
      });

      if (existing) {
        return res.status(429).json({
          error: 'Daily action already used',
          actionType: existing.actionType,
          resetsAt: getNextTickTime().toISOString(),
        });
      }

      // Attach character and action info for downstream route handlers
      (req as any).character = character;
      (req as any).dailyActionType = actionType;
      next();
    } catch (err) {
      console.error('[requireDailyAction] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
