import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getPsionSpec, calculateSincerityScore, getElectionProjection } from '../services/psion-perks';

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

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { town: true },
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (election.phase !== 'NOMINATIONS') {
      return res.status(400).json({ error: 'Election is not in nomination phase' });
    }

    // Check eligibility based on election type
    if (election.type === 'MAYOR') {
      if (character.currentTownId !== election.townId) {
        return res.status(403).json({ error: 'You must be a resident of this town to run for mayor' });
      }
    } else if (election.type === 'RULER') {
      // Only mayors can run for ruler
      const isMayor = await prisma.town.findFirst({
        where: { mayorId: character.id },
      });
      if (!isMayor) {
        return res.status(403).json({ error: 'Only mayors can run for ruler' });
      }
    }

    // Check term limits: max 3 consecutive terms
    const previousWins = await prisma.election.count({
      where: {
        townId: election.townId,
        type: election.type,
        winnerId: character.id,
        termNumber: { gte: election.termNumber - MAX_CONSECUTIVE_TERMS },
      },
    });

    if (previousWins >= MAX_CONSECUTIVE_TERMS) {
      return res.status(400).json({ error: `Term limit reached. Maximum ${MAX_CONSECUTIVE_TERMS} consecutive terms allowed` });
    }

    // Check if already nominated
    const existingCandidate = await prisma.electionCandidate.findUnique({
      where: { electionId_characterId: { electionId, characterId: character.id } },
    });

    if (existingCandidate) {
      return res.status(400).json({ error: 'You are already nominated for this election' });
    }

    const candidate = await prisma.electionCandidate.create({
      data: {
        electionId,
        characterId: character.id,
        platform: platform || '',
      },
      include: {
        character: { select: { id: true, name: true, level: true, race: true } },
      },
    });

    return res.status(201).json({ candidate });
  } catch (error) {
    console.error('Election nominate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/vote
router.post('/vote', authGuard, characterGuard, validate(voteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { electionId, candidateId } = req.body;
    const character = req.character!;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
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
    }

    // Verify candidate is actually running
    const candidateEntry = await prisma.electionCandidate.findUnique({
      where: { electionId_characterId: { electionId, characterId: candidateId } },
    });

    if (!candidateEntry) {
      return res.status(400).json({ error: 'This character is not a candidate in this election' });
    }

    // Cannot vote for yourself
    if (candidateId === character.id) {
      return res.status(400).json({ error: 'You cannot vote for yourself' });
    }

    // Check if already voted (unique constraint will also catch this)
    const existingVote = await prisma.electionVote.findUnique({
      where: { electionId_voterId: { electionId, voterId: character.id } },
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted in this election' });
    }

    const vote = await prisma.electionVote.create({
      data: {
        electionId,
        voterId: character.id,
        candidateId,
      },
    });

    return res.status(201).json({ vote: { id: vote.id, electionId, votedAt: vote.createdAt } });
  } catch (error) {
    console.error('Election vote error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/current
router.get('/current', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const where: any = {
      phase: { not: 'COMPLETED' },
      OR: [] as any[],
    };

    // Town elections for character's current town
    if (character.currentTownId) {
      where.OR.push({ townId: character.currentTownId });
    }

    // Kingdom elections (ruler)
    if (character.currentTownId) {
      const town = await prisma.town.findUnique({
        where: { id: character.currentTownId },
        include: { region: true },
      });

      if (town) {
        // Find kingdoms that have elections
        const kingdomElections = await prisma.election.findMany({
          where: {
            type: 'RULER',
            phase: { not: 'COMPLETED' },
            kingdomId: { not: null },
          },
          include: {
            town: { select: { id: true, name: true } },
            kingdom: { select: { id: true, name: true } },
            candidates: {
              include: {
                character: { select: { id: true, name: true, level: true, race: true } },
              },
            },
            _count: { select: { votes: true } },
          },
        });

        if (kingdomElections.length > 0) {
          // Add them to the result separately below
        }
      }
    }

    // If no conditions, return empty
    if (where.OR.length === 0) {
      return res.json({ elections: [] });
    }

    const elections = await prisma.election.findMany({
      where,
      include: {
        town: { select: { id: true, name: true } },
        kingdom: { select: { id: true, name: true } },
        candidates: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
          },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    // Psion Seer: Election Oracle — add projected outcome to voting-phase elections
    const { isPsion, specialization } = await getPsionSpec(character.id);
    const baseElections = elections.map(e => ({
      id: e.id,
      type: e.type,
      phase: e.phase,
      termNumber: e.termNumber,
      startDate: e.startDate,
      endDate: e.endDate,
      town: e.town,
      kingdom: e.kingdom,
      candidateCount: e.candidates.length,
      voteCount: e._count.votes,
      candidates: e.candidates.map(c => ({
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
    console.error('Election current error:', error);
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

    const elections = await prisma.election.findMany({
      where: {
        townId,
        phase: 'COMPLETED',
      },
      include: {
        town: { select: { id: true, name: true } },
        kingdom: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true, level: true, race: true } },
        candidates: {
          include: {
            character: { select: { id: true, name: true } },
          },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { endDate: 'desc' },
      take: limit,
    });

    // Get vote counts per candidate for each election
    const results = await Promise.all(
      elections.map(async (election) => {
        const voteCounts = await prisma.electionVote.groupBy({
          by: ['candidateId'],
          where: { electionId: election.id },
          _count: { candidateId: true },
        });

        const voteMap = new Map(voteCounts.map(v => [v.candidateId, v._count.candidateId]));

        return {
          id: election.id,
          type: election.type,
          termNumber: election.termNumber,
          startDate: election.startDate,
          endDate: election.endDate,
          town: election.town,
          kingdom: election.kingdom,
          winner: election.winner,
          totalVotes: election._count.votes,
          candidates: election.candidates
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
    console.error('Election results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/candidates/:electionId
router.get('/candidates/:electionId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { electionId } = req.params;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
          },
          orderBy: { nominatedAt: 'asc' },
        },
      },
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // If voting is completed, include vote counts
    let voteCounts: Map<string, number> | null = null;
    if (election.phase === 'COMPLETED' || election.phase === 'VOTING') {
      const counts = await prisma.electionVote.groupBy({
        by: ['candidateId'],
        where: { electionId },
        _count: { candidateId: true },
      });
      voteCounts = new Map(counts.map(v => [v.candidateId, v._count.candidateId]));
    }

    const baseCandidates = election.candidates.map(c => ({
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
    console.error('Election candidates error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/impeach
router.post('/impeach', authGuard, characterGuard, validate(impeachSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetId, townId, kingdomId } = req.body;
    const character = req.character!;

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    // Cannot impeach yourself
    if (targetId === character.id) {
      return res.status(400).json({ error: 'You cannot impeach yourself' });
    }

    // Verify the target actually holds the office
    if (townId) {
      const town = await prisma.town.findUnique({ where: { id: townId } });
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
      const kingdom = await prisma.kingdom.findUnique({ where: { id: kingdomId } });
      if (!kingdom) {
        return res.status(404).json({ error: 'Kingdom not found' });
      }
      if (kingdom.rulerId !== targetId) {
        return res.status(400).json({ error: 'Target is not the ruler of this kingdom' });
      }
    }

    // Check for existing active impeachment
    const activeImpeachment = await prisma.impeachment.findFirst({
      where: {
        targetId,
        status: 'ACTIVE',
        ...(townId ? { townId } : {}),
        ...(kingdomId ? { kingdomId } : {}),
      },
    });

    if (activeImpeachment) {
      return res.status(400).json({ error: 'There is already an active impeachment against this official' });
    }

    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + IMPEACHMENT_DURATION_HOURS);

    const impeachment = await prisma.impeachment.create({
      data: {
        targetId,
        townId: townId || null,
        kingdomId: kingdomId || null,
        votesFor: 1, // Initiator automatically votes in favor
        endsAt,
      },
    });

    // Record the initiator's vote
    await prisma.impeachmentVote.create({
      data: {
        impeachmentId: impeachment.id,
        voterId: character.id,
        support: true,
      },
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
    console.error('Impeach error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/impeach/vote
router.post('/impeach/vote', authGuard, characterGuard, validate(impeachVoteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { impeachmentId, support } = req.body;
    const character = req.character!;

    const impeachment = await prisma.impeachment.findUnique({
      where: { id: impeachmentId },
    });

    if (!impeachment) {
      return res.status(404).json({ error: 'Impeachment not found' });
    }

    if (impeachment.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This impeachment is no longer active' });
    }

    if (new Date() > impeachment.endsAt) {
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
    const existingVote = await prisma.impeachmentVote.findUnique({
      where: { impeachmentId_voterId: { impeachmentId, voterId: character.id } },
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this impeachment' });
    }

    await prisma.$transaction([
      prisma.impeachmentVote.create({
        data: {
          impeachmentId,
          voterId: character.id,
          support,
        },
      }),
      prisma.impeachment.update({
        where: { id: impeachmentId },
        data: support
          ? { votesFor: { increment: 1 } }
          : { votesAgainst: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.impeachment.findUnique({
      where: { id: impeachmentId },
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
    console.error('Impeach vote error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
