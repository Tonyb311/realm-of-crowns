/**
 * Daily Tick Processor — 12-step engine replacing all individual cron jobs.
 *
 * Runs once per game-day (default 00:00 UTC). Processes ALL locked-in
 * DailyActions in strict order with per-step error isolation.
 */

import { db } from '../lib/db';
import { eq, and, gte, lte, lt, gt, inArray, desc, asc, sql, count, isNotNull } from 'drizzle-orm';
import {
  dailyActions, characters, characterActiveEffects, townResources, resources, playerProfessions,
  inventories, items, itemTemplates, buildings, characterEquipment,
  laws, townTreasuries, townPolicies, tradeTransactions, caravans,
  elections, electionVotes, electionCandidates, impeachments, towns, kingdoms,
  worldEvents, combatEncounterLogs, notifications, recipes,
  ownedAssets, livestock, jobs, houses, houseStorage, noticeBoardPosts, churchChapters, gods, townMetrics,
} from '@database/tables';
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
import { cleanupExpiredDrops } from '../routes/inventory';
import { processLoans } from './loan-processing';
import { processReputationDecay } from './reputation-decay';
import { getTodayTickDate, advanceGameDay, getGameDay } from '../lib/game-day';
import { qualityRoll } from '@shared/utils/dice';
import { getWellRestedBonus } from '@shared/data/inn-config';
import { getProficiencyBonus, getModifier as getStatModifier } from '@shared/utils/bounded-accuracy';
import { getProfessionByType, getTierQualityBonus, getTierForLevel } from '@shared/data/professions';
import { getGatheringBonus } from '@shared/data/professions/tier-unlocks';
import { ACTION_XP } from '@shared/data/progression';
import { computeFeatBonus } from '@shared/data/feats';
import { GATHER_SPOT_PROFESSION_MAP, RESOURCE_MAP } from '@shared/data/gathering';
import { calculateChurchTier } from '@shared/data/religion-config';
import { GOD_BUFFS } from '@shared/data/god-buffs';
import { getCharacterReligionContext, resolveReligionBuffs } from '../services/religion-buffs';
import { ASSET_TIERS, LIVESTOCK_DEFINITIONS, HUNGER_CONSTANTS } from '@shared/data/assets';
import { getCottageTier } from '@shared/data/cottage-tiers';
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
  emitHouseUpgraded,
} from '../socket/events';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;
const CURSOR_PAGE_SIZE = 200;
const ABUNDANCE_DEPLETION_PER_GATHER = 2;
const MIN_ABUNDANCE_TO_GATHER = 10;
const BARE_HANDS_YIELD_PENALTY = 0.25;

const PROFESSION_RESOURCE_MAP: Partial<Record<string, string[]>> = {
  MINER: ['ORE', 'STONE'],
  LUMBERJACK: ['WOOD'],
  FARMER: ['GRAIN', 'FIBER'],
  HERBALIST: ['HERB', 'REAGENT'],
  FISHERMAN: ['FISH'],
  HUNTER: ['HIDE', 'ANIMAL_PRODUCT'],
};

const PROFESSION_WORKSHOP_MAP: Partial<Record<string, string>> = {
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
  MASTER: 4,
  GRANDMASTER: 5,
};

