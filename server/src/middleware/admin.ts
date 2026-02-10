import { Response, NextFunction } from 'express';
import { authGuard } from './auth';
import { AuthenticatedRequest } from '../types/express';

export function adminGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authGuard(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
