// ---------------------------------------------------------------------------
// Bot Behavior Engine — Restructured: FREE actions + MANDATORY daily action
// ---------------------------------------------------------------------------
// Each tick, every bot:
//   Phase A: FREE side-effect actions (party, quest accept, equip) — failures are OK
//   Phase B: MANDATORY daily action (gather, travel, or craft) — must always commit one
//
// Daily action weights are per-profile. Fallback chain ensures every bot
// always commits: preferred → gather → travel → craft → idle (last resort).
// ---------------------------------------------------------------------------

import { BotState, BotProfile, SimulationConfig, ActionResult } from './types';
import * as actions from './actions';
import { buyAsset, plantAsset, harvestAsset, acceptJob } from './actions';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';
import { SimulationLogger, captureBotState } from './sim-logger';

// ---- Crafting professions — bots need one of these to attempt crafting ----
const CRAFTING_PROFESSIONS = new Set([
  'SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER', 'LEATHERWORKER',
  'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER', 'JEWELER', 'FLETCHER',
  'MASON', 'SCRIBE',
]);

// ---- Daily action keys (the only actions that consume the daily action slot) ----
type DailyActionKey = 'gather' | 'craft' | 'travel' | 'harvest';

// ---- Weight keys (subset used for profile-weighted random selection) ----
type WeightedActionKey = 'gather' | 'craft' | 'travel';

// ---- Per-profile daily action weight tables ----
// Only gather, craft, travel — harvest is priority-checked separately.
const DAILY_WEIGHTS: Record<BotProfile, Record<WeightedActionKey, number>> = {
  gatherer:   { gather: 60, travel: 25, craft: 15 },
  crafter:    { craft: 50, gather: 30, travel: 20 },
  merchant:   { travel: 50, gather: 30, craft: 20 },
  warrior:    { travel: 60, gather: 25, craft: 15 },
  politician: { travel: 40, gather: 35, craft: 25 },
  socialite:  { travel: 40, gather: 35, craft: 25 },
  explorer:   { travel: 65, gather: 25, craft: 10 },
  balanced:   { gather: 35, travel: 35, craft: 30 },
};

// ---- Gathering professions for random selection when learning ----
const GATHERING_PROFESSIONS = ['MINER', 'FARMER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER'];

// ---- Random pick helper ----
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Weighted random selection ----
function weightedSelect(weights: Partial<Record<DailyActionKey, number>>): DailyActionKey {
  const entries = Object.entries(weights) as [DailyActionKey, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total === 0) return 'gather'; // fallback
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  return entries[0][0];
}

// ---- Filter weights by enabled systems + bot capabilities ----
function filterDailyWeights(
  weights: Record<WeightedActionKey, number>,
  enabled: SimulationConfig['enabledSystems'],
  bot?: BotState,
): Partial<Record<DailyActionKey, number>> {
  const filtered: Partial<Record<DailyActionKey, number>> = {};

  const isFarmer = bot?.professions.some(p => p.toUpperCase() === 'FARMER') ?? false;
  const isCook = bot?.professions.some(p => p.toUpperCase() === 'COOK') ?? false;
  const effectiveWeights = isFarmer
    ? { gather: 80, craft: 0, travel: 20 }
    : isCook
    ? { gather: 30, craft: 55, travel: 15 }
    : weights;

  if (enabled.gathering) filtered.gather = effectiveWeights.gather;
  if (enabled.crafting) {
    const hasCraftingProf = bot?.professions.some(p => CRAFTING_PROFESSIONS.has(p.toUpperCase())) ?? true;
    if (hasCraftingProf) filtered.craft = effectiveWeights.craft;
  }
  if (enabled.travel) filtered.travel = effectiveWeights.travel;
  return filtered;
}

// ---- Map quest objective type to a daily action ----
function mapObjectiveToDailyAction(objectiveType: string): DailyActionKey | null {
  switch (objectiveType) {
    case 'KILL':    return 'travel'; // PvE combat occurs as road encounters during travel
    case 'VISIT':   return 'travel';
    case 'GATHER':  return 'gather';
    case 'CRAFT':   return 'craft';
    default:        return null;     // EQUIP, SELECT_PROFESSION, MARKET_* are free or N/A
  }
}

