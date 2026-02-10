import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
    characterId?: string;
  };
}

/**
 * Socket.io middleware: verify JWT from socket.auth.token.
 * Rejects unauthenticated connections.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
    };

    socket.data.userId = decoded.userId;
    socket.data.username = decoded.username;
    next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}

// ---------------------------------------------------------------------------
// Per-socket rate limiting: max 30 messages per minute
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

export function socketRateLimitMiddleware(socket: Socket, next: (err?: Error) => void) {
  const key = socket.id;
  const now = Date.now();

  let entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    return next(new Error('Rate limit exceeded'));
  }

  next();
}

/**
 * Clean up rate limit entries for disconnected sockets.
 */
export function cleanupRateLimit(socketId: string) {
  rateLimitMap.delete(socketId);
}
