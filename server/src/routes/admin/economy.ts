import { Router, Response } from 'express';
import { db } from '../../lib/db';
import { eq, desc, gte, count, sum, sql, like } from 'drizzle-orm';
import { characters, marketListings, items, itemTemplates, tradeTransactions, inventories } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * GET /api/admin/economy/listings
 * Paginated market listings.
 */
router.get('/listings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * pageSize;

    // For search, we need to use raw SQL since Drizzle query API doesn't easily support
    // nested relation filters. For the non-search case we use the query builder.
    if (search) {
      // Use raw SQL for search with nested template name filter
      const searchPattern = `%${search.toLowerCase()}%`;
      const listingsRaw = await db.execute<any>(sql`
        SELECT ml.*,
               json_build_object('id', c.id, 'name', c.name) as seller,
               json_build_object('id', i.id, 'template_id', i.template_id, 'quality', i.quality, 'current_durability', i.current_durability,
                 'itemTemplate', json_build_object('id', it.id, 'name', it.name, 'type', it.type)) as item
        FROM market_listings ml
        JOIN characters c ON c.id = ml.seller_id
        JOIN items i ON i.id = ml.item_id
        JOIN item_templates it ON it.id = i.template_id
        WHERE lower(it.name) LIKE ${searchPattern}
        ORDER BY ml.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);
      const [{ total }] = await db.execute<{ total: string }>(sql`
        SELECT count(*)::text as total FROM market_listings ml
        JOIN items i ON i.id = ml.item_id
        JOIN item_templates it ON it.id = i.template_id
        WHERE lower(it.name) LIKE ${searchPattern}
      `).then(r => r.rows);

      return res.json({
        data: listingsRaw.rows,
        total: Number(total),
        page,
        pageSize,
        totalPages: Math.ceil(Number(total) / pageSize),
      });
    }

    const data = await db.query.marketListings.findMany({
      offset,
      limit: pageSize,
      orderBy: desc(marketListings.createdAt),
      with: {
        character: { columns: { id: true, name: true } },
        item: {
          with: {
            itemTemplate: { columns: { id: true, name: true, type: true } },
          },
        },
      },
    });

    const [{ total }] = await db.select({ total: count() }).from(marketListings);

    // Reshape to match old API: seller instead of character, template instead of itemTemplate
    const transformed = data.map(d => ({
      ...d,
      seller: d.character,
      item: {
        ...d.item,
        template: d.item?.itemTemplate,
      },
    }));

    return res.json({
      data: transformed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-economy-listings', req)) return;
    logRouteError(req, 500, '[Admin] Economy listings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/economy/listings/:id
 * Remove a listing and return the item to the seller's inventory.
 */
router.delete('/listings/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const listing = await db.query.marketListings.findFirst({
      where: eq(marketListings.id, req.params.id),
      with: {
        item: { with: { itemTemplate: true } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await db.transaction(async (tx) => {
      // Return item to seller inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: sql`${inventories.characterId} = ${listing.sellerId} AND ${inventories.itemId} = ${listing.itemId}`,
      });

      if (existingInv) {
        await tx.update(inventories)
          .set({ quantity: sql`${inventories.quantity} + ${listing.quantity}` })
          .where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: listing.sellerId,
          itemId: listing.itemId,
          quantity: listing.quantity,
        });
      }

      // Delete the listing
      await tx.delete(marketListings).where(eq(marketListings.id, listing.id));
    });

    console.log(`[Admin] Listing ${listing.id} (${listing.item.itemTemplate.name}) removed by admin ${req.user!.userId}`);
    return res.json({ message: 'Listing removed and item returned to seller inventory' });
  } catch (error) {
    if (handleDbError(error, res, 'admin-delete-listing', req)) return;
    logRouteError(req, 500, '[Admin] Delete listing error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/economy/transactions
 * Paginated trade transactions (most recent first).
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
    const offset = (page - 1) * pageSize;

    const [data, [{ total }]] = await Promise.all([
      db.query.tradeTransactions.findMany({
        offset,
        limit: pageSize,
        orderBy: desc(tradeTransactions.timestamp),
        with: {
          character_buyerId: { columns: { id: true, name: true } },
          character_sellerId: { columns: { id: true, name: true } },
          item: {
            with: {
              itemTemplate: { columns: { id: true, name: true } },
            },
          },
        },
      }),
      db.select({ total: count() }).from(tradeTransactions),
    ]);

    // Reshape to match old API shape
    const transformed = data.map(d => ({
      ...d,
      buyer: d.character_buyerId,
      seller: d.character_sellerId,
      item: {
        ...d.item,
        template: d.item?.itemTemplate,
      },
    }));

    return res.json({
      data: transformed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-economy-transactions', req)) return;
    logRouteError(req, 500, '[Admin] Economy transactions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/economy/summary
 * Economy overview stats.
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      [{ totalGold }],
      [{ activeListingCount }],
      [{ activeListingTotalValue }],
      [{ transactionCount30d }],
    ] = await Promise.all([
      db.select({ totalGold: sum(characters.gold) }).from(characters),
      db.select({ activeListingCount: count() }).from(marketListings),
      db.select({ activeListingTotalValue: sum(marketListings.price) }).from(marketListings),
      db.select({ transactionCount30d: count() }).from(tradeTransactions)
        .where(gte(tradeTransactions.timestamp, thirtyDaysAgo.toISOString())),
    ]);

    return res.json({
      totalGoldCirculation: Number(totalGold) ?? 0,
      activeListingCount,
      activeListingTotalValue: Number(activeListingTotalValue) ?? 0,
      transactionCount30d,
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-economy-summary', req)) return;
    logRouteError(req, 500, '[Admin] Economy summary error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