// ---- Execute a daily action (with timing) ----
async function executeDailyAction(action: DailyActionKey, bot: BotState): Promise<{ result: ActionResult; durationMs: number }> {
  const start = Date.now();
  let result: ActionResult;
  switch (action) {
    case 'gather':  result = await actions.gatherFromSpot(bot); break;
    case 'craft':   result = await actions.startCrafting(bot); break;
    case 'travel':  result = await actions.travel(bot); break;
    case 'harvest': result = await harvestAsset(bot); break;
  }
  return { result, durationMs: Date.now() - start };
}

// ---- Try daily actions in fallback order until one succeeds ----
async function tryDailyWithFallback(
  bot: BotState,
  order: DailyActionKey[],
  enabled: SimulationConfig['enabledSystems'],
  logger?: SimulationLogger,
  tick?: number,
): Promise<ActionResult> {
  const failureReasons: string[] = [];
  let attemptNumber = 0;
  let lastFailReason = '';

  for (const action of order) {
    if (action === 'gather' && !enabled.gathering) { failureReasons.push(`${action}: disabled`); continue; }
    if (action === 'craft' && !enabled.crafting) { failureReasons.push(`${action}: disabled`); continue; }
    if (action === 'craft' && !bot.professions.some(p => CRAFTING_PROFESSIONS.has(p.toUpperCase()))) {
      failureReasons.push(`${action}: no crafting profession`); continue;
    }
    if (action === 'travel' && !enabled.travel) { failureReasons.push(`${action}: disabled`); continue; }

    attemptNumber++;
    const { result, durationMs } = await executeDailyAction(action, bot);

    if (logger && tick != null) {
      logger.logFromResult(bot, result, {
        tick,
        phase: 'daily',
        intent: action,
        attemptNumber,
        fallbackReason: lastFailReason || undefined,
        durationMs,
        dailyActionUsed: false,
      });
    }

    if (result.success) return result;

    lastFailReason = `${action} failed (${result.httpStatus ?? '?'}): ${result.detail}`;
    failureReasons.push(`${action}: ${result.detail} (${result.endpoint})`);
    console.log(`[SIM] ${bot.characterName} ${action.toUpperCase()} FAILED: ${result.detail} [endpoint: ${result.endpoint}]`);
  }

  const allReasons = failureReasons.join(' | ');
  console.log(`[SIM] ${bot.characterName} ALL ACTIONS FAILED: ${allReasons}`);
  return { success: false, detail: `All failed — ${allReasons}`, endpoint: 'none' };
}

// ---- Timed free action helper ----
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

