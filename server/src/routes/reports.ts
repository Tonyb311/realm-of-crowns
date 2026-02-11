import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getLatestReport, getReportHistory } from '../services/daily-report';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/reports/latest
// ---------------------------------------------------------------------------

router.get('/latest', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const report = await getLatestReport(character.id);

    if (!report) {
      return res.json({ report: null });
    }

    return res.json({ report });
  } catch (error) {
    if (handlePrismaError(error, res, 'get latest report', req)) return;
    logRouteError(req, 500, 'Get latest report error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/history
// ---------------------------------------------------------------------------

router.get('/history', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 7, 1), 30);
    const reports = await getReportHistory(character.id, limit);

    return res.json({ reports });
  } catch (error) {
    if (handlePrismaError(error, res, 'get report history', req)) return;
    logRouteError(req, 500, 'Get report history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:tickDate
// ---------------------------------------------------------------------------

router.get('/:tickDate', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { tickDate } = req.params;

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tickDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const report = await prisma.dailyReport.findUnique({
      where: {
        characterId_tickDate: { characterId: character.id, tickDate },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'No report found for this date' });
    }

    return res.json({ report });
  } catch (error) {
    if (handlePrismaError(error, res, 'get report by date', req)) return;
    logRouteError(req, 500, 'Get report by date error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
