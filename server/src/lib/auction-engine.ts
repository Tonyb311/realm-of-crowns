// ---------------------------------------------------------------------------
// Auction Engine — Core batch auction resolution for Realm of Crowns
// ---------------------------------------------------------------------------

import { prisma } from './prisma';
import { logger } from './logger';
import {
  STANDARD_FEE_RATE,
  MERCHANT_FEE_RATE,
  MERCHANT_PRIORITY_BONUS,
  MERCHANT_ROLL_BONUS,
  PRIORITY_TIE_THRESHOLD,
  MARKET_CYCLE_DURATION_MS,
  abilityModifier,
} from '@shared/data/market';
import { emitTradeCompleted } from '../socket/events';
import { onMarketBuy, onMarketSell } from '../services/quest-triggers';
import { getEffectiveTaxRate } from '../services/law-effects';

// ---------------------------------------------------------------------------
// getOrCreateOpenCycle — Return the current open cycle or create one
// ---------------------------------------------------------------------------

export async function getOrCreateOpenCycle(townId: string): Promise<{
  id: string;
  townId: string;
  cycleNumber: number;
  startedAt: Date;
  status: string;
}> {
  const existing = await prisma.auctionCycle.findFirst({
    where: { townId, status: 'open' },
    orderBy: { startedAt: 'desc' },
  });

  if (existing) return existing;

  // Find the last cycle number for this town
  const lastCycle = await prisma.auctionCycle.findFirst({
    where: { townId },
    orderBy: { cycleNumber: 'desc' },
    select: { cycleNumber: true },
  });

  const newCycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;

  return prisma.auctionCycle.create({
    data: {
      townId,
      cycleNumber: newCycleNumber,
      status: 'open',
    },
  });
}

// ---------------------------------------------------------------------------
// resolveAuctionCycle — Resolve all pending orders for a single town cycle
// ---------------------------------------------------------------------------

