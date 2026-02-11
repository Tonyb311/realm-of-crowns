import cron from 'node-cron';
import { prisma } from '../lib/prisma';
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
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'electionLifecycle', result: 'failure' });
      logger.error({ job: 'electionLifecycle', err: error.message }, 'cron job failed');
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
  const townsWithActiveElection = await prisma.election.findMany({
    where: {
      phase: { not: 'COMPLETED' },
      type: 'MAYOR',
    },
    select: { townId: true },
  });

  const townIdsWithElection = new Set(townsWithActiveElection.map((e) => e.townId));

  // P1 #33 FIX: Count actual residents (characters with currentTownId) per town
  // Content gating: only create elections for released towns
  const allTowns = await prisma.town.findMany({
    where: { isReleased: true },
    select: { id: true, name: true, mayorId: true },
  });

  const townsNeedingElection: { id: string; name: string }[] = [];
  for (const town of allTowns) {
    if (townIdsWithElection.has(town.id)) continue;
    if (town.mayorId) continue; // Town already has a mayor, no election needed

    // P1 #33 FIX: Skip towns with fewer than MIN_ELECTION_POPULATION residents
    const residentCount = await prisma.character.count({
      where: { currentTownId: town.id },
    });
    if (residentCount < MIN_ELECTION_POPULATION) continue;

    townsNeedingElection.push(town);
  }

  for (const town of townsNeedingElection) {
    // Determine the next term number
    const lastElection = await prisma.election.findFirst({
      where: { townId: town.id, type: 'MAYOR' },
      orderBy: { termNumber: 'desc' },
      select: { termNumber: true },
    });

    const termNumber = (lastElection?.termNumber ?? 0) + 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(endDate.getHours() + NOMINATION_DURATION_HOURS + VOTING_DURATION_HOURS);

    const election = await prisma.election.create({
      data: {
        townId: town.id,
        type: 'MAYOR',
        status: 'ACTIVE',
        phase: 'NOMINATIONS',
        termNumber,
        startDate: now,
        endDate,
      },
    });

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

  const elections = await prisma.election.findMany({
    where: {
      phase: 'NOMINATIONS',
      startDate: { lte: cutoff },
    },
    include: {
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
      candidates: { select: { characterId: true } },
    },
  });

  for (const election of elections) {
    // If no candidates nominated, skip to COMPLETED with no winner
    if (election.candidates.length === 0) {
      await prisma.election.update({
        where: { id: election.id },
        data: { phase: 'COMPLETED', status: 'COMPLETED' },
      });

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

    await prisma.election.update({
      where: { id: election.id },
      data: { phase: 'VOTING' },
    });

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
      candidateCount: election.candidates.length,
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

  const elections = await prisma.election.findMany({
    where: {
      phase: 'VOTING',
      endDate: { lte: now },
    },
    include: {
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
      candidates: {
        include: {
          character: { select: { id: true, name: true } },
        },
      },
    },
  });

  for (const election of elections) {
    // Tally votes per candidate
    const voteCounts = await prisma.electionVote.groupBy({
      by: ['candidateId'],
      where: { electionId: election.id },
      _count: { candidateId: true },
    });

    const voteMap = new Map(voteCounts.map((v) => [v.candidateId, v._count.candidateId]));

    // Find the winner (most votes, ties broken by earliest nomination)
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let maxVotes = 0;

    // Sort candidates by nomination time for tie-breaking
    const sortedCandidates = [...election.candidates].sort(
      (a, b) => a.nominatedAt.getTime() - b.nominatedAt.getTime()
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
    await prisma.election.update({
      where: { id: election.id },
      data: {
        phase: 'COMPLETED',
        status: 'COMPLETED',
        winnerId,
      },
    });

    // Appoint the winner
    if (winnerId) {
      if (election.type === 'MAYOR' && election.townId) {
        await prisma.town.update({
          where: { id: election.townId },
          data: { mayorId: winnerId },
        });
        console.log(`[ElectionLifecycle] ${winnerName} appointed as mayor of "${election.town?.name}"`);
      } else if (election.type === 'RULER' && election.kingdomId) {
        await prisma.kingdom.update({
          where: { id: election.kingdomId },
          data: { rulerId: winnerId },
        });
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
      totalVotes: voteCounts.reduce((sum, v) => sum + v._count.candidateId, 0),
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

  const expired = await prisma.impeachment.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: now },
    },
    include: {
      target: { select: { id: true, name: true } },
      town: { select: { id: true, name: true } },
      kingdom: { select: { id: true, name: true } },
    },
  });

  for (const impeachment of expired) {
    // Major-POLI-02 FIX: Require majority of eligible voters, not just plurality of votes cast
    let totalEligible = 0;
    if (impeachment.townId) {
      totalEligible = await prisma.character.count({
        where: { currentTownId: impeachment.townId },
      });
    }
    const passed = totalEligible > 0
      ? impeachment.votesFor > totalEligible / 2
      : impeachment.votesFor > impeachment.votesAgainst;
    const newStatus = passed ? 'PASSED' : 'FAILED';

    await prisma.impeachment.update({
      where: { id: impeachment.id },
      data: { status: newStatus },
    });

    if (passed) {
      // Remove the official from office
      if (impeachment.townId) {
        await prisma.town.update({
          where: { id: impeachment.townId },
          data: { mayorId: null },
        });
        console.log(`[ElectionLifecycle] Impeachment PASSED: ${impeachment.target.name} removed as mayor of "${impeachment.town?.name}"`);
      }

      if (impeachment.kingdomId) {
        await prisma.kingdom.update({
          where: { id: impeachment.kingdomId },
          data: { rulerId: null },
        });
        console.log(`[ElectionLifecycle] Impeachment PASSED: ${impeachment.target.name} removed as ruler of "${impeachment.kingdom?.name}"`);
      }

      // A new election will be auto-created on the next cron cycle for the now-vacant position
    } else {
      const locationName = impeachment.town?.name || impeachment.kingdom?.name || 'Unknown';
      console.log(`[ElectionLifecycle] Impeachment FAILED against ${impeachment.target.name} in "${locationName}"`);
    }

    io.emit('impeachment:resolved', {
      impeachmentId: impeachment.id,
      targetId: impeachment.targetId,
      targetName: impeachment.target.name,
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
