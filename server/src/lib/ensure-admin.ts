/**
 * Ensures the admin account exists at server startup.
 * Creates admin@roc.com if missing — prevents lockout after DB resets.
 */

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { logger } from './logger';

const ADMIN_EMAIL = 'admin@roc.com';
const ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RealmAdmin2026!';

export async function ensureAdminAccount(): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      // Always reset password + role so the admin can log in after DB resets
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', passwordHash },
      });
      if (existing.role !== 'admin') {
        logger.warn('Admin account role was not "admin" — fixed');
      }
      return;
    }

    // Admin doesn't exist — create it
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        passwordHash,
        role: 'admin',
        isTestAccount: false,
      },
    });

    logger.warn('Admin account (admin@roc.com) was missing — created automatically');
  } catch (err: any) {
    // Don't crash the server if admin seeding fails (e.g. unique constraint on username)
    logger.error({ err: err.message }, 'Failed to ensure admin account');
  }
}