export async function resolveAuctionCycle(townId: string): Promise<{
  ordersProcessed: number;
  transactionsCompleted: number;
}> {
  // 1. Find the current open cycle for this town
  const cycle = await prisma.auctionCycle.findFirst({
    where: { townId, status: 'open' },
    orderBy: { startedAt: 'desc' },
  });

  if (!cycle) {
    return { ordersProcessed: 0, transactionsCompleted: 0 };
  }

  // Check if cycle is old enough to resolve
  const cycleAge = Date.now() - cycle.startedAt.getTime();
  if (cycleAge < MARKET_CYCLE_DURATION_MS) {
    return { ordersProcessed: 0, transactionsCompleted: 0 };
  }

  // 2. Mark cycle as processing
  await prisma.auctionCycle.update({
    where: { id: cycle.id },
    data: { status: 'processing' },
  });

  let totalOrdersProcessed = 0;
  let totalTransactionsCompleted = 0;
  let contestedCount = 0;
  let merchantWinCount = 0;
  let nonMerchantWinCount = 0;
  let totalGoldTraded = 0;

  try {
    // 3. Query all active listings in this town that have at least one pending buy order
    const listings = await prisma.marketListing.findMany({
      where: {
        townId,
        status: 'active',
        buyOrders: {
          some: { status: 'pending' },
        },
      },
      include: {
        item: { include: { template: true } },
        seller: { select: { id: true, name: true } },
        buyOrders: {
          where: { status: 'pending' },
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                stats: true,
                gold: true,
                escrowedGold: true,
              },
            },
          },
        },
      },
    });

    // 4. Process each listing
    for (const listing of listings) {
      const pendingOrders = listing.buyOrders;
      if (pendingOrders.length === 0) continue;

      // Load buyer professions for all buyers
      const buyerProfessions = await prisma.playerProfession.findMany({
        where: {
          characterId: { in: pendingOrders.map(o => o.buyerId) },
          isActive: true,
        },
        select: { characterId: true, professionType: true },
      });

      const buyerProfMap: Record<string, string[]> = {};
      for (const pp of buyerProfessions) {
        if (!buyerProfMap[pp.characterId]) buyerProfMap[pp.characterId] = [];
        buyerProfMap[pp.characterId].push(pp.professionType);
      }

      // Calculate priority scores for each order
      const scoredOrders = pendingOrders.map(order => {
        const stats = order.buyer.stats as Record<string, number> | null;
        const cha = stats?.CHA ?? 10;
        const chaMod = abilityModifier(cha);
        const profs = buyerProfMap[order.buyerId] || [];
        const merchantBonus = profs.includes('MERCHANT') ? MERCHANT_PRIORITY_BONUS : 0;
        const bidRatio = (order.bidPrice / Math.max(listing.price, 1)) * 10;
        const priorityScore = bidRatio + chaMod + merchantBonus + 0 + 0; // itemBonuses=0, skillBonuses=0

        return {
          order,
          priorityScore,
          chaMod,
          profs,
          cha,
        };
      });

      let winner: typeof scoredOrders[0];
      let losers: typeof scoredOrders;

      if (scoredOrders.length === 1) {
        // Single buyer: auto-win
        winner = scoredOrders[0];
        losers = [];

        // Store priority score on the order
        await prisma.marketBuyOrder.update({
          where: { id: winner.order.id },
          data: {
            priorityScore: winner.priorityScore,
            rollBreakdown: { autoWin: true, priorityScore: winner.priorityScore },
          },
        });
      } else {
        // Multiple buyers: sort by priority score descending
        scoredOrders.sort((a, b) => b.priorityScore - a.priorityScore);

        const top = scoredOrders[0];
        const second = scoredOrders[1];

        // Check if top two are within tie threshold
        if (Math.abs(top.priorityScore - second.priorityScore) <= PRIORITY_TIE_THRESHOLD) {
          // Haggling roll for all tied candidates
          const tiedOrders = scoredOrders.filter(
            o => Math.abs(o.priorityScore - top.priorityScore) <= PRIORITY_TIE_THRESHOLD
          );

          const rolledOrders = tiedOrders.map(o => {
            const d20 = Math.floor(Math.random() * 20) + 1;
            const merchantRollBonus = o.profs.includes('MERCHANT') ? MERCHANT_ROLL_BONUS : 0;
            const rollTotal = d20 + o.chaMod + merchantRollBonus;

            return {
              ...o,
              rollResult: rollTotal,
              d20,
              merchantRollBonus,
            };
          });

          // Sort by roll result descending, then by earliest placedAt
          rolledOrders.sort((a, b) => {
            if (b.rollResult !== a.rollResult) return b.rollResult - a.rollResult;
            return a.order.placedAt.getTime() - b.order.placedAt.getTime();
          });

          // Store roll data for all rolled orders (format: { raw, modifiers, total } for frontend)
          for (const ro of rolledOrders) {
            const modifiers: Array<{ source: string; value: number }> = [];
            if (ro.chaMod !== 0) modifiers.push({ source: 'CHA', value: ro.chaMod });
            if (ro.merchantRollBonus > 0) modifiers.push({ source: 'Merchant', value: ro.merchantRollBonus });

            await prisma.marketBuyOrder.update({
              where: { id: ro.order.id },
              data: {
                priorityScore: ro.priorityScore,
                rollResult: ro.rollResult,
                rollBreakdown: {
                  raw: ro.d20,
                  modifiers,
                  total: ro.rollResult,
                },
              },
            });
          }

          // Store priority score for non-tied orders (they didn't roll)
          const nonTied = scoredOrders.filter(
            o => Math.abs(o.priorityScore - top.priorityScore) > PRIORITY_TIE_THRESHOLD
          );
          for (const nt of nonTied) {
            await prisma.marketBuyOrder.update({
              where: { id: nt.order.id },
              data: {
                priorityScore: nt.priorityScore,
                rollBreakdown: { priorityScore: nt.priorityScore, tieBreaker: false },
              },
            });
          }

          winner = rolledOrders[0];
          losers = [
            ...rolledOrders.slice(1),
            ...nonTied,
          ];
        } else {
          // Clear winner by priority score
          winner = top;
          losers = scoredOrders.slice(1);

          // Store priority scores
          for (const so of scoredOrders) {
            await prisma.marketBuyOrder.update({
              where: { id: so.order.id },
              data: {
                priorityScore: so.priorityScore,
                rollBreakdown: { priorityScore: so.priorityScore, tieBreaker: false },
              },
            });
          }
        }
      }

      // Build allBidders logging array from scoredOrders
      const contested = pendingOrders.length > 1;
      // Build a roll data lookup for bidders who went through tie-breaking
      const rollDataMap = new Map<string, { rollResult: number; d20: number; merchantRollBonus: number }>();
      // The rolledOrders variable only exists in the tie-breaking scope above, so we
      // re-derive roll info from the winner/losers which may carry roll data.
      if ('rollResult' in winner) {
        const w = winner as any;
        rollDataMap.set(w.order.buyerId, { rollResult: w.rollResult, d20: w.d20, merchantRollBonus: w.merchantRollBonus });
      }
      for (const loser of losers) {
        if ('rollResult' in loser) {
          const l = loser as any;
          rollDataMap.set(l.order.buyerId, { rollResult: l.rollResult, d20: l.d20, merchantRollBonus: l.merchantRollBonus });
        }
      }

      const allBidders = scoredOrders.map(so => {
        const rollInfo = rollDataMap.get(so.order.buyerId);
        return {
          name: so.order.buyer.name,
          buyerId: so.order.buyerId,
          isMerchant: (so.profs || []).includes('MERCHANT'),
          bidPrice: so.order.bidPrice,
          priorityScore: so.priorityScore,
          rollResult: rollInfo?.rollResult ?? null,
          rollBreakdown: rollInfo ? { raw: rollInfo.d20, chaMod: so.chaMod, merchantRollBonus: rollInfo.merchantRollBonus, total: rollInfo.rollResult } : null,
          outcome: so.order.buyerId === winner.order.buyerId ? 'won' : 'lost',
        };
      });

      if (contested) contestedCount++;

      // 5. Winner processing (inside a $transaction)
      // Determine seller fee rate
      const sellerProfs = await prisma.playerProfession.findMany({
        where: { characterId: listing.sellerId, isActive: true },
        select: { professionType: true },
      });
      const sellerIsMerchant = sellerProfs.some(p => p.professionType === 'MERCHANT');
      const feeRate = sellerIsMerchant ? MERCHANT_FEE_RATE : STANDARD_FEE_RATE;
      const bidPrice = winner.order.bidPrice;
      const fee = Math.floor(bidPrice * feeRate);
      const sellerNet = bidPrice - fee;

      // Get tax rate for town
      const taxRate = await getEffectiveTaxRate(townId);
      const townTax = Math.floor(bidPrice * taxRate);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.$transaction(async (tx) => {
        // Mark winning order
        await tx.marketBuyOrder.update({
          where: { id: winner.order.id },
          data: {
            status: 'won',
            resolvedAt: new Date(),
            auctionCycleId: cycle.id,
          },
        });

        // Deduct escrow from winner
        await tx.character.update({
          where: { id: winner.order.buyerId },
          data: {
            escrowedGold: { decrement: bidPrice },
          },
        });

        // Credit seller (net after fee)
        await tx.character.update({
          where: { id: listing.sellerId },
          data: {
            gold: { increment: sellerNet },
          },
        });

        // Transfer item: create or update inventory entry for buyer
        const existingInv = await tx.inventory.findFirst({
          where: { characterId: winner.order.buyerId, itemId: listing.itemId },
        });

        if (existingInv) {
          await tx.inventory.update({
            where: { id: existingInv.id },
            data: { quantity: { increment: listing.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: {
              characterId: winner.order.buyerId,
              itemId: listing.itemId,
              quantity: listing.quantity,
            },
          });
        }

        // Mark listing as sold
        await tx.marketListing.update({
          where: { id: listing.id },
          data: {
            status: 'sold',
            soldAt: new Date(),
            soldTo: winner.order.buyerId,
            soldPrice: bidPrice,
            auctionCycleId: cycle.id,
          },
        });

        // Create TradeTransaction
        await tx.tradeTransaction.create({
          data: {
            buyerId: winner.order.buyerId,
            sellerId: listing.sellerId,
            itemId: listing.itemId,
            price: bidPrice,
            quantity: listing.quantity,
            townId,
            sellerFee: fee,
            sellerNet: sellerNet,
            numBidders: pendingOrders.length,
            contested,
            allBidders,
            auctionCycleId: cycle.id,
          },
        });

        // Update PriceHistory for today
        const existingHistory = await tx.priceHistory.findUnique({
          where: {
            itemTemplateId_townId_date: {
              itemTemplateId: listing.item.templateId,
              townId,
              date: today,
            },
          },
        });

        if (existingHistory) {
          const newVolume = existingHistory.volume + listing.quantity;
          const newAvgPrice =
            (existingHistory.avgPrice * existingHistory.volume + bidPrice * listing.quantity) /
            newVolume;
          await tx.priceHistory.update({
            where: { id: existingHistory.id },
            data: { avgPrice: newAvgPrice, volume: newVolume },
          });
        } else {
          await tx.priceHistory.create({
            data: {
              itemTemplateId: listing.item.templateId,
              townId,
              avgPrice: bidPrice,
              volume: listing.quantity,
              date: today,
            },
          });
        }

        // Deposit town tax if applicable
        if (townTax > 0) {
          await tx.townTreasury.upsert({
            where: { townId },
            update: { balance: { increment: townTax } },
            create: { townId, balance: townTax },
          });
        }

        // 6. Loser processing
        for (const loser of losers) {
          await tx.marketBuyOrder.update({
            where: { id: loser.order.id },
            data: {
              status: 'lost',
              resolvedAt: new Date(),
              auctionCycleId: cycle.id,
            },
          });

          // Refund escrow
          await tx.character.update({
            where: { id: loser.order.buyerId },
            data: {
              gold: { increment: loser.order.bidPrice },
              escrowedGold: { decrement: loser.order.bidPrice },
            },
          });
        }
      });

      // Fire-and-forget quest triggers and socket events
      onMarketBuy(winner.order.buyerId).catch(() => {});
      onMarketSell(listing.sellerId).catch(() => {});

      emitTradeCompleted({
        townId,
        buyerId: winner.order.buyerId,
        sellerId: listing.sellerId,
        itemName: listing.item.template.name,
        quantity: listing.quantity,
        price: bidPrice,
      });

      // Accumulate cycle-level stats for logging
      const winnerIsMerchant = (winner.profs || []).includes('MERCHANT');
      if (winnerIsMerchant) merchantWinCount++;
      else nonMerchantWinCount++;
      totalGoldTraded += bidPrice;

      totalOrdersProcessed += pendingOrders.length;
      totalTransactionsCompleted += 1;
    }

    // 7. Mark cycle as resolved
    await prisma.auctionCycle.update({
      where: { id: cycle.id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        ordersProcessed: totalOrdersProcessed,
        transactionsCompleted: totalTransactionsCompleted,
        contestedListings: contestedCount,
        merchantWins: merchantWinCount,
        nonMerchantWins: nonMerchantWinCount,
        totalGoldTraded: totalGoldTraded,
      },
    });

    // 8. Create a new open cycle for the town
    await getOrCreateOpenCycle(townId);

    logger.info(
      { townId, cycleId: cycle.id, ordersProcessed: totalOrdersProcessed, transactionsCompleted: totalTransactionsCompleted },
      'Auction cycle resolved'
    );

    return {
      ordersProcessed: totalOrdersProcessed,
      transactionsCompleted: totalTransactionsCompleted,
    };
  } catch (err: any) {
    // Revert cycle status on error
    await prisma.auctionCycle.update({
      where: { id: cycle.id },
      data: { status: 'open' },
    }).catch(() => {});

    logger.error({ err: err.message, townId, cycleId: cycle.id }, 'Failed to resolve auction cycle');
    throw err;
  }
}

