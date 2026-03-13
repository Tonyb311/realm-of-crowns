import { db } from './db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { characters, characterTravelStates, groupTravelStates, travelGroups, parties, jobs, towns } from '@database/tables';
import { logger } from './logger';
import { resolveRoadEncounter, resolveGroupRoadEncounter } from './road-encounter';
import { ACTION_XP } from '@shared/data/progression';
import { checkLevelUp } from '../services/progression';
import { emitNotification } from '../socket/events';
import type { CombatRound } from './simulation/types';

// ---------------------------------------------------------------------------
// Delivery auto-complete: when a worker arrives at a delivery destination
// ---------------------------------------------------------------------------
async function completeDeliveryJobsOnArrival(characterId: string, destinationTownId: string): Promise<number> {
  const deliveryJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.workerId, characterId),
      eq(jobs.category, 'DELIVERY'),
      eq(jobs.status, 'IN_PROGRESS'),
      eq(jobs.destinationTownId, destinationTownId),
    ),
  });

  if (deliveryJobs.length === 0) return 0;

  let completed = 0;
  for (const delivery of deliveryJobs) {
    await db.transaction(async (tx) => {
      // Transfer escrowed wage to worker
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${delivery.wage}` })
        .where(eq(characters.id, characterId));

      // Mark as DELIVERED (items held at destination for poster pickup)
      await tx.update(jobs)
        .set({
          status: 'DELIVERED',
          completedAt: new Date().toISOString(),
          result: { deliveredAt: destinationTownId, deliveredOn: new Date().toISOString() },
        })
        .where(eq(jobs.id, delivery.id));
    });

    // Notify poster
    try {
      const destTown = await db.query.towns.findFirst({
        where: eq(towns.id, destinationTownId),
        columns: { name: true },
      });
      emitNotification(delivery.posterId, {
        id: `job-delivered-${delivery.id}`,
        type: 'job:delivered',
        title: 'Delivery Arrived!',
        message: `Your delivery to ${destTown?.name ?? 'destination'} has arrived. Visit the Jobs Board there to collect your items.`,
        data: { jobId: delivery.id, destinationTownId },
      });
    } catch { /* notification is non-critical */ }

    completed++;
  }

  if (completed > 0) {
    logger.info(
      { characterId, destinationTownId, deliveriesCompleted: completed },
      'Delivery jobs auto-completed on arrival',
    );
  }

  return completed;
}

export interface TravelTickResult {
  soloMoved: number;
  soloArrived: number;
  soloEncountered: number;
  soloEncounterWins: number;
  soloEncounterLosses: number;
  groupsMoved: number;
  groupsArrived: number;
  groupEncountered: number;
  groupEncounterWins: number;
  groupEncounterLosses: number;
  errors: number;
  combatRounds: CombatRound[];
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
    groupEncountered: 0,
    groupEncounterWins: 0,
    groupEncounterLosses: 0,
    errors: 0,
    combatRounds: [],
  };

  // -----------------------------------------------------------------------
  // 1. Fetch all active solo travelers
  // -----------------------------------------------------------------------
  const soloTravelers = await db.query.characterTravelStates.findMany({
    where: inArray(characterTravelStates.status, ['traveling', 'flee_cooldown']),
    with: {
      travelRoute: {
        columns: { nodeCount: true, fromTownId: true, toTownId: true, dangerLevel: true, terrain: true },
      },
    },
  });

  // -----------------------------------------------------------------------
  // 2. Fetch all active group travel states
  // -----------------------------------------------------------------------
  const groupTravelerRows = await db.query.groupTravelStates.findMany({
    where: eq(groupTravelStates.status, 'traveling'),
    with: {
      travelRoute: {
        columns: { nodeCount: true, fromTownId: true, toTownId: true, dangerLevel: true, terrain: true },
      },
      travelGroup: {
        with: {
          party: { columns: { id: true } },
          travelGroupMembers: {
            with: {
              character: { columns: { id: true } },
            },
          },
        },
      },
    },
  });

  const now = new Date().toISOString();

  // -----------------------------------------------------------------------
  // 3. Process solo travelers
  // -----------------------------------------------------------------------
  for (const traveler of soloTravelers) {
    try {
      const route = traveler.travelRoute;
      const step = traveler.direction === 'forward'
        ? traveler.speedModifier
        : -traveler.speedModifier;
      const newIndex = traveler.currentNodeIndex + step;

      // Check if the traveler has arrived
      const arrivedForward = traveler.direction === 'forward' && newIndex > route.nodeCount;
      const arrivedBackward = traveler.direction !== 'forward' && newIndex < 1;

      if (arrivedForward || arrivedBackward) {
        // Determine origin and destination based on travel direction
        const destinationTownId = traveler.direction === 'forward'
          ? route.toTownId
          : route.fromTownId;
        const originTownId = traveler.direction === 'forward'
          ? route.fromTownId
          : route.toTownId;

        // flee_cooldown: player just fled an encounter and was moved back.
        // Skip encounter check on this arrival — the +2 tick delay is penalty enough.
        if (traveler.status === 'flee_cooldown') {
          const travelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;
          await db.transaction(async (tx) => {
            await tx.update(characters)
              .set({
                currentTownId: destinationTownId,
                travelStatus: 'idle',
                xp: sql`${characters.xp} + ${travelXp}`,
              })
              .where(eq(characters.id, traveler.characterId));
            await tx.delete(characterTravelStates)
              .where(eq(characterTravelStates.id, traveler.id));
          });

          try { await checkLevelUp(traveler.characterId); } catch { /* non-fatal */ }
          try { await completeDeliveryJobsOnArrival(traveler.characterId, destinationTownId); } catch { /* non-fatal */ }

          result.soloArrived++;
          logger.info(
            { characterId: traveler.characterId, destinationTownId, travelXp, routeNodeCount: route.nodeCount },
            'Solo traveler arrived at destination after flee detour (safe)',
          );
          continue;
        }

        // --- Road Encounter Check ---
        const encounter = await resolveRoadEncounter(
          traveler.characterId,
          originTownId,
          destinationTownId,
          { dangerLevel: route.dangerLevel, terrain: route.terrain },
        );

        if (encounter.encountered) {
          result.soloEncountered++;
          if (encounter.combatRounds) result.combatRounds.push(...encounter.combatRounds);

          if (encounter.won) {
            // Won encounter: arrive at destination with combat + travel XP
            result.soloEncounterWins++;
            const travelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;
            await db.transaction(async (tx) => {
              await tx.update(characters)
                .set({
                  currentTownId: destinationTownId,
                  travelStatus: 'idle',
                  xp: sql`${characters.xp} + ${travelXp}`,
                })
                .where(eq(characters.id, traveler.characterId));
              await tx.delete(characterTravelStates)
                .where(eq(characterTravelStates.id, traveler.id));
            });

            try { await checkLevelUp(traveler.characterId); } catch { /* non-fatal */ }
            try { await completeDeliveryJobsOnArrival(traveler.characterId, destinationTownId); } catch { /* non-fatal */ }

            result.soloArrived++;
            logger.info(
              {
                characterId: traveler.characterId,
                destinationTownId,
                travelXp,
                encounter: `Won vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Solo traveler won road encounter, arrived at destination',
            );
          } else if (encounter.fled) {
            result.soloEncounterWins++; // counts as survival for stats

            if (!encounter.fleeDelayTicks || encounter.fleeDelayTicks === 0) {
              // Pre-combat flee: free pass, arrive at destination immediately
              const travelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;
              await db.transaction(async (tx) => {
                await tx.update(characters)
                  .set({
                    currentTownId: destinationTownId,
                    travelStatus: 'idle',
                    xp: sql`${characters.xp} + ${travelXp}`,
                  })
                  .where(eq(characters.id, traveler.characterId));
                await tx.delete(characterTravelStates)
                  .where(eq(characterTravelStates.id, traveler.id));
              });

              try { await checkLevelUp(traveler.characterId); } catch { /* non-fatal */ }
              try { await completeDeliveryJobsOnArrival(traveler.characterId, destinationTownId); } catch { /* non-fatal */ }

              result.soloArrived++;
              logger.info(
                {
                  characterId: traveler.characterId,
                  destinationTownId,
                  travelXp,
                  encounter: `Pre-combat flee from ${encounter.monsterName} (L${encounter.monsterLevel})`,
                },
                'Solo traveler fled before combat, arrived at destination',
              );
            } else {
              // Mid-combat retreat: move back nodes, set flee_cooldown
              const delayNodes = encounter.fleeDelayTicks;
              const movedBackIndex = traveler.direction === 'forward'
                ? Math.max(1, traveler.currentNodeIndex - delayNodes)
                : Math.min(route.nodeCount, traveler.currentNodeIndex + delayNodes);

              await db.update(characterTravelStates)
                .set({
                  currentNodeIndex: movedBackIndex,
                  status: 'flee_cooldown',
                  lastTickAt: now,
                })
                .where(eq(characterTravelStates.id, traveler.id));

              result.soloMoved++;
              logger.info(
                {
                  characterId: traveler.characterId,
                  movedBackIndex,
                  delayNodes,
                  encounter: `Fled from ${encounter.monsterName} (L${encounter.monsterLevel})`,
                },
                'Solo traveler fled road encounter, moved back for detour (+2 ticks)',
              );
            }
          } else {
            // Lost encounter: return to origin town (penalties already applied, travel XP still granted)
            result.soloEncounterLosses++;
            const lostTravelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;
            await db.transaction(async (tx) => {
              await tx.update(characters)
                .set({
                  currentTownId: originTownId,
                  travelStatus: 'idle',
                  xp: sql`${characters.xp} + ${lostTravelXp}`,
                })
                .where(eq(characters.id, traveler.characterId));
              await tx.delete(characterTravelStates)
                .where(eq(characterTravelStates.id, traveler.id));
            });

            try { await checkLevelUp(traveler.characterId); } catch { /* non-fatal */ }

            logger.info(
              {
                characterId: traveler.characterId,
                originTownId,
                travelXp: lostTravelXp,
                encounter: `Lost vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Solo traveler lost road encounter, returned to origin',
            );
          }
        } else {
          // No encounter: arrive at destination with travel XP
          const safeTravelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;
          await db.transaction(async (tx) => {
            await tx.update(characters)
              .set({
                currentTownId: destinationTownId,
                travelStatus: 'idle',
                xp: sql`${characters.xp} + ${safeTravelXp}`,
              })
              .where(eq(characters.id, traveler.characterId));
            await tx.delete(characterTravelStates)
              .where(eq(characterTravelStates.id, traveler.id));
          });

          try { await checkLevelUp(traveler.characterId); } catch { /* non-fatal */ }
          try { await completeDeliveryJobsOnArrival(traveler.characterId, destinationTownId); } catch { /* non-fatal */ }

          result.soloArrived++;
          logger.info(
            { characterId: traveler.characterId, destinationTownId, travelXp: safeTravelXp, routeNodeCount: route.nodeCount },
            'Solo traveler arrived at destination (safe journey)',
          );
        }
      } else {
        // Still en route: advance node index
        await db.update(characterTravelStates)
          .set({
            currentNodeIndex: newIndex,
            lastTickAt: now,
          })
          .where(eq(characterTravelStates.id, traveler.id));

        result.soloMoved++;
      }
    } catch (error: unknown) {
      result.errors++;
      logger.error(
        { characterId: traveler.characterId, travelStateId: traveler.id, err: error instanceof Error ? error.message : String(error) },
        'Error processing solo traveler tick',
      );
    }
  }

  // -----------------------------------------------------------------------
  // 4. Process group travelers (with group road encounters)
  // -----------------------------------------------------------------------
  for (const groupState of groupTravelerRows) {
    try {
      const route = groupState.travelRoute;
      // Group speed: 1 per tick (future: min of all member speed modifiers)
      const groupSpeed = 1;
      const step = groupState.direction === 'forward' ? groupSpeed : -groupSpeed;
      const newIndex = groupState.currentNodeIndex + step;

      // Check if the group has arrived
      const arrivedForward = groupState.direction === 'forward' && newIndex > route.nodeCount;
      const arrivedBackward = groupState.direction !== 'forward' && newIndex < 1;

      if (arrivedForward || arrivedBackward) {
        const destinationTownId = groupState.direction === 'forward'
          ? route.toTownId
          : route.fromTownId;
        const originTownId = groupState.direction === 'forward'
          ? route.fromTownId
          : route.toTownId;

        // Collect all member character IDs
        const memberCharacterIds = groupState.travelGroup.travelGroupMembers.map((m) => m.character.id);
        const groupPartyId = groupState.travelGroup.party?.id ?? undefined;

        // --- Group Road Encounter Check ---
        const encounter = await resolveGroupRoadEncounter(
          memberCharacterIds,
          originTownId,
          destinationTownId,
          { dangerLevel: route.dangerLevel, terrain: route.terrain },
          groupPartyId,
        );

        const groupTravelXp = ACTION_XP.TRAVEL_PER_NODE * route.nodeCount;

        if (encounter.encountered) {
          result.groupEncountered++;
          if (encounter.combatRounds) result.combatRounds.push(...encounter.combatRounds);

          if (encounter.won) {
            // Won encounter: all members arrive at destination with travel XP
            result.groupEncounterWins++;
            await db.transaction(async (tx) => {
              await tx.update(characters)
                .set({
                  currentTownId: destinationTownId,
                  travelStatus: 'idle',
                  xp: sql`${characters.xp} + ${groupTravelXp}`,
                })
                .where(inArray(characters.id, memberCharacterIds));
              await tx.delete(groupTravelStates)
                .where(eq(groupTravelStates.id, groupState.id));
              await tx.update(travelGroups)
                .set({ status: 'arrived' })
                .where(eq(travelGroups.id, groupState.groupId));
              if (groupPartyId) {
                await tx.update(parties)
                  .set({ townId: destinationTownId })
                  .where(eq(parties.id, groupPartyId));
              }
            });

            // Level-up check for each member (non-fatal)
            for (const charId of memberCharacterIds) {
              try { await checkLevelUp(charId); } catch { /* non-fatal */ }
              try { await completeDeliveryJobsOnArrival(charId, destinationTownId); } catch { /* non-fatal */ }
            }

            result.groupsArrived++;
            logger.info(
              {
                groupId: groupState.groupId,
                destinationTownId,
                memberCount: memberCharacterIds.length,
                encounter: `Won vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Travel group won road encounter, arrived at destination',
            );
          } else {
            // Lost encounter: all members return to origin town (penalties already applied)
            result.groupEncounterLosses++;
            await db.transaction(async (tx) => {
              await tx.update(characters)
                .set({
                  currentTownId: originTownId,
                  travelStatus: 'idle',
                  xp: sql`${characters.xp} + ${groupTravelXp}`,
                })
                .where(inArray(characters.id, memberCharacterIds));
              await tx.delete(groupTravelStates)
                .where(eq(groupTravelStates.id, groupState.id));
              await tx.update(travelGroups)
                .set({ status: 'arrived' })
                .where(eq(travelGroups.id, groupState.groupId));
              if (groupPartyId) {
                await tx.update(parties)
                  .set({ townId: originTownId })
                  .where(eq(parties.id, groupPartyId));
              }
            });

            // Level-up check for each member (non-fatal)
            for (const charId of memberCharacterIds) {
              try { await checkLevelUp(charId); } catch { /* non-fatal */ }
            }

            logger.info(
              {
                groupId: groupState.groupId,
                originTownId,
                memberCount: memberCharacterIds.length,
                encounter: `Lost vs ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Travel group lost road encounter, returned to origin',
            );
          }
        } else {
          // No encounter: arrive at destination with travel XP
          await db.transaction(async (tx) => {
            await tx.update(characters)
              .set({
                currentTownId: destinationTownId,
                travelStatus: 'idle',
                xp: sql`${characters.xp} + ${groupTravelXp}`,
              })
              .where(inArray(characters.id, memberCharacterIds));
            await tx.delete(groupTravelStates)
              .where(eq(groupTravelStates.id, groupState.id));
            await tx.update(travelGroups)
              .set({ status: 'arrived' })
              .where(eq(travelGroups.id, groupState.groupId));
            if (groupPartyId) {
              await tx.update(parties)
                .set({ townId: destinationTownId })
                .where(eq(parties.id, groupPartyId));
            }
          });

          // Level-up check for each member (non-fatal)
          for (const charId of memberCharacterIds) {
            try { await checkLevelUp(charId); } catch { /* non-fatal */ }
            try { await completeDeliveryJobsOnArrival(charId, destinationTownId); } catch { /* non-fatal */ }
          }

          result.groupsArrived++;
          logger.info(
            {
              groupId: groupState.groupId,
              destinationTownId,
              memberCount: memberCharacterIds.length,
              routeNodeCount: route.nodeCount,
            },
            'Travel group arrived at destination (safe journey)',
          );
        }
      } else {
        // Still en route: advance node index
        await db.update(groupTravelStates)
          .set({
            currentNodeIndex: newIndex,
            lastTickAt: now,
          })
          .where(eq(groupTravelStates.id, groupState.id));

        result.groupsMoved++;
      }
    } catch (error: unknown) {
      result.errors++;
      logger.error(
        { groupId: groupState.groupId, groupTravelStateId: groupState.id, err: error instanceof Error ? error.message : String(error) },
        'Error processing group traveler tick',
      );
    }
  }

  return result;
}
