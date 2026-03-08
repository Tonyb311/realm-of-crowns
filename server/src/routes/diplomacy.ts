import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, inArray, desc, asc } from 'drizzle-orm';
import { sql, count } from 'drizzle-orm';
import { kingdoms, racialRelations, treaties, wars, diplomacyEvents, notifications, characters, towns } from '@database/tables';
import { race as raceEnum, relationStatus as relationStatusEnum } from '@database/enums';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
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
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { getRacialRelations } from '../lib/racial-relations';

type Race = typeof raceEnum.enumValues[number];
type RelationStatus = typeof relationStatusEnum.enumValues[number];

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
  const k = await db.query.kingdoms.findFirst({
    where: eq(kingdoms.rulerId, characterId),
    with: { character: true },
  });
  return k;
}

async function getRelation(race1: Race, race2: Race) {
  const [sorted1, sorted2] = [race1, race2].sort() as [Race, Race];
  return db.query.racialRelations.findFirst({
    where: and(eq(racialRelations.race1, sorted1), eq(racialRelations.race2, sorted2)),
  });
}

async function upsertRelation(race1: Race, race2: Race, status: RelationStatus, modifier: number) {
  const [sorted1, sorted2] = [race1, race2].sort() as [Race, Race];
  // Try update first, then insert if not found
  const existing = await db.query.racialRelations.findFirst({
    where: and(eq(racialRelations.race1, sorted1), eq(racialRelations.race2, sorted2)),
  });
  if (existing) {
    return db.update(racialRelations).set({ status, modifier })
      .where(and(eq(racialRelations.race1, sorted1), eq(racialRelations.race2, sorted2)));
  } else {
    return db.insert(racialRelations).values({ id: crypto.randomUUID(), race1: sorted1, race2: sorted2, status, modifier });
  }
}

