import { Request } from 'express';
import { Character } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
  character?: Character;
}
