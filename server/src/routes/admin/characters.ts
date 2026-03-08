import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { eq, and, gte, lte, like, desc, count, sql } from 'drizzle-orm';
import { characters, towns } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

// --- Schemas ---

const editCharacterSchema = z.object({
  level: z.number().int().min(1).max(100).optional(),
  xp: z.number().int().min(0).optional(),
  gold: z.number().min(0).optional(),
  health: z.number().int().min(0).optional(),
  maxHealth: z.number().int().min(1).optional(),
  currentTownId: z.string().optional(),
  unspentStatPoints: z.number().int().min(0).optional(),
});

const teleportSchema = z.object({
  townId: z.string().min(1, 'townId is required'),
});

const giveGoldSchema = z.object({
  amount: z.number({ error: 'amount is required' }),
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
    const offset = (page - 1) * pageSize;

    const conditions: ReturnType<typeof eq>[] = [];
    if (search) conditions.push(like(sql`lower(${characters.name})`, `%${search.toLowerCase()}%`));
    if (race) conditions.push(eq(characters.race, race as any));
    if (characterClass) conditions.push(eq(characters.class, characterClass));
    if (minLevel !== undefined) conditions.push(gte(characters.level, minLevel));
    if (maxLevel !== undefined) conditions.push(lte(characters.level, maxLevel));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      db.query.characters.findMany({
        where,
        offset,
        limit: pageSize,
        orderBy: desc(characters.createdAt),
        with: {
          user: { columns: { id: true, username: true } },
          town_currentTownId: { columns: { id: true, name: true } },
        },
      }),
      db.select({ total: count() }).from(characters).where(where),
    ]);

    // Reshape to match Prisma's shape: currentTown instead of town_currentTownId
    const transformed = data.map(d => ({
      ...d,
      currentTown: d.town_currentTownId,
    }));

    return res.json({
      data: transformed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-list-characters', req)) return;
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
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, req.params.id),
      with: {
        user: { columns: { id: true, username: true } },
        town_currentTownId: { columns: { id: true, name: true } },
        playerProfessions: true,
        inventories: {
          with: {
            item: { with: { itemTemplate: true } },
          },
        },
        characterEquipments: {
          with: {
            item: { with: { itemTemplate: true } },
          },
        },
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Reshape to match Prisma naming
    const result = {
      ...character,
      currentTown: character.town_currentTownId,
      professions: character.playerProfessions,
      inventory: character.inventories.map(inv => ({
        ...inv,
        item: { ...inv.item, template: inv.item?.itemTemplate },
      })),
      equipment: character.characterEquipments.map(eq => ({
        ...eq,
        item: { ...eq.item, template: eq.item?.itemTemplate },
      })),
    };

    return res.json(result);
  } catch (error) {
    if (handleDbError(error, res, 'admin-character-detail', req)) return;
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
    const character = await db.query.characters.findFirst({ where: eq(characters.id, req.params.id) });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const [updated] = await db.update(characters)
      .set(req.body)
      .where(eq(characters.id, req.params.id))
      .returning();

    console.log(`[Admin] Character ${character.name} edited by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handleDbError(error, res, 'admin-edit-character', req)) return;
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

    const character = await db.query.characters.findFirst({ where: eq(characters.id, req.params.id) });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    await db.update(characters)
      .set({ currentTownId: townId })
      .where(eq(characters.id, req.params.id));

    const updated = await db.query.characters.findFirst({
      where: eq(characters.id, req.params.id),
      with: { town_currentTownId: { columns: { id: true, name: true } } },
    });

    console.log(`[Admin] Character ${character.name} teleported to ${town.name} by admin ${req.user!.userId}`);
    return res.json({
      message: `Character teleported to ${town.name}`,
      character: { ...updated, currentTown: updated?.town_currentTownId },
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-teleport', req)) return;
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

    const character = await db.query.characters.findFirst({ where: eq(characters.id, req.params.id) });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const newGold = character.gold + amount;
    if (newGold < 0) {
      return res.status(400).json({
        error: `Cannot remove ${Math.abs(amount)} gold. Character only has ${character.gold} gold.`,
      });
    }

    const [updated] = await db.update(characters)
      .set({ gold: sql`${characters.gold} + ${amount}` })
      .where(eq(characters.id, req.params.id))
      .returning({ id: characters.id, name: characters.name, gold: characters.gold });

    console.log(`[Admin] Character ${character.name} gold adjusted by ${amount} (now ${updated.gold}) by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handleDbError(error, res, 'admin-give-gold', req)) return;
    logRouteError(req, 500, '[Admin] Give gold error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
