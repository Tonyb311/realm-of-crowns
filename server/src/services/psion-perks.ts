/**
 * Psion Cross-System Perks Service
 * Phase 2: Non-combat specialization benefits
 *
 * 12 perks across 3 specializations (Telepath, Seer, Nomad)
 * that enhance marketplace, elections, travel, diplomacy, and social systems.
 */

import { db } from '../lib/db';
import { eq, and, or, gte, lte, inArray, count, desc, asc } from 'drizzle-orm';
import {
  characters,
  electionVotes,
  electionCandidates,
  elections,
  laws,
  combatParticipants,
  combatSessions,
  questProgress,
  tradeTransactions,
  gatheringActions,
  treaties,
  wars,
  kingdoms,
  racialRelations,
  diplomacyEvents,
  priceHistories,
  caravans,
  townResources,
} from '@database/tables';

// ============================================================
// HELPER: Check if character is a Psion with specific spec
// ============================================================

interface PsionCheckResult {
  isPsion: boolean;
  specialization: string | null;
}

export async function getPsionSpec(characterId: string): Promise<PsionCheckResult> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { class: true, specialization: true },
  });

  if (!character || character.class !== 'psion') {
    return { isPsion: false, specialization: null };
  }

  return { isPsion: true, specialization: character.specialization };
}

// ============================================================
// TELEPATH PERKS
// ============================================================

/**
 * Mind Reader — Election candidates show "Sincerity Score" (0-100).
 * Based on candidate's past voting record vs their current platform.
 */
export async function calculateSincerityScore(candidateId: string): Promise<number> {
  const pastVotes = await db.query.electionVotes.findMany({
    where: eq(electionVotes.voterId, candidateId),
    with: {
      election: {
        with: { electionCandidates: true, town: true },
      },
    },
    limit: 20,
  });

  if (pastVotes.length === 0) return 50;

  const latestCandidacy = await db.query.electionCandidates.findFirst({
    where: eq(electionCandidates.characterId, candidateId),
    with: { election: true },
    orderBy: desc(electionCandidates.id), // approximate ordering by most recent
  });

  if (!latestCandidacy || !latestCandidacy.platform) return 50;

  const lawVotes = await db.query.laws.findMany({
    where: and(
      eq(laws.enactedById, candidateId),
      eq(laws.status, 'ACTIVE'),
    ),
    limit: 10,
  });

  const votingConsistency = Math.min(25, pastVotes.length * 2.5);
  const lawAlignment = Math.min(25, lawVotes.length * 5);
  const variance = Math.floor(Math.random() * 21) - 10;

  return Math.max(0, Math.min(100, Math.round(50 + votingConsistency + lawAlignment + variance)));
}

/**
 * Trader's Insight — Marketplace listings show "Seller Urgency".
 * Based on listing age and seller's current gold balance.
 */
