import { Router, type Response, type Request } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { townMetrics } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { METRIC_LABELS, METRIC_DESCRIPTIONS, ACTIVE_METRICS, type TownMetricType } from '@shared/data/town-metrics-config';

const router = Router();

// ============================================================
// GET /api/town-metrics/:townId — View all town metrics
// ============================================================

router.get('/:townId', async (req: Request, res: Response) => {
  try {
    const { townId } = req.params;

    const metrics = await db.query.townMetrics.findMany({
      where: eq(townMetrics.townId, townId),
    });

    const enriched = metrics.map(m => {
      const metricType = m.metricType as TownMetricType;
      return {
        id: m.id,
        townId: m.townId,
        metricType,
        label: METRIC_LABELS[metricType] ?? metricType,
        description: METRIC_DESCRIPTIONS[metricType] ?? '',
        baseValue: m.baseValue,
        modifier: m.modifier,
        effectiveValue: m.effectiveValue,
        lastUpdatedBy: m.lastUpdatedBy,
        isActive: ACTIVE_METRICS.includes(metricType),
      };
    });

    return res.json({ townId, metrics: enriched });
  } catch (error) {
    if (handleDbError(error, res, 'town-metrics', req)) return;
    logRouteError(req, 500, 'Town metrics error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
