import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, ne, gte, isNotNull, sql, desc, asc } from 'drizzle-orm';
import { elections, electionCandidates, electionVotes, towns, kingdoms, impeachments, impeachmentVotes } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getPsionSpec, calculateSincerityScore, getElectionProjection } from '../services/psion-perks';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { isTownReleased } from '../lib/content-release';

const router = Router();

const MAX_CONSECUTIVE_TERMS = 3;
const IMPEACHMENT_DURATION_HOURS = 48;

// --- Schemas ---

const nominateSchema = z.object({
  electionId: z.string().min(1, 'electionId is required'),
  platform: z.string().max(2000).optional(),
});

const voteSchema = z.object({
  electionId: z.string().min(1, 'electionId is required'),
  candidateId: z.string().min(1, 'candidateId is required'),
});

const impeachSchema = z.object({
  targetId: z.string().min(1, 'targetId is required'),
  townId: z.string().optional(),
  kingdomId: z.string().optional(),
});

const impeachVoteSchema = z.object({
  impeachmentId: z.string().min(1, 'impeachmentId is required'),
  support: z.boolean(),
});

// --- Helpers ---

// POST /api/elections/nominate
router.post('/nominate', authGuard, characterGuard, validate(nominateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { electionId, platform } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const election = await db.query.elections.findFirst({
      where: eq(elections.id, electionId),
      with: { town: { columns: { id: true, name: true } } },
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (election.phase !== 'NOMINATIONS') {
      return res.status(400).json({ error: 'Election is not in nomination phase' });
    }

    // Content gating: skip elections for unreleased towns
    if (election.townId && !(await isTownReleased(election.townId))) {
      return res.status(400).json({ error: 'Elections in this town are not yet available' });
    }

    // Check eligibility based on election type (mayor residency is synchronous)
    if (election.type === 'MAYOR') {
      if (character.currentTownId !== election.townId) {
        return res.status(403).json({ error: 'You must be a resident of this town to run for mayor' });
      }
    } else if (election.type === 'HIGH_PRIEST') {
      if (character.patronGodId !== election.godId) {
        return res.status(403).json({ error: 'You must follow this god to run for High Priest' });
      }
      if (character.homeTownId !== election.townId) {
        return res.status(403).json({ error: 'You must be a resident of this town to run for High Priest' });
      }
    }

    // Queries 2-4 are independent — run in parallel
    const [mayorCheck, previousWins, existingCandidate] = await Promise.all([
      // Only matters for RULER elections
      election.type === 'RULER'
        ? db.query.towns.findFirst({ where: eq(towns.mayorId, character.id) })
        : Promise.resolve(true), // non-RULER: skip check
      // Term limits: max 3 consecutive terms
      db.select({ total: sql<number>`count(*)::int` })
        .from(elections)
        .where(and(
          eq(elections.townId, election.townId),
          eq(elections.type, election.type),
          eq(elections.winnerId, character.id),
          gte(elections.termNumber, election.termNumber - MAX_CONSECUTIVE_TERMS),
        ))
        .then(rows => rows[0]?.total ?? 0),
      // Duplicate nomination check
      db.query.electionCandidates.findFirst({
        where: and(
          eq(electionCandidates.electionId, electionId),
          eq(electionCandidates.characterId, character.id),
        ),
      }),
    ]);

    if (election.type === 'RULER' && !mayorCheck) {
      return res.status(403).json({ error: 'Only mayors can run for ruler' });
    }

    if (previousWins >= MAX_CONSECUTIVE_TERMS) {
      return res.status(400).json({ error: `Term limit reached. Maximum ${MAX_CONSECUTIVE_TERMS} consecutive terms allowed` });
    }

    if (existingCandidate) {
      return res.status(400).json({ error: 'You are already nominated for this election' });
    }

    const [candidate] = await db.insert(electionCandidates)
      .values({
        id: crypto.randomUUID(),
        electionId,
        characterId: character.id,
        platform: platform || '',
      })
      .returning();

    // Fetch the candidate with character info
    const candidateWithCharacter = await db.query.electionCandidates.findFirst({
      where: eq(electionCandidates.id, candidate.id),
      with: {
        character: { columns: { id: true, name: true, level: true, race: true } },
      },
    });

    return res.status(201).json({ candidate: candidateWithCharacter });
  } catch (error) {
    if (handleDbError(error, res, 'election-nominate', req)) return;
    logRouteError(req, 500, 'Election nominate error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/vote
router.post('/vote', authGuard, characterGuard, validate(voteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { electionId, candidateId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const election = await db.query.elections.findFirst({
      where: eq(elections.id, electionId),
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (election.phase !== 'VOTING') {
      return res.status(400).json({ error: 'Election is not in voting phase' });
    }

    // Must be a resident of the town to vote in mayor elections
    if (election.type === 'MAYOR' && character.currentTownId !== election.townId) {
      return res.status(403).json({ error: 'You must be a resident of this town to vote' });
    } else if (election.type === 'HIGH_PRIEST') {
      if (character.patronGodId !== election.godId) {
        return res.status(403).json({ error: 'Only followers of this god can vote in this election' });
      }
      if (character.homeTownId !== election.townId) {
        return res.status(403).json({ error: 'You must be a resident of this town to vote' });
      }
    }

    // Verify candidate is actually running
    const candidateEntry = await db.query.electionCandidates.findFirst({
      where: and(
        eq(electionCandidates.electionId, electionId),
        eq(electionCandidates.characterId, candidateId),
      ),
    });

    if (!candidateEntry) {
      return res.status(400).json({ error: 'This character is not a candidate in this election' });
    }

    // Cannot vote for yourself
    if (candidateId === character.id) {
      return res.status(400).json({ error: 'You cannot vote for yourself' });
    }

    // Check if already voted (unique constraint will also catch this)
    const existingVote = await db.query.electionVotes.findFirst({
      where: and(
        eq(electionVotes.electionId, electionId),
        eq(electionVotes.voterId, character.id),
      ),
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted in this election' });
    }

    const [vote] = await db.insert(electionVotes)
      .values({
        id: crypto.randomUUID(),
        electionId,
        voterId: character.id,
        candidateId,
      })
      .returning();

    return res.status(201).json({ vote: { id: vote.id, electionId, votedAt: vote.createdAt } });
  } catch (error) {
    if (handleDbError(error, res, 'election-vote', req)) return;
    logRouteError(req, 500, 'Election vote error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/current
router.get('/current', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Town elections for character's current town
    const townConditions: any[] = [];
    if (character.currentTownId) {
      townConditions.push(eq(elections.townId, character.currentTownId));
    }

    // Kingdom elections (ruler)
    let kingdomElections: any[] = [];
    if (character.currentTownId) {
      const town = await db.query.towns.findFirst({
        where: eq(towns.id, character.currentTownId),
        with: { region: true },
      });

      if (town) {
        // Find kingdoms that have elections
        const rulerElections = await db.query.elections.findMany({
          where: and(
            eq(elections.type, 'RULER'),
            ne(elections.phase, 'COMPLETED'),
            isNotNull(elections.kingdomId),
          ),
          with: {
            town: { columns: { id: true, name: true } },
            kingdom: { columns: { id: true, name: true } },
            god: { columns: { id: true, name: true, iconName: true, colorHex: true, churchName: true } },
            electionCandidates: {
              with: {
                character: { columns: { id: true, name: true, level: true, race: true } },
              },
            },
            electionVotes: true,
          },
        });

        if (rulerElections.length > 0) {
          kingdomElections = rulerElections;
        }
      }
    }

    // If no conditions, return empty
    if (townConditions.length === 0 && kingdomElections.length === 0) {
      return res.json({ elections: [] });
    }

    // Fetch town elections
    let townElections: any[] = [];
    if (townConditions.length > 0) {
      townElections = await db.query.elections.findMany({
        where: and(
          ne(elections.phase, 'COMPLETED'),
          townConditions[0],
        ),
        with: {
          town: { columns: { id: true, name: true } },
          kingdom: { columns: { id: true, name: true } },
          god: { columns: { id: true, name: true, iconName: true, colorHex: true, churchName: true } },
          electionCandidates: {
            with: {
              character: { columns: { id: true, name: true, level: true, race: true } },
            },
          },
          electionVotes: true,
        },
        orderBy: desc(elections.startDate),
      });
    }

    // Combine and deduplicate (kingdom elections may overlap with town elections)
    const allElections = [...townElections];
    for (const ke of kingdomElections) {
      if (!allElections.find(e => e.id === ke.id)) {
        allElections.push(ke);
      }
    }

    // Psion Seer: Election Oracle — add projected outcome to voting-phase elections
    const { isPsion, specialization } = await getPsionSpec(character.id);
    const baseElections = allElections.map(e => ({
      id: e.id,
      type: e.type,
      phase: e.phase,
      termNumber: e.termNumber,
      startDate: e.startDate,
      endDate: e.endDate,
      town: e.town,
      kingdom: e.kingdom,
      godId: e.godId ?? null,
      god: e.god ?? null,
      candidateCount: e.electionCandidates.length,
      voteCount: e.electionVotes.length,
      candidates: e.electionCandidates.map((c: any) => ({
        characterId: c.characterId,
        name: c.character.name,
        level: c.character.level,
        race: c.character.race,
        platform: c.platform,
        nominatedAt: c.nominatedAt,
      })),
    }));

    let enrichedElections: (typeof baseElections[number] & { psionInsight?: unknown })[] = baseElections;
    if (isPsion && specialization === 'seer') {
      enrichedElections = await Promise.all(
        baseElections.map(async (election) => {
          if (election.phase === 'VOTING') {
            const projection = await getElectionProjection(election.id);
            return { ...election, psionInsight: { projection } };
          }
          return election;
        }),
      );
    }

    return res.json({ elections: enrichedElections });
  } catch (error) {
    if (handleDbError(error, res, 'election-current', req)) return;
    logRouteError(req, 500, 'Election current error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/results
router.get('/results', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const townId = (req.query.townId as string) || character.currentTownId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    if (!townId) {
      return res.status(400).json({ error: 'No town specified and character is not in a town' });
    }

    const electionResults = await db.query.elections.findMany({
      where: and(
        eq(elections.townId, townId),
        eq(elections.phase, 'COMPLETED'),
      ),
      with: {
        town: { columns: { id: true, name: true } },
        kingdom: { columns: { id: true, name: true } },
        // winner is the `character` relation (winnerId -> characters.id)
        character: { columns: { id: true, name: true, level: true, race: true } },
        electionCandidates: {
          with: {
            character: { columns: { id: true, name: true } },
          },
        },
        electionVotes: true,
      },
      orderBy: desc(elections.endDate),
      limit,
    });

    // Get vote counts per candidate for each election
    const results = await Promise.all(
      electionResults.map(async (election) => {
        // Fetch all votes for this election and aggregate by candidateId
        const votes = await db.query.electionVotes.findMany({
          where: eq(electionVotes.electionId, election.id),
        });
        const voteMap = new Map<string, number>();
        for (const v of votes) {
          voteMap.set(v.candidateId, (voteMap.get(v.candidateId) || 0) + 1);
        }

        return {
          id: election.id,
          type: election.type,
          termNumber: election.termNumber,
          startDate: election.startDate,
          endDate: election.endDate,
          town: election.town,
          kingdom: election.kingdom,
          winner: election.character, // `character` relation is the winner
          totalVotes: election.electionVotes.length,
          candidates: election.electionCandidates
            .map(c => ({
              characterId: c.characterId,
              name: c.character.name,
              platform: c.platform,
              votes: voteMap.get(c.characterId) || 0,
            }))
            .sort((a, b) => b.votes - a.votes),
        };
      })
    );

    return res.json({ results });
  } catch (error) {
    if (handleDbError(error, res, 'election-results', req)) return;
    logRouteError(req, 500, 'Election results error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/candidates/:electionId
router.get('/candidates/:electionId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { electionId } = req.params;

    const election = await db.query.elections.findFirst({
      where: eq(elections.id, electionId),
      with: {
        electionCandidates: {
          with: {
            character: { columns: { id: true, name: true, level: true, race: true } },
          },
          orderBy: asc(electionCandidates.nominatedAt),
        },
      },
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // If voting is completed, include vote counts
    let voteCounts: Map<string, number> | null = null;
    if (election.phase === 'COMPLETED' || election.phase === 'VOTING') {
      const votes = await db.query.electionVotes.findMany({
        where: eq(electionVotes.electionId, electionId),
      });
      voteCounts = new Map<string, number>();
      for (const v of votes) {
        voteCounts.set(v.candidateId, (voteCounts.get(v.candidateId) || 0) + 1);
      }
    }

    const baseCandidates = election.electionCandidates.map(c => ({
      characterId: c.characterId,
      name: c.character.name,
      level: c.character.level,
      race: c.character.race,
      platform: c.platform,
      nominatedAt: c.nominatedAt,
      ...(voteCounts ? { votes: voteCounts.get(c.characterId) || 0 } : {}),
    }));

    // Psion Telepath: Mind Reader — add sincerity score to each candidate
    const character = req.character!;
    let enrichedCandidates: typeof baseCandidates = baseCandidates;
    {
      const { isPsion, specialization } = await getPsionSpec(character.id);
      if (isPsion && specialization === 'telepath') {
        enrichedCandidates = await Promise.all(
          baseCandidates.map(async (c) => ({
            ...c,
            psionInsight: {
              sincerityScore: await calculateSincerityScore(c.characterId),
            },
          })),
        );
      }
    }

    return res.json({
      electionId: election.id,
      phase: election.phase,
      candidates: enrichedCandidates,
    });
  } catch (error) {
    if (handleDbError(error, res, 'election-candidates', req)) return;
    logRouteError(req, 500, 'Election candidates error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/impeach
router.post('/impeach', authGuard, characterGuard, validate(impeachSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetId, townId, kingdomId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    // Cannot impeach yourself
    if (targetId === character.id) {
      return res.status(400).json({ error: 'You cannot impeach yourself' });
    }

    // Verify the target actually holds the office
    if (townId) {
      const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
      if (!town) {
        return res.status(404).json({ error: 'Town not found' });
      }
      if (town.mayorId !== targetId) {
        return res.status(400).json({ error: 'Target is not the mayor of this town' });
      }
      // Must be a resident to impeach
      if (character.currentTownId !== townId) {
        return res.status(403).json({ error: 'You must be a resident of this town to start an impeachment' });
      }
    }

    if (kingdomId) {
      const kingdom = await db.query.kingdoms.findFirst({ where: eq(kingdoms.id, kingdomId) });
      if (!kingdom) {
        return res.status(404).json({ error: 'Kingdom not found' });
      }
      if (kingdom.rulerId !== targetId) {
        return res.status(400).json({ error: 'Target is not the ruler of this kingdom' });
      }
    }

    // Check for existing active impeachment
    const conditions = [
      eq(impeachments.targetId, targetId),
      eq(impeachments.status, 'ACTIVE'),
    ];
    if (townId) conditions.push(eq(impeachments.townId, townId));
    if (kingdomId) conditions.push(eq(impeachments.kingdomId, kingdomId));

    const activeImpeachment = await db.query.impeachments.findFirst({
      where: and(...conditions),
    });

    if (activeImpeachment) {
      return res.status(400).json({ error: 'There is already an active impeachment against this official' });
    }

    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + IMPEACHMENT_DURATION_HOURS);

    const [impeachment] = await db.insert(impeachments)
      .values({
        id: crypto.randomUUID(),
        targetId,
        townId: townId || null,
        kingdomId: kingdomId || null,
        votesFor: 1, // Initiator automatically votes in favor
        endsAt: endsAt.toISOString(),
      })
      .returning();

    // Record the initiator's vote
    await db.insert(impeachmentVotes)
      .values({
        id: crypto.randomUUID(),
        impeachmentId: impeachment.id,
        voterId: character.id,
        support: true,
      });

    return res.status(201).json({
      impeachment: {
        id: impeachment.id,
        targetId: impeachment.targetId,
        townId: impeachment.townId,
        kingdomId: impeachment.kingdomId,
        votesFor: impeachment.votesFor,
        votesAgainst: impeachment.votesAgainst,
        status: impeachment.status,
        startedAt: impeachment.startedAt,
        endsAt: impeachment.endsAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'election-impeach', req)) return;
    logRouteError(req, 500, 'Impeach error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/impeach/vote
router.post('/impeach/vote', authGuard, characterGuard, validate(impeachVoteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { impeachmentId, support } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const impeachment = await db.query.impeachments.findFirst({
      where: eq(impeachments.id, impeachmentId),
    });

    if (!impeachment) {
      return res.status(404).json({ error: 'Impeachment not found' });
    }

    if (impeachment.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This impeachment is no longer active' });
    }

    if (new Date() > new Date(impeachment.endsAt)) {
      return res.status(400).json({ error: 'Impeachment voting period has ended' });
    }

    // Cannot vote on your own impeachment
    if (impeachment.targetId === character.id) {
      return res.status(400).json({ error: 'You cannot vote on your own impeachment' });
    }

    // Must be a resident if town impeachment
    if (impeachment.townId && character.currentTownId !== impeachment.townId) {
      return res.status(403).json({ error: 'You must be a resident of this town to vote on this impeachment' });
    }

    // Check if already voted
    const existingVote = await db.query.impeachmentVotes.findFirst({
      where: and(
        eq(impeachmentVotes.impeachmentId, impeachmentId),
        eq(impeachmentVotes.voterId, character.id),
      ),
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this impeachment' });
    }

    await db.transaction(async (tx) => {
      await tx.insert(impeachmentVotes)
        .values({
          id: crypto.randomUUID(),
          impeachmentId,
          voterId: character.id,
          support,
        });

      await tx.update(impeachments)
        .set(support
          ? { votesFor: sql`${impeachments.votesFor} + 1` }
          : { votesAgainst: sql`${impeachments.votesAgainst} + 1` })
        .where(eq(impeachments.id, impeachmentId));
    });

    const updated = await db.query.impeachments.findFirst({
      where: eq(impeachments.id, impeachmentId),
    });

    return res.status(201).json({
      impeachment: {
        id: updated!.id,
        votesFor: updated!.votesFor,
        votesAgainst: updated!.votesAgainst,
        status: updated!.status,
        endsAt: updated!.endsAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'election-impeach-vote', req)) return;
    logRouteError(req, 500, 'Impeach vote error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