export function calculateSellerUrgency(
  listingCreatedAt: Date,
  sellerGold: number,
): 'Low' | 'Medium' | 'High' {
  const now = new Date();
  const ageInDays = (now.getTime() - listingCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

  let urgencyScore = 0;
  if (ageInDays > 5) urgencyScore += 2;
  else if (ageInDays > 3) urgencyScore += 1;

  if (sellerGold < 50) urgencyScore += 2;
  else if (sellerGold < 200) urgencyScore += 1;

  if (urgencyScore >= 3) return 'High';
  if (urgencyScore >= 1) return 'Medium';
  return 'Low';
}

/**
 * Surface Read — Player profiles show emotional state tag.
 * Based on recent activity patterns (last 24 hours).
 */
export async function calculateEmotionalState(
  targetCharacterId: string,
): Promise<string> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString();

  const [recentCombats, recentQuestsResult, recentSalesResult, recentPurchasesResult, recentGatheringResult] =
    await Promise.all([
      db.query.combatParticipants.findMany({
        where: eq(combatParticipants.characterId, targetCharacterId),
        with: {
          combatSession: true,
        },
        limit: 10,
      }).then(rows => rows.filter(r =>
        r.combatSession.endedAt && r.combatSession.endedAt >= sinceStr && r.combatSession.status === 'COMPLETED'
      )),
      db.select({ total: count() }).from(questProgress).where(and(
        eq(questProgress.characterId, targetCharacterId),
        gte(questProgress.completedAt, sinceStr),
        eq(questProgress.status, 'COMPLETED'),
      )),
      db.select({ total: count() }).from(tradeTransactions).where(and(
        eq(tradeTransactions.sellerId, targetCharacterId),
        gte(tradeTransactions.timestamp, sinceStr),
      )),
      db.select({ total: count() }).from(tradeTransactions).where(and(
        eq(tradeTransactions.buyerId, targetCharacterId),
        gte(tradeTransactions.timestamp, sinceStr),
      )),
      db.select({ total: count() }).from(gatheringActions).where(and(
        eq(gatheringActions.characterId, targetCharacterId),
        eq(gatheringActions.status, 'COMPLETED'),
        gte(gatheringActions.tickDate, sinceStr),
      )),
    ]);

  const combatCount = recentCombats.length;
  const recentQuests = recentQuestsResult[0]?.total ?? 0;
  const recentSales = recentSalesResult[0]?.total ?? 0;
  const recentPurchases = recentPurchasesResult[0]?.total ?? 0;
  const recentGathering = recentGatheringResult[0]?.total ?? 0;
  const economicActivity = recentSales + recentPurchases;
  const productiveActivity = recentQuests + recentGathering;

  if (recentQuests >= 3 || productiveActivity >= 5) return 'Focused';
  if (combatCount >= 5) return 'Frustrated';
  if (economicActivity >= 4) return 'Confident';
  if (combatCount >= 2 && recentQuests >= 1) return 'Focused';
  if (productiveActivity === 0 && combatCount === 0 && economicActivity === 0) return 'Calm';

  return 'Calm';
}

/**
 * Deception Detection — Treaty proposals show "Credibility" flag.
 * Based on proposing kingdom's treaty-breaking history.
 */
export async function assessTreatyCredibility(
  proposerKingdomId: string,
): Promise<{ credible: boolean; brokenTreaties: number; reason?: string }> {
  const brokenTreatiesResult = await db.select({ total: count() }).from(treaties).where(and(
    or(
      eq(treaties.proposerKingdomId, proposerKingdomId),
      eq(treaties.receiverKingdomId, proposerKingdomId),
    ),
    eq(treaties.status, 'BROKEN'),
  ));
  const brokenTreaties = brokenTreatiesResult[0]?.total ?? 0;

  const activeWarsResult = await db.select({ total: count() }).from(wars).where(and(
    or(
      eq(wars.attackerKingdomId, proposerKingdomId),
      eq(wars.defenderKingdomId, proposerKingdomId),
    ),
    eq(wars.status, 'ACTIVE'),
  ));
  const activeWars = activeWarsResult[0]?.total ?? 0;

  if (brokenTreaties >= 3) {
    return { credible: false, brokenTreaties, reason: 'This kingdom has a history of broken agreements' };
  }

  if (brokenTreaties >= 1 && activeWars >= 1) {
    return { credible: false, brokenTreaties, reason: 'This kingdom has broken treaties and is currently at war' };
  }

  if (brokenTreaties >= 1) {
    return { credible: true, brokenTreaties, reason: 'This kingdom has previously broken an agreement' };
  }

  return { credible: true, brokenTreaties: 0 };
}

// ============================================================
// SEER PERKS
// ============================================================

/**
 * Election Oracle — View projected outcome showing vote distribution trend.
 */
