// ---------------------------------------------------------------------------
// Bot Behavior Engine — Priority-Based, Profession-Aware Decision System
// ---------------------------------------------------------------------------
// Each tick, every bot:
//   Phase A: FREE actions (plant, equip tool, buy assets, quest) — no daily cost
//   Phase B: MANDATORY daily action — priority chain P1–P9, first match wins
//     P1: Harvest READY fields (time-sensitive)
//     P1.5: Collect RANCHER products
//     P3: Craft (highest-tier, intermediates prioritized)
//     P4: Gather (profession-aware, need-based)
//     P5: Buy from market (need-based for crafting)
//     P5.5: Accept job from board (one-shot, uses daily action)
//     P7: Travel (purposeful, with cooldown)
//     P8: Gather fallback
//     P9: Idle (should be rare)
// ---------------------------------------------------------------------------

import { BotState, SimulationConfig, ActionResult } from './types';
import * as actions from './actions';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';
import { SimulationLogger } from './sim-logger';
import { TOWN_GATHERING_SPOTS } from '@shared/data/gathering';
import { getUnlockedSpotTypes } from '@shared/data/professions/tier-unlocks';
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
  // SMELTER intermediates (ingots → consumed by BLACKSMITH, ARMORER, JEWELER, FLETCHER)
  'smelt-copper', 'smelt-iron', 'smelt-steel', 'smelt-silver', 'smelt-gold',
  'smelt-mithril', 'smelt-adamantine', 'smelt-ore-chunks', 'smelt-glass',
  'forge-iron-fittings', 'forge-nails',
  // WOODWORKER intermediates (planks, handles, staves → consumed by FLETCHER, MASON, BLACKSMITH)
  'saw-rough-planks', 'mill-softwood', 'mill-hardwood', 'mill-exotic',
  'ww-carve-wooden-dowels', 'ww-shape-wooden-handle', 'ww-carve-bow-stave',
  'ww-craft-wooden-frame', 'shape-beams',
  // COOK intermediates
  'cook-flour',        // Flour → Bread, Apple Pie, Berry Tart, Harvest Feast, Spiced Pastry
  'cook-berry-jam',    // Berry Jam → Berry Tart, Fisherman's Banquet, Spiced Pastry
  'cook-grilled-fish', // Grilled Fish → Fisherman's Banquet
  'cook-bread-loaf',   // Bread Loaf (T2) → Harvest Feast, Fisherman's Banquet
  // TANNER intermediates
  'tan-cure-leather',  // Cured Leather → all TANNER finished goods
  'tan-wolf-leather',  // Wolf Leather → Wolf Leather Armor, Wolf Leather Hood, Ranger's Quiver
  'tan-bear-leather',  // Bear Leather → Bear Hide Cuirass, Ranger's Quiver
  // TAILOR intermediates
  'tai-weave-cloth',   // Woven Cloth → all TAILOR finished goods (Apprentice/Journeyman)
  'tai-weave-fine-cloth', // Fine Cloth → TAILOR Craftsman finished goods
  'tai-process-silk',  // Silk Fabric → TAILOR Craftsman finished goods
]);

// Gathering spot type → item name produced
const SPOT_TO_ITEM: Record<string, string> = {
  orchard: 'Apples',
  fishing: 'Raw Fish',
  herb: 'Wild Herbs',
  forest: 'Wood Logs',
  mine: 'Iron Ore Chunks',
  quarry: 'Stone Blocks',
  clay: 'Clay',
  hunting_ground: 'Wild Game Meat',
  coal_mine: 'Coal',
  silver_mine: 'Silver Ore',
  hardwood_grove: 'Hardwood',
};

