import { db } from './db';
import { eq, sql, inArray } from 'drizzle-orm';
import { characters, characterTravelStates, groupTravelStates, travelGroups, parties } from '@database/tables';
import { logger } from './logger';
import { resolveRoadEncounter, resolveGroupRoadEncounter } from './road-encounter';
import { ACTION_XP } from '@shared/data/progression';
import { checkLevelUp } from '../services/progression';
import type { CombatRound } from './simulation/types';

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
    where: eq(characterTravelStates.status, 'traveling'),
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
            // Fled encounter: arrive at destination (escaped the fight, no penalties)
            result.soloEncounterWins++; // counts as survival for stats
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

            result.soloArrived++;
            logger.info(
              {
                characterId: traveler.characterId,
                destinationTownId,
                travelXp,
                encounter: `Fled from ${encounter.monsterName} (L${encounter.monsterLevel})`,
              },
              'Solo traveler fled road encounter, arrived at destination',
            );
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
