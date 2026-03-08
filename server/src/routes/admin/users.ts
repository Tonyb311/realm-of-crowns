import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../../lib/db';
import { eq, or, like, desc, count, sql } from 'drizzle-orm';
import { users, characters } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';

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
    const offset = (page - 1) * pageSize;

    const where = search
      ? or(
          like(sql`lower(${users.username})`, `%${search.toLowerCase()}%`),
          like(sql`lower(${users.email})`, `%${search.toLowerCase()}%`),
        )
      : undefined;

    const [data, [{ total }]] = await Promise.all([
      db.query.users.findMany({
        where,
        offset,
        limit: pageSize,
        orderBy: desc(users.createdAt),
        columns: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          characters: {
            columns: { id: true },
          },
        },
      }),
      db.select({ total: count() }).from(users).where(where),
    ]);

    // Transform to match Prisma's _count format
    const transformed = data.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      _count: { characters: u.characters.length },
    }));

    return res.json({
      data: transformed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-list-users', req)) return;
    logRouteError(req, 500, '[Admin] Users list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/:id
 * User detail with characters.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        characters: {
          columns: {
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
    if (handleDbError(error, res, 'admin-user-detail', req)) return;
    logRouteError(req, 500, '[Admin] User detail error', error);
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

    const user = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updated] = await db.update(users)
      .set({ role })
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id, username: users.username, role: users.role });

    console.log(`[Admin] User ${updated.username} role changed to ${role} by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handleDbError(error, res, 'admin-update-role', req)) return;
    logRouteError(req, 500, '[Admin] Update role error', error);
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

    const user = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, req.params.id));

    console.log(`[Admin] Password reset for user ${user.username} by admin ${req.user!.userId}`);
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (handleDbError(error, res, 'admin-reset-password', req)) return;
    logRouteError(req, 500, '[Admin] Reset password error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