export async function getElectionProjection(
  electionId: string,
): Promise<Array<{ candidateId: string; candidateName: string; votePercentage: number; trend: string }>> {
  const election = await db.query.elections.findFirst({
    where: eq(elections.id, electionId),
    with: {
      electionCandidates: {
        with: { character: { columns: { name: true } } },
      },
      electionVotes: true,
    },
  });

  if (!election || election.phase !== 'VOTING') return [];

  const totalVotes = election.electionVotes.length;
  if (totalVotes === 0) {
    return election.electionCandidates.map((c: any) => ({
      candidateId: c.characterId,
      candidateName: c.character.name,
      votePercentage: Math.round(100 / election.electionCandidates.length),
      trend: 'Unknown',
    }));
  }

  const voteCounts: Record<string, number> = {};
  for (const candidate of election.electionCandidates) {
    voteCounts[candidate.characterId] = 0;
  }
  for (const vote of election.electionVotes) {
    if (voteCounts[vote.candidateId] !== undefined) {
      voteCounts[vote.candidateId]++;
    }
  }

  const sortedVotes = [...election.electionVotes].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const midpoint = Math.floor(sortedVotes.length / 2);
  const firstHalf = sortedVotes.slice(0, midpoint || 1);
  const secondHalf = sortedVotes.slice(midpoint || 1);

  const firstHalfCounts: Record<string, number> = {};
  const secondHalfCounts: Record<string, number> = {};
  for (const candidate of election.electionCandidates) {
    firstHalfCounts[candidate.characterId] = 0;
    secondHalfCounts[candidate.characterId] = 0;
  }
  for (const vote of firstHalf) {
    if (firstHalfCounts[vote.candidateId] !== undefined) firstHalfCounts[vote.candidateId]++;
  }
  for (const vote of secondHalf) {
    if (secondHalfCounts[vote.candidateId] !== undefined) secondHalfCounts[vote.candidateId]++;
  }

  return election.electionCandidates.map((c: any) => {
    const votes = voteCounts[c.characterId] || 0;
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

    const earlyPct = firstHalf.length > 0 ? (firstHalfCounts[c.characterId] || 0) / firstHalf.length : 0;
    const latePct = secondHalf.length > 0 ? (secondHalfCounts[c.characterId] || 0) / secondHalf.length : 0;

    let trend = 'Stable';
    if (totalVotes < 3) trend = 'Too early';
    else if (latePct > earlyPct + 0.1) trend = 'Rising';
    else if (latePct < earlyPct - 0.1) trend = 'Falling';

    return { candidateId: c.characterId, candidateName: c.character.name, votePercentage: pct, trend };
  });
}

/**
 * Market Foresight — Item categories show price trend arrow.
 * Computed from last 7 days of PriceHistory data.
 */
export async function calculatePriceTrend(
  itemTemplateId: string,
  townId?: string,
): Promise<'rising' | 'stable' | 'falling'> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const conditions = [
    eq(priceHistories.itemTemplateId, itemTemplateId),
    gte(priceHistories.date, sevenDaysAgo.toISOString()),
  ];
  if (townId) {
    conditions.push(eq(priceHistories.townId, townId));
  }

  const priceHistory = await db.query.priceHistories.findMany({
    where: and(...conditions),
    orderBy: asc(priceHistories.date),
  });

  if (priceHistory.length < 2) return 'stable';

  const prices = priceHistory.map((p: any) => p.avgPrice);
  const n = prices.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgPrice = sumY / n;
  const threshold = avgPrice * 0.05;

  if (slope > threshold) return 'rising';
  if (slope < -threshold) return 'falling';
  return 'stable';
}

/**
 * War Forecast — Tension Index between two kingdoms (0-100).
 */
