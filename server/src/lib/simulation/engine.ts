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
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';

// ---- Daily action keys (the only actions that consume the daily action slot) ----
type DailyActionKey = 'gather' | 'craft' | 'travel';

// ---- Per-profile daily action weight tables ----
// Only gather, craft, travel — everything else is free.
const DAILY_WEIGHTS: Record<BotProfile, Record<DailyActionKey, number>> = {
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

// ---- Filter weights by enabled systems ----
function filterDailyWeights(
  weights: Record<DailyActionKey, number>,
  enabled: SimulationConfig['enabledSystems'],
): Partial<Record<DailyActionKey, number>> {
  const filtered: Partial<Record<DailyActionKey, number>> = {};
  if (enabled.gathering) filtered.gather = weights.gather;
  if (enabled.crafting) filtered.craft = weights.craft;
  if (enabled.travel) filtered.travel = weights.travel;
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

// ---- Execute a daily action ----
async function executeDailyAction(action: DailyActionKey, bot: BotState): Promise<ActionResult> {
  switch (action) {
    case 'gather': return actions.gatherFromSpot(bot);
    case 'craft':  return actions.startCrafting(bot);
    case 'travel': return actions.travel(bot);
  }
}

// ---- Try daily actions in fallback order until one succeeds ----
async function tryDailyWithFallback(
  bot: BotState,
  order: DailyActionKey[],
  enabled: SimulationConfig['enabledSystems'],
): Promise<ActionResult> {
  const failureReasons: string[] = [];
  for (const action of order) {
    if (action === 'gather' && !enabled.gathering) { failureReasons.push(`${action}: disabled`); continue; }
    if (action === 'craft' && !enabled.crafting) { failureReasons.push(`${action}: disabled`); continue; }
    if (action === 'travel' && !enabled.travel) { failureReasons.push(`${action}: disabled`); continue; }
    const result = await executeDailyAction(action, bot);
    if (result.success) return result;
    const reason = `${action}: ${result.detail} (${result.endpoint})`;
    failureReasons.push(reason);
    console.log(`[SIM] ${bot.characterName} ${action.toUpperCase()} FAILED: ${result.detail} [endpoint: ${result.endpoint}]`);
  }
  const allReasons = failureReasons.join(' | ');
  console.log(`[SIM] ${bot.characterName} ALL ACTIONS FAILED: ${allReasons}`);
  return { success: false, detail: `All failed — ${allReasons}`, endpoint: 'none' };
}

// ---- Main decision function ----
export async function decideBotAction(
  bot: BotState,
  allBots: BotState[],
  config: SimulationConfig,
): Promise<ActionResult> {
  // 0. Cooldown check
  if (bot.pausedUntil > Date.now()) {
    return { success: true, detail: 'Bot paused (cooldown)', endpoint: 'none' };
  }

  // 0b. Skip bots that are currently traveling — they already committed travel
  if (bot.pendingTravel) {
    console.log(`[SIM] ${bot.characterName} skipping — currently traveling`);
    return { success: true, detail: 'Currently traveling (awaiting tick resolution)', endpoint: 'none' };
  }

  const intelligence = bot.intelligence ?? 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase A: FREE side-effect actions (party, quest, equip)
  // These do NOT consume the daily action. Failures are silently ignored.
  // ═══════════════════════════════════════════════════════════════════════════

  // A1: Party leader management (free)
  if (bot.partyId && bot.partyRole === 'leader') {
    bot.partyTicksRemaining--;

    if (bot.partyTicksRemaining <= 0) {
      // Time to disband
      try { await actions.disbandParty(bot); } catch { /* ignore */ }
    } else {
      // Try to invite nearby partyless bots (if party < 3)
      const partyMembers = allBots.filter(b => b.partyId === bot.partyId);
      if (partyMembers.length < 3) {
        const candidates = allBots.filter(
          b => !b.partyId && b.currentTownId === bot.currentTownId && b.characterId !== bot.characterId,
        );
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          try { await actions.inviteToParty(bot, target); } catch { /* ignore */ }
        }
      }
    }
  }

  // A2: Accept pending party invites (free)
  if (!bot.partyId && bot.currentTownId) {
    try { await actions.acceptPartyInvite(bot); } catch { /* ignore */ }
  }

  // A3: Party formation (free, 30% chance if not in a party)
  if (!bot.partyId && bot.currentTownId && Math.random() < 0.3) {
    const nearbyPartyless = allBots.filter(
      b => !b.partyId && b.characterId !== bot.characterId && b.currentTownId === bot.currentTownId,
    );
    if (nearbyPartyless.length > 0) {
      try {
        const createResult = await actions.createParty(bot);
        if (createResult.success) {
          const target = nearbyPartyless[Math.floor(Math.random() * nearbyPartyless.length)];
          try { await actions.inviteToParty(bot, target); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }
  }

  // A4: Quest acceptance (free — does NOT consume the daily action)
  let activeQuest: { questId: string; objectives: any[]; progress: Record<string, number>; type: string } | null = null;
  if (config.enabledSystems.quests) {
    activeQuest = await actions.checkActiveQuest(bot);
    if (!activeQuest) {
      try { await actions.acceptQuest(bot); } catch { /* ignore */ }
      activeQuest = await actions.checkActiveQuest(bot);
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
      return tryDailyWithFallback(bot, ['gather', 'travel', 'craft'], config.enabledSystems);
    }

    // Level 3+: learn a profession based on profile (or random for low intelligence)
    let profType: string;
    if (Math.random() * 100 > intelligence) {
      profType = pickRandom(GATHERING_PROFESSIONS);
    } else {
      switch (bot.profile) {
        case 'gatherer':   profType = 'MINER';      break;
        case 'crafter':    profType = 'BLACKSMITH';  break;
        case 'merchant':   profType = 'MERCHANT';    break;
        case 'warrior':    profType = 'MINER';       break;
        case 'politician': profType = 'FARMER';      break;
        case 'socialite':  profType = 'FARMER';      break;
        case 'explorer':   profType = 'HERBALIST';   break;
        case 'balanced':   profType = 'MINER';       break;
        default:           profType = 'FARMER';      break;
      }
    }

    const result = await actions.learnProfession(bot, profType);
    if (result.success) return result;

    // Fallback professions
    const fallbacks: string[] = [];
    switch (bot.profile) {
      case 'gatherer':  fallbacks.push('FARMER', 'LUMBERJACK'); break;
      case 'crafter':   fallbacks.push('SMELTER', 'FARMER'); break;
      default:          fallbacks.push('FARMER', 'MINER'); break;
    }
    for (const fb of fallbacks) {
      const fbResult = await actions.learnProfession(bot, fb);
      if (fbResult.success) return fbResult;
    }

    // If learning still failed, gather or travel instead
    return tryDailyWithFallback(bot, ['gather', 'travel'], config.enabledSystems);
  }

  // B2: Pending collections
  if (bot.pendingGathering) {
    return actions.collectGathering(bot);
  }
  if (bot.pendingCrafting) {
    return actions.collectCrafting(bot);
  }

  // B3: Party leader prefers group travel as daily action
  if (bot.partyId && bot.partyRole === 'leader' && bot.partyTicksRemaining > 0) {
    const travelResult = await actions.partyTravel(bot);
    if (travelResult.success) return travelResult;
    // Fall through if group travel failed
  }

  // B3b: Non-leader party members — leave party before acting (travel requires leader)
  if (bot.partyId && bot.partyRole !== 'leader') {
    try { await actions.leaveParty(bot); } catch { /* ignore */ }
  }

  // B4: Quest-guided daily action
  if (activeQuest) {
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
          const result = await executeDailyAction(questAction, bot);
          if (result.success) return result;
          // If quest-guided action failed, fall through to profile-weighted
        }
      }
    }
  }

  // B5: Profile-weighted daily action selection
  const profileWeights = DAILY_WEIGHTS[bot.profile] || DAILY_WEIGHTS.balanced;
  const filteredWeights = filterDailyWeights(profileWeights, config.enabledSystems);

  if (Object.keys(filteredWeights).length > 0) {
    // Intelligence modulation: sometimes pick random instead of profile-based
    let selected: DailyActionKey;
    if (Math.random() * 100 > intelligence) {
      const allKeys = Object.keys(filteredWeights) as DailyActionKey[];
      selected = pickRandom(allKeys);
    } else {
      selected = weightedSelect(filteredWeights);
    }

    const result = await executeDailyAction(selected, bot);
    if (result.success) return result;
  }

  // B6: FALLBACK — try each daily action in order until one works
  return tryDailyWithFallback(bot, ['gather', 'travel', 'craft'], config.enabledSystems);
}

// ---- Error storm: deliberately trigger invalid actions ----
export async function errorStormAction(bot: BotState): Promise<ActionResult> {
  return actions.triggerInvalidAction(bot);
}
