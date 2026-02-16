// ---------------------------------------------------------------------------
// Bot Behavior Engine — Priority-Based, Profession-Aware Decision System
// ---------------------------------------------------------------------------
// Each tick, every bot:
//   Phase A: FREE actions (plant fields, accept jobs, buy assets, quest) — no daily cost
//   Phase B: MANDATORY daily action — priority chain P1–P9, first match wins
//     P1: Harvest READY fields (time-sensitive)
//     P3: Craft (highest-tier, intermediates prioritized)
//     P4: Gather (profession-aware, need-based)
//     P5: Buy from market (need-based for crafting)
//     P7: Travel (purposeful, with cooldown)
//     P8: Gather fallback
//     P9: Idle (should be rare)
// ---------------------------------------------------------------------------

import { BotState, SimulationConfig, ActionResult } from './types';
import * as actions from './actions';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';
import { SimulationLogger } from './sim-logger';
import { TOWN_GATHERING_SPOTS } from '@shared/data/gathering';
import { prisma } from '../../lib/prisma';

// ── Constants ─────────────────────────────────────────────────────────────

const CRAFTING_PROFESSIONS = new Set([
  'SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER', 'LEATHERWORKER',
  'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER', 'JEWELER', 'FLETCHER',
  'MASON', 'SCRIBE',
]);

const GATHERING_PROF_SET = new Set([
  'FARMER', 'MINER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER',
]);

const GATHERING_PROFESSIONS = ['MINER', 'FARMER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER'];

const TRAVEL_COOLDOWN_TICKS = 3;

// Recipes whose outputs are intermediates needed by higher-tier recipes
const INTERMEDIATE_RECIPE_IDS = new Set([
  'cook-flour',        // Flour → Bread, Apple Pie, Berry Tart, Harvest Feast, Spiced Pastry
  'cook-berry-jam',    // Berry Jam → Berry Tart, Fisherman's Banquet, Spiced Pastry
  'cook-grilled-fish', // Grilled Fish → Fisherman's Banquet
  'cook-bread-loaf',   // Bread Loaf (T2) → Harvest Feast, Fisherman's Banquet
]);

// Gathering spot type → item name produced
const SPOT_TO_ITEM: Record<string, string> = {
  grain_field: 'Grain',
  orchard: 'Apples',
  fishing: 'Raw Fish',
  berry: 'Wild Berries',
  herb: 'Wild Herbs',
  vegetable_patch: 'Vegetables',
  forest: 'Wood Logs',
  mine: 'Iron Ore Chunks',
  quarry: 'Stone Blocks',
  clay: 'Clay',
};

// Item name → spot type that produces it
const ITEM_TO_SPOT_TYPE: Record<string, string> = {
  'Grain': 'grain_field',
  'Apples': 'orchard',
  'Raw Fish': 'fishing',
  'Wild Berries': 'berry',
  'Wild Herbs': 'herb',
  'Vegetables': 'vegetable_patch',
  'Wood Logs': 'forest',
  'Iron Ore Chunks': 'mine',
  'Stone Blocks': 'quarry',
  'Clay': 'clay',
};

// Profession → spot types where they get bonus yield
const PROF_TO_SPOT_TYPES: Record<string, string[]> = {
  FARMER: ['grain_field', 'vegetable_patch', 'orchard', 'berry'],
  MINER: ['mine', 'quarry', 'clay'],
  LUMBERJACK: ['forest'],
  HERBALIST: ['herb'],
  FISHERMAN: ['fishing'],
  HUNTER: [],
  RANCHER: [],
};

// ── Town Cache ────────────────────────────────────────────────────────────

let _townCache: Map<string, { name: string; spotType: string }> | null = null;

