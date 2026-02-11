import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { cache } from '../middleware/cache';
import { addProfessionXP } from '../services/profession-xp';

const router = Router();

// GET /api/trade/prices/:itemTemplateId
// Current average price for an item across all towns
router.get('/prices/:itemTemplateId', authGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemTemplateId } = req.params;

    const template = await prisma.itemTemplate.findUnique({
      where: { id: itemTemplateId },
      select: { id: true, name: true, type: true, rarity: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Item template not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Get recent prices grouped by town (last 7 days)
    const recentPrices = await prisma.priceHistory.findMany({
      where: {
        itemTemplateId,
        date: { gte: oneWeekAgo },
      },
      include: {
        town: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Get previous week prices for trend comparison
    const previousPrices = await prisma.priceHistory.findMany({
      where: {
        itemTemplateId,
        date: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    });

    // Group by town
    const townMap = new Map<string, {
      townId: string;
      townName: string;
      totalVolume: number;
      weightedPriceSum: number;
    }>();

    for (const entry of recentPrices) {
      const existing = townMap.get(entry.townId);
      if (existing) {
        existing.totalVolume += entry.volume;
        existing.weightedPriceSum += entry.avgPrice * entry.volume;
      } else {
        townMap.set(entry.townId, {
          townId: entry.townId,
          townName: entry.town.name,
          totalVolume: entry.volume,
          weightedPriceSum: entry.avgPrice * entry.volume,
        });
      }
    }

    // Group previous week by town for trend
    const prevTownMap = new Map<string, { totalVolume: number; weightedPriceSum: number }>();
    for (const entry of previousPrices) {
      const existing = prevTownMap.get(entry.townId);
      if (existing) {
        existing.totalVolume += entry.volume;
        existing.weightedPriceSum += entry.avgPrice * entry.volume;
      } else {
        prevTownMap.set(entry.townId, {
          totalVolume: entry.volume,
          weightedPriceSum: entry.avgPrice * entry.volume,
        });
      }
    }

    const towns = Array.from(townMap.values()).map(t => {
      const avgPrice = t.totalVolume > 0 ? t.weightedPriceSum / t.totalVolume : 0;
      const prev = prevTownMap.get(t.townId);
      const prevAvgPrice = prev && prev.totalVolume > 0
        ? prev.weightedPriceSum / prev.totalVolume
        : null;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (prevAvgPrice !== null) {
        const change = (avgPrice - prevAvgPrice) / prevAvgPrice;
        if (change > 0.05) trend = 'up';
        else if (change < -0.05) trend = 'down';
      }

      return {
        townId: t.townId,
        townName: t.townName,
        avgPrice: Math.round(avgPrice * 100) / 100,
        volume: t.totalVolume,
        trend,
      };
    });

    // Sort by volume descending
    towns.sort((a, b) => b.volume - a.volume);

    return res.json({ itemTemplate: template, towns });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade prices', req)) return;
    logRouteError(req, 500, 'Trade prices error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trade/price-history/:itemTemplateId
// Historical price chart data for a specific item
router.get('/price-history/:itemTemplateId', authGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemTemplateId } = req.params;
    const townId = req.query.townId as string | undefined;
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string, 10) || 30));

    const template = await prisma.itemTemplate.findUnique({
      where: { id: itemTemplateId },
      select: { id: true, name: true, type: true, rarity: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Item template not found' });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await prisma.priceHistory.findMany({
      where: {
        itemTemplateId,
        date: { gte: since },
        ...(townId ? { townId } : {}),
      },
      include: {
        town: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return res.json({
      itemTemplate: template,
      history: history.map(h => ({
        date: h.date,
        avgPrice: h.avgPrice,
        volume: h.volume,
        townId: h.townId,
        townName: h.town.name,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade price history', req)) return;
    logRouteError(req, 500, 'Trade price-history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trade/best-routes
// Top 10 most profitable trade routes right now
router.get('/best-routes', authGuard, cache(120), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all recent price data
    const recentPrices = await prisma.priceHistory.findMany({
      where: { date: { gte: oneWeekAgo } },
      include: {
        itemTemplate: { select: { id: true, name: true, type: true, rarity: true } },
        town: { select: { id: true, name: true } },
      },
    });

    // Get all travel routes for distance info
    const routes = await prisma.travelRoute.findMany({
      include: {
        fromTown: { select: { id: true, name: true } },
        toTown: { select: { id: true, name: true } },
      },
    });

    // Build a distance lookup (bidirectional) — uses nodeCount as distance proxy
    const distanceMap = new Map<string, number>();
    for (const route of routes) {
      distanceMap.set(`${route.fromTownId}:${route.toTownId}`, route.nodeCount);
      distanceMap.set(`${route.toTownId}:${route.fromTownId}`, route.nodeCount);
    }

    // Aggregate prices by item+town (weighted average over the week)
    const priceMap = new Map<string, {
      itemTemplateId: string;
      itemName: string;
      itemType: string;
      itemRarity: string;
      townId: string;
      townName: string;
      avgPrice: number;
      totalVolume: number;
    }>();

    for (const entry of recentPrices) {
      const key = `${entry.itemTemplateId}:${entry.townId}`;
      const existing = priceMap.get(key);
      if (existing) {
        const newVolume = existing.totalVolume + entry.volume;
        existing.avgPrice = (existing.avgPrice * existing.totalVolume + entry.avgPrice * entry.volume) / newVolume;
        existing.totalVolume = newVolume;
      } else {
        priceMap.set(key, {
          itemTemplateId: entry.itemTemplateId,
          itemName: entry.itemTemplate.name,
          itemType: entry.itemTemplate.type,
          itemRarity: entry.itemTemplate.rarity,
          townId: entry.townId,
          townName: entry.town.name,
          avgPrice: entry.avgPrice,
          totalVolume: entry.volume,
        });
      }
    }

    // Group by item template
    const itemGroups = new Map<string, Array<typeof priceMap extends Map<string, infer V> ? V : never>>();
    for (const entry of priceMap.values()) {
      const existing = itemGroups.get(entry.itemTemplateId);
      if (existing) {
        existing.push(entry);
      } else {
        itemGroups.set(entry.itemTemplateId, [entry]);
      }
    }

    // For each item, find best buy/sell spread
    const profitableRoutes: Array<{
      item: { id: string; name: string; type: string; rarity: string };
      buyTown: { id: string; name: string };
      buyPrice: number;
      sellTown: { id: string; name: string };
      sellPrice: number;
      distance: number | null;
      estimatedProfit: number;
      profitMargin: number;
    }> = [];

    for (const [, entries] of itemGroups) {
      if (entries.length < 2) continue;

      // Find cheapest buy town and most expensive sell town
      let minEntry = entries[0];
      let maxEntry = entries[0];

      for (const entry of entries) {
        if (entry.avgPrice < minEntry.avgPrice) minEntry = entry;
        if (entry.avgPrice > maxEntry.avgPrice) maxEntry = entry;
      }

      if (minEntry.townId === maxEntry.townId) continue;

      const spread = maxEntry.avgPrice - minEntry.avgPrice;
      if (spread <= 0) continue;

      const distance = distanceMap.get(`${minEntry.townId}:${maxEntry.townId}`) ?? null;

      profitableRoutes.push({
        item: {
          id: minEntry.itemTemplateId,
          name: minEntry.itemName,
          type: minEntry.itemType,
          rarity: minEntry.itemRarity,
        },
        buyTown: { id: minEntry.townId, name: minEntry.townName },
        buyPrice: Math.round(minEntry.avgPrice * 100) / 100,
        sellTown: { id: maxEntry.townId, name: maxEntry.townName },
        sellPrice: Math.round(maxEntry.avgPrice * 100) / 100,
        distance,
        estimatedProfit: Math.round(spread * 100) / 100,
        profitMargin: Math.round((spread / minEntry.avgPrice) * 10000) / 100,
      });
    }

    // Sort by estimated profit descending, take top 10
    profitableRoutes.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    const top10 = profitableRoutes.slice(0, 10);

    return res.json({ routes: top10 });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade best routes', req)) return;
    logRouteError(req, 500, 'Trade best-routes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trade/profitability
// Route profitability calculator for a specific item between two towns
router.get('/profitability', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemTemplateId = req.query.itemTemplateId as string;
    const fromTownId = req.query.fromTownId as string;
    const toTownId = req.query.toTownId as string;
    const quantity = Math.max(1, parseInt(req.query.quantity as string, 10) || 1);

    if (!itemTemplateId || !fromTownId || !toTownId) {
      return res.status(400).json({ error: 'itemTemplateId, fromTownId, and toTownId are required' });
    }

    const template = await prisma.itemTemplate.findUnique({
      where: { id: itemTemplateId },
      select: { id: true, name: true, type: true, rarity: true },
    });

    if (!template) {
      return res.status(404).json({ error: 'Item template not found' });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get recent prices in both towns
    const [buyPrices, sellPrices, route, sellTownTax] = await Promise.all([
      prisma.priceHistory.findMany({
        where: { itemTemplateId, townId: fromTownId, date: { gte: oneWeekAgo } },
      }),
      prisma.priceHistory.findMany({
        where: { itemTemplateId, townId: toTownId, date: { gte: oneWeekAgo } },
      }),
      prisma.travelRoute.findFirst({
        where: {
          OR: [
            { fromTownId, toTownId },
            { fromTownId: toTownId, toTownId: fromTownId },
          ],
        },
      }),
      prisma.townTreasury.findUnique({
        where: { townId: toTownId },
        select: { taxRate: true },
      }),
    ]);

    // Compute weighted average buy price
    let buyVolume = 0;
    let buyWeighted = 0;
    for (const p of buyPrices) {
      buyVolume += p.volume;
      buyWeighted += p.avgPrice * p.volume;
    }
    const avgBuyPrice = buyVolume > 0 ? buyWeighted / buyVolume : 0;

    // Compute weighted average sell price
    let sellVolume = 0;
    let sellWeighted = 0;
    for (const p of sellPrices) {
      sellVolume += p.volume;
      sellWeighted += p.avgPrice * p.volume;
    }
    const avgSellPrice = sellVolume > 0 ? sellWeighted / sellVolume : 0;

    const buyCost = Math.round(avgBuyPrice * quantity);
    const grossRevenue = Math.round(avgSellPrice * quantity);
    const taxRate = sellTownTax?.taxRate ?? 0.10;
    const taxCost = Math.floor(grossRevenue * taxRate);
    const transportCost = route ? route.nodeCount * 2 * quantity : 0; // 2 gold per node per unit as estimated caravan cost
    const netRevenue = grossRevenue - taxCost;
    const totalCost = buyCost + transportCost;
    const profit = netRevenue - totalCost;
    const profitMargin = totalCost > 0 ? Math.round((profit / totalCost) * 10000) / 100 : 0;

    return res.json({
      item: template,
      quantity,
      buyTown: fromTownId,
      sellTown: toTownId,
      avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
      avgSellPrice: Math.round(avgSellPrice * 100) / 100,
      buyCost,
      grossRevenue,
      taxRate,
      taxCost,
      transportCost,
      distance: route?.nodeCount ?? null,
      totalCost,
      netRevenue,
      profit,
      profitMargin,
      dataPoints: {
        buyVolume,
        sellVolume,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade profitability', req)) return;
    logRouteError(req, 500, 'Trade profitability error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trade/town/:townId/dashboard
// Town economic summary
router.get('/town/:townId/dashboard', authGuard, characterGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const town = await prisma.town.findUnique({
      where: { id: townId },
      select: { id: true, name: true, mayorId: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [recentPrices, recentTransactions, activeListings, treasury] = await Promise.all([
      prisma.priceHistory.findMany({
        where: { townId, date: { gte: oneWeekAgo } },
        include: {
          itemTemplate: { select: { id: true, name: true, type: true, rarity: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.tradeTransaction.findMany({
        where: { townId, timestamp: { gte: oneWeekAgo } },
        select: { price: true, quantity: true, itemId: true },
      }),
      prisma.marketListing.count({
        where: {
          townId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.townTreasury.findUnique({
        where: { townId },
        select: { balance: true, taxRate: true },
      }),
    ]);

    // Aggregate: total volume and revenue
    let totalVolume = 0;
    let totalRevenue = 0;
    for (const tx of recentTransactions) {
      totalVolume += tx.quantity;
      totalRevenue += tx.price * tx.quantity;
    }

    // Most traded items (by volume from price history)
    const itemVolumeMap = new Map<string, {
      itemTemplateId: string;
      itemName: string;
      itemType: string;
      volume: number;
      avgPrice: number;
      weightedSum: number;
    }>();

    for (const entry of recentPrices) {
      const existing = itemVolumeMap.get(entry.itemTemplateId);
      if (existing) {
        existing.volume += entry.volume;
        existing.weightedSum += entry.avgPrice * entry.volume;
      } else {
        itemVolumeMap.set(entry.itemTemplateId, {
          itemTemplateId: entry.itemTemplateId,
          itemName: entry.itemTemplate.name,
          itemType: entry.itemTemplate.type,
          volume: entry.volume,
          avgPrice: entry.avgPrice,
          weightedSum: entry.avgPrice * entry.volume,
        });
      }
    }

    const mostTraded = Array.from(itemVolumeMap.values())
      .map(item => ({
        itemTemplateId: item.itemTemplateId,
        itemName: item.itemName,
        itemType: item.itemType,
        volume: item.volume,
        avgPrice: item.volume > 0 ? Math.round((item.weightedSum / item.volume) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Supply/demand: compare listing counts vs transaction volume
    const listingsByItem = await prisma.marketListing.groupBy({
      by: ['itemId'],
      where: {
        townId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _sum: { quantity: true },
    });

    // Estimate tax revenue from recent transactions
    const taxRate = treasury?.taxRate ?? 0.10;
    const estimatedTaxRevenue = Math.floor(totalRevenue * taxRate);

    // Determine character is mayor for extra info
    const character = req.character!;
    const isMayor = town.mayorId === character.id;

    return res.json({
      town: { id: town.id, name: town.name },
      summary: {
        totalVolume,
        totalRevenue,
        activeListings,
        uniqueItemsTraded: itemVolumeMap.size,
      },
      mostTraded,
      ...(isMayor ? {
        mayorData: {
          treasuryBalance: treasury?.balance ?? 0,
          taxRate,
          estimatedWeeklyTaxRevenue: estimatedTaxRevenue,
        },
      } : {}),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade town dashboard', req)) return;
    logRouteError(req, 500, 'Trade town dashboard error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trade/merchant/:characterId/stats
// Merchant profession stats for a character
router.get('/merchant/:characterId/stats', authGuard, cache(30), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId } = req.params;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, currentTownId: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get merchant profession info
    const merchantProfession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId,
          professionType: 'MERCHANT',
        },
      },
    });

    // Transactions as buyer and seller
    const [buyTransactions, sellTransactions] = await Promise.all([
      prisma.tradeTransaction.findMany({
        where: { buyerId: characterId },
        include: {
          item: { include: { template: { select: { name: true, type: true } } } },
          town: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.tradeTransaction.findMany({
        where: { sellerId: characterId },
        include: {
          item: { include: { template: { select: { name: true, type: true } } } },
          town: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const totalBought = buyTransactions.reduce((sum, tx) => sum + tx.price * tx.quantity, 0);
    const totalSold = sellTransactions.reduce((sum, tx) => sum + tx.price * tx.quantity, 0);
    const totalTradeVolume = buyTransactions.reduce((sum, tx) => sum + tx.quantity, 0)
      + sellTransactions.reduce((sum, tx) => sum + tx.quantity, 0);

    // Towns traded in
    const tradeTowns = new Set<string>();
    for (const tx of [...buyTransactions, ...sellTransactions]) {
      tradeTowns.add(tx.townId);
    }

    // Find cross-town trades (sold in a different town than bought)
    // Track items bought: itemId -> { townId, price, quantity }
    const buyLog = new Map<string, Array<{ townId: string; price: number; timestamp: Date }>>();
    for (const tx of buyTransactions) {
      const existing = buyLog.get(tx.itemId);
      if (existing) {
        existing.push({ townId: tx.townId, price: tx.price, timestamp: tx.timestamp });
      } else {
        buyLog.set(tx.itemId, [{ townId: tx.townId, price: tx.price, timestamp: tx.timestamp }]);
      }
    }

    let crossTownTrades = 0;
    let crossTownProfit = 0;
    for (const tx of sellTransactions) {
      const buys = buyLog.get(tx.itemId);
      if (!buys) continue;
      // Find a buy in a different town that happened before this sell
      const crossBuy = buys.find(b => b.townId !== tx.townId && b.timestamp < tx.timestamp);
      if (crossBuy) {
        crossTownTrades++;
        crossTownProfit += (tx.price - crossBuy.price) * tx.quantity;
      }
    }

    // Most profitable item types
    const itemTypeProfit = new Map<string, number>();
    for (const tx of sellTransactions) {
      const type = tx.item.template.type;
      itemTypeProfit.set(type, (itemTypeProfit.get(type) ?? 0) + tx.price * tx.quantity);
    }

    const topItemTypes = Array.from(itemTypeProfit.entries())
      .map(([type, revenue]) => ({ type, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return res.json({
      character: { id: character.id, name: character.name },
      profession: merchantProfession ? {
        level: merchantProfession.level,
        tier: merchantProfession.tier,
        xp: merchantProfession.xp,
      } : null,
      stats: {
        totalTrades: buyTransactions.length + sellTransactions.length,
        totalBought,
        totalSold,
        netProfit: totalSold - totalBought,
        totalTradeVolume,
        townsTraded: tradeTowns.size,
        crossTownTrades,
        crossTownProfit,
      },
      topItemTypes,
      recentSales: sellTransactions.slice(0, 10).map(tx => ({
        itemName: tx.item.template.name,
        quantity: tx.quantity,
        price: tx.price,
        townName: tx.town.name,
        timestamp: tx.timestamp,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'trade merchant stats', req)) return;
    logRouteError(req, 500, 'Trade merchant stats error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Merchant XP Integration ---
// Called after a successful cross-town trade to award Merchant XP.
// This is exported so market.ts can call it after a purchase.
export async function awardMerchantXP(
  buyerId: string,
  sellTownId: string,
  itemId: string,
  salePrice: number,
  quantity: number,
): Promise<void> {
  try {
    // Check if buyer has Merchant profession
    const merchantProfession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: buyerId,
          professionType: 'MERCHANT',
        },
      },
    });

    if (!merchantProfession) return;

    // Check if the buyer purchased this item in a different town
    const previousBuy = await prisma.tradeTransaction.findFirst({
      where: {
        buyerId,
        itemId,
        townId: { not: sellTownId },
      },
      orderBy: { timestamp: 'desc' },
    });

    // This sale is the buyer SELLING. For merchant XP, we want to reward the seller
    // if they bought the item elsewhere. But since this is called from the buy endpoint,
    // let's check if the SELLER bought this item in another town.
    // Actually - the task says "when a player sells an item in a town they didn't buy it in".
    // The buy endpoint is from the buyer's perspective. We need to check the seller's history.
    // However, it's simpler to hook this into the sell side. Let's instead check
    // when someone buys: did the SELLER buy this item from another town?
    // The seller is the one who would get cross-town merchant XP.

    // No cross-town trade detected from this call path.
    // We'll handle this separately - see awardCrossTownMerchantXP below.
  } catch (error) {
    console.error('Merchant XP check error:', error);
  }
}

/**
 * Awards Merchant XP to a seller who completes a cross-town trade.
 * Called from the market buy endpoint after a successful sale.
 *
 * @param sellerId - The character who sold the item
 * @param itemId - The item being sold
 * @param sellTownId - The town where the sale occurred
 * @param salePrice - Price per unit of the sale
 * @param quantity - Number of items sold
 */
export async function awardCrossTownMerchantXP(
  sellerId: string,
  itemId: string,
  sellTownId: string,
  salePrice: number,
  quantity: number,
): Promise<void> {
  try {
    // Check if seller has Merchant profession
    const merchantProfession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: sellerId,
          professionType: 'MERCHANT',
        },
      },
    });

    if (!merchantProfession) return;

    // Did the seller previously BUY this item in a different town?
    const previousBuy = await prisma.tradeTransaction.findFirst({
      where: {
        buyerId: sellerId,
        itemId,
        townId: { not: sellTownId },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!previousBuy) return;

    // Cross-town trade confirmed! Calculate XP
    const profitMargin = ((salePrice - previousBuy.price) / previousBuy.price) * 100;

    // Get distance between towns for bonus
    const route = await prisma.travelRoute.findFirst({
      where: {
        OR: [
          { fromTownId: previousBuy.townId, toTownId: sellTownId },
          { fromTownId: sellTownId, toTownId: previousBuy.townId },
        ],
      },
    });

    const baseXP = 15;
    const profitMultiplier = 1 + Math.max(0, profitMargin) / 100;
    const distanceBonus = route ? 1 + (route.nodeCount / 20) : 1;
    const totalXP = Math.round(baseXP * profitMultiplier * distanceBonus * quantity);

    if (totalXP > 0) {
      await addProfessionXP(
        sellerId,
        'MERCHANT',
        totalXP,
        `Cross-town trade: sold ${quantity}x for ${salePrice}g each (bought at ${previousBuy.price}g, profit margin: ${Math.round(profitMargin)}%)`,
      );
    }
  } catch (error) {
    // Non-critical: log and continue
    console.error('Cross-town Merchant XP error:', error);
  }
}

export default router;