// ---------------------------------------------------------------------------
// resolveAllTownAuctions — Resolve cycles for all towns with pending orders
// ---------------------------------------------------------------------------

export async function resolveAllTownAuctions(): Promise<{
  townsProcessed: number;
  transactionsCompleted: number;
  ordersProcessed: number;
}> {
  // Find all towns that have open cycles old enough to resolve
  const cutoff = new Date(Date.now() - MARKET_CYCLE_DURATION_MS);

  const openCycles = await prisma.auctionCycle.findMany({
    where: {
      status: 'open',
      startedAt: { lte: cutoff },
    },
    select: { townId: true },
    distinct: ['townId'],
  });

  // Filter to only towns that actually have pending orders
  const townIds: string[] = [];
  for (const cycle of openCycles) {
    const hasPending = await prisma.marketBuyOrder.findFirst({
      where: {
        status: 'pending',
        listing: { townId: cycle.townId, status: 'active' },
      },
    });
    if (hasPending) {
      townIds.push(cycle.townId);
    }
  }

  let totalTowns = 0;
  let totalTransactions = 0;
  let totalOrders = 0;

  for (const townId of townIds) {
    try {
      const result = await resolveAuctionCycle(townId);
      if (result.transactionsCompleted > 0) {
        totalTowns++;
        totalTransactions += result.transactionsCompleted;
        totalOrders += result.ordersProcessed;
      }
    } catch (err: any) {
      logger.error({ err: err.message, townId }, 'Failed to resolve auction for town');
    }
  }

  return {
    townsProcessed: totalTowns,
    transactionsCompleted: totalTransactions,
    ordersProcessed: totalOrders,
  };
}
