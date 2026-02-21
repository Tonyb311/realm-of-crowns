// ---------------------------------------------------------------------------
// Bot Simulation Actions
// ---------------------------------------------------------------------------
// Each function represents a game action a bot can take, calling real API
// endpoints via the internal HTTP dispatcher.
// ---------------------------------------------------------------------------

import { BotState, ActionResult } from './types';
import { get, post } from './dispatcher';
import { getResourcesByType } from './seed';
import { TOWN_GATHERING_SPOTS } from '@shared/data/gathering';
import { BUILDING_ANIMAL_MAP } from '@shared/data/assets';
import { prisma } from '../../lib/prisma';
import { getOrCreateOpenCycle } from '../auction-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

const GATHERING_RESOURCE_MAP: Record<string, string[]> = {
  MINER:      ['ORE', 'STONE'],
  LUMBERJACK: ['WOOD'],
  FARMER:     ['GRAIN', 'FIBER'],
  HERBALIST:  ['HERB', 'REAGENT'],
  FISHERMAN:  ['FISH'],
  HUNTER:     ['HIDE', 'ANIMAL_PRODUCT'],
};

const GATHERING_PROFESSIONS = Object.keys(GATHERING_RESOURCE_MAP);

const CHAT_MESSAGES = [
  'Greetings travelers!',
  'Looking for a party!',
  'Selling iron ore, best prices!',
  'Anyone seen the quest giver?',
  'What a fine day in Aethermere!',
  'Need a healer for dungeon run',
  'Trading herbs for ore',
  'Looking for guild members!',
  'Town hall meeting tonight!',
  'Watch out for bandits on the road!',
];

// ---------------------------------------------------------------------------
// 1. refreshBotState
// ---------------------------------------------------------------------------

export async function refreshBotState(bot: BotState): Promise<void> {
  const charRes = await get('/characters/me', bot.token);
  if (charRes.status >= 200 && charRes.status < 300 && charRes.data) {
    const d = charRes.data.character || charRes.data;
    if (d.gold !== undefined) bot.gold = d.gold;
    if (d.xp !== undefined) bot.xp = d.xp;
    if (d.level !== undefined) bot.level = d.level;
    if (d.currentTownId) bot.currentTownId = d.currentTownId;
    if (Array.isArray(d.professions)) {
      bot.professions = d.professions.map((p: any) =>
        typeof p === 'string' ? p : p.type || p.professionType,
      );
      // Populate profession levels + specializations maps
      bot.professionLevels = {};
      bot.professionSpecializations = bot.professionSpecializations || {};
      for (const p of d.professions) {
        if (typeof p === 'object' && p !== null) {
          const name = (p.type || p.professionType || '').toUpperCase();
          if (name && p.level != null) bot.professionLevels[name] = p.level;
          if (name && p.specialization) bot.professionSpecializations[name] = p.specialization;
        }
      }
    }
  }

  // Check gathering status
  const workRes = await get('/work/status', bot.token);
  if (workRes.status >= 200 && workRes.status < 300) {
    const working = workRes.data?.active || workRes.data?.inProgress || false;
    bot.pendingGathering = !!working;
  }

  // Check crafting status
  const craftRes = await get('/crafting/status', bot.token);
  if (craftRes.status >= 200 && craftRes.status < 300) {
    const crafting = craftRes.data?.active || craftRes.data?.inProgress || false;
    bot.pendingCrafting = !!crafting;
  }

  // Check travel status
  const travelRes = await get('/travel/status', bot.token);
  if (travelRes.status >= 200 && travelRes.status < 300) {
    bot.pendingTravel = !!travelRes.data?.traveling;
    // Update town if travel completed (bot arrived somewhere new)
    if (!travelRes.data?.traveling && travelRes.data?.currentTownId) {
      bot.currentTownId = travelRes.data.currentTownId;
    }
  }

  // Check party status
  const partyRes = await get('/parties/me', bot.token);
  if (partyRes.status >= 200 && partyRes.status < 300) {
    if (partyRes.data?.party) {
      bot.partyId = partyRes.data.party.id;
      const myMembership = partyRes.data.party.members?.find((m: any) => m.characterId === bot.characterId);
      bot.partyRole = myMembership?.role || 'member';
    } else {
      bot.partyId = null;
      bot.partyRole = null;
    }
  }
}

// ---------------------------------------------------------------------------
// 2. learnProfession
// ---------------------------------------------------------------------------

