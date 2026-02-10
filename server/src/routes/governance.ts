import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { emitGovernanceEvent } from '../index';

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

async function getCharacter(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

// POST /propose-law
router.post('/propose-law', authGuard, validate(proposeLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId, title, description, effects, lawType, expiresAt } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
        status: 'proposed',
        lawType: lawType ?? 'general',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({ law });
  } catch (error) {
    console.error('Propose law error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vote-law
router.post('/vote-law', authGuard, validate(voteLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lawId, vote } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const law = await prisma.law.findUnique({
      where: { id: lawId },
    });

    if (!law) {
      return res.status(404).json({ error: 'Law not found' });
    }

    if (law.status !== 'proposed' && law.status !== 'voting') {
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

    const updatedLaw = await prisma.law.update({
      where: { id: lawId },
      data: {
        status: 'voting',
        ...(vote === 'for'
          ? { votesFor: { increment: 1 } }
          : { votesAgainst: { increment: 1 } }),
      },
    });

    // Auto-activate if enough votes (simple majority: votesFor > votesAgainst and at least 3 total votes)
    const totalVotes = updatedLaw.votesFor + updatedLaw.votesAgainst;
    if (totalVotes >= 3 && updatedLaw.votesFor > updatedLaw.votesAgainst) {
      await prisma.law.update({
        where: { id: lawId },
        data: { status: 'active', enactedAt: new Date() },
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
    console.error('Vote law error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-tax
router.post('/set-tax', authGuard, validate(setTaxSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, taxRate } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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

    emitGovernanceEvent('governance:tax-changed', `town:${townId}`, {
      townId,
      taxRate,
      setBy: character.name,
    });

    return res.json({ policy });
  } catch (error) {
    console.error('Set tax error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /laws
router.get('/laws', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const kingdomId = req.query.kingdomId as string | undefined;
    const status = req.query.status as string | undefined;

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
    console.error('Get laws error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /town-info/:townId
router.get('/town-info/:townId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const town = await prisma.town.findUnique({
      where: { id: townId },
      include: {
        mayor: { select: { id: true, name: true, level: true } },
        treasury: true,
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
    console.error('Town info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /appoint
router.post('/appoint', authGuard, validate(appointSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId, role, townId, kingdomId } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    console.error('Appoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /allocate-treasury
router.post('/allocate-treasury', authGuard, validate(allocateTreasurySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, kingdomId, amount, purpose, details } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    console.error('Allocate treasury error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /declare-war
router.post('/declare-war', authGuard, validate(declareWarSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetKingdomId, reason } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
        status: 'active',
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
        status: 'active',
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
    console.error('Declare war error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /propose-peace
router.post('/propose-peace', authGuard, validate(proposePeaceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warId, terms } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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

    if (war.status !== 'active') {
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
        status: 'peace_proposed',
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
    console.error('Propose peace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kingdom/:kingdomId
router.get('/kingdom/:kingdomId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId } = req.params;

    const kingdom = await prisma.kingdom.findUnique({
      where: { id: kingdomId },
      include: {
        ruler: { select: { id: true, name: true, level: true } },
        lawRecords: {
          where: { status: 'active' },
          include: {
            enactedBy: { select: { id: true, name: true } },
          },
          orderBy: { enactedAt: 'desc' },
        },
        warsAttacking: {
          where: { status: 'active' },
          include: {
            defenderKingdom: { select: { id: true, name: true } },
          },
        },
        warsDefending: {
          where: { status: 'active' },
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
    console.error('Kingdom info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
