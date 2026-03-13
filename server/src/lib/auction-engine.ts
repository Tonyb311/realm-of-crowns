// ---------------------------------------------------------------------------
// Auction Engine — Core batch auction resolution for Realm of Crowns
// ---------------------------------------------------------------------------

import crypto from 'crypto';
import { db } from './db';
import { eq, and, sql, desc, inArray, lte } from 'drizzle-orm';
import { auctionCycles, marketListings, marketBuyOrders, characters, playerProfessions, inventories, tradeTransactions, priceHistories, townTreasuries, items, churchChapters } from '@database/tables';
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
import { getTaxReduction } from '../services/religion-buffs';
import { getSimulationTick } from './simulation-context';

// ---------------------------------------------------------------------------
// getOrCreateOpenCycle — Return the current open cycle or create one
// ---------------------------------------------------------------------------

export async function getOrCreateOpenCycle(townId: string): Promise<{
  id: string;
  townId: string;
  cycleNumber: number;
  startedAt: string;
  status: string;
}> {
  const existing = await db.query.auctionCycles.findFirst({
    where: and(eq(auctionCycles.townId, townId), eq(auctionCycles.status, 'open')),
    orderBy: [desc(auctionCycles.startedAt)],
  });

  if (existing) return existing;

  // Find the last cycle number for this town
  const lastCycle = await db.query.auctionCycles.findFirst({
    where: eq(auctionCycles.townId, townId),
    orderBy: [desc(auctionCycles.cycleNumber)],
    columns: { cycleNumber: true },
  });

  const newCycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;

  const [created] = await db.insert(auctionCycles).values({
    id: crypto.randomUUID(),
    townId,
    cycleNumber: newCycleNumber,
    status: 'open',
  }).returning();

  return created;
}

// ---------------------------------------------------------------------------
// resolveAuctionCycle — Resolve all pending orders for a single town cycle
// ---------------------------------------------------------------------------

