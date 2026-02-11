import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * HTTP request logging middleware.
 * Logs method, path, status code, duration, and correlation ID for every request.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: (req as any).id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'request completed');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'request completed');
    } else {
      logger.info(logData, 'request completed');
    }
  });

  next();
}
