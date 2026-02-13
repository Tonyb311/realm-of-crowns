import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import { triggerManualTick } from '../../jobs/daily-tick';
import { getGameDay, getTodayTickDate, getGameDayOffset, resetGameDayOffset } from '../../lib/game-day';
import { getIO } from '../../socket/events';

const router = Router();

// --- Schemas ---

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
});

/**
 * POST /api/admin/tools/tick
 * Manually trigger the daily tick processor.
 */
router.post('/tick', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`[Admin] Manual tick triggered by admin ${req.user!.userId}`);
    const result = await triggerManualTick();

    if (result.success) {
      return res.json({
        message: 'Daily tick completed successfully',
        result: result.result,
      });
    } else {
      return res.status(500).json({ error: 'Tick failed', details: result.error });
    }
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-trigger-tick', req)) return;
    logRouteError(req, 500, '[Admin] Tick trigger error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/tools/broadcast
 * Send a system-wide broadcast message.
 */
router.post('/broadcast', validate(broadcastSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message } = req.body;

    // Emit to all connected clients via Socket.io
    try {
      const io = getIO();
      io.emit('system:broadcast', { title, message, timestamp: new Date().toISOString() });
    } catch {
      // Socket may not be initialized in test/dev environments
    }

    // Create a system Message record
    // System messages use the SYSTEM channel with the admin's user as sender.
    // We need a character to be the sender. Use the admin's active character if available.
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { activeCharacterId: true, characters: { select: { id: true }, take: 1 } },
    });

    const senderId = adminUser?.activeCharacterId ?? adminUser?.characters[0]?.id;

    if (senderId) {
      await prisma.message.create({
        data: {
          channelType: 'SYSTEM',
          content: `[${title}] ${message}`,
          senderId,
        },
      });
    }

    console.log(`[Admin] System broadcast sent by admin ${req.user!.userId}: "${title}"`);
    return res.json({ message: 'Broadcast sent successfully' });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-broadcast', req)) return;
    logRouteError(req, 500, '[Admin] Broadcast error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/tools/health
 * Server health check.
 */
router.get('/health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let dbConnected = false;
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    return res.json({
      status: dbConnected ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      dbStatus: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-health-check', req)) return;
    logRouteError(req, 500, '[Admin] Health check error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/tools/game-day
 * Get current game day information.
 */
router.get('/game-day', async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      gameDay: getGameDay(),
      tickDate: getTodayTickDate().toISOString().slice(0, 10),
      offset: getGameDayOffset(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/tools/reset-game-day
 * Reset the game day offset back to 0 (real-time).
 */
router.post('/reset-game-day', async (req: AuthenticatedRequest, res: Response) => {
  try {
    resetGameDayOffset();
    console.log(`[Admin] Game day offset reset by admin ${req.user!.userId}`);
    return res.json({
      message: 'Game day offset reset to 0',
      gameDay: getGameDay(),
      tickDate: getTodayTickDate().toISOString().slice(0, 10),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
