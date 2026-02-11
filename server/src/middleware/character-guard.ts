import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { prisma } from '../lib/prisma';

export async function characterGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const character = await prisma.character.findFirst({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!character) {
    return res.status(404).json({ error: 'No character found' });
  }
  req.character = character;
  next();
}
