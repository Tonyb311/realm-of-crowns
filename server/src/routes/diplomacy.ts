import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { Race, RelationStatus, Prisma } from '@prisma/client';
import {
  calculateRelationChangeCost,
  validateTreaty,
  calculateWarScore,
  worsenRelationForWar,
  calculateTreatyBreakPenalty,
  worsenRelationBySteps,
  isChangelingDiplomat,
  getRelationRank,
  type TreatyType,
} from '../services/diplomacy-engine';
import { getPsionSpec, assessTreatyCredibility, calculateTensionIndex } from '../services/psion-perks';
import { emitNotification } from '../socket/events';

const router = Router();

// =========================================================================
// Zod Schemas
// =========================================================================

const proposeTreatySchema = z.object({
  targetKingdomId: z.string().uuid(),
  type: z.enum(['TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE']),
});

const respondTreatySchema = z.object({
  accept: z.boolean(),
});

const declareWarSchema = z.object({
  targetKingdomId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const negotiatePeaceSchema = z.object({
  terms: z.string().min(1).max(1000).optional(),
});

// =========================================================================
// Helpers
// =========================================================================

async function getRulerKingdom(characterId: string) {
  return prisma.kingdom.findFirst({
    where: { rulerId: characterId },
    include: { ruler: true },
  });
}

async function getRelation(race1: Race, race2: Race) {
  const [sorted1, sorted2] = [race1, race2].sort() as [Race, Race];
  return prisma.racialRelation.findUnique({
    where: { race1_race2: { race1: sorted1, race2: sorted2 } },
  });
}

async function upsertRelation(race1: Race, race2: Race, status: RelationStatus, modifier: number) {
  const [sorted1, sorted2] = [race1, race2].sort() as [Race, Race];
  return prisma.racialRelation.upsert({
    where: { race1_race2: { race1: sorted1, race2: sorted2 } },
    update: { status, modifier },
    create: { race1: sorted1, race2: sorted2, status, modifier },
  });
}

async function hasActiveTradeAgreement(kingdomId1: string, kingdomId2: string): Promise<boolean> {
  const treaty = await prisma.treaty.findFirst({
    where: {
      type: 'TRADE_AGREEMENT',
      status: 'ACTIVE',
      OR: [
        { proposerKingdomId: kingdomId1, receiverKingdomId: kingdomId2 },
        { proposerKingdomId: kingdomId2, receiverKingdomId: kingdomId1 },
      ],
    },
  });

  if (!treaty || !treaty.startsAt) return false;

  const daysSinceStart = (Date.now() - treaty.startsAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceStart >= 14;
}

async function logDiplomacyEvent(
  type: 'PROPOSE_TREATY' | 'DECLARE_WAR' | 'TRADE_AGREEMENT' | 'NON_AGGRESSION_PACT' | 'ALLIANCE' | 'BREAK_TREATY',
  initiatorId: string,
  targetId: string,
  details: Record<string, unknown>,
) {
  return prisma.diplomacyEvent.create({
    data: {
      type,
      initiatorId,
      targetId,
      details: details as Prisma.InputJsonValue,
    },
  });
}

// =========================================================================
// GET /api/diplomacy/relations — full 20x20 matrix
// =========================================================================
router.get('/relations', async (_req: Request, res: Response) => {
  try {
    const relations = await prisma.racialRelation.findMany();
    const allRaces = Object.values(Race);

    const matrix: Record<string, Record<string, { status: string; modifier: number }>> = {};
    for (const r1 of allRaces) {
      matrix[r1] = {};
      for (const r2 of allRaces) {
        matrix[r1][r2] = r1 === r2
          ? { status: 'SELF', modifier: 0 }
          : { status: 'NEUTRAL', modifier: 0 };
      }
    }

    for (const rel of relations) {
      matrix[rel.race1][rel.race2] = { status: rel.status, modifier: rel.modifier };
      matrix[rel.race2][rel.race1] = { status: rel.status, modifier: rel.modifier };
    }

    return res.json({ matrix, races: allRaces });
  } catch (error) {
    console.error('Get relations matrix error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/relations/:race1/:race2 — specific relation
// =========================================================================
router.get('/relations/:race1/:race2', async (req: Request, res: Response) => {
  try {
    const { race1, race2 } = req.params;
    const r1 = race1.toUpperCase() as Race;
    const r2 = race2.toUpperCase() as Race;

    if (!Object.values(Race).includes(r1) || !Object.values(Race).includes(r2)) {
      return res.status(400).json({ error: 'Invalid race name' });
    }

    if (r1 === r2) {
      return res.json({ race1: r1, race2: r2, status: 'SELF', modifier: 0 });
    }

    const relation = await getRelation(r1, r2);

    return res.json({
      race1: r1,
      race2: r2,
      status: relation?.status ?? 'NEUTRAL',
      modifier: relation?.modifier ?? 0,
    });
  } catch (error) {
    console.error('Get specific relation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/diplomacy/propose-treaty — propose a treaty (kingdom ruler only)
// =========================================================================
router.post('/propose-treaty', authGuard, characterGuard, validate(proposeTreatySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetKingdomId, type } = req.body as { targetKingdomId: string; type: TreatyType };
    const character = req.character!;

    const myKingdom = await getRulerKingdom(character.id);
    if (!myKingdom) return res.status(403).json({ error: 'You must be a kingdom ruler to propose treaties' });

    if (myKingdom.id === targetKingdomId) {
      return res.status(400).json({ error: 'Cannot propose treaty with yourself' });
    }

    const targetKingdom = await prisma.kingdom.findUnique({
      where: { id: targetKingdomId },
      include: { ruler: true },
    });
    if (!targetKingdom) return res.status(404).json({ error: 'Target kingdom not found' });
    if (!targetKingdom.ruler) return res.status(400).json({ error: 'Target kingdom has no ruler' });

    // Check for existing pending or active treaty of same type between these kingdoms
    const existingTreaty = await prisma.treaty.findFirst({
      where: {
        type,
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [
          { proposerKingdomId: myKingdom.id, receiverKingdomId: targetKingdomId },
          { proposerKingdomId: targetKingdomId, receiverKingdomId: myKingdom.id },
        ],
      },
    });
    if (existingTreaty) {
      return res.status(409).json({
        error: `A ${type} between these kingdoms is already ${existingTreaty.status.toLowerCase()}`,
      });
    }

    // Get racial relation between the two kingdoms' rulers' races
    const myRace = myKingdom.ruler!.race;
    const targetRace = targetKingdom.ruler.race;
    const relation = await getRelation(myRace, targetRace);
    const currentStatus = relation?.status ?? 'NEUTRAL';

    const changelingDiplomat = isChangelingDiplomat(myRace, targetRace);
    const activeTradeAgreement = await hasActiveTradeAgreement(myKingdom.id, targetKingdomId);

    const validation = validateTreaty(type, currentStatus, changelingDiplomat, activeTradeAgreement);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    // Check proposer kingdom has enough gold
    if (myKingdom.treasury < validation.goldCost) {
      return res.status(400).json({
        error: `Insufficient kingdom treasury. Need ${validation.goldCost}g, have ${myKingdom.treasury}g`,
      });
    }

    const treaty = await prisma.treaty.create({
      data: {
        type,
        proposerKingdomId: myKingdom.id,
        receiverKingdomId: targetKingdomId,
        proposedById: character.id,
        status: 'PENDING',
        goldCost: validation.goldCost,
        requiredDays: validation.requiredDays,
        metadata: { changelingDiplomat },
      },
    });

    await logDiplomacyEvent('PROPOSE_TREATY', character.id, targetKingdom.ruler.id, {
      treatyId: treaty.id,
      type,
      goldCost: validation.goldCost,
    });

    // Psion Nomad: Diplomatic Courier — instant treaty delivery notification
    let instantCourier = false;
    const { isPsion, specialization } = await getPsionSpec(character.id);
    if (isPsion && specialization === 'nomad' && targetKingdom.rulerId) {
      instantCourier = true;
      const notification = await prisma.notification.create({
        data: {
          characterId: targetKingdom.rulerId,
          type: 'diplomatic_courier',
          title: 'Urgent Diplomatic Message',
          message: `A Psion courier has delivered a ${type.replace(/_/g, ' ').toLowerCase()} proposal instantly. Respond at your earliest convenience.`,
          data: { treatyId: treaty.id, instant: true },
        },
      });
      emitNotification(targetKingdom.rulerId, {
        id: notification.id,
        type: 'diplomatic_courier',
        title: 'Urgent Diplomatic Message',
        message: `A Psion Nomad has delivered a treaty proposal via dimensional courier.`,
        data: { treatyId: treaty.id },
      });
    }

    return res.status(201).json({
      treaty: {
        id: treaty.id,
        type: treaty.type,
        status: treaty.status,
        goldCost: treaty.goldCost,
        requiredDays: treaty.requiredDays,
        proposerKingdom: myKingdom.name,
        receiverKingdom: targetKingdom.name,
        changelingDiplomat,
        ...(instantCourier ? { instantCourier: true } : {}),
      },
    });
  } catch (error) {
    console.error('Propose treaty error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/diplomacy/respond-treaty/:proposalId — accept or reject
// =========================================================================
router.post('/respond-treaty/:proposalId', authGuard, characterGuard, validate(respondTreatySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { accept } = req.body as { accept: boolean };
    const character = req.character!;

    const treaty = await prisma.treaty.findUnique({
      where: { id: proposalId },
      include: {
        proposerKingdom: { include: { ruler: true } },
        receiverKingdom: { include: { ruler: true } },
      },
    });

    if (!treaty) return res.status(404).json({ error: 'Treaty proposal not found' });
    if (treaty.status !== 'PENDING') {
      return res.status(400).json({ error: `Treaty is already ${treaty.status.toLowerCase()}` });
    }

    // Only the receiver kingdom's ruler can respond
    if (treaty.receiverKingdom.rulerId !== character.id) {
      return res.status(403).json({ error: 'Only the receiving kingdom ruler can respond to this treaty' });
    }

    if (!accept) {
      await prisma.treaty.update({
        where: { id: treaty.id },
        data: { status: 'EXPIRED' },
      });

      return res.json({ treaty: { id: treaty.id, status: 'EXPIRED', message: 'Treaty rejected' } });
    }

    // Accept: deduct gold from proposer kingdom, activate treaty
    const now = new Date();
    const expiresAt = treaty.type === 'ALLIANCE' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days for non-alliance

    // Major-B03 FIX: Check treasury balance inside the transaction to prevent
    // accepting a treaty when the proposer kingdom can no longer afford the cost.
    await prisma.$transaction(async (tx) => {
      // Re-read proposer kingdom treasury inside tx for consistency
      const proposer = await tx.kingdom.findUnique({
        where: { id: treaty.proposerKingdomId },
        select: { treasury: true },
      });
      if (!proposer || proposer.treasury < treaty.goldCost) {
        throw new Error('INSUFFICIENT_TREASURY');
      }

      // Deduct gold from proposer kingdom
      await tx.kingdom.update({
        where: { id: treaty.proposerKingdomId },
        data: { treasury: { decrement: treaty.goldCost } },
      });

      // Activate the treaty
      await tx.treaty.update({
        where: { id: treaty.id },
        data: {
          status: 'ACTIVE',
          startsAt: now,
          expiresAt,
        },
      });
    }).catch((err) => {
      if (err.message === 'INSUFFICIENT_TREASURY') {
        return res.status(400).json({
          error: `Proposer kingdom no longer has sufficient treasury (need ${treaty.goldCost}g)`,
        });
      }
      throw err;
    });

    // If res was already sent by the catch above, stop here
    if (res.headersSent) return;

    const proposerRace = treaty.proposerKingdom.ruler?.race;
    const receiverRace = treaty.receiverKingdom.ruler?.race;

    await logDiplomacyEvent(
      treaty.type as 'TRADE_AGREEMENT' | 'NON_AGGRESSION_PACT' | 'ALLIANCE',
      treaty.proposedById,
      character.id,
      { treatyId: treaty.id, accepted: true },
    );

    return res.json({
      treaty: {
        id: treaty.id,
        type: treaty.type,
        status: 'ACTIVE',
        startsAt: now.toISOString(),
        expiresAt: expiresAt?.toISOString() ?? null,
        goldDeducted: treaty.goldCost,
        proposerKingdom: treaty.proposerKingdom.name,
        receiverKingdom: treaty.receiverKingdom.name,
      },
    });
  } catch (error) {
    console.error('Respond treaty error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/diplomacy/declare-war — declare war (unilateral)
// =========================================================================
router.post('/declare-war', authGuard, characterGuard, validate(declareWarSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetKingdomId, reason } = req.body as { targetKingdomId: string; reason: string };
    const character = req.character!;

    const myKingdom = await getRulerKingdom(character.id);
    if (!myKingdom) return res.status(403).json({ error: 'You must be a kingdom ruler to declare war' });

    if (myKingdom.id === targetKingdomId) {
      return res.status(400).json({ error: 'Cannot declare war on yourself' });
    }

    const targetKingdom = await prisma.kingdom.findUnique({
      where: { id: targetKingdomId },
      include: { ruler: true },
    });
    if (!targetKingdom) return res.status(404).json({ error: 'Target kingdom not found' });

    // Check for existing active war
    const existingWar = await prisma.war.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { attackerKingdomId: myKingdom.id, defenderKingdomId: targetKingdomId },
          { attackerKingdomId: targetKingdomId, defenderKingdomId: myKingdom.id },
        ],
      },
    });
    if (existingWar) {
      return res.status(409).json({ error: 'Already at war with this kingdom' });
    }

    // Worsen racial relation
    const myRace = myKingdom.ruler!.race;
    const targetRace = targetKingdom.ruler?.race;

    let newRelationStatus: RelationStatus | null = null;

    await prisma.$transaction(async (tx) => {
      // Create war record
      await tx.war.create({
        data: {
          attackerKingdomId: myKingdom.id,
          defenderKingdomId: targetKingdomId,
          reason,
          status: 'ACTIVE',
        },
      });

      // Break any active treaties between these kingdoms
      await tx.treaty.updateMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { proposerKingdomId: myKingdom.id, receiverKingdomId: targetKingdomId },
            { proposerKingdomId: targetKingdomId, receiverKingdomId: myKingdom.id },
          ],
        },
        data: { status: 'BROKEN' },
      });

      // Worsen racial relation if both rulers have races
      if (targetRace) {
        const relation = await getRelation(myRace, targetRace);
        const currentStatus = relation?.status ?? 'NEUTRAL';
        newRelationStatus = worsenRelationForWar(currentStatus);

        const modifierDelta = (getRelationRank(currentStatus) - getRelationRank(newRelationStatus)) * -20;
        const newModifier = (relation?.modifier ?? 0) + modifierDelta;

        await upsertRelation(myRace, targetRace, newRelationStatus, newModifier);
      }
    });

    const targetCharId = targetKingdom.ruler?.id;
    if (targetCharId) {
      await logDiplomacyEvent('DECLARE_WAR', character.id, targetCharId, {
        attackerKingdom: myKingdom.name,
        defenderKingdom: targetKingdom.name,
        reason,
      });
    }

    return res.status(201).json({
      war: {
        attackerKingdom: myKingdom.name,
        defenderKingdom: targetKingdom.name,
        reason,
        status: 'ACTIVE',
        relationChange: newRelationStatus
          ? { newStatus: newRelationStatus }
          : null,
      },
    });
  } catch (error) {
    console.error('Declare war error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/diplomacy/break-treaty/:treatyId — cancel an active treaty
// =========================================================================
router.post('/break-treaty/:treatyId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treatyId } = req.params;
    const character = req.character!;

    const treaty = await prisma.treaty.findUnique({
      where: { id: treatyId },
      include: {
        proposerKingdom: { include: { ruler: true } },
        receiverKingdom: { include: { ruler: true } },
      },
    });

    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });
    if (treaty.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Treaty is ${treaty.status.toLowerCase()}, not active` });
    }

    // Only rulers of involved kingdoms can break
    const isProposerRuler = treaty.proposerKingdom.rulerId === character.id;
    const isReceiverRuler = treaty.receiverKingdom.rulerId === character.id;
    if (!isProposerRuler && !isReceiverRuler) {
      return res.status(403).json({ error: 'Only rulers of involved kingdoms can break treaties' });
    }

    const breakerKingdom = isProposerRuler ? treaty.proposerKingdom : treaty.receiverKingdom;
    const otherKingdom = isProposerRuler ? treaty.receiverKingdom : treaty.proposerKingdom;

    const penalty = calculateTreatyBreakPenalty(treaty.type as TreatyType);

    await prisma.$transaction(async (tx) => {
      await tx.treaty.update({
        where: { id: treaty.id },
        data: { status: 'BROKEN' },
      });

      // Gold penalty from the breaker's kingdom treasury
      await tx.kingdom.update({
        where: { id: breakerKingdom.id },
        data: { treasury: { decrement: Math.min(penalty.goldPenalty, breakerKingdom.treasury) } },
      });

      // Worsen racial relation
      const breakerRace = breakerKingdom.ruler?.race;
      const otherRace = otherKingdom.ruler?.race;
      if (breakerRace && otherRace) {
        const relation = await getRelation(breakerRace, otherRace);
        const currentStatus = relation?.status ?? 'NEUTRAL';
        const newStatus = worsenRelationBySteps(currentStatus, penalty.relationWorsen);
        const modifierDelta = penalty.relationWorsen * -20;
        await upsertRelation(breakerRace, otherRace, newStatus, (relation?.modifier ?? 0) + modifierDelta);
      }
    });

    const targetCharId = otherKingdom.ruler?.id;
    if (targetCharId) {
      await logDiplomacyEvent('BREAK_TREATY', character.id, targetCharId, {
        treatyId: treaty.id,
        treatyType: treaty.type,
        goldPenalty: penalty.goldPenalty,
        relationWorsen: penalty.relationWorsen,
      });
    }

    return res.json({
      broken: true,
      treaty: { id: treaty.id, type: treaty.type },
      penalty: {
        goldPenalty: penalty.goldPenalty,
        relationWorsen: penalty.relationWorsen,
      },
    });
  } catch (error) {
    console.error('Break treaty error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/treaties — list active treaties
// =========================================================================
router.get('/treaties', async (req: Request, res: Response) => {
  try {
    const treaties = await prisma.treaty.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING'] } },
      include: {
        proposerKingdom: { select: { id: true, name: true } },
        receiverKingdom: { select: { id: true, name: true } },
        proposedBy: { select: { id: true, name: true, race: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const baseTreaties = treaties.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      proposerKingdom: t.proposerKingdom,
      proposerKingdomId: t.proposerKingdomId,
      receiverKingdom: t.receiverKingdom,
      proposedBy: t.proposedBy,
      goldCost: t.goldCost,
      startsAt: t.startsAt?.toISOString() ?? null,
      expiresAt: t.expiresAt?.toISOString() ?? null,
    }));

    // Psion Telepath: Deception Detection — add credibility flag to pending treaties
    let enrichedTreaties: (typeof baseTreaties[number] & { psionInsight?: unknown })[] = baseTreaties;
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.userId) {
      const character = await prisma.character.findFirst({ where: { userId: authReq.user.userId }, orderBy: { createdAt: 'asc' } });
      if (character) {
        const { isPsion, specialization } = await getPsionSpec(character.id);
        if (isPsion && specialization === 'telepath') {
          enrichedTreaties = await Promise.all(
            baseTreaties.map(async (treaty) => {
              if (treaty.status === 'PENDING') {
                const credibility = await assessTreatyCredibility(treaty.proposerKingdomId);
                return { ...treaty, psionInsight: { credibility } };
              }
              return treaty;
            }),
          );
        }
      }
    }

    return res.json({
      treaties: enrichedTreaties,
      total: enrichedTreaties.length,
    });
  } catch (error) {
    console.error('List treaties error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/tension/:kingdomId1/:kingdomId2 — Seer War Forecast
// =========================================================================
router.get('/tension/:kingdomId1/:kingdomId2', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { isPsion, specialization } = await getPsionSpec(character.id);
    if (!isPsion || specialization !== 'seer') {
      return res.status(403).json({ error: 'Only Psion Seers can view the Tension Index' });
    }

    const { kingdomId1, kingdomId2 } = req.params;
    const result = await calculateTensionIndex(kingdomId1, kingdomId2);

    return res.json({
      kingdomId1,
      kingdomId2,
      tensionIndex: result.tensionIndex,
      factors: result.factors,
      assessment:
        result.tensionIndex >= 70
          ? 'War Imminent'
          : result.tensionIndex >= 40
            ? 'Elevated Tensions'
            : result.tensionIndex >= 20
              ? 'Cautious'
              : 'Peaceful',
    });
  } catch (error) {
    console.error('Tension index error:', error);
    return res.status(500).json({ error: 'Failed to calculate tension index' });
  }
});

// =========================================================================
// GET /api/diplomacy/wars — list active wars
// =========================================================================
router.get('/wars', async (_req: Request, res: Response) => {
  try {
    const wars = await prisma.war.findMany({
      where: { status: 'ACTIVE' },
      include: {
        attackerKingdom: { select: { id: true, name: true } },
        defenderKingdom: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return res.json({
      wars: wars.map(w => ({
        id: w.id,
        attackerKingdom: w.attackerKingdom,
        defenderKingdom: w.defenderKingdom,
        reason: w.reason,
        status: w.status,
        attackerScore: w.attackerScore,
        defenderScore: w.defenderScore,
        startedAt: w.startedAt.toISOString(),
      })),
      total: wars.length,
    });
  } catch (error) {
    console.error('List wars error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/wars/:id — war details with war score
// =========================================================================
router.get('/wars/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const war = await prisma.war.findUnique({
      where: { id },
      include: {
        attackerKingdom: { select: { id: true, name: true } },
        defenderKingdom: { select: { id: true, name: true } },
      },
    });

    if (!war) return res.status(404).json({ error: 'War not found' });

    const attackerScore = calculateWarScore({
      pvpKills: war.attackerScore, // simplified: stored score acts as kill count
      raids: 0,
      territoryCaptured: 0,
      territoryLost: 0,
    });

    const defenderScore = calculateWarScore({
      pvpKills: war.defenderScore,
      raids: 0,
      territoryCaptured: 0,
      territoryLost: 0,
    });

    return res.json({
      war: {
        id: war.id,
        attackerKingdom: war.attackerKingdom,
        defenderKingdom: war.defenderKingdom,
        reason: war.reason,
        status: war.status,
        startedAt: war.startedAt.toISOString(),
        endedAt: war.endedAt?.toISOString() ?? null,
        scores: {
          attacker: attackerScore,
          defender: defenderScore,
        },
      },
    });
  } catch (error) {
    console.error('Get war details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/diplomacy/wars/:id/negotiate-peace — peace negotiation
// =========================================================================
router.post('/wars/:id/negotiate-peace', authGuard, characterGuard, validate(negotiatePeaceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { terms } = req.body as { terms?: string };
    const character = req.character!;

    const war = await prisma.war.findUnique({
      where: { id },
      include: {
        attackerKingdom: { include: { ruler: true } },
        defenderKingdom: { include: { ruler: true } },
      },
    });

    if (!war) return res.status(404).json({ error: 'War not found' });
    if (war.status !== 'ACTIVE') {
      return res.status(400).json({ error: `War is already ${war.status}` });
    }

    // Only rulers of warring kingdoms can negotiate
    const isAttackerRuler = war.attackerKingdom.rulerId === character.id;
    const isDefenderRuler = war.defenderKingdom.rulerId === character.id;
    if (!isAttackerRuler && !isDefenderRuler) {
      return res.status(403).json({ error: 'Only rulers of warring kingdoms can negotiate peace' });
    }

    // End the war
    await prisma.war.update({
      where: { id: war.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    return res.json({
      peace: {
        warId: war.id,
        status: 'ENDED',
        terms: terms ?? 'Unconditional peace',
        attackerKingdom: war.attackerKingdom.name,
        defenderKingdom: war.defenderKingdom.name,
        finalScores: {
          attacker: war.attackerScore,
          defender: war.defenderScore,
        },
      },
    });
  } catch (error) {
    console.error('Negotiate peace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/history — treaty/diplomatic history log
// =========================================================================
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [events, total] = await Promise.all([
      prisma.diplomacyEvent.findMany({
        include: {
          initiator: { select: { id: true, name: true, race: true } },
          target: { select: { id: true, name: true, race: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.diplomacyEvent.count(),
    ]);

    return res.json({
      events: events.map(e => ({
        id: e.id,
        type: e.type,
        initiator: e.initiator,
        target: e.target,
        details: e.details,
        timestamp: e.timestamp.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get diplomacy history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
