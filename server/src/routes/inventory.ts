import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, sql, asc } from 'drizzle-orm';
import { droppedItems, inventories, items, itemTemplates } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { calculateWeightState } from '../services/weight-calculator';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const dropSchema = z.object({
  inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
  quantity: z.number().int().positive().optional(),
});

const recoverSchema = z.object({
  dropId: z.string().min(1, 'Drop ID is required'),
});

// ---------------------------------------------------------------------------
// POST /api/inventory/drop — Drop item(s) from inventory
// ---------------------------------------------------------------------------
router.post('/drop', authGuard, characterGuard, validate(dropSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { inventoryItemId, quantity: requestedQty } = req.body as { inventoryItemId: string; quantity?: number };
    const character = req.character!;

    // 1. Find the inventory entry, verify ownership
    // Frontend sends itemId (not inventory entry id), so look up by itemId
    const inventoryEntry = await db.query.inventories.findFirst({
      where: and(
        eq(inventories.itemId, inventoryItemId),
        eq(inventories.characterId, character.id),
      ),
    });

    if (!inventoryEntry) {
      return res.status(404).json({ error: 'Inventory entry not found' });
    }

    // 2. Load item + template to get name and weight
    const item = await db.query.items.findFirst({
      where: eq(items.id, inventoryEntry.itemId),
      with: { itemTemplate: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // 3. Determine quantity to drop
    const dropQty = requestedQty ?? inventoryEntry.quantity;
    if (dropQty > inventoryEntry.quantity) {
      return res.status(400).json({
        error: `Cannot drop ${dropQty} — you only have ${inventoryEntry.quantity}`,
      });
    }

    // 4. Transaction: decrease inventory + create drop record
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const dropId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      // Decrease or remove inventory entry
      if (dropQty >= inventoryEntry.quantity) {
        await tx.delete(inventories).where(eq(inventories.id, inventoryEntry.id));
      } else {
        await tx.update(inventories)
          .set({ quantity: inventoryEntry.quantity - dropQty })
          .where(eq(inventories.id, inventoryEntry.id));
      }

      // Create dropped item record
      await tx.insert(droppedItems).values({
        id: dropId,
        characterId: character.id,
        itemTemplateId: item.templateId,
        itemTemplateName: item.itemTemplate.name,
        quantity: dropQty,
        weight: (item.itemTemplate.weight ?? 0) * dropQty,
        expiresAt,
      });
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      dropped: {
        dropId,
        itemTemplateName: item.itemTemplate.name,
        quantity: dropQty,
        expiresAt,
      },
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'inventory-drop', req)) return;
    logRouteError(req, 500, 'Drop item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/inventory/recover — Recover a dropped item before expiry
// ---------------------------------------------------------------------------
router.post('/recover', authGuard, characterGuard, validate(recoverSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dropId } = req.body as { dropId: string };
    const character = req.character!;

    // 1. Find the drop record, verify ownership
    const dropRecord = await db.query.droppedItems.findFirst({
      where: and(
        eq(droppedItems.id, dropId),
        eq(droppedItems.characterId, character.id),
      ),
    });

    if (!dropRecord) {
      return res.status(404).json({ error: 'Drop record not found' });
    }

    // 2. Check expiry
    if (new Date(dropRecord.expiresAt) <= new Date()) {
      return res.status(400).json({ error: 'Recovery window has expired' });
    }

    // 3. Load template to create fresh item
    const template = await db.query.itemTemplates.findFirst({
      where: eq(itemTemplates.id, dropRecord.itemTemplateId),
    });

    if (!template) {
      return res.status(400).json({ error: 'Item template no longer exists' });
    }

    // 4. Transaction: create item + add to inventory + delete drop record
    await db.transaction(async (tx) => {
      // Create a fresh item from template
      const newItemId = crypto.randomUUID();
      await tx.insert(items).values({
        id: newItemId,
        templateId: template.id,
        ownerId: character.id,
        quality: 'COMMON',
        currentDurability: template.durability ?? 100,
        enchantments: [],
      });

      // Add to inventory — try to stack with existing entry of same template
      const allInv = await tx.query.inventories.findMany({
        where: eq(inventories.characterId, character.id),
        with: { item: true },
      });
      const existingInv = allInv.find(e => e.item?.templateId === template.id);

      if (existingInv) {
        await tx.update(inventories)
          .set({ quantity: existingInv.quantity + dropRecord.quantity })
          .where(eq(inventories.id, existingInv.id));
        // Delete the extra item since we're stacking
        await tx.delete(items).where(eq(items.id, newItemId));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: newItemId,
          quantity: dropRecord.quantity,
        });
      }

      // Delete drop record
      await tx.delete(droppedItems).where(eq(droppedItems.id, dropRecord.id));
    });

    const weightState = await calculateWeightState(character.id);

    return res.json({
      recovered: {
        itemTemplateName: dropRecord.itemTemplateName,
        quantity: dropRecord.quantity,
      },
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'inventory-recover', req)) return;
    logRouteError(req, 500, 'Recover item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/inventory/drops — List non-expired drop records for character
// ---------------------------------------------------------------------------
router.get('/drops', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const drops = await db.query.droppedItems.findMany({
      where: and(
        eq(droppedItems.characterId, character.id),
        sql`${droppedItems.expiresAt} > NOW()`,
      ),
      orderBy: asc(droppedItems.expiresAt),
    });

    return res.json({
      drops: drops.map(d => ({
        id: d.id,
        itemTemplateId: d.itemTemplateId,
        itemTemplateName: d.itemTemplateName,
        quantity: d.quantity,
        weight: d.weight,
        droppedAt: d.droppedAt,
        expiresAt: d.expiresAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'inventory-drops', req)) return;
    logRouteError(req, 500, 'List drops error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Cleanup: delete expired drop records
// ---------------------------------------------------------------------------
export async function cleanupExpiredDrops(): Promise<number> {
  const result = await db.delete(droppedItems)
    .where(sql`${droppedItems.expiresAt} < NOW()`)
    .returning({ id: droppedItems.id });
  return result.length;
}

export default router;
