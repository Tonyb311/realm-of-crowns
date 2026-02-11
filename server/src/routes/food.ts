import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/food/inventory
// ---------------------------------------------------------------------------

router.get('/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const foodItems = await prisma.inventory.findMany({
      where: {
        characterId: character.id,
        item: {
          template: { isFood: true },
        },
      },
      include: {
        item: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                isFood: true,
                isBeverage: true,
                foodBuff: true,
                shelfLifeDays: true,
                isPerishable: true,
              },
            },
          },
        },
      },
      orderBy: { item: { daysRemaining: 'asc' } },
    });

    return res.json({
      food: foodItems.map(inv => ({
        inventoryId: inv.id,
        itemId: inv.item.id,
        templateId: inv.item.templateId,
        name: inv.item.template.name,
        description: inv.item.template.description,
        quantity: inv.quantity,
        daysRemaining: inv.item.daysRemaining,
        isPerishable: inv.item.template.isPerishable,
        isBeverage: inv.item.template.isBeverage,
        foodBuff: inv.item.template.foodBuff,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'food-inventory', req)) return;
    logRouteError(req, 500, 'Food inventory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/food/settings
// ---------------------------------------------------------------------------

router.get('/settings', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    return res.json({
      foodPriority: character.foodPriority ?? 'EXPIRING_FIRST',
      preferredFoodId: character.preferredFoodId,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'food-settings', req)) return;
    logRouteError(req, 500, 'Food settings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/food/settings
// ---------------------------------------------------------------------------

const updateFoodSettingsSchema = z.object({
  foodPriority: z.enum(['EXPIRING_FIRST', 'BEST_FIRST', 'SPECIFIC_ITEM', 'CATEGORY_ONLY']),
  preferredFoodId: z.string().nullable().optional(),
});

router.put('/settings', authGuard, characterGuard, validate(updateFoodSettingsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { foodPriority, preferredFoodId } = req.body;

    await prisma.character.update({
      where: { id: character.id },
      data: {
        foodPriority,
        preferredFoodId: preferredFoodId ?? null,
      },
    });

    return res.json({
      foodPriority,
      preferredFoodId: preferredFoodId ?? null,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'update-food-settings', req)) return;
    logRouteError(req, 500, 'Update food settings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/food/market-freshness/:townId
// ---------------------------------------------------------------------------

router.get('/market-freshness/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { townId } = req.params;

    const listings = await prisma.marketListing.findMany({
      where: {
        townId,
        item: {
          template: { isFood: true },
        },
      },
      include: {
        item: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                isFood: true,
                isBeverage: true,
                foodBuff: true,
                shelfLifeDays: true,
                isPerishable: true,
              },
            },
          },
        },
        seller: {
          select: { id: true, name: true },
        },
      },
      orderBy: { price: 'asc' },
    });

    return res.json({
      listings: listings.map(listing => ({
        listingId: listing.id,
        seller: { id: listing.seller.id, name: listing.seller.name },
        itemId: listing.item.id,
        name: listing.item.template.name,
        description: listing.item.template.description,
        price: listing.price,
        quantity: listing.quantity,
        daysRemaining: listing.item.daysRemaining,
        shelfLifeDays: listing.item.template.shelfLifeDays,
        isPerishable: listing.item.template.isPerishable,
        isBeverage: listing.item.template.isBeverage,
        foodBuff: listing.item.template.foodBuff,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-freshness', req)) return;
    logRouteError(req, 500, 'Market freshness error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
