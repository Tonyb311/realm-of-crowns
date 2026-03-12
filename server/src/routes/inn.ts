// ---------------------------------------------------------------------------
// Inn Routes — Tavern Menu & Commerce System
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, sql, count, isNotNull } from 'drizzle-orm';
import {
  buildings, innMenu, characters, inventories, items,
  itemTemplates, townTreasuries,
} from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { getEffectiveTaxRate } from '../services/law-effects';
import { getInnMenuCapacity, getInnTaxMultiplier } from '@shared/data/inn-config';
import { calculateWeightState } from '../services/weight-calculator';
import { emitInnCheckedIn, emitInnCheckedOut, emitInnPatronUpdate } from '../socket/events';
import crypto from 'crypto';

const router = Router();

// --- Zod schemas ---

const stockSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().int().min(1, 'Price must be at least 1'),
});

const setPriceSchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  price: z.number().int().min(1, 'Price must be at least 1'),
});

const withdrawSchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const buySchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

// ============================================================
// GET /api/inn/town/:townId — List INNs in a town (public)
// ============================================================

router.get('/town/:townId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const inns = await db.query.buildings.findMany({
      where: and(
        eq(buildings.townId, townId),
        eq(buildings.type, 'INN'),
      ),
      with: {
        character: { columns: { id: true, name: true } },
        innMenuItems: { columns: { id: true } },
      },
    });

    // Get patron counts per inn via a single query
    const patronCounts = await db.select({
      buildingId: characters.checkedInInnId,
      count: count(),
    })
      .from(characters)
      .where(isNotNull(characters.checkedInInnId))
      .groupBy(characters.checkedInInnId);
    const patronMap = new Map(patronCounts.map(p => [p.buildingId, p.count]));

    // Only show operational inns (level >= 1)
    const operationalInns = inns
      .filter(inn => inn.level >= 1)
      .map(inn => ({
        id: inn.id,
        name: inn.name,
        level: inn.level,
        owner: inn.character,
        menuItemCount: inn.innMenuItems.length,
        patronCount: patronMap.get(inn.id) ?? 0,
      }));

    return res.json({ inns: operationalInns });
  } catch (error) {
    logRouteError(req, 500, 'List town inns error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/inn/:buildingId/menu — View inn menu (public)
// ============================================================

router.get('/:buildingId/menu', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;

    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
      with: { character: { columns: { id: true, name: true } } },
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }

    const menuItems = await db.query.innMenu.findMany({
      where: eq(innMenu.buildingId, buildingId),
      with: { itemTemplate: true },
    });

    // Only show items with quantity > 0 to customers
    const availableItems = menuItems
      .filter(m => m.quantity > 0)
      .map(m => ({
        itemTemplateId: m.itemTemplateId,
        name: m.itemTemplate.name,
        description: m.itemTemplate.description,
        type: m.itemTemplate.type,
        rarity: m.itemTemplate.rarity,
        isFood: m.itemTemplate.isFood,
        isBeverage: m.itemTemplate.isBeverage,
        foodBuff: m.itemTemplate.foodBuff,
        price: m.price,
        quantity: m.quantity,
        weight: m.itemTemplate.weight,
      }));

    return res.json({
      inn: {
        id: building.id,
        name: building.name,
        level: building.level,
        owner: building.character,
      },
      menu: availableItems,
    });
  } catch (error) {
    logRouteError(req, 500, 'View inn menu error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/:buildingId/menu/stock — Owner stocks items
// ============================================================

router.post('/:buildingId/menu/stock', authGuard, characterGuard, validate(stockSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;
    const { itemId, quantity, price } = req.body;

    // Verify building is INN and caller is owner
    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }
    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this inn' });
    }
    if (character.currentTownId !== building.townId) {
      return res.status(400).json({ error: 'You must be in the same town as your inn to stock items.' });
    }

    // Find the item in inventory
    const invEntry = await db.query.inventories.findFirst({
      where: and(
        eq(inventories.characterId, character.id),
        eq(inventories.itemId, itemId),
      ),
      with: { item: { with: { itemTemplate: true } } },
    });

    if (!invEntry) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }
    if (invEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough items. Need ${quantity}, have ${invEntry.quantity}.`,
      });
    }

    const template = invEntry.item.itemTemplate;

    // Only food and beverages allowed
    if (!template.isFood && !template.isBeverage) {
      return res.status(400).json({
        error: 'Only food and beverages can be stocked in an inn.',
      });
    }

    // Check menu capacity for new templates
    const existingMenuItem = await db.query.innMenu.findFirst({
      where: and(
        eq(innMenu.buildingId, buildingId),
        eq(innMenu.itemTemplateId, template.id),
      ),
    });

    if (!existingMenuItem) {
      const [countResult] = await db.select({ value: count() })
        .from(innMenu)
        .where(eq(innMenu.buildingId, buildingId));
      const capacity = getInnMenuCapacity(building.level);
      if (countResult.value >= capacity) {
        return res.status(400).json({
          error: `Menu is full. Level ${building.level} inn supports ${capacity} distinct items.`,
        });
      }
    }

    await db.transaction(async (tx) => {
      // Upsert inn menu: increment quantity if template exists, else create new row
      if (existingMenuItem) {
        await tx.update(innMenu).set({
          quantity: sql`${innMenu.quantity} + ${quantity}`,
          price,
        }).where(eq(innMenu.id, existingMenuItem.id));
      } else {
        await tx.insert(innMenu).values({
          id: crypto.randomUUID(),
          buildingId,
          itemTemplateId: template.id,
          quantity,
          price,
          updatedAt: new Date().toISOString(),
        });
      }

      // Remove from inventory (reverse of cottage withdraw)
      if (invEntry.quantity <= quantity) {
        await tx.delete(inventories).where(eq(inventories.id, invEntry.id));
        await tx.delete(items).where(eq(items.id, invEntry.itemId));
      } else {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} - ${quantity}`,
        }).where(eq(inventories.id, invEntry.id));
      }
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      stocked: { itemTemplateId: template.id, itemName: template.name, quantity, price },
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'inn-stock', req)) return;
    logRouteError(req, 500, 'Inn stock error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/:buildingId/menu/set-price — Owner updates price
// ============================================================

router.post('/:buildingId/menu/set-price', authGuard, characterGuard, validate(setPriceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;
    const { itemTemplateId, price } = req.body;

    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }
    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this inn' });
    }

    const menuItem = await db.query.innMenu.findFirst({
      where: and(
        eq(innMenu.buildingId, buildingId),
        eq(innMenu.itemTemplateId, itemTemplateId),
      ),
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Item not on menu' });
    }

    await db.update(innMenu).set({ price }).where(eq(innMenu.id, menuItem.id));

    return res.json({ updated: { itemTemplateId, newPrice: price } });
  } catch (error) {
    logRouteError(req, 500, 'Inn set-price error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/:buildingId/menu/withdraw — Owner withdraws items
// ============================================================

router.post('/:buildingId/menu/withdraw', authGuard, characterGuard, validate(withdrawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;
    const { itemTemplateId, quantity } = req.body;

    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }
    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this inn' });
    }
    if (character.currentTownId !== building.townId) {
      return res.status(400).json({ error: 'You must be in the same town as your inn to withdraw items.' });
    }

    const menuItem = await db.query.innMenu.findFirst({
      where: and(
        eq(innMenu.buildingId, buildingId),
        eq(innMenu.itemTemplateId, itemTemplateId),
      ),
      with: { itemTemplate: { columns: { id: true, name: true } } },
    });

    if (!menuItem || menuItem.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough on menu. Need ${quantity}, have ${menuItem?.quantity ?? 0}.`,
      });
    }

    await db.transaction(async (tx) => {
      // Decrement or delete menu entry
      if (menuItem.quantity <= quantity) {
        await tx.delete(innMenu).where(eq(innMenu.id, menuItem.id));
      } else {
        await tx.update(innMenu).set({
          quantity: sql`${innMenu.quantity} - ${quantity}`,
        }).where(eq(innMenu.id, menuItem.id));
      }

      // Create item instance from template → add to inventory (cottage withdraw pattern)
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplateId,
        ownerId: character.id,
        quality: 'COMMON',
      }).returning();

      // Try to stack onto existing inventory entry
      const invEntries = await tx.query.inventories.findMany({
        where: eq(inventories.characterId, character.id),
        with: { item: true },
      });
      const existingInv = invEntries.find(e => e.item.templateId === itemTemplateId);

      if (existingInv) {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} + ${quantity}`,
        }).where(eq(inventories.id, existingInv.id));
        await tx.delete(items).where(eq(items.id, item.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: item.id,
          quantity,
        });
      }
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      withdrawn: { itemTemplateId, itemName: menuItem.itemTemplate.name, quantity },
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'inn-withdraw', req)) return;
    logRouteError(req, 500, 'Inn withdraw error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/:buildingId/menu/buy — Customer purchases item
// ============================================================

router.post('/:buildingId/menu/buy', authGuard, characterGuard, validate(buySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;
    const { itemTemplateId, quantity } = req.body;

    // Verify building is an operational INN
    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }
    if (building.level < 1) {
      return res.status(400).json({ error: 'This inn is still under construction.' });
    }
    if (character.currentTownId !== building.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the inn to buy items.' });
    }

    // Verify menu item exists with sufficient quantity
    const menuItem = await db.query.innMenu.findFirst({
      where: and(
        eq(innMenu.buildingId, buildingId),
        eq(innMenu.itemTemplateId, itemTemplateId),
      ),
      with: { itemTemplate: { columns: { id: true, name: true } } },
    });

    if (!menuItem || menuItem.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in stock. Need ${quantity}, have ${menuItem?.quantity ?? 0}.`,
      });
    }

    const totalPrice = menuItem.price * quantity;
    if (character.gold < totalPrice) {
      return res.status(400).json({
        error: `Not enough gold. Need ${totalPrice}, have ${character.gold}.`,
      });
    }

    // Calculate tax split
    const baseTaxRate = await getEffectiveTaxRate(building.townId);
    const effectiveRate = baseTaxRate * getInnTaxMultiplier(building.level);
    const townTaxCut = Math.floor(totalPrice * effectiveRate);
    const ownerShare = totalPrice - townTaxCut;

    await db.transaction(async (tx) => {
      // 1. Deduct gold from buyer
      await tx.update(characters).set({
        gold: sql`${characters.gold} - ${totalPrice}`,
      }).where(eq(characters.id, character.id));

      // 2. Credit owner
      await tx.update(characters).set({
        gold: sql`${characters.gold} + ${ownerShare}`,
      }).where(eq(characters.id, building.ownerId));

      // 3. Credit town treasury
      if (townTaxCut > 0) {
        await tx.update(townTreasuries).set({
          balance: sql`${townTreasuries.balance} + ${townTaxCut}`,
        }).where(eq(townTreasuries.townId, building.townId));
      }

      // 4. Decrement menu quantity (delete row if depleted)
      if (menuItem.quantity <= quantity) {
        await tx.delete(innMenu).where(eq(innMenu.id, menuItem.id));
      } else {
        await tx.update(innMenu).set({
          quantity: sql`${innMenu.quantity} - ${quantity}`,
        }).where(eq(innMenu.id, menuItem.id));
      }

      // 5. Create item instance from template → add to buyer inventory (cottage withdraw pattern)
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplateId,
        ownerId: character.id,
        quality: 'COMMON',
      }).returning();

      const invEntries = await tx.query.inventories.findMany({
        where: eq(inventories.characterId, character.id),
        with: { item: true },
      });
      const existingInv = invEntries.find(e => e.item.templateId === itemTemplateId);

      if (existingInv) {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} + ${quantity}`,
        }).where(eq(inventories.id, existingInv.id));
        await tx.delete(items).where(eq(items.id, item.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: item.id,
          quantity,
        });
      }
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      purchased: {
        itemTemplateId,
        itemName: menuItem.itemTemplate.name,
        quantity,
        totalPrice,
        ownerShare,
        townTaxCut,
      },
      gold: character.gold - totalPrice,
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'inn-buy', req)) return;
    logRouteError(req, 500, 'Inn buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/:buildingId/check-in — Check in to an inn
// ============================================================

router.post('/:buildingId/check-in', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;

    const building = await db.query.buildings.findFirst({
      where: and(eq(buildings.id, buildingId), eq(buildings.type, 'INN')),
    });

    if (!building) {
      return res.status(404).json({ error: 'Inn not found' });
    }
    if (building.level < 1) {
      return res.status(400).json({ error: 'This inn is still under construction.' });
    }
    if (character.currentTownId !== building.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the inn to check in.' });
    }

    // Already checked in here
    if (character.checkedInInnId === buildingId) {
      return res.json({ message: "You're already here.", inn: { id: building.id, name: building.name } });
    }

    const oldInnId = character.checkedInInnId;

    // Set check-in (auto-clears previous)
    await db.update(characters)
      .set({ checkedInInnId: buildingId })
      .where(eq(characters.id, character.id));

    // Emit socket events
    emitInnCheckedIn(character.id, { buildingId, innName: building.name });

    // Update patron counts for new inn (and old if switching)
    const [newCount] = await db.select({ value: count() })
      .from(characters)
      .where(eq(characters.checkedInInnId, buildingId));
    emitInnPatronUpdate(building.townId, { buildingId, patronCount: newCount.value });

    if (oldInnId && oldInnId !== buildingId) {
      const [oldCount] = await db.select({ value: count() })
        .from(characters)
        .where(eq(characters.checkedInInnId, oldInnId));
      emitInnPatronUpdate(building.townId, { buildingId: oldInnId, patronCount: oldCount.value });
    }

    return res.json({
      message: `Checked in to ${building.name}`,
      inn: { id: building.id, name: building.name },
    });
  } catch (error) {
    logRouteError(req, 500, 'Inn check-in error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/inn/check-out — Check out from current inn
// ============================================================

router.post('/check-out', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.checkedInInnId) {
      return res.json({ message: "You're not checked in anywhere." });
    }

    const oldInnId = character.checkedInInnId;

    // Look up the inn's town for the socket broadcast
    const oldInn = await db.query.buildings.findFirst({
      where: eq(buildings.id, oldInnId),
      columns: { townId: true },
    });

    await db.update(characters)
      .set({ checkedInInnId: null })
      .where(eq(characters.id, character.id));

    emitInnCheckedOut(character.id);

    if (oldInn) {
      const [cnt] = await db.select({ value: count() })
        .from(characters)
        .where(eq(characters.checkedInInnId, oldInnId));
      emitInnPatronUpdate(oldInn.townId, { buildingId: oldInnId, patronCount: cnt.value });
    }

    return res.json({ message: 'Checked out.' });
  } catch (error) {
    logRouteError(req, 500, 'Inn check-out error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/inn/:buildingId/presence — Patron count for an inn
// ============================================================

router.get('/:buildingId/presence', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;

    const [result] = await db.select({ value: count() })
      .from(characters)
      .where(eq(characters.checkedInInnId, buildingId));

    return res.json({ count: result.value });
  } catch (error) {
    logRouteError(req, 500, 'Inn presence error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
