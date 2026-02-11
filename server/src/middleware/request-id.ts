import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attach a unique correlation ID to every request.
 * Uses the incoming X-Request-ID header if present, otherwise generates a UUID.
 * The ID is available as req.id and returned in the X-Request-ID response header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
