import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { db } from '../lib/db';
import { eq, asc } from 'drizzle-orm';
import { characters } from '@database/tables';

/**
 * Middleware: reject mutating requests if the character is currently traveling.
 * GET requests pass through so players can still view data while on the road.
 * Place AFTER characterGuard in the middleware chain.
 */
export function requireTown(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.character && req.character.travelStatus !== 'idle') {
    return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
  }
  next();
}

export async function characterGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const character = await db.query.characters.findFirst({
    where: eq(characters.userId, req.user!.userId),
    orderBy: asc(characters.createdAt),
  });
  if (!character) {
    return res.status(404).json({ error: 'No character found' });
  }
  req.character = character;
  next();
}