// Item name → spot type that produces it (or nearest supply-chain equivalent for travel AI)
const ITEM_TO_SPOT_TYPE: Record<string, string> = {
  'Apples': 'orchard',
  'Raw Fish': 'fishing',
  'Wild Herbs': 'herb',
  'Wood Logs': 'forest',
  'Iron Ore Chunks': 'mine',
  'Stone Blocks': 'quarry',
  'Clay': 'clay',
  'Wild Game Meat': 'hunting_ground',
  'Coal': 'coal_mine',
  'Silver Ore': 'silver_mine',
  'Hardwood': 'hardwood_grove',
  'Medicinal Herbs': 'herb',
  'Glowcap Mushrooms': 'herb',
  'River Trout': 'fishing',
  'Lake Perch': 'fishing',
  'Animal Pelts': 'hunting_ground',
  'Wolf Pelts': 'hunting_ground',
  'Bear Hides': 'hunting_ground',
  // FARMER asset products — travel to farming towns (orchard regions)
  'Grain': 'orchard',
  'Vegetables': 'orchard',
  'Wild Berries': 'orchard',
  'Cotton': 'orchard',
  // RANCHER asset products — travel to farming regions where ranchers operate
  'Wool': 'orchard',
  'Fine Wool': 'orchard',
  'Silkworm Cocoons': 'orchard',
  // TANNER intermediates — travel to hunting regions where supply chain starts
  'Cured Leather': 'hunting_ground',
  'Wolf Leather': 'hunting_ground',
  'Bear Leather': 'hunting_ground',
  // TAILOR intermediates — travel to farming regions where Wool supply chain starts
  'Woven Cloth': 'orchard',
  'Fine Cloth': 'orchard',
  'Silk Fabric': 'orchard',
  // SMELTER inputs — travel to mining towns for ores
  'Copper Ore': 'mine',
  'Gold Ore': 'mine',
  'Mithril Ore': 'mine',
  'Adamantine Ore': 'mine',
  // SMELTER intermediates — travel to mining towns (where smelters operate)
  'Copper Ingot': 'mine',
  'Iron Ingot': 'mine',
  'Steel Ingot': 'mine',
  'Silver Ingot': 'silver_mine',
  'Gold Ingot': 'mine',
  'Mithril Ingot': 'mine',
  'Adamantine Ingot': 'mine',
  'Iron Fittings': 'mine',
  'Nails': 'mine',
  'Glass': 'mine',
  // WOODWORKER intermediates — travel to forest towns
  'Rough Planks': 'forest',
  'Softwood Planks': 'forest',
  'Hardwood Planks': 'hardwood_grove',
  'Exotic Planks': 'forest',
  'Wooden Dowels': 'forest',
  'Wooden Handle': 'forest',
  'Bow Stave': 'forest',
  'Wooden Frame': 'forest',
  'Beams': 'forest',
  // JEWELER inputs — ingots + gemstones
  'Gemstones': 'mine',
  // FLETCHER inputs — bow staves + leather
  'Bowstring': 'orchard',
  // MASON inputs — stone, marble
  'Marble': 'quarry',
  // ENCHANTER/SCRIBE inputs — arcane reagents from herbalists
  'Arcane Reagents': 'herb',
  'Ink': 'herb',
  'Paper': 'forest',
};