export async function calculateTensionIndex(
  kingdomId1: string,
  kingdomId2: string,
): Promise<{ tensionIndex: number; factors: string[] }> {
  const factors: string[] = [];
  let tension = 0;

  const kingdomsList = await db.query.kingdoms.findMany({
    where: inArray(kingdoms.id, [kingdomId1, kingdomId2]),
    with: {
      ruler: { columns: { race: true } },
    },
  });

  if (kingdomsList.length < 2) return { tensionIndex: 0, factors: ['Unknown kingdoms'] };

  const k1 = kingdomsList.find((k: any) => k.id === kingdomId1)!;
  const k2 = kingdomsList.find((k: any) => k.id === kingdomId2)!;

  if (k1.ruler && k2.ruler) {
    const relation = await db.query.racialRelations.findFirst({
      where: or(
        and(eq(racialRelations.race1, k1.ruler.race), eq(racialRelations.race2, k2.ruler.race)),
        and(eq(racialRelations.race1, k2.ruler.race), eq(racialRelations.race2, k1.ruler.race)),
      ),
    });

    if (relation) {
      const tensionMap: Record<string, number> = {
        BLOOD_FEUD: 40, HOSTILE: 30, DISTRUSTFUL: 20, NEUTRAL: 10, FRIENDLY: 0, ALLIED: 0,
      };
      const racialTension = tensionMap[relation.status] ?? 10;
      if (racialTension > 0) {
        tension += racialTension;
        factors.push(`Racial relations: ${relation.status} (+${racialTension})`);
      }
    }
  }

  const brokenTreatiesResult = await db.select({ total: count() }).from(treaties).where(and(
    eq(treaties.status, 'BROKEN'),
    or(
      and(eq(treaties.proposerKingdomId, kingdomId1), eq(treaties.receiverKingdomId, kingdomId2)),
      and(eq(treaties.proposerKingdomId, kingdomId2), eq(treaties.receiverKingdomId, kingdomId1)),
    ),
  ));
  const brokenTreaties = brokenTreatiesResult[0]?.total ?? 0;

  if (brokenTreaties > 0) {
    const treaTension = brokenTreaties * 15;
    tension += treaTension;
    factors.push(`Broken treaties: ${brokenTreaties} (+${treaTension})`);
  }

  const activeWarsResult = await db.select({ total: count() }).from(wars).where(and(
    eq(wars.status, 'ACTIVE'),
    or(
      inArray(wars.attackerKingdomId, [kingdomId1, kingdomId2]),
      inArray(wars.defenderKingdomId, [kingdomId1, kingdomId2]),
    ),
  ));
  const activeWars = activeWarsResult[0]?.total ?? 0;

  if (activeWars > 0) {
    tension += activeWars * 10;
    factors.push(`Active wars involving these kingdoms: ${activeWars} (+${activeWars * 10})`);
  }

  // Factor 4: Recent hostile diplomatic events (last 30 days)
  // DiplomacyEvent uses character IDs (ruler), not kingdom IDs
  const rulerIds = [k1.rulerId, k2.rulerId].filter(Boolean) as string[];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let hostileEvents = 0;
  if (rulerIds.length > 0) {
    const hostileResult = await db.select({ total: count() }).from(diplomacyEvents).where(and(
      gte(diplomacyEvents.createdAt, thirtyDaysAgo.toISOString()),
      inArray(diplomacyEvents.type, ['DECLARE_WAR', 'BREAK_TREATY']),
      or(
        inArray(diplomacyEvents.initiatorId, rulerIds),
        inArray(diplomacyEvents.targetId, rulerIds),
      ),
    ));
    hostileEvents = hostileResult[0]?.total ?? 0;
  }

  if (hostileEvents > 0) {
    tension += hostileEvents * 5;
    factors.push(`Recent hostile events: ${hostileEvents} (+${hostileEvents * 5})`);
  }

  const activeTreatiesResult = await db.select({ total: count() }).from(treaties).where(and(
    eq(treaties.status, 'ACTIVE'),
    or(
      and(eq(treaties.proposerKingdomId, kingdomId1), eq(treaties.receiverKingdomId, kingdomId2)),
      and(eq(treaties.proposerKingdomId, kingdomId2), eq(treaties.receiverKingdomId, kingdomId1)),
    ),
  ));
  const activeTreaties = activeTreatiesResult[0]?.total ?? 0;

  if (activeTreaties > 0) {
    const reduction = activeTreaties * 10;
    tension -= reduction;
    factors.push(`Active treaties: ${activeTreaties} (-${reduction})`);
  }

  return { tensionIndex: Math.max(0, Math.min(100, tension)), factors };
}

