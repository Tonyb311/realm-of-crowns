import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '../lib/metrics';

/**
 * Middleware that records HTTP request duration for Prometheus.
 * Normalizes paths to prevent high-cardinality labels (replaces UUIDs with :id).
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    // Normalize UUIDs and numeric IDs in the path to reduce cardinality
    const normalizedPath = req.route?.path
      || req.originalUrl.split('?')[0].replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id'
      );

    end({
      method: req.method,
      path: normalizedPath,
      status_code: res.statusCode,
    });
  });

  next();
}