async function ensureTownCache(): Promise<Map<string, { name: string; spotType: string }>> {
  if (_townCache) return _townCache;
  _townCache = new Map();
  try {
    const towns = await prisma.town.findMany({ select: { id: true, name: true } });
    for (const town of towns) {
      const spot = TOWN_GATHERING_SPOTS[town.name];
      if (spot) {
        _townCache.set(town.id, { name: town.name, spotType: spot.resourceType });
      }
    }
  } catch { /* ignore */ }
  return _townCache;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Get all spot types that give a profession bonus for the bot's professions */
function getProfSpotTypes(profs: string[]): string[] {
  const types: string[] = [];
  for (const p of profs) {
    const spots = PROF_TO_SPOT_TYPES[p];
    if (spots) types.push(...spots);
  }
  return types;
}

/** Find ingredients the bot is missing for its highest-tier non-craftable recipes */
function getMissingIngredients(
  invMap: Map<string, number>,
  recipes: { canCraft: boolean; tier: number; inputs: { itemName: string; quantity: number }[] }[],
): string[] {
  const missing: string[] = [];
  const notCraftable = recipes.filter(r => !r.canCraft);
  notCraftable.sort((a, b) => b.tier - a.tier);

  for (const recipe of notCraftable) {
    for (const input of recipe.inputs) {
      const have = invMap.get(input.itemName) || 0;
      if (have < input.quantity && !missing.includes(input.itemName)) {
        missing.push(input.itemName);
      }
    }
  }
  return missing;
}

// ── Timed free action helper ──────────────────────────────────────────────

async function timedFreeAction(
  fn: () => Promise<ActionResult>,
  bot: BotState,
  intent: string,
  logger: SimulationLogger | undefined,
  tick: number | undefined,
): Promise<ActionResult> {
  const start = Date.now();
  const result = await fn();
  if (logger && tick != null) {
    logger.logFromResult(bot, result, {
      tick,
      phase: 'free',
      intent,
      attemptNumber: 1,
      durationMs: Date.now() - start,
      dailyActionUsed: false,
    });
  }
  return result;
}

/** Execute and log a daily action attempt */
async function timedDailyAction(
  fn: () => Promise<ActionResult>,
  bot: BotState,
  intent: string,
  priority: number,
  reason: string,
  logger: SimulationLogger | undefined,
  tick: number | undefined,
): Promise<ActionResult> {
  const start = Date.now();
  const result = await fn();
  if (logger && tick != null) {
    logger.logFromResult(bot, result, {
      tick,
      phase: 'daily',
      intent: `P${priority}_${intent}`,
      attemptNumber: 1,
      durationMs: Date.now() - start,
      dailyActionUsed: result.success,
    });
  }
  // Enrich detail with priority and reason
  if (result.success) {
    result.detail = `P${priority}: ${result.detail} — ${reason}`;
  }
  return result;
}

// ── Travel Reason Determination ───────────────────────────────────────────

interface TravelPlan {
  reason: string;
  execute: () => Promise<ActionResult>;
}

async function determineTravelReason(
  bot: BotState,
  invMap: Map<string, number>,
  recipes: { canCraft: boolean; tier: number; inputs: { itemName: string; quantity: number }[] }[],
  profs: string[],
  currentSpotType: string | null,
): Promise<TravelPlan | null> {
  const isCook = profs.includes('COOK');

  // a. COOK missing ingredients → travel to town with needed resource
  if (isCook && recipes.length > 0) {
    const missing = getMissingIngredients(invMap, recipes);
    if (missing.length > 0) {
      const neededSpots = missing
        .map(item => ITEM_TO_SPOT_TYPE[item])
        .filter((s): s is string => !!s);

      // Don't travel if current town already has a needed spot
      if (neededSpots.length > 0 && !neededSpots.includes(currentSpotType || '')) {
        return {
          reason: `Need ${missing[0]}, traveling to ${neededSpots[0]} town`,
          execute: () => actions.travelToResourceTown(bot, neededSpots, `need ${missing[0]}`),
        };
      }
    }
  }

  // b. Gathering prof with no matching spot in current town
  const profSpots = getProfSpotTypes(profs);
  if (profSpots.length > 0 && currentSpotType && !profSpots.includes(currentSpotType)) {
    return {
      reason: `No ${profs.find(p => GATHERING_PROF_SET.has(p)) || 'gathering'} spot here, seeking matching town`,
      execute: () => actions.travelToResourceTown(bot, profSpots, 'seeking matching gathering spot'),
    };
  }

  // c. Own fields at home, currently elsewhere
  if (bot.currentTownId !== bot.homeTownId) {
    return {
      reason: 'Traveling home to manage fields',
      execute: () => actions.travelHome(bot, 'returning home'),
    };
  }

  return null;
}

// ── Handle Pre-Profession Bots (L<3 or no profession at L3+) ─────────────

async function handleNoProfession(
  bot: BotState,
  config: SimulationConfig,
  logger: SimulationLogger | undefined,
  tick: number | undefined,
): Promise<ActionResult> {
  const intelligence = bot.intelligence ?? 50;

  if (bot.level < PROFESSION_UNLOCK_LEVEL) {
    // Below L3: gather or travel to gain XP
    const start = Date.now();
    const gatherResult = await actions.gatherFromSpot(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, gatherResult, { tick, phase: 'daily', intent: 'pre_profession_gather', attemptNumber: 1, durationMs: Date.now() - start, dailyActionUsed: gatherResult.success });
    }
    if (gatherResult.success) return gatherResult;

    // Fallback: travel
    if (config.enabledSystems.travel) {
      const tStart = Date.now();
      const travelResult = await actions.travel(bot);
      if (logger && tick != null) {
        logger.logFromResult(bot, travelResult, { tick, phase: 'daily', intent: 'pre_profession_travel', attemptNumber: 2, durationMs: Date.now() - tStart, dailyActionUsed: travelResult.success });
      }
      if (travelResult.success) return travelResult;
    }
    return { success: false, detail: 'Pre-profession: no action available', endpoint: 'none' };
  }

  // L3+: learn a profession based on profile (intelligence-modulated)
  let profType: string;
  if (Math.random() * 100 > intelligence) {
    profType = pickRandom(GATHERING_PROFESSIONS);
  } else {
    switch (bot.profile) {
      case 'gatherer':   profType = 'FARMER';      break;
      case 'crafter':    profType = 'COOK';        break;
      case 'merchant':   profType = 'FARMER';      break;
      case 'warrior':    profType = 'MINER';       break;
      case 'politician': profType = 'FARMER';      break;
      case 'socialite':  profType = 'HERBALIST';   break;
      case 'explorer':   profType = 'LUMBERJACK';  break;
      case 'balanced':   profType = 'COOK';        break;
      default:           profType = 'FARMER';      break;
    }
  }

  const start = Date.now();
  const result = await actions.learnProfession(bot, profType);
  if (logger && tick != null) {
    logger.logFromResult(bot, result, { tick, phase: 'daily', intent: 'learn_profession', attemptNumber: 1, durationMs: Date.now() - start, dailyActionUsed: false });
  }
  if (result.success) return result;

  // Fallback professions
  const fallbacks = ['FARMER', 'MINER', 'LUMBERJACK'];
  for (let i = 0; i < fallbacks.length; i++) {
    if (fallbacks[i] === profType) continue;
    const fbStart = Date.now();
    const fbResult = await actions.learnProfession(bot, fallbacks[i]);
    if (logger && tick != null) {
      logger.logFromResult(bot, fbResult, { tick, phase: 'daily', intent: 'learn_profession', attemptNumber: i + 2, fallbackReason: `learn ${profType} failed`, durationMs: Date.now() - fbStart, dailyActionUsed: false });
    }
    if (fbResult.success) return fbResult;
  }

  // All profession learning failed → gather
  const gStart = Date.now();
  const gResult = await actions.gatherFromSpot(bot);
  if (logger && tick != null) {
    logger.logFromResult(bot, gResult, { tick, phase: 'daily', intent: 'learn_failed_gather', attemptNumber: 1, durationMs: Date.now() - gStart, dailyActionUsed: gResult.success });
  }
  return gResult;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Decision Function
// ═══════════════════════════════════════════════════════════════════════════

export async function decideBotAction(
  bot: BotState,
  allBots: BotState[],
  config: SimulationConfig,
  logger?: SimulationLogger,
  tick?: number,
): Promise<ActionResult> {
  const currentTick = tick ?? 0;

  // ── Skip: paused ──
  if (bot.pausedUntil > Date.now()) {
    return { success: true, detail: 'Bot paused (cooldown)', endpoint: 'none' };
  }

  // ── Skip: traveling ──
  if (bot.pendingTravel) {
    if (logger && tick != null) {
      logger.logFromResult(bot, { success: true, detail: 'Currently traveling (skipped)', endpoint: 'travel/pending' }, {
        tick, phase: 'daily', intent: 'travel_skip', attemptNumber: 0, durationMs: 0, dailyActionUsed: false,
      });
    }
    return { success: true, detail: 'Currently traveling (awaiting tick resolution)', endpoint: 'travel/pending' };
  }

  // ── Profession detection ──
  const profs = bot.professions.map(p => p.toUpperCase());
  const hasGathering = profs.some(p => GATHERING_PROF_SET.has(p));
  const hasCrafting = profs.some(p => CRAFTING_PROFESSIONS.has(p));
  const isCook = profs.includes('COOK');

  // ── Current town info ──
  const townCache = await ensureTownCache();
  const townInfo = townCache.get(bot.currentTownId);
  const currentSpotType = townInfo?.spotType ?? null;

  // ═══════════════════════════════════════════════════════════════════════
  // Phase A: FREE ACTIONS (no daily action cost)
  // ═══════════════════════════════════════════════════════════════════════

  // A1: Plant empty fields (gathering profs)
  if (hasGathering && config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.plantAsset(bot), bot, 'plant_asset', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} planted: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A2: Accept jobs (all bots — wage earners if no fields)
  if (config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.acceptJob(bot), bot, 'accept_job', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} accepted job: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A3: Buy assets (gathering profs with enough gold for cheapest field)
  if (hasGathering && bot.gold >= 100 && config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.buyAsset(bot), bot, 'buy_asset', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} bought asset: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A4: Quest acceptance
  if (config.enabledSystems.quests) {
    const activeQuest = await actions.checkActiveQuest(bot);
    if (!activeQuest) {
      try { await timedFreeAction(() => actions.acceptQuest(bot), bot, 'accept_quest', logger, tick); } catch { /* ignore */ }
    }
  }

  // A5: Party management (simplified — disband if in party to stay productive)
  if (bot.partyId) {
    if (bot.partyRole === 'leader') {
      try { await timedFreeAction(() => actions.disbandParty(bot), bot, 'disband_party', logger, tick); } catch { /* ignore */ }
    } else {
      try { await timedFreeAction(() => actions.leaveParty(bot), bot, 'leave_party', logger, tick); } catch { /* ignore */ }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase B: DAILY ACTION (priority chain — first match wins)
  // ═══════════════════════════════════════════════════════════════════════

  // B0: No profession yet
  if (bot.professions.length === 0) {
    return handleNoProfession(bot, config, logger, tick);
  }

  // B0b: Pending collections (must collect before committing new action)
  if (bot.pendingGathering) {
    const start = Date.now();
    const r = await actions.collectGathering(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, r, { tick, phase: 'daily', intent: 'collect_gathering', attemptNumber: 1, durationMs: Date.now() - start, dailyActionUsed: false });
    }
    return r;
  }
  if (bot.pendingCrafting) {
    const start = Date.now();
    const r = await actions.collectCrafting(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, r, { tick, phase: 'daily', intent: 'collect_crafting', attemptNumber: 1, durationMs: Date.now() - start, dailyActionUsed: false });
    }
    return r;
  }

  // ── Pre-fetch inventory + recipes (used by multiple priorities) ──
  const inventory = await actions.getInventory(bot);
  const invMap = new Map(inventory.map(i => [i.name, i.quantity]));

  type RecipeInfo = { id: string; name: string; canCraft: boolean; tier: number; professionRequired: string; levelRequired: number; inputs: { itemName: string; quantity: number }[] };
  let recipes: RecipeInfo[] = [];
  if (hasCrafting) {
    recipes = await actions.getCraftableRecipes(bot);
  }

  // ── P1: Harvest READY fields (time-sensitive — crops wither) ────────
  if (hasGathering && config.enabledSystems.gathering) {
    const r = await timedDailyAction(
      () => actions.harvestAsset(bot),
      bot, 'harvest_own_field', 1, 'Crops READY — harvesting before wither',
      logger, tick,
    );
    if (r.success) return r;
  }

  // ── P3: Craft (highest-tier craftable recipe, intermediates preferred) ──
  if (hasCrafting && config.enabledSystems.crafting) {
    const craftable = recipes.filter(r => r.canCraft);
    if (craftable.length > 0) {
      // Sort: highest tier first; at same tier, prefer intermediates
      craftable.sort((a, b) => {
        if (b.tier !== a.tier) return b.tier - a.tier;
        const aI = INTERMEDIATE_RECIPE_IDS.has(a.id) ? 1 : 0;
        const bI = INTERMEDIATE_RECIPE_IDS.has(b.id) ? 1 : 0;
        return bI - aI;
      });

      const best = craftable[0];
      const inputStr = best.inputs.map(i => `${i.quantity}x ${i.itemName}`).join(' + ');
      const r = await timedDailyAction(
        () => actions.craftSpecificRecipe(bot, best.id, best.name),
        bot, 'craft', 3, `T${best.tier} ${best.name} (${inputStr})`,
        logger, tick,
      );
      if (r.success) return r;
    }
  }

  // ── P4: Gather (profession-aware, need-based) ──────────────────────
  if (config.enabledSystems.gathering) {
    let shouldGather = false;
    let gatherReason = '';

    // Gathering prof: gather if current town has a matching spot
    if (hasGathering) {
      const profSpots = getProfSpotTypes(profs);
      if (currentSpotType && profSpots.includes(currentSpotType)) {
        shouldGather = true;
        gatherReason = `Gathering at ${currentSpotType} spot (profession bonus)`;
      }
    }

    // COOK: gather if current town produces a needed ingredient
    if (!shouldGather && isCook) {
      const missing = getMissingIngredients(invMap, recipes);
      const spotItem = SPOT_TO_ITEM[currentSpotType || ''];
      if (spotItem && missing.includes(spotItem)) {
        shouldGather = true;
        gatherReason = `Gathering ${spotItem} (needed for cooking)`;
      } else if (currentSpotType === 'forest' && missing.includes('Wood Logs')) {
        shouldGather = true;
        gatherReason = 'Gathering Wood Logs (fuel for cooking)';
      }
    }

    // Non-crafting, non-gathering bots: always gather (basic income)
    if (!shouldGather && !hasCrafting && !hasGathering) {
      shouldGather = true;
      gatherReason = 'Gathering (basic income)';
    }

    // Gathering prof with no matching spot: still gather whatever is here
    if (!shouldGather && hasGathering && currentSpotType) {
      shouldGather = true;
      gatherReason = `Gathering at ${currentSpotType} (no matching spot, gathering what's available)`;
    }

    if (shouldGather) {
      const r = await timedDailyAction(
        () => actions.gatherFromSpot(bot),
        bot, 'gather', 4, gatherReason,
        logger, tick,
      );
      if (r.success) return r;
    }
  }

  // ── P5: Buy from market (need-based for crafting ingredients) ───────
  if (config.enabledSystems.market && hasCrafting && bot.gold >= 10) {
    const missing = getMissingIngredients(invMap, recipes);
    if (missing.length > 0) {
      const r = await timedDailyAction(
        () => actions.buySpecificItem(bot, missing[0]),
        bot, 'market_buy', 5, `Buying ${missing[0]} from market`,
        logger, tick,
      );
      if (r.success) return r;
    }
  }

  // ── P7: Travel (purposeful, with cooldown) ─────────────────────────
  if (config.enabledSystems.travel && (currentTick - bot.lastTravelTick) >= TRAVEL_COOLDOWN_TICKS) {
    const travelPlan = await determineTravelReason(bot, invMap, recipes, profs, currentSpotType);
    if (travelPlan) {
      const r = await timedDailyAction(
        travelPlan.execute,
        bot, 'travel', 7, travelPlan.reason,
        logger, tick,
      );
      if (r.success) {
        bot.lastTravelTick = currentTick;
        return r;
      }
    }

    // No specific travel reason — skip travel entirely (don't wander aimlessly)
  }

  // ── P8: Gather fallback ────────────────────────────────────────────
  if (config.enabledSystems.gathering) {
    const r = await timedDailyAction(
      () => actions.gatherFromSpot(bot),
      bot, 'gather_fallback', 8, 'Gathering (fallback — nothing else available)',
      logger, tick,
    );
    if (r.success) return r;
  }

  // ── P9: Idle (should be extremely rare) ────────────────────────────
  console.warn(`[SIM] ${bot.characterName} IDLE — all priorities exhausted`);
  if (logger && tick != null) {
    logger.logFromResult(bot, { success: false, detail: 'P9: Idle — no valid action', endpoint: 'none' }, {
      tick, phase: 'daily', intent: 'P9_idle', attemptNumber: 1, durationMs: 0, dailyActionUsed: false,
    });
  }
  return { success: false, detail: 'P9: Idle — no valid action found', endpoint: 'none' };
}

// ── Error storm: deliberately trigger invalid actions ──────────────────

export async function errorStormAction(bot: BotState): Promise<ActionResult> {
  return actions.triggerInvalidAction(bot);
}