export async function learnProfession(
  bot: BotState,
  professionType: string,
): Promise<ActionResult> {
  const endpoint = '/professions/learn';
  try {
    const res = await post(endpoint, bot.token, { professionType });
    if (res.status >= 200 && res.status < 300) {
      if (!bot.professions.includes(professionType)) {
        bot.professions.push(professionType);
      }
      bot.professionLevels[professionType.toUpperCase()] = 1;
      return { success: true, detail: `Learned profession ${professionType}`, endpoint, httpStatus: res.status, requestBody: { professionType }, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { professionType }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 2b. specialize — Choose a permanent specialization branch
// ---------------------------------------------------------------------------

export async function specialize(
  bot: BotState,
  professionType: string,
  specialization: string,
): Promise<ActionResult> {
  const endpoint = '/professions/specialize';
  try {
    const res = await post(endpoint, bot.token, { professionType, specialization });
    if (res.status >= 200 && res.status < 300) {
      bot.professionSpecializations = bot.professionSpecializations || {};
      bot.professionSpecializations[professionType.toUpperCase()] = specialization;
      return { success: true, detail: `Specialized ${professionType} as ${specialization}`, endpoint, httpStatus: res.status, requestBody: { professionType, specialization }, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { professionType, specialization }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 3. gatherFromSpot — NEW spot-based gathering (no profession required)
// Uses POST /gathering/gather which creates a LOCKED_IN DailyAction
// resolved at tick time. Works for ALL characters in any town with a spot.
// ---------------------------------------------------------------------------

export async function gatherFromSpot(bot: BotState): Promise<ActionResult> {
  const endpoint = '/gathering/gather';
  try {
    const res = await post(endpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Gathering ${res.data?.itemName || 'resources'} at ${res.data?.spotName || 'local spot'}`,
        endpoint,
        httpStatus: res.status,
        requestBody: {},
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 3b. startGathering — OLD resource-based gathering (requires profession)
// Kept as fallback for profession-specific gathering via /work/start
// ---------------------------------------------------------------------------

export async function startGathering(bot: BotState): Promise<ActionResult> {
  const endpoint = '/work/start';
  try {
    // Find a gathering profession the bot has
    const gatheringProf = bot.professions.find((p) =>
      GATHERING_PROFESSIONS.includes(p.toUpperCase()),
    );
    if (!gatheringProf) {
      return {
        success: false,
        detail: 'Bot has no gathering profession',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'Bot has no gathering profession' },
      };
    }

    const profKey = gatheringProf.toUpperCase();
    const resourceTypes = GATHERING_RESOURCE_MAP[profKey];
    if (!resourceTypes || resourceTypes.length === 0) {
      return {
        success: false,
        detail: `No resource types mapped for ${profKey}`,
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: `No resource types mapped for ${profKey}` },
      };
    }

    // Pick a random resource type and find a matching resource from DB cache
    const chosenType = pickRandom(resourceTypes)!;
    const resources = getResourcesByType(chosenType);
    const resource = pickRandom(resources);
    if (!resource) {
      return {
        success: false,
        detail: `No resources found for type ${chosenType}`,
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: `No resources found for type ${chosenType}` },
      };
    }

    const res = await post(endpoint, bot.token, {
      professionType: profKey,
      resourceId: resource.id,
    });

    if (res.status >= 200 && res.status < 300) {
      bot.pendingGathering = true;
      return {
        success: true,
        detail: `Started gathering ${resource.name} as ${profKey}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { professionType: profKey, resourceId: resource.id },
        responseBody: res.data,
      };
    }
    // Graceful failure for HTTP errors
    bot.pendingGathering = false;
    return { success: false, detail: res.data?.error || `Gathering failed: HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { professionType: profKey, resourceId: resource.id }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 4. collectGathering
// ---------------------------------------------------------------------------

export async function collectGathering(bot: BotState): Promise<ActionResult> {
  const endpoint = '/work/collect';
  try {
    const res = await post(endpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      bot.pendingGathering = false;
      return { success: true, detail: 'Collected gathering results', endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 5. startCrafting
// ---------------------------------------------------------------------------

export async function startCrafting(bot: BotState): Promise<ActionResult> {
  const endpoint = '/actions/lock-in';
  try {
    // Fetch available recipes to find one the bot can craft
    const recipesRes = await get('/crafting/recipes', bot.token);
    if (recipesRes.status < 200 || recipesRes.status >= 300) {
      return {
        success: false,
        detail: recipesRes.data?.error || `Failed to fetch recipes: HTTP ${recipesRes.status}`,
        endpoint,
        httpStatus: recipesRes.status,
        requestBody: {},
        responseBody: recipesRes.data,
      };
    }

    const allRecipes: any[] = recipesRes.data?.recipes || recipesRes.data || [];
    const craftable = allRecipes.filter((r: any) => r.canCraft === true);
    if (craftable.length === 0) {
      return {
        success: false,
        detail: 'No craftable recipes available',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No craftable recipes available' },
      };
    }

    const recipe = pickRandom(craftable)!;
    const recipeId = recipe.id || recipe.recipeId;

    // Lock in a CRAFT DailyAction — resolved by processDailyTick
    const body = { actionType: 'CRAFT', actionTarget: { recipeId } };
    const res = await post(endpoint, bot.token, body);
    if (res.status >= 200 && res.status < 300) {
      // DailyAction created — daily tick will resolve (no pendingCrafting needed)
      return {
        success: true,
        detail: `Locked in crafting ${recipe.name || recipeId}`,
        endpoint,
        httpStatus: res.status,
        requestBody: body,
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: body, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 6. collectCrafting
// ---------------------------------------------------------------------------

export async function collectCrafting(bot: BotState): Promise<ActionResult> {
  const endpoint = '/crafting/collect';
  try {
    const res = await post(endpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      bot.pendingCrafting = false;
      return { success: true, detail: 'Collected crafting results', endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 7. browseMarket
// ---------------------------------------------------------------------------

export async function browseMarket(bot: BotState): Promise<ActionResult> {
  const endpoint = '/market/browse?limit=20';
  try {
    const res = await get(endpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      const listings: any[] = res.data?.listings || res.data || [];
      return {
        success: true,
        detail: `Found ${listings.length} marketplace listings`,
        endpoint,
        httpStatus: res.status,
        requestBody: {},
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 8. buyFromMarket (auction-based: places a buy order with bidPrice)
// ---------------------------------------------------------------------------

export async function buyFromMarket(bot: BotState): Promise<ActionResult> {
  const browseEndpoint = '/market/browse?limit=20';
  const endpoint = '/market/buy';
  try {
    const browseRes = await get(browseEndpoint, bot.token);
    if (browseRes.status < 200 || browseRes.status >= 300) {
      return {
        success: false,
        detail: browseRes.data?.error || `Failed to browse market: HTTP ${browseRes.status}`,
        endpoint,
        httpStatus: browseRes.status,
        requestBody: {},
        responseBody: browseRes.data,
      };
    }

    const listings: any[] = browseRes.data?.listings || browseRes.data || [];
    const maxSpend = bot.gold * 0.5;
    const affordable = listings.filter((l: any) => {
      const price = l.price || l.unitPrice || 0;
      return price > 0 && price <= maxSpend;
    });

    if (affordable.length === 0) {
      return {
        success: false,
        detail: 'No affordable listings found',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No affordable listings found' },
      };
    }

    const listing = pickRandom(affordable)!;
    const listingId = listing.id || listing.listingId;
    const askingPrice = listing.price || listing.unitPrice || 0;

    // Merchant-profile bots bid closer to asking price (rely on merchant priority bonus)
    // Other profiles bid higher to compensate for lack of merchant bonus
    const isMerchant = bot.professions.some(p => p.toUpperCase() === 'MERCHANT');
    const bidMultiplier = isMerchant
      ? 1.0 + Math.random() * 0.05   // 100-105% of asking price
      : 1.0 + Math.random() * 0.2;   // 100-120% of asking price
    const bidPrice = Math.ceil(askingPrice * bidMultiplier);

    const res = await post(endpoint, bot.token, { listingId, bidPrice });
    if (res.status >= 200 && res.status < 300) {
      bot.gold -= bidPrice;
      return {
        success: true,
        detail: `Placed buy order for ${bidPrice}g (asking: ${askingPrice}g)`,
        endpoint,
        httpStatus: res.status,
        requestBody: { listingId, bidPrice },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { listingId, bidPrice }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 9. listOnMarket
// ---------------------------------------------------------------------------

export async function listOnMarket(bot: BotState): Promise<ActionResult> {
  const endpoint = '/market/list';
  try {
    const invRes = await get('/characters/me/inventory', bot.token);
    if (invRes.status < 200 || invRes.status >= 300) {
      return {
        success: false,
        detail: invRes.data?.error || `Failed to fetch inventory: HTTP ${invRes.status}`,
        endpoint,
        httpStatus: invRes.status,
        requestBody: {},
        responseBody: invRes.data,
      };
    }

    const items: any[] = invRes.data?.items || invRes.data || [];
    const sellable = items.filter(
      (i: any) => !i.equipped && i.equipped !== true,
    );

    if (sellable.length === 0) {
      return {
        success: false,
        detail: 'No non-equipped items to list',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No non-equipped items to list' },
      };
    }

    const item = pickRandom(sellable)!;
    const itemId = item.id || item.itemId;

    // Smarter pricing: base 10-40g, merchant bots list 20% higher
    let price = Math.max(5, Math.floor(Math.random() * 30) + 10);
    const isMerchant = bot.professions.some(p => p.toUpperCase() === 'MERCHANT');
    if (isMerchant) {
      price = Math.ceil(price * 1.2);
    }

    const res = await post(endpoint, bot.token, { itemId, price, quantity: 1 });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Listed item ${item.name || itemId} for ${price} gold`,
        endpoint,
        httpStatus: res.status,
        requestBody: { itemId, price, quantity: 1 },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { itemId, price, quantity: 1 }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 10. startCombat — REMOVED (dead code)
// ---------------------------------------------------------------------------
// The /combat/pve/start endpoint is DISABLED (returns 400). Combat ONLY
// occurs as road encounters during travel (see road-encounter.ts).
// Bots acquire combat loot passively via the travel → tick → encounter pipeline.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 11. acceptQuest
// ---------------------------------------------------------------------------

export async function acceptQuest(bot: BotState): Promise<ActionResult> {
  const endpoint = '/quests/accept';
  try {
    const availRes = await get('/quests/available', bot.token);
    if (availRes.status < 200 || availRes.status >= 300) {
      return {
        success: false,
        detail: availRes.data?.error || `Failed to fetch quests: HTTP ${availRes.status}`,
        endpoint,
        httpStatus: availRes.status,
        requestBody: {},
        responseBody: availRes.data,
      };
    }

    const quests: any[] = availRes.data?.quests || availRes.data || [];
    if (quests.length === 0) {
      return {
        success: false,
        detail: 'No available quests',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No available quests' },
      };
    }

    const quest = quests[0];
    const questId = quest.id || quest.questId;

    const res = await post(endpoint, bot.token, { questId });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Accepted quest: ${quest.name || quest.title || questId}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { questId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { questId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 12. travel
// ---------------------------------------------------------------------------

export async function travel(bot: BotState): Promise<ActionResult> {
  const endpoint = '/travel/start';
  try {
    // Fetch available routes from the bot's current town
    const routesRes = await get('/travel/routes', bot.token);
    if (routesRes.status < 200 || routesRes.status >= 300) {
      return {
        success: false,
        detail: routesRes.data?.error || `Failed to fetch travel routes: HTTP ${routesRes.status}`,
        endpoint,
        httpStatus: routesRes.status,
        requestBody: {},
        responseBody: routesRes.data,
      };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return {
        success: false,
        detail: 'No travel routes available from current town',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No travel routes available from current town' },
      };
    }

    // Pick a random route
    const route = pickRandom(routes)!;
    const routeId = route.id || route.routeId;
    const destName = route.destination?.name || route.name || routeId;

    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingTravel = true;
      return {
        success: true,
        detail: `Traveling to ${destName}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { routeId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { routeId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 13. nominateForElection
// ---------------------------------------------------------------------------

export async function nominateForElection(
  bot: BotState,
): Promise<ActionResult> {
  const endpoint = '/elections/nominate';
  try {
    // Try to find current election for bot's town
    const electionsRes = await get(`/elections/current?townId=${bot.currentTownId}`, bot.token);
    const electionId = electionsRes.data?.election?.id || electionsRes.data?.id;

    if (!electionId) {
      return { success: false, detail: 'No active election found', endpoint, httpStatus: electionsRes.status, requestBody: {}, responseBody: electionsRes.data };
    }

    const res = await post(endpoint, bot.token, {
      electionId,
      platform: 'Bot candidate for a better tomorrow!',
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: 'Nominated for election',
        endpoint,
        httpStatus: res.status,
        requestBody: { electionId, platform: 'Bot candidate for a better tomorrow!' },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { electionId, platform: 'Bot candidate for a better tomorrow!' }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 14. voteInElection
// ---------------------------------------------------------------------------

export async function voteInElection(
  bot: BotState,
  allBots: BotState[],
): Promise<ActionResult> {
  const endpoint = '/elections/vote';
  try {
    const electionsRes = await get(`/elections/current?townId=${bot.currentTownId}`, bot.token);
    const electionId = electionsRes.data?.election?.id || electionsRes.data?.id;

    if (!electionId) {
      return { success: false, detail: 'No active election found', endpoint, httpStatus: electionsRes.status, requestBody: {}, responseBody: electionsRes.data };
    }

    // Get candidates from the election or pick another bot
    const candidates = electionsRes.data?.election?.candidates || electionsRes.data?.candidates || [];
    let candidateId: string;

    if (candidates.length > 0) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      candidateId = candidate.characterId || candidate.id;
    } else {
      // Fallback: vote for a random other bot
      const otherBots = allBots.filter((b) => b.characterId !== bot.characterId);
      const target = pickRandom(otherBots);
      if (!target) return { success: false, detail: 'No candidates available', endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No candidates available' } };
      candidateId = target.characterId;
    }

    const res = await post(endpoint, bot.token, { electionId, candidateId });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: 'Voted in election',
        endpoint,
        httpStatus: res.status,
        requestBody: { electionId, candidateId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { electionId, candidateId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 15. sendMessage
// ---------------------------------------------------------------------------

export async function sendMessage(bot: BotState): Promise<ActionResult> {
  const endpoint = '/messages/send';
  try {
    const content = pickRandom(CHAT_MESSAGES) || 'Hello!';
    const res = await post(endpoint, bot.token, {
      channelType: 'TOWN',
      content,
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Sent message: "${content}"`,
        endpoint,
        httpStatus: res.status,
        requestBody: { channelType: 'TOWN', content },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { channelType: 'TOWN', content }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 16. addFriend
// ---------------------------------------------------------------------------

export async function addFriend(
  bot: BotState,
  allBots: BotState[],
): Promise<ActionResult> {
  const endpoint = '/friends/request';
  try {
    const otherBots = allBots.filter((b) => b.characterId !== bot.characterId);
    const target = pickRandom(otherBots);
    if (!target) {
      return {
        success: false,
        detail: 'No other bots to add as friend',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No other bots to add as friend' },
      };
    }

    const res = await post(endpoint, bot.token, {
      characterId: target.characterId,
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Sent friend request to ${target.characterName}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { characterId: target.characterId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { characterId: target.characterId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 17. createGuild
// ---------------------------------------------------------------------------

export async function createGuild(bot: BotState): Promise<ActionResult> {
  const endpoint = '/guilds';
  try {
    if (bot.gold < 500) {
      return {
        success: false,
        detail: `Not enough gold (${bot.gold}/500)`,
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: `Not enough gold (${bot.gold}/500)` },
      };
    }

    const tag = bot.characterName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'BOT';

    const res = await post(endpoint, bot.token, {
      name: `Guild of ${bot.characterName}`,
      tag,
      description: 'A guild for adventurers',
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Created guild "Guild of ${bot.characterName}" [${tag}]`,
        endpoint,
        httpStatus: res.status,
        requestBody: { name: `Guild of ${bot.characterName}`, tag, description: 'A guild for adventurers' },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { name: `Guild of ${bot.characterName}`, tag, description: 'A guild for adventurers' }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 18. equipItem
// ---------------------------------------------------------------------------

export async function equipItem(bot: BotState): Promise<ActionResult> {
  const endpoint = '/equipment/equip';
  try {
    const invRes = await get('/characters/me/inventory', bot.token);
    if (invRes.status < 200 || invRes.status >= 300) {
      return {
        success: false,
        detail: invRes.data?.error || `Failed to fetch inventory: HTTP ${invRes.status}`,
        endpoint,
        httpStatus: invRes.status,
        requestBody: {},
        responseBody: invRes.data,
      };
    }

    const items: any[] = invRes.data?.items || invRes.data || [];
    const equippable = items.filter((i: any) => {
      if (i.equipped) return false;
      const type = (i.type || i.itemType || '').toUpperCase();
      return (
        type === 'WEAPON' ||
        type === 'ARMOR' ||
        type === 'TOOL' ||
        type.includes('SHIELD') ||
        type.includes('HELMET') ||
        type.includes('BOOTS') ||
        type.includes('GLOVES')
      );
    });

    if (equippable.length === 0) {
      return {
        success: false,
        detail: 'No equippable items found in inventory',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No equippable items found in inventory' },
      };
    }

    const item = pickRandom(equippable)!;
    const itemId = item.id || item.itemId;
    const type = (item.type || item.itemType || '').toUpperCase();

    // Determine slot based on item type
    let slot = 'MAIN_HAND';
    if (type === 'TOOL') slot = 'TOOL';
    else if (type === 'ARMOR') {
      const stats = item.stats || {};
      const eqSlot = stats.equipSlot as string | undefined;
      if (eqSlot) {
        slot = eqSlot;
      } else {
        const name = (item.name || '').toLowerCase();
        if (name.includes('helmet') || name.includes('helm')) slot = 'HEAD';
        else if (name.includes('shield')) slot = 'OFF_HAND';
        else if (name.includes('legging') || name.includes('greave') || name.includes('chain leggings')) slot = 'LEGS';
        else slot = 'CHEST';
      }
    } else if (type.includes('SHIELD')) slot = 'OFF_HAND';

    const res = await post(endpoint, bot.token, { itemId, slot });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Equipped ${item.name || itemId} to ${slot}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { itemId, slot },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { itemId, slot }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 19b. equipTool — equip a specific tool for a profession
// ---------------------------------------------------------------------------

export async function equipTool(
  bot: BotState,
  itemId: string,
  professionType: string,
): Promise<ActionResult> {
  const endpoint = '/tools/equip';
  try {
    const res = await post(endpoint, bot.token, { itemId, professionType });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Equipped tool for ${professionType}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { itemId, professionType },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { itemId, professionType }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 19c. checkEquippedTool — check if bot has a tool equipped
// ---------------------------------------------------------------------------

export async function checkEquippedTool(bot: BotState): Promise<{ equipped: boolean; professionType?: string; name?: string }> {
  try {
    const res = await get('/tools/equipped', bot.token);
    if (res.status >= 200 && res.status < 300 && res.data?.equipped) {
      return {
        equipped: true,
        professionType: res.data.equipped.professionType,
        name: res.data.equipped.item?.name,
      };
    }
    return { equipped: false };
  } catch {
    return { equipped: false };
  }
}

// ---------------------------------------------------------------------------
// 19d. ensureToolEquipped — check, find, buy, and equip a tool for a profession
// ---------------------------------------------------------------------------

const PROF_TO_TOOL_NAME: Record<string, string> = {
  MINER: 'Pickaxe',
  LUMBERJACK: 'Axe',
  FARMER: 'Hoe',
  FISHERMAN: 'Fishing Rod',
  HERBALIST: 'Sickle',
  HUNTER: 'Skinning Knife',
};

export async function ensureToolEquipped(
  bot: BotState,
  targetProfession: string,
): Promise<ActionResult> {
  const endpoint = '/tools/equip';
  try {
    // 1. Check currently equipped tool
    const equipped = await checkEquippedTool(bot);
    if (equipped.equipped && equipped.professionType === targetProfession) {
      return { success: false, detail: `Already have ${equipped.name} equipped for ${targetProfession}`, endpoint: '/tools/equipped', httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    // 2. Search tool inventory for matching tool with durability
    const invRes = await get('/tools/inventory', bot.token);
    if (invRes.status >= 200 && invRes.status < 300) {
      const tools: any[] = invRes.data?.tools || [];
      const matching = tools.filter(
        (t: any) => t.stats?.professionType === targetProfession && t.currentDurability > 0,
      );
      // Prefer highest yield bonus (best tier)
      matching.sort((a: any, b: any) => (b.stats?.yieldBonus || 0) - (a.stats?.yieldBonus || 0));

      if (matching.length > 0) {
        const tool = matching[0];
        return await equipTool(bot, tool.itemId, targetProfession);
      }
    }

    // 3. No tool in inventory — try to buy from market
    const toolTypeName = PROF_TO_TOOL_NAME[targetProfession];
    if (!toolTypeName) {
      return { success: false, detail: `No tool type for ${targetProfession}`, endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    const maxPrice = Math.floor(bot.gold * 0.3);
    if (maxPrice < 5) {
      return { success: false, detail: `Not enough gold to buy a ${toolTypeName} (${bot.gold}g)`, endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    const listings = await prisma.marketListing.findMany({
      where: {
        status: 'active',
        itemName: { contains: toolTypeName, mode: 'insensitive' },
        price: { gt: 0, lte: maxPrice },
        sellerId: { not: bot.characterId },
      },
      orderBy: { price: 'asc' },
      take: 1,
      select: {
        id: true, price: true, itemName: true, quantity: true,
        townId: true, sellerId: true,
        seller: { select: { name: true } },
      },
    });

    if (listings.length === 0) {
      return { success: false, detail: `No ${toolTypeName} on market (max ${maxPrice}g)`, endpoint, httpStatus: 0, requestBody: { toolTypeName, maxPrice }, responseBody: {} };
    }

    const listing = listings[0];
    const bidPrice = Math.ceil(listing.price * 1.1);

    // Check for duplicate order
    const existingOrder = await prisma.marketBuyOrder.findUnique({
      where: { buyerId_listingId: { buyerId: bot.characterId, listingId: listing.id } },
    });
    if (existingOrder) {
      return { success: false, detail: `Already have order for ${listing.itemName}`, endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    // Fresh gold check from DB
    const freshChar = await prisma.character.findUnique({
      where: { id: bot.characterId },
      select: { gold: true, escrowedGold: true },
    });
    if (!freshChar) {
      return { success: false, detail: 'Character not found', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }
    const availableGold = freshChar.gold - freshChar.escrowedGold;
    if (availableGold < bidPrice) {
      return { success: false, detail: `Can't afford ${listing.itemName}: need ${bidPrice}g, have ${availableGold}g`, endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    const cycle = await getOrCreateOpenCycle(listing.townId);
    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: bot.characterId },
        data: { escrowedGold: { increment: bidPrice } },
      });
      return tx.marketBuyOrder.create({
        data: {
          buyerId: bot.characterId,
          listingId: listing.id,
          bidPrice,
          status: 'pending',
          auctionCycleId: cycle.id,
        },
      });
    });
    bot.gold = freshChar.gold;

    return {
      success: true,
      detail: `Ordered ${listing.itemName} from market at ${bidPrice}g (will equip next tick)`,
      endpoint: '/market/buy (tool)',
      httpStatus: 201,
      requestBody: { listingId: listing.id, bidPrice },
      responseBody: {},
    };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 20. checkActiveQuest — get the bot's active quest info
// ---------------------------------------------------------------------------

export async function checkActiveQuest(bot: BotState): Promise<{ questId: string; objectives: any[]; progress: Record<string, number>; type: string } | null> {
  try {
    const res = await get('/quests/active', bot.token);
    if (res.status < 200 || res.status >= 300) return null;
    const quests: any[] = res.data?.quests || res.data || [];
    if (quests.length === 0) return null;
    const q = quests[0];
    return {
      questId: q.questId || q.id,
      objectives: q.objectives || [],
      progress: q.progress || {},
      type: q.type || 'TUTORIAL',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 21. completeQuest — turn in a completed quest
// ---------------------------------------------------------------------------

export async function completeQuest(bot: BotState, questId: string): Promise<ActionResult> {
  const endpoint = '/quests/complete';
  try {
    const res = await post(endpoint, bot.token, { questId });
    if (res.status >= 200 && res.status < 300) {
      return { success: true, detail: `Completed quest ${questId}`, endpoint, httpStatus: res.status, requestBody: { questId }, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { questId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 22. createParty
// ---------------------------------------------------------------------------

export async function createParty(bot: BotState): Promise<ActionResult> {
  const endpoint = '/parties/create';
  try {
    const res = await post(endpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      const partyId = res.data?.party?.id || res.data?.partyId || res.data?.id;
      if (partyId) {
        bot.partyId = partyId;
        bot.partyRole = 'leader';
        bot.partyTicksRemaining = 3 + Math.floor(Math.random() * 3); // 3-5 ticks
      }
      return { success: true, detail: `Created party${partyId ? ` (${partyId})` : ''}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 23. inviteToParty
// ---------------------------------------------------------------------------

export async function inviteToParty(bot: BotState, targetBot: BotState): Promise<ActionResult> {
  const endpoint = `/parties/${bot.partyId}/invite`;
  try {
    const res = await post(endpoint, bot.token, { characterId: targetBot.characterId });
    if (res.status >= 200 && res.status < 300) {
      return { success: true, detail: `Invited ${targetBot.characterName} to party`, endpoint, httpStatus: res.status, requestBody: { characterId: targetBot.characterId }, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { characterId: targetBot.characterId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 24. acceptPartyInvite
// ---------------------------------------------------------------------------

export async function acceptPartyInvite(bot: BotState): Promise<ActionResult> {
  const checkEndpoint = '/parties/me';
  const endpoint = '/parties/accept';
  try {
    const meRes = await get(checkEndpoint, bot.token);
    if (meRes.status < 200 || meRes.status >= 300) {
      return { success: false, detail: 'Failed to check party status', endpoint: checkEndpoint, httpStatus: meRes.status, requestBody: {}, responseBody: meRes.data };
    }

    const invitations: any[] = meRes.data?.pendingInvitations || meRes.data?.invitations || [];
    if (invitations.length === 0) {
      return { success: false, detail: 'No pending party invitations', endpoint: checkEndpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No pending party invitations' } };
    }

    const invite = invitations[0];
    const partyId = invite.party?.id || invite.partyId || invite.id;
    const acceptEndpoint = `/parties/${partyId}/accept`;
    const res = await post(acceptEndpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      bot.partyId = partyId;
      bot.partyRole = 'member';
      return { success: true, detail: `Joined party ${partyId}`, endpoint: acceptEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: acceptEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 25. disbandParty
// ---------------------------------------------------------------------------

export async function disbandParty(bot: BotState): Promise<ActionResult> {
  const endpoint = `/parties/${bot.partyId}/disband`;
  try {
    const res = await post(endpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      bot.partyId = null;
      bot.partyRole = null;
      bot.partyTicksRemaining = 0;
      return { success: true, detail: 'Disbanded party', endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 26. leaveParty
// ---------------------------------------------------------------------------

export async function leaveParty(bot: BotState): Promise<ActionResult> {
  const endpoint = `/parties/${bot.partyId}/leave`;
  try {
    const res = await post(endpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      bot.partyId = null;
      bot.partyRole = null;
      bot.partyTicksRemaining = 0;
      return { success: true, detail: 'Left party', endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 27. partyTravel
// ---------------------------------------------------------------------------

export async function partyTravel(bot: BotState): Promise<ActionResult> {
  const endpoint = '/travel/start';
  try {
    // Fetch available routes from the bot's current town
    const routesRes = await get('/travel/routes', bot.token);
    if (routesRes.status < 200 || routesRes.status >= 300) {
      return {
        success: false,
        detail: routesRes.data?.error || `Failed to fetch travel routes: HTTP ${routesRes.status}`,
        endpoint,
        httpStatus: routesRes.status,
        requestBody: {},
        responseBody: routesRes.data,
      };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return {
        success: false,
        detail: 'No travel routes available from current town',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No travel routes available from current town' },
      };
    }

    // Pick a random route
    const route = pickRandom(routes)!;
    const routeId = route.id || route.routeId;
    const destName = route.destination?.name || route.name || routeId;

    // The /travel/start endpoint detects party leaders and initiates group travel
    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingTravel = true;
      return {
        success: true,
        detail: `Party traveling to ${destName}`,
        endpoint,
        httpStatus: res.status,
        requestBody: { routeId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { routeId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 28. doFreeMarketActions — FREE market actions (don't consume action slots)
// ---------------------------------------------------------------------------

export async function doFreeMarketActions(bot: BotState): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  // 1. List surplus items (keep items needed for THIS BOT's crafting, sell the rest)
  let keepItems = new Set<string>();
  try {
    // Build set of item names the bot needs for its OWN professions' recipes
    try {
      const recipesRes = await get('/crafting/recipes', bot.token);
      if (recipesRes.status >= 200 && recipesRes.status < 300) {
        const recipes: any[] = recipesRes.data?.recipes || recipesRes.data || [];
        const botProfsUpper = new Set(bot.professions.map(p => p.toUpperCase()));
        // Only keep ingredients for recipes this bot can actually craft
        for (const r of recipes) {
          const rProf = (r.professionType || r.professionRequired || '').toUpperCase();
          if (!botProfsUpper.has(rProf)) continue; // Skip recipes for other professions
          for (const inp of (r.ingredients || r.inputs || [])) {
            keepItems.add(inp.itemName || inp.name || '');
          }
        }
      }
    } catch { /* ignore */ }

    const listResults = await listSurplusOnMarket(bot, keepItems);
    for (const lr of listResults) {
      if (lr.success) results.push(lr);
    }
  } catch { /* ignore market errors */ }

  // 1b. List items from house storage (harvested crops, collected rancher products)
  try {
    const storageResults = await listStorageOnMarket(bot, keepItems);
    for (const sr of storageResults) {
      if (sr.success) results.push(sr);
    }
  } catch { /* ignore storage listing errors */ }

  // 2. Buy items needed for crafting (if bot has crafting profession)
  const hasCrafting = bot.professions.some(p => {
    const upper = p.toUpperCase();
    return ['SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER', 'LEATHERWORKER',
      'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER', 'JEWELER', 'FLETCHER',
      'MASON', 'SCRIBE'].includes(upper);
  });

  if (hasCrafting && bot.gold >= 10) {
    try {
      // Get recipes and inventory to find missing ingredients
      const recipesRes = await get('/crafting/recipes', bot.token);
      const invRes = await get('/characters/me/inventory', bot.token);
      if (recipesRes.status >= 200 && recipesRes.status < 300 &&
          invRes.status >= 200 && invRes.status < 300) {
        const allRecipes: any[] = recipesRes.data?.recipes || recipesRes.data || [];
        const items: any[] = invRes.data?.items || invRes.data || [];
        // Filter to only recipes for this bot's professions
        const botProfs = new Set(bot.professions.map(p => p.toUpperCase()));
        const recipes = allRecipes.filter((r: any) => botProfs.has((r.professionType || '').toUpperCase()));
        // Build inventory map
        const invMap = new Map<string, number>();
        for (const item of items) {
          const name = item.templateName || item.name || 'Unknown';
          invMap.set(name, (invMap.get(name) || 0) + (item.quantity || 1));
        }
        // Find missing ingredients from non-craftable recipes for bot's professions
        // Prioritize raw materials (gatherable) over crafted intermediates
        const RAW_MATERIALS = new Set([
          'Grain', 'Apples', 'Wild Berries', 'Wild Herbs', 'Vegetables', 'Raw Fish',
          'Wood Logs', 'Iron Ore Chunks', 'Stone Blocks', 'Clay', 'Salt', 'Spices',
          'Wild Game Meat', 'Common Herbs', 'Mushrooms', 'Common Fish',
        ]);
        const notCraftable = recipes.filter((r: any) => !r.canCraft);
        const rawMissing: string[] = [];
        const craftedMissing: string[] = [];
        for (const r of notCraftable) {
          const ingredients = r.missingIngredients || r.ingredients || r.inputs || [];
          for (const inp of ingredients) {
            const name = inp.itemName || inp.name || '';
            if (!name || rawMissing.includes(name) || craftedMissing.includes(name)) continue;
            if (RAW_MATERIALS.has(name)) {
              rawMissing.push(name);
            } else {
              craftedMissing.push(name);
            }
          }
        }
        const missing = [...rawMissing, ...craftedMissing];
        // Try to buy missing ingredients — iterate until one succeeds or all fail
        if (missing.length > 0) {
          let bought = false;
          const failReasons: string[] = [];
          for (const itemName of missing) {
            const buyResult = await buySpecificItem(bot, itemName);
            if (buyResult.success) {
              results.push(buyResult);
              bought = true;
              break; // max 1 buy per bot per tick
            }
            failReasons.push(`${itemName}: ${buyResult.detail}`);
          }
          if (!bought) {
            // Show first 3 failure reasons for diagnostics
            const reasonStr = failReasons.slice(0, 3).join(' | ');
            results.push({ success: false, detail: `[MarketBuy] ${bot.characterName}: tried ${missing.length} items — ${reasonStr}`, endpoint: '/market/buy (direct DB)' });
          }
        } else {
          results.push({ success: false, detail: `[MarketBuy] ${bot.characterName} (${[...botProfs].join('+')}): ${recipes.length} recipes, ${notCraftable.length} not craftable, 0 missing`, endpoint: '/market/buy (direct DB)' });
        }
      } else {
        results.push({ success: false, detail: `[MarketBuy] ${bot.characterName}: recipe HTTP ${recipesRes.status}, inv HTTP ${invRes.status}`, endpoint: '/market/buy (direct DB)' });
      }
    } catch (err: any) {
      results.push({ success: false, detail: `[MarketBuy] ${bot.characterName}: ERROR ${err.message}`, endpoint: '/market/buy (direct DB)' });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 29. buyAsset — purchase a private asset (free action)
// ---------------------------------------------------------------------------

export async function buyAsset(bot: BotState): Promise<ActionResult> {
  const endpoint = '/assets/buy';
  try {
    // Pre-flight: fetch available asset types
    const availRes = await get('/assets/available', bot.token);
    if (availRes.status < 200 || availRes.status >= 300) {
      return {
        success: false,
        detail: availRes.data?.error || `Failed to fetch available assets: HTTP ${availRes.status}`,
        endpoint,
        httpStatus: availRes.status,
        requestBody: {},
        responseBody: availRes.data,
      };
    }

    const professions: any[] = availRes.data?.professions || [];
    // Find the first purchasable slot: prefer T1, then T2, then T3
    let bestAssetTypeId: string | null = null;
    let bestTier = 0;
    let bestCost = Infinity;
    let bestName = '';

    for (const prof of professions) {
      const assetTypes: any[] = prof.assetTypes || [];
      for (const at of assetTypes) {
        const tiers: any[] = at.tiers || [];
        // Sort by tier ascending to prefer cheapest
        const sorted = [...tiers].sort((a: any, b: any) => a.tier - b.tier);
        for (const t of sorted) {
          if (t.locked) continue;
          if (t.owned >= t.maxSlots) continue;
          const cost = t.nextSlotCost || 0;
          if (cost <= 0) continue;
          if (cost > bot.gold) continue; // buy if affordable
          if (cost < bestCost) {
            bestAssetTypeId = at.id;
            bestTier = t.tier;
            bestCost = cost;
            bestName = at.name || at.spotType || 'asset';
          }
        }
      }
    }

    if (!bestAssetTypeId) {
      // Build a detailed rejection reason for debugging
      const reasons: string[] = [];
      for (const prof of professions) {
        const assetTypes: any[] = prof.assetTypes || [];
        if (assetTypes.length === 0) {
          reasons.push(`${prof.professionType}: no asset types defined`);
          continue;
        }
        for (const at of assetTypes) {
          const tiers: any[] = at.tiers || [];
          for (const t of tiers) {
            if (t.locked) {
              reasons.push(`${at.name} T${t.tier}: locked (need prof L${t.levelRequired}, have L${prof.level || '?'})`);
            } else if (t.owned >= t.maxSlots) {
              reasons.push(`${at.name} T${t.tier}: max slots (${t.owned}/${t.maxSlots})`);
            } else if ((t.nextSlotCost || 0) > bot.gold) {
              reasons.push(`${at.name} T${t.tier}: too expensive (${t.nextSlotCost}g, have ${bot.gold}g)`);
            }
          }
        }
      }
      const reasonStr = reasons.length > 0 ? reasons.slice(0, 3).join('; ') : 'no professions with asset types';
      return {
        success: false,
        detail: `No purchasable asset slots: ${reasonStr}`,
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: `No purchasable asset slots: ${reasonStr}` },
      };
    }

    const body = { assetTypeId: bestAssetTypeId, tier: bestTier };
    const res = await post(endpoint, bot.token, body);
    if (res.status >= 200 && res.status < 300) {
      const purchasePrice = res.data?.asset?.purchasePrice || bestCost;
      bot.gold -= purchasePrice;
      return {
        success: true,
        detail: `Bought T${bestTier} ${bestName} for ${purchasePrice}g`,
        endpoint,
        httpStatus: res.status,
        requestBody: body,
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: body, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 30. plantAsset — plant crops on an empty owned asset (free action)
// ---------------------------------------------------------------------------

export async function plantAsset(bot: BotState): Promise<ActionResult> {
  const endpoint = '/assets/plant';
  try {
    // Pre-flight: fetch owned assets
    const mineRes = await get('/assets/mine', bot.token);
    if (mineRes.status < 200 || mineRes.status >= 300) {
      return {
        success: false,
        detail: mineRes.data?.error || `Failed to fetch owned assets: HTTP ${mineRes.status}`,
        endpoint,
        httpStatus: mineRes.status,
        requestBody: {},
        responseBody: mineRes.data,
      };
    }

    const assets: any[] = mineRes.data?.assets || [];
    // Filter: assets in bot's current town with cropState === 'EMPTY'
    const emptyAssets = assets.filter(
      (a: any) => a.townId === bot.currentTownId && a.cropState === 'EMPTY',
    );

    if (emptyAssets.length === 0) {
      return {
        success: false,
        detail: 'No empty assets to plant in current town',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No empty assets to plant in current town' },
      };
    }

    const asset = emptyAssets[0];
    const plantEndpoint = `/assets/${asset.id}/plant`;
    const res = await post(plantEndpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Planted crops in ${asset.name || 'asset'}`,
        endpoint: plantEndpoint,
        httpStatus: res.status,
        requestBody: {},
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: plantEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 31. harvestAsset — harvest a READY owned asset (daily action)
// ---------------------------------------------------------------------------

export async function harvestAsset(bot: BotState, excludeProfession?: string): Promise<ActionResult> {
  const endpoint = '/assets/harvest';
  try {
    // Pre-flight: fetch owned assets
    const mineRes = await get('/assets/mine', bot.token);
    if (mineRes.status < 200 || mineRes.status >= 300) {
      return {
        success: false,
        detail: mineRes.data?.error || `Failed to fetch owned assets: HTTP ${mineRes.status}`,
        endpoint,
        httpStatus: mineRes.status,
        requestBody: {},
        responseBody: mineRes.data,
      };
    }

    const assets: any[] = mineRes.data?.assets || [];
    // Filter: assets in bot's current town with cropState === 'READY'
    // Exclude RANCHER buildings (they produce automatically via livestock tick)
    const readyAssets = assets.filter(
      (a: any) => a.townId === bot.currentTownId && a.cropState === 'READY'
        && a.professionType !== 'RANCHER'
        && (!excludeProfession || a.professionType !== excludeProfession),
    );

    if (readyAssets.length === 0) {
      return {
        success: false,
        detail: 'No READY assets to harvest in current town',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No READY assets to harvest in current town' },
      };
    }

    const asset = readyAssets[0];
    const harvestEndpoint = `/assets/${asset.id}/harvest`;
    const res = await post(harvestEndpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Harvesting ${asset.name || 'asset'}`,
        endpoint: harvestEndpoint,
        httpStatus: res.status,
        requestBody: {},
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: harvestEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 31b. buyLivestock — purchase an animal for a RANCHER building (free action)
// ---------------------------------------------------------------------------

export async function buyLivestock(bot: BotState): Promise<ActionResult> {
  const endpoint = '/rancher/buy-livestock';
  try {
    // Pre-flight: fetch RANCHER buildings with capacity info
    const bldgRes = await get('/rancher/buildings', bot.token);
    if (bldgRes.status < 200 || bldgRes.status >= 300) {
      return {
        success: false,
        detail: bldgRes.data?.error || `Failed to fetch rancher buildings: HTTP ${bldgRes.status}`,
        endpoint,
        httpStatus: bldgRes.status,
        requestBody: {},
        responseBody: bldgRes.data,
      };
    }

    const buildings: any[] = bldgRes.data?.buildings || [];
    // Filter: buildings in bot's current town with available capacity
    const available = buildings.filter(
      (b: any) => b.town?.id === bot.currentTownId && b.aliveCount < b.capacity,
    );

    if (available.length === 0) {
      return {
        success: false,
        detail: 'No RANCHER buildings with capacity in current town',
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: 'No RANCHER buildings with capacity in current town' },
      };
    }

    // Pick the building with the most remaining capacity
    available.sort((a: any, b: any) => (b.capacity - b.aliveCount) - (a.capacity - a.aliveCount));
    const building = available[0];

    // Determine correct animal type from building spotType
    const allowedAnimals = BUILDING_ANIMAL_MAP[building.spotType];
    if (!allowedAnimals || allowedAnimals.length === 0) {
      return {
        success: false,
        detail: `No animal types for building type ${building.spotType}`,
        endpoint,
        httpStatus: 0,
        requestBody: {},
        responseBody: { error: `No animal types for ${building.spotType}` },
      };
    }
    const animalType = allowedAnimals[0];

    const body = { buildingId: building.id, animalType };
    const res = await post(endpoint, bot.token, body);
    if (res.status >= 200 && res.status < 300) {
      const price = res.data?.goldRemaining != null
        ? bot.gold - res.data.goldRemaining
        : 0;
      if (price > 0) bot.gold -= price;
      return {
        success: true,
        detail: `Bought ${animalType} for ${building.name}`,
        endpoint,
        httpStatus: res.status,
        requestBody: body,
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: body, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 32. acceptJob — accept a job on the jobs board (daily action, one-shot)
// Uses new /jobs/town/:townId browse + /jobs/:id/accept endpoints
// ---------------------------------------------------------------------------

export async function acceptJob(bot: BotState): Promise<ActionResult> {
  const browseEndpoint = `/jobs/town/${bot.currentTownId}`;
  try {
    const jobsRes = await get(browseEndpoint, bot.token);
    if (jobsRes.status < 200 || jobsRes.status >= 300) {
      return { success: false, detail: jobsRes.data?.error || `Failed to fetch jobs: HTTP ${jobsRes.status}`, endpoint: browseEndpoint, httpStatus: jobsRes.status, requestBody: {}, responseBody: jobsRes.data };
    }

    const jobs: any[] = jobsRes.data?.jobs || [];
    // Filter: paid jobs, exclude own jobs
    const paidJobs = jobs.filter((j: any) => (j.pay || 0) > 0 && j.ownerId !== bot.characterId);

    if (paidJobs.length === 0) {
      return { success: false, detail: 'No paid job listings available', endpoint: browseEndpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No paid jobs' } };
    }

    // Pick the highest-paying job
    paidJobs.sort((a: any, b: any) => (b.pay || 0) - (a.pay || 0));
    const job = paidJobs[0];
    const acceptEndpoint = `/jobs/${job.id}/accept`;
    const res = await post(acceptEndpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      const reward = res.data?.reward;
      let detail = `Accepted job: ${job.jobLabel || job.jobType} at ${job.assetName || 'asset'}`;
      if (reward) {
        detail += ` — earned ${reward.gold}g`;
        if (reward.items) detail += ` + ${reward.items.quantity}x ${reward.items.name}`;
        if (reward.xp > 0) detail += ` + ${reward.xp} XP`;
        if (!reward.professionMatch) detail += ' (non-matching, 50%)';
      }
      return { success: true, detail, endpoint: acceptEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: acceptEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint: browseEndpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 32b. postJob — post a job for a ready asset (free action, works remotely)
// ---------------------------------------------------------------------------

const RANCHER_SPOT_TO_JOB: Record<string, string> = {
  chicken_coop: 'gather_eggs',
  dairy_barn: 'milk_cows',
  sheep_pen: 'shear_sheep',
};

export async function postJob(bot: BotState): Promise<ActionResult> {
  const endpoint = '/jobs/post';
  try {
    const mineRes = await get('/assets/mine', bot.token);
    if (mineRes.status < 200 || mineRes.status >= 300) {
      return { success: false, detail: 'Failed to fetch assets', endpoint, httpStatus: mineRes.status, requestBody: {}, responseBody: mineRes.data };
    }

    const assets: any[] = mineRes.data?.assets || [];

    for (const asset of assets) {
      // Skip if already has an open job
      const openJobs = asset.jobListings || [];
      if (openJobs.length > 0) continue;

      let jobType: string | null = null;

      if (asset.professionType === 'RANCHER') {
        if ((asset.pendingYield || 0) > 0) {
          jobType = RANCHER_SPOT_TO_JOB[asset.spotType] || null;
        }
      } else {
        if (asset.cropState === 'READY') jobType = 'harvest_field';
        else if (asset.cropState === 'EMPTY') jobType = 'plant_field';
      }

      if (!jobType) continue;

      // Pay: ~20% of expected yield value, scaled by tier
      const pay = Math.max(1, Math.floor(5 * (asset.tier || 1)));
      if (bot.gold < pay) continue;

      const body = { assetId: asset.id, jobType, pay };
      const res = await post(endpoint, bot.token, body);
      if (res.status >= 200 && res.status < 300) {
        return {
          success: true,
          detail: `Posted ${jobType} job for ${asset.name || 'asset'} at ${pay}g`,
          endpoint,
          httpStatus: res.status,
          requestBody: body,
          responseBody: res.data,
        };
      }
    }

    return { success: false, detail: 'No assets eligible for job posting', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 32c. collectRancherProducts — collect from RANCHER buildings (daily action)
// ---------------------------------------------------------------------------

export async function collectRancherProducts(bot: BotState): Promise<ActionResult> {
  const endpoint = '/assets/collect';
  try {
    const mineRes = await get('/assets/mine', bot.token);
    if (mineRes.status < 200 || mineRes.status >= 300) {
      return { success: false, detail: 'Failed to fetch assets', endpoint, httpStatus: mineRes.status, requestBody: {}, responseBody: mineRes.data };
    }

    const assets: any[] = mineRes.data?.assets || [];
    const collectible = assets.filter(
      (a: any) => a.townId === bot.currentTownId && a.professionType === 'RANCHER' && (a.pendingYield || 0) > 0,
    );

    if (collectible.length === 0) {
      return { success: false, detail: 'No RANCHER products to collect', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    // Pick building with most pending yield
    collectible.sort((a: any, b: any) => (b.pendingYield || 0) - (a.pendingYield || 0));
    const building = collectible[0];

    const collectEndpoint = `/assets/${building.id}/collect`;
    const res = await post(collectEndpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Collected ${building.pendingYield} products from ${building.name || 'building'}`,
        endpoint: collectEndpoint,
        httpStatus: res.status,
        requestBody: {},
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: collectEndpoint, httpStatus: res.status, requestBody: {}, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 33. getInventory — Fetch bot inventory with quantities
// ---------------------------------------------------------------------------

export async function getInventory(bot: BotState): Promise<{ name: string; quantity: number; id: string; type?: string }[]> {
  try {
    const res = await get('/characters/me/inventory', bot.token);
    if (res.status < 200 || res.status >= 300) return [];
    const items: any[] = res.data?.items || res.data || [];
    // Group by template name, sum quantities
    const grouped = new Map<string, { name: string; quantity: number; id: string; type?: string }>();
    for (const item of items) {
      const name = item.templateName || item.name || 'Unknown';
      const existing = grouped.get(name);
      if (existing) {
        existing.quantity += (item.quantity || 1);
      } else {
        grouped.set(name, {
          name,
          quantity: item.quantity || 1,
          id: item.id || item.itemId,
          type: item.type || item.itemType,
        });
      }
    }
    return Array.from(grouped.values());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 34. getCraftableRecipes — Get all recipes with canCraft status and ingredient details
// ---------------------------------------------------------------------------

export async function getCraftableRecipes(bot: BotState): Promise<{
  id: string;
  name: string;
  canCraft: boolean;
  tier: number;
  professionRequired: string;
  levelRequired: number;
  inputs: { itemName: string; quantity: number }[];
}[]> {
  try {
    const res = await get('/crafting/recipes', bot.token);
    if (res.status < 200 || res.status >= 300) return [];
    const recipes: any[] = res.data?.recipes || res.data || [];
    return recipes.map((r: any) => ({
      id: r.id || r.recipeId,
      name: r.name || 'Unknown Recipe',
      canCraft: r.canCraft === true,
      tier: r.tier || 1,
      professionRequired: r.professionType || r.professionRequired || '',
      levelRequired: r.levelRequired || 1,
      inputs: (r.ingredients || r.inputs || []).map((inp: any) => ({
        itemName: inp.itemName || inp.name || '',
        quantity: inp.quantity || inp.needed || 1,
      })),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 35. craftSpecificRecipe — Craft a specific recipe by ID
// ---------------------------------------------------------------------------

export async function craftSpecificRecipe(bot: BotState, recipeId: string, recipeName: string): Promise<ActionResult> {
  const endpoint = '/actions/lock-in';
  try {
    const body = { actionType: 'CRAFT', actionTarget: { recipeId } };
    const res = await post(endpoint, bot.token, body);
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Locked in crafting ${recipeName}`,
        endpoint,
        httpStatus: res.status,
        requestBody: body,
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: body, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 36. travelToResourceTown — Travel to a town that has a specific resource type
// ---------------------------------------------------------------------------

/**
 * Build a reverse map: resourceType -> list of town names that have that resource.
 * Cached after first call.
 */
let _resourceTownMap: Map<string, string[]> | null = null;
function getResourceTownMap(): Map<string, string[]> {
  if (_resourceTownMap) return _resourceTownMap;
  _resourceTownMap = new Map();
  for (const [townName, spot] of Object.entries(TOWN_GATHERING_SPOTS)) {
    const rt = spot.resourceType;
    if (!_resourceTownMap.has(rt)) _resourceTownMap.set(rt, []);
    _resourceTownMap.get(rt)!.push(townName);
  }
  return _resourceTownMap;
}

/**
 * Travel to a town that has one of the target resource types.
 * Checks available routes, picks one whose destination matches.
 * If no direct route matches, picks a random route (exploration).
 */
export async function travelToResourceTown(
  bot: BotState,
  targetResourceTypes: string[],
  reason: string,
): Promise<ActionResult> {
  const endpoint = '/travel/start';
  try {
    const routesRes = await get('/travel/routes', bot.token);
    if (routesRes.status < 200 || routesRes.status >= 300) {
      return { success: false, detail: routesRes.data?.error || `Failed to fetch routes: HTTP ${routesRes.status}`, endpoint, httpStatus: routesRes.status, requestBody: {}, responseBody: routesRes.data };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return { success: false, detail: 'No travel routes available', endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No routes' } };
    }

    // Build set of target town names
    const rtMap = getResourceTownMap();
    const targetTowns = new Set<string>();
    for (const rt of targetResourceTypes) {
      for (const tn of (rtMap.get(rt) || [])) {
        targetTowns.add(tn.toLowerCase());
      }
    }

    // Check routes for matching destinations
    let bestRoute: any = null;
    for (const route of routes) {
      const destName = (route.destination?.name || route.name || '').toLowerCase();
      if (targetTowns.has(destName)) {
        bestRoute = route;
        break;
      }
    }

    // Fallback: random route (exploration)
    if (!bestRoute) {
      bestRoute = routes[Math.floor(Math.random() * routes.length)];
    }

    const routeId = bestRoute.id || bestRoute.routeId;
    const destName = bestRoute.destination?.name || bestRoute.name || routeId;

    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingTravel = true;
      return {
        success: true,
        detail: `Traveling to ${destName} (${reason})`,
        endpoint,
        httpStatus: res.status,
        requestBody: { routeId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { routeId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 37. travelHome — Travel back to home town
// ---------------------------------------------------------------------------

export async function travelHome(bot: BotState, reason: string): Promise<ActionResult> {
  const endpoint = '/travel/start';
  try {
    const routesRes = await get('/travel/routes', bot.token);
    if (routesRes.status < 200 || routesRes.status >= 300) {
      return { success: false, detail: routesRes.data?.error || `Failed to fetch routes`, endpoint, httpStatus: routesRes.status, requestBody: {}, responseBody: routesRes.data };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return { success: false, detail: 'No travel routes available', endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No routes' } };
    }

    // Find route toward home town (may not be direct)
    let bestRoute: any = null;
    for (const route of routes) {
      const destId = route.destination?.id || route.destinationTownId || '';
      if (destId === bot.homeTownId) {
        bestRoute = route;
        break;
      }
    }

    // Fallback: pick a random route (eventually we'll get home)
    if (!bestRoute) {
      bestRoute = routes[Math.floor(Math.random() * routes.length)];
    }

    const routeId = bestRoute.id || bestRoute.routeId;
    const destName = bestRoute.destination?.name || bestRoute.name || routeId;

    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingTravel = true;
      return {
        success: true,
        detail: `Traveling to ${destName} (${reason})`,
        endpoint,
        httpStatus: res.status,
        requestBody: { routeId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { routeId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 37b. travelForCombatDrops — Travel through dangerous routes for monster loot
// ---------------------------------------------------------------------------

/** Terrain keywords that map to each biome type (mirrors road-encounter.ts TERRAIN_TO_BIOME) */
const BIOME_TERRAIN_KEYWORDS: Record<string, string[]> = {
  SWAMP: ['swamp', 'marsh', 'bog', 'mist', 'blighted', 'cursed'],
  VOLCANIC: ['volcanic', 'ember', 'lava', 'scorched'],
  UNDERGROUND: ['underdark', 'subterranean', 'underground'],
  FOREST: ['forest', 'wood', 'grove', 'glade', 'silverwood'],
  FEYWILD: ['fey', 'feywild', 'glimmer', 'moonpetal'],
  MOUNTAIN: ['mountain', 'peak', 'mine', 'cavern', 'tunnel'],
  BADLANDS: ['badland', 'waste', 'war', 'lawless', 'frontier', 'hostile'],
};

function routeMatchesBiomes(terrain: string, targetBiomes: string[]): boolean {
  const t = terrain.toLowerCase();
  for (const biome of targetBiomes) {
    const keywords = BIOME_TERRAIN_KEYWORDS[biome];
    if (keywords && keywords.some(kw => t.includes(kw))) return true;
  }
  return false;
}

export async function travelForCombatDrops(
  bot: BotState,
  targetBiomes: string[],
  reason: string,
): Promise<ActionResult> {
  const endpoint = '/travel/start';
  try {
    const routesRes = await get('/travel/routes', bot.token);
    if (routesRes.status < 200 || routesRes.status >= 300) {
      return { success: false, detail: routesRes.data?.error || `Failed to fetch routes`, endpoint, httpStatus: routesRes.status, requestBody: {}, responseBody: routesRes.data };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return { success: false, detail: 'No travel routes available', endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: 'No routes' } };
    }

    // Score each route: biome match (10pts) + danger level (1-7pts)
    let bestRoute: any = null;
    let bestScore = -1;
    for (const route of routes) {
      const terrain: string = route.terrain || '';
      const danger: number = route.dangerLevel || 1;
      let score = danger; // base: prefer dangerous routes
      if (routeMatchesBiomes(terrain, targetBiomes)) {
        score += 10; // strong preference for biome match
      }
      if (score > bestScore) {
        bestScore = score;
        bestRoute = route;
      }
    }

    if (!bestRoute) {
      bestRoute = routes[Math.floor(Math.random() * routes.length)];
    }

    const routeId = bestRoute.id || bestRoute.routeId;
    const destName = bestRoute.destination?.name || bestRoute.name || routeId;
    const terrain = bestRoute.terrain || 'unknown';

    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingTravel = true;
      return {
        success: true,
        detail: `Combat travel to ${destName} via ${terrain} terrain (${reason})`,
        endpoint,
        httpStatus: res.status,
        requestBody: { routeId },
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint, httpStatus: res.status, requestBody: { routeId }, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 38. buySpecificItem — Buy a specific item from market by name
// ---------------------------------------------------------------------------

export async function buySpecificItem(bot: BotState, itemName: string, maxPrice?: number): Promise<ActionResult> {
  const endpoint = '/market/buy (direct DB)';
  try {
    // Global market search — find active listings across ALL towns
    const max = maxPrice ?? bot.gold * 0.5;
    const listings = await prisma.marketListing.findMany({
      where: {
        status: 'active',
        itemName: { equals: itemName, mode: 'insensitive' },
        price: { gt: 0, lte: Math.floor(max) },
        sellerId: { not: bot.characterId }, // Don't buy own listings
      },
      orderBy: { price: 'asc' },
      take: 5,
      select: {
        id: true,
        price: true,
        itemName: true,
        quantity: true,
        townId: true,
        sellerId: true,
        seller: { select: { name: true } },
      },
    });

    if (listings.length === 0) {
      return { success: false, detail: `No ${itemName} on market (max ${Math.floor(max)}g)`, endpoint, httpStatus: 0, requestBody: { itemName, max }, responseBody: {} };
    }

    const listing = listings[0];
    const bidPrice = Math.ceil(listing.price * 1.1); // 10% above asking

    // Check for duplicate order on this listing
    const existingOrder = await prisma.marketBuyOrder.findUnique({
      where: { buyerId_listingId: { buyerId: bot.characterId, listingId: listing.id } },
    });
    if (existingOrder) {
      return { success: false, detail: `Already have order on ${itemName} listing`, endpoint, httpStatus: 0, requestBody: { listingId: listing.id }, responseBody: {} };
    }

    // Fresh gold check from DB
    const freshChar = await prisma.character.findUnique({
      where: { id: bot.characterId },
      select: { gold: true, escrowedGold: true },
    });
    if (!freshChar) {
      return { success: false, detail: 'Character not found in DB', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }
    const availableGold = freshChar.gold - freshChar.escrowedGold;
    if (availableGold < bidPrice) {
      return { success: false, detail: `Can't afford ${itemName}: need ${bidPrice}g, have ${availableGold}g available`, endpoint, httpStatus: 0, requestBody: { bidPrice, availableGold }, responseBody: {} };
    }

    // Get or create auction cycle for the listing's town
    const cycle = await getOrCreateOpenCycle(listing.townId);

    // Create buy order + escrow in transaction
    const order = await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: bot.characterId },
        data: { escrowedGold: { increment: bidPrice } },
      });
      return tx.marketBuyOrder.create({
        data: {
          buyerId: bot.characterId,
          listingId: listing.id,
          bidPrice,
          status: 'pending',
          auctionCycleId: cycle.id,
        },
      });
    });

    // Update local bot state
    bot.gold = freshChar.gold; // Sync to DB value (gold not deducted yet, just escrowed)

    return {
      success: true,
      detail: `Placed buy order for ${listing.quantity}x ${listing.itemName} at ${bidPrice}g (asking ${listing.price}g) from ${listing.seller.name}`,
      endpoint,
      httpStatus: 201,
      requestBody: { listingId: listing.id, bidPrice, townId: listing.townId },
      responseBody: { orderId: order.id, cycleId: cycle.id },
    };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 39. listSurplusOnMarket — Smart market listing that keeps items needed for crafting
// ---------------------------------------------------------------------------

export async function listSurplusOnMarket(bot: BotState, keepItemNames?: Set<string>): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  const endpoint = '/market/list';
  try {
    const invRes = await get('/characters/me/inventory', bot.token);
    if (invRes.status < 200 || invRes.status >= 300) return results;

    const items: any[] = invRes.data?.items || invRes.data || [];
    // Group by template name, sum quantities
    const grouped = new Map<string, { name: string; totalQty: number; items: any[] }>();
    for (const item of items) {
      if (item.equipped) continue;
      const name = item.templateName || item.name || '';
      // Keep items needed for crafting
      if (keepItemNames && keepItemNames.has(name)) continue;
      const existing = grouped.get(name);
      if (existing) {
        existing.totalQty += (item.quantity || 1);
        existing.items.push(item);
      } else {
        grouped.set(name, { name, totalQty: item.quantity || 1, items: [item] });
      }
    }

    // List surplus: items with quantity > 2, sell the excess (keep 2 for personal use)
    let listed = 0;
    for (const [, group] of grouped) {
      if (listed >= 3) break; // max 3 listings per tick
      if (group.totalQty <= 2) continue; // keep 2 for personal use

      const surplusCount = group.totalQty - 2;
      const item = group.items[0]; // pick first stack to get itemId/baseValue
      const itemId = item.id || item.itemId;
      const baseValue = item.baseValue || item.value || 10;
      const price = Math.max(5, Math.ceil(baseValue * 1.5));
      const listQty = Math.min(surplusCount, item.quantity || 1); // list what's in this stack

      try {
        const res = await post(endpoint, bot.token, { itemId, price, quantity: listQty });
        if (res.status >= 200 && res.status < 300) {
          results.push({
            success: true,
            detail: `Listed ${listQty}x ${group.name} at ${price}g each (surplus: had ${group.totalQty}, keeping 2)`,
            endpoint,
            httpStatus: res.status,
            requestBody: { itemId, price, quantity: listQty },
            responseBody: res.data,
          });
          listed++;
        }
      } catch { /* ignore individual listing failures */ }
    }
  } catch { /* ignore */ }
  return results;
}

// ---------------------------------------------------------------------------
// 40. listStorageOnMarket — List items from house storage onto market
// ---------------------------------------------------------------------------
// Items from FARMER harvest and RANCHER collection go to HouseStorage.
// This function bridges the gap by listing them directly from storage.

export async function listStorageOnMarket(bot: BotState, keepItemNames?: Set<string>): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  try {
    // 1. Find bot's house in current town
    const housesRes = await get('/houses/mine', bot.token);
    if (housesRes.status < 200 || housesRes.status >= 300) return results;

    const houses: any[] = housesRes.data?.houses || [];
    const localHouse = houses.find((h: any) => h.townId === bot.currentTownId);
    if (!localHouse || localHouse.storageUsed === 0) return results;

    // 2. Fetch storage contents
    const storageRes = await get(`/houses/${localHouse.id}/storage`, bot.token);
    if (storageRes.status < 200 || storageRes.status >= 300) return results;

    const storageItems: any[] = storageRes.data?.storage?.items || [];
    if (storageItems.length === 0) return results;

    // 3. List items from storage (keep 1 of each for personal use, sell rest)
    let listed = 0;
    for (const item of storageItems) {
      if (listed >= 5) break; // max 5 storage listings per tick
      if (keepItemNames && keepItemNames.has(item.itemName)) continue;
      if (item.quantity <= 1) continue; // keep 1

      const listQty = item.quantity - 1;
      // Determine price: use a reasonable markup
      const STORAGE_ITEM_PRICES: Record<string, number> = {
        // FARMER crops
        'Grain': 12, 'Vegetables': 10, 'Wild Berries': 8, 'Apples': 6, 'Cotton': 10,
        'Hops': 12, 'Grapes': 15,
        // RANCHER products
        'Eggs': 10, 'Milk': 15, 'Wool': 18, 'Fine Wool': 45, 'Silkworm Cocoons': 55,
        // MINER resources
        'Iron Ore Chunks': 8, 'Stone Blocks': 6, 'Clay': 5, 'Coal': 10, 'Silver Ore': 20,
        // Other gathering
        'Wood Logs': 6, 'Hardwood': 18, 'Wild Herbs': 8, 'Raw Fish': 6,
        'Wild Game Meat': 8, 'Animal Pelts': 12,
      };
      const price = STORAGE_ITEM_PRICES[item.itemName] || 10;

      try {
        const body = { itemTemplateId: item.itemTemplateId, quantity: listQty, price };
        const res = await post(`/houses/${localHouse.id}/storage/list`, bot.token, body);
        if (res.status >= 200 && res.status < 300) {
          results.push({
            success: true,
            detail: `[StorageList] Listed ${listQty}x ${item.itemName} from house storage at ${price}g each`,
            endpoint: `/houses/${localHouse.id}/storage/list`,
            httpStatus: res.status,
            requestBody: body,
            responseBody: res.data,
          });
          listed++;
        }
      } catch { /* ignore individual listing failures */ }
    }
  } catch { /* ignore */ }
  return results;
}

// ---------------------------------------------------------------------------
// 41. withdrawGrainForFeed — RANCHER bots pull Grain from house storage to inventory
// ---------------------------------------------------------------------------

export async function withdrawGrainForFeed(bot: BotState): Promise<ActionResult> {
  const endpoint = '/houses/storage/withdraw';
  try {
    // 1. Find bot's house in current town
    const housesRes = await get('/houses/mine', bot.token);
    if (housesRes.status < 200 || housesRes.status >= 300) {
      return { success: false, detail: 'No houses found', endpoint, httpStatus: housesRes.status, requestBody: {}, responseBody: housesRes.data };
    }

    const houses: any[] = housesRes.data?.houses || [];
    const localHouse = houses.find((h: any) => h.townId === bot.currentTownId);
    if (!localHouse || localHouse.storageUsed === 0) {
      return { success: false, detail: 'No house with storage in current town', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    // 2. Check storage for Grain
    const storageRes = await get(`/houses/${localHouse.id}/storage`, bot.token);
    if (storageRes.status < 200 || storageRes.status >= 300) {
      return { success: false, detail: 'Failed to read storage', endpoint, httpStatus: storageRes.status, requestBody: {}, responseBody: storageRes.data };
    }

    const storageItems: any[] = storageRes.data?.storage?.items || [];
    const grainEntry = storageItems.find((s: any) => s.itemName === 'Grain');
    if (!grainEntry || grainEntry.quantity <= 0) {
      return { success: false, detail: 'No Grain in house storage', endpoint, httpStatus: 0, requestBody: {}, responseBody: {} };
    }

    // 3. Withdraw up to 10 Grain
    const qty = Math.min(grainEntry.quantity, 10);
    const withdrawEndpoint = `/houses/${localHouse.id}/storage/withdraw`;
    const body = { itemTemplateId: grainEntry.itemTemplateId, quantity: qty };
    const res = await post(withdrawEndpoint, bot.token, body);
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Withdrew ${qty}x Grain from house storage for animal feed`,
        endpoint: withdrawEndpoint,
        httpStatus: res.status,
        requestBody: body,
        responseBody: res.data,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: withdrawEndpoint, httpStatus: res.status, requestBody: body, responseBody: res.data };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint, httpStatus: 0, requestBody: {}, responseBody: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// 19. triggerInvalidAction
// ---------------------------------------------------------------------------

export async function triggerInvalidAction(
  bot: BotState,
): Promise<ActionResult> {
  const endpoint = '/market/buy';
  try {
    const res = await post(endpoint, bot.token, {
      listingId: 'invalid-uuid-000',
      quantity: -1,
    });
    // This is intentionally invalid -- we always report it as a "success"
    // in triggering the error path
    return {
      success: false,
      detail: res.data?.error || `Error storm: HTTP ${res.status}`,
      endpoint,
      httpStatus: res.status,
      requestBody: { listingId: 'invalid-uuid-000', quantity: -1 },
      responseBody: res.data,
    };
  } catch (err: any) {
    return { success: false, detail: `Error storm: ${err.message}`, endpoint, httpStatus: 0, requestBody: { listingId: 'invalid-uuid-000', quantity: -1 }, responseBody: { error: err.message } };
  }
}
