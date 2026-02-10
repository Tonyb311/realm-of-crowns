import { Router, Response } from 'express';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { prisma } from '../lib/prisma';
import { triggerManualTick } from '../jobs/daily-tick';

const router = Router();

/**
 * POST /api/admin/tick
 * Manually trigger the daily tick processor.
 * Requires authentication + admin role.
 */
router.post('/tick', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`[Admin] Manual tick triggered by user ${req.user!.userId}`);
    const result = await triggerManualTick();

    if (result.success) {
      return res.json({ message: 'Daily tick completed successfully' });
    } else {
      return res.status(500).json({ error: 'Tick failed', details: result.error });
    }
  } catch (error) {
    console.error('[Admin] Tick trigger error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