const BASE_PROPERTY_TAX_RATES: Record<string, number> = {
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
  harvestActionsProcessed: number;
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
  let harvestCount = 0;
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
  const hungerStates = new Map<string, string>();

  // Per-character food buff cache
  const foodBuffs = new Map<string, Record<string, unknown> | null>();

  // Per-character well-rested buff cache (characterId → innLevel)
  const wellRestedBuffs = new Map<string, number>();

  // Gold snapshot for tithe calculation (populated in Step 0.5)
  const goldSnapshots = new Map<string, number>();

  // -----------------------------------------------------------------------
  // Step 0: Reset consumable flags and expire active effects
  // -----------------------------------------------------------------------
  await runStep('Reset Consumable Flags', 0, async () => {
    await db.update(characters).set({
      potionBuffUsedToday: false,
      foodUsedToday: false,
      scrollUsedToday: false,
    });
    const expired = await db.delete(characterActiveEffects)
      .where(lte(characterActiveEffects.expiresAt, new Date().toISOString()));
    const rowCount = (expired as any).rowCount ?? 0;
    console.log(`[DailyTick]   Reset daily consumable flags, expired ${rowCount} active effects`);
  });

  // -----------------------------------------------------------------------
  // Step 0.5: Gold Snapshot — capture gold before any income/expense processing
  // -----------------------------------------------------------------------
  await runStep('Gold Snapshot', 0.5, async () => {
    const allChars = await db.query.characters.findMany({
      columns: { id: true, gold: true },
    });
    for (const c of allChars) {
      goldSnapshots.set(c.id, c.gold);
    }
    console.log(`[DailyTick]   Snapshotted gold for ${goldSnapshots.size} characters`);
  });

  // -----------------------------------------------------------------------
  // Step 1: Food Spoilage (consumption moved to Step 4b, after crafting)
  // -----------------------------------------------------------------------
  await runStep('Food Spoilage', 1, async () => {
    const spoilageResult = await processSpoilage();
    console.log(`[DailyTick]   Spoiled ${spoilageResult.spoiledCount} perishable items`);
  });

  // -----------------------------------------------------------------------
  // Step 1.3: Well Rested Buff — grant buff to characters checked into an inn
  // -----------------------------------------------------------------------
  await runStep('Well Rested Buff', 1.3, async () => {
    const checkedInChars = await db.query.characters.findMany({
      where: isNotNull(characters.checkedInInnId),
      columns: { id: true, checkedInInnId: true },
    });

    let granted = 0;
    for (const char of checkedInChars) {
      const inn = await db.query.buildings.findFirst({
        where: eq(buildings.id, char.checkedInInnId!),
        columns: { level: true },
      });
      if (!inn || inn.level < 1) continue;

      // Remove any existing INN_REST effect (replace, don't stack)
      await db.delete(characterActiveEffects)
        .where(and(
          eq(characterActiveEffects.characterId, char.id),
          eq(characterActiveEffects.sourceType, 'INN_REST'),
        ));

      // Create new INN_REST effect (expires in 24h)
      await db.insert(characterActiveEffects).values({
        id: crypto.randomUUID(),
        characterId: char.id,
        sourceType: 'INN_REST',
        effectType: 'well_rested',
        magnitude: inn.level,
        itemName: 'Well Rested',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Set wellRested flag on character
      await db.update(characters)
        .set({ wellRested: true })
        .where(eq(characters.id, char.id));

      // Cache for downstream steps
      wellRestedBuffs.set(char.id, inn.level);
      granted++;
    }
    console.log(`[DailyTick]   Granted Well Rested buff to ${granted} inn patrons`);
  });

  // -----------------------------------------------------------------------
  // Step 1.5: Inn Checkout — everyone checks out at the start of a new day
  // -----------------------------------------------------------------------
  await runStep('Inn Checkout', 1.5, async () => {
    const result = await db.update(characters)
      .set({ checkedInInnId: null })
      .where(isNotNull(characters.checkedInInnId));
    console.log(`[DailyTick]   Checked out ${result.rowCount ?? 0} inn patrons`);
  });

  // -----------------------------------------------------------------------
  // Step 1.6: Church Tier Recalculation — reconcile membership + update tiers
  // -----------------------------------------------------------------------
  await runStep('Church Tier Recalculation', 1.6, async () => {
    // Get all towns that have at least one chapter
    const allChapters = await db.query.churchChapters.findMany();
    if (allChapters.length === 0) {
      console.log('[DailyTick]   No church chapters to process');
      return;
    }

    // Group chapters by town
    const chaptersByTown = new Map<string, typeof allChapters>();
    for (const ch of allChapters) {
      const arr = chaptersByTown.get(ch.townId) ?? [];
      arr.push(ch);
      chaptersByTown.set(ch.townId, arr);
    }

    let updated = 0;
    for (const [townId, townChapters] of chaptersByTown) {
      // Count total residents in this town
      const [{ value: totalResidents }] = await db
        .select({ value: count() })
        .from(characters)
        .where(eq(characters.homeTownId, townId));

      // Reconcile actual member counts from characters table
      for (const ch of townChapters) {
        const [{ value: actualCount }] = await db
          .select({ value: count() })
          .from(characters)
          .where(and(
            eq(characters.patronGodId, ch.godId),
            eq(characters.homeTownId, townId),
          ));

        const newTier = calculateChurchTier(actualCount, totalResidents);

        // Update memberCount + tier
        if (actualCount !== ch.memberCount || newTier !== ch.tier) {
          await db.update(churchChapters)
            .set({ memberCount: actualCount, tier: newTier })
            .where(eq(churchChapters.id, ch.id));
          updated++;
        }

        // Remove High Priest if chapter drops to MINORITY
        if (newTier === 'MINORITY' && ch.highPriestId) {
          await db.update(churchChapters)
            .set({ highPriestId: null })
            .where(eq(churchChapters.id, ch.id));
          console.log(`[DailyTick]   Removed High Priest from chapter ${ch.id} (dropped to MINORITY)`);
        }

        // Store actual count for dominance check
        (ch as any)._actualCount = actualCount;
        (ch as any)._newTier = newTier;
      }

      // Determine dominance: highest memberCount chapter at DOMINANT tier
      let dominantId: string | null = null;
      let highestCount = 0;
      for (const ch of townChapters) {
        const actual = (ch as any)._actualCount as number;
        const tier = (ch as any)._newTier as string;
        if (tier === 'DOMINANT' && actual > highestCount) {
          highestCount = actual;
          dominantId = ch.id;
        }
      }

      // Update isDominant flags + auto-deconsecrate shrines that lost dominance
      for (const ch of townChapters) {
        const shouldBeDominant = ch.id === dominantId;
        if (ch.isDominant !== shouldBeDominant) {
          const updates: Record<string, unknown> = { isDominant: shouldBeDominant };
          // Auto-deconsecrate shrine if chapter lost dominance
          if (!shouldBeDominant && ch.isShrine) {
            updates.isShrine = false;
            console.log(`[DailyTick]   Auto-deconsecrated shrine for chapter ${ch.id} (lost dominance)`);
          }
          await db.update(churchChapters)
            .set(updates)
            .where(eq(churchChapters.id, ch.id));
          updated++;
        }
      }
    }

    // ── Recalculate town metric modifiers from religion ──────
    let metricsUpdated = 0;
    for (const [townId, townChapters] of chaptersByTown) {
      // Reset all religion modifiers for this town
      await db.update(townMetrics)
        .set({ modifier: 0, effectiveValue: townMetrics.baseValue, lastUpdatedBy: null })
        .where(eq(townMetrics.townId, townId));

      // Find the dominant chapter (use refreshed data from above)
      const dominantCh = townChapters.find(ch => ch.id === (townChapters.find(c => (c as any)._newTier === 'DOMINANT' && (c as any)._actualCount > 0)?.id ?? ''));
      // Simpler: find the one we flagged as dominant
      const domId = (() => {
        let best: string | null = null;
        let bestCount = 0;
        for (const ch of townChapters) {
          if ((ch as any)._newTier === 'DOMINANT' && ((ch as any)._actualCount as number) > bestCount) {
            bestCount = (ch as any)._actualCount;
            best = ch.id;
          }
        }
        return best;
      })();

      if (domId) {
        const domChapter = townChapters.find(ch => ch.id === domId)!;
        const godBuff = GOD_BUFFS[domChapter.godId];
        const tier = (domChapter as any)._newTier as string;
        if (godBuff) {
          const modifiers = godBuff.metricModifiers[tier as keyof typeof godBuff.metricModifiers] ?? {};
          for (const [metricType, value] of Object.entries(modifiers)) {
            if (value === 0) continue;
            await db.update(townMetrics)
              .set({
                modifier: value,
                effectiveValue: sql`LEAST(100, GREATEST(0, ${townMetrics.baseValue} + ${value}))`,
                lastUpdatedBy: 'RELIGION',
              })
              .where(and(
                eq(townMetrics.townId, townId),
                eq(townMetrics.metricType, metricType),
              ));
            metricsUpdated++;
          }
        }
      }
    }

    console.log(`[DailyTick]   Processed ${allChapters.length} chapters across ${chaptersByTown.size} towns, ${updated} updates, ${metricsUpdated} metric modifiers`);
  });

  // -----------------------------------------------------------------------
  // Step 1.7: Notice Board Expiration — refund expired bounty escrow
  // -----------------------------------------------------------------------
  await runStep('Notice Board Expiration', 1.7, async () => {
    const now = new Date().toISOString();
    const expiredBounties = await db.query.noticeBoardPosts.findMany({
      where: and(
        eq(noticeBoardPosts.type, 'BOUNTY'),
        lte(noticeBoardPosts.expiresAt, now),
        inArray(noticeBoardPosts.bountyStatus, ['OPEN', 'CLAIMED']),
      ),
    });

    for (const post of expiredBounties) {
      if (post.bountyReward && post.bountyReward > 0) {
        await db.update(characters)
          .set({ gold: sql`gold + ${post.bountyReward}` })
          .where(eq(characters.id, post.authorId));
      }

      await db.update(noticeBoardPosts)
        .set({ bountyStatus: 'EXPIRED' })
        .where(eq(noticeBoardPosts.id, post.id));
    }

    console.log(`[DailyTick]   Expired ${expiredBounties.length} bounties, refunded escrow`);
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
    const gatherActions = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.actionType, 'GATHER'),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      with: {
        character: {
          columns: {
            id: true, race: true, subRace: true, level: true,
            currentTownId: true, homeTownId: true, patronGodId: true, hungerState: true, stats: true, feats: true,
          },
        },
      },
    });
    gatherCount = gatherActions.length;

    for (let i = 0; i < gatherActions.length; i += BATCH_SIZE) {
      const batch = gatherActions.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (action) => {
        try {
          await processGatherAction(action as any, tickDateStr, hungerStates, foodBuffs, wellRestedBuffs, getResults);
        } catch (err) {
          console.error(`[DailyTick] Step 4 gather error for ${action.characterId}:`, err);
          getResults(action.characterId).notifications.push('Gathering failed due to an error.');
        }
      }));
    }

    // --- Crafting ---
    const craftActions = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.actionType, 'CRAFT'),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      with: {
        character: {
          columns: {
            id: true, race: true, subRace: true, level: true,
            currentTownId: true, homeTownId: true, patronGodId: true, hungerState: true, stats: true, feats: true,
          },
        },
      },
    });
    craftCount = craftActions.length;

    for (let i = 0; i < craftActions.length; i += BATCH_SIZE) {
      const batch = craftActions.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (action) => {
        try {
          await processCraftAction(action as any, tickDateStr, hungerStates, foodBuffs, wellRestedBuffs, getResults);
        } catch (err) {
          console.error(`[DailyTick] Step 4 craft error for ${action.characterId}:`, err);
          getResults(action.characterId).notifications.push('Crafting failed due to an error.');
        }
      }));
    }

    // --- Harvesting (private asset harvesting) ---
    const harvestActions = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.actionType, 'HARVEST'),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      with: {
        character: {
          columns: {
            id: true, race: true, subRace: true, level: true,
            currentTownId: true, hungerState: true, stats: true,
          },
        },
      },
    });
    harvestCount = harvestActions.length;

    for (let i = 0; i < harvestActions.length; i += BATCH_SIZE) {
      const batch = harvestActions.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (action) => {
        try {
          await processHarvestAction(action as any, tickDateStr, hungerStates, foodBuffs, getResults);
        } catch (err) {
          console.error(`[DailyTick] Step 4 harvest error for ${action.characterId}:`, err);
          getResults(action.characterId).notifications.push('Harvesting failed due to an error.');
        }
      }));
    }
  });

  // -----------------------------------------------------------------------
  // Step 4a: Cottage Upgrades (BEFORE harvest so new slots are available)
  // -----------------------------------------------------------------------
  await runStep('Cottage Upgrades', 4.1, async () => {
    const pendingUpgrades = await db.query.houses.findMany({
      where: sql`${houses.upgradingToTier} IS NOT NULL`,
    });

    for (const house of pendingUpgrades) {
      const tierConfig = getCottageTier(house.upgradingToTier!);
      if (tierConfig) {
        await db.update(houses)
          .set({
            tier: house.upgradingToTier!,
            storageSlots: tierConfig.storageSlots,
            upgradingToTier: null,
            name: tierConfig.name,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(houses.id, house.id));

        emitHouseUpgraded(house.characterId, {
          houseId: house.id,
          tierName: tierConfig.name,
          newTier: tierConfig.tier,
          storageSlots: tierConfig.storageSlots,
        });
      }
    }

    if (pendingUpgrades.length > 0) {
      console.log(`[DailyTick] Completed ${pendingUpgrades.length} cottage upgrade(s)`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 4b: Food Auto-Consumption (AFTER crafting to preserve ingredients)
  // -----------------------------------------------------------------------
  await runStep('Food Auto-Consumption', 4.5, async () => {
    // Per-character auto-consumption with cursor-based pagination
    let lastId: string | undefined;
    let hasMoreChars = true;

    while (hasMoreChars) {
      const charPage = await db.query.characters.findMany({
        columns: { id: true, race: true, foodUsedToday: true, daysSinceLastMeal: true },
        limit: CURSOR_PAGE_SIZE,
        orderBy: asc(characters.id),
        ...(lastId ? { where: gt(characters.id, lastId) } : {}),
      });

      if (charPage.length < CURSOR_PAGE_SIZE) {
        hasMoreChars = false;
      }
      if (charPage.length > 0) {
        lastId = charPage[charPage.length - 1].id;
      }

      // Process this page in sub-batches
      for (let i = 0; i < charPage.length; i += BATCH_SIZE) {
        const batch = charPage.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (char) => {
        try {
          if (char.race === 'REVENANT') {
            const seResult = await processRevenantSustenance(char.id);
            // Map soulFadeStage to hunger-equivalent for downstream steps
            const hungerEquiv =
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
              results.notifications.push('The Soul Essence anchors your spirit. Your form solidifies.');
            }
          } else if (char.race === 'FORGEBORN') {
            const mkResult = await processForgebornMaintenance(char.id);
            const hungerEquiv =
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
            // Player-initiated food consumption: check if they ate via API
            if (!char.foodUsedToday) {
              // Character didn't eat — increment hunger
              const newDays = (char.daysSinceLastMeal ?? 0) + 1;
              const newHungerState =
                newDays <= 0 ? 'FED' :
                newDays <= 2 ? 'HUNGRY' :
                newDays <= 4 ? 'STARVING' : 'INCAPACITATED';
              await db.update(characters).set({
                daysSinceLastMeal: newDays,
                hungerState: newHungerState,
              }).where(eq(characters.id, char.id));
              hungerStates.set(char.id, newHungerState);
              foodBuffs.set(char.id, null);

              const results = getResults(char.id);
              results.food = { consumed: null, buff: null };

              if (newHungerState === 'STARVING' || newHungerState === 'INCAPACITATED') {
                results.notifications.push(
                  `You are ${newHungerState.toLowerCase()}! Acquire food urgently.`
                );
              }
            } else {
              // Character ate via API — hunger already reset, buff already in active effects
              hungerStates.set(char.id, 'FED');
              foodBuffs.set(char.id, null); // Buff is in character_active_effects, not here
              const results = getResults(char.id);
              results.food = { consumed: null, buff: null };
            }
          }
        } catch (err) {
          console.error(`[DailyTick] Step 4b error for character ${char.id}:`, err);
        }
      }));
      }
    }
  });

  // -----------------------------------------------------------------------
  // Step 4c: Asset Growth Cycle
  // -----------------------------------------------------------------------
  await runStep('Asset Growth Cycle', 4.6, async () => {
    const currentDay = getGameDay();

    // 1. GROWING -> READY (crops that finished growing)
    const newlyReady = await db.query.ownedAssets.findMany({
      where: and(eq(ownedAssets.cropState, 'GROWING'), lte(ownedAssets.readyAt, currentDay)),
      with: { character: { columns: { id: true, name: true } }, town: { columns: { name: true } } },
    });

    if (newlyReady.length > 0) {
      await db.update(ownedAssets)
        .set({ cropState: 'READY' })
        .where(inArray(ownedAssets.id, newlyReady.map(a => a.id)));

      // Notify owners
      for (const asset of newlyReady) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          characterId: asset.ownerId,
          type: 'asset:crop_ready',
          title: 'Crop Ready!',
          message: `Your ${asset.name} in ${asset.town.name} is ready to harvest!`,
          data: { assetId: asset.id, spotType: asset.spotType },
        });
      }

      console.log(`[DailyTick]   ${newlyReady.length} asset(s) now READY for harvest`);
    }

    // 2. READY -> WITHERED (crops that spoiled — reset to EMPTY)
    const witheredAssets = await db.query.ownedAssets.findMany({
      where: and(eq(ownedAssets.cropState, 'READY'), lte(ownedAssets.witheringAt, currentDay)),
      with: { character: { columns: { id: true, name: true } }, town: { columns: { name: true } } },
    });

    if (witheredAssets.length > 0) {
      await db.update(ownedAssets)
        .set({ cropState: 'EMPTY', plantedAt: null, readyAt: null, witheringAt: null })
        .where(inArray(ownedAssets.id, witheredAssets.map(a => a.id)));

      // Notify owners
      for (const asset of witheredAssets) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          characterId: asset.ownerId,
          type: 'asset:crop_withered',
          title: 'Crop Withered!',
          message: `Your ${asset.name} in ${asset.town.name} withered! The crop was lost.`,
          data: { assetId: asset.id, spotType: asset.spotType },
        });
      }

      console.log(`[DailyTick]   ${witheredAssets.length} asset(s) WITHERED and reset to EMPTY`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 4d: Livestock Processing (RANCHER buildings)
  // -----------------------------------------------------------------------
  await runStep('Livestock Processing', 4.7, async () => {
    const currentDay = getGameDay();
    const isFeedDay = currentDay % 3 === 0;

    // Fetch all alive livestock grouped with building + owner info
    const allLivestock = await db.query.livestock.findMany({
      where: eq(livestock.isAlive, true),
      with: {
        ownedAsset: { columns: { id: true, spotType: true, townId: true, pendingYieldSince: true } },
        character: { columns: { id: true, name: true } },
      },
    });

    if (allLivestock.length === 0) {
      console.log('[DailyTick]   No alive livestock to process');
      return;
    }

    let deaths = 0;
    let fed = 0;
    let produced = 0;
    let starved = 0;

    // Group by owner for efficient grain lookup
    const byOwner = new Map<string, typeof allLivestock>();
    for (const animal of allLivestock) {
      const list = byOwner.get(animal.ownerId) || [];
      list.push(animal);
      byOwner.set(animal.ownerId, list);
    }

    for (const [ownerId, animals] of byOwner) {
      await db.transaction(async (tx) => {
        // Look up owner's Grain inventory (for feeding)
        let grainStack: { id: string; quantity: number; itemId: string } | null = null;
        if (isFeedDay) {
          const grainResult = await tx.query.inventories.findFirst({
            where: eq(inventories.characterId, ownerId),
            with: { item: { with: { itemTemplate: true } } },
          });
          // Filter for grain in JS — Drizzle doesn't support nested where on relations
          const allInv = await tx.query.inventories.findMany({
            where: eq(inventories.characterId, ownerId),
            with: { item: { with: { itemTemplate: true } } },
          });
          const grainEntry = allInv.find(inv => inv.item?.itemTemplate?.name === 'Grain');
          if (grainEntry) {
            grainStack = { id: grainEntry.id, quantity: grainEntry.quantity, itemId: grainEntry.itemId };
          }
        }

        // Cache owner's RANCHER level for Fine Wool bonus
        let rancherLevel = 0;
        const rancherProf = await tx.query.playerProfessions.findFirst({
          where: and(eq(playerProfessions.characterId, ownerId), eq(playerProfessions.professionType, 'RANCHER' as any)),
          columns: { level: true },
        });
        if (rancherProf) rancherLevel = rancherProf.level;

        // Pre-fetch Fine Wool template for L7+ sheep bonus
        let fineWoolTemplateId: string | null = null;
        if (rancherLevel >= 7) {
          const fwt = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, 'Fine Wool') });
          if (fwt) fineWoolTemplateId = fwt.id;
        }

        for (const animal of animals) {
          const def = LIVESTOCK_DEFINITIONS[animal.animalType];
          if (!def) continue;

          let isDead = false;
          let deathCause: string | null = null;
          let newHunger = animal.hunger;
          let newHealth = animal.health;
          const newAge = animal.age + 1;

          // 1. Old age death
          if (newAge >= def.maxAge) {
            isDead = true;
            deathCause = 'old_age';
          }

          // 2. Starvation death
          if (!isDead && newHunger >= HUNGER_CONSTANTS.DEATH_THRESHOLD) {
            isDead = true;
            deathCause = 'starvation';
          }

          // 3. Random events (only if still alive)
          if (!isDead) {
            const predatorRoll = Math.random();
            if (predatorRoll < HUNGER_CONSTANTS.PREDATOR_CHANCE) {
              isDead = true;
              deathCause = 'predator';
            }
          }
          if (!isDead) {
            const diseaseRoll = Math.random();
            if (diseaseRoll < HUNGER_CONSTANTS.DISEASE_CHANCE) {
              newHealth -= HUNGER_CONSTANTS.DISEASE_HEALTH_LOSS;
              if (newHealth <= 0) {
                isDead = true;
                deathCause = 'disease';
              }
            }
          }

          // Handle death
          if (isDead) {
            await tx.update(livestock)
              .set({ isAlive: false, deathCause, age: newAge, health: Math.max(0, newHealth) })
              .where(eq(livestock.id, animal.id));
            deaths++;

            await tx.insert(notifications).values({
              id: crypto.randomUUID(),
              characterId: ownerId,
              type: 'rancher:animal_died',
              title: 'Animal Died',
              message: `Your ${def.name} "${animal.name || def.name}" died (${deathCause}).`,
              data: { livestockId: animal.id, animalType: animal.animalType, cause: deathCause },
            });
            continue;
          }

          // 4. Feeding (every 3 ticks)
          if (isFeedDay) {
            if (grainStack && grainStack.quantity >= def.feedCost) {
              // Deduct grain
              grainStack.quantity -= def.feedCost;
              if (grainStack.quantity <= 0) {
                await tx.delete(inventories).where(eq(inventories.id, grainStack.id));
                await tx.delete(items).where(eq(items.id, grainStack.itemId));
                grainStack = null;
              } else {
                await tx.update(inventories)
                  .set({ quantity: grainStack.quantity })
                  .where(eq(inventories.id, grainStack.id));
              }
              newHunger = 0;
              fed++;
            } else {
              // Missed feed — hunger increases
              newHunger = Math.min(newHunger + HUNGER_CONSTANTS.HUNGER_PER_MISSED_FEED, HUNGER_CONSTANTS.DEATH_THRESHOLD);
              starved++;
            }
          }

          // 5. Production (same cycle as feeding, only if not starving)
          let producedThisTick = false;
          if (isFeedDay && newHunger < HUNGER_CONSTANTS.STARVING_THRESHOLD) {
            const yield_ = def.minYield + Math.floor(Math.random() * (def.maxYield - def.minYield + 1));

            // Increment pending yield on the building (collection required)
            const resourceEntry = RESOURCE_MAP[animal.ownedAsset.spotType];
            if (resourceEntry) {
              await tx.update(ownedAssets)
                .set({
                  pendingYield: sql`${ownedAssets.pendingYield} + ${yield_}`,
                  // Only set pendingYieldSince if not already tracking
                  ...(animal.ownedAsset.pendingYieldSince == null ? { pendingYieldSince: currentDay } : {}),
                })
                .where(eq(ownedAssets.id, animal.ownedAsset.id));

              produced += yield_;
              producedThisTick = true;

              // 5b. Fine Wool bonus — L7+ RANCHER sheep produce Fine Wool alongside Wool
              if (animal.animalType === 'sheep' && fineWoolTemplateId) {
                const [fwItem] = await tx.insert(items).values({
                  id: crypto.randomUUID(),
                  templateId: fineWoolTemplateId,
                  quality: 'COMMON',
                }).returning();
                await tx.insert(inventories).values({
                  id: crypto.randomUUID(),
                  characterId: ownerId,
                  itemId: fwItem.id,
                  quantity: 1,
                });
              }
            }
          }

          // 6. Update animal state
          await tx.update(livestock)
            .set({
              age: newAge,
              hunger: newHunger,
              health: newHealth,
              ...(isFeedDay && newHunger === 0 ? { lastFedAt: currentDay } : {}),
              ...(producedThisTick ? { lastProducedAt: currentDay } : {}),
            })
            .where(eq(livestock.id, animal.id));

          // 7. Award RANCHER XP for production
          if (producedThisTick) {
            await addProfessionXP(ownerId, 'RANCHER' as any, 5, `livestock_${animal.animalType}_produce`);
          }
        }
      });
    }

    // Silkworm House auto-production (non-livestock building, increments pendingYield on feed days)
    if (isFeedDay) {
      const silkwormHouses = await db.query.ownedAssets.findMany({
        where: eq(ownedAssets.spotType, 'silkworm_house'),
      });

      let silkwormProduced = 0;
      for (const house of silkwormHouses) {
        // Check owner has RANCHER L7+
        const ownerRancherProf = await db.query.playerProfessions.findFirst({
          where: and(eq(playerProfessions.characterId, house.ownerId), eq(playerProfessions.professionType, 'RANCHER' as any)),
          columns: { level: true },
        });
        if (!ownerRancherProf || ownerRancherProf.level < 7) continue;

        await db.update(ownedAssets)
          .set({
            pendingYield: sql`${ownedAssets.pendingYield} + 1`,
            ...(house.pendingYieldSince == null ? { pendingYieldSince: currentDay } : {}),
          })
          .where(eq(ownedAssets.id, house.id));
        silkwormProduced++;
      }
      if (silkwormProduced > 0) {
        produced += silkwormProduced;
        console.log(`[DailyTick]   Silkworm Houses: ${silkwormProduced} cocoon yield(s) added`);
      }
    }

    // Low-feed warnings
    if (starved > 0) {
      for (const [ownerId] of byOwner) {
        // Only warn once per owner
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          characterId: ownerId,
          type: 'rancher:low_feed',
          title: 'Low Feed Warning',
          message: 'Some of your animals missed their feeding. Stock up on Grain to keep them fed!',
          data: {},
        }).catch(() => {}); // Non-critical
      }
    }

    console.log(`[DailyTick]   Livestock: ${deaths} deaths, ${fed} fed, ${starved} missed feed, ${produced} items produced`);
  });

  // -----------------------------------------------------------------------
  // Step 4.8: Job Auto-Posting & Expiry
  // -----------------------------------------------------------------------
  await runStep('Job Auto-Posting & Expiry', 4.8, async () => {
    const now = new Date().toISOString();

    // 1. Find and expire old jobs, refunding escrowed gold + items
    // Query OPEN and IN_PROGRESS (for delivery deadlines). Exclude DELIVERED — those wait for pickup.
    const expirableJobs = await db.query.jobs.findMany({
      where: and(
        inArray(jobs.status, ['OPEN', 'IN_PROGRESS']),
        sql`${jobs.expiresAt} IS NOT NULL`,
        lte(jobs.expiresAt, now),
      ),
    });

    let expiredCount = 0;
    let workshopExpiredCount = 0;
    let deliveryExpiredCount = 0;
    for (const job of expirableJobs) {
      await db.transaction(async (tx) => {
        if (job.category === 'DELIVERY' && job.status === 'IN_PROGRESS') {
          // Delivery deadline missed: full wage refund to poster (worker penalty — gets nothing)
          await tx.update(characters)
            .set({ gold: sql`${characters.gold} + ${job.wage}` })
            .where(eq(characters.id, job.posterId));
        } else {
          // Standard: refund escrowed gold to poster
          await tx.update(characters)
            .set({ gold: sql`${characters.gold} + ${job.wage}` })
            .where(eq(characters.id, job.posterId));
        }

        // Refund escrowed materials for WORKSHOP jobs
        if (job.category === 'WORKSHOP' && job.materialsEscrow) {
          const escrow = job.materialsEscrow as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
          for (const mat of escrow) {
            const [item] = await tx.insert(items).values({
              id: crypto.randomUUID(),
              templateId: mat.itemTemplateId,
              ownerId: job.posterId,
              quality: 'COMMON',
              enchantments: [],
            }).returning();
            await tx.insert(inventories).values({
              id: crypto.randomUUID(),
              characterId: job.posterId,
              itemId: item.id,
              quantity: mat.quantity,
            });
          }
          workshopExpiredCount++;
        }

        // Refund escrowed delivery items
        if (job.category === 'DELIVERY' && job.deliveryItems) {
          const deliveryEscrow = job.deliveryItems as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
          for (const di of deliveryEscrow) {
            const [item] = await tx.insert(items).values({
              id: crypto.randomUUID(),
              templateId: di.itemTemplateId,
              ownerId: job.posterId,
              quality: 'COMMON',
              enchantments: [],
            }).returning();
            await tx.insert(inventories).values({
              id: crypto.randomUUID(),
              characterId: job.posterId,
              itemId: item.id,
              quantity: di.quantity,
            });
          }
          deliveryExpiredCount++;
        }

        await tx.update(jobs)
          .set({ status: 'EXPIRED' })
          .where(eq(jobs.id, job.id));
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      const details: string[] = [];
      if (workshopExpiredCount > 0) details.push(`${workshopExpiredCount} workshop (materials refunded)`);
      if (deliveryExpiredCount > 0) details.push(`${deliveryExpiredCount} delivery (items refunded)`);
      console.log(`[DailyTick]   Expired ${expiredCount} jobs (gold refunded${details.length > 0 ? `, ${details.join(', ')}` : ''})`);
    }

    // (Auto-posting removed — job posting is always a deliberate player/bot choice)
  });

  // -----------------------------------------------------------------------
  // Step 5: Service Profession Actions
  // -----------------------------------------------------------------------
  await runStep('Service Professions', 5, async () => {
    // Innkeepers earn from resting characters in their town
    const restingActions = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.actionType, 'REST'),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      with: {
        character: { columns: { id: true, currentTownId: true } },
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
      const innkeepers = await db.query.playerProfessions.findMany({
        where: and(
          eq(playerProfessions.professionType, 'INNKEEPER' as any),
          eq(playerProfessions.isActive, true),
        ),
        with: { character: { columns: { id: true, name: true, currentTownId: true } } },
      });

      const townInnkeepers = innkeepers.filter(ik => ik.character.currentTownId === townId);
      if (townInnkeepers.length === 0) continue;

      const incomePerRester = 5; // base lodging fee
      const totalIncome = Math.floor(resterIds.length * incomePerRester / townInnkeepers.length);

      for (const innkeeper of townInnkeepers) {
        if (totalIncome > 0) {
          await db.update(characters)
            .set({ gold: sql`${characters.gold} + ${totalIncome}` })
            .where(eq(characters.id, innkeeper.characterId));
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
    const proposedLaws = await db.query.laws.findMany({
      where: and(eq(laws.status, 'PROPOSED'), lte(laws.expiresAt, now.toISOString())),
    });
    lawsCount = proposedLaws.length;

    for (const law of proposedLaws) {
      const passed = law.votesFor > law.votesAgainst;
      await db.update(laws)
        .set({ status: passed ? 'ACTIVE' : 'REJECTED' })
        .where(eq(laws.id, law.id));
      console.log(`[DailyTick]   Law "${law.title}" ${passed ? 'PASSED' : 'REJECTED'} (${law.votesFor}-${law.votesAgainst})`);
    }

    // Expire active laws past their expiresAt
    const expiredResult = await db.update(laws)
      .set({ status: 'EXPIRED' })
      .where(and(eq(laws.status, 'ACTIVE'), lte(laws.expiresAt, now.toISOString())));
    const expiredCount = expiredResult.rowCount ?? 0;
    if (expiredCount > 0) {
      console.log(`[DailyTick]   Expired ${expiredCount} law(s)`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 7: Economy Cycle
  // -----------------------------------------------------------------------
  await runStep('Economy Cycle', 7, async () => {
    const now = new Date();

    // --- Tax Collection ---
    const allTreasuries = await db.query.townTreasuries.findMany();
    for (const treasury of allTreasuries) {
      const txList = await db.query.tradeTransactions.findMany({
        where: and(
          eq(tradeTransactions.townId, treasury.townId),
          gt(tradeTransactions.timestamp, treasury.lastCollectedAt),
        ),
      });

      if (txList.length === 0) continue;

      const policy = await db.query.townPolicies.findFirst({
        where: eq(townPolicies.townId, treasury.townId),
      });
      const taxRate = policy?.taxRate ?? treasury.taxRate;

      let totalTax = 0;
      for (const tx of txList) {
        totalTax += Math.floor(tx.price * tx.quantity * taxRate);
      }

      if (totalTax > 0) {
        await db.update(townTreasuries)
          .set({
            balance: sql`${townTreasuries.balance} + ${totalTax}`,
            lastCollectedAt: now.toISOString(),
          })
          .where(eq(townTreasuries.id, treasury.id));
        console.log(`[DailyTick]   Collected ${totalTax}g tax from town ${treasury.townId}`);
      }
    }

    // --- Property Taxes ---
    await collectPropertyTaxes();

    // --- Building Degradation (1 point per tick instead of 5 per week) ---
    await degradeBuildings();

    // --- Resource Regeneration ---
    const depletedResources = await db.query.townResources.findMany({
      where: lt(townResources.abundance, 100),
    });
    let resourcesRestored = 0;
    for (const resource of depletedResources) {
      const increment = Math.max(1, Math.round(resource.respawnRate));
      const newAbundance = Math.min(100, resource.abundance + increment);
      if (newAbundance !== resource.abundance) {
        await db.update(townResources)
          .set({ abundance: newAbundance })
          .where(eq(townResources.id, resource.id));
        resourcesRestored++;
      }
    }
    if (resourcesRestored > 0) {
      console.log(`[DailyTick]   Restored abundance for ${resourcesRestored} town resources`);
    }
    resourcesRestoredCount = resourcesRestored;

    // --- Caravan Arrivals ---
    const arrivedCaravans = await db.query.caravans.findMany({
      where: and(eq(caravans.status, 'IN_PROGRESS'), lte(caravans.arrivesAt, now.toISOString())),
      with: { town_toTownId: { columns: { name: true } } },
    });
    for (const caravan of arrivedCaravans) {
      emitNotification(caravan.ownerId, {
        id: `caravan-ready-${caravan.id}`,
        type: 'caravan:arrived',
        title: 'Caravan Arrived!',
        message: `Your caravan has arrived at ${caravan.town_toTownId.name}. Visit the town to collect your goods.`,
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
    await processImpeachmentsLocal();

    // Check treaty expirations
    const { treaties } = await import('@database/tables');
    const expiredResult = await db.update(treaties)
      .set({ status: 'EXPIRED' })
      .where(and(eq(treaties.status, 'ACTIVE'), lte(treaties.expiresAt, now.toISOString())));
    const expiredCount = expiredResult.rowCount ?? 0;
    if (expiredCount > 0) {
      console.log(`[DailyTick]   Expired ${expiredCount} treaty/treaties`);
    }
  });

  // -----------------------------------------------------------------------
  // Step 9: Rest/Idle Processing
  // -----------------------------------------------------------------------
  await runStep('Rest/Idle Processing', 9, async () => {
    // Find characters with REST actions or no locked action for today
    const restActions = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.actionType, 'REST'),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      columns: { characterId: true },
    });
    restCount = restActions.length;

    const restingIds = new Set(restActions.map(a => a.characterId));

    // Characters with NO action default to rest
    const allActive = await db.query.dailyActions.findMany({
      where: and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.status, 'LOCKED_IN'),
      ),
      columns: { characterId: true },
    });
    const activeIds = new Set(allActive.map(a => a.characterId));

    // Cursor-based pagination for rest/heal processing
    let restLastId: string | undefined;
    let hasMoreRest = true;

    while (hasMoreRest) {
      const restPage = await db.query.characters.findMany({
        columns: { id: true, maxHealth: true, health: true, hungerState: true },
        limit: CURSOR_PAGE_SIZE,
        orderBy: asc(characters.id),
        ...(restLastId ? { where: gt(characters.id, restLastId) } : {}),
      });

      if (restPage.length < CURSOR_PAGE_SIZE) {
        hasMoreRest = false;
      }
      if (restPage.length > 0) {
        restLastId = restPage[restPage.length - 1].id;
      }

      for (const char of restPage) {
        const isResting = restingIds.has(char.id) || !activeIds.has(char.id);
        if (!isResting) continue;

        const hungerState = hungerStates.get(char.id) ?? char.hungerState ?? 'HUNGRY';

        const hasWellRestedBuff = wellRestedBuffs.has(char.id);

        if (hungerState === 'FED') {
          // Heal 15% max HP (+ well-rested bonus if checked in)
          let healPercent = 0.15;
          if (hasWellRestedBuff) {
            const wrBonus = getWellRestedBonus(wellRestedBuffs.get(char.id)!);
            if (wrBonus) healPercent += wrBonus.combatHpRecoveryPercent;
          }
          const healAmount = Math.floor(char.maxHealth * healPercent);
          const newHealth = Math.min(char.maxHealth, char.health + healAmount);

          await db.update(characters)
            .set({ health: newHealth, wellRested: true })
            .where(eq(characters.id, char.id));

          const results = getResults(char.id);
          results.action = results.action ?? { type: 'REST' };
          results.notifications.push(`Rested well and recovered ${healAmount} HP.`);
        } else {
          // No recovery when not fed — only clear wellRested if no INN_REST buff
          await db.update(characters)
            .set({ wellRested: hasWellRestedBuff })
            .where(eq(characters.id, char.id));

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
      const [event] = await db.insert(worldEvents).values({
        id: crypto.randomUUID(),
        eventType: 'DAILY_SUMMARY',
        title: `Day ${tickDateStr} Summary`,
        description: `${totalTravelers} travelers, ${totalCombats} combats, ${totalGathers} gatherers.`,
        metadata: { tickDate: tickDateStr, totalCombats, totalGathers, totalTravelers },
      }).returning();

      emitWorldEvent({
        id: event.id,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        createdAt: event.createdAt,
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
  // Step 11.5: Tithe Collection — deduct tithe from daily income, credit church treasuries
  // -----------------------------------------------------------------------
  await runStep('Tithe Collection', 11.5, async () => {
    const now = new Date();

    // Fetch all tithing characters (have a patron god and tithe rate > 0)
    const tithingCharacters = await db.query.characters.findMany({
      where: and(
        isNotNull(characters.patronGodId),
        gt(characters.titheRate, 0),
      ),
      columns: { id: true, gold: true, patronGodId: true, homeTownId: true, titheRate: true, conversionCooldownUntil: true },
    });

    // Build a god name lookup for notifications
    const allGods = await db.query.gods.findMany({ columns: { id: true, churchName: true } });
    const godChurchNames = new Map(allGods.map(g => [g.id, g.churchName]));

    const chapterTitheAccumulator = new Map<string, number>(); // key: `${godId}:${townId}`
    let totalTithed = 0;
    let tithersCount = 0;

    for (const char of tithingCharacters) {
      // Skip if in conversion cooldown
      if (char.conversionCooldownUntil && new Date(char.conversionCooldownUntil) > now) continue;

      // Skip if no home town
      if (!char.homeTownId) continue;

      const startingGold = goldSnapshots.get(char.id) ?? char.gold;
      const income = char.gold - startingGold;
      if (income <= 0) continue; // No income today, no tithe

      const titheAmount = Math.floor(income * (char.titheRate / 100));
      if (titheAmount <= 0) continue;

      // Deduct from character
      await db.update(characters)
        .set({ gold: sql`${characters.gold} - ${titheAmount}` })
        .where(eq(characters.id, char.id));

      // Accumulate for batch chapter update
      const key = `${char.patronGodId}:${char.homeTownId}`;
      chapterTitheAccumulator.set(key, (chapterTitheAccumulator.get(key) ?? 0) + titheAmount);

      // Add to daily report
      const results = getResults(char.id);
      const churchName = godChurchNames.get(char.patronGodId!) ?? 'your church';
      results.notifications.push(`Tithed ${titheAmount}g to the ${churchName}.`);
      results.goldChange -= titheAmount;

      totalTithed += titheAmount;
      tithersCount++;
    }

    // Batch update church treasuries
    for (const [key, amount] of chapterTitheAccumulator) {
      const [godId, townId] = key.split(':');
      await db.update(churchChapters)
        .set({ treasury: sql`${churchChapters.treasury} + ${amount}` })
        .where(and(eq(churchChapters.godId, godId), eq(churchChapters.townId, townId)));
    }

    if (totalTithed > 0) {
      console.log(`[DailyTick]   Collected ${totalTithed}g in tithes from ${tithersCount} characters across ${chapterTitheAccumulator.size} chapters`);
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
          // Pull in combat logs from CombatEncounterLog for today
          const todayStart = new Date(tickDateStr);
          const todayEnd = new Date(todayStart);
          todayEnd.setDate(todayEnd.getDate() + 1);

          const todayCombats = await db.query.combatEncounterLogs.findMany({
            where: and(
              eq(combatEncounterLogs.characterId, charId),
              inArray(combatEncounterLogs.triggerSource, ['road_encounter', 'group_road_encounter']),
              gte(combatEncounterLogs.createdAt, todayStart.toISOString()),
              lt(combatEncounterLogs.createdAt, todayEnd.toISOString()),
            ),
            columns: {
              opponentName: true, outcome: true, totalRounds: true, summary: true,
              rounds: true, xpAwarded: true, goldAwarded: true, lootDropped: true,
              characterStartHp: true, characterEndHp: true,
              opponentStartHp: true, opponentEndHp: true,
            },
          });

          if (todayCombats.length > 0) {
            results.combatLogs = todayCombats.map(c => ({
              monsterName: c.opponentName,
              outcome: c.outcome,
              totalRounds: c.totalRounds,
              summary: c.summary,
              rounds: c.rounds,
              xpAwarded: c.xpAwarded,
              goldAwarded: c.goldAwarded,
              loot: c.lootDropped,
              characterStartHp: c.characterStartHp,
              characterEndHp: c.characterEndHp,
              opponentStartHp: c.opponentStartHp,
              opponentEndHp: c.opponentEndHp,
            }));
          }

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
    await db.update(dailyActions)
      .set({ status: 'COMPLETED' })
      .where(and(
        gte(dailyActions.tickDate, new Date(tickDateStr + 'T00:00:00.000Z').toISOString()),
        lt(dailyActions.tickDate, new Date(tickDateStr + 'T23:59:59.999Z').toISOString()),
        eq(dailyActions.status, 'LOCKED_IN'),
      ));

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

  // -----------------------------------------------------------------------
  // Step 16: Expired Drop Cleanup
  // -----------------------------------------------------------------------
  await runStep('Expired Drop Cleanup', 16, async () => {
    const cleaned = await cleanupExpiredDrops();
    if (cleaned > 0) {
      console.log(`[DailyTick]   Cleaned up ${cleaned} expired drop records`);
    }
  });

  const durationMs = Date.now() - startTime;
  console.log(`[DailyTick] Tick complete in ${durationMs}ms (${characterResults.size} characters processed)`);

  return {
    tickDate: tickDateStr,
    charactersProcessed: characterResults.size,
    gatherActionsProcessed: gatherCount,
    craftActionsProcessed: craftCount,
    harvestActionsProcessed: harvestCount,
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
      homeTownId: string | null;
      patronGodId: string | null;
      hungerState: string;
    };
  },
  tickDateStr: string,
  hungerStates: Map<string, string>,
  foodBuffs: Map<string, Record<string, unknown> | null>,
  wellRestedBuffs: Map<string, number>,
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const target = action.actionTarget as Record<string, unknown>;

  // Handle spot-based gathering from the gathering.ts route
  if (target.type === 'town_gathering') {
    await processGatherSpotAction(action, getResults);
    return;
  }

  // Original resource-based logic continues below...
  const resourceId = target.resourceId as string;
  const professionType = target.professionType as string;
  const char = action.character;

  if (!resourceId || !professionType || !char.currentTownId) {
    getResults(char.id).notifications.push('Gathering failed: missing resource or not in town.');
    return;
  }

  // Validate resource exists and town has abundance
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) });
  if (!resource) {
    getResults(char.id).notifications.push('Gathering failed: resource not found.');
    return;
  }

  const townResource = await db.query.townResources.findFirst({
    where: and(eq(townResources.townId, char.currentTownId), eq(townResources.resourceType, resource.type)),
  });
  if (!townResource || townResource.abundance < MIN_ABUNDANCE_TO_GATHER) {
    getResults(char.id).notifications.push('Gathering failed: resources depleted.');
    return;
  }

  // Get or create profession
  let profession = await db.query.playerProfessions.findFirst({
    where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, professionType as any)),
  });
  if (!profession) {
    [profession] = await db.insert(playerProfessions).values({
      id: crypto.randomUUID(),
      characterId: char.id,
      professionType: professionType as any,
      tier: 'APPRENTICE',
      level: 1,
      xp: 0,
    }).returning();
  }

  // Apply hunger modifier
  const hungerState = hungerStates.get(char.id) ?? char.hungerState ?? 'FED';
  const hungerMod = getHungerModifier(hungerState as any);
  if (hungerMod <= 0) {
    getResults(char.id).notifications.push('Too incapacitated from hunger to gather.');
    return;
  }

  // Calculate yield (adapted from work.ts /collect)
  const baseYield = 1 + Math.floor(Math.random() * 3); // 1-3
  const d20 = 1 + Math.floor(Math.random() * 20); // 1-20
  const gatherProfDef = getProfessionByType(professionType as any);
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
  const townForBiome = await db.query.towns.findFirst({
    where: eq(towns.id, char.currentTownId),
    columns: { biome: true },
  });
  const gatherBonus = getRacialGatheringBonus(
    char.race as any,
    subRaceData,
    professionType as any,
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

  // Well Rested gathering bonus
  const wrLevel = wellRestedBuffs.get(char.id);
  if (wrLevel) {
    const wrBonus = getWellRestedBonus(wrLevel);
    if (wrBonus) {
      totalYield = Math.max(1, Math.round(totalYield * (1 + wrBonus.gatheringYieldPercent)));
    }
  }

  // Vareth local crafting yield bonus (home town only)
  if (char.currentTownId && char.currentTownId === char.homeTownId) {
    const gatherRelCtx = await getCharacterReligionContext(char.id);
    const gatherRelBuffs = resolveReligionBuffs(gatherRelCtx);
    const localYieldBonus = gatherRelBuffs.combinedBuffs.localCraftingYieldPercent ?? 0;
    if (localYieldBonus > 0) {
      totalYield = Math.max(1, Math.round(totalYield * (1 + localYieldBonus)));
    }
  }

  // XP calculation
  const baseXp = 10 + (resource.tier - 1) * 5;
  const xpGained = Math.round(baseXp * (1 + (gatherBonus.yieldMultiplier * 0.5)));

  // Execute in transaction
  await db.transaction(async (tx) => {
    // Find or create item template — prefer stable-ID pattern (matches recipe ingredient templateIds)
    const stableResId = `resource-${resource.name.toLowerCase().replace(/\s+/g, '-')}`;
    let itemTemplate = await tx.query.itemTemplates.findFirst({
      where: eq(itemTemplates.id, stableResId),
    });
    if (!itemTemplate) {
      itemTemplate = await tx.query.itemTemplates.findFirst({
        where: and(eq(itemTemplates.name, resource.name), eq(itemTemplates.type, 'MATERIAL')),
      });
    }
    if (!itemTemplate) {
      [itemTemplate] = await tx.insert(itemTemplates).values({
        id: stableResId,
        name: resource.name,
        type: 'MATERIAL',
        rarity: resource.tier <= 2 ? 'COMMON' : resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
        description: `Raw ${resource.name} gathered from the wilds.`,
        levelRequired: 1,
      }).returning();
    }

    // Check for existing stack
    const allInv = await tx.query.inventories.findMany({
      where: eq(inventories.characterId, char.id),
      with: { item: true },
    });
    const existingSlot = allInv.find(inv => inv.item?.templateId === itemTemplate!.id);

    if (existingSlot) {
      await tx.update(inventories)
        .set({ quantity: existingSlot.quantity + totalYield })
        .where(eq(inventories.id, existingSlot.id));
    } else {
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplate.id,
        ownerId: char.id,
        quality: resource.tier <= 2 ? 'COMMON' : resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
      }).returning();
      await tx.insert(inventories).values({
        id: crypto.randomUUID(),
        characterId: char.id,
        itemId: item.id,
        quantity: totalYield,
      });
    }

    // Deplete town resource
    await tx.update(townResources)
      .set({ abundance: Math.max(0, townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER) })
      .where(eq(townResources.id, townResource.id));
  });

  // Award profession XP
  await addProfessionXP(char.id, professionType as any, xpGained, `gathered_${resource.name.toLowerCase().replace(/\s+/g, '_')}`);

  // Award character XP: base + professionBonus (always has matching profession here) + levelScaling
  const baseGatherXp = ACTION_XP.GATHER_BASE
    + ACTION_XP.GATHER_PROFESSION_BONUS
    + (ACTION_XP.GATHER_LEVEL_SCALING * char.level);
  const gatherFeats = ((char as any).feats as string[]) ?? [];
  const characterXpGain = Math.round(baseGatherXp * (1 + computeFeatBonus(gatherFeats, 'xpBonus')));
  await db.update(characters)
    .set({ xp: sql`${characters.xp} + ${characterXpGain}` })
    .where(eq(characters.id, char.id));
  await checkLevelUp(char.id);

  // Decrement tool durability
  if (tool) {
    const newDurability = tool.item.currentDurability - 1;
    if (newDurability <= 0) {
      await db.transaction(async (tx) => {
        await tx.update(items).set({ currentDurability: 0 }).where(eq(items.id, tool.item.id));
        await tx.delete(characterEquipment).where(eq(characterEquipment.id, tool.equipmentId));
      });
      emitToolBroken(char.id, {
        itemId: tool.item.id,
        toolName: tool.template.name,
        professionType,
      });
    } else {
      await db.update(items)
        .set({ currentDurability: newDurability })
        .where(eq(items.id, tool.item.id));
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
// Spot-based Gathering sub-processor (for gathering.ts route actions)
// ---------------------------------------------------------------------------

async function processGatherSpotAction(
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
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const target = action.actionTarget as Record<string, unknown>;
  const char = action.character;

  const itemName = target.itemName as string;
  const templateName = target.templateName as string;
  const itemType = target.itemType as string;
  const isFood = target.isFood as boolean;
  const shelfLifeDays = target.shelfLifeDays as number | null;
  const description = target.description as string;
  const foodBuff = target.foodBuff as { stat: string; value: number } | null;
  const minYield = target.minYield as number;
  const maxYield = target.maxYield as number;

  if (!templateName || !itemType) {
    getResults(char.id).notifications.push('Gathering failed: invalid action data.');
    return;
  }

  // Extract resourceType early (needed for tiered herb gathering check below)
  const resourceType = target.resourceType as string;

  // Tiered herb gathering: L7+ HERBALIST at herb spots gets random resource pool
  let resolvedTemplateName = templateName;
  let resolvedDescription = description;
  let resolvedIsFood = isFood;
  let resolvedShelfLifeDays = shelfLifeDays;
  let resolvedFoodBuff = foodBuff;
  let resolvedItemName = itemName;
  if (resourceType === 'herb') {
    const herbProf = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, 'HERBALIST' as any)),
    });
    if (herbProf && herbProf.level >= 7) {
      const roll = Math.random();
      if (roll < 0.30) {
        // 30% — Wild Herbs (default, no change)
      } else if (roll < 0.65) {
        resolvedTemplateName = 'Medicinal Herbs';
        resolvedItemName = 'Medicinal Herbs';
        resolvedDescription = 'Potent herbs with proven healing properties, identifiable only by skilled herbalists.';
        resolvedIsFood = false;
        resolvedShelfLifeDays = null;
        resolvedFoodBuff = null;
      } else {
        resolvedTemplateName = 'Glowcap Mushrooms';
        resolvedItemName = 'Glowcap Mushrooms';
        resolvedDescription = 'Luminescent fungi found in shaded groves, prized by alchemists for their arcane reagent properties.';
        resolvedIsFood = false;
        resolvedShelfLifeDays = null;
        resolvedFoodBuff = null;
      }
    }
  }

  // Tiered fishing gathering: L7+ FISHERMAN at fishing spots gets premium fish
  if (resourceType === 'fishing') {
    const fishProf = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, 'FISHERMAN' as any)),
    });
    if (fishProf && fishProf.level >= 7) {
      const roll = Math.random();
      if (roll < 0.30) { /* default */ } else if (roll < 0.65) {
        resolvedTemplateName = 'River Trout'; resolvedItemName = 'River Trout';
        resolvedDescription = 'A prized freshwater fish with firm, flavorful flesh. Only skilled fishermen can consistently land these.';
        resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
      } else {
        resolvedTemplateName = 'Lake Perch'; resolvedItemName = 'Lake Perch';
        resolvedDescription = 'A large, meaty lake fish. Its delicate flavor makes it the centerpiece of fine cuisine.';
        resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
      }
    }
  }

  // Tiered hunting
  if (resourceType === 'hunting_ground') {
    const huntProf = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, 'HUNTER' as any)),
    });
    if (huntProf && huntProf.level >= 3) {
      if (huntProf.level >= 7) {
        const roll = Math.random();
        if (roll < 0.30) {
          resolvedTemplateName = 'Animal Pelts'; resolvedItemName = 'Animal Pelts';
          resolvedDescription = 'Rough animal pelts stripped from hunted game. Essential for leatherworking.';
          resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
        } else if (roll < 0.65) {
          resolvedTemplateName = 'Wolf Pelts'; resolvedItemName = 'Wolf Pelts';
          resolvedDescription = 'Thick, durable pelts from wolves. Their natural toughness makes superior leather for armor.';
          resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
        } else {
          resolvedTemplateName = 'Bear Hides'; resolvedItemName = 'Bear Hides';
          resolvedDescription = 'Massive hides from bears. Incredibly dense and durable — the finest material for heavy leather armor.';
          resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
        }
      } else {
        resolvedTemplateName = 'Animal Pelts'; resolvedItemName = 'Animal Pelts';
        resolvedDescription = 'Rough animal pelts stripped from hunted game. Essential for leatherworking.';
        resolvedIsFood = false; resolvedShelfLifeDays = null; resolvedFoodBuff = null;
      }
    }
  }

  // Roll yield
  const quantity = Math.floor(Math.random() * (maxYield - minYield + 1)) + minYield;

  // Universal tier-based gathering bonus
  let finalQuantity = quantity;
  const matchingProfession = GATHER_SPOT_PROFESSION_MAP[resourceType];
  if (matchingProfession) {
    const prof = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, matchingProfession as any)),
    });
    if (prof) {
      const bonus = getGatheringBonus(matchingProfession, prof.level, resourceType);
      if (bonus > 0) {
        finalQuantity = Math.ceil(quantity * (1 + bonus));
      }
    }
  }

  // Tool yield bonus (or bare-hands penalty)
  const spotProfession = matchingProfession as string | undefined;
  const spotTool = spotProfession ? await getEquippedTool(char.id, spotProfession) : null;
  if (spotTool) {
    finalQuantity = Math.max(1, Math.ceil(finalQuantity * (1 + spotTool.yieldBonus)));
  } else if (spotProfession) {
    finalQuantity = Math.max(1, Math.round(finalQuantity * (1 - BARE_HANDS_YIELD_PENALTY)));
  }

  // Create items in a transaction
  await db.transaction(async (tx) => {
    const stableId = `resource-${resolvedTemplateName.toLowerCase().replace(/\s+/g, '-')}`;
    let template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, stableId) });
    if (!template) {
      template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, resolvedTemplateName) });
    }
    if (!template) {
      [template] = await tx.insert(itemTemplates).values({
        id: `resource-${resolvedTemplateName.toLowerCase().replace(/\s+/g, '-')}`,
        name: resolvedTemplateName,
        type: itemType === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL',
        rarity: 'COMMON',
        description: resolvedDescription || `Raw ${resolvedTemplateName} gathered from the wilds.`,
        isFood: resolvedIsFood,
        shelfLifeDays: resolvedShelfLifeDays,
        isPerishable: resolvedShelfLifeDays != null,
        foodBuff: resolvedFoodBuff ?? null,
        levelRequired: 1,
      }).returning();
    }

    // Find existing inventory slot for this template
    const allInv = await tx.query.inventories.findMany({
      where: eq(inventories.characterId, char.id),
      with: { item: true },
    });
    const existingSlot = allInv.find(inv => inv.item?.templateId === template!.id);

    if (existingSlot) {
      await tx.update(inventories)
        .set({ quantity: existingSlot.quantity + finalQuantity })
        .where(eq(inventories.id, existingSlot.id));
    } else {
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: template.id,
        ownerId: char.id,
        quality: 'COMMON',
        daysRemaining: resolvedShelfLifeDays,
      }).returning();
      await tx.insert(inventories).values({
        id: crypto.randomUUID(),
        characterId: char.id,
        itemId: item.id,
        quantity: finalQuantity,
      });
    }

    // Mark the action as COMPLETED
    await tx.update(dailyActions)
      .set({
        status: 'COMPLETED',
        result: { item: resolvedTemplateName, quantity: finalQuantity, spotName: target.spotName as string },
      })
      .where(eq(dailyActions.id, action.id));
  });

  // Award character XP for gathering
  const matchingProfType = resourceType ? GATHER_SPOT_PROFESSION_MAP[resourceType] : undefined;
  let hasProfessionBonus = false;
  if (matchingProfType) {
    const charProf = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, matchingProfType as any)),
    });
    hasProfessionBonus = !!charProf;
  }
  const baseSpotXp = ACTION_XP.GATHER_BASE
    + (hasProfessionBonus ? ACTION_XP.GATHER_PROFESSION_BONUS : 0)
    + (ACTION_XP.GATHER_LEVEL_SCALING * char.level);
  const spotFeats = ((char as any).feats as string[]) ?? [];
  const characterXpGain = Math.round(baseSpotXp * (1 + computeFeatBonus(spotFeats, 'xpBonus')));
  await db.update(characters)
    .set({ xp: sql`${characters.xp} + ${characterXpGain}` })
    .where(eq(characters.id, char.id));
  await checkLevelUp(char.id);

  // Award profession XP (spot-based gathering)
  let professionXpGained = 0;
  if (matchingProfType && hasProfessionBonus) {
    const profXp = 10;
    await addProfessionXP(char.id, matchingProfType as any, profXp, `gathered_${(resolvedItemName || resolvedTemplateName).toLowerCase().replace(/\s+/g, '_')}`);
    professionXpGained = profXp;
  }

  // Decrement tool durability (spot-based gathering)
  if (spotTool) {
    const newDurability = spotTool.item.currentDurability - 1;
    if (newDurability <= 0) {
      await db.transaction(async (tx) => {
        await tx.update(items).set({ currentDurability: 0 }).where(eq(items.id, spotTool.item.id));
        await tx.delete(characterEquipment).where(eq(characterEquipment.id, spotTool.equipmentId));
      });
      emitToolBroken(char.id, {
        itemId: spotTool.item.id,
        toolName: spotTool.template.name,
        professionType: spotProfession!,
      });
      getResults(char.id).notifications.push(`Your ${spotTool.template.name} has broken!`);
    } else {
      await db.update(items)
        .set({ currentDurability: newDurability })
        .where(eq(items.id, spotTool.item.id));
    }
  }

  // Record results
  const results = getResults(char.id);
  results.action = {
    type: 'GATHER',
    resourceName: resolvedItemName,
    resourceType: 'town_gathering',
    quantity: finalQuantity,
    xpGained: characterXpGain,
    professionXpGained,
  };
  results.xpEarned += characterXpGain;
  results.notifications.push(`Gathered ${finalQuantity}x ${resolvedItemName}.`);
}

