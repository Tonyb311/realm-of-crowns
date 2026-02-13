/**
 * Daily Tick Processor — 12-step engine replacing all individual cron jobs.
 *
 * Runs once per game-day (default 00:00 UTC). Processes ALL locked-in
 * DailyActions in strict order with per-step error isolation.
 */

import { prisma } from '../lib/prisma';
import { processSpoilage, processAutoConsumption, getHungerModifier, processRevenantSustenance, processForgebornMaintenance } from '../services/food-system';
import { resolveNodePvE, resolveNodePvP } from '../services/tick-combat-resolver';
import { createDailyReport, compileReport } from '../services/daily-report';
import {
  getRacialGatheringBonus,
  getRacialCraftQualityBonus,
  getRacialMaterialReduction,
} from '../services/racial-profession-bonuses';
import { addProfessionXP } from '../services/profession-xp';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { onResourceGather } from '../services/quest-triggers';
import { processServiceNpcIncome } from './service-npc-income';
import { processLoans } from './loan-processing';
import { processReputationDecay } from './reputation-decay';
import { getTodayTickDate, advanceGameDay } from '../lib/game-day';
import { qualityRoll } from '@shared/utils/dice';
import { getProficiencyBonus, getModifier as getStatModifier } from '@shared/utils/bounded-accuracy';
import { getProfessionByType } from '@shared/data/professions';
import {
  emitDailyReportReady,
  emitNotification,
  emitWorldEvent,
  emitBuildingTaxDue,
  emitBuildingDelinquent,
  emitBuildingSeized,
  emitBuildingConditionLow,
  emitGatheringDepleted,
  emitToolBroken,
  emitTickComplete,
} from '../socket/events';
import type { HungerState, ProfessionType, ResourceType, BuildingType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;
const CURSOR_PAGE_SIZE = 200;
const ABUNDANCE_DEPLETION_PER_GATHER = 2;
const MIN_ABUNDANCE_TO_GATHER = 10;
const BARE_HANDS_YIELD_PENALTY = 0.25;

const PROFESSION_RESOURCE_MAP: Partial<Record<ProfessionType, ResourceType[]>> = {
  MINER: ['ORE', 'STONE'],
  LUMBERJACK: ['WOOD'],
  FARMER: ['GRAIN', 'FIBER'],
  HERBALIST: ['HERB', 'REAGENT'],
  FISHERMAN: ['FISH'],
  HUNTER: ['HIDE', 'ANIMAL_PRODUCT'],
};

const PROFESSION_WORKSHOP_MAP: Partial<Record<ProfessionType, BuildingType>> = {
  SMELTER: 'SMELTERY',
  BLACKSMITH: 'SMITHY',
  TANNER: 'TANNERY',
  TAILOR: 'TAILOR_SHOP',
  MASON: 'MASON_YARD',
  WOODWORKER: 'LUMBER_MILL',
  ALCHEMIST: 'ALCHEMY_LAB',
  ENCHANTER: 'ENCHANTING_TOWER',
  COOK: 'KITCHEN',
  BREWER: 'BREWERY',
  JEWELER: 'JEWELER_WORKSHOP',
  FLETCHER: 'FLETCHER_BENCH',
};

const QUALITY_MAP: Record<string, string> = {
  Poor: 'POOR',
  Common: 'COMMON',
  Fine: 'FINE',
  Superior: 'SUPERIOR',
  Masterwork: 'MASTERWORK',
  Legendary: 'LEGENDARY',
};

const PROFESSION_TIER_QUALITY_BONUS: Record<string, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  CRAFTSMAN: 2,
  EXPERT: 3,
  MASTER: 5,
  GRANDMASTER: 7,
};

const BASE_PROPERTY_TAX_RATES: Record<string, number> = {
  HOUSE_SMALL: 5, HOUSE_MEDIUM: 15, HOUSE_LARGE: 30,
  SMITHY: 20, SMELTERY: 20, TANNERY: 20, TAILOR_SHOP: 20,
  ALCHEMY_LAB: 20, ENCHANTING_TOWER: 20, KITCHEN: 20, BREWERY: 20,
  JEWELER_WORKSHOP: 20, FLETCHER_BENCH: 20, MASON_YARD: 20,
  LUMBER_MILL: 20, SCRIBE_STUDY: 20, STABLE: 20,
  WAREHOUSE: 25, BANK: 25, INN: 25,
  MARKET_STALL: 10, FARM: 10, RANCH: 10, MINE: 15,
};

const WEEKLY_BUILDING_DEGRADATION = 5;
const LOW_CONDITION_THRESHOLD = 50;
const NONFUNCTIONAL_THRESHOLD = 25;