async function hasActiveTradeAgreement(kingdomId1: string, kingdomId2: string): Promise<boolean> {
  const allTreaties = await db.query.treaties.findMany({
    where: and(eq(treaties.type, 'TRADE_AGREEMENT'), eq(treaties.status, 'ACTIVE')),
  });

  const treaty = allTreaties.find(t =>
    (t.proposerKingdomId === kingdomId1 && t.receiverKingdomId === kingdomId2) ||
    (t.proposerKingdomId === kingdomId2 && t.receiverKingdomId === kingdomId1)
  );

  if (!treaty || !treaty.startsAt) return false;

  const daysSinceStart = (Date.now() - new Date(treaty.startsAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceStart >= 14;
}

async function logDiplomacyEvent(
  type: 'PROPOSE_TREATY' | 'DECLARE_WAR' | 'TRADE_AGREEMENT' | 'NON_AGGRESSION_PACT' | 'ALLIANCE' | 'BREAK_TREATY',
  initiatorId: string,
  targetId: string,
  details: Record<string, unknown>,
) {
  return db.insert(diplomacyEvents).values({
    id: crypto.randomUUID(),
    type,
    initiatorId,
    targetId,
    details,
  });
}

// =========================================================================
// GET /api/diplomacy/relations — full 20x20 matrix
// =========================================================================
router.get('/relations', async (_req: Request, res: Response) => {
  try {
    const relations = await getRacialRelations();
    const allRaces = raceEnum.enumValues;

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
    if (handleDbError(error, res, 'diplomacy-relations', _req)) return;
    logRouteError(_req, 500, 'Get relations matrix error', error);
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

    if (!raceEnum.enumValues.includes(r1) || !raceEnum.enumValues.includes(r2)) {
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
    if (handleDbError(error, res, 'diplomacy-relation', req)) return;
    logRouteError(req, 500, 'Get specific relation error', error);
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

    const targetKingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, targetKingdomId),
      with: { character: true },
    });
    if (!targetKingdom) return res.status(404).json({ error: 'Target kingdom not found' });
    if (!targetKingdom.character) return res.status(400).json({ error: 'Target kingdom has no ruler' });

    // Check for existing pending or active treaty of same type between these kingdoms
    const allTreaties = await db.query.treaties.findMany({
      where: eq(treaties.type, type),
    });
    const existingTreaty = allTreaties.find(t =>
      ['PENDING', 'ACTIVE'].includes(t.status) && (
        (t.proposerKingdomId === myKingdom.id && t.receiverKingdomId === targetKingdomId) ||
        (t.proposerKingdomId === targetKingdomId && t.receiverKingdomId === myKingdom.id)
      )
    );
    if (existingTreaty) {
      return res.status(409).json({
        error: `A ${type} between these kingdoms is already ${existingTreaty.status.toLowerCase()}`,
      });
    }

    // Get racial relation between the two kingdoms' rulers' races
    const myRace = myKingdom.character!.race as Race;
    const targetRace = targetKingdom.character.race as Race;
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

    const [treaty] = await db.insert(treaties).values({
      id: crypto.randomUUID(),
      type,
      proposerKingdomId: myKingdom.id,
      receiverKingdomId: targetKingdomId,
      proposedById: character.id,
      status: 'PENDING',
      goldCost: validation.goldCost,
      requiredDays: validation.requiredDays,
      metadata: { changelingDiplomat },
    }).returning();

    await logDiplomacyEvent('PROPOSE_TREATY', character.id, targetKingdom.character.id, {
      treatyId: treaty.id,
      type,
      goldCost: validation.goldCost,
    });

    // Psion Nomad: Diplomatic Courier — instant treaty delivery notification
    let instantCourier = false;
    const { isPsion, specialization } = await getPsionSpec(character.id);
    if (isPsion && specialization === 'nomad' && targetKingdom.rulerId) {
      instantCourier = true;
      const [notification] = await db.insert(notifications).values({
        id: crypto.randomUUID(),
        characterId: targetKingdom.rulerId,
        type: 'diplomatic_courier',
        title: 'Urgent Diplomatic Message',
        message: `A Psion courier has delivered a ${type.replace(/_/g, ' ').toLowerCase()} proposal instantly. Respond at your earliest convenience.`,
        data: { treatyId: treaty.id, instant: true },
      }).returning();
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
    if (handleDbError(error, res, 'diplomacy-propose-treaty', req)) return;
    logRouteError(req, 500, 'Propose treaty error', error);
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

    const treaty = await db.query.treaties.findFirst({
      where: eq(treaties.id, proposalId),
      with: {
        kingdom_proposerKingdomId: { with: { character: true } },
        kingdom_receiverKingdomId: { with: { character: true } },
      },
    });

    if (!treaty) return res.status(404).json({ error: 'Treaty proposal not found' });
    if (treaty.status !== 'PENDING') {
      return res.status(400).json({ error: `Treaty is already ${treaty.status.toLowerCase()}` });
    }

    // Only the receiver kingdom's ruler can respond
    if (treaty.kingdom_receiverKingdomId.rulerId !== character.id) {
      return res.status(403).json({ error: 'Only the receiving kingdom ruler can respond to this treaty' });
    }

    if (!accept) {
      await db.update(treaties).set({ status: 'EXPIRED' }).where(eq(treaties.id, treaty.id));
      return res.json({ treaty: { id: treaty.id, status: 'EXPIRED', message: 'Treaty rejected' } });
    }

    // Accept: deduct gold from proposer kingdom, activate treaty
    const now = new Date();
    const expiresAt = treaty.type === 'ALLIANCE' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days for non-alliance

    // Major-B03 FIX: Check treasury balance inside the transaction to prevent
    // accepting a treaty when the proposer kingdom can no longer afford the cost.
    await db.transaction(async (tx) => {
      // Re-read proposer kingdom treasury inside tx for consistency
      const proposer = await tx.query.kingdoms.findFirst({
        where: eq(kingdoms.id, treaty.proposerKingdomId),
        columns: { treasury: true },
      });
      if (!proposer || proposer.treasury < treaty.goldCost) {
        throw new Error('INSUFFICIENT_TREASURY');
      }

      // Deduct gold from proposer kingdom
      await tx.update(kingdoms).set({ treasury: sql`${kingdoms.treasury} - ${treaty.goldCost}` })
        .where(eq(kingdoms.id, treaty.proposerKingdomId));

      // Activate the treaty
      await tx.update(treaties).set({
        status: 'ACTIVE',
        startsAt: now.toISOString(),
        expiresAt: expiresAt?.toISOString() ?? null,
      }).where(eq(treaties.id, treaty.id));
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

    const proposerRace = treaty.kingdom_proposerKingdomId.character?.race;
    const receiverRace = treaty.kingdom_receiverKingdomId.character?.race;

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
        proposerKingdom: treaty.kingdom_proposerKingdomId.name,
        receiverKingdom: treaty.kingdom_receiverKingdomId.name,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'diplomacy-respond-treaty', req)) return;
    logRouteError(req, 500, 'Respond treaty error', error);
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

    const targetKingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, targetKingdomId),
      with: { character: true },
    });
    if (!targetKingdom) return res.status(404).json({ error: 'Target kingdom not found' });

    // Check for existing active war
    const allWars = await db.query.wars.findMany({
      where: eq(wars.status, 'ACTIVE'),
    });
    const existingWar = allWars.find(w =>
      (w.attackerKingdomId === myKingdom.id && w.defenderKingdomId === targetKingdomId) ||
      (w.attackerKingdomId === targetKingdomId && w.defenderKingdomId === myKingdom.id)
    );
    if (existingWar) {
      return res.status(409).json({ error: 'Already at war with this kingdom' });
    }

    // Worsen racial relation
    const myRace = myKingdom.character!.race as Race;
    const targetRace = targetKingdom.character?.race as Race;

    let newRelationStatus: RelationStatus | null = null;

    await db.transaction(async (tx) => {
      // Create war record
      await tx.insert(wars).values({
        id: crypto.randomUUID(),
        attackerKingdomId: myKingdom.id,
        defenderKingdomId: targetKingdomId,
        reason,
        status: 'ACTIVE',
      });

      // Break any active treaties between these kingdoms
      const activeTreaties = await tx.query.treaties.findMany({
        where: eq(treaties.status, 'ACTIVE'),
      });
      const toBreak = activeTreaties.filter(t =>
        (t.proposerKingdomId === myKingdom.id && t.receiverKingdomId === targetKingdomId) ||
        (t.proposerKingdomId === targetKingdomId && t.receiverKingdomId === myKingdom.id)
      );
      for (const t of toBreak) {
        await tx.update(treaties).set({ status: 'BROKEN' }).where(eq(treaties.id, t.id));
      }

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

    const targetCharId = targetKingdom.character?.id;
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
    if (handleDbError(error, res, 'diplomacy-declare-war', req)) return;
    logRouteError(req, 500, 'Declare war error', error);
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

    const treaty = await db.query.treaties.findFirst({
      where: eq(treaties.id, treatyId),
      with: {
        kingdom_proposerKingdomId: { with: { character: true } },
        kingdom_receiverKingdomId: { with: { character: true } },
      },
    });

    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });
    if (treaty.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Treaty is ${treaty.status.toLowerCase()}, not active` });
    }

    // Only rulers of involved kingdoms can break
    const isProposerRuler = treaty.kingdom_proposerKingdomId.rulerId === character.id;
    const isReceiverRuler = treaty.kingdom_receiverKingdomId.rulerId === character.id;
    if (!isProposerRuler && !isReceiverRuler) {
      return res.status(403).json({ error: 'Only rulers of involved kingdoms can break treaties' });
    }

    const breakerKingdom = isProposerRuler ? treaty.kingdom_proposerKingdomId : treaty.kingdom_receiverKingdomId;
    const otherKingdom = isProposerRuler ? treaty.kingdom_receiverKingdomId : treaty.kingdom_proposerKingdomId;

    const penalty = calculateTreatyBreakPenalty(treaty.type as TreatyType);

    await db.transaction(async (tx) => {
      await tx.update(treaties).set({ status: 'BROKEN' }).where(eq(treaties.id, treaty.id));

      // Gold penalty from the breaker's kingdom treasury
      const penaltyAmount = Math.min(penalty.goldPenalty, breakerKingdom.treasury);
      await tx.update(kingdoms).set({ treasury: sql`${kingdoms.treasury} - ${penaltyAmount}` })
        .where(eq(kingdoms.id, breakerKingdom.id));

      // Worsen racial relation
      const breakerRace = breakerKingdom.character?.race as Race;
      const otherRace = otherKingdom.character?.race as Race;
      if (breakerRace && otherRace) {
        const relation = await getRelation(breakerRace, otherRace);
        const currentStatus = relation?.status ?? 'NEUTRAL';
        const newStatus = worsenRelationBySteps(currentStatus, penalty.relationWorsen);
        const modifierDelta = penalty.relationWorsen * -20;
        await upsertRelation(breakerRace, otherRace, newStatus, (relation?.modifier ?? 0) + modifierDelta);
      }
    });

    const targetCharId = otherKingdom.character?.id;
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
    if (handleDbError(error, res, 'diplomacy-break-treaty', req)) return;
    logRouteError(req, 500, 'Break treaty error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/treaties — list active treaties
// =========================================================================
router.get('/treaties', async (req: Request, res: Response) => {
  try {
    const allTreaties = await db.query.treaties.findMany({
      with: {
        kingdom_proposerKingdomId: true,
        kingdom_receiverKingdomId: true,
        character: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // Filter to ACTIVE or PENDING at app level
    const filteredTreaties = allTreaties.filter(t => ['ACTIVE', 'PENDING'].includes(t.status));

    const baseTreaties = filteredTreaties.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      proposerKingdom: { id: t.kingdom_proposerKingdomId.id, name: t.kingdom_proposerKingdomId.name },
      proposerKingdomId: t.proposerKingdomId,
      receiverKingdom: { id: t.kingdom_receiverKingdomId.id, name: t.kingdom_receiverKingdomId.name },
      proposedBy: t.character ? { id: t.character.id, name: t.character.name, race: t.character.race } : null,
      goldCost: t.goldCost,
      startsAt: t.startsAt ?? null,
      expiresAt: t.expiresAt ?? null,
    }));

    // Psion Telepath: Deception Detection — add credibility flag to pending treaties
    let enrichedTreaties: (typeof baseTreaties[number] & { psionInsight?: unknown })[] = baseTreaties;
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.userId) {
      const character = await db.query.characters.findFirst({
        where: eq(characters.userId, authReq.user.userId),
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      });
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
    if (handleDbError(error, res, 'diplomacy-treaties', req)) return;
    logRouteError(req, 500, 'List treaties error', error);
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
    if (handleDbError(error, res, 'diplomacy-tension', req)) return;
    logRouteError(req, 500, 'Tension index error', error);
    return res.status(500).json({ error: 'Failed to calculate tension index' });
  }
});

// =========================================================================
// GET /api/diplomacy/wars — list active wars
// =========================================================================
router.get('/wars', async (_req: Request, res: Response) => {
  try {
    const allWars = await db.query.wars.findMany({
      where: eq(wars.status, 'ACTIVE'),
      with: {
        kingdom_attackerKingdomId: true,
        kingdom_defenderKingdomId: true,
      },
      orderBy: (w, { desc }) => [desc(w.startedAt)],
    });

    return res.json({
      wars: allWars.map(w => ({
        id: w.id,
        attackerKingdom: { id: w.kingdom_attackerKingdomId.id, name: w.kingdom_attackerKingdomId.name },
        defenderKingdom: { id: w.kingdom_defenderKingdomId.id, name: w.kingdom_defenderKingdomId.name },
        reason: w.reason,
        status: w.status,
        attackerScore: w.attackerScore,
        defenderScore: w.defenderScore,
        startedAt: w.startedAt,
      })),
      total: allWars.length,
    });
  } catch (error) {
    if (handleDbError(error, res, 'diplomacy-wars', _req)) return;
    logRouteError(_req, 500, 'List wars error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/diplomacy/wars/:id — war details with war score
// =========================================================================
router.get('/wars/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const war = await db.query.wars.findFirst({
      where: eq(wars.id, id),
      with: {
        kingdom_attackerKingdomId: true,
        kingdom_defenderKingdomId: true,
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
        attackerKingdom: { id: war.kingdom_attackerKingdomId.id, name: war.kingdom_attackerKingdomId.name },
        defenderKingdom: { id: war.kingdom_defenderKingdomId.id, name: war.kingdom_defenderKingdomId.name },
        reason: war.reason,
        status: war.status,
        startedAt: war.startedAt,
        endedAt: war.endedAt ?? null,
        scores: {
          attacker: attackerScore,
          defender: defenderScore,
        },
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'diplomacy-war-details', req)) return;
    logRouteError(req, 500, 'Get war details error', error);
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

    const war = await db.query.wars.findFirst({
      where: eq(wars.id, id),
      with: {
        kingdom_attackerKingdomId: { with: { character: true } },
        kingdom_defenderKingdomId: { with: { character: true } },
      },
    });

    if (!war) return res.status(404).json({ error: 'War not found' });
    if (war.status !== 'ACTIVE') {
      return res.status(400).json({ error: `War is already ${war.status}` });
    }

    // Only rulers of warring kingdoms can negotiate
    const isAttackerRuler = war.kingdom_attackerKingdomId.rulerId === character.id;
    const isDefenderRuler = war.kingdom_defenderKingdomId.rulerId === character.id;
    if (!isAttackerRuler && !isDefenderRuler) {
      return res.status(403).json({ error: 'Only rulers of warring kingdoms can negotiate peace' });
    }

    // End the war
    await db.update(wars).set({
      status: 'ENDED',
      endedAt: new Date().toISOString(),
    }).where(eq(wars.id, war.id));

    return res.json({
      peace: {
        warId: war.id,
        status: 'ENDED',
        terms: terms ?? 'Unconditional peace',
        attackerKingdom: war.kingdom_attackerKingdomId.name,
        defenderKingdom: war.kingdom_defenderKingdomId.name,
        finalScores: {
          attacker: war.attackerScore,
          defender: war.defenderScore,
        },
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'diplomacy-negotiate-peace', req)) return;
    logRouteError(req, 500, 'Negotiate peace error', error);
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

    const [events, totalResult] = await Promise.all([
      db.query.diplomacyEvents.findMany({
        with: {
          character_initiatorId: true,
          character_targetId: true,
        },
        orderBy: (e, { desc }) => [desc(e.timestamp)],
        limit,
        offset,
      }),
      db.select({ total: count() }).from(diplomacyEvents),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return res.json({
      events: events.map(e => ({
        id: e.id,
        type: e.type,
        initiator: e.character_initiatorId ? { id: e.character_initiatorId.id, name: e.character_initiatorId.name, race: e.character_initiatorId.race } : null,
        target: e.character_targetId ? { id: e.character_targetId.id, name: e.character_targetId.name, race: e.character_targetId.race } : null,
        details: e.details,
        timestamp: e.timestamp,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (handleDbError(error, res, 'diplomacy-history', req)) return;
    logRouteError(req, 500, 'Get diplomacy history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
