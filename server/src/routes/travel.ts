/**
 * Node-based travel routes.
 * Supports solo travel along TravelRoutes with TravelNodes,
 * and group travel via TravelGroups.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, ne } from 'drizzle-orm';
import {
  travelRoutes,
  travelNodes,
  characterTravelStates,
  characters,
  travelGroups,
  travelGroupMembers,
  groupTravelStates,
  partyMembers,
  parties,
  towns,
  townPolicies,
} from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { getNextTickTime } from '../lib/game-day';
import { calculateWeightState } from '../services/weight-calculator';
import { computeFeatBonus } from '@shared/data/feats';

const router = Router();

// ---- Zod Schemas ----

const startTravelSchema = z.object({
  routeId: z.string().min(1, 'routeId is required'),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

const startGroupTravelSchema = z.object({
  routeId: z.string().min(1, 'routeId is required'),
});

// ---- Helpers ----

/** Calculate remaining ticks to reach destination based on current position, direction, and route nodeCount. */
function calculateEtaTicks(currentNodeIndex: number, nodeCount: number, direction: string, speedModifier: number): number {
  const nodesRemaining = direction === 'forward'
    ? nodeCount - currentNodeIndex
    : currentNodeIndex;
  return Math.max(0, Math.ceil(nodesRemaining / Math.max(1, speedModifier)));
}

/** Get road improvement speed bonus from tradePolicy for a specific route. */
async function getRoadImprovementBonus(originTownId: string, routeId: string): Promise<number> {
  const policy = await db.query.townPolicies.findFirst({
    where: eq(townPolicies.townId, originTownId),
    columns: { tradePolicy: true },
  });
  if (!policy) return 0;
  const tp = (policy.tradePolicy as Record<string, any>) ?? {};
  const improvements = (tp.roadImprovements as any[]) ?? [];
  let bonus = 0;
  for (const imp of improvements) {
    if (imp.routeId === routeId) {
      bonus += imp.speedBonus ?? 0;
    }
  }
  return bonus;
}

/** Determine the nearest town when cancelling travel. */
function getNearestTown(
  currentNodeIndex: number,
  nodeCount: number,
  direction: string,
  fromTownId: string,
  toTownId: string,
): string {
  const midpoint = nodeCount / 2;
  // In forward direction: start = fromTown, end = toTown
  // In backward direction: start = toTown, end = fromTown
  const startTown = direction === 'forward' ? fromTownId : toTownId;
  const endTown = direction === 'forward' ? toTownId : fromTownId;

  if (currentNodeIndex <= midpoint) {
    return startTown;
  }
  return endTown;
}

// ===========================================================================
// SOLO TRAVEL
// ===========================================================================

