import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

async function getCharacter(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

// --- GET /api/notifications ---

router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {
      characterId: character.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return res.json({
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PATCH /api/notifications/read-all ---
// NOTE: Must be registered BEFORE /:id/read so Express doesn't match "read-all" as :id

router.patch('/read-all', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const result = await prisma.notification.updateMany({
      where: { characterId: character.id, read: false },
      data: { read: true },
    });

    return res.json({ updated: result.count });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PATCH /api/notifications/:id/read ---

router.patch('/:id/read', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.characterId !== character.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });

    return res.json({ notification: updated });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- DELETE /api/notifications/:id ---

router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.characterId !== character.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    await prisma.notification.delete({ where: { id: notification.id } });

    return res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
