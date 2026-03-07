import { Request, Response } from 'express';
import { DatabaseError } from 'pg';
import { logRouteError } from './error-logger';

export function handleDbError(error: unknown, res: Response, context: string, req?: Request): boolean {
  if (error instanceof DatabaseError) {
    switch (error.code) {
      case '23505': {
        // Unique constraint violation (was Prisma P2002)
        const constraint = error.constraint ?? 'field';
        const message = `Duplicate value for ${constraint}`;
        if (req) logRouteError(req, 409, `[${context}] ${message}`, error);
        res.status(409).json({ error: message });
        return true;
      }
      case '23503': {
        // Foreign key constraint violation (was Prisma P2003)
        const constraint = error.constraint ?? 'reference';
        const message = `Invalid reference: ${constraint}`;
        if (req) logRouteError(req, 400, `[${context}] FK constraint on ${constraint}`, error);
        res.status(400).json({ error: message });
        return true;
      }
    }
  }
  return false;
}