// GET /api/travel/routes -- Available routes from character's current town
router.get('/routes', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You are currently traveling. Check your travel status.' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to view available routes' });
    }

    const routes = await db.query.travelRoutes.findMany({
      where: and(
        eq(travelRoutes.isReleased, true),
        or(
          eq(travelRoutes.fromTownId, character.currentTownId),
          eq(travelRoutes.toTownId, character.currentTownId),
        ),
      ),
      with: {
        town_fromTownId: { columns: { id: true, name: true } },
        town_toTownId: { columns: { id: true, name: true } },
      },
    });

    const routeList = routes.map(route => {
      // If character is at the toTown end, swap from/to in the response
      const isReverse = route.toTownId === character.currentTownId;
      const origin = isReverse ? route.town_toTownId : route.town_fromTownId;
      const destination = isReverse ? route.town_fromTownId : route.town_toTownId;

      return {
        id: route.id,
        name: route.name,
        description: route.description,
        origin: { id: origin.id, name: origin.name },
        destination: { id: destination.id, name: destination.name },
        nodeCount: route.nodeCount,
        difficulty: route.difficulty,
        terrain: route.terrain,
        dangerLevel: route.dangerLevel,
        bidirectional: route.bidirectional,
      };
    });

    return res.json({ routes: routeList });
  } catch (error) {
    if (handleDbError(error, res, 'travel-routes', req)) return;
    logRouteError(req, 500, 'Travel routes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/routes/:routeId -- Full route detail with all nodes
router.get('/routes/:routeId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { routeId } = req.params;

    const route = await db.query.travelRoutes.findFirst({
      where: eq(travelRoutes.id, routeId),
      with: {
        town_fromTownId: { columns: { id: true, name: true } },
        town_toTownId: { columns: { id: true, name: true } },
        travelNodes: {
          orderBy: (t: any, { asc }: any) => [asc(t.nodeIndex)],
        },
      },
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    return res.json({
      route: {
        id: route.id,
        name: route.name,
        description: route.description,
        fromTown: route.town_fromTownId,
        toTown: route.town_toTownId,
        nodeCount: route.nodeCount,
        difficulty: route.difficulty,
        terrain: route.terrain,
        dangerLevel: route.dangerLevel,
        bidirectional: route.bidirectional,
        isReleased: route.isReleased,
        nodes: route.travelNodes.map((node: any) => ({
          id: node.id,
          nodeIndex: node.nodeIndex,
          name: node.name,
          description: node.description,
          terrain: node.terrain,
          dangerLevel: node.dangerLevel,
          specialType: node.specialType,
        })),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-route-detail', req)) return;
    logRouteError(req, 500, 'Travel route detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/start -- Begin solo or party journey
// If the character is a party leader → initiates GROUP travel for all members
// If the character is in a party but NOT the leader → reject
// If the character is NOT in a party → solo travel (unchanged)
router.post('/start', authGuard, characterGuard, validate(startTravelSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { routeId } = req.body;
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You are already traveling or otherwise busy' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to begin traveling' });
    }

    // Check if character is in an active party
    const allPartyMemberships = await db.query.partyMembers.findMany({
      where: eq(partyMembers.characterId, character.id),
      with: {
        party: {
          with: {
            partyMembers: {
              with: {
                character: {
                  columns: { id: true, name: true, level: true, currentTownId: true, travelStatus: true },
                },
              },
            },
          },
        },
      },
    });

    // Filter for active membership (leftAt IS NULL) in an active party
    const partyMembership = allPartyMemberships.find(
      m => m.leftAt === null && m.party.status === 'active'
    );

    const isInParty = !!partyMembership;
    const isPartyLeader = isInParty && partyMembership!.role === 'leader';

    // Party member but not leader → reject
    if (isInParty && !isPartyLeader) {
      return res.status(403).json({ error: 'Only the party leader can initiate travel' });
    }

    const route = await db.query.travelRoutes.findFirst({
      where: eq(travelRoutes.id, routeId),
      with: {
        town_fromTownId: { columns: { id: true, name: true } },
        town_toTownId: { columns: { id: true, name: true } },
        travelNodes: {
          orderBy: (t: any, { asc }: any) => [asc(t.nodeIndex)],
          limit: 1,
        },
      },
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (!route.isReleased) {
      return res.status(400).json({ error: 'This route is not yet available' });
    }

    // Determine direction
    let direction: string;
    if (character.currentTownId === route.fromTownId) {
      direction = 'forward';
    } else if (character.currentTownId === route.toTownId) {
      if (!route.bidirectional) {
        return res.status(400).json({ error: 'This route cannot be traveled in reverse' });
      }
      direction = 'backward';
    } else {
      return res.status(400).json({ error: 'You are not at either end of this route' });
    }

    // ---- PARTY TRAVEL (leader initiates group travel) ----
    if (isPartyLeader) {
      const party = partyMembership!.party;
      // Active members only
      const activePartyMembers = party.partyMembers.filter((m: any) => m.leftAt === null);

      // Validate all members are in the correct town and idle
      const invalidMembers = activePartyMembers.filter(
        (m: any) => m.character.currentTownId !== character.currentTownId || m.character.travelStatus !== 'idle'
      );

      if (invalidMembers.length > 0) {
        const names = invalidMembers.map((m: any) => m.character.name).join(', ');
        return res.status(400).json({
          error: `Some party members are not ready: ${names}. All members must be idle and in the same town.`,
        });
      }

      const memberCharacterIds = activePartyMembers.map((m: any) => m.character.id);

      // Create a TravelGroup linked to the party, with GroupTravelState
      const gts = await db.transaction(async (tx) => {
        const [travelGroup] = await tx.insert(travelGroups).values({
          id: crypto.randomUUID(),
          leaderId: character.id,
          name: party.name || null,
          status: 'traveling',
          partyId: party.id,
        }).returning();

        // Create TravelGroupMembers
        for (const member of activePartyMembers) {
          await tx.insert(travelGroupMembers).values({
            id: crypto.randomUUID(),
            groupId: travelGroup.id,
            characterId: (member as any).character.id,
            role: (member as any).role,
          });
        }

        // Group speed: use leader's feat bonus + road improvements
        const groupRoadBonus = await getRoadImprovementBonus(character.currentTownId!, routeId);
        const groupSpeedMod = (1 + computeFeatBonus((character.feats as string[]) ?? [], 'travelSpeedBonus')) * (1 + groupRoadBonus);

        const [groupState] = await tx.insert(groupTravelStates).values({
          id: crypto.randomUUID(),
          groupId: travelGroup.id,
          routeId: route.id,
          currentNodeIndex: 0,
          direction,
          status: 'traveling',
          speedModifier: groupSpeedMod,
        }).returning();

        // Update all member characters
        for (const charId of memberCharacterIds) {
          await tx.update(characters).set({
            travelStatus: 'traveling_group',
            currentTownId: null,
            checkedInInnId: null,
          }).where(eq(characters.id, charId));
        }

        return groupState;
      });

      const etaTicks = calculateEtaTicks(0, route.nodeCount, direction, gts.speedModifier);
      // TODO: Apply worst-member encumbrance multiplier for group travel

      return res.status(201).json({
        type: 'party',
        travelState: {
          id: gts.id,
          routeId: gts.routeId,
          currentNodeIndex: gts.currentNodeIndex,
          direction: gts.direction,
          status: gts.status,
          startedAt: gts.startedAt,
        },
        route: {
          name: route.name,
          fromTown: route.town_fromTownId,
          toTown: route.town_toTownId,
          nodeCount: route.nodeCount,
        },
        party: {
          id: party.id,
          name: party.name,
          memberCount: memberCharacterIds.length,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      });
    }

    // ---- SOLO TRAVEL (no party) ----
    const weightState = await calculateWeightState(character.id);

    const roadBonus = await getRoadImprovementBonus(character.currentTownId!, routeId);
    const soloSpeedMod = (1 + computeFeatBonus((character.feats as string[]) ?? [], 'travelSpeedBonus')) * (1 + roadBonus);

    const travelState = await db.transaction(async (tx) => {
      const [state] = await tx.insert(characterTravelStates).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        routeId: route.id,
        currentNodeIndex: 0,
        direction,
        status: 'traveling',
        speedModifier: soloSpeedMod,
      }).returning();

      await tx.update(characters).set({
        travelStatus: 'traveling_solo',
        currentTownId: null,
        checkedInInnId: null,
      }).where(eq(characters.id, character.id));

      return state;
    });

    const firstNode = route.travelNodes[0] || null;
    const baseEtaTicks = calculateEtaTicks(0, route.nodeCount, direction, travelState.speedModifier);
    const etaTicks = Math.ceil(baseEtaTicks * weightState.encumbrance.travelMultiplier);

    const encumbranceWarning = weightState.encumbrance.tier !== 'NORMAL'
      ? `You are ${weightState.encumbrance.tier.toLowerCase().replace('_', ' ')}. Travel time increased by ${Math.round((weightState.encumbrance.travelMultiplier - 1) * 100)}%.`
      : undefined;

    return res.status(201).json({
      type: 'solo',
      travelState: {
        id: travelState.id,
        routeId: travelState.routeId,
        currentNodeIndex: travelState.currentNodeIndex,
        direction: travelState.direction,
        status: travelState.status,
        startedAt: travelState.startedAt,
      },
      route: {
        name: route.name,
        fromTown: route.town_fromTownId,
        toTown: route.town_toTownId,
        nodeCount: route.nodeCount,
      },
      currentNode: firstNode ? {
        nodeIndex: firstNode.nodeIndex,
        name: firstNode.name,
        description: firstNode.description,
        terrain: firstNode.terrain,
        dangerLevel: firstNode.dangerLevel,
        specialType: firstNode.specialType,
      } : null,
      etaTicks,
      nextTickAt: getNextTickTime(),
      weightState,
      ...(encumbranceWarning ? { encumbranceWarning } : {}),
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-start', req)) return;
    logRouteError(req, 500, 'Travel start error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/status -- Current travel state
router.get('/status', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus === 'idle') {
      const town = character.currentTownId
        ? await db.query.towns.findFirst({
            where: eq(towns.id, character.currentTownId),
            columns: { id: true, name: true },
          })
        : null;

      return res.json({
        traveling: false,
        town,
      });
    }

    if (character.travelStatus === 'traveling_solo') {
      const travelState = await db.query.characterTravelStates.findFirst({
        where: eq(characterTravelStates.characterId, character.id),
        with: {
          travelRoute: {
            with: {
              town_fromTownId: { columns: { id: true, name: true } },
              town_toTownId: { columns: { id: true, name: true } },
              travelNodes: {
                orderBy: (t: any, { asc }: any) => [asc(t.nodeIndex)],
              },
            },
          },
        },
      });

      if (!travelState) {
        return res.status(404).json({ error: 'Travel state not found. Your travel data may be inconsistent.' });
      }

      // Find the current node by nodeIndex
      const currentNode = travelState.travelRoute.travelNodes.find(
        (n: any) => n.nodeIndex === travelState.currentNodeIndex
      ) || null;

      const etaTicks = calculateEtaTicks(
        travelState.currentNodeIndex,
        travelState.travelRoute.nodeCount,
        travelState.direction,
        travelState.speedModifier,
      );

      return res.json({
        traveling: true,
        type: 'solo',
        travelState: {
          id: travelState.id,
          currentNodeIndex: travelState.currentNodeIndex,
          direction: travelState.direction,
          status: travelState.status,
          speedModifier: travelState.speedModifier,
          startedAt: travelState.startedAt,
          lastTickAt: travelState.lastTickAt,
        },
        route: {
          id: travelState.travelRoute.id,
          name: travelState.travelRoute.name,
          fromTown: travelState.travelRoute.town_fromTownId,
          toTown: travelState.travelRoute.town_toTownId,
          nodeCount: travelState.travelRoute.nodeCount,
          terrain: travelState.travelRoute.terrain,
          dangerLevel: travelState.travelRoute.dangerLevel,
        },
        currentNode: currentNode ? {
          nodeIndex: currentNode.nodeIndex,
          name: currentNode.name,
          description: currentNode.description,
          terrain: currentNode.terrain,
          dangerLevel: currentNode.dangerLevel,
          specialType: currentNode.specialType,
        } : null,
        progress: {
          current: travelState.currentNodeIndex,
          total: travelState.travelRoute.nodeCount,
          percent: travelState.travelRoute.nodeCount > 0
            ? Math.round((travelState.currentNodeIndex / travelState.travelRoute.nodeCount) * 100)
            : 0,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      });
    }

    if (character.travelStatus === 'traveling_group') {
      // Find group membership for this character
      const membership = await db.query.travelGroupMembers.findFirst({
        where: eq(travelGroupMembers.characterId, character.id),
        with: {
          travelGroup: {
            with: {
              character: { columns: { id: true, name: true } },
              travelGroupMembers: {
                with: {
                  character: { columns: { id: true, name: true, level: true, race: true } },
                },
              },
              groupTravelStates: {
                with: {
                  travelRoute: {
                    with: {
                      town_fromTownId: { columns: { id: true, name: true } },
                      town_toTownId: { columns: { id: true, name: true } },
                      travelNodes: {
                        orderBy: (t: any, { asc }: any) => [asc(t.nodeIndex)],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // groupTravelStates is many, take first as it's a 1:1 in practice
      const groupState = membership?.travelGroup.groupTravelStates[0];

      if (!membership || !groupState) {
        return res.status(404).json({ error: 'Group travel state not found' });
      }

      const currentNode = groupState.travelRoute.travelNodes.find(
        (n: any) => n.nodeIndex === groupState.currentNodeIndex
      ) || null;

      const etaTicks = calculateEtaTicks(
        groupState.currentNodeIndex,
        groupState.travelRoute.nodeCount,
        groupState.direction,
        groupState.speedModifier,
      );

      return res.json({
        traveling: true,
        type: 'group',
        group: {
          id: membership.travelGroup.id,
          name: membership.travelGroup.name,
          leader: membership.travelGroup.character,
          members: membership.travelGroup.travelGroupMembers.map((m: any) => ({
            characterId: m.character.id,
            name: m.character.name,
            level: m.character.level,
            race: m.character.race,
            role: m.role,
          })),
        },
        travelState: {
          id: groupState.id,
          currentNodeIndex: groupState.currentNodeIndex,
          direction: groupState.direction,
          status: groupState.status,
          speedModifier: groupState.speedModifier,
          startedAt: groupState.startedAt,
          lastTickAt: groupState.lastTickAt,
        },
        route: {
          id: groupState.travelRoute.id,
          name: groupState.travelRoute.name,
          fromTown: groupState.travelRoute.town_fromTownId,
          toTown: groupState.travelRoute.town_toTownId,
          nodeCount: groupState.travelRoute.nodeCount,
          terrain: groupState.travelRoute.terrain,
          dangerLevel: groupState.travelRoute.dangerLevel,
        },
        currentNode: currentNode ? {
          nodeIndex: currentNode.nodeIndex,
          name: currentNode.name,
          description: currentNode.description,
          terrain: currentNode.terrain,
          dangerLevel: currentNode.dangerLevel,
          specialType: currentNode.specialType,
        } : null,
        progress: {
          current: groupState.currentNodeIndex,
          total: groupState.travelRoute.nodeCount,
          percent: groupState.travelRoute.nodeCount > 0
            ? Math.round((groupState.currentNodeIndex / groupState.travelRoute.nodeCount) * 100)
            : 0,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      });
    }

    // Fallback for unknown travelStatus values
    return res.json({
      traveling: false,
      travelStatus: character.travelStatus,
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-status', req)) return;
    logRouteError(req, 500, 'Travel status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/cancel -- Cancel journey, return to nearest town
router.post('/cancel', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus === 'idle') {
      return res.status(400).json({ error: 'You are not currently traveling' });
    }

    // --- Solo travel cancel ---
    if (character.travelStatus === 'traveling_solo') {
      const travelState = await db.query.characterTravelStates.findFirst({
        where: eq(characterTravelStates.characterId, character.id),
        with: {
          travelRoute: {
            columns: { fromTownId: true, toTownId: true, nodeCount: true },
          },
        },
      });

      if (!travelState) {
        return res.status(404).json({ error: 'Travel state not found' });
      }

      const nearestTownId = getNearestTown(
        travelState.currentNodeIndex,
        travelState.travelRoute.nodeCount,
        travelState.direction,
        travelState.travelRoute.fromTownId,
        travelState.travelRoute.toTownId,
      );

      await db.transaction(async (tx) => {
        await tx.delete(characterTravelStates).where(
          eq(characterTravelStates.characterId, character.id),
        );
        await tx.update(characters).set({
          travelStatus: 'idle',
          currentTownId: nearestTownId,
        }).where(eq(characters.id, character.id));
      });

      const town = await db.query.towns.findFirst({
        where: eq(towns.id, nearestTownId),
        columns: { id: true, name: true },
      });

      return res.json({
        message: 'Travel cancelled. You have returned to the nearest town.',
        town,
      });
    }

    // --- Group travel cancel (leader only) ---
    if (character.travelStatus === 'traveling_group') {
      const membership = await db.query.travelGroupMembers.findFirst({
        where: eq(travelGroupMembers.characterId, character.id),
        with: {
          travelGroup: {
            with: {
              travelGroupMembers: {
                with: {
                  character: { columns: { id: true } },
                },
              },
              groupTravelStates: {
                with: {
                  travelRoute: {
                    columns: { fromTownId: true, toTownId: true, nodeCount: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: 'Group membership not found' });
      }

      if (membership.role !== 'leader') {
        return res.status(403).json({ error: 'Only the group leader can cancel group travel' });
      }

      const groupState = membership.travelGroup.groupTravelStates[0];
      if (!groupState) {
        return res.status(400).json({ error: 'Group is not currently traveling' });
      }

      const nearestTownId = getNearestTown(
        groupState.currentNodeIndex,
        groupState.travelRoute.nodeCount,
        groupState.direction,
        groupState.travelRoute.fromTownId,
        groupState.travelRoute.toTownId,
      );

      const memberCharacterIds = membership.travelGroup.travelGroupMembers.map((m: any) => m.character.id);

      await db.transaction(async (tx) => {
        // Delete group travel state
        await tx.delete(groupTravelStates).where(
          eq(groupTravelStates.groupId, membership.travelGroup.id),
        );

        // Update group status
        await tx.update(travelGroups).set({
          status: 'disbanded',
        }).where(eq(travelGroups.id, membership.travelGroup.id));

        // Return all members to nearest town
        for (const charId of memberCharacterIds) {
          await tx.update(characters).set({
            travelStatus: 'idle',
            currentTownId: nearestTownId,
          }).where(eq(characters.id, charId));
        }

        // Clean up memberships
        await tx.delete(travelGroupMembers).where(
          eq(travelGroupMembers.groupId, membership.travelGroup.id),
        );
      });

      const town = await db.query.towns.findFirst({
        where: eq(towns.id, nearestTownId),
        columns: { id: true, name: true },
      });

      return res.json({
        message: 'Group travel cancelled. All members returned to the nearest town.',
        town,
        membersReturned: memberCharacterIds.length,
      });
    }

    return res.status(400).json({ error: 'Cannot cancel travel in current state' });
  } catch (error) {
    if (handleDbError(error, res, 'travel-cancel', req)) return;
    logRouteError(req, 500, 'Travel cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/reverse -- Change direction (solo only)
router.post('/reverse', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus !== 'traveling_solo') {
      return res.status(400).json({ error: 'You must be traveling solo to reverse direction' });
    }

    const travelState = await db.query.characterTravelStates.findFirst({
      where: eq(characterTravelStates.characterId, character.id),
      with: {
        travelRoute: {
          with: {
            town_fromTownId: { columns: { id: true, name: true } },
            town_toTownId: { columns: { id: true, name: true } },
          },
        },
      },
    });

    if (!travelState) {
      return res.status(404).json({ error: 'Travel state not found' });
    }

    if (!travelState.travelRoute.bidirectional) {
      return res.status(400).json({ error: 'This route cannot be traveled in reverse' });
    }

    const newDirection = travelState.direction === 'forward' ? 'backward' : 'forward';

    const [updated] = await db.update(characterTravelStates).set({
      direction: newDirection,
    }).where(eq(characterTravelStates.characterId, character.id)).returning();

    const etaTicks = calculateEtaTicks(
      updated.currentNodeIndex,
      travelState.travelRoute.nodeCount,
      newDirection,
      updated.speedModifier,
    );

    return res.json({
      message: `Direction changed to ${newDirection}`,
      travelState: {
        id: updated.id,
        currentNodeIndex: updated.currentNodeIndex,
        direction: updated.direction,
        status: updated.status,
        speedModifier: updated.speedModifier,
      },
      route: {
        name: travelState.travelRoute.name,
        fromTown: travelState.travelRoute.town_fromTownId,
        toTown: travelState.travelRoute.town_toTownId,
        nodeCount: travelState.travelRoute.nodeCount,
      },
      etaTicks,
      nextTickAt: getNextTickTime(),
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-reverse', req)) return;
    logRouteError(req, 500, 'Travel reverse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/node/players -- Other players on same node
router.get('/node/players', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    if (character.travelStatus !== 'traveling_solo' && character.travelStatus !== 'traveling_group') {
      return res.status(400).json({ error: 'You must be traveling to view nearby players' });
    }

    // Get current route and node index
    let routeId: string | null = null;
    let currentNodeIndex: number | null = null;

    if (character.travelStatus === 'traveling_solo') {
      const travelState = await db.query.characterTravelStates.findFirst({
        where: eq(characterTravelStates.characterId, character.id),
      });
      if (travelState) {
        routeId = travelState.routeId;
        currentNodeIndex = travelState.currentNodeIndex;
      }
    } else {
      // traveling_group
      const mem = await db.query.travelGroupMembers.findFirst({
        where: eq(travelGroupMembers.characterId, character.id),
        with: {
          travelGroup: {
            with: { groupTravelStates: true },
          },
        },
      });
      const gs = mem?.travelGroup.groupTravelStates[0];
      if (gs) {
        routeId = gs.routeId;
        currentNodeIndex = gs.currentNodeIndex;
      }
    }

    if (!routeId || currentNodeIndex === null) {
      return res.json({ players: [] });
    }

    // Find solo travelers on the same route and node
    const soloTravelers = await db.query.characterTravelStates.findMany({
      where: and(
        eq(characterTravelStates.routeId, routeId),
        eq(characterTravelStates.currentNodeIndex, currentNodeIndex),
        ne(characterTravelStates.characterId, character.id),
      ),
      with: {
        character: {
          columns: { id: true, name: true, level: true, race: true },
        },
      },
    });

    // Find group travelers on the same route and node
    const groupStatesList = await db.query.groupTravelStates.findMany({
      where: and(
        eq(groupTravelStates.routeId, routeId),
        eq(groupTravelStates.currentNodeIndex, currentNodeIndex),
      ),
      with: {
        travelGroup: {
          with: {
            travelGroupMembers: {
              with: {
                character: {
                  columns: { id: true, name: true, level: true, race: true },
                },
              },
            },
          },
        },
      },
    });

    const players: Array<{
      characterId: string;
      name: string;
      level: number;
      race: string;
      groupName?: string;
    }> = [];

    // Add solo travelers
    for (const state of soloTravelers) {
      players.push({
        characterId: state.character.id,
        name: state.character.name,
        level: state.character.level,
        race: state.character.race,
      });
    }

    // Add group travelers (exclude self)
    for (const gs of groupStatesList) {
      for (const member of gs.travelGroup.travelGroupMembers) {
        if (member.character.id !== character.id) {
          players.push({
            characterId: member.character.id,
            name: member.character.name,
            level: member.character.level,
            race: member.character.race,
            groupName: gs.travelGroup.name || undefined,
          });
        }
      }
    }

    return res.json({ players });
  } catch (error) {
    if (handleDbError(error, res, 'travel-node-players', req)) return;
    logRouteError(req, 500, 'Travel node players error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// GROUP TRAVEL
// ===========================================================================

// POST /api/travel/group/create -- Create a travel group
router.post('/group/create', authGuard, characterGuard, validate(createGroupSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { name } = req.body;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You must be idle to create a travel group' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to create a travel group' });
    }

    // Check if already in a group
    const existingMemberships = await db.query.travelGroupMembers.findMany({
      where: eq(travelGroupMembers.characterId, character.id),
      with: { travelGroup: { columns: { status: true } } },
    });

    const activeGroupMembership = existingMemberships.find(
      m => m.travelGroup.status === 'forming' || m.travelGroup.status === 'traveling'
    );

    if (activeGroupMembership) {
      return res.status(400).json({ error: 'You are already in an active travel group' });
    }

    const group = await db.transaction(async (tx) => {
      const [newGroup] = await tx.insert(travelGroups).values({
        id: crypto.randomUUID(),
        leaderId: character.id,
        name: name || null,
        status: 'forming',
      }).returning();

      await tx.insert(travelGroupMembers).values({
        id: crypto.randomUUID(),
        groupId: newGroup.id,
        characterId: character.id,
        role: 'leader',
      });

      return newGroup;
    });

    return res.status(201).json({
      group: {
        id: group.id,
        name: group.name,
        leaderId: group.leaderId,
        status: group.status,
        maxSize: group.maxSize,
        createdAt: group.createdAt,
        members: [
          {
            characterId: character.id,
            name: character.name,
            role: 'leader',
          },
        ],
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-create', req)) return;
    logRouteError(req, 500, 'Travel group create error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/group/:groupId/join -- Join a group
router.post('/group/:groupId/join', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You must be idle to join a travel group' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to join a travel group' });
    }

    const group = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
      with: {
        character: { columns: { id: true, currentTownId: true } },
        travelGroupMembers: {
          with: {
            character: { columns: { id: true, name: true, level: true, race: true } },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    if (group.status !== 'forming') {
      return res.status(400).json({ error: 'This group is no longer accepting members' });
    }

    if (group.travelGroupMembers.length >= group.maxSize) {
      return res.status(400).json({ error: `Group is full (${group.maxSize}/${group.maxSize})` });
    }

    // Ensure character is in the same town as the leader
    if (character.currentTownId !== group.character.currentTownId) {
      return res.status(400).json({ error: 'You must be in the same town as the group leader' });
    }

    // Check not already in another active group
    const existingMemberships = await db.query.travelGroupMembers.findMany({
      where: eq(travelGroupMembers.characterId, character.id),
      with: { travelGroup: { columns: { status: true } } },
    });

    const activeGroupMembership = existingMemberships.find(
      m => m.travelGroup.status === 'forming' || m.travelGroup.status === 'traveling'
    );

    if (activeGroupMembership) {
      return res.status(400).json({ error: 'You are already in an active travel group' });
    }

    await db.insert(travelGroupMembers).values({
      id: crypto.randomUUID(),
      groupId: group.id,
      characterId: character.id,
      role: 'member',
    });

    // Fetch updated group
    const updatedGroup = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
      with: {
        travelGroupMembers: {
          with: {
            character: { columns: { id: true, name: true, level: true, race: true } },
          },
        },
      },
    });

    return res.json({
      message: 'Joined the travel group',
      group: {
        id: updatedGroup!.id,
        name: updatedGroup!.name,
        leaderId: updatedGroup!.leaderId,
        status: updatedGroup!.status,
        maxSize: updatedGroup!.maxSize,
        members: updatedGroup!.travelGroupMembers.map((m: any) => ({
          characterId: m.character.id,
          name: m.character.name,
          level: m.character.level,
          race: m.character.race,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-join', req)) return;
    logRouteError(req, 500, 'Travel group join error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/group/:groupId/leave -- Leave a group
router.post('/group/:groupId/leave', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;

    const group = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
      with: {
        travelGroupMembers: {
          with: {
            character: { columns: { id: true, name: true } },
          },
          orderBy: (t: any, { asc }: any) => [asc(t.joinedAt)],
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    if (group.status !== 'forming') {
      return res.status(400).json({ error: 'Cannot leave a group that is already traveling. Ask the leader to cancel.' });
    }

    const membership = group.travelGroupMembers.find((m: any) => m.characterId === character.id);
    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    if (membership.role === 'leader') {
      // If leader leaves, promote next member or disband
      const otherMembers = group.travelGroupMembers.filter((m: any) => m.characterId !== character.id);

      if (otherMembers.length === 0) {
        // No one left, disband
        await db.transaction(async (tx) => {
          await tx.delete(travelGroupMembers).where(eq(travelGroupMembers.groupId, group.id));
          await tx.delete(travelGroups).where(eq(travelGroups.id, group.id));
        });

        return res.json({ message: 'You left the group and it was disbanded (no members remaining)' });
      }

      // Promote the next member to leader
      const newLeader = otherMembers[0];
      await db.transaction(async (tx) => {
        await tx.delete(travelGroupMembers).where(
          and(
            eq(travelGroupMembers.groupId, group.id),
            eq(travelGroupMembers.characterId, character.id),
          ),
        );
        await tx.update(travelGroupMembers).set({
          role: 'leader',
        }).where(eq(travelGroupMembers.id, newLeader.id));
        await tx.update(travelGroups).set({
          leaderId: newLeader.characterId,
        }).where(eq(travelGroups.id, group.id));
      });

      return res.json({
        message: `You left the group. ${newLeader.character.name} is now the leader.`,
        newLeaderId: newLeader.characterId,
      });
    }

    // Regular member leaving
    await db.delete(travelGroupMembers).where(
      and(
        eq(travelGroupMembers.groupId, group.id),
        eq(travelGroupMembers.characterId, character.id),
      ),
    );

    return res.json({ message: 'You left the travel group' });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-leave', req)) return;
    logRouteError(req, 500, 'Travel group leave error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/travel/group/:groupId -- Disband (leader only)
router.delete('/group/:groupId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;

    const group = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    if (group.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the group leader can disband the group' });
    }

    if (group.status !== 'forming') {
      return res.status(400).json({ error: 'Cannot disband a group that is already traveling. Use cancel instead.' });
    }

    await db.transaction(async (tx) => {
      await tx.delete(travelGroupMembers).where(eq(travelGroupMembers.groupId, group.id));
      await tx.delete(travelGroups).where(eq(travelGroups.id, group.id));
    });

    return res.json({ message: 'Travel group disbanded' });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-disband', req)) return;
    logRouteError(req, 500, 'Travel group disband error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/group/:groupId/start -- Begin group journey (leader only)
router.post('/group/:groupId/start', authGuard, characterGuard, validate(startGroupTravelSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;
    const { routeId } = req.body;

    const group = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
      with: {
        travelGroupMembers: {
          with: {
            character: {
              columns: { id: true, name: true, level: true, race: true, currentTownId: true, travelStatus: true },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    if (group.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the group leader can start group travel' });
    }

    if (group.status !== 'forming') {
      return res.status(400).json({ error: 'Group is not in forming state' });
    }

    if (group.travelGroupMembers.length < 2) {
      return res.status(400).json({ error: 'Group must have at least 2 members to travel' });
    }

    const route = await db.query.travelRoutes.findFirst({
      where: eq(travelRoutes.id, routeId),
      with: {
        town_fromTownId: { columns: { id: true, name: true } },
        town_toTownId: { columns: { id: true, name: true } },
      },
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (!route.isReleased) {
      return res.status(400).json({ error: 'This route is not yet available' });
    }

    // Determine direction based on leader's town
    let direction: string;
    if (character.currentTownId === route.fromTownId) {
      direction = 'forward';
    } else if (character.currentTownId === route.toTownId) {
      if (!route.bidirectional) {
        return res.status(400).json({ error: 'This route cannot be traveled in reverse' });
      }
      direction = 'backward';
    } else {
      return res.status(400).json({ error: 'The group leader is not at either end of this route' });
    }

    // Validate all members are in the correct town and idle
    const requiredTownId = character.currentTownId;
    const invalidMembers = group.travelGroupMembers.filter(
      (m: any) => m.character.currentTownId !== requiredTownId || m.character.travelStatus !== 'idle'
    );

    if (invalidMembers.length > 0) {
      const names = invalidMembers.map((m: any) => m.character.name).join(', ');
      return res.status(400).json({
        error: `Some members are not ready: ${names}. All members must be idle and in the same town.`,
      });
    }

    const memberCharacterIds = group.travelGroupMembers.map((m: any) => m.character.id);

    // Leader's feat speed bonus for group travel
    const groupStartSpeedMod = 1 + computeFeatBonus((character.feats as string[]) ?? [], 'travelSpeedBonus');

    const gts = await db.transaction(async (tx) => {
      // Create group travel state
      const [groupState] = await tx.insert(groupTravelStates).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        routeId: route.id,
        currentNodeIndex: 0,
        direction,
        status: 'traveling',
        speedModifier: groupStartSpeedMod,
      }).returning();

      // Update group status
      await tx.update(travelGroups).set({
        status: 'traveling',
      }).where(eq(travelGroups.id, group.id));

      // Update all member characters
      for (const charId of memberCharacterIds) {
        await tx.update(characters).set({
          travelStatus: 'traveling_group',
          currentTownId: null,
          checkedInInnId: null,
        }).where(eq(characters.id, charId));
      }

      return groupState;
    });

    const etaTicks = calculateEtaTicks(0, route.nodeCount, direction, gts.speedModifier);

    return res.status(201).json({
      message: 'Group journey has begun',
      travelState: {
        id: gts.id,
        routeId: gts.routeId,
        currentNodeIndex: gts.currentNodeIndex,
        direction: gts.direction,
        status: gts.status,
        startedAt: gts.startedAt,
      },
      route: {
        id: route.id,
        name: route.name,
        fromTown: route.town_fromTownId,
        toTown: route.town_toTownId,
        nodeCount: route.nodeCount,
      },
      group: {
        id: group.id,
        name: group.name,
        memberCount: memberCharacterIds.length,
      },
      etaTicks,
      nextTickAt: getNextTickTime(),
    });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-start', req)) return;
    logRouteError(req, 500, 'Travel group start error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/group/:groupId -- Get group info
router.get('/group/:groupId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;

    const group = await db.query.travelGroups.findFirst({
      where: eq(travelGroups.id, groupId),
      with: {
        character: { columns: { id: true, name: true } },
        travelGroupMembers: {
          with: {
            character: { columns: { id: true, name: true, level: true, race: true } },
          },
          orderBy: (t: any, { asc }: any) => [asc(t.joinedAt)],
        },
        groupTravelStates: {
          with: {
            travelRoute: {
              with: {
                town_fromTownId: { columns: { id: true, name: true } },
                town_toTownId: { columns: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    const response: Record<string, unknown> = {
      id: group.id,
      name: group.name,
      leader: group.character,
      status: group.status,
      maxSize: group.maxSize,
      createdAt: group.createdAt,
      members: group.travelGroupMembers.map((m: any) => ({
        characterId: m.character.id,
        name: m.character.name,
        level: m.character.level,
        race: m.character.race,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };

    const groupState = group.groupTravelStates[0];
    if (groupState) {
      const etaTicks = calculateEtaTicks(
        groupState.currentNodeIndex,
        groupState.travelRoute.nodeCount,
        groupState.direction,
        groupState.speedModifier,
      );

      response.travelState = {
        id: groupState.id,
        currentNodeIndex: groupState.currentNodeIndex,
        direction: groupState.direction,
        status: groupState.status,
        speedModifier: groupState.speedModifier,
        startedAt: groupState.startedAt,
        lastTickAt: groupState.lastTickAt,
        route: {
          id: groupState.travelRoute.id,
          name: groupState.travelRoute.name,
          fromTown: groupState.travelRoute.town_fromTownId,
          toTown: groupState.travelRoute.town_toTownId,
          nodeCount: groupState.travelRoute.nodeCount,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      };
    }

    return res.json({ group: response });
  } catch (error) {
    if (handleDbError(error, res, 'travel-group-info', req)) return;
    logRouteError(req, 500, 'Travel group info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
