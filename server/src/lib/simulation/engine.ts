// ---------------------------------------------------------------------------
// Bot Behavior Engine -- 8 profiles with weighted action selection
// ---------------------------------------------------------------------------

import { BotState, BotProfile, SimulationConfig, ActionResult } from './types';
import * as actions from './actions';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';

// ---- Action key union ----
// NOTE: 'combat' removed as standalone action — PvE combat now only occurs
// as road encounters during travel (resolved by travel-tick.ts)
// NOTE: 'buy', 'sell', 'browse' removed — market actions are now FREE actions
// that happen after the main action loop (see doFreeMarketActions in actions.ts)
type ActionKey =
  | 'gather' | 'craft'
  | 'quest' | 'travel' | 'message'
  | 'friend' | 'nominate' | 'vote' | 'guild'
  | 'equip' | 'party';

// ---- Per-profile weight tables ----
// Combat weight removed from all profiles — PvE happens via road encounters during travel.
// Travel weight increased to compensate, since travel is now the path to combat XP.
// Market weights (buy/sell/browse) removed — market actions are now FREE actions
// that happen after the main action loop and don't consume action slots.
const PROFILE_WEIGHTS: Record<BotProfile, Partial<Record<ActionKey, number>>> = {
  gatherer:   { gather: 45, travel: 20, craft: 10, quest: 10, equip: 5, message: 5, friend: 5 },
  crafter:    { craft: 40, gather: 20, travel: 10, quest: 10, equip: 10, message: 5, friend: 5 },
  merchant:   { travel: 35, quest: 20, message: 15, friend: 10, guild: 10, equip: 10 },
  warrior:    { travel: 40, quest: 30, equip: 20, message: 5, friend: 5 },
  politician: { message: 25, nominate: 15, vote: 15, friend: 15, travel: 15, quest: 10, guild: 5 },
  socialite:  { message: 30, friend: 25, quest: 15, vote: 10, guild: 10, travel: 10 },
  explorer:   { travel: 55, gather: 20, quest: 20, equip: 5 },
  balanced:   { gather: 15, craft: 15, quest: 15, travel: 20, message: 10, friend: 8, equip: 7, guild: 5, nominate: 3, vote: 2 },
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
      // 'buy', 'sell', 'browse' removed — market actions are now FREE (see doFreeMarketActions)
      // 'combat' removed — PvE combat now only occurs as road encounters during travel
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

// ---- Map quest objective type to bot action ----
function mapObjectiveToAction(objectiveType: string): ActionKey | null {
  switch (objectiveType) {
    case 'KILL':               return 'travel'; // PvE combat occurs as road encounters during travel
    case 'VISIT':              return 'travel';
    case 'EQUIP':              return 'equip';
    case 'SELECT_PROFESSION':  return null; // Handled by existing learn-profession logic
    case 'GATHER':             return 'gather';
    case 'CRAFT':              return 'craft';
    case 'MARKET_SELL':        return null; // Market actions are now FREE (handled by doFreeMarketActions)
    case 'MARKET_BUY':         return null; // Market actions are now FREE (handled by doFreeMarketActions)
    default:                   return null;
  }
}

// ---- Execute a specific action by key ----
function executeAction(action: ActionKey, bot: BotState, allBots: BotState[]): Promise<ActionResult> {
  switch (action) {
    case 'gather':    return actions.startGathering(bot);
    case 'craft':     return actions.startCrafting(bot);
    // 'buy', 'sell', 'browse' removed — market actions are now FREE (see doFreeMarketActions)
    // 'combat' removed — PvE combat now only occurs as road encounters during travel
    case 'quest':     return actions.acceptQuest(bot);
    case 'travel':    return actions.travel(bot);
    case 'message':   return actions.sendMessage(bot);
    case 'friend':    return actions.addFriend(bot, allBots);
    case 'nominate':  return actions.nominateForElection(bot);
    case 'vote':      return actions.voteInElection(bot, allBots);
    case 'guild':     return actions.createGuild(bot);
    case 'equip':     return actions.equipItem(bot);
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

  // ─── Party lifecycle management ───
  if (bot.partyId) {
    if (bot.partyRole === 'leader') {
      bot.partyTicksRemaining--;

      // Time to disband? (0 or fewer ticks remaining)
      if (bot.partyTicksRemaining <= 0) {
        return actions.disbandParty(bot);
      }

      // Leader with party: try to invite nearby partyless bots (if party < 3)
      const partyMembers = allBots.filter(b => b.partyId === bot.partyId);
      if (partyMembers.length < 3) {
        const candidates = allBots.filter(
          b => !b.partyId && b.currentTownId === bot.currentTownId && b.characterId !== bot.characterId,
        );
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          return actions.inviteToParty(bot, target);
        }
      }

      // Leader: wait 2 ticks for recruitment before traveling
      // (partyTicksRemaining starts at 5-7, only travel when <= remaining - 2)
      const initialTicks = 5; // approximate initial value
      const ticksElapsed = initialTicks - bot.partyTicksRemaining;
      if (ticksElapsed < 2) {
        return { success: true, detail: 'Party leader recruiting (waiting for members)', endpoint: 'none' };
      }

      // Leader with party: initiate group travel if possible
      if (canTravel) {
        return actions.partyTravel(bot);
      }
    }

    // Non-leader in party: fall through to individual actions (craft, gather, quest, etc.)
  }

  // ─── Always check for pending party invites when not in a party ───
  if (!bot.partyId && bot.currentTownId) {
    const acceptResult = await actions.acceptPartyInvite(bot);
    if (acceptResult.success) {
      return acceptResult;
    }
  }

  // ─── Party formation check (not in a party, 30% chance) ───
  if (!bot.partyId && bot.currentTownId && Math.random() < 0.3) {
    // Try to create a party if there are other partyless bots nearby
    const nearbyPartyless = allBots.filter(
      b => !b.partyId && b.characterId !== bot.characterId && b.currentTownId === bot.currentTownId,
    );
    if (nearbyPartyless.length > 0) {
      const createResult = await actions.createParty(bot);
      if (createResult.success) {
        // Immediately invite a nearby bot
        const target = nearbyPartyless[Math.floor(Math.random() * nearbyPartyless.length)];
        await actions.inviteToParty(bot, target);
        return createResult;
      }
    }
  }

  // ─── Quest-first logic ───
  // Quest acceptance is a FREE action — it doesn't consume a tick action.
  // Only the objective actions (travel, gather, craft, etc.) cost actions.
  if (config.enabledSystems.quests) {
    let activeQuest = await actions.checkActiveQuest(bot);

    // If no active quest, try to accept one (free — doesn't cost an action)
    if (!activeQuest) {
      await actions.acceptQuest(bot);
      // Re-check: did we just accept a quest?
      activeQuest = await actions.checkActiveQuest(bot);
    }

    if (activeQuest) {
      // Map quest objective type to bot action
      const firstIncomplete = activeQuest.objectives.findIndex(
        (obj: any, idx: number) => (activeQuest.progress[String(idx)] || 0) < obj.quantity,
      );

      if (firstIncomplete >= 0) {
        const objType = activeQuest.objectives[firstIncomplete].type;
        const questAction = mapObjectiveToAction(objType);

        if (questAction) {
          // For profession-dependent actions, ensure bot has a profession
          if (['gather', 'craft'].includes(questAction) && bot.professions.length === 0) {
            // Can't do this yet — fall through to existing logic
          } else if (questAction === 'travel' && !canTravel) {
            // Can't travel — fall through
          } else {
            return executeAction(questAction, bot, allBots);
          }
        }
      }
      // If all objectives met (TUTORIAL auto-completes via triggers),
      // refresh state and fall through
    }
    // If no quests available or acceptance failed, fall through to profile-based AI
  }

  // 2. If no professions, either grind XP (below level gate) or learn one
  if (bot.professions.length === 0) {
    if (bot.level < PROFESSION_UNLOCK_LEVEL) {
      // Pre-profession: grind XP via travel (road encounters) and quests
      const travelWeight = canTravel ? 60 : 0;
      const preProfWeights: { key: ActionKey; weight: number }[] = [
        { key: 'quest', weight: 40 + (canTravel ? 0 : 60) },
        { key: 'travel', weight: travelWeight },
      ];
      const total = preProfWeights.reduce((sum, w) => sum + w.weight, 0);
      let rand = Math.random() * total;
      let selectedKey: ActionKey = 'quest';
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
