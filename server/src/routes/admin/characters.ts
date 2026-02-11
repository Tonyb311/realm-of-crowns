import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import { Prisma } from '@prisma/client';

const router = Router();

// --- Schemas ---

const editCharacterSchema = z.object({
  level: z.number().int().min(1).max(100).optional(),
  xp: z.number().int().min(0).optional(),
  gold: z.number().min(0).optional(),
  health: z.number().int().min(0).optional(),
  maxHealth: z.number().int().min(1).optional(),
  mana: z.number().int().min(0).optional(),
  maxMana: z.number().int().min(0).optional(),
  currentTownId: z.string().optional(),
  unspentStatPoints: z.number().int().min(0).optional(),
  unspentSkillPoints: z.number().int().min(0).optional(),
});

const teleportSchema = z.object({
  townId: z.string().min(1, 'townId is required'),
});

const giveGoldSchema = z.object({
  amount: z.number({ required_error: 'amount is required' }),
});

/**
 * GET /api/admin/characters
 * Paginated character list with filters.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
    const search = req.query.search as string | undefined;
    const race = req.query.race as string | undefined;
    const characterClass = req.query.characterClass as string | undefined;
    const minLevel = req.query.minLevel ? parseInt(req.query.minLevel as string, 10) : undefined;
    const maxLevel = req.query.maxLevel ? parseInt(req.query.maxLevel as string, 10) : undefined;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CharacterWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(race ? { race: race as any } : {}),
      ...(characterClass ? { class: characterClass } : {}),
      ...(minLevel !== undefined || maxLevel !== undefined
        ? {
            level: {
              ...(minLevel !== undefined ? { gte: minLevel } : {}),
              ...(maxLevel !== undefined ? { lte: maxLevel } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
          currentTown: { select: { id: true, name: true } },
        },
      }),
      prisma.character.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-list-characters', req)) return;
    logRouteError(req, 500, '[Admin] Characters list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/characters/:id
 * Full character detail.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true } },
        currentTown: { select: { id: true, name: true } },
        professions: true,
        inventory: {
          include: {
            item: { include: { template: true } },
          },
        },
        equipment: {
          include: {
            item: { include: { template: true } },
          },
        },
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    return res.json(character);
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-character-detail', req)) return;
    logRouteError(req, 500, '[Admin] Character detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/characters/:id
 * Edit character fields.
 */
router.patch('/:id', validate(editCharacterSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: req.body,
    });

    console.log(`[Admin] Character ${character.name} edited by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-edit-character', req)) return;
    logRouteError(req, 500, '[Admin] Edit character error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/characters/:id/teleport
 * Teleport a character to a town.
 */
router.post('/:id/teleport', validate(teleportSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.body;

    const character = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const town = await prisma.town.findUnique({ where: { id: townId } });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { currentTownId: townId },
      include: { currentTown: { select: { id: true, name: true } } },
    });

    console.log(`[Admin] Character ${character.name} teleported to ${town.name} by admin ${req.user!.userId}`);
    return res.json({ message: `Character teleported to ${town.name}`, character: updated });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-teleport', req)) return;
    logRouteError(req, 500, '[Admin] Teleport error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/characters/:id/give-gold
 * Give (or remove) gold from a character.
 */
router.post('/:id/give-gold', validate(giveGoldSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body;

    const character = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const newGold = character.gold + amount;
    if (newGold < 0) {
      return res.status(400).json({
        error: `Cannot remove ${Math.abs(amount)} gold. Character only has ${character.gold} gold.`,
      });
    }

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { gold: { increment: amount } },
      select: { id: true, name: true, gold: true },
    });

    console.log(`[Admin] Character ${character.name} gold adjusted by ${amount} (now ${updated.gold}) by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-give-gold', req)) return;
    logRouteError(req, 500, '[Admin] Give gold error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
