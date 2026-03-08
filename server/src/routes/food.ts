import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { characters, inventories, items, itemTemplates, marketListings } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/food/inventory
// ---------------------------------------------------------------------------

router.get('/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const foodItems = await db.query.inventories.findMany({
      where: eq(inventories.characterId, character.id),
      with: {
        item: {
          with: {
            itemTemplate: true,
          },
        },
      },
    });

    // Filter to food items in application code (Drizzle doesn't support nested where on relations)
    const filtered = foodItems.filter(inv => inv.item?.itemTemplate?.isFood);

    // Sort by daysRemaining ascending
    filtered.sort((a, b) => (a.item.daysRemaining ?? Infinity) - (b.item.daysRemaining ?? Infinity));

    return res.json({
      food: filtered.map(inv => ({
        inventoryId: inv.id,
        itemId: inv.item.id,
        templateId: inv.item.templateId,
        name: inv.item.itemTemplate.name,
        description: inv.item.itemTemplate.description,
        quantity: inv.quantity,
        daysRemaining: inv.item.daysRemaining,
        isPerishable: inv.item.itemTemplate.isPerishable,
        isBeverage: inv.item.itemTemplate.isBeverage,
        foodBuff: inv.item.itemTemplate.foodBuff,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'food-inventory', req)) return;
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
    if (handleDbError(error, res, 'food-settings', req)) return;
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

    await db.update(characters).set({
      foodPriority,
      preferredFoodId: preferredFoodId ?? null,
    }).where(eq(characters.id, character.id));

    return res.json({
      foodPriority,
      preferredFoodId: preferredFoodId ?? null,
    });
  } catch (error) {
    if (handleDbError(error, res, 'update-food-settings', req)) return;
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

    const listings = await db.query.marketListings.findMany({
      where: eq(marketListings.townId, townId),
      with: {
        item: {
          with: {
            itemTemplate: true,
          },
        },
        character: {
          columns: { id: true, name: true },
        },
      },
    });

    // Filter to food items in application code
    const foodListings = listings.filter(l => l.item?.itemTemplate?.isFood);

    // Sort by price ascending
    foodListings.sort((a, b) => a.price - b.price);

    return res.json({
      listings: foodListings.map(listing => ({
        listingId: listing.id,
        seller: { id: listing.character.id, name: listing.character.name },
        itemId: listing.item.id,
        name: listing.item.itemTemplate.name,
        description: listing.item.itemTemplate.description,
        price: listing.price,
        quantity: listing.quantity,
        daysRemaining: listing.item.daysRemaining,
        shelfLifeDays: listing.item.itemTemplate.shelfLifeDays,
        isPerishable: listing.item.itemTemplate.isPerishable,
        isBeverage: listing.item.itemTemplate.isBeverage,
        foodBuff: listing.item.itemTemplate.foodBuff,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-freshness', req)) return;
    logRouteError(req, 500, 'Market freshness error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