// ---------------------------------------------------------------------------
// Harvest sub-processor (private asset harvesting)
// ---------------------------------------------------------------------------

async function processHarvestAction(
  action: {
    id: string;
    characterId: string;
    actionTarget: unknown;
    character: { id: string; race: string; subRace: unknown; level: number; currentTownId: string | null; hungerState: string };
  },
  tickDateStr: string,
  hungerStates: Map<string, string>,
  foodBuffs: Map<string, Record<string, unknown> | null>,
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const char = action.character;
  const target = action.actionTarget as Record<string, unknown>;

  const asset = await db.query.ownedAssets.findFirst({ where: eq(ownedAssets.id, target.assetId as string) });

  if (!asset || asset.cropState !== 'READY') {
    await db.update(dailyActions).set({ status: 'FAILED', result: { error: 'Asset not ready for harvest' } }).where(eq(dailyActions.id, action.id));
    return;
  }

  const tierData = ASSET_TIERS[asset.tier as 1 | 2 | 3];
  if (!tierData) {
    await db.update(dailyActions).set({ status: 'FAILED', result: { error: 'Invalid asset tier' } }).where(eq(dailyActions.id, action.id));
    return;
  }
  const harvestQuantity = Math.floor(Math.random() * (tierData.maxYield - tierData.minYield + 1)) + tierData.minYield;

  const resourceEntry = RESOURCE_MAP[asset.spotType];
  if (!resourceEntry) {
    await db.update(dailyActions).set({ status: 'FAILED', result: { error: `Unknown spot type: ${asset.spotType}` } }).where(eq(dailyActions.id, action.id));
    return;
  }

  const gatherItem = resourceEntry.item;
  const harvestItemName = gatherItem.templateName;
  const harvestItemType = gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL';
  const ownerId = asset.ownerId;

  await db.transaction(async (tx) => {
    const stableResId = `resource-${harvestItemName.toLowerCase().replace(/\s+/g, '-')}`;
    let template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, stableResId) });
    if (!template) {
      template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, harvestItemName) });
    }
    if (!template) {
      [template] = await tx.insert(itemTemplates).values({
        id: stableResId,
        name: harvestItemName,
        type: harvestItemType as any,
        rarity: 'COMMON',
        description: gatherItem.description,
        stats: {},
        durability: 0,
        requirements: {},
        isFood: gatherItem.isFood,
        foodBuff: gatherItem.foodBuff ?? null,
        isPerishable: gatherItem.shelfLifeDays != null,
        shelfLifeDays: gatherItem.shelfLifeDays,
      }).returning();
    }

    // Put items in owner's house storage (not inventory)
    const houseResult = await tx.query.houses.findFirst({
      where: and(eq(houses.characterId, ownerId), eq(houses.townId, asset.townId)),
    });
    if (houseResult) {
      // Upsert house storage
      const existing = await tx.query.houseStorage.findFirst({
        where: and(eq(houseStorage.houseId, houseResult.id), eq(houseStorage.itemTemplateId, template.id)),
      });
      if (existing) {
        await tx.update(houseStorage)
          .set({ quantity: sql`${houseStorage.quantity} + ${harvestQuantity}` })
          .where(eq(houseStorage.id, existing.id));
      } else {
        await tx.insert(houseStorage).values({
          id: crypto.randomUUID(),
          houseId: houseResult.id,
          itemTemplateId: template.id,
          quantity: harvestQuantity,
        });
      }
    }

    // Cancel any open job for this asset + refund escrowed gold
    const openJobsForAsset = await tx.query.jobs.findMany({
      where: and(eq(jobs.assetId, asset.id), eq(jobs.status, 'OPEN')),
    });
    for (const openJob of openJobsForAsset) {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${openJob.wage}` })
        .where(eq(characters.id, openJob.posterId));
      await tx.update(jobs)
        .set({ status: 'CANCELLED' })
        .where(eq(jobs.id, openJob.id));
    }

    // Reset asset to EMPTY
    await tx.update(ownedAssets)
      .set({ cropState: 'EMPTY', plantedAt: null, readyAt: null, witheringAt: null })
      .where(eq(ownedAssets.id, asset.id));

    // Mark action COMPLETED
    await tx.update(dailyActions).set({
      status: 'COMPLETED',
      result: { type: 'private_asset_harvest', itemName: harvestItemName, quantity: harvestQuantity, tier: asset.tier, assetName: asset.name, isWorker: false, wage: 0 },
    }).where(eq(dailyActions.id, action.id));
  });

  // Award XP to the harvester
  try {
    const harvesterProf = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, asset.professionType as any)),
    });
    if (harvesterProf) {
      const baseXp = 10 + (asset.tier * 5);
      await addProfessionXP(char.id, asset.professionType as any, baseXp, 'harvest');
    }
  } catch (e) { /* XP award failure shouldn't break the harvest */ }

  const results = getResults(ownerId);
  if (!results.action) {
    results.action = { type: 'HARVEST', itemName: harvestItemName, quantity: harvestQuantity, assetName: asset.name, tier: asset.tier, isWorker: false, wage: 0 };
  }
  results.notifications.push(`Harvested ${harvestQuantity}x ${harvestItemName} from your ${asset.name}. Items stored in your house.`);
}

// ---------------------------------------------------------------------------
// Crafting sub-processor
// ---------------------------------------------------------------------------

async function processCraftAction(
  action: {
    id: string;
    characterId: string;
    actionTarget: unknown;
    character: { id: string; race: string; subRace: unknown; level: number; currentTownId: string | null; homeTownId: string | null; patronGodId: string | null; hungerState: string };
  },
  tickDateStr: string,
  hungerStates: Map<string, string>,
  foodBuffs: Map<string, Record<string, unknown> | null>,
  wellRestedBuffs: Map<string, number>,
  getResults: (id: string) => CharacterResults,
): Promise<void> {
  const target = action.actionTarget as Record<string, unknown>;
  const recipeId = target.recipeId as string;
  const char = action.character;

  if (!recipeId || !char.currentTownId) {
    getResults(char.id).notifications.push('Crafting failed: missing recipe or not in town.');
    return;
  }

  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
  if (!recipe) {
    getResults(char.id).notifications.push('Crafting failed: recipe not found.');
    return;
  }

  const profession = await db.query.playerProfessions.findFirst({
    where: and(eq(playerProfessions.characterId, char.id), eq(playerProfessions.professionType, recipe.professionType)),
  });
  if (!profession) {
    getResults(char.id).notifications.push(`Crafting failed: you don't have the ${recipe.professionType} profession.`);
    return;
  }

  const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType];
  let workshop: { level: number } | null = null;
  if (requiredBuildingType) {
    workshop = await db.query.buildings.findFirst({
      where: and(eq(buildings.townId, char.currentTownId), eq(buildings.type, requiredBuildingType as any)),
      columns: { level: true },
    }) ?? null;
  }
  if (recipe.tier !== 'APPRENTICE' && !workshop) {
    getResults(char.id).notifications.push(`Crafting failed: requires a workshop.`);
    return;
  }
  const workshopLevel = workshop?.level ?? 0;

  const rawIngredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
  const matReduction = getRacialMaterialReduction(char.race as any, char.level);
  const ingredients_ = rawIngredients.map(ing => ({
    ...ing,
    quantity: matReduction.reduction > 0 ? Math.max(1, Math.round(ing.quantity * (1 - matReduction.reduction))) : ing.quantity,
  }));

  const inventory = await db.query.inventories.findMany({
    where: eq(inventories.characterId, char.id),
    with: { item: { with: { itemTemplate: true } } },
  });

  const inventoryByTemplate = new Map<string, { total: number; entries: typeof inventory }>();
  for (const inv of inventory) {
    const tid = inv.item.templateId;
    const existing = inventoryByTemplate.get(tid);
    if (existing) { existing.total += inv.quantity; existing.entries.push(inv); }
    else { inventoryByTemplate.set(tid, { total: inv.quantity, entries: [inv] }); }
  }

  for (const ing of ingredients_) {
    const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
    if (available < ing.quantity) {
      getResults(char.id).notifications.push('Crafting failed: not enough materials.');
      return;
    }
  }

  let totalQualityBonus = 0;
  let totalItems = 0;
  const QUALITY_BONUS_VALUES: Record<string, number> = { FINE: 1, SUPERIOR: 2, MASTERWORK: 3, LEGENDARY: 5 };
  for (const ing of ingredients_) {
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

  const subRaceData = char.subRace as { element?: string; chosenProfession?: string } | null;
  const racialQuality = getRacialCraftQualityBonus(char.race as any, subRaceData, recipe.professionType as any);
  const toolBonus = await getCraftToolBonus(char.id, recipe.professionType);

  const professionTierBonus = PROFESSION_TIER_QUALITY_BONUS[profession.tier] ?? 0;

  const profDef = getProfessionByType(recipe.professionType as any);
  const characterStats = (char as any).stats as Record<string, number>;
  const primaryStatKey = profDef?.primaryStat?.toLowerCase() ?? 'int';
  const statModifier = getStatModifier(characterStats[primaryStatKey] ?? 10);

  const tickCraftFeats = ((char as any).feats as string[]) ?? [];
  const wrCraftLevel = wellRestedBuffs.get(char.id);
  const wrCraftBonus = wrCraftLevel ? (getWellRestedBonus(wrCraftLevel)?.craftingQualityBonus ?? 0) : 0;

  // Religion crafting quality bonus (Tyrvex)
  const craftRelCtx = await getCharacterReligionContext(char.id);
  const craftRelBuffs = resolveReligionBuffs(craftRelCtx);
  const religionCraftBonus = Math.floor((craftRelBuffs.combinedBuffs.craftingQualityPercent ?? 0) * 25);

  const { roll: diceRoll, total, quality: qualityName } = qualityRoll(
    getProficiencyBonus(char.level), statModifier, toolBonus, workshopLevel,
    racialQuality.qualityBonus, professionTierBonus, Math.round(ingredientQualityBonus),
    computeFeatBonus(tickCraftFeats, 'professionQualityBonus'),
    wrCraftBonus, religionCraftBonus,
  );
  const quality = QUALITY_MAP[qualityName] ?? 'COMMON';

  const resultTemplate = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, recipe.result) });
  if (!resultTemplate) {
    getResults(char.id).notifications.push('Crafting failed: result template not found.');
    return;
  }

  await db.transaction(async (tx) => {
    for (const ing of ingredients_) {
      let remaining = ing.quantity;
      const entries = inventoryByTemplate.get(ing.itemTemplateId)?.entries ?? [];
      for (const inv of entries) {
        if (remaining <= 0) break;
        if (inv.quantity <= remaining) {
          remaining -= inv.quantity;
          await tx.delete(inventories).where(eq(inventories.id, inv.id));
          await tx.delete(items).where(eq(items.id, inv.itemId));
        } else {
          await tx.update(inventories).set({ quantity: inv.quantity - remaining }).where(eq(inventories.id, inv.id));
          remaining = 0;
        }
      }
    }

    const [item] = await tx.insert(items).values({
      id: crypto.randomUUID(),
      templateId: resultTemplate.id,
      ownerId: char.id,
      currentDurability: resultTemplate.durability,
      quality: quality as any,
      craftedById: char.id,
      enchantments: [],
    }).returning();

    await tx.insert(inventories).values({
      id: crypto.randomUUID(),
      characterId: char.id,
      itemId: item.id,
      quantity: 1,
    });
  });

  const profXpGain = recipe.xpReward;
  await addProfessionXP(char.id, recipe.professionType as any, profXpGain, `Crafted ${resultTemplate.name}`);

  const baseCraftXp = ACTION_XP.CRAFT_BASE + ACTION_XP.CRAFT_PROFESSION_BONUS + (ACTION_XP.CRAFT_LEVEL_SCALING * char.level);
  const characterXpGain = Math.round(baseCraftXp * (1 + computeFeatBonus(tickCraftFeats, 'xpBonus')));
  await db.update(characters)
    .set({ xp: sql`${characters.xp} + ${characterXpGain}` })
    .where(eq(characters.id, char.id));
  await checkLevelUp(char.id);

  // Decrement tool durability
  const equippedTool = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, char.id), eq(characterEquipment.slot, 'TOOL')),
    with: { item: { with: { itemTemplate: true } } },
  });
  if (equippedTool && equippedTool.item.itemTemplate.type === 'TOOL') {
    const toolStats = equippedTool.item.itemTemplate.stats as Record<string, unknown>;
    if (toolStats.professionType === recipe.professionType) {
      const newDur = equippedTool.item.currentDurability - 1;
      if (newDur <= 0) {
        await db.transaction(async (tx) => {
          await tx.update(items).set({ currentDurability: 0 }).where(eq(items.id, equippedTool.item.id));
          await tx.delete(characterEquipment).where(eq(characterEquipment.id, equippedTool.id));
        });
        emitToolBroken(char.id, { itemId: equippedTool.item.id, toolName: equippedTool.item.itemTemplate.name, professionType: recipe.professionType });
      } else {
        await db.update(items).set({ currentDurability: newDur }).where(eq(items.id, equippedTool.item.id));
      }
    }
  }

  const results = getResults(char.id);
  results.action = { type: 'CRAFT', recipeName: recipe.name, resultName: resultTemplate.name, quality, qualityRoll: { roll: diceRoll, total }, xpGained: characterXpGain, professionXpGained: profXpGain };
  results.xpEarned += characterXpGain;
}

