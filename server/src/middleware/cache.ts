import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { AuthenticatedRequest } from '../types/express';

/**
 * Cache middleware factory.
 * Caches the JSON response body in Redis for `ttlSeconds`.
 * Cache key is based on the full URL (path + query string).
 */
export function cache(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redis) return next();

    const key = `cache:${(req as AuthenticatedRequest).user?.userId || 'anon'}:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // Redis error — fall through to handler
      console.error('[Cache] Read error:', err);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis!.setex(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
          console.error('[Cache] Write error:', err);
        });
      }
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
      return originalJson(body);
    };

    next();
  };
}
