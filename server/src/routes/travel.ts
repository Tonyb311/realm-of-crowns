/**
 * Node-based travel routes.
 * Supports solo travel along TravelRoutes with TravelNodes,
 * and group travel via TravelGroups.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { getNextTickTime } from '../lib/game-day';

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

    const routes = await prisma.travelRoute.findMany({
      where: {
        isReleased: true,
        OR: [
          { fromTownId: character.currentTownId },
          { toTownId: character.currentTownId },
        ],
      },
      include: {
        fromTown: { select: { id: true, name: true } },
        toTown: { select: { id: true, name: true } },
      },
    });

    const routeList = routes.map(route => {
      // If character is at the toTown end, swap from/to in the response
      const isReverse = route.toTownId === character.currentTownId;
      const origin = isReverse ? route.toTown : route.fromTown;
      const destination = isReverse ? route.fromTown : route.toTown;

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
    if (handlePrismaError(error, res, 'travel-routes', req)) return;
    logRouteError(req, 500, 'Travel routes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/routes/:routeId -- Full route detail with all nodes
router.get('/routes/:routeId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { routeId } = req.params;

    const route = await prisma.travelRoute.findUnique({
      where: { id: routeId },
      include: {
        fromTown: { select: { id: true, name: true } },
        toTown: { select: { id: true, name: true } },
        travelNodes: {
          orderBy: { nodeIndex: 'asc' },
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
        fromTown: route.fromTown,
        toTown: route.toTown,
        nodeCount: route.nodeCount,
        difficulty: route.difficulty,
        terrain: route.terrain,
        dangerLevel: route.dangerLevel,
        bidirectional: route.bidirectional,
        isReleased: route.isReleased,
        nodes: route.travelNodes.map(node => ({
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
    if (handlePrismaError(error, res, 'travel-route-detail', req)) return;
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
    const partyMembership = await prisma.partyMember.findFirst({
      where: { characterId: character.id, leftAt: null },
      include: {
        party: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                character: {
                  select: { id: true, name: true, level: true, currentTownId: true, travelStatus: true },
                },
              },
            },
          },
        },
      },
    });

    const isInParty = !!partyMembership && partyMembership.party.status === 'active';
    const isPartyLeader = isInParty && partyMembership!.role === 'leader';

    // Party member but not leader → reject
    if (isInParty && !isPartyLeader) {
      return res.status(403).json({ error: 'Only the party leader can initiate travel' });
    }

    const route = await prisma.travelRoute.findUnique({
      where: { id: routeId },
      include: {
        fromTown: { select: { id: true, name: true } },
        toTown: { select: { id: true, name: true } },
        travelNodes: {
          orderBy: { nodeIndex: 'asc' },
          take: 1,
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
      const partyMembers = party.members;

      // Validate all members are in the correct town and idle
      const invalidMembers = partyMembers.filter(
        m => m.character.currentTownId !== character.currentTownId || m.character.travelStatus !== 'idle'
      );

      if (invalidMembers.length > 0) {
        const names = invalidMembers.map(m => m.character.name).join(', ');
        return res.status(400).json({
          error: `Some party members are not ready: ${names}. All members must be idle and in the same town.`,
        });
      }

      const memberCharacterIds = partyMembers.map(m => m.character.id);

      // Create a TravelGroup linked to the party, with GroupTravelState
      const groupTravelState = await prisma.$transaction(async (tx) => {
        const travelGroup = await tx.travelGroup.create({
          data: {
            leaderId: character.id,
            name: party.name || null,
            status: 'traveling',
            partyId: party.id,
          },
        });

        // Create TravelGroupMembers
        for (const member of partyMembers) {
          await tx.travelGroupMember.create({
            data: {
              groupId: travelGroup.id,
              characterId: member.character.id,
              role: member.role,
            },
          });
        }

        const gts = await tx.groupTravelState.create({
          data: {
            groupId: travelGroup.id,
            routeId: route.id,
            currentNodeIndex: 0,
            direction,
            status: 'traveling',
            speedModifier: 1,
          },
        });

        // Update all member characters
        for (const charId of memberCharacterIds) {
          await tx.character.update({
            where: { id: charId },
            data: {
              travelStatus: 'traveling_group',
              currentTownId: null,
            },
          });
        }

        return gts;
      });

      const etaTicks = calculateEtaTicks(0, route.nodeCount, direction, groupTravelState.speedModifier);

      return res.status(201).json({
        type: 'party',
        travelState: {
          id: groupTravelState.id,
          routeId: groupTravelState.routeId,
          currentNodeIndex: groupTravelState.currentNodeIndex,
          direction: groupTravelState.direction,
          status: groupTravelState.status,
          startedAt: groupTravelState.startedAt,
        },
        route: {
          name: route.name,
          fromTown: route.fromTown,
          toTown: route.toTown,
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
    const travelState = await prisma.$transaction(async (tx) => {
      const state = await tx.characterTravelState.create({
        data: {
          characterId: character.id,
          routeId: route.id,
          currentNodeIndex: 0,
          direction,
          status: 'traveling',
          speedModifier: 1,
        },
      });

      await tx.character.update({
        where: { id: character.id },
        data: {
          travelStatus: 'traveling_solo',
          currentTownId: null,
        },
      });

      return state;
    });

    const firstNode = route.travelNodes[0] || null;
    const etaTicks = calculateEtaTicks(0, route.nodeCount, direction, travelState.speedModifier);

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
        fromTown: route.fromTown,
        toTown: route.toTown,
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
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-start', req)) return;
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
        ? await prisma.town.findUnique({
            where: { id: character.currentTownId },
            select: { id: true, name: true },
          })
        : null;

      return res.json({
        traveling: false,
        town,
      });
    }

    if (character.travelStatus === 'traveling_solo') {
      const travelState = await prisma.characterTravelState.findUnique({
        where: { characterId: character.id },
        include: {
          route: {
            include: {
              fromTown: { select: { id: true, name: true } },
              toTown: { select: { id: true, name: true } },
              travelNodes: {
                orderBy: { nodeIndex: 'asc' },
              },
            },
          },
        },
      });

      if (!travelState) {
        return res.status(404).json({ error: 'Travel state not found. Your travel data may be inconsistent.' });
      }

      // Find the current node by nodeIndex
      const currentNode = travelState.route.travelNodes.find(
        n => n.nodeIndex === travelState.currentNodeIndex
      ) || null;

      const etaTicks = calculateEtaTicks(
        travelState.currentNodeIndex,
        travelState.route.nodeCount,
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
          id: travelState.route.id,
          name: travelState.route.name,
          fromTown: travelState.route.fromTown,
          toTown: travelState.route.toTown,
          nodeCount: travelState.route.nodeCount,
          terrain: travelState.route.terrain,
          dangerLevel: travelState.route.dangerLevel,
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
          total: travelState.route.nodeCount,
          percent: travelState.route.nodeCount > 0
            ? Math.round((travelState.currentNodeIndex / travelState.route.nodeCount) * 100)
            : 0,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      });
    }

    if (character.travelStatus === 'traveling_group') {
      // Find group membership for this character
      const membership = await prisma.travelGroupMember.findFirst({
        where: { characterId: character.id },
        include: {
          group: {
            include: {
              leader: { select: { id: true, name: true } },
              members: {
                include: {
                  character: { select: { id: true, name: true, level: true, race: true } },
                },
              },
              travelState: {
                include: {
                  route: {
                    include: {
                      fromTown: { select: { id: true, name: true } },
                      toTown: { select: { id: true, name: true } },
                      travelNodes: {
                        orderBy: { nodeIndex: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!membership || !membership.group.travelState) {
        return res.status(404).json({ error: 'Group travel state not found' });
      }

      const groupState = membership.group.travelState;
      const currentNode = groupState.route.travelNodes.find(
        n => n.nodeIndex === groupState.currentNodeIndex
      ) || null;

      const etaTicks = calculateEtaTicks(
        groupState.currentNodeIndex,
        groupState.route.nodeCount,
        groupState.direction,
        groupState.speedModifier,
      );

      return res.json({
        traveling: true,
        type: 'group',
        group: {
          id: membership.group.id,
          name: membership.group.name,
          leader: membership.group.leader,
          members: membership.group.members.map(m => ({
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
          id: groupState.route.id,
          name: groupState.route.name,
          fromTown: groupState.route.fromTown,
          toTown: groupState.route.toTown,
          nodeCount: groupState.route.nodeCount,
          terrain: groupState.route.terrain,
          dangerLevel: groupState.route.dangerLevel,
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
          total: groupState.route.nodeCount,
          percent: groupState.route.nodeCount > 0
            ? Math.round((groupState.currentNodeIndex / groupState.route.nodeCount) * 100)
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
    if (handlePrismaError(error, res, 'travel-status', req)) return;
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
      const travelState = await prisma.characterTravelState.findUnique({
        where: { characterId: character.id },
        include: {
          route: {
            select: { fromTownId: true, toTownId: true, nodeCount: true },
          },
        },
      });

      if (!travelState) {
        return res.status(404).json({ error: 'Travel state not found' });
      }

      const nearestTownId = getNearestTown(
        travelState.currentNodeIndex,
        travelState.route.nodeCount,
        travelState.direction,
        travelState.route.fromTownId,
        travelState.route.toTownId,
      );

      await prisma.$transaction([
        prisma.characterTravelState.delete({
          where: { characterId: character.id },
        }),
        prisma.character.update({
          where: { id: character.id },
          data: {
            travelStatus: 'idle',
            currentTownId: nearestTownId,
          },
        }),
      ]);

      const town = await prisma.town.findUnique({
        where: { id: nearestTownId },
        select: { id: true, name: true },
      });

      return res.json({
        message: 'Travel cancelled. You have returned to the nearest town.',
        town,
      });
    }

    // --- Group travel cancel (leader only) ---
    if (character.travelStatus === 'traveling_group') {
      const membership = await prisma.travelGroupMember.findFirst({
        where: { characterId: character.id },
        include: {
          group: {
            include: {
              members: {
                include: {
                  character: { select: { id: true } },
                },
              },
              travelState: {
                include: {
                  route: {
                    select: { fromTownId: true, toTownId: true, nodeCount: true },
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

      const groupState = membership.group.travelState;
      if (!groupState) {
        return res.status(400).json({ error: 'Group is not currently traveling' });
      }

      const nearestTownId = getNearestTown(
        groupState.currentNodeIndex,
        groupState.route.nodeCount,
        groupState.direction,
        groupState.route.fromTownId,
        groupState.route.toTownId,
      );

      const memberCharacterIds = membership.group.members.map(m => m.character.id);

      await prisma.$transaction(async (tx) => {
        // Delete group travel state
        await tx.groupTravelState.delete({
          where: { groupId: membership.group.id },
        });

        // Update group status
        await tx.travelGroup.update({
          where: { id: membership.group.id },
          data: { status: 'disbanded' },
        });

        // Return all members to nearest town
        for (const charId of memberCharacterIds) {
          await tx.character.update({
            where: { id: charId },
            data: {
              travelStatus: 'idle',
              currentTownId: nearestTownId,
            },
          });
        }

        // Clean up memberships
        await tx.travelGroupMember.deleteMany({
          where: { groupId: membership.group.id },
        });
      });

      const town = await prisma.town.findUnique({
        where: { id: nearestTownId },
        select: { id: true, name: true },
      });

      return res.json({
        message: 'Group travel cancelled. All members returned to the nearest town.',
        town,
        membersReturned: memberCharacterIds.length,
      });
    }

    return res.status(400).json({ error: 'Cannot cancel travel in current state' });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-cancel', req)) return;
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

    const travelState = await prisma.characterTravelState.findUnique({
      where: { characterId: character.id },
      include: {
        route: {
          include: {
            fromTown: { select: { id: true, name: true } },
            toTown: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!travelState) {
      return res.status(404).json({ error: 'Travel state not found' });
    }

    if (!travelState.route.bidirectional) {
      return res.status(400).json({ error: 'This route cannot be traveled in reverse' });
    }

    const newDirection = travelState.direction === 'forward' ? 'backward' : 'forward';

    const updated = await prisma.characterTravelState.update({
      where: { characterId: character.id },
      data: { direction: newDirection },
    });

    const etaTicks = calculateEtaTicks(
      updated.currentNodeIndex,
      travelState.route.nodeCount,
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
        name: travelState.route.name,
        fromTown: travelState.route.fromTown,
        toTown: travelState.route.toTown,
        nodeCount: travelState.route.nodeCount,
      },
      etaTicks,
      nextTickAt: getNextTickTime(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-reverse', req)) return;
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
      const travelState = await prisma.characterTravelState.findUnique({
        where: { characterId: character.id },
      });
      if (travelState) {
        routeId = travelState.routeId;
        currentNodeIndex = travelState.currentNodeIndex;
      }
    } else {
      // traveling_group
      const membership = await prisma.travelGroupMember.findFirst({
        where: { characterId: character.id },
        include: {
          group: {
            include: { travelState: true },
          },
        },
      });
      if (membership?.group.travelState) {
        routeId = membership.group.travelState.routeId;
        currentNodeIndex = membership.group.travelState.currentNodeIndex;
      }
    }

    if (!routeId || currentNodeIndex === null) {
      return res.json({ players: [] });
    }

    // Find solo travelers on the same route and node
    const soloTravelers = await prisma.characterTravelState.findMany({
      where: {
        routeId,
        currentNodeIndex,
        characterId: { not: character.id },
      },
      include: {
        character: {
          select: { id: true, name: true, level: true, race: true },
        },
      },
    });

    // Find group travelers on the same route and node
    const groupStates = await prisma.groupTravelState.findMany({
      where: {
        routeId,
        currentNodeIndex,
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                character: {
                  select: { id: true, name: true, level: true, race: true },
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
    for (const gs of groupStates) {
      for (const member of gs.group.members) {
        if (member.character.id !== character.id) {
          players.push({
            characterId: member.character.id,
            name: member.character.name,
            level: member.character.level,
            race: member.character.race,
            groupName: gs.group.name || undefined,
          });
        }
      }
    }

    return res.json({ players });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-node-players', req)) return;
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
    const existingMembership = await prisma.travelGroupMember.findFirst({
      where: { characterId: character.id },
      include: { group: { select: { status: true } } },
    });

    if (existingMembership && (existingMembership.group.status === 'forming' || existingMembership.group.status === 'traveling')) {
      return res.status(400).json({ error: 'You are already in an active travel group' });
    }

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.travelGroup.create({
        data: {
          leaderId: character.id,
          name: name || null,
          status: 'forming',
        },
      });

      await tx.travelGroupMember.create({
        data: {
          groupId: newGroup.id,
          characterId: character.id,
          role: 'leader',
        },
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
    if (handlePrismaError(error, res, 'travel-group-create', req)) return;
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

    const group = await prisma.travelGroup.findUnique({
      where: { id: groupId },
      include: {
        leader: { select: { id: true, currentTownId: true } },
        members: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
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

    if (group.members.length >= group.maxSize) {
      return res.status(400).json({ error: `Group is full (${group.maxSize}/${group.maxSize})` });
    }

    // Ensure character is in the same town as the leader
    if (character.currentTownId !== group.leader.currentTownId) {
      return res.status(400).json({ error: 'You must be in the same town as the group leader' });
    }

    // Check not already in another active group
    const existingMembership = await prisma.travelGroupMember.findFirst({
      where: { characterId: character.id },
      include: { group: { select: { status: true } } },
    });

    if (existingMembership && (existingMembership.group.status === 'forming' || existingMembership.group.status === 'traveling')) {
      return res.status(400).json({ error: 'You are already in an active travel group' });
    }

    await prisma.travelGroupMember.create({
      data: {
        groupId: group.id,
        characterId: character.id,
        role: 'member',
      },
    });

    // Fetch updated group
    const updatedGroup = await prisma.travelGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
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
        members: updatedGroup!.members.map(m => ({
          characterId: m.character.id,
          name: m.character.name,
          level: m.character.level,
          race: m.character.race,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-group-join', req)) return;
    logRouteError(req, 500, 'Travel group join error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/group/:groupId/leave -- Leave a group
router.post('/group/:groupId/leave', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;

    const group = await prisma.travelGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            character: { select: { id: true, name: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Travel group not found' });
    }

    if (group.status !== 'forming') {
      return res.status(400).json({ error: 'Cannot leave a group that is already traveling. Ask the leader to cancel.' });
    }

    const membership = group.members.find(m => m.characterId === character.id);
    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    if (membership.role === 'leader') {
      // If leader leaves, promote next member or disband
      const otherMembers = group.members.filter(m => m.characterId !== character.id);

      if (otherMembers.length === 0) {
        // No one left, disband
        await prisma.$transaction([
          prisma.travelGroupMember.deleteMany({ where: { groupId: group.id } }),
          prisma.travelGroup.delete({ where: { id: group.id } }),
        ]);

        return res.json({ message: 'You left the group and it was disbanded (no members remaining)' });
      }

      // Promote the next member to leader
      const newLeader = otherMembers[0];
      await prisma.$transaction([
        prisma.travelGroupMember.delete({
          where: { groupId_characterId: { groupId: group.id, characterId: character.id } },
        }),
        prisma.travelGroupMember.update({
          where: { id: newLeader.id },
          data: { role: 'leader' },
        }),
        prisma.travelGroup.update({
          where: { id: group.id },
          data: { leaderId: newLeader.characterId },
        }),
      ]);

      return res.json({
        message: `You left the group. ${newLeader.character.name} is now the leader.`,
        newLeaderId: newLeader.characterId,
      });
    }

    // Regular member leaving
    await prisma.travelGroupMember.delete({
      where: { groupId_characterId: { groupId: group.id, characterId: character.id } },
    });

    return res.json({ message: 'You left the travel group' });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-group-leave', req)) return;
    logRouteError(req, 500, 'Travel group leave error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/travel/group/:groupId -- Disband (leader only)
router.delete('/group/:groupId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { groupId } = req.params;

    const group = await prisma.travelGroup.findUnique({
      where: { id: groupId },
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

    await prisma.$transaction([
      prisma.travelGroupMember.deleteMany({ where: { groupId: group.id } }),
      prisma.travelGroup.delete({ where: { id: group.id } }),
    ]);

    return res.json({ message: 'Travel group disbanded' });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-group-disband', req)) return;
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

    const group = await prisma.travelGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            character: {
              select: { id: true, name: true, level: true, race: true, currentTownId: true, travelStatus: true },
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

    if (group.members.length < 2) {
      return res.status(400).json({ error: 'Group must have at least 2 members to travel' });
    }

    const route = await prisma.travelRoute.findUnique({
      where: { id: routeId },
      include: {
        fromTown: { select: { id: true, name: true } },
        toTown: { select: { id: true, name: true } },
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
    const invalidMembers = group.members.filter(
      m => m.character.currentTownId !== requiredTownId || m.character.travelStatus !== 'idle'
    );

    if (invalidMembers.length > 0) {
      const names = invalidMembers.map(m => m.character.name).join(', ');
      return res.status(400).json({
        error: `Some members are not ready: ${names}. All members must be idle and in the same town.`,
      });
    }

    const memberCharacterIds = group.members.map(m => m.character.id);

    const groupTravelState = await prisma.$transaction(async (tx) => {
      // Create group travel state
      const gts = await tx.groupTravelState.create({
        data: {
          groupId: group.id,
          routeId: route.id,
          currentNodeIndex: 0,
          direction,
          status: 'traveling',
          speedModifier: 1,
        },
      });

      // Update group status
      await tx.travelGroup.update({
        where: { id: group.id },
        data: { status: 'traveling' },
      });

      // Update all member characters
      for (const charId of memberCharacterIds) {
        await tx.character.update({
          where: { id: charId },
          data: {
            travelStatus: 'traveling_group',
            currentTownId: null,
          },
        });
      }

      return gts;
    });

    const etaTicks = calculateEtaTicks(0, route.nodeCount, direction, groupTravelState.speedModifier);

    return res.status(201).json({
      message: 'Group journey has begun',
      travelState: {
        id: groupTravelState.id,
        routeId: groupTravelState.routeId,
        currentNodeIndex: groupTravelState.currentNodeIndex,
        direction: groupTravelState.direction,
        status: groupTravelState.status,
        startedAt: groupTravelState.startedAt,
      },
      route: {
        id: route.id,
        name: route.name,
        fromTown: route.fromTown,
        toTown: route.toTown,
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
    if (handlePrismaError(error, res, 'travel-group-start', req)) return;
    logRouteError(req, 500, 'Travel group start error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/group/:groupId -- Get group info
router.get('/group/:groupId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.travelGroup.findUnique({
      where: { id: groupId },
      include: {
        leader: { select: { id: true, name: true } },
        members: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        travelState: {
          include: {
            route: {
              include: {
                fromTown: { select: { id: true, name: true } },
                toTown: { select: { id: true, name: true } },
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
      leader: group.leader,
      status: group.status,
      maxSize: group.maxSize,
      createdAt: group.createdAt,
      members: group.members.map(m => ({
        characterId: m.character.id,
        name: m.character.name,
        level: m.character.level,
        race: m.character.race,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };

    if (group.travelState) {
      const etaTicks = calculateEtaTicks(
        group.travelState.currentNodeIndex,
        group.travelState.route.nodeCount,
        group.travelState.direction,
        group.travelState.speedModifier,
      );

      response.travelState = {
        id: group.travelState.id,
        currentNodeIndex: group.travelState.currentNodeIndex,
        direction: group.travelState.direction,
        status: group.travelState.status,
        speedModifier: group.travelState.speedModifier,
        startedAt: group.travelState.startedAt,
        lastTickAt: group.travelState.lastTickAt,
        route: {
          id: group.travelState.route.id,
          name: group.travelState.route.name,
          fromTown: group.travelState.route.fromTown,
          toTown: group.travelState.route.toTown,
          nodeCount: group.travelState.route.nodeCount,
        },
        etaTicks,
        nextTickAt: getNextTickTime(),
      };
    }

    return res.json({ group: response });
  } catch (error) {
    if (handlePrismaError(error, res, 'travel-group-info', req)) return;
    logRouteError(req, 500, 'Travel group info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
