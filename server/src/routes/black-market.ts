// ---------------------------------------------------------------------------
// Black Market Routes — Tessivane Shrine: zero-fee, zero-protection marketplace
// ---------------------------------------------------------------------------

import { Router, type Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { blackMarketListings, churchChapters, characters, inventories, items } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { characterGuard } from '../middleware/character-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';

const router = Router();

/** Verify a town has an active Tessivane shrine. */
async function hasTessivaneShrine(townId: string): Promise<boolean> {
  const chapter = await db.query.churchChapters.findFirst({
    where: and(
      eq(churchChapters.godId, 'tessivane'),
      eq(churchChapters.townId, townId),
      eq(churchChapters.isDominant, true),
      eq(churchChapters.isShrine, true),
    ),
    columns: { id: true },
  });
  return !!chapter;
}

// ============================================================
// GET /api/black-market/town/:townId — Browse black market listings
// ============================================================

router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;

    if (character.currentTownId !== townId) {
      return res.status(400).json({ error: 'You must be in this town to browse the Black Market' });
    }

    if (!(await hasTessivaneShrine(townId))) {
      return res.status(400).json({ error: 'No Black Market in this town (requires Tessivane shrine)' });
    }

    const listings = await db.query.blackMarketListings.findMany({
      where: eq(blackMarketListings.townId, townId),
      with: {
        seller: { columns: { id: true, name: true } },
        itemTemplate: { columns: { id: true, name: true, type: true, rarity: true, description: true } },
      },
    });

    return res.json({
      townId,
      listings: listings.map(l => ({
        id: l.id,
        itemName: l.itemName,
        itemTemplateId: l.itemTemplateId,
        quantity: l.quantity,
        price: l.price,
        sellerName: l.seller?.name ?? 'Unknown',
        sellerId: l.sellerId,
        itemType: l.itemTemplate?.type ?? '',
        itemRarity: l.itemTemplate?.rarity ?? 'COMMON',
        itemDescription: l.itemTemplate?.description ?? '',
        listedAt: l.createdAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'black-market-browse', req)) return;
    logRouteError(req, 500, 'Black market browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/black-market/list — List item on black market (zero fee)
// ============================================================

router.post('/list', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { itemId, quantity, price } = req.body as { itemId: string; quantity: number; price: number };

    if (!itemId || !quantity || !price) {
      return res.status(400).json({ error: 'itemId, quantity, and price are required' });
    }
    if (quantity < 1 || price < 1) {
      return res.status(400).json({ error: 'Quantity and price must be at least 1' });
    }

    const townId = character.currentTownId;
    if (!townId) {
      return res.status(400).json({ error: 'You must be in a town' });
    }

    if (!(await hasTessivaneShrine(townId))) {
      return res.status(400).json({ error: 'No Black Market in this town (requires Tessivane shrine)' });
    }

    // Verify item in inventory
    const invEntry = await db.query.inventories.findFirst({
      where: and(
        eq(inventories.characterId, character.id),
        eq(inventories.itemId, itemId),
      ),
      with: { item: { with: { itemTemplate: true } } },
    });

    if (!invEntry || invEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in inventory. Have ${invEntry?.quantity ?? 0}, need ${quantity}.`,
      });
    }

    const itemName = invEntry.item?.itemTemplate?.name ?? 'Unknown Item';
    const templateId = invEntry.item?.templateId ?? '';

    await db.transaction(async (tx) => {
      // Deduct from inventory
      if (invEntry.quantity <= quantity) {
        await tx.delete(inventories).where(eq(inventories.id, invEntry.id));
      } else {
        await tx.update(inventories)
          .set({ quantity: sql`${inventories.quantity} - ${quantity}` })
          .where(eq(inventories.id, invEntry.id));
      }

      // Create listing
      await tx.insert(blackMarketListings).values({
        id: crypto.randomUUID(),
        townId,
        sellerId: character.id,
        itemId,
        itemTemplateId: templateId,
        itemName,
        quantity,
        price,
      });
    });

    return res.json({
      success: true,
      message: `Listed ${quantity}x ${itemName} on the Black Market for ${price}g each`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'black-market-list', req)) return;
    logRouteError(req, 500, 'Black market list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/black-market/buy — Buy from black market (5% scam chance)
// ============================================================

router.post('/buy', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { listingId } = req.body as { listingId: string };

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const townId = character.currentTownId;
    if (!townId) {
      return res.status(400).json({ error: 'You must be in a town' });
    }

    if (!(await hasTessivaneShrine(townId))) {
      return res.status(400).json({ error: 'No Black Market in this town (requires Tessivane shrine)' });
    }

    const listing = await db.query.blackMarketListings.findFirst({
      where: and(
        eq(blackMarketListings.id, listingId),
        eq(blackMarketListings.townId, townId),
      ),
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId === character.id) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    const totalCost = listing.price * listing.quantity;

    if (character.gold < totalCost) {
      return res.status(400).json({
        error: `Not enough gold. Need ${totalCost}g, have ${character.gold}g.`,
      });
    }

    // Verify the item still exists (seller might have sold/dropped it elsewhere)
    const itemExists = await db.query.items.findFirst({
      where: eq(items.id, listing.itemId),
      columns: { id: true },
    });

    if (!itemExists) {
      // Auto-delete stale listing
      await db.delete(blackMarketListings).where(eq(blackMarketListings.id, listing.id));
      return res.status(400).json({
        error: 'This item is no longer available. The listing has been removed.',
      });
    }

    // 5% scam chance
    const isScam = Math.random() < 0.05;

    if (isScam) {
      // Scam: buyer loses gold (destroyed — gold sink), seller keeps item, listing stays
      await db.update(characters)
        .set({ gold: sql`${characters.gold} - ${totalCost}` })
        .where(eq(characters.id, character.id));

      return res.json({
        success: false,
        scammed: true,
        message: 'The deal fell through. Your gold is gone.',
        goldLost: totalCost,
      });
    }

    // Legitimate transaction: zero fees
    await db.transaction(async (tx) => {
      // Deduct buyer gold
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${totalCost}` })
        .where(eq(characters.id, character.id));

      // Credit seller gold (zero fees)
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${totalCost}` })
        .where(eq(characters.id, listing.sellerId));

      // Transfer item to buyer inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(
          eq(inventories.characterId, character.id),
          eq(inventories.itemId, listing.itemId),
        ),
      });

      if (existingInv) {
        await tx.update(inventories)
          .set({ quantity: sql`${inventories.quantity} + ${listing.quantity}` })
          .where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: listing.itemId,
          quantity: listing.quantity,
        });
      }

      // Delete listing
      await tx.delete(blackMarketListings).where(eq(blackMarketListings.id, listing.id));
    });

    return res.json({
      success: true,
      scammed: false,
      message: `Purchased ${listing.quantity}x ${listing.itemName} for ${totalCost}g`,
      itemName: listing.itemName,
      quantity: listing.quantity,
      totalCost,
    });
  } catch (error) {
    if (handleDbError(error, res, 'black-market-buy', req)) return;
    logRouteError(req, 500, 'Black market buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/black-market/cancel — Cancel listing (seller only)
// ============================================================

router.post('/cancel', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { listingId } = req.body as { listingId: string };

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const listing = await db.query.blackMarketListings.findFirst({
      where: eq(blackMarketListings.id, listingId),
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId !== character.id) {
      return res.status(403).json({ error: 'Only the seller can cancel this listing' });
    }

    await db.transaction(async (tx) => {
      // Return item to seller inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(
          eq(inventories.characterId, character.id),
          eq(inventories.itemId, listing.itemId),
        ),
      });

      if (existingInv) {
        await tx.update(inventories)
          .set({ quantity: sql`${inventories.quantity} + ${listing.quantity}` })
          .where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: listing.itemId,
          quantity: listing.quantity,
        });
      }

      // Delete listing
      await tx.delete(blackMarketListings).where(eq(blackMarketListings.id, listing.id));
    });

    return res.json({
      success: true,
      message: `Cancelled listing for ${listing.quantity}x ${listing.itemName}`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'black-market-cancel', req)) return;
    logRouteError(req, 500, 'Black market cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
