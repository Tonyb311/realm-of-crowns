import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/express';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Blacklist a JWT token in Redis with TTL matching its remaining lifetime.
 * Falls back silently if Redis is unavailable.
 */
export async function blacklistToken(token: string): Promise<void> {
  if (!redis) return;
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return; // already expired
    await redis.setex(`${TOKEN_BLACKLIST_PREFIX}${token}`, ttl, '1');
  } catch {
    // Silently fail -- worst case the token remains valid until natural expiry
  }
}

/**
 * Check if a token has been blacklisted.
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch {
    return false; // Redis down -- allow request through
  }
}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ path: req.originalUrl, ip: req.ip }, 'auth failed: missing or malformed Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check blacklist before verifying (cheaper than verify if blacklisted)
    if (await isTokenBlacklisted(token)) {
      logger.warn({ path: req.originalUrl, ip: req.ip }, 'auth failed: token has been revoked');
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
      role: string;
    };

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role || 'player',
    };

    next();
  } catch {
    logger.warn({ path: req.originalUrl, ip: req.ip }, 'auth failed: invalid or expired token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
