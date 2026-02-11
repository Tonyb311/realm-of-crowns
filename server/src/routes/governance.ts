import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { emitGovernanceEvent } from '../socket/events';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// --- Schemas ---

const proposeLawSchema = z.object({
  kingdomId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  effects: z.record(z.unknown()).optional(),
  lawType: z.enum(['tax', 'trade', 'military', 'building', 'general']).default('general'),
  expiresAt: z.string().datetime().optional(),
});

const voteLawSchema = z.object({
  lawId: z.string().min(1),
  vote: z.enum(['for', 'against']),
});

const setTaxSchema = z.object({
  townId: z.string().min(1),
  taxRate: z.number().min(0).max(0.25),
});

const appointSchema = z.object({
  characterId: z.string().min(1),
  role: z.string().min(1),
  townId: z.string().optional(),
  kingdomId: z.string().optional(),
});

const allocateTreasurySchema = z.object({
  townId: z.string().optional(),
  kingdomId: z.string().optional(),
  amount: z.number().int().min(1),
  purpose: z.enum(['buildings', 'military', 'infrastructure', 'events']),
  details: z.record(z.unknown()).optional(),
});

const declareWarSchema = z.object({
  targetKingdomId: z.string().min(1),
  reason: z.string().optional(),
});

const proposePeaceSchema = z.object({
  warId: z.string().min(1),
  terms: z.string().optional(),
});

// --- Helpers ---