/**
 * Premonition — Generate daily premonition notification for Seer characters.
 */
export async function generateSeerPremonition(characterId: string): Promise<string | null> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: {
      currentTownId: true,
      name: true,
    },
  });

  if (!character) return null;

  const premonitions: string[] = [];

  const now = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const soonElections = character.currentTownId
    ? await db.query.elections.findFirst({
        where: and(
          eq(elections.phase, 'VOTING'),
          lte(elections.endDate, tomorrow.toISOString()),
          gte(elections.endDate, now.toISOString()),
          eq(elections.townId, character.currentTownId),
        ),
      })
    : undefined;
  if (soonElections) {
    premonitions.push('You sense a change in local leadership approaching. An election will conclude soon.');
  }

  const dangerousCaravans = await db.query.caravans.findFirst({
    where: and(
      eq(caravans.ownerId, characterId),
      eq(caravans.status, 'IN_PROGRESS'),
    ),
    with: { town_fromTownId: true, town_toTownId: true },
  });
  if (dangerousCaravans) {
    premonitions.push('A vision of your caravan flickers through your mind — the road ahead may not be smooth.');
  }

  const activeWar = await db.query.wars.findFirst({ where: eq(wars.status, 'ACTIVE') });
  if (activeWar) {
    premonitions.push('The threads of fate tremble. Conflict stirs between kingdoms, and its shadow may reach you.');
  }

  const twoDaysFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const expiringLaws = await db.query.laws.findFirst({
    where: and(
      eq(laws.status, 'ACTIVE'),
      lte(laws.expiresAt, twoDaysFromNow.toISOString()),
      gte(laws.expiresAt, now.toISOString()),
    ),
  });
  if (expiringLaws) {
    premonitions.push('A law that shapes your world grows thin. Change is coming to the political landscape.');
  }

  if (character.currentTownId) {
    const lowResources = await db.query.townResources.findFirst({
      where: and(
        eq(townResources.townId, character.currentTownId),
        lte(townResources.abundance, 20),
      ),
    });
    if (lowResources) {
      premonitions.push('Resources grow scarce nearby. The land whispers of depletion.');
    }
  }

  if (premonitions.length === 0) {
    premonitions.push('The mists part briefly, but the future holds no urgent warnings for you today.');
  }

  return premonitions[Math.floor(Math.random() * premonitions.length)];
}

// ============================================================
// NOMAD PERKS
// ============================================================

/** Dimensional Trade: 15% faster travel. */
export const NOMAD_TRAVEL_MULTIPLIER = 0.85;

/** Rapid Deployment: Nomads ignore war travel penalty. */
export const NOMAD_WAR_PENALTY_OVERRIDE = 1.0;

/**
 * Check if a character has a specific Psion perk active.
 */
export async function hasPsionPerk(
  characterId: string,
  perk:
    | 'mind_reader' | 'traders_insight' | 'surface_read' | 'deception_detection'
    | 'election_oracle' | 'market_foresight' | 'premonition' | 'war_forecast'
    | 'diplomatic_courier' | 'dimensional_trade' | 'far_whisper' | 'rapid_deployment',
): Promise<boolean> {
  const { isPsion, specialization } = await getPsionSpec(characterId);
  if (!isPsion) return false;

  const perkMap: Record<string, string> = {
    mind_reader: 'telepath',
    traders_insight: 'telepath',
    surface_read: 'telepath',
    deception_detection: 'telepath',
    election_oracle: 'seer',
    market_foresight: 'seer',
    premonition: 'seer',
    war_forecast: 'seer',
    diplomatic_courier: 'nomad',
    dimensional_trade: 'nomad',
    far_whisper: 'nomad',
    rapid_deployment: 'nomad',
  };

  return specialization === perkMap[perk];
}
