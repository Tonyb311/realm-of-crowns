// ---------------------------------------------------------------------------
// Asset Routes — Private Asset Ownership System
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ProfessionType } from '@prisma/client';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { getTodayTickDate, getNextTickTime, getGameDay } from '../lib/game-day';
import {
  ASSET_TIERS,
  MAX_SLOTS_PER_TIER,
  WITHER_TICKS,
  PROFESSION_ASSET_TYPES,
  getAssetPurchaseCost,
  getProfessionForAssetType,
  AssetTypeDefinition,
} from '@shared/data/assets';

const router = Router();

// --- Schemas ---

const buySchema = z.object({
  assetTypeId: z.string().min(1, 'assetTypeId is required'),
  tier: z.number().int().min(1).max(3),
});

const postJobSchema = z.object({
  wage: z.number().int().min(1, 'Wage must be at least 1'),
});

// ============================================================
// GET /api/assets/mine — List character's owned assets
// ============================================================

router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const townId = req.query.townId as string | undefined;

    const assets = await prisma.ownedAsset.findMany({
      where: {
        ownerId: character.id,
        ...(townId ? { townId } : {}),
      },
      include: {
        town: { select: { id: true, name: true } },
        jobListing: true,
      },
      orderBy: [{ tier: 'asc' }, { slotNumber: 'asc' }],
    });

    return res.json({ assets, currentGameDay: getGameDay() });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-mine', req)) return;
    logRouteError(req, 500, 'Assets mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/assets/available — Available asset types + pricing
// ============================================================

router.get('/available', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const professions = await prisma.playerProfession.findMany({
      where: { characterId: character.id, isActive: true },
    });

    const result = await Promise.all(
      professions
        .filter((p) => PROFESSION_ASSET_TYPES[p.professionType])
        .map(async (prof) => {
          const assetTypes = PROFESSION_ASSET_TYPES[prof.professionType];

          const assetTypesWithTiers = await Promise.all(
            assetTypes.map(async (at: AssetTypeDefinition) => {
              const tiers = await Promise.all(
                [1, 2, 3].map(async (tier) => {
                  const tierData = ASSET_TIERS[tier];
                  const owned = await prisma.ownedAsset.count({
                    where: {
                      ownerId: character.id,
                      professionType: prof.professionType,
                      tier,
                    },
                  });
                  const nextSlotNumber = owned + 1;
                  const locked = prof.level < tierData.levelRequired;

                  return {
                    tier,
                    owned,
                    maxSlots: MAX_SLOTS_PER_TIER,
                    nextSlotCost: owned < MAX_SLOTS_PER_TIER
                      ? getAssetPurchaseCost(tier, nextSlotNumber)
                      : null,
                    levelRequired: tierData.levelRequired,
                    locked,
                  };
                }),
              );

              return {
                id: at.id,
                name: at.name,
                spotType: at.spotType,
                tiers,
              };
            }),
          );

          return {
            type: prof.professionType,
            level: prof.level,
            assetTypes: assetTypesWithTiers,
          };
        }),
    );

    return res.json({ professions: result });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-available', req)) return;
    logRouteError(req, 500, 'Assets available error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/buy — Purchase a new asset
// ============================================================

router.post('/buy', authGuard, characterGuard, requireTown, validate(buySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { assetTypeId, tier } = req.body;

    // 1. Find which profession this asset type belongs to
    const professionType = getProfessionForAssetType(assetTypeId);
    if (!professionType) {
      return res.status(400).json({ error: 'Invalid asset type ID' });
    }

    // Find the asset type definition for name and spotType
    const assetTypeDef = PROFESSION_ASSET_TYPES[professionType].find((t: AssetTypeDefinition) => t.id === assetTypeId);
    if (!assetTypeDef) {
      return res.status(400).json({ error: 'Invalid asset type ID' });
    }

    // 2. Check character has the profession at required level
    const tierData = ASSET_TIERS[tier];
    if (!tierData) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const profEnum = professionType as ProfessionType;

    const profession = await prisma.playerProfession.findFirst({
      where: { characterId: character.id, professionType: profEnum, isActive: true },
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${professionType} profession` });
    }

    if (profession.level < tierData.levelRequired) {
      return res.status(400).json({
        error: `${professionType} level ${tierData.levelRequired} required for tier ${tier} assets. You are level ${profession.level}.`,
      });
    }

    // 3. Must have a home town
    if (!character.homeTownId) {
      return res.status(400).json({ error: 'You must be a resident of a town to purchase assets.' });
    }

    // 4. Count existing assets for this profession + tier
    const existingCount = await prisma.ownedAsset.count({
      where: {
        ownerId: character.id,
        professionType: profEnum,
        tier,
      },
    });

    // 5. Check slot limit
    if (existingCount >= MAX_SLOTS_PER_TIER) {
      return res.status(400).json({
        error: `Maximum ${MAX_SLOTS_PER_TIER} tier ${tier} slots reached for ${professionType}.`,
      });
    }

    // 6. Calculate cost
    const slotNumber = existingCount + 1;
    const cost = getAssetPurchaseCost(tier, slotNumber);

    // 7. Check gold
    if (character.gold < cost) {
      return res.status(400).json({
        error: `Insufficient gold. Need ${cost}, have ${character.gold}.`,
      });
    }

    // Transaction: deduct gold + create asset
    const [asset] = await prisma.$transaction([
      prisma.ownedAsset.create({
        data: {
          ownerId: character.id,
          townId: character.homeTownId,
          professionType: profEnum,
          spotType: assetTypeDef.spotType,
          tier,
          slotNumber,
          name: assetTypeDef.name,
          purchasePrice: cost,
        },
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { gold: { decrement: cost } },
      }),
    ]);

    return res.status(201).json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        tier: asset.tier,
        slotNumber: asset.slotNumber,
        spotType: asset.spotType,
        townId: asset.townId,
        purchasePrice: asset.purchasePrice,
      },
      goldRemaining: character.gold - cost,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-buy', req)) return;
    logRouteError(req, 500, 'Assets buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/plant — Plant a crop
// ============================================================

router.post('/:id/plant', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset, check ownership
    const asset = await prisma.ownedAsset.findUnique({ where: { id } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Check crop state
    if (asset.cropState !== 'EMPTY') {
      return res.status(400).json({ error: `Cannot plant — asset is currently ${asset.cropState}` });
    }

    // 3. Must be present in the asset's town
    if (character.currentTownId !== asset.townId) {
      return res.status(400).json({ error: 'You must be in the town where this asset is located' });
    }

    // 4. Update with planting data
    const tierData = ASSET_TIERS[asset.tier];
    const plantedAt = getGameDay();
    const readyAt = plantedAt + tierData.growthTicks;
    const witheringAt = readyAt + WITHER_TICKS;

    const updated = await prisma.ownedAsset.update({
      where: { id },
      data: {
        cropState: 'GROWING',
        plantedAt,
        readyAt,
        witheringAt,
      },
    });

    return res.json({
      success: true,
      asset: {
        id: updated.id,
        cropState: updated.cropState,
        plantedAt: updated.plantedAt,
        readyAt: updated.readyAt,
        witheringAt: updated.witheringAt,
      },
      message: `You planted crops in your ${asset.name}. Ready in ${tierData.growthTicks} days.`,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-plant', req)) return;
    logRouteError(req, 500, 'Assets plant error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/harvest — Lock in harvest action
// ============================================================

router.post('/:id/harvest', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset, include job listing
    const asset = await prisma.ownedAsset.findUnique({
      where: { id },
      include: { jobListing: true },
    });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // 2. Check crop state
    if (asset.cropState !== 'READY') {
      return res.status(400).json({ error: `Cannot harvest — crop state is ${asset.cropState}` });
    }

    // 3. Must be present in the asset's town
    if (character.currentTownId !== asset.townId) {
      return res.status(400).json({ error: 'You must be in the town where this asset is located' });
    }

    // 4. Check character is owner or hired worker
    const isOwner = asset.ownerId === character.id;
    const isWorker = asset.jobListing?.workerId === character.id;
    if (!isOwner && !isWorker) {
      return res.status(403).json({ error: 'You must be the owner or hired worker to harvest this asset' });
    }

    // 5. Check no existing daily action for today
    const todayTick = getTodayTickDate();
    const existingAction = await prisma.dailyAction.findFirst({
      where: { characterId: character.id, tickDate: todayTick },
    });
    if (existingAction) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existingAction.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // 6. Create daily action
    await prisma.dailyAction.create({
      data: {
        characterId: character.id,
        tickDate: todayTick,
        actionType: 'HARVEST',
        status: 'LOCKED_IN',
        actionTarget: {
          type: 'private_asset_harvest',
          assetId: asset.id,
          spotType: asset.spotType,
          ownerId: asset.ownerId,
          harvesterId: character.id,
          isWorker: character.id !== asset.ownerId,
          wage: asset.jobListing?.wage || 0,
          tier: asset.tier,
          assetName: asset.name,
        },
      },
    });

    return res.json({
      success: true,
      committed: true,
      action: 'HARVEST',
      assetName: asset.name,
      message: "You've committed to harvesting. Results at next tick.",
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-harvest', req)) return;
    logRouteError(req, 500, 'Assets harvest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/post-job — Post a job listing
// ============================================================

router.post('/:id/post-job', authGuard, characterGuard, validate(postJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;
    const { wage } = req.body;

    // 1. Find asset, check ownership
    const asset = await prisma.ownedAsset.findUnique({ where: { id } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Check no existing job listing
    const existingListing = await prisma.jobListing.findUnique({
      where: { assetId: id },
    });
    if (existingListing) {
      return res.status(400).json({ error: 'A job listing already exists for this asset' });
    }

    // 3. Create job listing
    const listing = await prisma.jobListing.create({
      data: {
        assetId: id,
        ownerId: character.id,
        townId: asset.townId,
        wage,
        isOpen: true,
      },
    });

    return res.status(201).json({
      success: true,
      listing: {
        id: listing.id,
        assetId: listing.assetId,
        wage: listing.wage,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-post-job', req)) return;
    logRouteError(req, 500, 'Assets post-job error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/cancel-job — Cancel job / fire worker
// ============================================================

router.post('/:id/cancel-job', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset, check ownership
    const asset = await prisma.ownedAsset.findUnique({ where: { id } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Delete the job listing for this asset
    const listing = await prisma.jobListing.findUnique({
      where: { assetId: id },
    });
    if (!listing) {
      return res.status(404).json({ error: 'No job listing found for this asset' });
    }

    await prisma.jobListing.delete({ where: { id: listing.id } });

    return res.json({ success: true, message: 'Job listing cancelled.' });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-cancel-job', req)) return;
    logRouteError(req, 500, 'Assets cancel-job error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/assets/jobs — Browse open jobs in current town
// ============================================================

router.get('/jobs', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to browse jobs' });
    }

    const jobs = await prisma.jobListing.findMany({
      where: {
        townId: character.currentTownId,
        isOpen: true,
        workerId: null,
      },
      include: {
        asset: true,
        owner: { select: { id: true, name: true } },
      },
    });

    return res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        wage: j.wage,
        assetType: j.asset.spotType,
        assetName: j.asset.name,
        assetTier: j.asset.tier,
        ownerName: j.owner.name,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-jobs', req)) return;
    logRouteError(req, 500, 'Assets jobs error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/jobs/:id/accept — Accept a job
// ============================================================

router.post('/jobs/:id/accept', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find listing
    const listing = await prisma.jobListing.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!listing) {
      return res.status(404).json({ error: 'Job listing not found' });
    }

    // 2. Validations
    if (!listing.isOpen) {
      return res.status(400).json({ error: 'This job listing is no longer open' });
    }
    if (listing.workerId !== null) {
      return res.status(400).json({ error: 'This job has already been filled' });
    }
    if (character.currentTownId !== listing.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the job' });
    }

    // 3. Accept the job
    const updated = await prisma.jobListing.update({
      where: { id },
      data: {
        workerId: character.id,
        isOpen: false,
      },
      include: { asset: true },
    });

    return res.json({
      success: true,
      job: {
        id: updated.id,
        wage: updated.wage,
        assetName: updated.asset.name,
      },
      message: `You've been hired to work at ${updated.asset.name} for ${updated.wage} gold per harvest.`,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-accept-job', req)) return;
    logRouteError(req, 500, 'Assets accept-job error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/jobs/quit — Quit current job
// ============================================================

router.post('/jobs/quit', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Find the job listing where this character is the worker
    const listing = await prisma.jobListing.findFirst({
      where: { workerId: character.id },
      include: { asset: true },
    });
    if (!listing) {
      return res.status(404).json({ error: 'You do not currently have a job' });
    }

    // Quit: clear worker, re-open listing
    await prisma.jobListing.update({
      where: { id: listing.id },
      data: {
        workerId: null,
        isOpen: true,
      },
    });

    return res.json({ success: true, message: 'You quit your job.' });
  } catch (error) {
    if (handlePrismaError(error, res, 'assets-quit-job', req)) return;
    logRouteError(req, 500, 'Assets quit-job error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
