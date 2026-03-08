import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { notifications } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// --- GET /api/notifications ---

router.get('/', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const unreadOnly = req.query.unreadOnly === 'true';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const whereClause = unreadOnly
      ? and(eq(notifications.characterId, character.id), eq(notifications.read, false))
      : eq(notifications.characterId, character.id);

    const [notificationRows, [{ total }]] = await Promise.all([
      db.select().from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.timestamp))
        .offset(offset)
        .limit(limit),
      db.select({ total: count() }).from(notifications)
        .where(whereClause),
    ]);

    return res.json({
      notifications: notificationRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (handleDbError(error, res, 'notification-list', req)) return;
    logRouteError(req, 500, 'Get notifications error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PATCH /api/notifications/read-all ---
// NOTE: Must be registered BEFORE /:id/read so Express doesn't match "read-all" as :id

router.patch('/read-all', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const result = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.characterId, character.id), eq(notifications.read, false)));

    return res.json({ updated: result.rowCount ?? 0 });
  } catch (error) {
    if (handleDbError(error, res, 'notification-read-all', req)) return;
    logRouteError(req, 500, 'Mark all notifications read error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PATCH /api/notifications/:id/read ---

router.patch('/:id/read', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, req.params.id),
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.characterId !== character.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notification.id))
      .returning();

    return res.json({ notification: updated });
  } catch (error) {
    if (handleDbError(error, res, 'notification-read', req)) return;
    logRouteError(req, 500, 'Mark notification read error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- DELETE /api/notifications/:id ---

router.delete('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, req.params.id),
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.characterId !== character.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    await db.delete(notifications).where(eq(notifications.id, notification.id));

    return res.json({ message: 'Notification deleted' });
  } catch (error) {
    if (handleDbError(error, res, 'notification-delete', req)) return;
    logRouteError(req, 500, 'Delete notification error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