// Profession → spot types where they get bonus yield (fallback when tier-unlocks returns empty)
const PROF_TO_SPOT_TYPES: Record<string, string[]> = {
  FARMER: ['orchard'],
  MINER: ['mine', 'quarry', 'clay'],
  LUMBERJACK: ['forest'],
  HERBALIST: ['herb'],
  FISHERMAN: ['fishing'],
  HUNTER: ['hunting_ground'],
  RANCHER: [],  // Asset-based: buildings at home, no public gathering spots
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

/** Get all spot types that give a profession bonus for the bot's professions (tier-aware) */
function getProfSpotTypes(profs: string[], profLevels: Record<string, number>): string[] {
  const types: string[] = [];
  for (const p of profs) {
    const level = profLevels[p] || 1;
    const unlocked = getUnlockedSpotTypes(p, level);
    if (unlocked.length > 0) {
      types.push(...unlocked);
    } else {
      // Fallback to full PROF_TO_SPOT_TYPES if profession has no tier unlock data
      const spots = PROF_TO_SPOT_TYPES[p];
      if (spots) types.push(...spots);
    }
  }
  return types;
}

/** Find ingredients the bot is missing, prioritizing raw materials over crafted intermediates */
function getMissingIngredients(
  invMap: Map<string, number>,
  recipes: { canCraft: boolean; tier: number; ingredients?: { itemName: string; quantity: number }[]; missingIngredients?: { itemName: string; needed: number; have: number }[]; inputs?: { itemName: string; quantity: number }[] }[],
): string[] {
  const RAW_MATERIALS = new Set([
    'Grain', 'Apples', 'Wild Berries', 'Wild Herbs', 'Vegetables', 'Raw Fish',
    'Wood Logs', 'Iron Ore Chunks', 'Stone Blocks', 'Clay', 'Salt', 'Spices',
    'Wild Game Meat', 'Common Herbs', 'Mushrooms', 'Common Fish',
    'Coal', 'Silver Ore', 'Hardwood',
    'Medicinal Herbs', 'Glowcap Mushrooms',
    'River Trout', 'Lake Perch',
    'Animal Pelts', 'Wolf Pelts', 'Bear Hides',
    'Wool', 'Fine Wool', 'Silkworm Cocoons',
  ]);
  const rawMissing: string[] = [];
  const craftedMissing: string[] = [];
  const notCraftable = recipes.filter(r => !r.canCraft);
  notCraftable.sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));

  for (const recipe of notCraftable) {
    if (recipe.missingIngredients && recipe.missingIngredients.length > 0) {
      for (const mi of recipe.missingIngredients) {
        if (!mi.itemName || rawMissing.includes(mi.itemName) || craftedMissing.includes(mi.itemName)) continue;
        if (RAW_MATERIALS.has(mi.itemName)) rawMissing.push(mi.itemName);
        else craftedMissing.push(mi.itemName);
      }
    } else {
      const ingredients = recipe.ingredients || recipe.inputs || [];
      for (const input of ingredients) {
        const have = invMap.get(input.itemName) || 0;
        if (have < input.quantity) {
          if (rawMissing.includes(input.itemName) || craftedMissing.includes(input.itemName)) continue;
          if (RAW_MATERIALS.has(input.itemName)) rawMissing.push(input.itemName);
          else craftedMissing.push(input.itemName);
        }
      }
    }
  }
  return [...rawMissing, ...craftedMissing];
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
  // a. ANY crafting profession missing ingredients → travel to town with needed resource
  const hasCraftingProf = profs.some(p => CRAFTING_PROFESSIONS.has(p));
  if (hasCraftingProf && recipes.length > 0) {
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

  // b. RANCHER is asset-based — always go home to manage buildings, never seek public spots
  const isRancher = profs.includes('RANCHER');
  if (isRancher && bot.homeTownId && bot.currentTownId !== bot.homeTownId) {
    return {
      reason: 'RANCHER returning home to manage livestock buildings',
      execute: () => actions.travelHome(bot, 'returning home for livestock'),
    };
  }

  // c. Gathering prof with no matching spot in current town (skip RANCHER — no public spots)
  if (!isRancher) {
    const profSpots = getProfSpotTypes(profs, bot.professionLevels || {});
    if (profSpots.length > 0 && currentSpotType && !profSpots.includes(currentSpotType)) {
      return {
        reason: `No ${profs.find(p => GATHERING_PROF_SET.has(p)) || 'gathering'} spot here, seeking matching town`,
        execute: () => actions.travelToResourceTown(bot, profSpots, 'seeking matching gathering spot'),
      };
    }
  }

  // d. Own fields at home, currently elsewhere
  if (bot.homeTownId && bot.currentTownId !== bot.homeTownId) {
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
      case 'crafter': {
        const r = Math.random();
        profType = r < 0.17 ? 'COOK' : r < 0.33 ? 'BREWER' : r < 0.50 ? 'BLACKSMITH' : r < 0.67 ? 'ALCHEMIST' : r < 0.83 ? 'TANNER' : 'TAILOR';
        break;
      }
      case 'merchant':   profType = 'FARMER';      break;
      case 'warrior':    profType = 'MINER';       break;
      case 'politician': profType = 'FARMER';      break;
      case 'socialite':  profType = 'HERBALIST';   break;
      case 'explorer':   profType = 'LUMBERJACK';  break;
      case 'balanced': {
        const r = Math.random();
        profType = r < 0.17 ? 'COOK' : r < 0.33 ? 'BREWER' : r < 0.50 ? 'BLACKSMITH' : r < 0.67 ? 'ALCHEMIST' : r < 0.83 ? 'TANNER' : 'TAILOR';
        break;
      }
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
  // (individual profession checks removed — travel/gather logic is now generic)

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

  // A2: Equip tool (gathering profs — ensure matching tool before gathering)
  if (hasGathering && config.enabledSystems.gathering) {
    const gatherProfs = profs.filter(p => GATHERING_PROF_SET.has(p) && p !== 'RANCHER');
    // Prefer the profession matching the current town's spot type
    let targetProf: string | null = null;
    if (currentSpotType) {
      for (const prof of gatherProfs) {
        const profSpots = getProfSpotTypes([prof], bot.professionLevels || {});
        if (profSpots.includes(currentSpotType)) {
          targetProf = prof;
          break;
        }
      }
    }
    // Fallback: first gathering profession
    if (!targetProf && gatherProfs.length > 0) targetProf = gatherProfs[0];

    if (targetProf) {
      try {
        const r = await timedFreeAction(() => actions.ensureToolEquipped(bot, targetProf!), bot, 'equip_tool', logger, tick);
        if (r.success) console.log(`[SIM] ${bot.characterName} equipped tool: ${r.detail}`);
      } catch { /* ignore */ }
    }
  }

  // A3: Buy assets (gathering profs with enough gold for cheapest field)
  if (hasGathering && bot.gold >= 100 && config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.buyAsset(bot), bot, 'buy_asset', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} bought asset: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A3b: Buy livestock (RANCHER bots with buildings that have room)
  if (profs.includes('RANCHER') && bot.gold >= 30 && config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.buyLivestock(bot), bot, 'buy_livestock', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} bought livestock: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A3c: Withdraw Grain from house storage for animal feed (RANCHER)
  if (profs.includes('RANCHER') && config.enabledSystems.gathering) {
    try {
      const r = await timedFreeAction(() => actions.withdrawGrainForFeed(bot), bot, 'withdraw_grain', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} withdrew grain: ${r.detail}`);
    } catch { /* ignore */ }
  }

  // A4: Quest acceptance
  if (config.enabledSystems.quests) {
    const activeQuest = await actions.checkActiveQuest(bot);
    if (!activeQuest) {
      try { await timedFreeAction(() => actions.acceptQuest(bot), bot, 'accept_quest', logger, tick); } catch { /* ignore */ }
    }
  }

  // A4b: Specialize professions at L7 (free action — permanent choice)
  for (const prof of profs) {
    const level = bot.professionLevels[prof] || 1;
    const specs = bot.professionSpecializations || {};
    if (prof === 'BLACKSMITH' && level >= 7 && !specs[prof]) {
      const branches = ['TOOLSMITH', 'WEAPONSMITH', 'ARMORER'];
      const choice = pickRandom(branches);
      try {
        const r = await timedFreeAction(
          () => actions.specialize(bot, prof, choice),
          bot, 'specialize', logger, tick,
        );
        if (r.success) console.log(`[SIM] ${bot.characterName} specialized ${prof} as ${choice}`);
      } catch { /* ignore */ }
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

  // A6: Post jobs for ready assets when away from home (free action)
  if (hasGathering && config.enabledSystems.gathering && bot.homeTownId && bot.currentTownId !== bot.homeTownId) {
    try {
      const r = await timedFreeAction(() => actions.postJob(bot), bot, 'post_job', logger, tick);
      if (r.success) console.log(`[SIM] ${bot.characterName} posted job: ${r.detail}`);
    } catch { /* ignore */ }
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
    const allRecipes = await actions.getCraftableRecipes(bot);
    // Filter to only recipes for this bot's professions
    recipes = allRecipes.filter(r => profs.includes(r.professionRequired.toUpperCase()));
  }

  // ── P1: Harvest READY fields (time-sensitive — crops wither) ────────
  // RANCHER buildings produce automatically via livestock tick — skip harvest
  if (hasGathering && config.enabledSystems.gathering && !profs.includes('RANCHER')) {
    const r = await timedDailyAction(
      () => actions.harvestAsset(bot),
      bot, 'harvest_own_field', 1, 'Crops READY — harvesting before wither',
      logger, tick,
    );
    if (r.success) return r;
  }
  // Multi-profession bots: if bot is RANCHER AND something else, still try harvest for non-RANCHER assets
  if (hasGathering && config.enabledSystems.gathering && profs.includes('RANCHER') && profs.length > 1) {
    const r = await timedDailyAction(
      () => actions.harvestAsset(bot, 'RANCHER'),
      bot, 'harvest_own_field', 1, 'Crops READY — harvesting before wither',
      logger, tick,
    );
    if (r.success) return r;
  }

  // ── P1.5: Collect RANCHER products (at home, before other actions) ────
  if (profs.includes('RANCHER') && config.enabledSystems.gathering) {
    const r = await timedDailyAction(
      () => actions.collectRancherProducts(bot),
      bot, 'collect_rancher', 1.5, 'RANCHER products ready — collecting',
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
    // RANCHER is asset-based — gather from any spot for basic income/XP while at home
    if (hasGathering) {
      if (profs.includes('RANCHER') && currentSpotType) {
        shouldGather = true;
        gatherReason = `RANCHER gathering at ${currentSpotType} (basic income while managing livestock)`;
      } else {
        const profSpots = getProfSpotTypes(profs, bot.professionLevels || {});
        if (currentSpotType && profSpots.includes(currentSpotType)) {
          shouldGather = true;
          gatherReason = `Gathering at ${currentSpotType} spot (profession bonus)`;
        }
      }
    }

    // ANY crafting profession: gather if current town produces a needed ingredient
    if (!shouldGather && hasCrafting) {
      const missing = getMissingIngredients(invMap, recipes);
      const spotItem = SPOT_TO_ITEM[currentSpotType || ''];
      if (spotItem && missing.includes(spotItem)) {
        const craftProf = profs.find(p => CRAFTING_PROFESSIONS.has(p)) || 'crafting';
        shouldGather = true;
        gatherReason = `Gathering ${spotItem} (needed for ${craftProf.toLowerCase()})`;
      }
    }

    // Non-crafting, non-gathering bots: always gather (basic income)
    if (!shouldGather && !hasCrafting && !hasGathering) {
      shouldGather = true;
      gatherReason = 'Gathering (basic income)';
    }

    // Gathering prof with no matching spot: fall through to P7 travel instead
    // (removed catch-all that prevented bots from ever traveling)

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
    for (const itemName of missing) {
      const r = await timedDailyAction(
        () => actions.buySpecificItem(bot, itemName),
        bot, 'market_buy', 5, `Buying ${itemName} from market`,
        logger, tick,
      );
      if (r.success) return r;
    }
  }

  // ── P5b: RANCHER bots buy Grain if low inventory ──────────────────
  if (config.enabledSystems.market && profs.includes('RANCHER') && bot.gold >= 10) {
    const grainQty = invMap.get('Grain') || 0;
    if (grainQty < 5) {
      const r = await timedDailyAction(
        () => actions.buySpecificItem(bot, 'Grain'),
        bot, 'market_buy_grain', 5, 'RANCHER buying Grain for livestock feed',
        logger, tick,
      );
      if (r.success) return r;
    }
  }

  // ── P5.5: Accept jobs from the board (daily action) ─────────────────
  if (config.enabledSystems.gathering) {
    const r = await timedDailyAction(
      () => actions.acceptJob(bot),
      bot, 'accept_job', 5.5, 'Accepting highest-paying job on the board',
      logger, tick,
    );
    if (r.success) return r;
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