// ---------------------------------------------------------------------------
// Tool helpers (adapted from work.ts)
// ---------------------------------------------------------------------------

async function getEquippedTool(characterId: string, professionType: string) {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'TOOL')),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'TOOL') return null;

  const stats = equip.item.itemTemplate.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return null;

  return {
    equipmentId: equip.id,
    item: equip.item,
    template: equip.item.itemTemplate,
    speedBonus: (stats.speedBonus as number) ?? 0,
    yieldBonus: (stats.yieldBonus as number) ?? 0,
  };
}

async function getCraftToolBonus(characterId: string, professionType: string): Promise<number> {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'TOOL')),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'TOOL') return 0;

  const stats = equip.item.itemTemplate.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return 0;

  return (typeof stats.qualityBonus === 'number') ? stats.qualityBonus : 0;
}

// ---------------------------------------------------------------------------
// Property Tax (adapted from property-tax.ts)
// ---------------------------------------------------------------------------

async function collectPropertyTaxes(): Promise<void> {
  const allBuildings = await db.query.buildings.findMany({
    where: gte(buildings.level, 1),
    with: {
      character: { columns: { id: true, name: true, gold: true, userId: true } },
      town: {
        columns: { id: true, name: true, mayorId: true },
        with: {
          townPolicies: { columns: { taxRate: true } },
          townTreasuries: { columns: { id: true } },
        },
      },
    },
  });

  let totalCollected = 0;
  let delinquentCount = 0;
  let seizedCount = 0;

  for (const building of allBuildings) {
    const baseTax = BASE_PROPERTY_TAX_RATES[building.type] ?? 10;
    const levelMultiplier = building.level;
    const policyTaxRate = building.town.townPolicies?.[0]?.taxRate ?? 0.10;
    const dailyTax = Math.floor(baseTax * levelMultiplier * (1 + policyTaxRate));

    const storageData = building.storage as Record<string, unknown>;

    if (building.character.gold >= dailyTax) {
      await db.transaction(async (tx) => {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} - ${dailyTax}` })
          .where(eq(characters.id, building.ownerId));

        const treasury = building.town.townTreasuries?.[0];
        if (treasury) {
          await tx.update(townTreasuries)
            .set({ balance: sql`${townTreasuries.balance} + ${dailyTax}` })
            .where(eq(townTreasuries.id, treasury.id));
        }

        if (storageData.taxDelinquentSince) {
          const { taxDelinquentSince, ...rest } = storageData;
          await tx.update(buildings).set({ storage: rest as Record<string, string | number | boolean | null> }).where(eq(buildings.id, building.id));
        }
      });

      totalCollected += dailyTax;

      emitBuildingTaxDue(building.ownerId, {
        buildingId: building.id, buildingName: building.name, buildingType: building.type,
        townName: building.town.name, amount: dailyTax, paid: true, remainingGold: building.character.gold - dailyTax,
      });
    } else {
      const delinquentSince = storageData.taxDelinquentSince ? new Date(storageData.taxDelinquentSince as string) : new Date();
      const daysSinceDelinquent = storageData.taxDelinquentSince ? Math.floor((Date.now() - delinquentSince.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      if (daysSinceDelinquent >= 7) {
        const newOwnerId = building.town.mayorId;
        if (newOwnerId) {
          await db.update(buildings).set({ ownerId: newOwnerId, storage: { ...storageData, taxDelinquentSince: undefined } }).where(eq(buildings.id, building.id));
        }

        emitBuildingSeized(building.ownerId, {
          buildingId: building.id, buildingName: building.name, buildingType: building.type,
          townName: building.town.name, daysDelinquent: daysSinceDelinquent, seizedByMayor: !!newOwnerId,
        });
        seizedCount++;
      } else {
        await db.update(buildings).set({ storage: { ...storageData, taxDelinquentSince: delinquentSince.toISOString() } }).where(eq(buildings.id, building.id));

        emitBuildingDelinquent(building.ownerId, {
          buildingId: building.id, buildingName: building.name, buildingType: building.type,
          townName: building.town.name, amountOwed: dailyTax, daysDelinquent: daysSinceDelinquent + 1, daysUntilSeizure: 7 - (daysSinceDelinquent + 1),
        });
        delinquentCount++;
      }
    }
  }

  if (totalCollected > 0 || delinquentCount > 0 || seizedCount > 0) {
    console.log(`[DailyTick]   Property tax: ${totalCollected}g collected, ${delinquentCount} delinquent, ${seizedCount} seized`);
  }
}

// ---------------------------------------------------------------------------
// Building Degradation (adapted from building-maintenance.ts)
// ---------------------------------------------------------------------------

async function degradeBuildings(): Promise<void> {
  let degradedCount = 0;
  let lastBldgId: string | undefined;
  let hasMoreBldg = true;

  while (hasMoreBldg) {
    const bldgPage = await db.query.buildings.findMany({
      where: lastBldgId ? and(gte(buildings.level, 1), gt(buildings.id, lastBldgId)) : gte(buildings.level, 1),
      with: {
        character: { columns: { id: true } },
        town: { columns: { name: true } },
      },
      limit: CURSOR_PAGE_SIZE,
      orderBy: asc(buildings.id),
    });

    if (bldgPage.length < CURSOR_PAGE_SIZE) hasMoreBldg = false;
    if (bldgPage.length > 0) lastBldgId = bldgPage[bldgPage.length - 1].id;

    for (const building of bldgPage) {
      const storageData = building.storage as Record<string, unknown>;
      const currentCondition = (storageData.condition as number) ?? 100;
      const newCondition = Math.max(0, currentCondition - 1);

      if (newCondition !== currentCondition) {
        await db.update(buildings).set({ storage: { ...storageData, condition: newCondition } }).where(eq(buildings.id, building.id));
        degradedCount++;

        if (newCondition <= LOW_CONDITION_THRESHOLD && newCondition > 0) {
          emitBuildingConditionLow(building.ownerId, {
            buildingId: building.id, buildingName: building.name, buildingType: building.type,
            townName: building.town.name, condition: newCondition,
            isFunctional: newCondition >= NONFUNCTIONAL_THRESHOLD, isCondemned: false,
          });
        } else if (newCondition <= 0) {
          emitBuildingConditionLow(building.ownerId, {
            buildingId: building.id, buildingName: building.name, buildingType: building.type,
            townName: building.town.name, condition: 0, isFunctional: false, isCondemned: true,
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
  const townsWithActiveElection = await db.query.elections.findMany({
    where: and(sql`${elections.phase} != 'COMPLETED'`, eq(elections.type, 'MAYOR')),
    columns: { townId: true },
  });
  const townIdsWithElection = new Set(townsWithActiveElection.map(e => e.townId));

  const allTowns = await db.query.towns.findMany({ columns: { id: true, name: true } });
  const townsNeedingElection = allTowns.filter(t => !townIdsWithElection.has(t.id));

  for (const town of townsNeedingElection) {
    const lastElection = await db.query.elections.findFirst({
      where: and(eq(elections.townId, town.id), eq(elections.type, 'MAYOR')),
      orderBy: desc(elections.termNumber),
      columns: { termNumber: true },
    });
    const termNumber = (lastElection?.termNumber ?? 0) + 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + NOMINATION_TICKS + VOTING_TICKS);

    await db.insert(elections).values({
      id: crypto.randomUUID(),
      townId: town.id,
      type: 'MAYOR',
      status: 'ACTIVE',
      phase: 'NOMINATIONS',
      termNumber,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    });
    console.log(`[DailyTick]   Created MAYOR election for "${town.name}" (term ${termNumber})`);
  }

  // Transition NOMINATIONS -> VOTING
  const nominationElections = await db.query.elections.findMany({
    where: eq(elections.phase, 'NOMINATIONS'),
    with: {
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
      electionCandidates: { columns: { characterId: true } },
    },
  });

  for (const election of nominationElections) {
    const daysSinceStart = Math.floor((Date.now() - new Date(election.startDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart >= NOMINATION_TICKS) {
      if (election.electionCandidates.length === 0) {
        await db.update(elections).set({ phase: 'COMPLETED', status: 'COMPLETED' }).where(eq(elections.id, election.id));
        console.log(`[DailyTick]   Election ${election.id} completed with no candidates`);
        continue;
      }

      await db.update(elections).set({ phase: 'VOTING' }).where(eq(elections.id, election.id));
      console.log(`[DailyTick]   Election in "${election.town?.name ?? election.kingdom?.name}" moved to VOTING`);
    }
  }

  // Transition VOTING -> COMPLETED
  const votingElections = await db.query.elections.findMany({
    where: eq(elections.phase, 'VOTING'),
    with: {
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
      electionCandidates: { with: { character: { columns: { id: true, name: true } } } },
    },
  });

  for (const election of votingElections) {
    const daysSinceStart = Math.floor((Date.now() - new Date(election.startDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart >= NOMINATION_TICKS + VOTING_TICKS) {
      const voteCounts = await db
        .select({ candidateId: electionVotes.candidateId, voteCount: count() })
        .from(electionVotes)
        .where(eq(electionVotes.electionId, election.id))
        .groupBy(electionVotes.candidateId);
      const voteMap = new Map(voteCounts.map(v => [v.candidateId, v.voteCount]));

      let winnerId: string | null = null;
      let winnerName: string | null = null;
      let maxVotes = 0;

      const sortedCandidates = [...election.electionCandidates].sort(
        (a, b) => new Date(a.nominatedAt).getTime() - new Date(b.nominatedAt).getTime()
      );

      for (const candidate of sortedCandidates) {
        const votes = voteMap.get(candidate.characterId) || 0;
        if (votes > maxVotes) { maxVotes = votes; winnerId = candidate.characterId; winnerName = candidate.character.name; }
      }

      await db.update(elections).set({ phase: 'COMPLETED', status: 'COMPLETED', winnerId }).where(eq(elections.id, election.id));

      if (winnerId) {
        if (election.type === 'MAYOR' && election.townId) {
          await db.update(towns).set({ mayorId: winnerId }).where(eq(towns.id, election.townId));
        } else if (election.type === 'RULER' && election.kingdomId) {
          await db.update(kingdoms).set({ rulerId: winnerId }).where(eq(kingdoms.id, election.kingdomId));
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

async function processImpeachmentsLocal(): Promise<void> {
  const expired = await db.query.impeachments.findMany({
    where: and(eq(impeachments.status, 'ACTIVE'), lte(impeachments.endsAt, new Date().toISOString())),
    with: {
      character: { columns: { id: true, name: true } },
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
    },
  });

  for (const impeachment of expired) {
    const passed = impeachment.votesFor > impeachment.votesAgainst;
    const newStatus = passed ? 'PASSED' : 'FAILED';

    await db.update(impeachments).set({ status: newStatus }).where(eq(impeachments.id, impeachment.id));

    if (passed) {
      if (impeachment.townId) {
        await db.update(towns).set({ mayorId: null }).where(eq(towns.id, impeachment.townId));
      }
      if (impeachment.kingdomId) {
        await db.update(kingdoms).set({ rulerId: null }).where(eq(kingdoms.id, impeachment.kingdomId));
      }
    }

    const locationName = impeachment.town?.name || impeachment.kingdom?.name || 'Unknown';
    console.log(`[DailyTick]   Impeachment ${newStatus} against ${impeachment.character.name} in "${locationName}" (${impeachment.votesFor}-${impeachment.votesAgainst})`);
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
  } else if (action?.type === 'HARVEST') {
    parts.push(`Harvested ${action.quantity}x ${action.itemName} from ${action.assetName}`);
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
