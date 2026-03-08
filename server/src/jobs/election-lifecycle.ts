import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, lte, and, count, desc, sql } from 'drizzle-orm';
import { elections, electionVotes, towns, characters, impeachments, kingdoms } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import type { Server } from 'socket.io';

const NOMINATION_DURATION_HOURS = 24;
const VOTING_DURATION_HOURS = 48;

export function startElectionLifecycle(io: Server) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug({ job: 'electionLifecycle' }, 'cron job started');
    try {
      await autoCreateElections(io);
      await transitionNominationsToVoting(io);
      await transitionVotingToCompleted(io);
      await resolveExpiredImpeachments(io);
      cronJobExecutions.inc({ job: 'electionLifecycle', result: 'success' });
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'electionLifecycle', result: 'failure' });
      logger.error({ job: 'electionLifecycle', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('ElectionLifecycle cron registered (every 5 minutes)');
}

/**
 * Auto-create MAYOR elections for towns that don't have an active election.
 * P1 #33 FIX: Only create elections for towns with at least MIN_ELECTION_POPULATION residents.
 */
const MIN_ELECTION_POPULATION = 3;

async function autoCreateElections(io: Server) {
  // Find towns without an active (non-COMPLETED) election
  const townsWithActiveElection = await db.query.elections.findMany({
    where: and(
      sql`${elections.phase} != 'COMPLETED'`,
      eq(elections.type, 'MAYOR'),
    ),
    columns: { townId: true },
  });

  const townIdsWithElection = new Set(townsWithActiveElection.map((e) => e.townId));

  // P1 #33 FIX: Count actual residents (characters with currentTownId) per town
  // Content gating: only create elections for released towns
  const allTowns = await db.query.towns.findMany({
    where: eq(towns.isReleased, true),
    columns: { id: true, name: true, mayorId: true },
  });

  const townsNeedingElection: { id: string; name: string }[] = [];
  for (const town of allTowns) {
    if (townIdsWithElection.has(town.id)) continue;
    if (town.mayorId) continue; // Town already has a mayor, no election needed

    // P1 #33 FIX: Skip towns with fewer than MIN_ELECTION_POPULATION residents
    const [{ residentCount }] = await db
      .select({ residentCount: count() })
      .from(characters)
      .where(eq(characters.currentTownId, town.id));
    if (residentCount < MIN_ELECTION_POPULATION) continue;

    townsNeedingElection.push(town);
  }

  for (const town of townsNeedingElection) {
    // Determine the next term number
    const lastElection = await db.query.elections.findFirst({
      where: and(eq(elections.townId, town.id), eq(elections.type, 'MAYOR')),
      orderBy: desc(elections.termNumber),
      columns: { termNumber: true },
    });

    const termNumber = (lastElection?.termNumber ?? 0) + 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(endDate.getHours() + NOMINATION_DURATION_HOURS + VOTING_DURATION_HOURS);

    const [election] = await db.insert(elections).values({
      id: crypto.randomUUID(),
      townId: town.id,
      type: 'MAYOR',
      status: 'ACTIVE',
      phase: 'NOMINATIONS',
      termNumber,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    }).returning();

    console.log(`[ElectionLifecycle] Created MAYOR election for "${town.name}" (term ${termNumber})`);

    io.emit('election:new', {
      electionId: election.id,
      townId: town.id,
      townName: town.name,
      type: 'MAYOR',
      phase: 'NOMINATIONS',
      termNumber,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    });
  }
}

/**
 * Transition elections from NOMINATIONS to VOTING after 24 hours.
 */
async function transitionNominationsToVoting(io: Server) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - NOMINATION_DURATION_HOURS);

  const electionList = await db.query.elections.findMany({
    where: and(
      eq(elections.phase, 'NOMINATIONS'),
      lte(elections.startDate, cutoff.toISOString()),
    ),
    with: {
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
      electionCandidates: { columns: { characterId: true } },
    },
  });

  for (const election of electionList) {
    // If no candidates nominated, skip to COMPLETED with no winner
    if (election.electionCandidates.length === 0) {
      await db.update(elections)
        .set({ phase: 'COMPLETED', status: 'COMPLETED' })
        .where(eq(elections.id, election.id));

      console.log(`[ElectionLifecycle] Election ${election.id} completed with no candidates`);

      io.emit('election:results', {
        electionId: election.id,
        townId: election.townId,
        townName: election.town?.name,
        kingdomId: election.kingdomId,
        kingdomName: election.kingdom?.name,
        type: election.type,
        winnerId: null,
        winnerName: null,
        reason: 'no_candidates',
      });
      continue;
    }

    await db.update(elections)
      .set({ phase: 'VOTING' })
      .where(eq(elections.id, election.id));

    const locationName = election.town?.name || election.kingdom?.name || 'Unknown';
    console.log(`[ElectionLifecycle] Election in "${locationName}" moved to VOTING phase`);

    io.emit('election:phase-changed', {
      electionId: election.id,
      townId: election.townId,
      townName: election.town?.name,
      kingdomId: election.kingdomId,
      kingdomName: election.kingdom?.name,
      type: election.type,
      previousPhase: 'NOMINATIONS',
      newPhase: 'VOTING',
      candidateCount: election.electionCandidates.length,
    });
  }
}

/**
 * Transition elections from VOTING to COMPLETED after 48 hours from the start
 * (24h nominations + 24h voting = 48h after startDate, or 24h after entering VOTING).
 * We check endDate to determine when voting closes.
 */
