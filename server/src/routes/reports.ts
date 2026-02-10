import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { getLatestReport, getReportHistory } from '../services/daily-report';

const router = Router();

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

// ---------------------------------------------------------------------------
// GET /api/reports/latest
// ---------------------------------------------------------------------------

router.get('/latest', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const report = await getLatestReport(character.id);

    if (!report) {
      return res.json({ report: null });
    }

    return res.json({ report });
  } catch (error) {
    console.error('Get latest report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/history
// ---------------------------------------------------------------------------

router.get('/history', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 7, 1), 30);
    const reports = await getReportHistory(character.id, limit);

    return res.json({ reports });
  } catch (error) {
    console.error('Get report history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:tickDate
// ---------------------------------------------------------------------------

router.get('/:tickDate', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    console.error('Get report by date error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
