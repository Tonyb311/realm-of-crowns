import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard, blacklistToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

function generateToken(userId: string, username: string, role: string): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId, username, role }, process.env.JWT_SECRET!, {
    expiresIn: expiresIn as string & jwt.SignOptions['expiresIn'],
  });
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({ error: `A user with that ${field} already exists` });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
    });

    const token = generateToken(user.id, user.username, user.role);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (handlePrismaError(error, res, 'register', req)) return;
    logRouteError(req, 500, 'Registration error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.username, user.role);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    logRouteError(req, 500, 'Login error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me (protected)
router.get('/me', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    logRouteError(req, 500, 'Get user error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization!.split(' ')[1];
    await blacklistToken(token);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logRouteError(req, 500, 'Logout error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