// POST /propose-law
router.post('/propose-law', authGuard, characterGuard, validate(proposeLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId, title, description, effects, lawType, expiresAt } = req.body;
    const character = req.character!;

    // Check if character is ruler of this kingdom or mayor of a town in it
    const kingdom = await prisma.kingdom.findUnique({
      where: { id: kingdomId },
    });

    if (!kingdom) {
      return res.status(404).json({ error: 'Kingdom not found' });
    }

    const isRuler = kingdom.rulerId === character.id;
    const isMayor = await prisma.town.findFirst({
      where: { mayorId: character.id },
    });

    if (!isRuler && !isMayor) {
      return res.status(403).json({ error: 'Only rulers or mayors can propose laws' });
    }

    const law = await prisma.law.create({
      data: {
        kingdomId,
        title,
        description,
        effects: effects ?? {},
        enactedById: character.id,
        status: 'PROPOSED',
        lawType: lawType ?? 'general',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({ law });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-propose-law', req)) return;
    logRouteError(req, 500, 'Propose law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vote-law
router.post('/vote-law', authGuard, characterGuard, validate(voteLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lawId, vote } = req.body;
    const character = req.character!;

    const law = await prisma.law.findUnique({
      where: { id: lawId },
    });

    if (!law) {
      return res.status(404).json({ error: 'Law not found' });
    }

    if (law.status !== 'PROPOSED' && law.status !== 'VOTING') {
      return res.status(400).json({ error: 'Law is not open for voting' });
    }

    // Check if character is a council member for this kingdom
    const councilMember = await prisma.councilMember.findFirst({
      where: {
        characterId: character.id,
        kingdomId: law.kingdomId,
      },
    });

    // Also allow the ruler to vote
    const kingdom = await prisma.kingdom.findUnique({
      where: { id: law.kingdomId },
    });

    if (!councilMember && kingdom?.rulerId !== character.id) {
      return res.status(403).json({ error: 'Only council members and the ruler can vote on laws' });
    }

    // Check for existing vote (prevent vote stuffing)
    const existingVote = await prisma.lawVote.findUnique({
      where: { lawId_characterId: { lawId, characterId: character.id } },
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this law' });
    }

    // Record the vote
    await prisma.lawVote.create({
      data: {
        lawId,
        characterId: character.id,
        vote: vote === 'for' ? 'FOR' : 'AGAINST',
      },
    });

    // Recalculate vote counts from LawVote records
    const votesFor = await prisma.lawVote.count({
      where: { lawId, vote: 'FOR' },
    });
    const votesAgainst = await prisma.lawVote.count({
      where: { lawId, vote: 'AGAINST' },
    });

    const updatedLaw = await prisma.law.update({
      where: { id: lawId },
      data: {
        status: 'VOTING',
        votesFor,
        votesAgainst,
      },
    });

    // Auto-activate if enough votes (simple majority: votesFor > votesAgainst and at least 3 total votes)
    const totalVotes = updatedLaw.votesFor + updatedLaw.votesAgainst;
    if (totalVotes >= 3 && updatedLaw.votesFor > updatedLaw.votesAgainst) {
      await prisma.law.update({
        where: { id: lawId },
        data: { status: 'ACTIVE', enactedAt: new Date() },
      });

      emitGovernanceEvent('governance:law-passed', `kingdom:${law.kingdomId}`, {
        lawId: law.id,
        title: law.title,
        lawType: law.lawType,
        kingdomId: law.kingdomId,
      });
    }

    return res.json({ law: updatedLaw });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-vote-law', req)) return;
    logRouteError(req, 500, 'Vote law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-tax
router.post('/set-tax', authGuard, characterGuard, validate(setTaxSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, taxRate } = req.body;
    const character = req.character!;

    const town = await prisma.town.findUnique({
      where: { id: townId },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set the tax rate' });
    }

    const policy = await prisma.townPolicy.upsert({
      where: { townId },
      update: { taxRate },
      create: { townId, taxRate },
    });

    // P1 #35: Sync tax rate to TownTreasury so all readers see consistent value
    await prisma.townTreasury.upsert({
      where: { townId },
      update: { taxRate },
      create: { townId, taxRate },
    });

    emitGovernanceEvent('governance:tax-changed', `town:${townId}`, {
      townId,
      taxRate,
      setBy: character.name,
    });

    return res.json({ policy });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-set-tax', req)) return;
    logRouteError(req, 500, 'Set tax error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /laws
router.get('/laws', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const kingdomId = req.query.kingdomId as string | undefined;
    const status = req.query.status as 'PROPOSED' | 'VOTING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | undefined;

    if (!kingdomId) {
      return res.status(400).json({ error: 'kingdomId is required' });
    }

    const laws = await prisma.law.findMany({
      where: {
        kingdomId,
        ...(status ? { status } : {}),
      },
      include: {
        enactedBy: { select: { id: true, name: true } },
      },
      orderBy: { proposedAt: 'desc' },
    });

    return res.json({ laws });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-get-laws', req)) return;
    logRouteError(req, 500, 'Get laws error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /town-info/:townId
router.get('/town-info/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const town = await prisma.town.findUnique({
      where: { id: townId },
      include: {
        mayor: { select: { id: true, name: true, level: true } },
        treasury: true,
        // P1 #25: Include region to derive kingdomId
        region: { select: { kingdomId: true } },
        townPolicy: {
          include: {
            sheriff: { select: { id: true, name: true, level: true } },
          },
        },
        councilMembers: {
          include: {
            character: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    return res.json({
      town: {
        id: town.id,
        name: town.name,
        population: town.population,
        treasury: town.treasury?.balance ?? 0,
        taxRate: town.treasury?.taxRate ?? 0.10,
        // P1 #25: Provide kingdomId from region so client doesn't hardcode it
        kingdomId: town.region?.kingdomId ?? null,
        mayor: town.mayor,
        policy: town.townPolicy,
        council: town.councilMembers.map(cm => ({
          id: cm.id,
          role: cm.role,
          character: cm.character,
          appointedAt: cm.appointedAt,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-town-info', req)) return;
    logRouteError(req, 500, 'Town info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /appoint
router.post('/appoint', authGuard, characterGuard, validate(appointSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId, role, townId, kingdomId } = req.body;
    const character = req.character!;

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    // Sheriff appointment by mayor
    if (townId && role === 'sheriff') {
      const town = await prisma.town.findUnique({ where: { id: townId } });
      if (!town || town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can appoint a sheriff' });
      }

      const targetChar = await prisma.character.findUnique({ where: { id: characterId } });
      if (!targetChar || targetChar.currentTownId !== townId) {
        return res.status(400).json({ error: 'Target character must be in this town' });
      }

      const policy = await prisma.townPolicy.upsert({
        where: { townId },
        update: { sheriffId: characterId },
        create: { townId, sheriffId: characterId },
      });

      return res.json({ message: `${targetChar.name} appointed as sheriff`, policy });
    }

    // Council appointment by ruler or mayor
    if (kingdomId) {
      const kingdom = await prisma.kingdom.findUnique({ where: { id: kingdomId } });
      if (!kingdom || kingdom.rulerId !== character.id) {
        return res.status(403).json({ error: 'Only the ruler can appoint kingdom council members' });
      }
    }

    if (townId && role !== 'sheriff') {
      const town = await prisma.town.findUnique({ where: { id: townId } });
      if (!town || town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can appoint town council members' });
      }
    }

    const councilMember = await prisma.councilMember.create({
      data: {
        kingdomId: kingdomId ?? null,
        townId: townId ?? null,
        characterId,
        role,
        appointedById: character.id,
      },
      include: {
        character: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ councilMember });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-appoint', req)) return;
    logRouteError(req, 500, 'Appoint error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /allocate-treasury
router.post('/allocate-treasury', authGuard, characterGuard, validate(allocateTreasurySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, kingdomId, amount, purpose, details } = req.body;
    const character = req.character!;

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    if (townId) {
      const town = await prisma.town.findUnique({
        where: { id: townId },
        include: { treasury: true },
      });
      if (!town) {
        return res.status(404).json({ error: 'Town not found' });
      }
      if (town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can allocate town treasury' });
      }
      const balance = town.treasury?.balance ?? 0;
      if (balance < amount) {
        return res.status(400).json({ error: `Insufficient treasury. Available: ${balance}` });
      }

      await prisma.townTreasury.update({
        where: { townId },
        data: { balance: { decrement: amount } },
      });

      return res.json({
        message: `Allocated ${amount} gold from town treasury for ${purpose}`,
        remainingTreasury: balance - amount,
        purpose,
        details,
      });
    }

    if (kingdomId) {
      const kingdom = await prisma.kingdom.findUnique({ where: { id: kingdomId } });
      if (!kingdom) {
        return res.status(404).json({ error: 'Kingdom not found' });
      }
      if (kingdom.rulerId !== character.id) {
        return res.status(403).json({ error: 'Only the ruler can allocate kingdom treasury' });
      }
      if (kingdom.treasury < amount) {
        return res.status(400).json({ error: `Insufficient treasury. Available: ${kingdom.treasury}` });
      }

      await prisma.kingdom.update({
        where: { id: kingdomId },
        data: { treasury: { decrement: amount } },
      });

      return res.json({
        message: `Allocated ${amount} gold from kingdom treasury for ${purpose}`,
        remainingTreasury: kingdom.treasury - amount,
        purpose,
        details,
      });
    }
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-allocate-treasury', req)) return;
    logRouteError(req, 500, 'Allocate treasury error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /declare-war
router.post('/declare-war', authGuard, characterGuard, validate(declareWarSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetKingdomId, reason } = req.body;
    const character = req.character!;

    const attackerKingdom = await prisma.kingdom.findFirst({
      where: { rulerId: character.id },
    });

    if (!attackerKingdom) {
      return res.status(403).json({ error: 'Only a ruler can declare war' });
    }

    if (attackerKingdom.id === targetKingdomId) {
      return res.status(400).json({ error: 'Cannot declare war on your own kingdom' });
    }

    const targetKingdom = await prisma.kingdom.findUnique({
      where: { id: targetKingdomId },
    });

    if (!targetKingdom) {
      return res.status(404).json({ error: 'Target kingdom not found' });
    }

    // Check for existing active war between these kingdoms
    const existingWar = await prisma.war.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { attackerKingdomId: attackerKingdom.id, defenderKingdomId: targetKingdomId },
          { attackerKingdomId: targetKingdomId, defenderKingdomId: attackerKingdom.id },
        ],
      },
    });

    if (existingWar) {
      return res.status(400).json({ error: 'Already at war with this kingdom' });
    }

    const war = await prisma.war.create({
      data: {
        attackerKingdomId: attackerKingdom.id,
        defenderKingdomId: targetKingdomId,
        status: 'ACTIVE',
      },
      include: {
        attackerKingdom: { select: { id: true, name: true } },
        defenderKingdom: { select: { id: true, name: true } },
      },
    });

    emitGovernanceEvent('governance:war-declared', `kingdom:${attackerKingdom.id}`, {
      warId: war.id,
      attacker: war.attackerKingdom,
      defender: war.defenderKingdom,
      reason,
    });
    emitGovernanceEvent('governance:war-declared', `kingdom:${targetKingdomId}`, {
      warId: war.id,
      attacker: war.attackerKingdom,
      defender: war.defenderKingdom,
      reason,
    });

    return res.status(201).json({ war, reason });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-declare-war', req)) return;
    logRouteError(req, 500, 'Declare war error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /propose-peace
router.post('/propose-peace', authGuard, characterGuard, validate(proposePeaceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warId, terms } = req.body;
    const character = req.character!;

    const war = await prisma.war.findUnique({
      where: { id: warId },
      include: {
        attackerKingdom: true,
        defenderKingdom: true,
      },
    });

    if (!war) {
      return res.status(404).json({ error: 'War not found' });
    }

    if (war.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'War is not active' });
    }

    // Only rulers of involved kingdoms can propose peace
    const isAttackerRuler = war.attackerKingdom.rulerId === character.id;
    const isDefenderRuler = war.defenderKingdom.rulerId === character.id;

    if (!isAttackerRuler && !isDefenderRuler) {
      return res.status(403).json({ error: 'Only rulers of warring kingdoms can propose peace' });
    }

    // For simplicity, peace proposal immediately ends the war
    const updatedWar = await prisma.war.update({
      where: { id: warId },
      data: {
        status: 'PEACE_PROPOSED',
      },
      include: {
        attackerKingdom: { select: { id: true, name: true } },
        defenderKingdom: { select: { id: true, name: true } },
      },
    });

    emitGovernanceEvent('governance:peace-proposed', `kingdom:${war.attackerKingdomId}`, {
      warId: war.id,
      proposedBy: isAttackerRuler ? 'attacker' : 'defender',
      attacker: updatedWar.attackerKingdom,
      defender: updatedWar.defenderKingdom,
      terms,
    });
    emitGovernanceEvent('governance:peace-proposed', `kingdom:${war.defenderKingdomId}`, {
      warId: war.id,
      proposedBy: isAttackerRuler ? 'attacker' : 'defender',
      attacker: updatedWar.attackerKingdom,
      defender: updatedWar.defenderKingdom,
      terms,
    });

    return res.json({ war: updatedWar, terms });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-propose-peace', req)) return;
    logRouteError(req, 500, 'Propose peace error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kingdom/:kingdomId
router.get('/kingdom/:kingdomId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId } = req.params;

    const kingdom = await prisma.kingdom.findUnique({
      where: { id: kingdomId },
      include: {
        ruler: { select: { id: true, name: true, level: true } },
        lawRecords: {
          where: { status: 'ACTIVE' },
          include: {
            enactedBy: { select: { id: true, name: true } },
          },
          orderBy: { enactedAt: 'desc' },
        },
        warsAttacking: {
          where: { status: 'ACTIVE' },
          include: {
            defenderKingdom: { select: { id: true, name: true } },
          },
        },
        warsDefending: {
          where: { status: 'ACTIVE' },
          include: {
            attackerKingdom: { select: { id: true, name: true } },
          },
        },
        councilMembers: {
          include: {
            character: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    if (!kingdom) {
      return res.status(404).json({ error: 'Kingdom not found' });
    }

    return res.json({
      kingdom: {
        id: kingdom.id,
        name: kingdom.name,
        treasury: kingdom.treasury,
        ruler: kingdom.ruler,
        activeLaws: kingdom.lawRecords,
        activeWars: [
          ...kingdom.warsAttacking.map(w => ({
            id: w.id,
            role: 'attacker' as const,
            opponent: w.defenderKingdom,
            startedAt: w.startedAt,
          })),
          ...kingdom.warsDefending.map(w => ({
            id: w.id,
            role: 'defender' as const,
            opponent: w.attackerKingdom,
            startedAt: w.startedAt,
          })),
        ],
        council: kingdom.councilMembers.map(cm => ({
          id: cm.id,
          role: cm.role,
          character: cm.character,
          appointedAt: cm.appointedAt,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'governance-kingdom-info', req)) return;
    logRouteError(req, 500, 'Kingdom info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
