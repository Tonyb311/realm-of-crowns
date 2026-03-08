import { Request } from 'express';
import type { characters } from '@database/tables';

type Character = typeof characters.$inferSelect;

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
  character?: Character;
}