export async function resolveAuctionCycle(townId: string): Promise<{
  ordersProcessed: number;
  transactionsCompleted: number;
}> {
  // 1. Find the current open cycle for this town
  const cycle = await db.query.auctionCycles.findFirst({
    where: and(eq(auctionCycles.townId, townId), eq(auctionCycles.status, 'open')),
    orderBy: [desc(auctionCycles.startedAt)],
  });

  if (!cycle) {
    return { ordersProcessed: 0, transactionsCompleted: 0 };
  }

  // Check if cycle is old enough to resolve
  // In simulation mode, bypass the 15-minute waiting period so auctions resolve instantly
  const isSimulation = getSimulationTick() !== null;
  if (!isSimulation) {
    const cycleAge = Date.now() - new Date(cycle.startedAt).getTime();
    if (cycleAge < MARKET_CYCLE_DURATION_MS) {
      return { ordersProcessed: 0, transactionsCompleted: 0 };
    }
  }

  // 2. Mark cycle as processing
  await db.update(auctionCycles)
    .set({ status: 'processing' })
    .where(eq(auctionCycles.id, cycle.id));

  let totalOrdersProcessed = 0;
  let totalTransactionsCompleted = 0;
  let contestedCount = 0;
  let merchantWinCount = 0;
  let nonMerchantWinCount = 0;
  let totalGoldTraded = 0;

  try {
    // 3. Query all active listings in this town that have at least one pending buy order
    // Drizzle doesn't support { some: ... } filter on relations directly, so we use a subquery approach
    const listingsWithOrders = await db.query.marketListings.findMany({
      where: and(
        eq(marketListings.townId, townId),
        eq(marketListings.status, 'active'),
      ),
      with: {
        item: { with: { itemTemplate: true } },
        character: { columns: { id: true, name: true } }, // seller
        marketBuyOrders: {
          where: eq(marketBuyOrders.status, 'pending'),
          with: {
            character: {
              columns: {
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

    // Filter to only listings that actually have pending orders
    const listings = listingsWithOrders.filter(l => l.marketBuyOrders && l.marketBuyOrders.length > 0);

    // 4. Process each listing
    for (const listing of listings) {
      const pendingOrders = listing.marketBuyOrders;
      if (pendingOrders.length === 0) continue;

      // Extract surcharge amounts from rollBreakdown before it gets overwritten
      const surchargeMap = new Map<string, number>();
      for (const order of pendingOrders) {
        const rb = order.rollBreakdown as Record<string, unknown> | null;
        if (rb && typeof rb.surcharge === 'number' && rb.surcharge > 0) {
          surchargeMap.set(order.id, rb.surcharge);
        }
      }

      // Load buyer professions for all buyers
      const buyerIds = pendingOrders.map(o => o.buyerId);
      const buyerProfessionRows = await db.query.playerProfessions.findMany({
        where: and(
          inArray(playerProfessions.characterId, buyerIds),
          eq(playerProfessions.isActive, true),
        ),
        columns: { characterId: true, professionType: true },
      });

      const buyerProfMap: Record<string, string[]> = {};
      for (const pp of buyerProfessionRows) {
        if (!buyerProfMap[pp.characterId]) buyerProfMap[pp.characterId] = [];
        buyerProfMap[pp.characterId].push(pp.professionType);
      }

      // Calculate priority scores for each order
      const scoredOrders = pendingOrders.map(order => {
        const stats = order.character.stats as Record<string, number> | null;
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
        await db.update(marketBuyOrders)
          .set({
            priorityScore: winner.priorityScore,
            rollBreakdown: { autoWin: true, priorityScore: winner.priorityScore, ...(surchargeMap.has(winner.order.id) ? { surcharge: surchargeMap.get(winner.order.id) } : {}) },
          })
          .where(eq(marketBuyOrders.id, winner.order.id));
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
            return new Date(a.order.placedAt).getTime() - new Date(b.order.placedAt).getTime();
          });

          // Store roll data for all rolled orders (format: { raw, modifiers, total } for frontend)
          for (const ro of rolledOrders) {
            const modifiers: Array<{ source: string; value: number }> = [];
            if (ro.chaMod !== 0) modifiers.push({ source: 'CHA', value: ro.chaMod });
            if (ro.merchantRollBonus > 0) modifiers.push({ source: 'Merchant', value: ro.merchantRollBonus });

            await db.update(marketBuyOrders)
              .set({
                priorityScore: ro.priorityScore,
                rollResult: ro.rollResult,
                rollBreakdown: {
                  raw: ro.d20,
                  modifiers,
                  total: ro.rollResult,
                  ...(surchargeMap.has(ro.order.id) ? { surcharge: surchargeMap.get(ro.order.id) } : {}),
                },
              })
              .where(eq(marketBuyOrders.id, ro.order.id));
          }

          // Store priority score for non-tied orders (they didn't roll)
          const nonTied = scoredOrders.filter(
            o => Math.abs(o.priorityScore - top.priorityScore) > PRIORITY_TIE_THRESHOLD
          );
          for (const nt of nonTied) {
            await db.update(marketBuyOrders)
              .set({
                priorityScore: nt.priorityScore,
                rollBreakdown: { priorityScore: nt.priorityScore, tieBreaker: false, ...(surchargeMap.has(nt.order.id) ? { surcharge: surchargeMap.get(nt.order.id) } : {}) },
              })
              .where(eq(marketBuyOrders.id, nt.order.id));
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
            await db.update(marketBuyOrders)
              .set({
                priorityScore: so.priorityScore,
                rollBreakdown: { priorityScore: so.priorityScore, tieBreaker: false, ...(surchargeMap.has(so.order.id) ? { surcharge: surchargeMap.get(so.order.id) } : {}) },
              })
              .where(eq(marketBuyOrders.id, so.order.id));
          }
        }
      }

      // Build allBidders logging array from scoredOrders
      const contested = pendingOrders.length > 1;
      // Build a roll data lookup for bidders who went through tie-breaking
      const rollDataMap = new Map<string, { rollResult: number; d20: number; merchantRollBonus: number }>();
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
          name: so.order.character.name,
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

      // 5. Winner processing (inside a transaction)
      // Determine seller fee rate
      const sellerProfs = await db.query.playerProfessions.findMany({
        where: and(eq(playerProfessions.characterId, listing.sellerId), eq(playerProfessions.isActive, true)),
        columns: { professionType: true },
      });
      const sellerIsMerchant = sellerProfs.some(p => p.professionType === 'MERCHANT');
      const feeRate = sellerIsMerchant ? MERCHANT_FEE_RATE : STANDARD_FEE_RATE;
      const bidPrice = winner.order.bidPrice;
      const winnerSurcharge = surchargeMap.get(winner.order.id) ?? 0;
      const fee = Math.floor(bidPrice * feeRate);
      const sellerNet = bidPrice - fee;

      // Get tax rate for town (reduced by Veradine for seller)
      const taxRate = await getEffectiveTaxRate(townId);
      const sellerTaxReduction = await getTaxReduction(listing.sellerId, townId);
      const townTax = Math.floor(Math.floor(bidPrice * taxRate) * (1 - sellerTaxReduction));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      await db.transaction(async (tx) => {
        // Mark winning order
        await tx.update(marketBuyOrders)
          .set({
            status: 'won',
            resolvedAt: new Date().toISOString(),
            auctionCycleId: cycle.id,
          })
          .where(eq(marketBuyOrders.id, winner.order.id));

        // Deduct escrow from winner (bid + surcharge)
        await tx.update(characters)
          .set({
            escrowedGold: sql`${characters.escrowedGold} - ${bidPrice + winnerSurcharge}`,
          })
          .where(eq(characters.id, winner.order.buyerId));

        // Credit seller (net after fee — surcharge does NOT go to seller)
        await tx.update(characters)
          .set({
            gold: sql`${characters.gold} + ${sellerNet}`,
          })
          .where(eq(characters.id, listing.sellerId));

        // Credit Vareth church treasury with surcharge
        if (winnerSurcharge > 0) {
          const varethChapter = await tx.query.churchChapters.findFirst({
            where: and(eq(churchChapters.townId, townId), eq(churchChapters.godId, 'vareth'), eq(churchChapters.isDominant, true)),
          });
          if (varethChapter) {
            await tx.update(churchChapters)
              .set({ treasury: sql`${churchChapters.treasury} + ${winnerSurcharge}` })
              .where(eq(churchChapters.id, varethChapter.id));
          }
        }

        // Transfer item: create or update inventory entry for buyer
        const existingInv = await tx.query.inventories.findFirst({
          where: and(eq(inventories.characterId, winner.order.buyerId), eq(inventories.itemId, listing.itemId)),
        });

        if (existingInv) {
          await tx.update(inventories)
            .set({ quantity: sql`${inventories.quantity} + ${listing.quantity}` })
            .where(eq(inventories.id, existingInv.id));
        } else {
          await tx.insert(inventories).values({
            id: crypto.randomUUID(),
            characterId: winner.order.buyerId,
            itemId: listing.itemId,
            quantity: listing.quantity,
            updatedAt: new Date().toISOString(),
          });
        }

        // Mark listing as sold
        await tx.update(marketListings)
          .set({
            status: 'sold',
            soldAt: new Date().toISOString(),
            soldTo: winner.order.buyerId,
            soldPrice: bidPrice,
            auctionCycleId: cycle.id,
          })
          .where(eq(marketListings.id, listing.id));

        // Create TradeTransaction
        await tx.insert(tradeTransactions).values({
          id: crypto.randomUUID(),
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
        });

        // Update PriceHistory for today
        const existingHistory = await tx.query.priceHistories.findFirst({
          where: and(
            eq(priceHistories.itemTemplateId, listing.item.templateId),
            eq(priceHistories.townId, townId),
            eq(priceHistories.date, todayStr),
          ),
        });

        if (existingHistory) {
          const newVolume = existingHistory.volume + listing.quantity;
          const newAvgPrice =
            (existingHistory.avgPrice * existingHistory.volume + bidPrice * listing.quantity) /
            newVolume;
          await tx.update(priceHistories)
            .set({ avgPrice: newAvgPrice, volume: newVolume })
            .where(eq(priceHistories.id, existingHistory.id));
        } else {
          await tx.insert(priceHistories).values({
            id: crypto.randomUUID(),
            itemTemplateId: listing.item.templateId,
            townId,
            avgPrice: bidPrice,
            volume: listing.quantity,
            date: todayStr,
          });
        }

        // Deposit town tax if applicable
        if (townTax > 0) {
          const existingTreasury = await tx.query.townTreasuries.findFirst({
            where: eq(townTreasuries.townId, townId),
          });
          if (existingTreasury) {
            await tx.update(townTreasuries)
              .set({ balance: sql`${townTreasuries.balance} + ${townTax}` })
              .where(eq(townTreasuries.townId, townId));
          } else {
            await tx.insert(townTreasuries).values({
              id: crypto.randomUUID(),
              townId,
              balance: townTax,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 6. Loser processing
        for (const loser of losers) {
          const loserSurcharge = surchargeMap.get(loser.order.id) ?? 0;
          const loserRefund = loser.order.bidPrice + loserSurcharge;

          await tx.update(marketBuyOrders)
            .set({
              status: 'lost',
              resolvedAt: new Date().toISOString(),
              auctionCycleId: cycle.id,
            })
            .where(eq(marketBuyOrders.id, loser.order.id));

          // Refund escrow (bid + surcharge)
          await tx.update(characters)
            .set({
              gold: sql`${characters.gold} + ${loserRefund}`,
              escrowedGold: sql`${characters.escrowedGold} - ${loserRefund}`,
            })
            .where(eq(characters.id, loser.order.buyerId));
        }
      });

      // Fire-and-forget quest triggers and socket events
      onMarketBuy(winner.order.buyerId).catch(() => {});
      onMarketSell(listing.sellerId).catch(() => {});

      emitTradeCompleted({
        townId,
        buyerId: winner.order.buyerId,
        sellerId: listing.sellerId,
        itemName: listing.item.itemTemplate.name,
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
    await db.update(auctionCycles)
      .set({
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        ordersProcessed: totalOrdersProcessed,
        transactionsCompleted: totalTransactionsCompleted,
        contestedListings: contestedCount,
        merchantWins: merchantWinCount,
        nonMerchantWins: nonMerchantWinCount,
        totalGoldTraded: totalGoldTraded,
      })
      .where(eq(auctionCycles.id, cycle.id));

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
  } catch (err: unknown) {
    // Revert cycle status on error
    await db.update(auctionCycles)
      .set({ status: 'open' })
      .where(eq(auctionCycles.id, cycle.id))
      .catch(() => {});

    logger.error({ err: err instanceof Error ? err.message : String(err), townId, cycleId: cycle.id }, 'Failed to resolve auction cycle');
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
  // Find all towns that have open cycles ready to resolve
  // In simulation mode, skip the cycle age check — resolve immediately
  const isSimulation = getSimulationTick() !== null;
  const cutoff = new Date(Date.now() - MARKET_CYCLE_DURATION_MS).toISOString();

  const openCycles = isSimulation
    ? await db.select({ townId: auctionCycles.townId })
        .from(auctionCycles)
        .where(eq(auctionCycles.status, 'open'))
        .groupBy(auctionCycles.townId)
    : await db.select({ townId: auctionCycles.townId })
        .from(auctionCycles)
        .where(and(eq(auctionCycles.status, 'open'), lte(auctionCycles.startedAt, cutoff)))
        .groupBy(auctionCycles.townId);

  // Filter to only towns that actually have pending orders
  const townIds: string[] = [];
  for (const cycle of openCycles) {
    const hasPending = await db.query.marketBuyOrders.findFirst({
      where: and(
        eq(marketBuyOrders.status, 'pending'),
      ),
      with: {
        marketListing: {
          columns: { townId: true, status: true },
        },
      },
    });
    // Check if the pending order's listing matches the town
    if (hasPending && (hasPending.marketListing as any)?.townId === cycle.townId && (hasPending.marketListing as any)?.status === 'active') {
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
    } catch (err: unknown) {
      logger.error({ err: err instanceof Error ? err.message : String(err), townId }, 'Failed to resolve auction for town');
    }
  }

  return {
    townsProcessed: totalTowns,
    transactionsCompleted: totalTransactions,
    ordersProcessed: totalOrders,
  };
}
