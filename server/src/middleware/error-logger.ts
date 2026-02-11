import { Request, Response, NextFunction } from 'express';
import { logError, logWarn, extractRequestContext } from '../lib/error-logger';
import { logger } from '../lib/logger';

/**
 * Attach start time to every request for response time tracking.
 */
export function requestTimingMiddleware(req: Request, _res: Response, next: NextFunction) {
  (req as any).startTime = Date.now();
  next();
}

/**
 * Express error handler (safety net for unhandled errors).
 * Must be registered AFTER all route handlers: app.use(errorHandlerMiddleware)
 */
export function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  const ctx = extractRequestContext(req);
  const statusCode = (res.statusCode && res.statusCode >= 400) ? res.statusCode : 500;

  // Log to database (fire-and-forget)
  logError({
    ...ctx,
    statusCode,
    message: err.message || 'Unhandled server error',
    detail: err.stack,
  });

  logger.error({ err: err.message, endpoint: ctx.endpoint }, 'unhandled server error');

  if (!res.headersSent) {
    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
}

/**
 * Response completion hook — logs slow requests and uncaught 5xx responses.
 */
export function responseLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const startTime = (req as any).startTime as number | undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    // Log slow requests (>2000ms) as WARN
    if (duration > 2000) {
      const ctx = extractRequestContext(req);
      logWarn({
        ...ctx,
        statusCode: res.statusCode,
        message: `Slow request: ${duration}ms`,
      });
    }

    // Log 5xx that somehow weren't caught by route-level handling
    if (res.statusCode >= 500 && duration > 0) {
      const ctx = extractRequestContext(req);
      logError({
        ...ctx,
        statusCode: res.statusCode,
        message: `Uncaught ${res.statusCode} response`,
      });
    }
  });

  next();
}
