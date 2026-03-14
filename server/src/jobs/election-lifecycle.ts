import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, lte, and, ne, count, desc, sql, isNull, gte } from 'drizzle-orm';
import { elections, electionVotes, towns, characters, impeachments, kingdoms, churchChapters, gods, referendums, townPolicies, townTreasuries, racialReputations, townTreaties, councilMembers } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import type { Server } from 'socket.io';
import { logTownEvent } from '../services/history-logger';
import { addRacialReputation } from '../services/reputation';

const NOMINATION_DURATION_HOURS = 24;
const VOTING_DURATION_HOURS = 48;

/**
 * Batch-fetch all town IDs currently under martial law.
 * Called once per cron cycle and passed to all functions.
 */
async function getMartialLawTowns(): Promise<Set<string>> {
  const now = new Date().toISOString();
  const allPolicies = await db.query.townPolicies.findMany({
    columns: { townId: true, tradePolicy: true },
  });
  const martialLawTownIds = new Set<string>();
  for (const p of allPolicies) {
    const tp = p.tradePolicy as Record<string, any> | null;
    if (tp?.martialLawUntil && new Date(tp.martialLawUntil) > new Date(now)) {
      martialLawTownIds.add(p.townId);
    }
  }
  return martialLawTownIds;
}

export function startElectionLifecycle(io: Server) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug({ job: 'electionLifecycle' }, 'cron job started');
    try {
      // Batch-fetch martial law towns once for the entire cycle
      const martialLawTowns = await getMartialLawTowns();

      await autoCreateElections(io, martialLawTowns);
      await autoCreateHighPriestElections(io, martialLawTowns);
      await transitionNominationsToVoting(io, martialLawTowns);
      await transitionVotingToCompleted(io, martialLawTowns);
      await resolveExpiredImpeachments(io, martialLawTowns);
      await resolveExpiredReferendums(io, martialLawTowns);
      await expireMartialLaw(io);
      await expireCrisesOfFaith(io);
      await resolveExpiredTreatyRatifications(io);
      await processTreatyLifecycle(io);
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

async function autoCreateElections(io: Server, martialLawTowns: Set<string>) {
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
    if (martialLawTowns.has(town.id)) {
      console.log(`[ElectionLifecycle] Skipping election for "${town.name}" — under martial law`);
      continue;
    }

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
 * Auto-create HIGH_PRIEST elections for church chapters at CHAPTER tier+ with no High Priest.
 */
async function autoCreateHighPriestElections(io: Server, martialLawTowns: Set<string>) {
  // Find chapters at CHAPTER tier or higher with no high priest
  const eligibleChapters = await db.query.churchChapters.findMany({
    where: and(
      isNull(churchChapters.highPriestId),
      gte(churchChapters.memberCount, MIN_ELECTION_POPULATION),
    ),
    with: {
      god: { columns: { id: true, name: true, churchName: true } },
      town: { columns: { id: true, name: true } },
    },
  });

  // Filter to CHAPTER tier+ (CHAPTER, ESTABLISHED, DOMINANT), exclude martial law towns
  const chapterTierPlus = eligibleChapters.filter(ch => {
    if (ch.tier === 'MINORITY') return false;
    if (martialLawTowns.has(ch.townId)) {
      console.log(`[ElectionLifecycle] Skipping HP election for ${ch.god.churchName} in "${ch.town.name}" — under martial law`);
      return false;
    }
    return true;
  });

  if (chapterTierPlus.length === 0) return;

  // Find existing active HIGH_PRIEST elections to avoid duplicates
  const activeHPElections = await db.query.elections.findMany({
    where: and(
      eq(elections.type, 'HIGH_PRIEST'),
      ne(elections.phase, 'COMPLETED'),
    ),
    columns: { godId: true, townId: true },
  });
  const activeKeys = new Set(activeHPElections.map(e => `${e.godId}:${e.townId}`));

  for (const chapter of chapterTierPlus) {
    const key = `${chapter.godId}:${chapter.townId}`;
    if (activeKeys.has(key)) continue;

    // Determine the next term number for this god+town
    const lastElection = await db.query.elections.findFirst({
      where: and(
        eq(elections.townId, chapter.townId),
        eq(elections.type, 'HIGH_PRIEST'),
        eq(elections.godId, chapter.godId),
      ),
      orderBy: desc(elections.termNumber),
      columns: { termNumber: true },
    });

    const termNumber = (lastElection?.termNumber ?? 0) + 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(endDate.getHours() + NOMINATION_DURATION_HOURS + VOTING_DURATION_HOURS);

    const [election] = await db.insert(elections).values({
      id: crypto.randomUUID(),
      townId: chapter.townId,
      type: 'HIGH_PRIEST',
      godId: chapter.godId,
      status: 'ACTIVE',
      phase: 'NOMINATIONS',
      termNumber,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    }).returning();

    console.log(`[ElectionLifecycle] Created HIGH_PRIEST election for ${chapter.god.churchName} in "${chapter.town.name}" (term ${termNumber})`);

    io.emit('election:new', {
      electionId: election.id,
      townId: chapter.townId,
      townName: chapter.town.name,
      type: 'HIGH_PRIEST',
      godId: chapter.godId,
      godName: chapter.god.name,
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
async function transitionNominationsToVoting(io: Server, martialLawTowns: Set<string>) {
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
    // Cancel elections in martial law towns
    if (election.townId && martialLawTowns.has(election.townId)) {
      await db.update(elections)
        .set({ phase: 'COMPLETED', status: 'COMPLETED' })
        .where(eq(elections.id, election.id));

      const locationName = election.town?.name || 'Unknown';
      console.log(`[ElectionLifecycle] Election in "${locationName}" cancelled — martial law`);

      io.emit('election:results', {
        electionId: election.id,
        townId: election.townId,
        townName: election.town?.name,
        type: election.type,
        winnerId: null,
        winnerName: null,
        reason: 'martial_law',
      });
      continue;
    }

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
async function transitionVotingToCompleted(io: Server, martialLawTowns: Set<string>) {
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

  // Also cancel any VOTING-phase elections in martial law towns (regardless of endDate)
  if (martialLawTowns.size > 0) {
    const martialLawElections = await db.query.elections.findMany({
      where: and(
        eq(elections.phase, 'VOTING'),
        sql`${elections.townId} IN (${sql.join(Array.from(martialLawTowns).map(id => sql`${id}`), sql`, `)})`,
      ),
      with: {
        town: { columns: { id: true, name: true } },
      },
    });
    for (const ml of martialLawElections) {
      await db.update(elections)
        .set({ phase: 'COMPLETED', status: 'COMPLETED' })
        .where(eq(elections.id, ml.id));
      console.log(`[ElectionLifecycle] Election in "${ml.town?.name}" cancelled during voting — martial law`);
      io.emit('election:results', {
        electionId: ml.id,
        townId: ml.townId,
        townName: ml.town?.name,
        type: ml.type,
        winnerId: null,
        winnerName: null,
        reason: 'martial_law',
      });
    }
  }

  for (const election of electionList) {
    // Skip if already cancelled by martial law above
    if (election.townId && martialLawTowns.has(election.townId)) continue;

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

        // Clear sheriff on new mayor — new mayor appoints their own
        const oldPolicy = await db.query.townPolicies.findFirst({
          where: eq(townPolicies.townId, election.townId),
          with: { character: { columns: { name: true } } },
        });
        if (oldPolicy?.sheriffId) {
          const oldSheriffName = oldPolicy.character?.name ?? 'Unknown';
          await db.update(townPolicies)
            .set({ sheriffId: null, sheriffBudgetUsedToday: 0 })
            .where(eq(townPolicies.townId, election.townId));
          console.log(`[ElectionLifecycle] Sheriff ${oldSheriffName} removed — new mayor ${winnerName} elected in "${election.town?.name}"`);
          logTownEvent(election.townId, 'GOVERNANCE', `Sheriff Removed`, `Sheriff ${oldSheriffName} was removed after ${winnerName} was elected mayor.`, winnerId).catch(() => {});
        }
      } else if (election.type === 'RULER' && election.kingdomId) {
        await db.update(kingdoms)
          .set({ rulerId: winnerId })
          .where(eq(kingdoms.id, election.kingdomId));
        console.log(`[ElectionLifecycle] ${winnerName} appointed as ruler of "${election.kingdom?.name}"`);
      } else if (election.type === 'HIGH_PRIEST' && election.godId && election.townId) {
        await db.update(churchChapters)
          .set({ highPriestId: winnerId })
          .where(and(
            eq(churchChapters.godId, election.godId),
            eq(churchChapters.townId, election.townId),
          ));
        const god = await db.query.gods.findFirst({ where: eq(gods.id, election.godId), columns: { churchName: true } });
        console.log(`[ElectionLifecycle] ${winnerName} appointed as High Priest of ${god?.churchName ?? 'church'} in "${election.town?.name}"`);
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

    // Fire-and-forget historical logging
    if (election.townId) {
      const totalVotes = voteCounts.reduce((sum, v) => sum + v.voteCount, 0);
      logTownEvent(
        election.townId,
        'ELECTION',
        winnerId
          ? `${election.type === 'HIGH_PRIEST' ? 'High Priest' : 'Mayor'} Election Won by ${winnerName}`
          : `${election.type === 'HIGH_PRIEST' ? 'High Priest' : 'Mayor'} Election — No Winner`,
        winnerId
          ? `${winnerName} was elected with ${maxVotes} votes out of ${totalVotes} total.`
          : `Election completed with no winner.`,
        winnerId ?? undefined,
        undefined,
        { electionType: election.type, totalVotes, votesByCandidate: Object.fromEntries(voteMap) },
      ).catch(() => {});
    }
  }
}

/**
 * Resolve impeachments whose voting period has expired.
 */
async function resolveExpiredImpeachments(io: Server, martialLawTowns: Set<string>) {
  const now = new Date();

  // Cancel active impeachments in martial law towns
  if (martialLawTowns.size > 0) {
    const mlImpeachments = await db.query.impeachments.findMany({
      where: eq(impeachments.status, 'ACTIVE'),
      with: {
        character: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
      },
    });
    for (const imp of mlImpeachments) {
      if (imp.townId && martialLawTowns.has(imp.townId)) {
        await db.update(impeachments)
          .set({ status: 'FAILED' })
          .where(eq(impeachments.id, imp.id));
        console.log(`[ElectionLifecycle] Impeachment against ${imp.character.name} in "${imp.town?.name}" cancelled — martial law`);
        io.emit('impeachment:resolved', {
          impeachmentId: imp.id,
          targetId: imp.targetId,
          targetName: imp.character.name,
          townId: imp.townId,
          townName: imp.town?.name,
          result: 'FAILED',
          reason: 'martial_law',
          votesFor: imp.votesFor,
          votesAgainst: imp.votesAgainst,
        });
      }
    }
  }

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

/**
 * Resolve referendums whose voting period has expired.
 * Simple majority: votesFor > votesAgainst (strictly greater, ties → FAILED).
 */
async function resolveExpiredReferendums(io: Server, martialLawTowns: Set<string>) {
  const now = new Date();

  // Cancel active referendums in martial law towns
  if (martialLawTowns.size > 0) {
    const activeRefs = await db.query.referendums.findMany({
      where: eq(referendums.status, 'VOTING'),
    });
    for (const ref of activeRefs) {
      if (martialLawTowns.has(ref.townId)) {
        await db.update(referendums).set({
          status: 'FAILED',
          resolvedAt: now.toISOString(),
        }).where(eq(referendums.id, ref.id));
        console.log(`[ElectionLifecycle] Referendum "${ref.question}" in town ${ref.townId} cancelled — martial law`);
        io.emit('referendum:resolved', {
          referendumId: ref.id,
          townId: ref.townId,
          passed: false,
          votesFor: ref.votesFor,
          votesAgainst: ref.votesAgainst,
          question: ref.question,
          policyType: ref.policyType,
          reason: 'martial_law',
        });
      }
    }
  }

  const expiredRefs = await db.query.referendums.findMany({
    where: and(
      eq(referendums.status, 'VOTING'),
      lte(referendums.endsAt, now.toISOString()),
    ),
  });

  for (const ref of expiredRefs) {
    const passed = ref.votesFor > ref.votesAgainst; // strictly greater — ties fail

    if (passed) {
      await applyReferendumPolicy(ref);
    } else if (ref.policyType === 'RECKONING') {
      // RECKONING FAILED: 10% of Seraphiel members in this town lose their faith
      await applyReckoningFailed(ref.townId);
    }

    await db.update(referendums).set({
      status: passed ? 'PASSED' : 'FAILED',
      resolvedAt: now.toISOString(),
    }).where(eq(referendums.id, ref.id));

    console.log(`[ElectionLifecycle] Referendum ${ref.id} ${passed ? 'PASSED' : 'FAILED'} (${ref.votesFor} for, ${ref.votesAgainst} against): "${ref.question}"`);

    io.emit('referendum:resolved', {
      referendumId: ref.id,
      townId: ref.townId,
      passed,
      votesFor: ref.votesFor,
      votesAgainst: ref.votesAgainst,
      question: ref.question,
      policyType: ref.policyType,
    });

    // Fire-and-forget historical logging
    logTownEvent(
      ref.townId,
      'REFERENDUM',
      `Referendum ${passed ? 'Passed' : 'Failed'}: ${ref.question}`,
      `Vote result: ${ref.votesFor} for, ${ref.votesAgainst} against. Policy type: ${ref.policyType}.`,
      undefined,
      undefined,
      { policyType: ref.policyType, votesFor: ref.votesFor, votesAgainst: ref.votesAgainst, passed },
    ).catch(() => {});
  }
}

/**
 * Apply referendum policy change — mirrors governance.ts patterns exactly.
 */
async function applyReferendumPolicy(ref: { townId: string; policyType: string; policyValue: unknown }) {
  const pv = ref.policyValue as Record<string, any>;

  switch (ref.policyType) {
    case 'tax_rate': {
      const taxRate = pv.taxRate ?? pv.value;
      if (typeof taxRate !== 'number') break;

      // Mirror governance.ts set-tax: upsert townPolicies + sync townTreasuries
      const existingPolicy = await db.query.townPolicies.findFirst({
        where: eq(townPolicies.townId, ref.townId),
      });
      if (existingPolicy) {
        await db.update(townPolicies).set({ taxRate }).where(eq(townPolicies.townId, ref.townId));
      } else {
        await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId: ref.townId, taxRate });
      }

      const existingTreasury = await db.query.townTreasuries.findFirst({
        where: eq(townTreasuries.townId, ref.townId),
      });
      if (existingTreasury) {
        await db.update(townTreasuries).set({ taxRate }).where(eq(townTreasuries.townId, ref.townId));
      } else {
        await db.insert(townTreasuries).values({ id: crypto.randomUUID(), townId: ref.townId, taxRate });
      }

      console.log(`[ElectionLifecycle] Referendum applied tax_rate=${taxRate} to town ${ref.townId}`);
      break;
    }
    case 'building_permits': {
      const permits = pv.buildingPermits ?? pv.value;
      if (typeof permits !== 'boolean') break;

      const existingPolicy = await db.query.townPolicies.findFirst({
        where: eq(townPolicies.townId, ref.townId),
      });
      if (existingPolicy) {
        await db.update(townPolicies).set({ buildingPermits: permits }).where(eq(townPolicies.townId, ref.townId));
      } else {
        await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId: ref.townId, buildingPermits: permits });
      }

      console.log(`[ElectionLifecycle] Referendum applied building_permits=${permits} to town ${ref.townId}`);
      break;
    }
    case 'trade_policy': {
      const existingPolicy = await db.query.townPolicies.findFirst({
        where: eq(townPolicies.townId, ref.townId),
      });
      const existingTp = (existingPolicy?.tradePolicy as Record<string, any>) || {};
      const newTp = { ...existingTp, ...pv };

      if (existingPolicy) {
        await db.update(townPolicies).set({ tradePolicy: newTp }).where(eq(townPolicies.townId, ref.townId));
      } else {
        await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId: ref.townId, tradePolicy: newTp });
      }

      console.log(`[ElectionLifecycle] Referendum applied trade_policy to town ${ref.townId}`);
      break;
    }
    case 'RECKONING': {
      const targetRace = pv.targetRace as string;
      const penalty = pv.penalty as number ?? -10;

      // Apply reputation penalty to ALL characters in this town
      const townChars = await db.query.characters.findMany({
        where: eq(characters.homeTownId, ref.townId),
        columns: { id: true },
      });

      for (const ch of townChars) {
        // Direct upsert — bypass religion multipliers for penalty application
        await db.insert(racialReputations)
          .values({
            id: crypto.randomUUID(),
            characterId: ch.id,
            race: targetRace,
            score: Math.max(-100, Math.min(100, penalty)),
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: [racialReputations.characterId, racialReputations.race],
            set: {
              score: sql`LEAST(100, GREATEST(-100, ${racialReputations.score} + ${penalty}))`,
              updatedAt: new Date().toISOString(),
            },
          });
      }

      console.log(`[ElectionLifecycle] Reckoning PASSED: ${penalty} reputation with ${targetRace} applied to ${townChars.length} characters in town ${ref.townId}`);

      // Fire-and-forget historical logging
      logTownEvent(
        ref.townId,
        'RECKONING',
        `Reckoning Passed — ${targetRace} Held Accountable`,
        `${townChars.length} town residents received ${penalty} reputation with ${targetRace}. Grievance: ${pv.grievance}`,
        undefined,
        targetRace,
        { targetRace, penalty, affectedCount: townChars.length, grievance: pv.grievance },
      ).catch(() => {});
      break;
    }
    default:
      console.warn(`[ElectionLifecycle] Unknown referendum policy type: ${ref.policyType}`);
  }
}

/**
 * Handle RECKONING FAILED: 10% of Seraphiel members in this town lose their faith.
 * LOCAL ONLY — only affects the chapter in the town where the Reckoning was called.
 */
async function applyReckoningFailed(townId: string) {
  const chapter = await db.query.churchChapters.findFirst({
    where: and(
      eq(churchChapters.godId, 'seraphiel'),
      eq(churchChapters.townId, townId),
    ),
  });
  if (!chapter || chapter.memberCount <= 0) return;

  const lossCount = Math.max(1, Math.floor(chapter.memberCount * 0.10));

  // Find random Seraphiel members in this town
  const seraphielMembers = await db.query.characters.findMany({
    where: and(
      eq(characters.patronGodId, 'seraphiel'),
      eq(characters.homeTownId, townId),
    ),
    columns: { id: true, name: true },
  });

  // Shuffle and take lossCount
  const shuffled = seraphielMembers.sort(() => Math.random() - 0.5);
  const toDeconvert = shuffled.slice(0, lossCount);

  for (const ch of toDeconvert) {
    await db.update(characters)
      .set({ patronGodId: null })
      .where(eq(characters.id, ch.id));
  }

  // Decrement chapter member count
  await db.update(churchChapters)
    .set({ memberCount: sql`GREATEST(0, ${churchChapters.memberCount} - ${toDeconvert.length})` })
    .where(eq(churchChapters.id, chapter.id));

  console.log(`[ElectionLifecycle] Reckoning FAILED: ${toDeconvert.length} Seraphiel members deconverted in town ${townId}`);

  // Fire-and-forget historical logging
  logTownEvent(
    townId,
    'RECKONING',
    `Reckoning Failed — ${toDeconvert.length} Left the Choir of Ashes`,
    `The Reckoning was rejected by the town. ${toDeconvert.length} Seraphiel members lost their faith in disgust.`,
    undefined,
    undefined,
    { deconvertedCount: toDeconvert.length, deconvertedNames: toDeconvert.map(c => c.name) },
  ).catch(() => {});
}

/**
 * Expire martial law in towns where martialLawUntil has passed.
 * Clears the martial law fields so elections can resume.
 */
async function expireMartialLaw(io: Server) {
  const now = new Date();
  const allPolicies = await db.query.townPolicies.findMany({
    columns: { townId: true, tradePolicy: true },
  });

  for (const p of allPolicies) {
    const tp = p.tradePolicy as Record<string, any> | null;
    if (!tp?.martialLawUntil) continue;
    if (new Date(tp.martialLawUntil) > now) continue; // still active

    // Martial law has expired — clear the fields
    const { martialLawUntil, martialLawDeclaredBy, martialLawDeclaredAt, ...rest } = tp;
    await db.update(townPolicies).set({
      tradePolicy: rest,
    }).where(eq(townPolicies.townId, p.townId));

    const town = await db.query.towns.findFirst({
      where: eq(towns.id, p.townId),
      columns: { name: true },
    });
    console.log(`[ElectionLifecycle] Martial law has ended in "${town?.name ?? p.townId}"`);

    io.emit('martial-law:expired', { townId: p.townId, townName: town?.name });

    // Fire-and-forget historical logging
    logTownEvent(
      p.townId,
      'MARTIAL_LAW',
      'Martial Law Ended',
      `Martial law has expired in ${town?.name ?? 'the town'}.`,
    ).catch(() => {});
  }
}

/**
 * Expire Crises of Faith where the 7-day duration has passed.
 * Clears the crisisOfFaith field from tradePolicy JSONB.
 */
async function expireCrisesOfFaith(io: Server) {
  const now = new Date();
  const allPolicies = await db.query.townPolicies.findMany({
    columns: { townId: true, tradePolicy: true },
  });

  for (const p of allPolicies) {
    const tp = p.tradePolicy as Record<string, any> | null;
    if (!tp?.crisisOfFaith) continue;
    const crisis = tp.crisisOfFaith as { targetGodId: string; until: string; triggeredBy?: string };
    if (new Date(crisis.until) > now) continue; // still active

    // Crisis has expired — clear the field
    const { crisisOfFaith, ...rest } = tp;
    await db.update(townPolicies).set({
      tradePolicy: rest,
    }).where(eq(townPolicies.townId, p.townId));

    const town = await db.query.towns.findFirst({
      where: eq(towns.id, p.townId),
      columns: { name: true },
    });
    const targetGod = await db.query.gods.findFirst({
      where: eq(gods.id, crisis.targetGodId),
      columns: { name: true, churchName: true },
    });

    console.log(`[ElectionLifecycle] Crisis of Faith against ${targetGod?.churchName ?? crisis.targetGodId} has ended in "${town?.name ?? p.townId}"`);

    io.emit('crisis-of-faith:expired', {
      townId: p.townId,
      townName: town?.name,
      targetGodId: crisis.targetGodId,
      targetChurchName: targetGod?.churchName,
    });

    // Fire-and-forget historical logging
    logTownEvent(
      p.townId,
      'CRISIS_OF_FAITH',
      `Crisis of Faith Against ${targetGod?.churchName ?? 'Unknown'} Has Ended`,
      `The Crisis of Faith declared against ${targetGod?.churchName ?? crisis.targetGodId} has expired in ${town?.name ?? 'the town'}.`,
      undefined,
      undefined,
      { targetGodId: crisis.targetGodId, targetChurchName: targetGod?.churchName },
    ).catch(() => {});
  }
}

// =========================================================================
// Treaty Ratification Resolution
// =========================================================================

async function resolveExpiredTreatyRatifications(io: Server) {
  const now = new Date();
  const nowStr = now.toISOString();

  const expiredRats = await db.query.townTreaties.findMany({
    where: and(
      eq(townTreaties.status, 'PENDING_RATIFICATION'),
      lte(townTreaties.ratificationEndsAt, nowStr),
    ),
    with: {
      townA: { columns: { id: true, name: true } },
      townB: { columns: { id: true, name: true } },
    },
  });

  if (expiredRats.length === 0) return;

  const { applyTreatyEffects } = await import('../services/treaty-effects');

  for (const treaty of expiredRats) {
    try {
      // Check council counts for auto-pass logic
      const [townACouncil, townBCouncil] = await Promise.all([
        db.select({ count: count() }).from(councilMembers).where(eq(councilMembers.townId, treaty.townAId)),
        db.select({ count: count() }).from(councilMembers).where(eq(councilMembers.townId, treaty.townBId)),
      ]);

      const townAHasCouncil = (townACouncil[0]?.count ?? 0) > 0;
      const townBHasCouncil = (townBCouncil[0]?.count ?? 0) > 0;

      // No-council towns auto-pass
      const townAPassed = !townAHasCouncil || treaty.townAVotesFor > treaty.townAVotesAgainst;
      const townBPassed = !townBHasCouncil || treaty.townBVotesFor > treaty.townBVotesAgainst;

      const typeName = treaty.treatyType;

      if (townAPassed && townBPassed) {
        const expiresAt = new Date(now.getTime() + treaty.duration * 24 * 60 * 60 * 1000).toISOString();
        await db.update(townTreaties).set({
          status: 'ACTIVE', activatedAt: nowStr, expiresAt,
        }).where(eq(townTreaties.id, treaty.id));

        await applyTreatyEffects(treaty);

        logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Ratified: ${typeName}`, `${typeName} with ${treaty.townB.name} has been ratified and is now active`, undefined).catch(() => {});
        logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Ratified: ${typeName}`, `${typeName} with ${treaty.townA.name} has been ratified and is now active`, undefined).catch(() => {});

        try {
          io.to(`town:${treaty.townAId}`).emit('treaty:activated', { treatyId: treaty.id, typeName });
          io.to(`town:${treaty.townBId}`).emit('treaty:activated', { treatyId: treaty.id, typeName });
        } catch { /* socket not critical */ }
      } else {
        await db.update(townTreaties).set({ status: 'REJECTED' }).where(eq(townTreaties.id, treaty.id));

        const reason = !townAPassed && !townBPassed ? 'both towns rejected'
          : !townAPassed ? `${treaty.townA.name} rejected` : `${treaty.townB.name} rejected`;
        logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Rejected: ${typeName}`, `${typeName} ratification failed — ${reason}`, undefined).catch(() => {});
        logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Rejected: ${typeName}`, `${typeName} ratification failed — ${reason}`, undefined).catch(() => {});
      }
    } catch (err) {
      logger.error({ job: 'electionLifecycle', err: err instanceof Error ? err.message : String(err), treatyId: treaty.id }, 'Treaty ratification resolution error');
    }
  }

  logger.info({ job: 'electionLifecycle', count: expiredRats.length }, 'Treaty ratifications resolved');
}

