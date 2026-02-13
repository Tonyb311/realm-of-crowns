// ---------------------------------------------------------------------------
// Bot Behavior Engine -- 8 profiles with weighted action selection
// ---------------------------------------------------------------------------

import { BotState, BotProfile, SimulationConfig, ActionResult } from './types';
import * as actions from './actions';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';

// ---- Action key union ----
type ActionKey =
  | 'gather' | 'craft' | 'buy' | 'sell'
  | 'combat' | 'quest' | 'travel' | 'message'
  | 'friend' | 'nominate' | 'vote' | 'guild'
  | 'equip' | 'browse';

// ---- Per-profile weight tables ----
const PROFILE_WEIGHTS: Record<BotProfile, Partial<Record<ActionKey, number>>> = {
  gatherer:   { gather: 40, sell: 20, travel: 15, browse: 10, buy: 5, craft: 5, quest: 5 },
  crafter:    { craft: 30, buy: 25, sell: 20, browse: 10, gather: 10, travel: 5 },
  merchant:   { buy: 30, sell: 30, travel: 20, browse: 15, gather: 5 },
  warrior:    { combat: 45, quest: 20, buy: 10, travel: 10, equip: 10, browse: 5 },
  politician: { message: 25, nominate: 15, vote: 15, friend: 15, browse: 15, travel: 10, quest: 5 },
  socialite:  { message: 30, friend: 25, quest: 15, vote: 10, guild: 10, browse: 10 },
  explorer:   { travel: 40, gather: 20, combat: 20, quest: 15, browse: 5 },
  balanced:   { gather: 12, craft: 12, buy: 12, sell: 12, combat: 12, quest: 10, travel: 10, message: 8, friend: 6, browse: 6 },
};

// ---- Gathering professions for random selection ----
const GATHERING_PROFESSIONS = ['MINER', 'FARMER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER'];

