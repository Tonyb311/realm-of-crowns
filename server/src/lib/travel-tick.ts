import { prisma } from './prisma';
import { logger } from './logger';
import { resolveRoadEncounter } from './road-encounter';

export interface TravelTickResult {
  soloMoved: number;
  soloArrived: number;
  soloEncountered: number;
  soloEncounterWins: number;
  soloEncounterLosses: number;
  groupsMoved: number;
  groupsArrived: number;
  errors: number;
}

/**
 * Process a single travel tick: advance all active travelers by 1 node.
 *
 * Solo travelers advance by their speedModifier (default 1) per tick.
 * Group travelers advance by 1 per tick (future: min of all member speed modifiers).
 *
 * When a traveler reaches the end (or beginning, if going backward) of
 * their route, a road encounter check is made:
 * - No encounter: character arrives at destination normally
 * - Encounter win: character arrives at destination with combat rewards
 * - Encounter loss: character is returned to origin town with death penalty
 */
export async function processTravelTick(): Promise<TravelTickResult> {
  const result: TravelTickResult = {
    soloMoved: 0,
    soloArrived: 0,
    soloEncountered: 0,
    soloEncounterWins: 0,
    soloEncounterLosses: 0,
    groupsMoved: 0,
    groupsArrived: 0,
    errors: 0,
  };

  // -----------------------------------------------------------------------
  // 1. Fetch all active solo travelers
  // -----------------------------------------------------------------------
  const soloTravelers = await prisma.characterTravelState.findMany({
    where: { status: 'traveling' },
    include: {
      route: {
        select: { nodeCount: true, fromTownId: true, toTownId: true },
      },
    },
  });

  // -----------------------------------------------------------------------
  // 2. Fetch all active group travel states
  // -----------------------------------------------------------------------
  const groupTravelers = await prisma.groupTravelState.findMany({
    where: { status: 'traveling' },
    include: {
      route: {
        select: { nodeCount: true, fromTownId: true, toTownId: true },
      },
      group: {
        include: {
          members: {
            include: {
              character: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  const now = new Date();

  // -----------------------------------------------------------------------
  // 3. Process solo travelers
  // -----------------------------------------------------------------------
  for (const traveler of soloTravelers) {
    try {
      const step = traveler.direction === 'forward'
        ? traveler.speedModifier
        : -traveler.speedModifier;
      const newIndex = traveler.currentNodeIndex + step;

      // Check if the traveler has arrived
      const arrivedForward = traveler.direction === 'forward' && newIndex > traveler.route.nodeCount;
      const arrivedBackward = traveler.direction !== 'forward' && newIndex < 1;

      if (arrivedForward || arrivedBackward) {
        // Determine origin and destination based on travel direction
        const destinationTownId = traveler.direction === 'forward'
          ? traveler.route.toTownId
          : traveler.route.fromTownId;
        const originTownId = traveler.direction === 'forward'
          ? traveler.route.fromTownId
          : traveler.route.toTownId;

        // --- Road Encounter Check ---
        const encounter = await resolveRoadEncounter(
          traveler.characterId,
          originTownId,
          destinationTownId,
        );

        if (encounter.encountered) {
          result.soloEncountered++;

          if (encounter.won) {
            // Won encounter: arrive at destination with rewards already applied
            result.soloEncounterWins++;
            await prisma.$transaction([
              prisma.character.update({
                where: { id: traveler.characterId },
                data: {
                  currentTownId: destinationTownId,
                  travelStatus: 'idle',
                },
              }),
              prisma.characterTravelState.delete({
                where: { id: traveler.id },
              }),
            ]);

            result.soloArrived++;
            logger.info(
              {
                characterId: traveler.characterId,
                destinationTownId,
                encounter: `Won vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Solo traveler won road encounter, arrived at destination',
            );
          } else {
            // Lost encounter: return to origin town (penalties already applied)
            result.soloEncounterLosses++;
            await prisma.$transaction([
              prisma.character.update({
                where: { id: traveler.characterId },
                data: {
                  currentTownId: originTownId,
                  travelStatus: 'idle',
                },
              }),
              prisma.characterTravelState.delete({
                where: { id: traveler.id },
              }),
            ]);

            logger.info(
              {
                characterId: traveler.characterId,
                originTownId,
                encounter: `Lost vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Solo traveler lost road encounter, returned to origin',
            );
          }
        } else {
          // No encounter: arrive at destination normally
          await prisma.$transaction([
            prisma.character.update({
              where: { id: traveler.characterId },
              data: {
                currentTownId: destinationTownId,
                travelStatus: 'idle',
              },
            }),
            prisma.characterTravelState.delete({
              where: { id: traveler.id },
            }),
          ]);

          result.soloArrived++;
          logger.info(
            { characterId: traveler.characterId, destinationTownId, routeNodeCount: traveler.route.nodeCount },
            'Solo traveler arrived at destination (safe journey)',
          );
        }
      } else {
        // Still en route: advance node index
        await prisma.characterTravelState.update({
          where: { id: traveler.id },
          data: {
            currentNodeIndex: newIndex,
            lastTickAt: now,
          },
        });

        result.soloMoved++;
      }
    } catch (error: any) {
      result.errors++;
      logger.error(
        { characterId: traveler.characterId, travelStateId: traveler.id, err: error.message },
        'Error processing solo traveler tick',
      );
    }
  }

  // -----------------------------------------------------------------------
  // 4. Process group travelers (encounters not yet implemented for groups)
  // -----------------------------------------------------------------------
  for (const groupState of groupTravelers) {
    try {
      // Group speed: 1 per tick (future: min of all member speed modifiers)
      const groupSpeed = 1;
      const step = groupState.direction === 'forward' ? groupSpeed : -groupSpeed;
      const newIndex = groupState.currentNodeIndex + step;

      // Check if the group has arrived
      const arrivedForward = groupState.direction === 'forward' && newIndex > groupState.route.nodeCount;
      const arrivedBackward = groupState.direction !== 'forward' && newIndex < 1;

      if (arrivedForward || arrivedBackward) {
        const destinationTownId = groupState.direction === 'forward'
          ? groupState.route.toTownId
          : groupState.route.fromTownId;

        // Collect all member character IDs
        const memberCharacterIds = groupState.group.members.map((m) => m.character.id);

        // Arrival: move ALL group members to destination town atomically
        // NOTE: Group road encounters would need special handling (shared combat?)
        // For now, groups arrive safely without encounter checks
        await prisma.$transaction([
          // Update all member characters
          prisma.character.updateMany({
            where: { id: { in: memberCharacterIds } },
            data: {
              currentTownId: destinationTownId,
              travelStatus: 'idle',
            },
          }),
          // Delete the group travel state
          prisma.groupTravelState.delete({
            where: { id: groupState.id },
          }),
          // Mark the group as arrived
          prisma.travelGroup.update({
            where: { id: groupState.groupId },
            data: { status: 'arrived' },
          }),
        ]);

        result.groupsArrived++;
        logger.info(
          {
            groupId: groupState.groupId,
            destinationTownId,
            memberCount: memberCharacterIds.length,
            routeNodeCount: groupState.route.nodeCount,
          },
          'Travel group arrived at destination',
        );
      } else {
        // Still en route: advance node index
        await prisma.groupTravelState.update({
          where: { id: groupState.id },
          data: {
            currentNodeIndex: newIndex,
            lastTickAt: now,
          },
        });

        result.groupsMoved++;
      }
    } catch (error: any) {
      result.errors++;
      logger.error(
        { groupId: groupState.groupId, groupTravelStateId: groupState.id, err: error.message },
        'Error processing group traveler tick',
      );
    }
  }

  return result;
}
