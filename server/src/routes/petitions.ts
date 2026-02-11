import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { emitNotification } from '../socket/events';

const router = Router();

const PETITION_DURATION_DAYS = 7;
const DEFAULT_SIGNATURE_GOAL = 10;

// --- Schemas ---

const createPetitionSchema = z.object({
  petitionType: z.enum([
    'DECLARE_WAR',
    'PROPOSE_TREATY',
    'BREAK_TREATY',
    'CHANGE_RELATIONS',
  ]),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  targetData: z.record(z.unknown()).optional(),
  signatureGoal: z.number().int().min(3).max(100).optional(),
});

// POST /api/petitions — create a petition
router.post('/', authGuard, characterGuard, validate(createPetitionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { petitionType, title, description, targetData, signatureGoal } = req.body;
    const character = req.character!;

    // Check for existing active petition by same creator of same type
    const existing = await prisma.petition.findFirst({
      where: {
        creatorId: character.id,
        petitionType,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have an active petition of this type' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PETITION_DURATION_DAYS);

    const petition = await prisma.petition.create({
      data: {
        creatorId: character.id,
        petitionType,
        title,
        description,
        targetData: targetData ?? {},
        signatureGoal: signatureGoal ?? DEFAULT_SIGNATURE_GOAL,
        expiresAt,
      },
      include: {
        creator: { select: { id: true, name: true, race: true } },
      },
    });

    // Creator auto-signs their own petition
    await prisma.petitionSignature.create({
      data: {
        petitionId: petition.id,
        characterId: character.id,
      },
    });

    return res.status(201).json({
      petition: {
        id: petition.id,
        petitionType: petition.petitionType,
        title: petition.title,
        description: petition.description,
        targetData: petition.targetData,
        signatureGoal: petition.signatureGoal,
        signatureCount: 1,
        status: petition.status,
        creator: petition.creator,
        expiresAt: petition.expiresAt,
        createdAt: petition.createdAt,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'create petition', req)) return;
    logRouteError(req, 500, 'Create petition error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/petitions/:id/sign — sign a petition
router.post('/:id/sign', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const character = req.character!;

    const petition = await prisma.petition.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { signatures: true } },
      },
    });

    if (!petition) {
      return res.status(404).json({ error: 'Petition not found' });
    }

    if (petition.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This petition is no longer active' });
    }

    if (new Date() > petition.expiresAt) {
      return res.status(400).json({ error: 'This petition has expired' });
    }

    // Check if already signed
    const existingSig = await prisma.petitionSignature.findUnique({
      where: { petitionId_characterId: { petitionId: id, characterId: character.id } },
    });

    if (existingSig) {
      return res.status(400).json({ error: 'You have already signed this petition' });
    }

    await prisma.petitionSignature.create({
      data: {
        petitionId: id,
        characterId: character.id,
      },
    });

    const newCount = petition._count.signatures + 1;

    // Check if signature goal is reached
    if (newCount >= petition.signatureGoal) {
      await prisma.petition.update({
        where: { id },
        data: { status: 'FULFILLED' },
      });

      // Find the kingdom ruler to notify
      if (character.currentTownId) {
        // Look up the kingdom the creator's town belongs to, and notify the ruler
        const town = await prisma.town.findUnique({
          where: { id: character.currentTownId },
          select: { regionId: true },
        });

        if (town) {
          // Notify the petition creator that it was fulfilled
          const notification = await prisma.notification.create({
            data: {
              characterId: petition.creatorId,
              type: 'petition_fulfilled',
              title: 'Petition Fulfilled!',
              message: `Your petition "${petition.title}" has reached its signature goal of ${petition.signatureGoal}.`,
              data: { petitionId: id },
            },
          });

          emitNotification(petition.creatorId, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          });
        }
      }
    }

    return res.status(201).json({
      signed: true,
      signatureCount: newCount,
      fulfilled: newCount >= petition.signatureGoal,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'sign petition', req)) return;
    logRouteError(req, 500, 'Sign petition error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/petitions — list active petitions
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'ACTIVE';

    const [petitions, total] = await Promise.all([
      prisma.petition.findMany({
        where: { status: status as any },
        include: {
          creator: { select: { id: true, name: true, race: true } },
          _count: { select: { signatures: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.petition.count({ where: { status: status as any } }),
    ]);

    return res.json({
      petitions: petitions.map((p) => ({
        id: p.id,
        petitionType: p.petitionType,
        title: p.title,
        description: p.description,
        targetData: p.targetData,
        signatureGoal: p.signatureGoal,
        signatureCount: p._count.signatures,
        status: p.status,
        creator: p.creator,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'list petitions', req)) return;
    logRouteError(req, 500, 'List petitions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/petitions/:id — petition details
router.get('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const petition = await prisma.petition.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, race: true } },
        signatures: {
          include: {
            character: { select: { id: true, name: true, race: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!petition) {
      return res.status(404).json({ error: 'Petition not found' });
    }

    return res.json({
      petition: {
        id: petition.id,
        petitionType: petition.petitionType,
        title: petition.title,
        description: petition.description,
        targetData: petition.targetData,
        signatureGoal: petition.signatureGoal,
        signatureCount: petition.signatures.length,
        status: petition.status,
        creator: petition.creator,
        expiresAt: petition.expiresAt,
        createdAt: petition.createdAt,
        signatures: petition.signatures.map((s) => ({
          characterId: s.characterId,
          name: s.character.name,
          race: s.character.race,
          signedAt: s.createdAt,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get petition', req)) return;
    logRouteError(req, 500, 'Get petition error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