// ---- Random pick helper ----
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Weighted random selection ----
function weightedSelect(weights: Partial<Record<ActionKey, number>>): ActionKey {
  const entries = Object.entries(weights) as [ActionKey, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  return entries[0][0]; // fallback
}

// ---- Filter weights by enabled systems ----
function filterWeights(
  weights: Partial<Record<ActionKey, number>>,
  enabled: SimulationConfig['enabledSystems'],
): Partial<Record<ActionKey, number>> {
  const filtered: Partial<Record<ActionKey, number>> = {};

  for (const [key, weight] of Object.entries(weights) as [ActionKey, number][]) {
    let allowed = true;

    switch (key) {
      case 'gather':
        if (!enabled.gathering) allowed = false;
        break;
      case 'craft':
        if (!enabled.crafting) allowed = false;
        break;
      case 'buy':
      case 'sell':
      case 'browse':
        if (!enabled.market) allowed = false;
        break;
      case 'combat':
        if (!enabled.combat) allowed = false;
        break;
      case 'quest':
        if (!enabled.quests) allowed = false;
        break;
      case 'travel':
        if (!enabled.travel) allowed = false;
        break;
      case 'message':
      case 'friend':
        if (!enabled.social) allowed = false;
        break;
      case 'guild':
        if (!enabled.guilds) allowed = false;
        break;
      case 'nominate':
      case 'vote':
        if (!enabled.governance) allowed = false;
        break;
      case 'equip':
        // Equipment is always available (no dedicated toggle)
        break;
    }

    if (allowed) filtered[key] = weight;
  }

  return filtered;
}

// ---- Execute a specific action by key ----
function executeAction(action: ActionKey, bot: BotState, allBots: BotState[]): Promise<ActionResult> {
  switch (action) {
    case 'gather':    return actions.startGathering(bot);
    case 'craft':     return actions.startCrafting(bot);
    case 'buy':       return actions.buyFromMarket(bot);
    case 'sell':      return actions.listOnMarket(bot);
    case 'combat':    return actions.startCombat(bot);
    case 'quest':     return actions.acceptQuest(bot);
    case 'travel':    return actions.travel(bot);
    case 'message':   return actions.sendMessage(bot);
    case 'friend':    return actions.addFriend(bot, allBots);
    case 'nominate':  return actions.nominateForElection(bot);
    case 'vote':      return actions.voteInElection(bot, allBots);
    case 'guild':     return actions.createGuild(bot);
    case 'equip':     return actions.equipItem(bot);
    case 'browse':    return actions.browseMarket(bot);
    default:          return Promise.resolve({ success: true, detail: 'Idle', endpoint: 'none' });
  }
}

// ---- Main decision function ----
export async function decideBotAction(
  bot: BotState,
  allBots: BotState[],
  config: SimulationConfig,
): Promise<ActionResult> {
  // 1. Cooldown check
  if (bot.pausedUntil > Date.now()) {
    return { success: true, detail: 'Bot paused (cooldown)', endpoint: 'none' };
  }

  const intelligence = bot.intelligence ?? 50;

  // Check if travel is possible (more than 1 unique town among bots)
  const uniqueTowns = new Set(allBots.map(b => b.currentTownId)).size;
  const canTravel = uniqueTowns > 1;

  // 2. If no professions, either grind XP (below level gate) or learn one
  if (bot.professions.length === 0) {
    if (bot.level < PROFESSION_UNLOCK_LEVEL) {
      // Pre-profession: grind XP via combat, quests, and travel
      const travelWeight = canTravel ? 15 : 0;
      const preProfWeights: { key: ActionKey; weight: number }[] = [
        { key: 'combat', weight: 60 },
        { key: 'quest', weight: 25 + (canTravel ? 0 : 15) },
        { key: 'travel', weight: travelWeight },
      ];
      const total = preProfWeights.reduce((sum, w) => sum + w.weight, 0);
      let rand = Math.random() * total;
      let selectedKey: ActionKey = 'combat';
      for (const { key, weight } of preProfWeights) {
        rand -= weight;
        if (rand <= 0) { selectedKey = key; break; }
      }
      return executeAction(selectedKey, bot, allBots);
    }

    // Level 3+: learn a profession based on profile (or random for low intelligence)
    if (Math.random() * 100 > intelligence) {
      // Random profession choice
      const randomProf = pickRandom(GATHERING_PROFESSIONS);
      return actions.learnProfession(bot, randomProf);
    }

    // Smart (profile-based) profession choice
    let profType: string;
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

    const result = await actions.learnProfession(bot, profType);

    // If primary choice failed, try fallback
    if (!result.success) {
      let fallback: string | null = null;
      switch (bot.profile) {
        case 'gatherer':  fallback = 'FARMER';  break;
        case 'crafter':   fallback = 'SMELTER'; break;
        default:          fallback = null;       break;
      }
      if (fallback) {
        return actions.learnProfession(bot, fallback);
      }
    }

    return result;
  }

  // 3. Check pending collections first
  if (bot.pendingGathering) {
    return actions.collectGathering(bot);
  }
  if (bot.pendingCrafting) {
    return actions.collectCrafting(bot);
  }

  // 4. Intelligence modulates action selection
  if (Math.random() * 100 > intelligence) {
    // Random action — pick any enabled action
    const profileWeights = PROFILE_WEIGHTS.balanced;
    const filteredWeights = filterWeights(profileWeights, config.enabledSystems);
    if (!canTravel) delete filteredWeights.travel;
    const allActions = Object.keys(filteredWeights) as ActionKey[];
    if (allActions.length > 0) {
      const randomAction = pickRandom(allActions);
      return executeAction(randomAction, bot, allBots);
    }
  }

  // 5. Smart action — use profile weights (existing logic)
  const profileWeights = PROFILE_WEIGHTS[bot.profile] || PROFILE_WEIGHTS.balanced;
  const filteredWeights = filterWeights(profileWeights, config.enabledSystems);
  if (!canTravel) delete filteredWeights.travel;

  if (Object.keys(filteredWeights).length === 0) {
    return { success: true, detail: 'No enabled systems', endpoint: 'none' };
  }

  const selected = weightedSelect(filteredWeights);

  return executeAction(selected, bot, allBots);
}

// ---- Error storm: deliberately trigger invalid actions ----
export async function errorStormAction(bot: BotState): Promise<ActionResult> {
  return actions.triggerInvalidAction(bot);
}
