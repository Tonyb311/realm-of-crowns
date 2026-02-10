import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import { Prisma } from '@prisma/client';

const router = Router();

// --- Schemas ---

const updateRoleSchema = z.object({
  role: z.enum(['player', 'admin', 'moderator']),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * GET /api/admin/users
 * Paginated user list with optional search.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { characters: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[Admin] Users list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/:id
 * User detail with characters.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            level: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('[Admin] User detail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update a user's role.
 */
router.patch('/:id/role', validate(updateRoleSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, username: true, role: true },
    });

    console.log(`[Admin] User ${updated.username} role changed to ${role} by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    console.error('[Admin] Update role error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset a user's password.
 */
router.post('/:id/reset-password', validate(resetPasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    console.log(`[Admin] Password reset for user ${user.username} by admin ${req.user!.userId}`);
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[Admin] Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