async function transitionVotingToCompleted(io: Server) {
  const now = new Date();

  const electionList = await db.query.elections.findMany({
    where: and(
      eq(elections.phase, 'VOTING'),
      lte(elections.endDate, now.toISOString()),
    ),
    with: {
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
      electionCandidates: {
        with: {
          character: { columns: { id: true, name: true } },
        },
      },
    },
  });

  for (const election of electionList) {
    // Tally votes per candidate using raw SQL groupBy
    const voteCounts = await db
      .select({
        candidateId: electionVotes.candidateId,
        voteCount: count(),
      })
      .from(electionVotes)
      .where(eq(electionVotes.electionId, election.id))
      .groupBy(electionVotes.candidateId);

    const voteMap = new Map(voteCounts.map((v) => [v.candidateId, v.voteCount]));

    // Find the winner (most votes, ties broken by earliest nomination)
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let maxVotes = 0;

    // Sort candidates by nomination time for tie-breaking
    const sortedCandidates = [...election.electionCandidates].sort(
      (a, b) => new Date(a.nominatedAt).getTime() - new Date(b.nominatedAt).getTime()
    );

    for (const candidate of sortedCandidates) {
      const votes = voteMap.get(candidate.characterId) || 0;
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerId = candidate.characterId;
        winnerName = candidate.character.name;
      }
    }

    // Update election as completed
    await db.update(elections)
      .set({ phase: 'COMPLETED', status: 'COMPLETED', winnerId })
      .where(eq(elections.id, election.id));

    // Appoint the winner
    if (winnerId) {
      if (election.type === 'MAYOR' && election.townId) {
        await db.update(towns)
          .set({ mayorId: winnerId })
          .where(eq(towns.id, election.townId));
        console.log(`[ElectionLifecycle] ${winnerName} appointed as mayor of "${election.town?.name}"`);
      } else if (election.type === 'RULER' && election.kingdomId) {
        await db.update(kingdoms)
          .set({ rulerId: winnerId })
          .where(eq(kingdoms.id, election.kingdomId));
        console.log(`[ElectionLifecycle] ${winnerName} appointed as ruler of "${election.kingdom?.name}"`);
      }
    }

    const locationName = election.town?.name || election.kingdom?.name || 'Unknown';
    console.log(`[ElectionLifecycle] Election in "${locationName}" COMPLETED. Winner: ${winnerName || 'none'} (${maxVotes} votes)`);

    io.emit('election:results', {
      electionId: election.id,
      townId: election.townId,
      townName: election.town?.name,
      kingdomId: election.kingdomId,
      kingdomName: election.kingdom?.name,
      type: election.type,
      winnerId,
      winnerName,
      totalVotes: voteCounts.reduce((sum, v) => sum + v.voteCount, 0),
      candidateResults: sortedCandidates.map((c) => ({
        characterId: c.characterId,
        name: c.character.name,
        votes: voteMap.get(c.characterId) || 0,
      })),
    });
  }
}

/**
 * Resolve impeachments whose voting period has expired.
 */
async function resolveExpiredImpeachments(io: Server) {
  const now = new Date();

  const expired = await db.query.impeachments.findMany({
    where: and(
      eq(impeachments.status, 'ACTIVE'),
      lte(impeachments.endsAt, now.toISOString()),
    ),
    with: {
      character: { columns: { id: true, name: true } },
      town: { columns: { id: true, name: true } },
      kingdom: { columns: { id: true, name: true } },
    },
  });

  for (const impeachment of expired) {
    // Major-POLI-02 FIX: Require majority of eligible voters, not just plurality of votes cast
    let totalEligible = 0;
    if (impeachment.townId) {
      const [{ residentCount }] = await db
        .select({ residentCount: count() })
        .from(characters)
        .where(eq(characters.currentTownId, impeachment.townId));
      totalEligible = residentCount;
    }
    const passed = totalEligible > 0
      ? impeachment.votesFor > totalEligible / 2
      : impeachment.votesFor > impeachment.votesAgainst;
    const newStatus = passed ? 'PASSED' : 'FAILED';

    await db.update(impeachments)
      .set({ status: newStatus })
      .where(eq(impeachments.id, impeachment.id));

    if (passed) {
      // Remove the official from office
      if (impeachment.townId) {
        await db.update(towns)
          .set({ mayorId: null })
          .where(eq(towns.id, impeachment.townId));
        console.log(`[ElectionLifecycle] Impeachment PASSED: ${impeachment.character.name} removed as mayor of "${impeachment.town?.name}"`);
      }

      if (impeachment.kingdomId) {
        await db.update(kingdoms)
          .set({ rulerId: null })
          .where(eq(kingdoms.id, impeachment.kingdomId));
        console.log(`[ElectionLifecycle] Impeachment PASSED: ${impeachment.character.name} removed as ruler of "${impeachment.kingdom?.name}"`);
      }

      // A new election will be auto-created on the next cron cycle for the now-vacant position
    } else {
      const locationName = impeachment.town?.name || impeachment.kingdom?.name || 'Unknown';
      console.log(`[ElectionLifecycle] Impeachment FAILED against ${impeachment.character.name} in "${locationName}"`);
    }

    io.emit('impeachment:resolved', {
      impeachmentId: impeachment.id,
      targetId: impeachment.targetId,
      targetName: impeachment.character.name,
      townId: impeachment.townId,
      townName: impeachment.town?.name,
      kingdomId: impeachment.kingdomId,
      kingdomName: impeachment.kingdom?.name,
      result: newStatus,
      votesFor: impeachment.votesFor,
      votesAgainst: impeachment.votesAgainst,
    });
  }
}
