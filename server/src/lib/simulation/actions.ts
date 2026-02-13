// ---------------------------------------------------------------------------
// Bot Simulation Actions
// ---------------------------------------------------------------------------
// Each function represents a game action a bot can take, calling real API
// endpoints via the internal HTTP dispatcher.
// ---------------------------------------------------------------------------

import { BotState, ActionResult } from './types';
import { get, post } from './dispatcher';
import { getResourcesByType } from './seed';

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
    if (d.level !== undefined) bot.level = d.level;
    if (d.currentTownId) bot.currentTownId = d.currentTownId;
    if (Array.isArray(d.professions)) {
      bot.professions = d.professions.map((p: any) =>
        typeof p === 'string' ? p : p.type || p.professionType,
      );
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
      return { success: true, detail: `Learned profession ${professionType}`, endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 3. startGathering
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
      };
    }

    const profKey = gatheringProf.toUpperCase();
    const resourceTypes = GATHERING_RESOURCE_MAP[profKey];
    if (!resourceTypes || resourceTypes.length === 0) {
      return {
        success: false,
        detail: `No resource types mapped for ${profKey}`,
        endpoint,
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
      };
    }
    // Graceful failure for HTTP errors
    bot.pendingGathering = false;
    return { success: false, detail: res.data?.error || `Gathering failed: HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: 'Collected gathering results', endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 5. startCrafting
// ---------------------------------------------------------------------------

export async function startCrafting(bot: BotState): Promise<ActionResult> {
  const endpoint = '/crafting/start';
  try {
    // Fetch available recipes
    const recipesRes = await get('/crafting/recipes', bot.token);
    if (recipesRes.status < 200 || recipesRes.status >= 300) {
      return {
        success: false,
        detail: recipesRes.data?.error || `Failed to fetch recipes: HTTP ${recipesRes.status}`,
        endpoint,
      };
    }

    const allRecipes: any[] = recipesRes.data?.recipes || recipesRes.data || [];
    const craftable = allRecipes.filter((r: any) => r.canCraft === true);
    if (craftable.length === 0) {
      return {
        success: false,
        detail: 'No craftable recipes available',
        endpoint,
      };
    }

    const recipe = pickRandom(craftable)!;
    const recipeId = recipe.id || recipe.recipeId;

    const res = await post(endpoint, bot.token, { recipeId });
    if (res.status >= 200 && res.status < 300) {
      bot.pendingCrafting = true;
      return {
        success: true,
        detail: `Started crafting ${recipe.name || recipeId}`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: 'Collected crafting results', endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 7. browseMarket
// ---------------------------------------------------------------------------

export async function browseMarket(bot: BotState): Promise<ActionResult> {
  const endpoint = `/market/browse?townId=${bot.currentTownId}&limit=20`;
  try {
    const res = await get(endpoint, bot.token);
    if (res.status >= 200 && res.status < 300) {
      const listings: any[] = res.data?.listings || res.data || [];
      return {
        success: true,
        detail: `Found ${listings.length} marketplace listings`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 8. buyFromMarket
// ---------------------------------------------------------------------------

export async function buyFromMarket(bot: BotState): Promise<ActionResult> {
  const browseEndpoint = `/market/browse?townId=${bot.currentTownId}&limit=20`;
  const endpoint = '/market/buy';
  try {
    const browseRes = await get(browseEndpoint, bot.token);
    if (browseRes.status < 200 || browseRes.status >= 300) {
      return {
        success: false,
        detail: browseRes.data?.error || `Failed to browse market: HTTP ${browseRes.status}`,
        endpoint,
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
      };
    }

    const listing = pickRandom(affordable)!;
    const listingId = listing.id || listing.listingId;
    const price = listing.price || listing.unitPrice || 0;

    const res = await post(endpoint, bot.token, { listingId, quantity: 1 });
    if (res.status >= 200 && res.status < 300) {
      bot.gold -= price;
      return {
        success: true,
        detail: `Bought item for ${price} gold`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 9. listOnMarket
// ---------------------------------------------------------------------------

export async function listOnMarket(bot: BotState): Promise<ActionResult> {
  const endpoint = '/market/list';
  try {
    const invRes = await get('/items/inventory', bot.token);
    if (invRes.status < 200 || invRes.status >= 300) {
      return {
        success: false,
        detail: invRes.data?.error || `Failed to fetch inventory: HTTP ${invRes.status}`,
        endpoint,
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
      };
    }

    const item = pickRandom(sellable)!;
    const itemId = item.id || item.itemId;
    const price = Math.floor(Math.random() * 46) + 5; // 5-50 gold

    const res = await post(endpoint, bot.token, { itemId, price, quantity: 1 });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Listed item ${item.name || itemId} for ${price} gold`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 10. startCombat
// ---------------------------------------------------------------------------

export async function startCombat(bot: BotState): Promise<ActionResult> {
  const endpoint = '/combat/pve/start';
  try {
    const startRes = await post(endpoint, bot.token, {
      characterId: bot.characterId,
    });
    if (startRes.status < 200 || startRes.status >= 300) {
      return {
        success: false,
        detail: startRes.data?.error || `Failed to start combat: HTTP ${startRes.status}`,
        endpoint,
      };
    }

    const sessionId =
      startRes.data?.sessionId ||
      startRes.data?.session?.id ||
      startRes.data?.id;

    if (!sessionId) {
      return {
        success: false,
        detail: 'No sessionId returned from combat start',
        endpoint,
      };
    }

    let outcome = 'UNKNOWN';
    let playerSurvived = false;
    const actionEndpoint = '/combat/pve/action';
    const MAX_TURNS = 20;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const actionRes = await post(actionEndpoint, bot.token, {
        sessionId,
        action: { type: 'attack' },
      });

      if (actionRes.status < 200 || actionRes.status >= 300) {
        outcome = 'ERROR';
        break;
      }

      const status =
        actionRes.data?.status ||
        actionRes.data?.combat?.status ||
        actionRes.data?.state?.status;

      if (
        status === 'VICTORY' ||
        status === 'DEFEAT' ||
        status === 'FLED' ||
        status === 'COMPLETED'
      ) {
        outcome = status;

        // Check combatant isAlive to determine if player actually won
        const combatants: any[] =
          actionRes.data?.combat?.combatants ||
          actionRes.data?.combatants ||
          [];
        const playerCombatant = combatants.find(
          (c: any) => c.entityType !== 'monster',
        );
        playerSurvived = playerCombatant?.isAlive === true;
        break;
      }
    }

    // Determine true win vs loss based on player survival
    const isWin = playerSurvived && (outcome === 'VICTORY' || outcome === 'COMPLETED');
    const isFled = outcome === 'FLED';

    let detail: string;
    let resultEndpoint: string;

    if (isWin) {
      detail = `Combat victory (${outcome})`;
      resultEndpoint = '/combat/pve/win';
    } else if (isFled) {
      detail = `Combat fled`;
      resultEndpoint = '/combat/pve/loss';
    } else if (outcome === 'COMPLETED' || outcome === 'DEFEAT') {
      detail = `Combat defeat (died)`;
      resultEndpoint = '/combat/pve/loss';
    } else {
      detail = `Combat ended: ${outcome}`;
      resultEndpoint = '/combat/pve/loss';
    }

    return {
      success: isWin,
      detail,
      endpoint: resultEndpoint,
    };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

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
      };
    }

    const quests: any[] = availRes.data?.quests || availRes.data || [];
    if (quests.length === 0) {
      return {
        success: false,
        detail: 'No available quests',
        endpoint,
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
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return {
        success: false,
        detail: 'No travel routes available from current town',
        endpoint,
      };
    }

    // Pick a random route
    const route = pickRandom(routes)!;
    const routeId = route.id || route.routeId;
    const destName = route.destination?.name || route.name || routeId;

    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Traveling to ${destName}`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: false, detail: 'No active election found', endpoint };
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
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: false, detail: 'No active election found', endpoint };
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
      if (!target) return { success: false, detail: 'No candidates available', endpoint };
      candidateId = target.characterId;
    }

    const res = await post(endpoint, bot.token, { electionId, candidateId });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: 'Voted in election',
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
  }
}

// ---------------------------------------------------------------------------
// 18. equipItem
// ---------------------------------------------------------------------------

export async function equipItem(bot: BotState): Promise<ActionResult> {
  const endpoint = '/equipment/equip';
  try {
    const invRes = await get('/items/inventory', bot.token);
    if (invRes.status < 200 || invRes.status >= 300) {
      return {
        success: false,
        detail: invRes.data?.error || `Failed to fetch inventory: HTTP ${invRes.status}`,
        endpoint,
      };
    }

    const items: any[] = invRes.data?.items || invRes.data || [];
    const equippable = items.filter((i: any) => {
      if (i.equipped) return false;
      const type = (i.type || i.itemType || '').toUpperCase();
      return (
        type.includes('WEAPON') ||
        type.includes('ARMOR') ||
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
      };
    }

    const item = pickRandom(equippable)!;
    const itemId = item.id || item.itemId;
    const type = (item.type || item.itemType || '').toUpperCase();

    // Determine slot based on item type
    let slot = 'MAIN_HAND';
    if (type.includes('ARMOR') || type.includes('CHEST')) slot = 'CHEST';
    else if (type.includes('HELMET') || type.includes('HEAD')) slot = 'HEAD';
    else if (type.includes('BOOTS') || type.includes('FEET')) slot = 'FEET';
    else if (type.includes('GLOVES') || type.includes('HANDS')) slot = 'HANDS';
    else if (type.includes('SHIELD')) slot = 'OFF_HAND';

    const res = await post(endpoint, bot.token, { itemId, slot });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Equipped ${item.name || itemId} to ${slot}`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: `Completed quest ${questId}`, endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: `Created party${partyId ? ` (${partyId})` : ''}`, endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: `Invited ${targetBot.characterName} to party`, endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: false, detail: 'Failed to check party status', endpoint: checkEndpoint };
    }

    const invitations: any[] = meRes.data?.pendingInvitations || meRes.data?.invitations || [];
    if (invitations.length === 0) {
      return { success: false, detail: 'No pending party invitations', endpoint: checkEndpoint };
    }

    const invite = invitations[0];
    const partyId = invite.party?.id || invite.partyId || invite.id;
    const acceptEndpoint = `/parties/${partyId}/accept`;
    const res = await post(acceptEndpoint, bot.token, {});
    if (res.status >= 200 && res.status < 300) {
      bot.partyId = partyId;
      bot.partyRole = 'member';
      return { success: true, detail: `Joined party ${partyId}`, endpoint: acceptEndpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint: acceptEndpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: 'Disbanded party', endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      return { success: true, detail: 'Left party', endpoint };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
      };
    }

    const routes: any[] = routesRes.data?.routes || routesRes.data || [];
    if (routes.length === 0) {
      return {
        success: false,
        detail: 'No travel routes available from current town',
        endpoint,
      };
    }

    // Pick a random route
    const route = pickRandom(routes)!;
    const routeId = route.id || route.routeId;
    const destName = route.destination?.name || route.name || routeId;

    // The /travel/start endpoint detects party leaders and initiates group travel
    const res = await post(endpoint, bot.token, { routeId });
    if (res.status >= 200 && res.status < 300) {
      return {
        success: true,
        detail: `Party traveling to ${destName}`,
        endpoint,
      };
    }
    return { success: false, detail: res.data?.error || `HTTP ${res.status}`, endpoint };
  } catch (err: any) {
    return { success: false, detail: err.message, endpoint };
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
    };
  } catch (err: any) {
    return { success: false, detail: `Error storm: ${err.message}`, endpoint };
  }
}
