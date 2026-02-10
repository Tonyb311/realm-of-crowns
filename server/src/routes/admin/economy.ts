import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthenticatedRequest } from '../../types/express';
import { Prisma } from '@prisma/client';

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
    const skip = (page - 1) * pageSize;

    const where: Prisma.MarketListingWhereInput = search
      ? {
          item: {
            template: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.marketListing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, name: true } },
          item: {
            include: {
              template: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      prisma.marketListing.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[Admin] Economy listings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/economy/listings/:id
 * Remove a listing and return the item to the seller's inventory.
 */
router.delete('/listings/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const listing = await prisma.marketListing.findUnique({
      where: { id: req.params.id },
      include: {
        item: { include: { template: true } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Return item to seller inventory
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: listing.sellerId, itemId: listing.itemId },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: listing.quantity } },
        });
      } else {
        await tx.inventory.create({
          data: {
            characterId: listing.sellerId,
            itemId: listing.itemId,
            quantity: listing.quantity,
          },
        });
      }

      // Delete the listing
      await tx.marketListing.delete({ where: { id: listing.id } });
    });

    console.log(`[Admin] Listing ${listing.id} (${listing.item.template.name}) removed by admin ${req.user!.userId}`);
    return res.json({ message: 'Listing removed and item returned to seller inventory' });
  } catch (error) {
    console.error('[Admin] Delete listing error:', error);
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
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.tradeTransaction.findMany({
        skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          item: {
            include: {
              template: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.tradeTransaction.count(),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[Admin] Economy transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/economy/summary
 * Economy overview stats.
 */
router.get('/summary', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalGoldResult,
      activeListingCount,
      activeListingValueResult,
      transactionCount30d,
    ] = await Promise.all([
      prisma.character.aggregate({ _sum: { gold: true } }),
      prisma.marketListing.count(),
      prisma.marketListing.aggregate({
        _sum: {
          price: true,
        },
      }),
      prisma.tradeTransaction.count({
        where: { timestamp: { gte: thirtyDaysAgo } },
      }),
    ]);

    return res.json({
      totalGoldCirculation: totalGoldResult._sum.gold ?? 0,
      activeListingCount,
      activeListingTotalValue: activeListingValueResult._sum.price ?? 0,
      transactionCount30d,
    });
  } catch (error) {
    console.error('[Admin] Economy summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