// Election tick durations (converted from real-time hours to game-day ticks)
const NOMINATION_TICKS = 3;
const VOTING_TICKS = 3;
const MAYOR_TERM_TICKS = 14;
const IMPEACHMENT_TICKS = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CharacterResults {
  food?: { consumed: { name: string } | null; buff: Record<string, unknown> | null };
  action?: Record<string, unknown>;
  goldChange: number;
  xpEarned: number;
  combatLogs: Array<Record<string, unknown>>;
  questProgress: Array<Record<string, unknown>>;
  notifications: string[];
  worldEvents: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Main Processor
// ---------------------------------------------------------------------------

export interface DailyTickResult {
  tickDate: string;
  charactersProcessed: number;
  gatherActionsProcessed: number;
  craftActionsProcessed: number;
  restActionsProcessed: number;
  lawsProcessed: number;
  resourcesRestored: number;
  durationMs: number;
  gameDayOffset: number;
  errors: string[];
}

export async function processDailyTick(): Promise<DailyTickResult> {
  const startTime = Date.now();
  const tickDate = getTodayTickDate();
  const tickDateStr = tickDate.toISOString().slice(0, 10);
  console.log(`[DailyTick] Starting tick for game day ${tickDateStr}`);
  let gatherCount = 0;
  let craftCount = 0;
  let restCount = 0;
  let lawsCount = 0;
  let resourcesRestoredCount = 0;

  // Per-character result accumulator
  const characterResults = new Map<string, CharacterResults>();

  function getResults(charId: string): CharacterResults {
    if (!characterResults.has(charId)) {
      characterResults.set(charId, {
        goldChange: 0,
        xpEarned: 0,
        combatLogs: [],
        questProgress: [],
        notifications: [],
        worldEvents: [],
      });
    }
    return characterResults.get(charId)!;
  }

  // Per-character hunger state cache (populated in Step 1)
  const hungerStates = new Map<string, HungerState>();

  // Per-character food buff cache
  const foodBuffs = new Map<string, Record<string, unknown> | null>();

  // -----------------------------------------------------------------------
  // Step 1: Food Spoilage & Consumption
  // -----------------------------------------------------------------------
  await runStep('Food Spoilage & Consumption', 1, async () => {
    // Global spoilage
    const spoilageResult = await processSpoilage();
    console.log(`[DailyTick]   Spoiled ${spoilageResult.spoiledCount} perishable items`);

    // Per-character auto-consumption with cursor-based pagination
    let charCursor: string | undefined;
    let hasMoreChars = true;

    while (hasMoreChars) {
      const charPage = await prisma.character.findMany({
        select: { id: true, race: true },
        take: CURSOR_PAGE_SIZE,
        orderBy: { id: 'asc' },
        ...(charCursor ? { skip: 1, cursor: { id: charCursor } } : {}),
      });

      if (charPage.length < CURSOR_PAGE_SIZE) {
        hasMoreChars = false;
      }
      if (charPage.length > 0) {
        charCursor = charPage[charPage.length - 1].id;
      }

      // Process this page in sub-batches
      for (let i = 0; i < charPage.length; i += BATCH_SIZE) {
        const batch = charPage.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (char) => {
        try {
          if (char.race === 'REVENANT') {
            const seResult = await processRevenantSustenance(char.id);
            // Map soulFadeStage to hunger-equivalent for downstream steps
            const hungerEquiv: HungerState =
              seResult.soulFadeStage === 0 ? 'FED' :
              seResult.soulFadeStage === 1 ? 'HUNGRY' :
              seResult.soulFadeStage === 2 ? 'STARVING' : 'INCAPACITATED';
            hungerStates.set(char.id, hungerEquiv);
            foodBuffs.set(char.id, seResult.buff);

            const results = getResults(char.id);
            results.food = {
              consumed: seResult.consumed ? { name: seResult.consumed.name } : null,
              buff: seResult.buff,
            };

            // Soul Fade notifications
            if (seResult.soulFadeStage === 1) {
              results.notifications.push(
                'Your edges shimmer and flicker. You need Soul Essence to stabilize your form. (-1 all stats)'
              );
            } else if (seResult.soulFadeStage === 2) {
              results.notifications.push(
                'The void tugs at your consciousness. Your movements feel sluggish. Find Soul Essence soon. (-2 all stats, -15% speed)'
              );
            } else if (seResult.soulFadeStage >= 3) {
              results.notifications.push(
                'Your soul strains against the mortal plane. Without Soul Essence, you risk unraveling entirely. (-3 all stats, -25% speed, -10% max HP)'
              );
            } else if (seResult.consumed && seResult.soulFadeStage === 0) {
              // Only notify "stabilized" if they were previously fading (consumed something)
              results.notifications.push('The Soul Essence anchors your spirit. Your form solidifies.');
            }
          } else if (char.race === 'FORGEBORN') {
            const mkResult = await processForgebornMaintenance(char.id);
            const hungerEquiv: HungerState =
              mkResult.structuralDecayStage === 0 ? 'FED' :
              mkResult.structuralDecayStage === 1 ? 'HUNGRY' :
              mkResult.structuralDecayStage === 2 ? 'STARVING' : 'INCAPACITATED';
            hungerStates.set(char.id, hungerEquiv);
            foodBuffs.set(char.id, mkResult.buff);

            const results = getResults(char.id);
            results.food = {
              consumed: mkResult.consumed ? { name: mkResult.consumed.name } : null,
              buff: mkResult.buff,
            };

            // Structural Decay notifications
            if (mkResult.structuralDecayStage === 1) {
              results.notifications.push(
                'Joints grind and servos misalign. Your frame needs maintenance. Acquire a Maintenance Kit. (-1 all stats)'
              );
            } else if (mkResult.structuralDecayStage === 2) {
              results.notifications.push(
                'Gears skip under load. Response times lag. Your systems are degrading without maintenance. (-2 all stats, -15% speed)'
              );
            } else if (mkResult.structuralDecayStage >= 3) {
              results.notifications.push(
                'WARNING: Structural integrity critical. Components risk seizure. Immediate maintenance required. (-3 all stats, -25% speed, -10% max HP)'
              );
            } else if (mkResult.consumed && mkResult.structuralDecayStage === 0) {
              results.notifications.push('Maintenance complete. Systems recalibrated. All components operating within parameters.');
            }
          } else {
            const foodResult = await processAutoConsumption(char.id);
            hungerStates.set(char.id, foodResult.hungerState);
            foodBuffs.set(char.id, foodResult.buff);

            const results = getResults(char.id);
            results.food = {
              consumed: foodResult.consumed ? { name: foodResult.consumed.name } : null,
              buff: foodResult.buff,
            };

            if (foodResult.hungerState === 'STARVING' || foodResult.hungerState === 'INCAPACITATED') {
              results.notifications.push(
                `You are ${foodResult.hungerState.toLowerCase()}! Acquire food urgently.`
              );
            }
          }
        } catch (err) {
          console.error(`[DailyTick] Step 1 error for character ${char.id}:`, err);
        }
      }));
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 2: Travel Movement
  // -----------------------------------------------------------------------
  await runStep('Travel Movement', 2, async () => {
    // Travel now handled by dedicated travel-tick.ts cron job
  });

  // -----------------------------------------------------------------------
  // Step 3: Node Encounter Detection & Combat Resolution
  // -----------------------------------------------------------------------
  await runStep('Node Encounters & Combat', 3, async () => {
    // Node encounters temporarily disabled — pending new travel system encounter integration
  });

  // -----------------------------------------------------------------------
  // Step 4: Work Actions (Gathering & Crafting)
  // -----------------------------------------------------------------------
  await runStep('Work Actions', 4, async () => {
    // --- Gathering ---
    const gatherActions = await prisma.dailyAction.findMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        actionType: 'GATHER',
        status: 'LOCKED_IN',
      },
      include: {
        character: {
          select: {
            id: true, race: true, subRace: true, level: true,
            currentTownId: true, hungerState: true, stats: true,
          },
        },
      },
    });
    gatherCount = gatherActions.length;

    for (let i = 0; i < gatherActions.length; i += BATCH_SIZE) {
      const batch = gatherActions.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (action) => {
        try {
          await processGatherAction(action, tickDateStr, hungerStates, foodBuffs, getResults);
        } catch (err) {
          console.error(`[DailyTick] Step 4 gather error for ${action.characterId}:`, err);
          getResults(action.characterId).notifications.push('Gathering failed due to an error.');
        }
      }));
    }

    // --- Crafting ---
    const craftActions = await prisma.dailyAction.findMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        actionType: 'CRAFT',
        status: 'LOCKED_IN',
      },
      include: {
        character: {
          select: {
            id: true, race: true, subRace: true, level: true,
            currentTownId: true, hungerState: true, stats: true,
          },
        },
      },
    });
    craftCount = craftActions.length;

    for (let i = 0; i < craftActions.length; i += BATCH_SIZE) {
      const batch = craftActions.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (action) => {
        try {
          await processCraftAction(action, tickDateStr, hungerStates, foodBuffs, getResults);
        } catch (err) {
          console.error(`[DailyTick] Step 4 craft error for ${action.characterId}:`, err);
          getResults(action.characterId).notifications.push('Crafting failed due to an error.');
        }
      }));
    }
  });

  // -----------------------------------------------------------------------
  // Step 5: Service Profession Actions
  // -----------------------------------------------------------------------
  await runStep('Service Professions', 5, async () => {
    // Innkeepers earn from resting characters in their town
    const restingActions = await prisma.dailyAction.findMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        actionType: 'REST',
        status: 'LOCKED_IN',
      },
      include: {
        character: { select: { id: true, currentTownId: true } },
      },
    });

    // Group resting characters by town
    const restByTown = new Map<string, string[]>();
    for (const action of restingActions) {
      const townId = action.character.currentTownId;
      if (!townId) continue;
      if (!restByTown.has(townId)) restByTown.set(townId, []);
      restByTown.get(townId)!.push(action.characterId);
    }

    // Find innkeepers and award income per resting character
    for (const [townId, resterIds] of restByTown) {
      const innkeepers = await prisma.playerProfession.findMany({
        where: {
          professionType: 'INNKEEPER',
          isActive: true,
          character: { currentTownId: townId },
        },
        include: { character: { select: { id: true, name: true } } },
      });

      if (innkeepers.length === 0) continue;

      const incomePerRester = 5; // base lodging fee
      const totalIncome = Math.floor(resterIds.length * incomePerRester / innkeepers.length);

      for (const innkeeper of innkeepers) {
        if (totalIncome > 0) {
          await prisma.character.update({
            where: { id: innkeeper.characterId },
            data: { gold: { increment: totalIncome } },
          });
          const results = getResults(innkeeper.characterId);
          results.goldChange += totalIncome;
          results.notifications.push(`Earned ${totalIncome}g from ${resterIds.length} lodging guests.`);
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 6: Governance Processing
  // -----------------------------------------------------------------------
  await runStep('Governance Processing', 6, async () => {
    // Check proposed laws: tally votes and activate or reject
    const now = new Date();
    const proposedLaws = await prisma.law.findMany({
      where: { status: 'PROPOSED', expiresAt: { lte: now } },
    });
    lawsCount = proposedLaws.length;

    for (const law of proposedLaws) {
      const passed = law.votesFor > law.votesAgainst;
      await prisma.law.update({
        where: { id: law.id },
        data: { status: passed ? 'ACTIVE' : 'REJECTED' },
      });
      console.log(`[DailyTick]   Law "${law.title}" ${passed ? 'PASSED' : 'REJECTED'} (${law.votesFor}-${law.votesAgainst})`);
    }

    // Expire active laws past their expiresAt
    const expired = await prisma.law.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    if (expired.count > 0) {
      console.log(`[DailyTick]   Expired ${expired.count} law(s)`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 7: Economy Cycle
  // -----------------------------------------------------------------------
  await runStep('Economy Cycle', 7, async () => {
    const now = new Date();

    // --- Tax Collection ---
    const treasuries = await prisma.townTreasury.findMany();
    for (const treasury of treasuries) {
      const transactions = await prisma.tradeTransaction.findMany({
        where: {
          townId: treasury.townId,
          timestamp: { gt: treasury.lastCollectedAt },
        },
      });

      if (transactions.length === 0) continue;

      const policy = await prisma.townPolicy.findUnique({
        where: { townId: treasury.townId },
      });
      const taxRate = policy?.taxRate ?? treasury.taxRate;

      let totalTax = 0;
      for (const tx of transactions) {
        totalTax += Math.floor(tx.price * tx.quantity * taxRate);
      }

      if (totalTax > 0) {
        await prisma.townTreasury.update({
          where: { id: treasury.id },
          data: { balance: { increment: totalTax }, lastCollectedAt: now },
        });
        console.log(`[DailyTick]   Collected ${totalTax}g tax from town ${treasury.townId}`);
      }
    }

    // --- Property Taxes ---
    await collectPropertyTaxes();

    // --- Building Degradation (1 point per tick instead of 5 per week) ---
    await degradeBuildings();

    // --- Resource Regeneration ---
    const depletedResources = await prisma.townResource.findMany({
      where: { abundance: { lt: 100 } },
    });
    let resourcesRestored = 0;
    for (const resource of depletedResources) {
      const increment = Math.max(1, Math.round(resource.respawnRate));
      const newAbundance = Math.min(100, resource.abundance + increment);
      if (newAbundance !== resource.abundance) {
        await prisma.townResource.update({
          where: { id: resource.id },
          data: { abundance: newAbundance },
        });
        resourcesRestored++;
      }
    }
    if (resourcesRestored > 0) {
      console.log(`[DailyTick]   Restored abundance for ${resourcesRestored} town resources`);
    }
    resourcesRestoredCount = resourcesRestored;

    // --- Caravan Arrivals ---
    const arrivedCaravans = await prisma.caravan.findMany({
      where: { status: 'IN_PROGRESS', arrivesAt: { lte: now } },
      include: { toTown: { select: { name: true } } },
    });
    for (const caravan of arrivedCaravans) {
      emitNotification(caravan.ownerId, {
        id: `caravan-ready-${caravan.id}`,
        type: 'caravan:arrived',
        title: 'Caravan Arrived!',
        message: `Your caravan has arrived at ${caravan.toTown.name}. Visit the town to collect your goods.`,
        data: { caravanId: caravan.id, toTownId: caravan.toTownId },
      });
    }
  });

  const now = new Date();

  // -----------------------------------------------------------------------
  // Step 8: Election & Diplomacy Timers
  // -----------------------------------------------------------------------
  await runStep('Elections & Diplomacy', 8, async () => {
    await processElections();
    await processImpeachments();

    // Check treaty expirations
    const expiredTreaties = await prisma.treaty.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    if (expiredTreaties.count > 0) {
      console.log(`[DailyTick]   Expired ${expiredTreaties.count} treaty/treaties`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 9: Rest/Idle Processing
  // -----------------------------------------------------------------------
  await runStep('Rest/Idle Processing', 9, async () => {
    // Find characters with REST actions or no locked action for today
    const restActions = await prisma.dailyAction.findMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        actionType: 'REST',
        status: 'LOCKED_IN',
      },
      select: { characterId: true },
    });
    restCount = restActions.length;

    const restingIds = new Set(restActions.map(a => a.characterId));

    // Characters with NO action default to rest
    const allActive = await prisma.dailyAction.findMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        status: 'LOCKED_IN',
      },
      select: { characterId: true },
    });
    const activeIds = new Set(allActive.map(a => a.characterId));

    // Cursor-based pagination for rest/heal processing
    let restCursor: string | undefined;
    let hasMoreRest = true;

    while (hasMoreRest) {
      const restPage = await prisma.character.findMany({
        select: { id: true, maxHealth: true, health: true, hungerState: true },
        take: CURSOR_PAGE_SIZE,
        orderBy: { id: 'asc' },
        ...(restCursor ? { skip: 1, cursor: { id: restCursor } } : {}),
      });

      if (restPage.length < CURSOR_PAGE_SIZE) {
        hasMoreRest = false;
      }
      if (restPage.length > 0) {
        restCursor = restPage[restPage.length - 1].id;
      }

      for (const char of restPage) {
        const isResting = restingIds.has(char.id) || !activeIds.has(char.id);
        if (!isResting) continue;

        const hungerState = hungerStates.get(char.id) ?? char.hungerState ?? 'HUNGRY';

        if (hungerState === 'FED') {
          // Heal 15% max HP, set wellRested
          const healAmount = Math.floor(char.maxHealth * 0.15);
          const newHealth = Math.min(char.maxHealth, char.health + healAmount);

          await prisma.character.update({
            where: { id: char.id },
            data: {
              health: newHealth,
              wellRested: true,
            },
          });

          const results = getResults(char.id);
          results.action = results.action ?? { type: 'REST' };
          results.notifications.push(`Rested well and recovered ${healAmount} HP.`);
        } else {
          // No recovery when not fed
          await prisma.character.update({
            where: { id: char.id },
            data: { wellRested: false },
          });

          const results = getResults(char.id);
          results.action = results.action ?? { type: 'REST' };
          results.notifications.push('Too hungry to recover. Find food!');
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 10: Quest & Achievement Checks
  // -----------------------------------------------------------------------
  await runStep('Quest & Achievement Checks', 10, async () => {
    for (const [charId, results] of characterResults) {
      try {
        // Check combat kills
        const kills = results.combatLogs.filter(
          (l) => l.type === 'pve' && l.winner === 'team0'
        ).length;
        if (kills > 0) {
          await checkAchievements(charId, 'combat', { kills });
        }

        // Check gathering completions
        const gatherResult = results.action as Record<string, unknown> | undefined;
        if (gatherResult?.type === 'GATHER' && gatherResult?.resourceType) {
          await onResourceGather(
            charId,
            gatherResult.resourceType as string,
            (gatherResult.quantity as number) ?? 1,
          );
        }
      } catch (err) {
        console.error(`[DailyTick] Step 10 error for ${charId}:`, err);
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 11: World Events & Notifications
  // -----------------------------------------------------------------------
  await runStep('World Events & Notifications', 11, async () => {
    // Count significant events for a herald announcement
    const totalCombats = Array.from(characterResults.values())
      .reduce((sum, r) => sum + r.combatLogs.length, 0);
    const totalGathers = Array.from(characterResults.values())
      .filter(r => (r.action as Record<string, unknown>)?.type === 'GATHER').length;
    const totalTravelers = Array.from(characterResults.values())
      .filter(r => (r.action as Record<string, unknown>)?.type === 'TRAVEL').length;

    if (totalCombats > 0 || totalGathers > 5 || totalTravelers > 5) {
      const event = await prisma.worldEvent.create({
        data: {
          eventType: 'DAILY_SUMMARY',
          title: `Day ${tickDateStr} Summary`,
          description: `${totalTravelers} travelers, ${totalCombats} combats, ${totalGathers} gatherers.`,
          metadata: { tickDate: tickDateStr, totalCombats, totalGathers, totalTravelers },
        },
      });

      emitWorldEvent({
        id: event.id,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      });

      // Broadcast all accumulated world events to results
      for (const [, results] of characterResults) {
        results.worldEvents.push({
          title: event.title,
          description: event.description,
        });
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 12: Results Delivery
  // -----------------------------------------------------------------------
  await runStep('Results Delivery', 12, async () => {
    const entries = Array.from(characterResults.entries());

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async ([charId, results]) => {
        try {
          const reportData = compileReport(results);
          await createDailyReport(charId, tickDateStr, reportData);

          emitDailyReportReady(charId, {
            tickDate: tickDateStr,
            summary: buildReportSummary(results),
          });
        } catch (err) {
          console.error(`[DailyTick] Step 12 report error for ${charId}:`, err);
        }
      }));
    }

    // Mark all LOCKED_IN DailyActions as COMPLETED (or FAILED if they failed)
    await prisma.dailyAction.updateMany({
      where: {
        tickDate: { gte: new Date(tickDateStr), lt: new Date(tickDateStr + 'T23:59:59.999Z') },
        status: 'LOCKED_IN',
      },
      data: { status: 'COMPLETED' },
    });

    // Emit tick complete
    try {
      emitTickComplete({
        tickDate: tickDateStr,
        characterCount: characterResults.size,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Socket may not be initialized in test environments
    }
  });

  // -----------------------------------------------------------------------
  // Step 13: Service NPC Income
  // -----------------------------------------------------------------------
  await runStep('Service NPC Income', 13, async () => {
    await processServiceNpcIncome();
  });

  // -----------------------------------------------------------------------
  // Step 14: Loan Default Processing
  // -----------------------------------------------------------------------
  await runStep('Loan Default Processing', 14, async () => {
    await processLoans();
  });

  // -----------------------------------------------------------------------
  // Step 15: Service Reputation Decay
  // -----------------------------------------------------------------------
  await runStep('Service Reputation Decay', 15, async () => {
    await processReputationDecay();
  });

  const durationMs = Date.now() - startTime;
  console.log(`[DailyTick] Tick complete in ${durationMs}ms (${characterResults.size} characters processed)`);

  return {
    tickDate: tickDateStr,
    charactersProcessed: characterResults.size,
    gatherActionsProcessed: gatherCount,
    craftActionsProcessed: craftCount,
    restActionsProcessed: restCount,
    lawsProcessed: lawsCount,
    resourcesRestored: resourcesRestoredCount,
    durationMs,
    gameDayOffset: 0,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Step Runner
// ---------------------------------------------------------------------------

async function runStep(name: string, stepNum: number, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    console.log(`[DailyTick] Step ${stepNum}: ${name} completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`[DailyTick] Step ${stepNum}: ${name} FAILED after ${Date.now() - start}ms:`, err);
  }
}

// ---------------------------------------------------------------------------
// Gathering sub-processor
// ---------------------------------------------------------------------------

async function processGatherAction(
  action: {
    id: string;
    characterId: string;
    actionTarget: unknown;
    character: {
      id: string;
      race: string;
      subRace: unknown;
      level: number;
      currentTownId: string | null;
      hungerState: string;
    };
  },
  tickDateStr: string,
  hungerStates: Map<string, HungerState>,
  foodBuffs: Map<string, Record<string, unknown> | null>,
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const target = action.actionTarget as Record<string, unknown>;
  const resourceId = target.resourceId as string;
  const professionType = target.professionType as ProfessionType;
  const char = action.character;

  if (!resourceId || !professionType || !char.currentTownId) {
    getResults(char.id).notifications.push('Gathering failed: missing resource or not in town.');
    return;
  }

  // Validate resource exists and town has abundance
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    getResults(char.id).notifications.push('Gathering failed: resource not found.');
    return;
  }

  const townResource = await prisma.townResource.findFirst({
    where: { townId: char.currentTownId, resourceType: resource.type },
  });
  if (!townResource || townResource.abundance < MIN_ABUNDANCE_TO_GATHER) {
    getResults(char.id).notifications.push('Gathering failed: resources depleted.');
    return;
  }

  // Get or create profession
  let profession = await prisma.playerProfession.findUnique({
    where: { characterId_professionType: { characterId: char.id, professionType } },
  });
  if (!profession) {
    profession = await prisma.playerProfession.create({
      data: { characterId: char.id, professionType, tier: 'APPRENTICE', level: 1, xp: 0 },
    });
  }

  // Apply hunger modifier
  const hungerState = hungerStates.get(char.id) ?? (char.hungerState as HungerState) ?? 'FED';
  const hungerMod = getHungerModifier(hungerState);
  if (hungerMod <= 0) {
    getResults(char.id).notifications.push('Too incapacitated from hunger to gather.');
    return;
  }

  // Calculate yield (adapted from work.ts /collect)
  const baseYield = 1 + Math.floor(Math.random() * 3); // 1-3
  const d20 = 1 + Math.floor(Math.random() * 20); // 1-20
  const gatherProfDef = getProfessionByType(professionType);
  const gatherCharStats = (char as any).stats as Record<string, number>;
  const gatherPrimaryStatKey = gatherProfDef?.primaryStat?.toLowerCase() ?? 'con';
  const gatherStatMod = getStatModifier(gatherCharStats[gatherPrimaryStatKey] ?? 10);
  const d20Roll = d20 + getProficiencyBonus(char.level) + gatherStatMod;
  let totalYield = baseYield + Math.max(0, d20Roll - 10); // bonus from roll exceeding DC 10

  // Abundance modifier
  const abundanceModifier = townResource.abundance / 100;
  totalYield = Math.max(1, Math.round(totalYield * abundanceModifier));

  // Racial yield bonus
  const subRaceData = char.subRace as { element?: string; chosenProfession?: string } | null;
  const townForBiome = await prisma.town.findUnique({
    where: { id: char.currentTownId },
    select: { biome: true },
  });
  const gatherBonus = getRacialGatheringBonus(
    char.race as any,
    subRaceData,
    professionType,
    (townForBiome?.biome as any) ?? null,
  );
  const racialYieldBonus = gatherBonus.yieldMultiplier - gatherBonus.penalty;
  if (racialYieldBonus !== 0) {
    totalYield = Math.max(1, Math.round(totalYield * (1 + racialYieldBonus)));
  }

  // Tool bonus
  const tool = await getEquippedTool(char.id, professionType);
  if (tool) {
    totalYield = Math.max(1, Math.round(totalYield * (1 + tool.yieldBonus)));
  } else {
    totalYield = Math.max(1, Math.round(totalYield * (1 - BARE_HANDS_YIELD_PENALTY)));
  }

  // Hunger modifier
  totalYield = Math.max(1, Math.round(totalYield * hungerMod));

  // Food buff bonus (simple: if buff has gatheringBonus, apply it)
  const buff = foodBuffs.get(char.id);
  if (buff && typeof buff.gatheringBonus === 'number') {
    totalYield = Math.max(1, Math.round(totalYield * (1 + (buff.gatheringBonus as number))));
  }

  // XP calculation
  const baseXp = 10 + (resource.tier - 1) * 5;
  const xpGained = Math.round(baseXp * (1 + (gatherBonus.yieldMultiplier * 0.5)));

  // Execute in transaction
  await prisma.$transaction(async (tx) => {
    // Find or create item template
    let itemTemplate = await tx.itemTemplate.findFirst({
      where: { name: resource.name, type: 'MATERIAL' },
    });
    if (!itemTemplate) {
      itemTemplate = await tx.itemTemplate.create({
        data: {
          name: resource.name,
          type: 'MATERIAL',
          rarity: resource.tier <= 2 ? 'COMMON' : resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
          description: `Raw ${resource.name} gathered from the wilds.`,
          levelRequired: 1,
        },
      });
    }

    // Check for existing stack
    const existingSlot = await tx.inventory.findFirst({
      where: { characterId: char.id, item: { templateId: itemTemplate.id } },
    });

    if (existingSlot) {
      await tx.inventory.update({
        where: { id: existingSlot.id },
        data: { quantity: existingSlot.quantity + totalYield },
      });
    } else {
      const item = await tx.item.create({
        data: {
          templateId: itemTemplate.id,
          ownerId: char.id,
          quality: resource.tier <= 2 ? 'COMMON' : resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
        },
      });
      await tx.inventory.create({
        data: { characterId: char.id, itemId: item.id, quantity: totalYield },
      });
    }

    // Deplete town resource
    await tx.townResource.update({
      where: { id: townResource.id },
      data: { abundance: Math.max(0, townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER) },
    });
  });

  // Award profession XP
  await addProfessionXP(char.id, professionType, xpGained, `gathered_${resource.name.toLowerCase().replace(/\s+/g, '_')}`);

  // Award character XP
  const characterXpGain = Math.max(1, Math.floor(xpGained / 2));
  await prisma.character.update({
    where: { id: char.id },
    data: { xp: { increment: characterXpGain } },
  });
  await checkLevelUp(char.id);

  // Decrement tool durability
  if (tool) {
    const newDurability = tool.item.currentDurability - 1;
    if (newDurability <= 0) {
      await prisma.$transaction([
        prisma.item.update({ where: { id: tool.item.id }, data: { currentDurability: 0 } }),
        prisma.characterEquipment.delete({ where: { id: tool.equipmentId } }),
      ]);
      emitToolBroken(char.id, {
        itemId: tool.item.id,
        toolName: tool.template.name,
        professionType,
      });
    } else {
      await prisma.item.update({
        where: { id: tool.item.id },
        data: { currentDurability: newDurability },
      });
    }
  }

  // Emit depletion warning
  if (townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER < 20) {
    emitGatheringDepleted(char.id, {
      townId: char.currentTownId!,
      resourceType: resource.type,
      abundance: Math.max(0, townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER),
    });
  }

  // Record results
  const results = getResults(char.id);
  results.action = {
    type: 'GATHER',
    resourceName: resource.name,
    resourceType: resource.type,
    quantity: totalYield,
    xpGained: characterXpGain,
    professionXpGained: xpGained,
  };
  results.xpEarned += characterXpGain;
}

// ---------------------------------------------------------------------------
// Crafting sub-processor
// ---------------------------------------------------------------------------

async function processCraftAction(
  action: {
    id: string;
    characterId: string;
    actionTarget: unknown;
    character: {
      id: string;
      race: string;
      subRace: unknown;
      level: number;
      currentTownId: string | null;
      hungerState: string;
    };
  },
  tickDateStr: string,
  hungerStates: Map<string, HungerState>,
  foodBuffs: Map<string, Record<string, unknown> | null>,
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const target = action.actionTarget as Record<string, unknown>;
  const recipeId = target.recipeId as string;
  const char = action.character;

  if (!recipeId || !char.currentTownId) {
    getResults(char.id).notifications.push('Crafting failed: missing recipe or not in town.');
    return;
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) {
    getResults(char.id).notifications.push('Crafting failed: recipe not found.');
    return;
  }

  // Check profession
  const profession = await prisma.playerProfession.findFirst({
    where: { characterId: char.id, professionType: recipe.professionType },
  });
  if (!profession) {
    getResults(char.id).notifications.push(`Crafting failed: you don't have the ${recipe.professionType} profession.`);
    return;
  }

  // Workshop check
  const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType];
  let workshop: { level: number } | null = null;
  if (requiredBuildingType) {
    workshop = await prisma.building.findFirst({
      where: { townId: char.currentTownId, type: requiredBuildingType },
      select: { level: true },
    });
  }
  if (recipe.tier !== 'APPRENTICE' && !workshop) {
    getResults(char.id).notifications.push(`Crafting failed: requires a workshop.`);
    return;
  }
  const workshopLevel = workshop?.level ?? 0;

  // Check and consume ingredients
  const rawIngredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
  const matReduction = getRacialMaterialReduction(char.race as any, char.level);
  const ingredients = rawIngredients.map(ing => ({
    ...ing,
    quantity: matReduction.reduction > 0
      ? Math.max(1, Math.round(ing.quantity * (1 - matReduction.reduction)))
      : ing.quantity,
  }));

  // Verify ingredient availability
  const inventory = await prisma.inventory.findMany({
    where: { characterId: char.id },
    include: { item: { include: { template: true } } },
  });

  const inventoryByTemplate = new Map<string, { total: number; entries: typeof inventory }>();
  for (const inv of inventory) {
    const tid = inv.item.templateId;
    const existing = inventoryByTemplate.get(tid);
    if (existing) {
      existing.total += inv.quantity;
      existing.entries.push(inv);
    } else {
      inventoryByTemplate.set(tid, { total: inv.quantity, entries: [inv] });
    }
  }

  for (const ing of ingredients) {
    const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
    if (available < ing.quantity) {
      getResults(char.id).notifications.push('Crafting failed: not enough materials.');
      return;
    }
  }

  // Calculate ingredient quality bonus
  let totalQualityBonus = 0;
  let totalItems = 0;
  const QUALITY_BONUS_VALUES: Record<string, number> = { FINE: 1, SUPERIOR: 2, MASTERWORK: 3, LEGENDARY: 5 };
  for (const ing of ingredients) {
    const entries = inventoryByTemplate.get(ing.itemTemplateId)?.entries ?? [];
    let remaining = ing.quantity;
    for (const inv of entries) {
      if (remaining <= 0) break;
      const consumed = Math.min(inv.quantity, remaining);
      const bonus = QUALITY_BONUS_VALUES[inv.item.quality] ?? 0;
      totalQualityBonus += bonus * consumed;
      totalItems += consumed;
      remaining -= consumed;
    }
  }
  const ingredientQualityBonus = totalItems > 0 ? totalQualityBonus / totalItems : 0;

  // Consume ingredients and create item in transaction
  const subRaceData = char.subRace as { element?: string; chosenProfession?: string } | null;
  const racialQuality = getRacialCraftQualityBonus(char.race as any, subRaceData, recipe.professionType);
  const toolBonus = await getCraftToolBonus(char.id, recipe.professionType);

  // Profession tier bonus
  const professionTierBonus = PROFESSION_TIER_QUALITY_BONUS[profession.tier] ?? 0;

  // Stat modifier from profession's primary stat
  const profDef = getProfessionByType(recipe.professionType);
  const characterStats = (char as any).stats as Record<string, number>;
  const primaryStatKey = profDef?.primaryStat?.toLowerCase() ?? 'int';
  const statModifier = getStatModifier(characterStats[primaryStatKey] ?? 10);

  const { roll: diceRoll, total, quality: qualityName } = qualityRoll(
    getProficiencyBonus(char.level),
    statModifier,
    toolBonus,
    workshopLevel,
    racialQuality.qualityBonus,
    professionTierBonus,
    Math.round(ingredientQualityBonus),
  );
  const quality = QUALITY_MAP[qualityName] ?? 'COMMON';

  const resultTemplate = await prisma.itemTemplate.findUnique({ where: { id: recipe.result } });
  if (!resultTemplate) {
    getResults(char.id).notifications.push('Crafting failed: result template not found.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Consume ingredients
    for (const ing of ingredients) {
      let remaining = ing.quantity;
      const entries = inventoryByTemplate.get(ing.itemTemplateId)?.entries ?? [];
      for (const inv of entries) {
        if (remaining <= 0) break;
        if (inv.quantity <= remaining) {
          remaining -= inv.quantity;
          await tx.inventory.delete({ where: { id: inv.id } });
          await tx.item.delete({ where: { id: inv.itemId } });
        } else {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: inv.quantity - remaining },
          });
          remaining = 0;
        }
      }
    }

    // Create crafted item
    const item = await tx.item.create({
      data: {
        templateId: resultTemplate.id,
        ownerId: char.id,
        currentDurability: resultTemplate.durability,
        quality: quality as any,
        craftedById: char.id,
        enchantments: [],
      },
    });

    await tx.inventory.create({
      data: { characterId: char.id, itemId: item.id, quantity: 1 },
    });
  });

  // Award XP
  const xpGain = recipe.xpReward;
  await addProfessionXP(char.id, recipe.professionType, xpGain, `Crafted ${resultTemplate.name}`);
  await prisma.character.update({
    where: { id: char.id },
    data: { xp: { increment: xpGain } },
  });
  await checkLevelUp(char.id);

  // Decrement tool durability
  const equippedTool = await prisma.characterEquipment.findUnique({
    where: { characterId_slot: { characterId: char.id, slot: 'MAIN_HAND' } },
    include: { item: { include: { template: true } } },
  });
  if (equippedTool && equippedTool.item.template.type === 'TOOL') {
    const toolStats = equippedTool.item.template.stats as Record<string, unknown>;
    if (toolStats.professionType === recipe.professionType) {
      const newDur = equippedTool.item.currentDurability - 1;
      if (newDur <= 0) {
        await prisma.$transaction([
          prisma.item.update({ where: { id: equippedTool.item.id }, data: { currentDurability: 0 } }),
          prisma.characterEquipment.delete({ where: { id: equippedTool.id } }),
        ]);
        emitToolBroken(char.id, {
          itemId: equippedTool.item.id,
          toolName: equippedTool.item.template.name,
          professionType: recipe.professionType,
        });
      } else {
        await prisma.item.update({
          where: { id: equippedTool.item.id },
          data: { currentDurability: newDur },
        });
      }
    }
  }

  // Record results
  const results = getResults(char.id);
  results.action = {
    type: 'CRAFT',
    recipeName: recipe.name,
    resultName: resultTemplate.name,
    quality,
    qualityRoll: { roll: diceRoll, total },
    xpGained: xpGain,
  };
  results.xpEarned += xpGain;
}

// ---------------------------------------------------------------------------
// Tool helpers (adapted from work.ts)
// ---------------------------------------------------------------------------

async function getEquippedTool(characterId: string, professionType: ProfessionType) {
  const equip = await prisma.characterEquipment.findUnique({
    where: { characterId_slot: { characterId, slot: 'MAIN_HAND' } },
    include: { item: { include: { template: true } } },
  });

  if (!equip || equip.item.template.type !== 'TOOL') return null;

  const stats = equip.item.template.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return null;

  return {
    equipmentId: equip.id,
    item: equip.item,
    template: equip.item.template,
    speedBonus: (stats.speedBonus as number) ?? 0,
    yieldBonus: (stats.yieldBonus as number) ?? 0,
  };
}

async function getCraftToolBonus(characterId: string, professionType: ProfessionType): Promise<number> {
  const equip = await prisma.characterEquipment.findUnique({
    where: { characterId_slot: { characterId, slot: 'MAIN_HAND' } },
    include: { item: { include: { template: true } } },
  });

  if (!equip || equip.item.template.type !== 'TOOL') return 0;

  const stats = equip.item.template.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return 0;

  return (typeof stats.qualityBonus === 'number') ? stats.qualityBonus : 0;
}

// ---------------------------------------------------------------------------
// Property Tax (adapted from property-tax.ts)
// ---------------------------------------------------------------------------

async function collectPropertyTaxes(): Promise<void> {
  const buildings = await prisma.building.findMany({
    where: { level: { gte: 1 } },
    include: {
      owner: { select: { id: true, name: true, gold: true, userId: true } },
      town: {
        select: {
          id: true,
          name: true,
          mayorId: true,
          townPolicy: { select: { taxRate: true } },
          treasury: { select: { id: true } },
        },
      },
    },
  });

  let totalCollected = 0;
  let delinquentCount = 0;
  let seizedCount = 0;

  for (const building of buildings) {
    const baseTax = BASE_PROPERTY_TAX_RATES[building.type] ?? 10;
    const levelMultiplier = building.level;
    const policyTaxRate = building.town.townPolicy?.taxRate ?? 0.10;
    const dailyTax = Math.floor(baseTax * levelMultiplier * (1 + policyTaxRate));

    const storageData = building.storage as Record<string, unknown>;

    if (building.owner.gold >= dailyTax) {
      await prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: building.ownerId },
          data: { gold: { decrement: dailyTax } },
        });

        if (building.town.treasury) {
          await tx.townTreasury.update({
            where: { id: building.town.treasury.id },
            data: { balance: { increment: dailyTax } },
          });
        }

        if (storageData.taxDelinquentSince) {
          const { taxDelinquentSince, ...rest } = storageData;
          await tx.building.update({
            where: { id: building.id },
            data: { storage: rest as Record<string, string | number | boolean | null> },
          });
        }
      });

      totalCollected += dailyTax;

      emitBuildingTaxDue(building.ownerId, {
        buildingId: building.id,
        buildingName: building.name,
        buildingType: building.type,
        townName: building.town.name,
        amount: dailyTax,
        paid: true,
        remainingGold: building.owner.gold - dailyTax,
      });
    } else {
      const delinquentSince = storageData.taxDelinquentSince
        ? new Date(storageData.taxDelinquentSince as string)
        : new Date();

      const daysSinceDelinquent = storageData.taxDelinquentSince
        ? Math.floor((Date.now() - delinquentSince.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysSinceDelinquent >= 7) {
        const newOwnerId = building.town.mayorId;
        if (newOwnerId) {
          await prisma.building.update({
            where: { id: building.id },
            data: {
              ownerId: newOwnerId,
              storage: { ...storageData, taxDelinquentSince: undefined },
            },
          });
        }

        emitBuildingSeized(building.ownerId, {
          buildingId: building.id,
          buildingName: building.name,
          buildingType: building.type,
          townName: building.town.name,
          daysDelinquent: daysSinceDelinquent,
          seizedByMayor: !!newOwnerId,
        });

        seizedCount++;
      } else {
        await prisma.building.update({
          where: { id: building.id },
          data: {
            storage: { ...storageData, taxDelinquentSince: delinquentSince.toISOString() },
          },
        });

        emitBuildingDelinquent(building.ownerId, {
          buildingId: building.id,
          buildingName: building.name,
          buildingType: building.type,
          townName: building.town.name,
          amountOwed: dailyTax,
          daysDelinquent: daysSinceDelinquent + 1,
          daysUntilSeizure: 7 - (daysSinceDelinquent + 1),
        });

        delinquentCount++;
      }
    }
  }

  if (totalCollected > 0 || delinquentCount > 0 || seizedCount > 0) {
    console.log(
      `[DailyTick]   Property tax: ${totalCollected}g collected, ${delinquentCount} delinquent, ${seizedCount} seized`
    );
  }
}

// ---------------------------------------------------------------------------
// Building Degradation (adapted from building-maintenance.ts)
// Daily tick degrades by 1 per day instead of 5 per week
// ---------------------------------------------------------------------------

async function degradeBuildings(): Promise<void> {
  let degradedCount = 0;
  let bldgCursor: string | undefined;
  let hasMoreBldg = true;

  while (hasMoreBldg) {
    const buildings = await prisma.building.findMany({
      where: { level: { gte: 1 } },
      include: {
        owner: { select: { id: true } },
        town: { select: { name: true } },
      },
      take: CURSOR_PAGE_SIZE,
      orderBy: { id: 'asc' },
      ...(bldgCursor ? { skip: 1, cursor: { id: bldgCursor } } : {}),
    });

    if (buildings.length < CURSOR_PAGE_SIZE) {
      hasMoreBldg = false;
    }
    if (buildings.length > 0) {
      bldgCursor = buildings[buildings.length - 1].id;
    }

    for (const building of buildings) {
      const storageData = building.storage as Record<string, unknown>;
      const currentCondition = (storageData.condition as number) ?? 100;
      const newCondition = Math.max(0, currentCondition - 1); // 1 per day

      if (newCondition !== currentCondition) {
        await prisma.building.update({
          where: { id: building.id },
          data: { storage: { ...storageData, condition: newCondition } },
        });
        degradedCount++;

        if (newCondition <= LOW_CONDITION_THRESHOLD && newCondition > 0) {
          emitBuildingConditionLow(building.ownerId, {
            buildingId: building.id,
            buildingName: building.name,
            buildingType: building.type,
            townName: building.town.name,
            condition: newCondition,
            isFunctional: newCondition >= NONFUNCTIONAL_THRESHOLD,
            isCondemned: false,
          });
        } else if (newCondition <= 0) {
          emitBuildingConditionLow(building.ownerId, {
            buildingId: building.id,
            buildingName: building.name,
            buildingType: building.type,
            townName: building.town.name,
            condition: 0,
            isFunctional: false,
            isCondemned: true,
          });
        }
      }
    }
  }

  if (degradedCount > 0) {
    console.log(`[DailyTick]   Degraded ${degradedCount} buildings by 1 condition`);
  }
}

// ---------------------------------------------------------------------------
// Election Processing (adapted from election-lifecycle.ts, tick-based)
// ---------------------------------------------------------------------------

async function processElections(): Promise<void> {
  // Auto-create elections for towns without one
  const townsWithActiveElection = await prisma.election.findMany({
    where: { phase: { not: 'COMPLETED' }, type: 'MAYOR' },
    select: { townId: true },
  });
  const townIdsWithElection = new Set(townsWithActiveElection.map(e => e.townId));

  const allTowns = await prisma.town.findMany({ select: { id: true, name: true } });
  const townsNeedingElection = allTowns.filter(t => !townIdsWithElection.has(t.id));

  for (const town of townsNeedingElection) {
    const lastElection = await prisma.election.findFirst({
      where: { townId: town.id, type: 'MAYOR' },
      orderBy: { termNumber: 'desc' },
      select: { termNumber: true },
    });
    const termNumber = (lastElection?.termNumber ?? 0) + 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + NOMINATION_TICKS + VOTING_TICKS);

    await prisma.election.create({
      data: {
        townId: town.id,
        type: 'MAYOR',
        status: 'ACTIVE',
        phase: 'NOMINATIONS',
        termNumber,
        startDate: now,
        endDate,
      },
    });
    console.log(`[DailyTick]   Created MAYOR election for "${town.name}" (term ${termNumber})`);
  }

  // Transition NOMINATIONS -> VOTING after NOMINATION_TICKS days
  // We use a tickCounter stored in election metadata, or count days from startDate
  const nominationElections = await prisma.election.findMany({
    where: { phase: 'NOMINATIONS' },
    include: {
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
      candidates: { select: { characterId: true } },
    },
  });

  for (const election of nominationElections) {
    const daysSinceStart = Math.floor(
      (Date.now() - election.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceStart >= NOMINATION_TICKS) {
      if (election.candidates.length === 0) {
        await prisma.election.update({
          where: { id: election.id },
          data: { phase: 'COMPLETED', status: 'COMPLETED' },
        });
        console.log(`[DailyTick]   Election ${election.id} completed with no candidates`);
        continue;
      }

      await prisma.election.update({
        where: { id: election.id },
        data: { phase: 'VOTING' },
      });
      console.log(`[DailyTick]   Election in "${election.town?.name ?? election.kingdom?.name}" moved to VOTING`);
    }
  }

  // Transition VOTING -> COMPLETED after NOMINATION_TICKS + VOTING_TICKS days
  const votingElections = await prisma.election.findMany({
    where: { phase: 'VOTING' },
    include: {
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
      candidates: { include: { character: { select: { id: true, name: true } } } },
    },
  });

  for (const election of votingElections) {
    const daysSinceStart = Math.floor(
      (Date.now() - election.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceStart >= NOMINATION_TICKS + VOTING_TICKS) {
      // Tally votes
      const voteCounts = await prisma.electionVote.groupBy({
        by: ['candidateId'],
        where: { electionId: election.id },
        _count: { candidateId: true },
      });
      const voteMap = new Map(voteCounts.map(v => [v.candidateId, v._count.candidateId]));

      let winnerId: string | null = null;
      let winnerName: string | null = null;
      let maxVotes = 0;

      const sortedCandidates = [...election.candidates].sort(
        (a, b) => a.nominatedAt.getTime() - b.nominatedAt.getTime()
      );

      for (const candidate of sortedCandidates) {
        const votes = voteMap.get(candidate.characterId) || 0;
        if (votes > maxVotes) {
          maxVotes = votes;
          winnerId = candidate.characterId;
          winnerName = candidate.character.name;
        }
      }

      await prisma.election.update({
        where: { id: election.id },
        data: { phase: 'COMPLETED', status: 'COMPLETED', winnerId },
      });

      if (winnerId) {
        if (election.type === 'MAYOR' && election.townId) {
          await prisma.town.update({
            where: { id: election.townId },
            data: { mayorId: winnerId },
          });
        } else if (election.type === 'RULER' && election.kingdomId) {
          await prisma.kingdom.update({
            where: { id: election.kingdomId },
            data: { rulerId: winnerId },
          });
        }
      }

      const locationName = election.town?.name || election.kingdom?.name || 'Unknown';
      console.log(`[DailyTick]   Election in "${locationName}" COMPLETED. Winner: ${winnerName || 'none'} (${maxVotes} votes)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Impeachment Processing
// ---------------------------------------------------------------------------

async function processImpeachments(): Promise<void> {
  const expired = await prisma.impeachment.findMany({
    where: { status: 'ACTIVE', endsAt: { lte: new Date() } },
    include: {
      target: { select: { id: true, name: true } },
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
    },
  });

  for (const impeachment of expired) {
    const passed = impeachment.votesFor > impeachment.votesAgainst;
    const newStatus = passed ? 'PASSED' : 'FAILED';

    await prisma.impeachment.update({
      where: { id: impeachment.id },
      data: { status: newStatus },
    });

    if (passed) {
      if (impeachment.townId) {
        await prisma.town.update({
          where: { id: impeachment.townId },
          data: { mayorId: null },
        });
      }
      if (impeachment.kingdomId) {
        await prisma.kingdom.update({
          where: { id: impeachment.kingdomId },
          data: { rulerId: null },
        });
      }
    }

    const locationName = impeachment.town?.name || impeachment.kingdom?.name || 'Unknown';
    console.log(
      `[DailyTick]   Impeachment ${newStatus} against ${impeachment.target.name} in "${locationName}" (${impeachment.votesFor}-${impeachment.votesAgainst})`
    );
  }
}

// ---------------------------------------------------------------------------
// Report summary builder
// ---------------------------------------------------------------------------

function buildReportSummary(results: CharacterResults): string {
  const parts: string[] = [];

  if (results.food?.consumed) {
    parts.push(`Ate ${results.food.consumed.name}`);
  }

  const action = results.action as Record<string, unknown> | undefined;
  if (action?.type === 'GATHER') {
    parts.push(`Gathered ${action.quantity}x ${action.resourceName}`);
  } else if (action?.type === 'CRAFT') {
    parts.push(`Crafted ${action.resultName} (${action.quality})`);
  } else if (action?.type === 'TRAVEL') {
    parts.push(action.success ? 'Traveled to new location' : 'Travel failed');
  } else if (action?.type === 'REST') {
    parts.push('Rested');
  }

  if (results.combatLogs.length > 0) {
    parts.push(`${results.combatLogs.length} combat(s)`);
  }
  if (results.xpEarned > 0) {
    parts.push(`+${results.xpEarned} XP`);
  }
  if (results.goldChange !== 0) {
    parts.push(`${results.goldChange > 0 ? '+' : ''}${results.goldChange}g`);
  }

  return parts.join('. ') || 'Nothing eventful happened.';
}

// ---------------------------------------------------------------------------
// Manual trigger function (exported for admin route)
// ---------------------------------------------------------------------------

export async function triggerManualTick(): Promise<{ success: boolean; result?: DailyTickResult; error?: string }> {
  try {
    const result = await processDailyTick();
    // Advance the game day so players can take new actions immediately
    const newOffset = advanceGameDay(1);
    result.gameDayOffset = newOffset;
    console.log(`[DailyTick] Game day advanced. Offset: +${newOffset}, next tick date: ${getTodayTickDate().toISOString().slice(0, 10)}`);
    return { success: true, result };
  } catch (err) {
    console.error('[DailyTick] Manual trigger failed:', err);
    return { success: false, error: (err as Error).message };
  }
}