// ---- Main decision function ----
export async function decideBotAction(
  bot: BotState,
  allBots: BotState[],
  config: SimulationConfig,
  logger?: SimulationLogger,
  tick?: number,
): Promise<ActionResult> {
  // 0. Cooldown check
  if (bot.pausedUntil > Date.now()) {
    return { success: true, detail: 'Bot paused (cooldown)', endpoint: 'none' };
  }

  // 0b. Skip bots that are currently traveling — they already committed travel
  if (bot.pendingTravel) {
    console.log(`[SIM] ${bot.characterName} skipping — currently traveling`);
    if (logger && tick != null) {
      logger.logFromResult(bot, { success: true, detail: 'Currently traveling (skipped)', endpoint: 'none' }, {
        tick,
        phase: 'daily',
        intent: 'travel_skip',
        attemptNumber: 0,
        durationMs: 0,
        dailyActionUsed: false,
      });
    }
    return { success: true, detail: 'Currently traveling (awaiting tick resolution)', endpoint: 'none' };
  }

  const intelligence = bot.intelligence ?? 50;

  // ---- Early detection: FARMER bots get special handling throughout ----
  const isFarmerBot = bot.professions.some(p => p.toUpperCase() === 'FARMER');
  const isCookBot = bot.professions.some(p => p.toUpperCase() === 'COOK');

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase A: FREE side-effect actions (party, quest, equip)
  // These do NOT consume the daily action. Failures are silently ignored.
  // FARMER bots skip party actions — they must stay in their town to farm.
  // ═══════════════════════════════════════════════════════════════════════════

  // A1: Party leader management (free) — FARMER bots disband immediately
  if (bot.partyId && bot.partyRole === 'leader') {
    if (isFarmerBot) {
      // FARMER bots should not be in parties — disband so they can farm
      try { await timedFreeAction(() => actions.disbandParty(bot), bot, 'disband_party', logger, tick); } catch { /* ignore */ }
    } else {
      bot.partyTicksRemaining--;

      if (bot.partyTicksRemaining <= 0) {
        // Time to disband
        try { await timedFreeAction(() => actions.disbandParty(bot), bot, 'disband_party', logger, tick); } catch { /* ignore */ }
      } else {
        // Try to invite nearby partyless bots (if party < 3)
        const partyMembers = allBots.filter(b => b.partyId === bot.partyId);
        if (partyMembers.length < 3) {
          const candidates = allBots.filter(
            b => !b.partyId && b.currentTownId === bot.currentTownId && b.characterId !== bot.characterId,
          );
          if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            try { await timedFreeAction(() => actions.inviteToParty(bot, target), bot, 'invite_to_party', logger, tick); } catch { /* ignore */ }
          }
        }
      }
    }
  }

  // A2: Accept pending party invites (free) — FARMER bots skip (stay in town)
  if (!isFarmerBot && !bot.partyId && bot.currentTownId) {
    try { await timedFreeAction(() => actions.acceptPartyInvite(bot), bot, 'accept_party_invite', logger, tick); } catch { /* ignore */ }
  }

  // A2b: FARMER bots leave parties they got stuck in
  if (isFarmerBot && bot.partyId && bot.partyRole !== 'leader') {
    try { await timedFreeAction(() => actions.leaveParty(bot), bot, 'leave_party', logger, tick); } catch { /* ignore */ }
  }

  // A3: Party formation (free, 30% chance if not in a party) — FARMER bots skip
  if (!isFarmerBot && !bot.partyId && bot.currentTownId && Math.random() < 0.3) {
    const nearbyPartyless = allBots.filter(
      b => !b.partyId && b.characterId !== bot.characterId && b.currentTownId === bot.currentTownId,
    );
    if (nearbyPartyless.length > 0) {
      try {
        const createResult = await timedFreeAction(() => actions.createParty(bot), bot, 'create_party', logger, tick);
        if (createResult.success) {
          const target = nearbyPartyless[Math.floor(Math.random() * nearbyPartyless.length)];
          try { await timedFreeAction(() => actions.inviteToParty(bot, target), bot, 'invite_to_party', logger, tick); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }
  }

  // A4: Quest acceptance (free — does NOT consume the daily action)
  let activeQuest: { questId: string; objectives: any[]; progress: Record<string, number>; type: string } | null = null;
  if (config.enabledSystems.quests) {
    activeQuest = await actions.checkActiveQuest(bot);
    if (!activeQuest) {
      try { await timedFreeAction(() => actions.acceptQuest(bot), bot, 'accept_quest', logger, tick); } catch { /* ignore */ }
      activeQuest = await actions.checkActiveQuest(bot);
    }
  }

  // A5: Asset Management (free actions) — buy, plant, accept jobs
  const ASSET_GATHERING_PROFESSIONS = new Set(['FARMER', 'MINER', 'LUMBERJACK', 'FISHERMAN', 'HERBALIST', 'RANCHER', 'HUNTER']);
  const hasGatheringProf = bot.professions.some(p => ASSET_GATHERING_PROFESSIONS.has(p.toUpperCase()));

  if (hasGatheringProf) {
    // Buy assets if bot has enough gold (keep 50g buffer)
    if (bot.gold > 150 && config.enabledSystems.gathering) {
      try {
        const buyResult = await timedFreeAction(() => buyAsset(bot), bot, 'buy_asset', logger, tick);
        if (buyResult.success) {
          console.log(`[SIM] ${bot.characterName} bought asset: ${buyResult.detail}`);
        }
      } catch { /* ignore buy failures */ }
    }

    // Plant crops on empty assets (free, no daily action)
    if (config.enabledSystems.gathering) {
      try {
        const plantResult = await timedFreeAction(() => plantAsset(bot), bot, 'plant_asset', logger, tick);
        if (plantResult.success) {
          console.log(`[SIM] ${bot.characterName} planted: ${plantResult.detail}`);
        }
      } catch { /* ignore plant failures */ }
    }

    // Accept job listings if no assets to tend
    if (config.enabledSystems.gathering) {
      try {
        const jobResult = await timedFreeAction(() => acceptJob(bot), bot, 'accept_job', logger, tick);
        if (jobResult.success) {
          console.log(`[SIM] ${bot.characterName} accepted job: ${jobResult.detail}`);
        }
      } catch { /* ignore job failures */ }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase B: MANDATORY daily action (exactly 1: gather, travel, or craft)
  // Every bot MUST commit a daily action. Fallback chain ensures this.
  // ═══════════════════════════════════════════════════════════════════════════

  // B1: Pre-profession bots — learn profession or grind XP
  if (bot.professions.length === 0) {
    if (bot.level < PROFESSION_UNLOCK_LEVEL) {
      // Below level gate: gather from spot (no profession needed) or travel
      return tryDailyWithFallback(bot, ['gather', 'travel', 'craft'], config.enabledSystems, logger, tick);
    }

    // Level 3+: learn a profession based on profile (or random for low intelligence)
    let profType: string;
    if (Math.random() * 100 > intelligence) {
      profType = pickRandom(GATHERING_PROFESSIONS);
    } else {
      switch (bot.profile) {
        case 'gatherer':   profType = 'MINER';      break;
        case 'crafter':    profType = 'COOK';       break;  // was BLACKSMITH
        case 'merchant':   profType = 'MERCHANT';    break;
        case 'warrior':    profType = 'MINER';       break;
        case 'politician': profType = 'FARMER';      break;
        case 'socialite':  profType = 'FARMER';      break;
        case 'explorer':   profType = 'HERBALIST';   break;
        case 'balanced':   profType = 'COOK';       break;  // was MINER
        default:           profType = 'FARMER';      break;
      }
    }

    const start1 = Date.now();
    const result = await actions.learnProfession(bot, profType);
    if (logger && tick != null) {
      logger.logFromResult(bot, result, { tick, phase: 'daily', intent: 'learn_profession', attemptNumber: 1, durationMs: Date.now() - start1, dailyActionUsed: false });
    }
    if (result.success) return result;

    // Fallback professions
    const fallbacks: string[] = [];
    switch (bot.profile) {
      case 'gatherer':  fallbacks.push('FARMER', 'LUMBERJACK'); break;
      case 'crafter':   fallbacks.push('COOK', 'FARMER'); break;  // was SMELTER, FARMER
      default:          fallbacks.push('FARMER', 'MINER'); break;
    }
    for (let i = 0; i < fallbacks.length; i++) {
      const startFb = Date.now();
      const fbResult = await actions.learnProfession(bot, fallbacks[i]);
      if (logger && tick != null) {
        logger.logFromResult(bot, fbResult, { tick, phase: 'daily', intent: 'learn_profession', attemptNumber: i + 2, fallbackReason: `learn ${profType} failed`, durationMs: Date.now() - startFb, dailyActionUsed: false });
      }
      if (fbResult.success) return fbResult;
    }

    // If learning still failed, gather or travel instead
    return tryDailyWithFallback(bot, ['gather', 'travel'], config.enabledSystems, logger, tick);
  }

  // B2: Pending collections
  if (bot.pendingGathering) {
    const start2 = Date.now();
    const r = await actions.collectGathering(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, r, { tick, phase: 'daily', intent: 'collect_gathering', attemptNumber: 1, durationMs: Date.now() - start2, dailyActionUsed: false });
    }
    return r;
  }
  if (bot.pendingCrafting) {
    const start3 = Date.now();
    const r = await actions.collectCrafting(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, r, { tick, phase: 'daily', intent: 'collect_crafting', attemptNumber: 1, durationMs: Date.now() - start3, dailyActionUsed: false });
    }
    return r;
  }

  // B2b: Priority — Harvest READY assets before normal actions
  if (hasGatheringProf && config.enabledSystems.gathering) {
    try {
      const { result: harvestResult, durationMs: harvestMs } = await executeDailyAction('harvest', bot);
      if (harvestResult.success) {
        if (logger && tick != null) {
          logger.logFromResult(bot, harvestResult, { tick, phase: 'daily', intent: 'harvest_asset', attemptNumber: 1, durationMs: harvestMs, dailyActionUsed: true });
        }
        return harvestResult;
      }
    } catch { /* no READY assets, fall through to normal actions */ }
  }

  // B3: FARMER bots — gathering only, never craft
  if (isFarmerBot) {
    return tryDailyWithFallback(bot, ['gather', 'travel'], config.enabledSystems, logger, tick);
  }

  // B3a: COOK bots — craft first (use ingredients before they expire), else gather
  if (isCookBot) {
    if (config.enabledSystems.crafting) {
      const { result: craftResult, durationMs: craftMs } = await executeDailyAction('craft', bot);
      if (logger && tick != null) {
        logger.logFromResult(bot, craftResult, { tick, phase: 'daily', intent: 'cook_craft_priority', attemptNumber: 1, durationMs: craftMs, dailyActionUsed: false });
      }
      if (craftResult.success) return craftResult;
    }
    // No craftable recipes — gather farming resources
    return tryDailyWithFallback(bot, ['gather', 'travel'], config.enabledSystems, logger, tick);
  }

  // B3b: Party leader prefers group travel as daily action
  if (bot.partyId && bot.partyRole === 'leader' && bot.partyTicksRemaining > 0) {
    const start4 = Date.now();
    const travelResult = await actions.partyTravel(bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, travelResult, { tick, phase: 'daily', intent: 'party_travel', attemptNumber: 1, durationMs: Date.now() - start4, dailyActionUsed: false });
    }
    if (travelResult.success) return travelResult;
    // Fall through if group travel failed
  }

  // B3c: Non-leader party members — leave party before acting (travel requires leader)
  if (bot.partyId && bot.partyRole !== 'leader') {
    try { await timedFreeAction(() => actions.leaveParty(bot), bot, 'leave_party', logger, tick); } catch { /* ignore */ }
  }

  // B4: Quest-guided daily action (non-FARMER bots only, FARMER already handled above)
  if (!isFarmerBot && activeQuest) {
    const firstIncomplete = activeQuest.objectives.findIndex(
      (obj: any, idx: number) => (activeQuest!.progress[String(idx)] || 0) < obj.quantity,
    );

    if (firstIncomplete >= 0) {
      const objType = activeQuest.objectives[firstIncomplete].type;
      const questAction = mapObjectiveToDailyAction(objType);

      if (questAction) {
        // For craft, ensure bot has a crafting profession
        if (questAction === 'craft' && bot.professions.length === 0) {
          // Can't craft yet — fall through to profile-weighted
        } else {
          const { result, durationMs } = await executeDailyAction(questAction, bot);
          if (logger && tick != null) {
            logger.logFromResult(bot, result, { tick, phase: 'daily', intent: `quest_${questAction}`, attemptNumber: 1, durationMs, dailyActionUsed: false });
          }
          if (result.success) return result;
          // If quest-guided action failed, fall through to profile-weighted
        }
      }
    }
  }

  // B5: Profile-weighted daily action selection
  const profileWeights = DAILY_WEIGHTS[bot.profile] || DAILY_WEIGHTS.balanced;
  const filteredWeights = filterDailyWeights(profileWeights, config.enabledSystems, bot);

  if (Object.keys(filteredWeights).length > 0) {
    // Intelligence modulation: sometimes pick random instead of profile-based
    let selected: DailyActionKey;
    if (Math.random() * 100 > intelligence) {
      const allKeys = Object.keys(filteredWeights) as DailyActionKey[];
      selected = pickRandom(allKeys);
    } else {
      selected = weightedSelect(filteredWeights);
    }

    const { result, durationMs } = await executeDailyAction(selected, bot);
    if (logger && tick != null) {
      logger.logFromResult(bot, result, { tick, phase: 'daily', intent: selected, attemptNumber: 1, durationMs, dailyActionUsed: false });
    }
    if (result.success) return result;
  }

  // B6: FALLBACK — try each daily action in order until one works
  // FARMER bots prioritize gathering (to restock perishable ingredients) over travel
  const fallbackOrder: DailyActionKey[] = isFarmerBot
    ? ['gather', 'craft', 'travel']
    : ['gather', 'travel', 'craft'];
  return tryDailyWithFallback(bot, fallbackOrder, config.enabledSystems, logger, tick);
}

// ---- Error storm: deliberately trigger invalid actions ----
export async function errorStormAction(bot: BotState): Promise<ActionResult> {
  return actions.triggerInvalidAction(bot);
}
