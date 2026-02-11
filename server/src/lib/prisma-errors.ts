import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { logRouteError } from './error-logger';

/**
 * Handle common Prisma errors and return appropriate HTTP responses.
 * Returns true if the error was handled, false if it's an unknown error
 * that should fall through to the generic 500 handler.
 *
 * When `req` is provided, the error is also written to the ErrorLog table.
 */
export function handlePrismaError(error: unknown, res: Response, context: string, req?: Request): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') ?? 'field';
        const message = `Duplicate value for ${target}`;
        if (req) logRouteError(req, 409, `[${context}] ${message}`, error);
        res.status(409).json({ error: message });
        return true;
      }
      case 'P2003': {
        // Foreign key constraint violation
        const field = (error.meta?.field_name as string) ?? 'reference';
        const message = `Invalid reference: ${field}`;
        if (req) logRouteError(req, 400, `[${context}] FK constraint on ${field}`, error);
        res.status(400).json({ error: message });
        return true;
      }
      case 'P2025': {
        // Record not found (update/delete on non-existent row)
        const message = 'Record not found';
        if (req) logRouteError(req, 404, `[${context}] ${message}`, error);
        res.status(404).json({ error: message });
        return true;
      }
    }
  }
  return false;
}