// =========================================================================
// Treaty Lifecycle — Expire + Complete Cancellations
// =========================================================================

async function processTreatyLifecycle(io: Server) {
  const now = new Date();
  const nowStr = now.toISOString();

  const { removeTreatyEffects } = await import('../services/treaty-effects');

  // 1. Expire active treaties past their expiry date
  const expired = await db.query.townTreaties.findMany({
    where: and(eq(townTreaties.status, 'ACTIVE'), lte(townTreaties.expiresAt, nowStr)),
    with: {
      townA: { columns: { id: true, name: true } },
      townB: { columns: { id: true, name: true } },
    },
  });

  for (const treaty of expired) {
    try {
      await db.update(townTreaties).set({ status: 'EXPIRED' }).where(eq(townTreaties.id, treaty.id));
      await removeTreatyEffects(treaty);

      logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Expired: ${treaty.treatyType}`, `${treaty.treatyType} with ${treaty.townB.name} has expired`, undefined).catch(() => {});
      logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Expired: ${treaty.treatyType}`, `${treaty.treatyType} with ${treaty.townA.name} has expired`, undefined).catch(() => {});

      try {
        io.to(`town:${treaty.townAId}`).emit('treaty:expired', { treatyId: treaty.id });
        io.to(`town:${treaty.townBId}`).emit('treaty:expired', { treatyId: treaty.id });
      } catch { /* socket not critical */ }
    } catch (err) {
      logger.error({ job: 'electionLifecycle', err: err instanceof Error ? err.message : String(err), treatyId: treaty.id }, 'Treaty expiry error');
    }
  }

  // 2. Complete cancelling treaties past notice period
  const cancelled = await db.query.townTreaties.findMany({
    where: and(eq(townTreaties.status, 'CANCELLING'), lte(townTreaties.cancelNoticeUntil, nowStr)),
    with: {
      townA: { columns: { id: true, name: true } },
      townB: { columns: { id: true, name: true } },
    },
  });

  for (const treaty of cancelled) {
    try {
      await db.update(townTreaties).set({ status: 'CANCELLED', cancelledAt: nowStr }).where(eq(townTreaties.id, treaty.id));
      await removeTreatyEffects(treaty);

      logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Cancelled: ${treaty.treatyType}`, `${treaty.treatyType} with ${treaty.townB.name} has been cancelled after notice period`, undefined).catch(() => {});
      logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Cancelled: ${treaty.treatyType}`, `${treaty.treatyType} with ${treaty.townA.name} has been cancelled after notice period`, undefined).catch(() => {});

      try {
        io.to(`town:${treaty.townAId}`).emit('treaty:cancelled', { treatyId: treaty.id });
        io.to(`town:${treaty.townBId}`).emit('treaty:cancelled', { treatyId: treaty.id });
      } catch { /* socket not critical */ }
    } catch (err) {
      logger.error({ job: 'electionLifecycle', err: err instanceof Error ? err.message : String(err), treatyId: treaty.id }, 'Treaty cancellation error');
    }
  }

  if (expired.length > 0 || cancelled.length > 0) {
    logger.info({ job: 'electionLifecycle', expired: expired.length, cancelled: cancelled.length }, 'Treaty lifecycle processed');
  }
}
